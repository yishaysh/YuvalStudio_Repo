import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthUser, AuthSession } from '../types';
import { dbClient } from '../services/dbClient';

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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [session, setSession] = useState<AuthSession | null>(null);
    const [profile, setProfile] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!dbClient) {
            setLoading(false);
            return;
        }

        // Check active session
        dbClient.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) fetchProfile(session.user.id);
            setLoading(false);
        });

        // Listen for changes
        const { data: { subscription } } = dbClient.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
            }
            setLoading(false);
        });

        return () => subscription.unsubscribe();
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
        if (user) {
            await fetchProfile(user.id);
        }
    };

    const signInWithGoogle = async () => {
        if (!dbClient) return;
        const { error } = await dbClient.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin
            }
        });
        if (error) throw error;
    };

    const signOut = async () => {
        if (!dbClient) return;
        await dbClient.auth.signOut();
        setProfile(null);
        setUser(null);
        setSession(null);
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
