
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sparkles, Feather, Shield, Ticket, Palette } from 'lucide-react';
import { Button, SectionHeading, Card } from '../components/ui';
import { SmartImage } from '../components/SmartImage';
import { api } from '../services/mockApi';
import { StudioSettings } from '../types';

const m = motion as any;

const StudioLogo = ({ className }: { className?: string }) => (
  <div className={`flex items-center gap-3 ${className}`}>
      <svg
        version="1.0"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 902.000000 631.000000"
        preserveAspectRatio="xMidYMid meet"
        className="w-auto h-full"
        fill="currentColor"
      >
        <g transform="translate(0.000000,631.000000) scale(0.100000,-0.100000)" stroke="none">
          <path d="M1902 5860 c-32 -20 -62 -71 -62 -106 0 -31 33 -85 61 -99 72 -38 157 -3 180 74 30 100 -89 188 -179 131z" />
          <path d="M1897 5493 c-4 -3 -7 -103 -7 -222 l0 -216 -167 0 c-125 0 -189 -5 -251 -18 -255 -56 -443 -161 -652 -364 -68 -66 -119 -108 -124 -103 -15 15 -19 108 -6 140 19 47 73 88 124 95 45 7 60 22 50 50 -8 19 -70 20 -115 1 -40 -17 -94 -68 -117 -110 -25 -47 -22 -150 6 -204 l23 -43 -50 -78 c-27 -42 -67 -113 -88 -157 -21 -43 -39 -81 -41 -84 -8 -12 -52 53 -58 85 -19 103 36 172 159 199 22 5 28 12 25 28 -5 36 -29 42 -92 24 -160 -47 -216 -240 -104 -362 l39 -43 -30 -123 c-68 -273 -68 -490 -1 -753 66 -262 220 -523 433 -737 574 -574 1409 -703 1892 -292 l60 51 0 -96 c0 -107 12 -140 65 -185 62 -52 153 -57 268 -14 32 11 113 47 181 79 l123 59 47 -50 c27 -29 70 -60 106 -77 54 -25 71 -28 165 -28 98 0 109 2 172 33 81 39 143 91 216 181 81 98 204 289 264 408 50 97 55 104 78 98 14 -4 82 -9 151 -12 l126 -5 -47 -91 c-70 -133 -93 -219 -88 -320 7 -135 67 -233 170 -277 96 -41 220 -10 322 81 47 41 50 42 60 24 6 -11 31 -41 57 -66 56 -56 113 -74 224 -73 181 3 364 90 503 238 l62 67 1 -78 c1 -90 13 -131 52 -173 55 -58 138 -60 246 -6 45 24 169 144 245 239 22 26 41 46 43 43 2 -2 -4 -69 -13 -149 -14 -119 -15 -149 -4 -162 32 -38 49 -9 70 121 40 236 70 328 133 398 62 68 155 95 205 60 57 -40 69 -132 38 -293 -32 -167 -16 -238 64 -279 84 -43 183 -11 287 94 l61 63 26 -54 c47 -95 116 -130 240 -123 98 7 186 43 254 106 23 21 43 37 45 36 2 -2 -1 -39 -7 -82 l-11 -79 -156 -164 c-280 -293 -348 -380 -428 -549 -57 -119 -74 -195 -69 -301 3 -73 9 -97 37 -154 63 -128 193 -184 325 -139 59 20 143 97 180 163 49 92 65 175 116 606 27 231 52 439 55 461 5 37 13 46 65 83 74 52 200 116 288 145 62 21 67 25 70 54 4 39 1 39 -94 7 -85 -29 -199 -84 -262 -127 -24 -17 -45 -28 -47 -26 -3 2 11 139 30 304 19 164 33 305 30 312 -2 6 -16 12 -29 12 -31 0 -31 1 -51 -190 -13 -124 -20 -154 -47 -208 -52 -105 -145 -177 -257 -201 -157 -33 -250 53 -239 221 13 202 196 366 341 304 53 -22 70 -49 76 -123 6 -70 22 -92 56 -79 15 5 17 16 13 75 -10 134 -81 204 -206 204 -108 -1 -203 -56 -271 -157 -30 -45 -71 -140 -71 -165 0 -27 -57 -134 -92 -173 -54 -60 -134 -108 -180 -108 -93 0 -108 40 -77 216 37 218 15 321 -81 372 -36 19 -55 23 -92 18 -65 -7 -138 -47 -185 -100 l-40 -46 1 77 c1 68 -1 78 -18 81 -28 6 -34 -7 -45 -95 -6 -46 -20 -101 -32 -125 -32 -62 -115 -172 -200 -262 -80 -85 -164 -136 -227 -136 -47 0 -87 42 -96 100 -8 58 9 230 36 345 31 136 33 161 12 169 -29 11 -43 -14 -70 -125 -21 -89 -33 -116 -81 -187 -91 -135 -220 -236 -365 -283 -99 -33 -255 -34 -308 -4 -105 62 -136 225 -68 358 66 130 212 199 315 150 41 -19 61 -58 71 -141 6 -52 9 -57 32 -57 25 0 25 1 25 76 -1 66 -5 82 -28 118 -73 109 -246 115 -377 11 -80 -64 -140 -198 -140 -315 l0 -63 -52 -48 c-140 -126 -281 -128 -359 -6 -41 64 -53 137 -39 222 14 85 111 287 165 344 33 34 35 40 22 53 -13 14 -30 14 -132 3 -112 -12 -190 -9 -239 10 -23 8 -23 9 -10 61 30 117 11 197 -58 239 -83 51 -178 -7 -178 -107 0 -45 45 -129 93 -175 l45 -42 -23 -52 c-63 -142 -242 -410 -341 -511 -117 -120 -245 -164 -370 -128 -32 9 -72 26 -89 38 -31 21 -75 66 -75 76 0 3 51 32 113 65 61 32 133 74 160 93 125 92 134 241 17 301 -35 18 -55 22 -90 18 -109 -14 -227 -111 -271 -224 -18 -43 -23 -77 -23 -139 l0 -81 -125 -61 c-155 -74 -231 -101 -288 -101 -93 0 -133 49 -133 162 0 80 24 240 51 340 23 84 21 108 -10 108 -26 0 -35 -18 -59 -113 -11 -42 -34 -99 -51 -126 -89 -138 -259 -248 -477 -307 -90 -25 -116 -27 -274 -28 -193 0 -284 14 -462 74 -492 165 -927 589 -1078 1049 -48 149 -61 226 -67 402 -6 177 6 282 49 440 l21 77 72 4 c58 3 80 9 113 31 61 40 94 95 96 159 1 50 0 53 -23 53 -21 0 -27 -7 -36 -45 -22 -84 -63 -123 -143 -136 -36 -6 -42 -4 -42 11 0 34 131 272 159 289 6 4 32 0 58 -9 84 -29 183 0 241 71 54 65 68 174 22 174 -22 0 -40 -28 -40 -61 0 -35 -39 -88 -81 -109 -45 -23 -107 -26 -135 -6 -18 14 -13 20 86 118 199 196 406 308 648 354 83 15 362 18 376 3 7 -7 8 -1850 1 -1857 -7 -7 -91 17 -159 45 -107 44 -227 141 -299 240 -52 73 -113 48 -64 -26 107 -159 296 -282 500 -326 l27 -5 0 -366 c0 -343 -1 -365 -17 -361 -10 3 -43 11 -73 18 -71 15 -149 50 -206 90 -40 30 -46 31 -60 17 -25 -24 -10 -49 54 -90 110 -71 223 -101 377 -100 163 0 320 49 414 127 34 30 39 46 16 65 -12 10 -26 5 -79 -29 -35 -23 -87 -50 -117 -60 -62 -22 -156 -41 -164 -33 -3 3 -5 164 -5 358 l0 353 48 6 c138 18 268 65 369 133 269 182 425 475 426 797 0 278 -93 502 -300 716 -132 137 -301 246 -472 303 l-66 23 -3 241 -2 242 -64 0 c-34 0 -66 -3 -69 -7z m267 -593 c41 -17 114 -58 163 -90 224 -147 376 -346 450 -587 23 -78 26 -105 27 -233 0 -206 -39 -344 -144 -503 -64 -97 -101 -138 -187 -208 -118 -94 -300 -169 -412 -169 l-31 0 0 916 0 917 30 -7 c17 -3 64 -19 104 -36z m2254 -1925 c12 -9 25 -30 30 -48 8 -30 -3 -135 -14 -147 -12 -10 -84 83 -90 116 -11 59 1 83 46 93 3 0 15 -6 28 -14z m-624 -460 c53 -49 24 -125 -74 -190 -58 -38 -221 -125 -235 -125 -3 0 -5 26 -5 58 1 102 68 209 162 256 67 33 117 34 152 1z m4151 -1132 c-48 -410 -54 -446 -88 -537 -47 -127 -176 -213 -277 -186 -56 15 -124 80 -147 138 -24 63 -23 188 2 262 64 190 135 293 403 583 106 114 148 154 150 140 1 -10 -18 -190 -43 -400z"/>
        </g>
      </svg>
      <span className="text-xl md:text-2xl font-serif text-white tracking-widest uppercase">Yuval</span>
  </div>
);

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
            <StudioLogo className="h-16 md:h-20 mx-auto mb-10 text-brand-primary drop-shadow-[0_0_15px_rgba(212,181,133,0.3)] justify-center" />

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

      {/* NEW FEATURE CARDS */}
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
