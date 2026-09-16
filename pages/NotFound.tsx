import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, Calendar, Sparkles, Gem, HelpCircle, ArrowRight, Compass } from 'lucide-react';
import { Card } from '../components/ui';

export const NotFound: React.FC = () => {
  const navigate = useNavigate();

  const safeRoutes = [
    {
      title: 'דף הבית',
      description: 'חזרה לעמוד הראשי של הסטודיו',
      path: '/',
      icon: Home
    },
    {
      title: 'הזמנת תור',
      description: 'קביעת תור לפירסינג או החלפת תכשיט',
      path: '/booking',
      icon: Calendar,
      primary: true
    },
    {
      title: 'שירותים ומחירים',
      description: 'מחירון פירסינג מלא וזמני החלמה',
      path: '/services',
      icon: Sparkles
    },
    {
      title: 'גלריה ותכשיטים',
      description: 'קטלוג עגילי טיטניום וזהב',
      path: '/jewelry',
      icon: Gem
    },
    {
      title: 'הוראות טיפול',
      description: 'מדריך החלמה וחיטוי לאחר הניקוב',
      path: '/aftercare',
      icon: HelpCircle
    }
  ];

  return (
    <div className="min-h-[85vh] flex items-center justify-center pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-brand-dark">
      <div className="max-w-3xl w-full text-center space-y-8">
        <Card className="p-8 md:p-12 relative overflow-hidden bg-brand-surface/90 border-white/10 shadow-2xl">
          {/* Subtle decorative glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-6">
            {/* 404 Badge & Icon */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-sm font-medium">
              <Compass className="w-4 h-4 animate-spin-slow" />
              <span>שגיאה 404 • הדף לא נמצא</span>
            </div>

            <h1 className="text-6xl md:text-8xl font-serif font-bold text-white tracking-tight">
              4<span className="text-brand-primary">0</span>4
            </h1>

            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-serif text-white">
                נראה שהגעת למיקום שאינו קיים
              </h2>
              <p className="text-slate-400 text-base md:text-lg max-w-lg mx-auto">
                הכתובת שחיפשת הועברה, עודכנה, או שאינה קיימת יותר. אל דאגה, הכנו עבורך קישורים מהירים למסלולים הבטוחים באתר:
              </p>
            </div>

            {/* Safe Navigation Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 text-right">
              {safeRoutes.map((route) => {
                const Icon = route.icon;
                return (
                  <Link
                    key={route.path}
                    to={route.path}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between group ${
                      route.primary
                        ? 'bg-brand-primary/15 border-brand-primary/40 hover:bg-brand-primary/25 hover:border-brand-primary'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                        route.primary ? 'bg-brand-primary text-brand-dark' : 'bg-white/5 text-brand-primary group-hover:text-white'
                      } transition-colors`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-white group-hover:-translate-x-1 transition-all" />
                    </div>
                    <div>
                      <h3 className="text-white font-medium text-sm group-hover:text-brand-primary transition-colors">
                        {route.title}
                      </h3>
                      <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">
                        {route.description}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Back Button */}
            <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-full border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-sm transition-colors"
              >
                חזרה לעמוד הקודם
              </button>
              <Link
                to="/"
                className="w-full sm:w-auto px-8 py-2.5 rounded-full bg-brand-primary text-brand-dark font-medium text-sm hover:bg-brand-primaryHover transition-colors shadow-lg shadow-brand-primary/20"
              >
                מעבר לדף הבית
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default NotFound;
