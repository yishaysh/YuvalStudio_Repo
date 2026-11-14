import type { IncomingMessage, ServerResponse } from 'node:http';
import { parseCookieHeader, resolveDatabaseUrlFromEnv } from './_lib/auth.js';
import { handleApiRequest } from './_lib/handler.js';
import { NeonStore } from './_lib/neonStore.js';
import type { ApiResponseResult } from './_lib/types.js';

let cachedStore: NeonStore | null = null;

function getProductionStore(): NeonStore {
  if (!cachedStore) {
    const dbUrl = resolveDatabaseUrlFromEnv();
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not configured on the server');
    }
    cachedStore = new NeonStore(dbUrl);
  }
  return cachedStore;
}

async function readJsonBody(req: IncomingMessage & { body?: any }): Promise<any> {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        return {};
      }
    }
    return req.body;
  }
  if (req.method === 'GET' || req.method === 'HEAD') return {};

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default async function handler(
  req: IncomingMessage & { body?: any; query?: Record<string, string | string[] | undefined> },
  res: ServerResponse
) {
  const urlObj = new URL(req.url || '/', 'http://localhost');
  const query: Record<string, string | undefined> = {};
  urlObj.searchParams.forEach((v, k) => {
    query[k] = v;
  });
  if (req.query) {
    for (const [k, v] of Object.entries(req.query)) {
      query[k] = Array.isArray(v) ? v[0] : v;
    }
  }

  const headers: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(req.headers)) {
    headers[k.toLowerCase()] = Array.isArray(v) ? v[0] : v;
  }

  const body = await readJsonBody(req);
  const cookies = parseCookieHeader(headers.cookie);
  const isHttps =
    headers['x-forwarded-proto'] === 'https' || process.env.VERCEL === '1';

  const effectivePath =
    query.path && (urlObj.pathname === '/api/router' || urlObj.pathname === '/api/router.ts')
      ? `/api/${String(query.path).replace(/^\/+/, '')}`
      : urlObj.pathname;

  let result: ApiResponseResult;
  try {
    const store = getProductionStore();
    result = await handleApiRequest(
      {
        method: req.method || 'GET',
        path: effectivePath,
        query,
        headers,
        cookies,
        body,
        isHttps,
      },
      { store }
    );
  } catch (err: any) {
    console.error('Server initialization error:', err);
    result = {
      status: 500,
      headers: { 'Cache-Control': 'no-store' },
      body: { error: err?.message || 'שגיאת תצורת שרת' },
    };
  }

  res.statusCode = result.status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  if (result.headers) {
    for (const [k, v] of Object.entries(result.headers)) {
      res.setHeader(k, v);
    }
  }
  if (result.setCookies && result.setCookies.length > 0) {
    res.setHeader('Set-Cookie', result.setCookies);
  }
  res.end(JSON.stringify(result.body));
}
