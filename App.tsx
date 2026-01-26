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

const Navbar = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();

  useEffect(() => setIsOpen(false), [location]);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-brand-dark/80 backdrop-blur-lg border-b border-white/5 transition-all duration-300">
      <div className="container mx-auto px-6 h-20 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2">
          <div className="w-8 h-8 border border-brand-primary/30 rounded-full flex items-center justify-center group-hover:border-brand-primary transition-colors">
            <span className="font-serif text-brand-primary italic font-bold">Y</span>
          </div>
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
          <motion.div
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
          </motion.div>
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