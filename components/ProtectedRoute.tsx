import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Card } from './ui';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3 text-slate-400">
        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent animate-spin rounded-full" />
        <p className="text-sm">טוען נתוני חשבון...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-6 py-20 bg-brand-dark">
        <Card className="w-full max-w-md p-8 text-center space-y-5 bg-brand-surface/90 border-white/10">
          <div className="w-16 h-16 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary mx-auto">
            <Lock className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-serif text-white">אזור אישי למחוברים</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            יש להתחבר עם חשבון Google שלך כדי לצפות בתורים, בתמונות האישיות ובהגדרות החשבון.
          </p>

          {authError && (
            <div role="alert" className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-300">
              {authError}
            </div>
          )}

          <div className="space-y-3 pt-2">
            <Button
              type="button"
              isLoading={signingIn}
              className="w-full py-3"
              onClick={async () => {
                setSigningIn(true);
                setAuthError(null);
                try {
                  await signInWithGoogle();
                } catch (err: any) {
                  setAuthError(err?.message || 'ההתחברות בוטלה או נכשלה. נסי שוב.');
                } finally {
                  setSigningIn(false);
                }
              }}
            >
              התחברות עם Google
            </Button>

            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 text-sm text-slate-400 hover:text-white transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              חזרה לדף הבית
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
};

export default ProtectedRoute;
