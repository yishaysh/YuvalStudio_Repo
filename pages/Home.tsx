
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Feather, Shield, Ticket, Palette } from 'lucide-react';
import { Button, SectionHeading, Card } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import { api } from '../services/mockApi';
import { StudioSettings } from '../types';
import { StudioLogo } from '../App';

const m = motion as any;

const Home: React.FC = () => {
    const [settings, setSettings] = useState<StudioSettings | null>(null);

    useEffect(() => {
        api.getSettings().then(setSettings);
    }, []);

    const features = settings?.features || { enable_ear_stacker: true, enable_roulette: true };

  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <SmartImage 
            src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=60&w=1280&auto=format&fit=crop" 
            alt="Studio Atmosphere" 
            className="w-full h-full opacity-50 grayscale contrast-110"
            priority={true}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/10 to-brand-dark pointer-events-none"></div>
          <div className="absolute inset-0 bg-radial-vignette opacity-40 pointer-events-none"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <m.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="will-change-transform"
          >
            <StudioLogo className="h-24 md:h-32 mx-auto mb-10 text-brand-primary drop-shadow-[0_0_15px_rgba(212,181,133,0.3)]" />

            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-dark/60 backdrop-blur-md border border-white/20 mb-8 shadow-lg">
              <Sparkles className="w-3 h-3 text-brand-primary" />
              <span className="text-xs uppercase tracking-widest text-slate-200 font-medium">אומנות הגוף והנפש</span>
            </div>
            <h1 className="text-5xl md:text-8xl font-serif mb-6 leading-tight text-white tracking-tight drop-shadow-2xl">
              הסטודיו של <span className="text-brand-primary italic">יובל</span>
            </h1>
            <p className="text-white text-lg md:text-2xl font-light max-w-2xl mx-auto mb-10 leading-relaxed drop-shadow-lg text-shadow-sm">
              חלל אינטימי ומקצועי המוקדש לאסתטיקה ודיוק. 
              <br className="hidden md:block"/> אנו מזמינים אותך לחוויה של יופי, סטריליות ורוגע.
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
            </div>
          </m.div>
        </div>
      </section>

      {(features.enable_ear_stacker || features.enable_roulette) && (
          <section className="py-12 container mx-auto px-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {features.enable_ear_stacker && (
                      <Link to="/stacker">
                          <m.div whileHover={{ scale: 1.02 }} className="bg-brand-surface/40 backdrop-blur-sm border border-brand-primary/20 rounded-2xl p-6 flex items-center gap-6 hover:bg-brand-surface/60 transition-colors shadow-lg group">
                               <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                                   <Palette className="w-8 h-8" />
                               </div>
                               <div>
                                   <h3 className="text-xl font-serif text-white mb-1">Ear Architect</h3>
                                   <p className="text-slate-400 text-sm">עצבי את האוזן שלך באופן וירטואלי</p>
                               </div>
                               <ArrowLeft className="mr-auto text-slate-500 group-hover:text-white transition-colors" />
                          </m.div>
                      </Link>
                  )}
                  {features.enable_roulette && (
                      <Link to="/roulette">
                          <m.div whileHover={{ scale: 1.02 }} className="bg-brand-surface/40 backdrop-blur-sm border border-brand-primary/20 rounded-2xl p-6 flex items-center gap-6 hover:bg-brand-surface/60 transition-colors shadow-lg group">
                               <div className="w-16 h-16 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary group-hover:scale-110 transition-transform">
                                   <Ticket className="w-8 h-8" />
                               </div>
                               <div>
                                   <h3 className="text-xl font-serif text-white mb-1">Piercing Roulette</h3>
                                   <p className="text-slate-400 text-sm">סובבי את הגלגל וזכי בהטבות</p>
                               </div>
                               <ArrowLeft className="mr-auto text-slate-500 group-hover:text-white transition-colors" />
                          </m.div>
                      </Link>
                  )}
              </div>
          </section>
      )}

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
