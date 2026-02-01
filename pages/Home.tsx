import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Feather, Shield } from 'lucide-react';
import { Button, SectionHeading, Card } from '../components/ui';

const m = motion as any;

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-brand-dark text-white overflow-x-hidden font-sans">
      {/* Hero Section */}
      <section className="relative h-[90vh] flex items-center justify-center">
        {/* Background */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?q=80&w=2565&auto=format&fit=crop" 
            alt="Studio Atmosphere" 
            className="w-full h-full object-cover opacity-50 grayscale contrast-110"
          />
          {/* Gradient Overlay - Fully transparent in the center to show image clearly */}
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/95 via-brand-dark/10 to-brand-dark"></div>
          {/* Radial vignette to focus center */}
          <div className="absolute inset-0 bg-radial-vignette opacity-40"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10 text-center">
          <m.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
          >
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
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
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

      {/* Services Preview */}
      <section className="py-24 bg-brand-surface/30">
        <div className="container mx-auto px-6">
          <SectionHeading title="טיפולים נבחרים" subtitle="בחירה מתוך הקולקציה" />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {[
               { title: 'אוזניים', price: 'החל מ-150₪', img: 'https://images.unsplash.com/photo-1616091216791-a5360b5fc78a?q=80&w=800&auto=format&fit=crop' },
               { title: 'פנים', price: 'החל מ-180₪', img: 'https://images.unsplash.com/photo-1596704017254-9b121068fb31?q=80&w=800&auto=format&fit=crop' },
               { title: 'גוף', price: 'החל מ-200₪', img: 'https://images.unsplash.com/photo-1589904107470-38e07923366c?q=80&w=800&auto=format&fit=crop' }
             ].map((item, i) => (
               <div key={i} className="group relative h-80 rounded-2xl overflow-hidden cursor-pointer">
                 <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                 <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"></div>
                 <div className="absolute bottom-0 w-full p-6">
                   <div className="flex justify-between items-end">
                     <div>
                       <h3 className="text-2xl font-serif text-white mb-1">{item.title}</h3>
                       <p className="text-brand-primary text-sm">{item.price}</p>
                     </div>
                     <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center text-white opacity-0 transform translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                       <ArrowLeft className="w-5 h-5" />
                     </div>
                   </div>
                 </div>
               </div>
             ))}
          </div>
          
          <div className="mt-12 text-center">
            <Link to="/services">
               <button className="text-brand-primary hover:text-brand-primaryHover text-sm tracking-widest border-b border-brand-primary/30 pb-1 transition-colors">
                 לכל השירותים
               </button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;