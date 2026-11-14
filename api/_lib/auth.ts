import crypto from 'node:crypto';
import type { Profile } from '../../types';
import type { GoogleTokenVerifier, ServerGoogleUserInfo, SessionPayload } from './types';

export const SESSION_COOKIE_NAME = 'ys_session';
const DEFAULT_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

// Ephemeral fallback ONLY for local non-production dev when SESSION_SECRET is unset.
let ephemeralDevSecret: string | null = null;

export function resolveSessionSecret(): string {
  const configured = (process.env.SESSION_SECRET || '').trim();
  if (configured.length >= 16) {
    return configured;
  }
  const isProd = process.env.VERCEL === '1' || process.env.NODE_ENV === 'production';
  if (isProd) {
    throw new Error('SESSION_SECRET is not configured in production environment');
  }
  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(32).toString('hex');
  }
  return ephemeralDevSecret;
}

export function getAdminEmailsFromEnv(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(/[,\s;]+/)
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);
}

export function resolveExpectedGoogleClientId(): string {
  return (
    process.env.GOOGLE_CLIENT_ID ||
    process.env.VITE_GOOGLE_CLIENT_ID ||
    ''
  ).trim();
}

export function isAdminProfileOrEmail(profile: Profile | null | undefined, email?: string | null): boolean {
  if (profile?.role === 'admin') return true;
  const allowlist = getAdminEmailsFromEnv();
  const normalized = (email || profile?.email || '').trim().toLowerCase();
  return Boolean(normalized && allowlist.includes(normalized));
}

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string): Buffer {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  return Buffer.from(normalized + '='.repeat(padLen), 'base64');
}

export function signSessionToken(
  payload: Omit<SessionPayload, 'iat' | 'exp'>,
  ttlSeconds = DEFAULT_TTL_SECONDS
): string {
  const secret = resolveSessionSecret();
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
  };
  const bodyB64 = base64UrlEncode(JSON.stringify(fullPayload));
  const sig = crypto.createHmac('sha256', secret).update(bodyB64).digest();
  return `${bodyB64}.${base64UrlEncode(sig)}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [bodyB64, sigB64] = parts;
  if (!bodyB64 || !sigB64) return null;

  try {
    const secret = resolveSessionSecret();
    const expectedSig = crypto.createHmac('sha256', secret).update(bodyB64).digest();
    const providedSig = base64UrlDecode(sigB64);
    if (expectedSig.length !== providedSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

    const decoded = JSON.parse(base64UrlDecode(bodyB64).toString('utf8')) as SessionPayload;
    if (!decoded || !decoded.profileId || !decoded.email || !decoded.exp) return null;
    if (decoded.exp <= Math.floor(Date.now() / 1000)) return null;
    if (decoded.role !== 'admin' && decoded.role !== 'client') return null;

    return decoded;
  } catch {
    return null;
  }
}

export function buildSessionCookie(token: string, isHttps = true): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=${token}`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    `Max-Age=${DEFAULT_TTL_SECONDS}`,
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function buildClearSessionCookie(isHttps = true): string {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'HttpOnly',
    'Path=/',
    'SameSite=Lax',
    'Max-Age=0',
  ];
  if (isHttps) {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function parseCookieHeader(cookieHeader: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  for (const part of cookieHeader.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        result[key] = decodeURIComponent(val);
      } catch {
        result[key] = val;
      }
    }
  }
  return result;
}

export const verifyGoogleAccessTokenLive: GoogleTokenVerifier = async (accessToken: string): Promise<ServerGoogleUserInfo> => {
  if (!accessToken || typeof accessToken !== 'string' || accessToken.length < 10) {
    throw new Error('אסימון Google אינו תקין');
  }

  // 1. Validate audience / azp via Google tokeninfo endpoint so arbitrary tokens issued for other apps are rejected
  const expectedClientId = resolveExpectedGoogleClientId();
  const tokenInfoRes = await fetch(
    `https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
  );
  if (!tokenInfoRes.ok) {
    throw new Error('אסימון Google פג תוקף או לא תקין');
  }
  const tokenInfo = (await tokenInfoRes.json()) as Record<string, any>;
  const tokenAud = String(tokenInfo.aud || tokenInfo.azp || '').trim();
  if (expectedClientId && tokenAud !== expectedClientId) {
    throw new Error('אסימון Google אינו מיועד לאפליקציה זו');
  }

  // 2. Fetch verified Google user profile
  const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!userInfoRes.ok) {
    throw new Error('נכשל אימות פרטי המשתמש מול Google');
  }
  const profile = (await userInfoRes.json()) as Record<string, any>;
  if (!profile.email || (profile.email_verified !== true && profile.email_verified !== 'true')) {
    throw new Error('כתובת האימייל בחשבון Google אינה מאומתת');
  }

  return {
    sub: String(profile.sub || tokenInfo.sub || ''),
    email: String(profile.email).trim().toLowerCase(),
    email_verified: true,
    name: typeof profile.name === 'string' ? profile.name : undefined,
    picture: typeof profile.picture === 'string' ? profile.picture : undefined,
  };
};
