import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, AuthSession } from '../types';
import { dbClient } from '../services/dbClient';
import { GOOGLE_CLIENT_ID } from '../constants';

interface AuthContextType {
    user: AuthUser | null;
    session: AuthSession | null;
    profile: any | null;
    loading: boolean;
    signInWithGoogle: () => Promise<void>;
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
            existing.addEventListener('load', () => resolve());
            setTimeout(() => resolve(), 1000);
            return;
        }
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = (err) => reject(err);
        document.head.appendChild(script);
    });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore existing session from localStorage on startup
        try {
            const savedSessionStr = localStorage.getItem('yuval_auth_session');
            if (savedSessionStr) {
                const savedSession = JSON.parse(savedSessionStr);
                if (savedSession?.user?.id) {
                    setUser(savedSession.user);
                    setSession(savedSession);
                    fetchProfile(savedSession.user.id);
                }
            }
        } catch (err) {
            console.error('Error restoring session from localStorage:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchProfile = async (userId: string) => {
        if (!dbClient) return;
        try {
            const { data, error } = await dbClient
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.warn('Error fetching profile:', error);
            } else if (data) {
                // Auto-backfill referral_code for legacy users
                if (!data.referral_code) {
                    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                    const code = `YV${randomSuffix}`;
                    data.referral_code = code;
                    dbClient.from('profiles').update({ referral_code: code }).eq('id', userId).then();
                }
                setProfile(data);
            }
        } catch (err) {
            console.error('Profile fetch error:', err);
        }
    };

    const refreshProfile = async () => {
        if (user?.id) {
            await fetchProfile(user.id);
        }
    };

    const signInWithGoogle = (): Promise<void> => {
        return new Promise(async (resolve, reject) => {
            try {
                await loadGsiScript();
                const google = (window as any).google;
                if (!google?.accounts?.oauth2) {
                    throw new Error('Google Identity Services script not ready');
                }

                const tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: 'openid email profile https://www.googleapis.com/auth/calendar.events',
                    callback: async (tokenResponse: any) => {
                        if (tokenResponse.error) {
                            console.error('Google OAuth Error:', tokenResponse);
                            reject(new Error(tokenResponse.error_description || tokenResponse.error));
                            return;
                        }

                        try {
                            // 1. Fetch user info from Google OAuth API
                            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: {
                                    Authorization: `Bearer ${tokenResponse.access_token}`
                                }
                            });

                            if (!userInfoRes.ok) {
                                throw new Error('Failed to retrieve user information from Google');
                            }

                            const userInfo = await userInfoRes.json();
                            const email = (userInfo.email || '').toLowerCase().trim();

                            if (!email) {
                                throw new Error('Email was not provided by Google account');
                            }

                            // 2. Fetch or create user profile in Neon DB
                            let profileRecord: any = null;
                            if (dbClient) {
                                const { data: existingProfile } = await dbClient
                                    .from('profiles')
                                    .select('*')
                                    .eq('email', email)
                                    .maybeSingle();

                                if (existingProfile) {
                                    profileRecord = existingProfile;
                                    const updates: any = {};
                                    if (!existingProfile.avatar_url && userInfo.picture) {
                                        updates.avatar_url = userInfo.picture;
                                    }
                                    if ((!existingProfile.full_name || existingProfile.full_name === 'אורח') && userInfo.name) {
                                        updates.full_name = userInfo.name;
                                    }
                                    if (Object.keys(updates).length > 0) {
                                        await dbClient.from('profiles').update(updates).eq('id', existingProfile.id);
                                        profileRecord = { ...existingProfile, ...updates };
                                    }
                                } else {
                                    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
                                    const referralCode = `YV${randomSuffix}`;
                                    const referredBy = localStorage.getItem('referred_by') || null;

                                    const { data: createdProfile } = await dbClient
                                        .from('profiles')
                                        .insert({
                                            email,
                                            full_name: userInfo.name || 'משתמש Google',
                                            avatar_url: userInfo.picture || null,
                                            auth_provider: 'google',
                                            role: 'client',
                                            referral_code: referralCode,
                                            referred_by: referredBy,
                                            credit_balance: 0
                                        })
                                        .single();

                                    profileRecord = createdProfile || {
                                        id: 'google-' + userInfo.sub,
                                        email,
                                        full_name: userInfo.name || 'משתמש Google',
                                        avatar_url: userInfo.picture || null,
                                        role: 'client',
                                        referral_code: referralCode
                                    };
                                }
                            }

                            // 3. Construct Auth User and Session
                            const authUser: AuthUser = {
                                id: profileRecord?.id || 'google-' + userInfo.sub,
                                email: email,
                                user_metadata: {
                                    full_name: profileRecord?.full_name || userInfo.name,
                                    avatar_url: profileRecord?.avatar_url || userInfo.picture
                                }
                            };

                            const authSession: AuthSession = {
                                user: authUser,
                                access_token: tokenResponse.access_token,
                                expires_at: Date.now() + (tokenResponse.expires_in || 3600) * 1000
                            };

                            // 4. Save Session to localStorage
                            localStorage.setItem('yuval_auth_session', JSON.stringify(authSession));
                            localStorage.setItem('g_access_token', tokenResponse.access_token);
                            localStorage.setItem('g_token_expiry', (Date.now() + (tokenResponse.expires_in || 3600) * 1000).toString());

                            setUser(authUser);
                            setSession(authSession);
                            setProfile(profileRecord);

                            resolve();
                        } catch (innerErr) {
                            console.error('Error handling Google profile sync:', innerErr);
                            reject(innerErr);
                        }
                    }
                });

                tokenClient.requestAccessToken({ prompt: 'select_account' });
            } catch (err) {
                console.error('signInWithGoogle failed:', err);
                reject(err);
            }
        });
    };

    const signOut = async () => {
        localStorage.removeItem('yuval_auth_session');
        localStorage.removeItem('g_access_token');
        localStorage.removeItem('g_token_expiry');
        setUser(null);
        setSession(null);
        setProfile(null);
    };

    return (
        <AuthContext.Provider value={{ user, session, profile, loading, signInWithGoogle, signOut, refreshProfile }}>
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
