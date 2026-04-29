
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Feather, Shield } from 'lucide-react';
import { Button, SectionHeading, Card } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import { api } from '../services/mockApi';

import { useAuth } from '../contexts/AuthContext';
import { AnimatedLogo } from '../components/AnimatedLogo';

const m = motion as any;

const Home: React.FC = () => {
  const [showStyleMatcher, setShowStyleMatcher] = useState(false);
  const { user, signInWithGoogle } = useAuth();

  useEffect(() => {
    api.getSettings().then(settings => {
      setShowStyleMatcher(settings.enable_style_matcher === true);
    });
  }, []);

  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center">
        {/* Background - Optimized Image */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SmartImage
            src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=60&w=1280&auto=format&fit=crop"
            alt="Studio Atmosphere"
            className="w-full h-full opacity-50 grayscale contrast-110"
            priority={true}
          />
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/10 to-brand-dark pointer-events-none"></div>
          {/* Radial vignette */}
          <div className="absolute inset-0 bg-radial-vignette opacity-40 pointer-events-none"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <m.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="will-change-transform"
          >
            <AnimatedLogo className="w-32 md:w-40 h-auto mx-auto mb-10 text-brand-primary drop-shadow-[0_0_15px_rgba(212,181,133,0.3)]" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-dark/60 backdrop-blur-md border border-white/20 mb-8 shadow-lg">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span className="text-xs uppercase tracking-widest text-slate-200 font-medium">אומנות הגוף והנפש</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-serif mb-6 leading-tight text-white tracking-tight drop-shadow-2xl">
              הסטודיו של <span className="text-brand-primary italic">יובל</span>
            </h1>
            <p className="text-white text-lg md:text-2xl font-light max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-lg text-shadow-sm">
              חלל אינטימי ומקצועי המוקדש לאסתטיקה ודיוק.
              <br className="hidden md:block" /> אנו מזמינים אותך לחוויה של יופי, סטריליות ורוגע.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/booking">
                <Button variant="primary" className="min-w-[180px] text-lg py-4 shadow-xl shadow-brand-primary/20">
                  הזמן תור
                </Button>
              </Link>
              <Link to="/services">
                <Button variant="outline" className="min-w-[180px] text-lg py-4 bg-brand-dark/40 backdrop-blur-sm border-white/30 text-white hover:bg-white/20">
                  גלה את השירותים
                </Button>
              </Link>
              {showStyleMatcher && (
                <Link to="/style-matcher">
                  <Button variant="outline" className="min-w-[180px] text-lg py-4 border-brand-primary/50 text-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5" /> סטייל מאצ'ר
                  </Button>
                </Link>
              )}
            </div>

            {!user && (
              <m.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                transition={{ delay: 0.8, duration: 0.5 }}
                className="mt-8 flex justify-center"
              >
                <button 
                  onClick={() => signInWithGoogle()}
                  className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full border border-white/10"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  כניסה לאזור אישי עם Google
                </button>
              </m.div>
            )}

          </m.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 container mx-auto px-6 relative">
        <div className="absolute inset-0 bg-soft-glow opacity-30 pointer-events-none"></div>
        <SectionHeading title="הערכים שלנו" subtitle="סטנדרט חדש של איכות" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { icon: Shield, title: 'בטיחות מעל הכל', desc: 'סטריליזציה ברמה רפואית ומחטים חד-פעמיות לכל לקוח.' },
            { icon: Feather, title: 'מגע עדין', desc: 'טכניקות ניקוב מתקדמות המפחיתות כאב ומאיצות החלמה.' },
            { icon: Sparkles, title: 'תכשיטי יוקרה', desc: 'קולקציית זהב 14K וטיטניום המותאמת אישית לאנטומיה שלך.' }
          ].map((item, i) => (
            <m.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "100px" }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              className="will-change-transform"
            >
              <Card className="h-full text-center hover:bg-brand-surface/80 transition-colors group border-transparent hover:border-brand-primary/20">
                <div className="w-12 h-12 bg-brand-dark rounded-2xl flex items-center justify-center mx-auto mb-6 text-brand-primary group-hover:scale-110 transition-transform duration-500">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-medium text-white mb-3">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </Card>
            </m.div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
