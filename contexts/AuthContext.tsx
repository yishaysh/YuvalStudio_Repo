import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { GOOGLE_CLIENT_ID } from '../constants';
import { api } from '../services/mockApi';
import type { AuthSession, AuthUser, Profile } from '../types';

export interface GoogleSignInOptions {
  requireAdmin?: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  session: AuthSession | null;
  profile: Profile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithGoogle: (options?: GoogleSignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const loadGsiScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if ((window as any).google?.accounts?.oauth2) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      setTimeout(() => resolve(), 1000);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = err => reject(err);
    document.head.appendChild(script);
  });
};

function profileToAuthUser(profile: Profile): AuthUser {
  return {
    id: profile.id,
    email: profile.email,
    phone: profile.phone,
    user_metadata: {
      full_name: profile.full_name,
      avatar_url: profile.avatar_url,
    },
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const syncFromServerSession = useCallback(async () => {
    try {
      // Remove legacy local auth token so client storage can never override server cookie verification
      localStorage.removeItem('yuval_auth_session');
      const { user: serverProfile } = await api.getSession();
      if (serverProfile) {
        const authUser = profileToAuthUser(serverProfile);
        setProfile(serverProfile);
        setUser(authUser);
        setSession({ user: authUser });
      } else {
        setProfile(null);
        setUser(null);
        setSession(null);
      }
    } catch (err) {
      console.warn('Could not load server session:', err);
      setProfile(null);
      setUser(null);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    syncFromServerSession();
  }, [syncFromServerSession]);

  const refreshProfile = useCallback(async () => {
    await syncFromServerSession();
  }, [syncFromServerSession]);

  const signInWithGoogle = useCallback(
    (options?: GoogleSignInOptions): Promise<void> => {
      return new Promise(async (resolve, reject) => {
        try {
          if (!GOOGLE_CLIENT_ID) {
            throw new Error('מזהה הכניסה של Google (VITE_GOOGLE_CLIENT_ID) אינו מוגדר במערכת.');
          }
          await loadGsiScript();
          const google = (window as any).google;
          if (!google?.accounts?.oauth2) {
            throw new Error('רכיב ההתחברות של Google עדיין אינו מוכן. נסי לרענן את הדף.');
          }

          const scope = options?.requireAdmin
            ? 'openid email profile'
            : 'openid email profile https://www.googleapis.com/auth/calendar.events';

          const tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_CLIENT_ID,
            scope,
            callback: async (tokenResponse: any) => {
              if (tokenResponse?.error) {
                reject(new Error(tokenResponse.error_description || tokenResponse.error));
                return;
              }
              try {
                const verifiedProfile = await api.signInWithGoogleToken(
                  tokenResponse.access_token,
                  Boolean(options?.requireAdmin)
                );

                // Keep calendar OAuth token separately ONLY for optional Google Calendar client sync
                if (!options?.requireAdmin && tokenResponse.access_token) {
                  localStorage.setItem('g_access_token', tokenResponse.access_token);
                  localStorage.setItem(
                    'g_token_expiry',
                    (Date.now() + (tokenResponse.expires_in || 3600) * 1000).toString()
                  );
                }

                const authUser = profileToAuthUser(verifiedProfile);
                setProfile(verifiedProfile);
                setUser(authUser);
                setSession({ user: authUser });
                resolve();
              } catch (innerErr) {
                reject(innerErr);
              }
            },
          });

          tokenClient.requestAccessToken({ prompt: 'select_account' });
        } catch (err) {
          reject(err);
        }
      });
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('Logout request warning:', err);
    } finally {
      localStorage.removeItem('yuval_auth_session');
      localStorage.removeItem('g_access_token');
      localStorage.removeItem('g_token_expiry');
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isAdmin: profile?.role === 'admin',
        loading,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
