import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Home from './pages/Home';
import Booking from './pages/Booking';
import Admin from './pages/Admin';
import ServicesPage from './pages/Services';
import JewelryPage from './pages/Jewelry';
import AftercarePage from './pages/Aftercare';
import { Menu, X, Instagram, Facebook, MapPin, Lock } from 'lucide-react';
import { api } from './services/mockApi';
import { DEFAULT_STUDIO_DETAILS } from './constants';

const m = motion as any;

const StudioLogo = ({ className }: { className?: string }) => (
  <svg
    version="1.0"
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 902.000000 631.000000"
    preserveAspectRatio="xMidYMid meet"
    className={className}
    fill="currentColor"
  >
    <g transform="translate(0.000000,631.000000) scale(0.100000,-0.100000)" stroke="none">
      <path d="M1902 5860 c-32 -20 -62 -71 -62 -106 0 -31 33 -85 61 -99 72 -38 157 -3 180 74 30 100 -89 188 -179 131z" />
      <path d="M1897 5493 c-4 -3 -7 -103 -7 -222 l0 -216 -167 0 c-125 0 -189 -5 -251 -18 -255 -56 -443 -161 -652 -364 -68 -66 -119 -108 -124 -103 -15 15 -19 108 -6 140 19 47 73 88 124 95 45 7 60 22 50 50 -8 19 -70 20 -115 1 -40 -17 -94 -68 -117 -110 -25 -47 -22 -150 6 -204 l23 -43 -50 -78 c-27 -42 -67 -113 -88 -157 -21 -43 -39 -81 -41 -84 -8 -12 -52 53 -58 85 -19 103 36 172 159 199 22 5 28 12 25 28 -5 36 -29 42 -92 24 -160 -47 -216 -240 -104 -362 l39 -43 -30 -123 c-68 -273 -68 -490 -1 -753 66 -262 220 -523 433 -737 574 -574 1409 -703 1892 -292 l60 51 0 -96 c0 -107 12 -140 65 -185 62 -52 153 -57 268 -14 32 11 113 47 181 79 l123 59 47 -50 c27 -29 70 -60 106 -77 54 -25 71 -28 165 -28 98 0 109 2 172 33 81 39 143 91 216 181 81 98 204 289 264 408 50 97 55 104 78 98 14 -4 82 -9 151 -12 l126 -5 -47 -91 c-70 -133 -93 -219 -88 -320 7 -135 67 -233 170 -277 96 -41 220 -10 322 81 47 41 50 42 60 24 6 -11 31 -41 57 -66 56 -56 113 -74 224 -73 181 3 364 90 503 238 l62 67 1 -78 c1 -90 13 -131 52 -173 55 -58 138 -60 246 -6 45 24 169 144 245 239 22 26 41 46 43 43 2 -2 -4 -69 -13 -149 -14 -119 -15 -149 -4 -162 32 -38 49 -9 70 121 40 236 70 328 133 398 62 68 155 95 205 60 57 -40 69 -132 38 -293 -32 -167 -16 -238 64 -279 84 -43 183 -11 287 94 l61 63 26 -54 c47 -95 116 -130 240 -123 98 7 186 43 254 106 23 21 43 37 45 36 2 -2 -1 -39 -7 -82 l-11 -79 -156 -164 c-280 -293 -348 -380 -428 -549 -57 -119 -74 -195 -69 -301 3 -73 9 -97 37 -154 63 -128 193 -184 325 -139 59 20 143 97 180 163 49 92 65 175 116 606 27 231 52 439 55 461 5 37 13 46 65 83 74 52 200 116 288 145 62 21 67 25 70 54 4 39 1 39 -94 7 -85 -29 -199 -84 -262 -127 -24 -17 -45 -28 -47 -26 -3 2 11 139 30 304 19 164 33 305 30 312 -2 6 -16 12 -29 12 -31 0 -31 1 -51 -190 -13 -124 -20 -154 -47 -208 -52 -105 -145 -177 -257 -201 -157 -33 -250 53 -239 221 13 202 196 366 341 304 53 -22 70 -49 76 -123 6 -70 22 -92 56 -79 15 5 17 16 13 75 -10 134 -81 204 -206 204 -108 -1 -203 -56 -271 -157 -30 -45 -71 -140 -71 -165 0 -27 -57 -134 -92 -173 -54 -60 -134 -108 -180 -108 -93 0 -108 40 -77 216 37 218 15 321 -81 372 -36 19 -55 23 -92 18 -65 -7 -138 -47 -185 -100 l-40 -46 1 77 c1 68 -1 78 -18 81 -28 6 -34 -7 -45 -95 -6 -46 -20 -101 -32 -125 -32 -62 -115 -172 -200 -262 -80 -85 -164 -136 -227 -136 -47 0 -87 42 -96 100 -8 58 9 230 36 345 31 136 33 161 12 169 -29 11 -43 -14 -70 -125 -21 -89 -33 -116 -81 -187 -91 -135 -220 -236 -365 -283 -99 -33 -255 -34 -308 -4 -105 62 -136 225 -68 358 66 130 212 199 315 150 41 -19 61 -58 71 -141 6 -52 9 -57 32 -57 25 0 25 1 25 76 -1 66 -5 82 -28 118 -73 109 -246 115 -377 11 -80 -64 -140 -198 -140 -315 l0 -63 -52 -48 c-140 -126 -281 -128 -359 -6 -41 64 -53 137 -39 222 14 85 111 287 165 344 33 34 35 40 22 53 -13 14 -30 14 -132 3 -112 -12 -190 -9 -239 10 -23 8 -23 9 -10 61 30 117 11 197 -58 239 -83 51 -178 -7 -178 -107 0 -45 45 -129 93 -175 l45 -42 -23 -52 c-63 -142 -242 -410 -341 -511 -117 -120 -245 -164 -370 -128 -32 9 -72 26 -89 38 -31 21 -75 66 -75 76 0 3 51 32 113 65 61 32 133 74 160 93 125 92 134 241 17 301 -35 18 -55 22 -90 18 -109 -14 -227 -111 -271 -224 -18 -43 -23 -77 -23 -139 l0 -81 -125 -61 c-155 -74 -231 -101 -288 -101 -93 0 -133 49 -133 162 0 80 24 240 51 340 23 84 21 108 -10 108 -26 0 -35 -18 -59 -113 -11 -42 -34 -99 -51 -126 -89 -138 -259 -248 -477 -307 -90 -25 -116 -27 -274 -28 -193 0 -284 14 -462 74 -492 165 -927 589 -1078 1049 -48 149 -61 226 -67 402 -6 177 6 282 49 440 l21 77 72 4 c58 3 80 9 113 31 61 40 94 95 96 159 1 50 0 53 -23 53 -21 0 -27 -7 -36 -45 -22 -84 -63 -123 -143 -136 -36 -6 -42 -4 -42 11 0 34 131 272 159 289 6 4 32 0 58 -9 84 -29 183 0 241 71 54 65 68 174 22 174 -22 0 -40 -28 -40 -61 0 -35 -39 -88 -81 -109 -45 -23 -107 -26 -135 -6 -18 14 -13 20 86 118 199 196 406 308 648 354 83 15 362 18 376 3 7 -7 8 -1850 1 -1857 -7 -7 -91 17 -159 45 -107 44 -227 141 -299 240 -52 73 -113 48 -64 -26 107 -159 296 -282 500 -326 l27 -5 0 -366 c0 -343 -1 -365 -17 -361 -10 3 -43 11 -73 18 -71 15 -149 50 -206 90 -40 30 -46 31 -60 17 -25 -24 -10 -49 54 -90 110 -71 223 -101 377 -100 163 0 320 49 414 127 34 30 39 46 16 65 -12 10 -26 5 -79 -29 -35 -23 -87 -50 -117 -60 -62 -22 -156 -41 -164 -33 -3 3 -5 164 -5 358 l0 353 48 6 c138 18 268 65 369 133 269 182 425 475 426 797 0 278 -93 502 -300 716 -132 137 -301 246 -472 303 l-66 23 -3 241 -2 242 -64 0 c-34 0 -66 -3 -69 -7z m267 -593 c41 -17 114 -58 163 -90 224 -147 376 -346 450 -587 23 -78 26 -105 27 -233 0 -206 -39 -344 -144 -503 -64 -97 -101 -138 -187 -208 -118 -94 -300 -169 -412 -169 l-31 0 0 916 0 917 30 -7 c17 -3 64 -19 104 -36z m2254 -1925 c12 -9 25 -30 30 -48 8 -30 -3 -135 -14 -147 -12 -10 -84 83 -90 116 -11 59 1 83 46 93 3 0 15 -6 28 -14z m-624 -460 c53 -49 24 -125 -74 -190 -58 -38 -221 -125 -235 -125 -3 0 -5 26 -5 58 1 102 68 209 162 256 67 33 117 34 152 1z m4151 -1132 c-48 -410 -54 -446 -88 -537 -47 -127 -176 -213 -277 -186 -56 15 -124 80 -147 138 -24 63 -23 188 2 262 64 190 135 293 403 583 106 114 148 154 150 140 1 -10 -18 -190 -43 -400z"/>
      <path d="M5803 4202 c-41 -4 -42 -24 -3 -52 l30 -21 0 -294 c0 -223 -3 -297 -12 -305 -7 -6 -22 -17 -32 -24 -12 -8 -17 -19 -13 -30 6 -15 25 -16 164 -14 139 3 158 5 161 20 2 11 -8 23 -27 33 l-31 16 0 334 0 334 -102 3 c-57 2 -118 2 -135 0z"/>
      <path d="M3200 4152 c0 -10 13 -25 28 -34 27 -16 46 -49 184 -318 25 -50 28 -64 28 -163 l0 -107 -40 -16 c-28 -11 -40 -22 -38 -33 3 -14 26 -16 188 -16 158 0 185 2 185 15 0 8 -17 23 -37 33 l-38 19 0 126 0 126 50 98 c97 189 116 219 149 239 54 33 35 44 -77 47 -96 3 -102 1 -102 -17 0 -13 11 -23 35 -31 19 -6 35 -17 35 -23 0 -19 -114 -220 -127 -224 -6 -2 -43 62 -84 146 l-72 151 -134 0 c-121 0 -133 -2 -133 -18z"/>
      <path d="M5290 4021 c-113 -35 -163 -119 -105 -176 19 -20 34 -25 72 -25 27 0 58 7 70 15 27 19 37 63 23 100 -16 41 1 53 44 32 40 -19 59 -69 54 -140 l-3 -42 -95 -6 c-155 -9 -220 -59 -223 -171 -1 -61 19 -106 60 -134 21 -14 46 -19 103 -19 64 0 83 4 124 28 l49 27 28 -26 c76 -73 249 -14 249 85 0 24 -22 28 -40 6 -16 -20 -36 -19 -44 1 -3 9 -6 73 -6 143 0 83 -5 145 -15 177 -16 56 -62 105 -114 123 -38 12 -192 14 -231 2z m155 -324 c4 -13 5 -48 3 -78 l-3 -54 -37 -3 c-27 -2 -43 3 -57 17 -14 14 -21 34 -21 61 0 51 27 80 75 80 28 0 36 -5 40 -23z"/>
      <path d="M3850 4001 c0 -11 10 -26 23 -32 12 -6 24 -14 27 -16 3 -3 7 -98 10 -211 5 -187 7 -210 25 -234 53 -72 169 -78 247 -13 38 32 47 31 55 -5 l6 -30 124 0 c105 0 125 2 130 16 3 9 0 20 -8 25 -59 34 -57 25 -58 307 l-1 212 -124 0 c-139 0 -156 -9 -105 -54 l29 -26 0 -168 c0 -92 -4 -173 -8 -179 -4 -7 -21 -15 -37 -18 -58 -11 -60 -6 -65 227 l-5 213 -132 3 c-127 2 -133 2 -133 -17z"/>
      <path d="M4500 4001 c0 -12 12 -26 29 -35 16 -9 31 -21 34 -28 3 -7 42 -105 87 -218 112 -280 100 -260 164 -260 31 0 58 5 63 13 6 6 42 91 81 187 110 271 118 287 152 305 18 9 30 23 30 36 0 19 -6 20 -102 17 -83 -2 -103 -6 -103 -18 0 -8 14 -21 30 -29 17 -8 33 -18 36 -24 7 -10 -89 -257 -100 -257 -4 0 -39 73 -77 163 l-69 162 -127 3 c-122 2 -128 2 -128 -17z"/>
      <path d="M642 3568 c-28 -28 -1 -75 38 -63 14 4 20 15 20 35 0 36 -33 53 -58 28z"/>
      <path d="M676 3294 c-12 -32 -6 -55 19 -66 22 -10 29 -9 47 10 19 18 20 25 10 47 -14 29 -66 36 -76 9z"/>
      <path d="M788 3069 c-25 -14 -24 -75 1 -89 31 -16 59 -12 75 12 21 30 20 44 -4 68 -22 22 -46 25 -72 9z"/>
      <path d="M2926 2864 c-21 -21 -20 -57 2 -77 24 -22 55 -21 75 1 34 37 11 92 -38 92 -13 0 -31 -7 -39 -16z"/>
      <path d="M6133 2854 c-15 -24 -15 -29 -2 -53 29 -52 99 -35 99 24 0 57 -66 76 -97 29z"/>
      <path d="M993 2850 c-31 -13 -56 -65 -48 -101 4 -16 18 -38 32 -49 38 -29 79 -26 115 10 26 27 30 36 25 67 -4 20 -14 45 -24 55 -22 22 -71 31 -100 18z"/>
      <path d="M8626 2169 c-15 -12 -26 -30 -26 -45 0 -31 33 -64 65 -64 30 0 65 32 65 60 0 24 -42 70 -63 70 -8 0 -26 -9 -41 -21z"/>
      <path d="M1772 1769 c-126 -34 -252 -108 -252 -149 0 -31 36 -34 72 -7 70 53 207 107 270 107 l28 0 0 -182 c1 -422 23 -733 62 -873 l11 -40 13 44 c30 99 45 257 55 601 6 195 8 376 4 403 -6 46 -5 47 21 47 71 0 210 -53 281 -108 34 -25 59 -24 70 5 14 37 -148 132 -272 158 -101 21 -273 18 -363 -6z m218 -903 c0 -70 -20 -180 -32 -168 -15 15 -22 213 -8 247 l12 30 14 -30 c7 -16 13 -52 14 -79z"/>
    </g>
  </svg>
);

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  useEffect(() => setIsOpen(false), [location]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-lg border-b border-white/5 transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <StudioLogo className="h-10 w-auto text-brand-primary transition-all duration-300 group-hover:brightness-110 group-hover:drop-shadow-[0_0_8px_rgba(212,181,133,0.3)]" />
          <span className="text-xl font-serif text-white tracking-wide group-hover:text-brand-primary transition-colors">
            Yuval Studio
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8">
          <div className="flex items-center gap-8">
            {[
              { label: 'שירותים', path: '/services' },
              { label: 'גלריה', path: '/jewelry' },
              { label: 'הוראות טיפול', path: '/aftercare' }
            ].map((item) => (
              <Link key={item.path} to={item.path} className="text-sm font-medium text-slate-400 hover:text-white transition-colors relative group">
                {item.label}
                <span className="absolute -bottom-1 left-0 w-0 h-[1px] bg-brand-primary transition-all duration-300 group-hover:w-full"></span>
              </Link>
            ))}
          </div>
          
          <div className="w-[1px] h-6 bg-white/10 mx-2"></div>

          <Link 
            to="/booking" 
            className="px-6 py-2.5 bg-brand-primary text-brand-dark font-medium rounded-full hover:bg-brand-primaryHover transition-all shadow-lg shadow-brand-primary/10"
          >
             הזמן תור
          </Link>

          <Link 
            to="/admin" 
            title="כניסת מנהל"
            className="w-10 h-10 flex items-center justify-center rounded-full text-brand-primary bg-brand-primary/10 hover:bg-brand-primary hover:text-brand-dark transition-all border border-brand-primary/20"
          >
            <Lock className="w-4 h-4" />
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden text-white hover:text-brand-primary transition-colors">
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <m.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="md:hidden bg-brand-dark/95 backdrop-blur-xl absolute top-20 left-0 right-0 border-b border-white/5 shadow-2xl h-screen"
          >
            <div className="flex flex-col p-8 gap-8 items-center text-center pt-20">
              <Link to="/" className="text-2xl font-serif text-white hover:text-brand-primary">דף הבית</Link>
              <Link to="/booking" className="text-2xl font-serif text-white hover:text-brand-primary">הזמן תור</Link>
              <Link to="/services" className="text-2xl font-serif text-white hover:text-brand-primary">שירותים ומחירים</Link>
              <Link to="/jewelry" className="text-2xl font-serif text-white hover:text-brand-primary">גלריה ותכשיטים</Link>
              <Link to="/aftercare" className="text-2xl font-serif text-white hover:text-brand-primary">הוראות טיפול</Link>
              <div className="w-12 h-[1px] bg-white/10 my-2"></div>
              <Link to="/admin" className="text-sm text-slate-500 hover:text-white border border-white/10 px-6 py-2 rounded-full">כניסת מנהל</Link>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App: React.FC = () => {
  const [address, setAddress] = useState(DEFAULT_STUDIO_DETAILS.address);
  const [phone, setPhone] = useState(DEFAULT_STUDIO_DETAILS.phone);
  const [email, setEmail] = useState(DEFAULT_STUDIO_DETAILS.email);

  useEffect(() => {
    api.getSettings().then(settings => {
      if (settings.studio_details) {
         setAddress(settings.studio_details.address);
         setPhone(settings.studio_details.phone);
         setEmail(settings.studio_details.email);
      }
    });
  }, []);

  return (
    <Router>
      <ScrollToTop />
      <Navbar />
      <main className="min-h-screen bg-brand-dark text-slate-200 pt-20">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/booking" element={<Booking />} />
          <Route path="/services" element={<ServicesPage />} />
          <Route path="/jewelry" element={<JewelryPage />} />
          <Route path="/aftercare" element={<AftercarePage />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </main>
      
      <footer className="bg-brand-surface py-16 border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-right mb-12">
            <div className="col-span-1 md:col-span-2">
              <h3 className="text-2xl font-serif text-white mb-6">Yuval Studio</h3>
              <p className="text-slate-400 text-sm leading-relaxed max-w-md">
                סטודיו בוטיק לפירסינג ותכשיטנות גוף. אנו מאמינים בשילוב של אסתטיקה גבוהה, סטריליות חסרת פשרות ויחס אישי לכל לקוח.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-medium mb-6">יצירת קשר</h4>
              <ul className="space-y-4 text-sm text-slate-400">
                <li className="flex items-center justify-center md:justify-start gap-3">
                  <MapPin className="w-4 h-4 text-brand-primary" />
                  {address}
                </li>
                <li>{phone}</li>
                <li>{email}</li>
              </ul>
            </div>

            <div>
               <h4 className="text-white font-medium mb-6">עקבו אחרינו</h4>
               <div className="flex justify-center md:justify-start gap-4">
                 <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-all">
                   <Instagram className="w-5 h-5" />
                 </a>
                 <a href="#" className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-brand-primary hover:text-brand-dark transition-all">
                   <Facebook className="w-5 h-5" />
                 </a>
               </div>
            </div>
          </div>
          
          <div className="border-t border-white/5 pt-8 text-center text-xs text-slate-600">
             © 2024 Yuval Studio. כל הזכויות שמורות.
          </div>
        </div>
      </footer>
    </Router>
  );
};

export default App;