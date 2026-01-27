import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, Check, Loader2, ArrowRight, ArrowLeft, MessageCircle, Mail, AlertCircle, Sparkles } from 'lucide-react';
import { Service, BookingStep, StudioSettings } from '../types';
import { api, TimeSlot } from '../services/mockApi';
import { DEFAULT_STUDIO_DETAILS, DEFAULT_WORKING_HOURS } from '../constants';
import { Button, Card, Input } from '../components/ui';

// --- Interactive Anatomy Map Component ---

interface AnatomyPoint {
  id: string;
  x: number;
  y: number;
  label: string;
  keyword: string; 
  type: 'stud' | 'ring' | 'barbell' | 'curved' | 'industrial' | 'septum'; 
}

const earPoints: AnatomyPoint[] = [
    { id: 'industrial', x: 55, y: 18, label: 'אינדסטריאל', keyword: 'אינדסטריאל', type: 'industrial' }, // Center of click area
    { id: 'helix-upper', x: 68, y: 15, label: 'הליקס', keyword: 'הליקס', type: 'ring' },
    { id: 'forward-helix', x: 28, y: 22, label: 'פורוורד הליקס', keyword: 'פורוורד', type: 'stud' },
    { id: 'rook', x: 42, y: 32, label: 'רוק', keyword: 'רוק', type: 'curved' },
    { id: 'daith', x: 32, y: 44, label: 'דיית׳', keyword: 'דיית', type: 'ring' },
    { id: 'tragus', x: 25, y: 52, label: 'טראגוס', keyword: 'טראגוס', type: 'stud' },
    { id: 'snug', x: 78, y: 55, label: 'סנאג', keyword: 'סנאג', type: 'curved' },
    { id: 'conch', x: 50, y: 52, label: 'קונץ׳', keyword: 'קונץ', type: 'ring' },
    { id: 'anti-tragus', x: 62, y: 72, label: 'אנטי-טראגוס', keyword: 'אנטי', type: 'stud' },
    { id: 'lobe-upper', x: 58, y: 80, label: 'תנוך עליון', keyword: 'תנוך', type: 'stud' },
    { id: 'lobe-main', x: 48, y: 88, label: 'תנוך', keyword: 'תנוך', type: 'stud' },
];

const facePoints: AnatomyPoint[] = [
    { id: 'eyebrow', x: 35, y: 38, label: 'גבה', keyword: 'גבה', type: 'curved' },
    { id: 'bridge', x: 50, y: 38, label: 'ברידג׳', keyword: 'ברידג', type: 'barbell' },
    { id: 'nostril', x: 42, y: 56, label: 'נזם', keyword: 'נזם', type: 'stud' },
    { id: 'septum', x: 50, y: 62, label: 'ספטום', keyword: 'ספטום', type: 'septum' },
    { id: 'philtrum', x: 50, y: 68, label: 'מדוזה', keyword: 'מדוזה', type: 'stud' },
    { id: 'monroe', x: 38, y: 65, label: 'מונרו', keyword: 'מונרו', type: 'stud' },
    { id: 'labret-side', x: 38, y: 76, label: 'סייד ליפ', keyword: 'שפה', type: 'ring' },
    { id: 'labret-center', x: 50, y: 78, label: 'לאברט', keyword: 'לאברט', type: 'stud' },
    { id: 'vertical-labret', x: 50, y: 75, label: 'ורטיקל', keyword: 'ורטיקל', type: 'curved' },
];

const AnatomyMap = ({ services, onSelect, selectedService }: { services: Service[], onSelect: (s: Service | null) => void, selectedService: Service | null }) => {
  const [view, setView] = useState<'ear' | 'face'>('ear');
  const [hoverMessage, setHoverMessage] = useState<{ x: number, y: number, text: string } | null>(null);
  const [visualSelectionId, setVisualSelectionId] = useState<string | null>(null);

  useEffect(() => {
      if (selectedService) {
          const point = [...earPoints, ...facePoints].find(p => selectedService.name.includes(p.keyword));
          if (point) setVisualSelectionId(point.id);
      }
  }, [selectedService]);

  const findService = (keyword: string) => services.find(s => s.name.includes(keyword) || s.category.includes(keyword));

  const handlePointClick = (point: AnatomyPoint) => {
    setVisualSelectionId(point.id);
    const service = findService(point.keyword);
    if (service) {
      onSelect(service);
      setHoverMessage(null);
    } else {
      onSelect(null);
      setHoverMessage({ x: point.x, y: point.y, text: 'שירות זה אינו זמין כרגע' });
      setTimeout(() => setHoverMessage(null), 3000);
    }
  };

  const currentPoints = view === 'ear' ? earPoints : facePoints;

  const JewelryRenderer = ({ point, isSelected }: { point: AnatomyPoint, isSelected: boolean }) => {
     if (!isSelected) {
         return <circle cx={0} cy={0} r="1.5" className="fill-white/30 group-hover:fill-white/80 transition-colors" />;
     }

     const colorPrimary = "#d4b585"; 
     const colorHighlight = "#fffbeb"; 
     const glowFilter = "url(#jewelryGlow)";

     switch(point.type) {
         case 'industrial':
             return (
                 <g filter={glowFilter}>
                     <motion.line 
                        x1="20" y1="-5" x2="-25" y2="10" 
                        stroke={colorPrimary} 
                        strokeWidth="1.5" 
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5 }}
                     />
                     <circle cx="20" cy="-5" r="2" fill={colorHighlight} />
                     <circle cx="-25" cy="10" r="2" fill={colorHighlight} />
                 </g>
             );
         case 'septum':
             return (
                 <g filter={glowFilter}>
                     <motion.path 
                        d="M -4 -2 Q 0 5 4 -2" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                     />
                     <circle cx="-4" cy="-2" r="1" fill={colorHighlight} />
                     <circle cx="4" cy="-2" r="1" fill={colorHighlight} />
                 </g>
             );
         case 'ring':
             return (
                 <g filter={glowFilter}>
                     <motion.circle 
                        r="3.5" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1" 
                        strokeDasharray="16 6" 
                        initial={{ rotate: 0, scale: 0 }}
                        animate={{ rotate: 360, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20 }}
                     />
                     <circle cx="0" cy="3.5" r="1.2" fill={colorHighlight} />
                 </g>
             );
         case 'barbell': 
             return (
                 <g filter={glowFilter} transform="rotate(0)">
                     <line x1="-5" y1="0" x2="5" y2="0" stroke={colorPrimary} strokeWidth="1" />
                     <circle cx="-5" cy="0" r="1.5" fill={colorHighlight} />
                     <circle cx="5" cy="0" r="1.5" fill={colorHighlight} />
                 </g>
             );
         case 'curved': 
             return (
                 <g filter={glowFilter}>
                     <motion.path 
                        d="M -3 -3 Q 0 0 3 3" 
                        fill="none" 
                        stroke={colorPrimary} 
                        strokeWidth="1.2" 
                        strokeLinecap="round"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                     />
                     <circle cx="-3" cy="-3" r="1.5" fill={colorHighlight} />
                     <circle cx="3" cy="3" r="1.5" fill={colorHighlight} />
                 </g>
             );
         case 'stud': 
         default:
             return (
                 <g filter={glowFilter}>
                    <motion.path 
                       d="M 0 -2.5 L 2 0 L 0 2.5 L -2 0 Z" 
                       fill={colorHighlight} 
                       initial={{ scale: 0 }}
                       animate={{ scale: [1, 1.2, 1] }}
                       transition={{ repeat: Infinity, duration: 2, repeatDelay: 1 }}
                    />
                    <motion.g 
                       initial={{ opacity: 0 }} 
                       animate={{ opacity: [0, 1, 0] }}
                       transition={{ repeat: Infinity, duration: 2 }}
                    >
                       <line x1="0" y1="-4" x2="0" y2="4" stroke="white" strokeWidth="0.5" />
                       <line x1="-4" y1="0" x2="4" y2="0" stroke="white" strokeWidth="0.5" />
                    </motion.g>
                 </g>
             );
     }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center min-h-[500px]">
      <div className="relative order-2 md:order-1 flex flex-col items-center">
        <div className="flex gap-4 mb-8 bg-brand-surface p-1 rounded-full border border-white/5">
          <button 
            onClick={() => setView('ear')}
            className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'ear' ? 'bg-brand-primary text-brand-dark' : 'text-slate-400 hover:text-white'}`}
          >
            אוזן
          </button>
          <button 
             onClick={() => setView('face')}
             className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${view === 'face' ? 'bg-brand-primary text-brand-dark' : 'text-slate-400 hover:text-white'}`}
          >
            פנים
          </button>
        </div>

        <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[500px] select-none">
           <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-2xl overflow-visible">
             <defs>
               <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                 <stop offset="0%" stopColor="#d4b585" stopOpacity="0.8" />
                 <stop offset="100%" stopColor="#c19f6e" stopOpacity="0.4" />
               </linearGradient>
               <filter id="jewelryGlow" x="-50%" y="-50%" width="200%" height="200%">
                 <feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blur" />
                 <feColorMatrix in="blur" type="matrix" values="
                    0 0 0 0 1
                    0 0 0 0 0.9
                    0 0 0 0 0.5
                    0 0 0 0.6 0" result="coloredBlur"/>
                 <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                 </feMerge>
               </filter>
             </defs>

             {view === 'ear' ? (
               <g stroke="url(#goldGradient)" strokeWidth="0.4" fill="none" strokeLinecap="round" strokeLinejoin="round">
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5 }}
                    d="M 45 95 C 30 95 25 80 25 70 C 25 60 22 55 22 40 C 22 10 40 2 60 2 C 85 2 92 18 92 40 C 92 68 80 88 60 95 C 55 97 50 95 45 95"
                  />
                  <motion.path 
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 1.5, delay: 0.2 }}
                    d="M 55 8 C 80 8 86 20 86 40 C 86 65 78 80 60 80"
                  />
                  <motion.path 
                     initial={{ pathLength: 0, opacity: 0 }}
                     animate={{ pathLength: 1, opacity: 1 }}
                     transition={{ duration: 1.5, delay: 0.4 }}
                     d="M 22 40 C 22 40 28 45 28 50 C 28 55 22 58 22 62"
                  />
                   <motion.path 
                     initial={{ pathLength: 0, opacity: 0 }}
                     animate={{ pathLength: 1, opacity: 1 }}
                     transition={{ duration: 1.5, delay: 0.5 }}
                     d="M 30 70 C 40 65 50 65 55 55"
                  />
                  <motion.path 
                     initial={{ pathLength: 0, opacity: 0 }}
                     animate={{ pathLength: 1, opacity: 1 }}
                     transition={{ duration: 1.5, delay: 0.6 }}
                     d="M 35 45 C 40 35 55 35 60 40"
                  />
               </g>
             ) : (
               <g>
                   <motion.g
                     initial={{ opacity: 0 }}
                     animate={{ opacity: 1 }}
                     transition={{ duration: 1.5 }}
                     transform="scale(0.09765625, 0.09765625)"
                   >
                     <g transform="translate(0, 1024) scale(0.1, -0.1)" fill="url(#goldGradient)" stroke="none">
                         <path d="M5488 7540 c382 -64 748 -353 888 -704 39 -97 68 -202 60 -222 -14 -37 -34 -10 -61 84 -56 191 -156 354 -300 491 -220 209 -503 321 -810 321 -266 0 -497 -78 -712 -239 -307 -231 -561 -609 -653 -976 -93 -366 -60 -753 127 -1490 82 -326 125 -453 213 -630 97 -196 188 -313 440 -564 210 -209 250 -259 333 -412 120 -223 281 -365 492 -436 72 -25 94 -27 225 -27 134 0 150 2 215 27 185 73 294 200 345 401 11 44 20 95 20 115 0 74 11 111 33 111 19 0 20 -4 14 -92 -8 -116 -37 -232 -78 -308 -68 -127 -191 -230 -336 -278 -68 -22 -95 -26 -213 -26 -158 -1 -215 12 -355 80 -105 51 -203 127 -277 218 -51 62 -66 85 -173 273 -43 76 -83 122 -290 333 -418 427 -501 581 -665 1241 -102 409 -141 629 -162 898 -31 408 62 776 279 1106 275 416 631 667 1013 715 87 10 296 5 388 -10z m80 -434 c87 -22 195 -74 267 -128 131 -100 204 -234 242 -442 24 -135 22 -406 -5 -556 -38 -212 -122 -449 -210 -598 -45 -76 -142 -182 -166 -182 -32 0 -28 29 9 61 114 101 225 330 294 609 38 154 51 260 51 408 0 229 -44 414 -126 535 -58 85 -132 146 -238 197 -127 61 -201 72 -482 68 l-239 -3 -69 -32 c-225 -107 -430 -378 -540 -714 -45 -139 -122 -444 -135 -542 -48 -345 52 -914 219 -1248 95 -188 265 -392 434 -519 47 -36 86 -71 86 -78 0 -32 -34 -21 -106 33 -258 194 -447 457 -553 770 -114 337 -167 782 -126 1058 33 216 146 610 217 752 145 289 366 510 563 562 73 19 526 11 613 -11z m-340 -1006 c30 -53 109 -114 174 -136 112 -37 269 -14 422 62 53 27 71 32 82 23 23 -19 17 -27 -43 -58 -139 -69 -199 -85 -328 -85 -111 -1 -124 1 -180 27 -90 42 -196 154 -181 192 10 26 30 16 54 -25z m660 -201 c-2 -17 -24 -29 -108 -59 -150 -53 -200 -74 -324 -136 -299 -149 -465 -292 -565 -484 -129 -248 -100 -492 80 -670 106 -106 214 -149 422 -170 194 -19 266 -65 387 -244 37 -56 82 -116 101 -134 59 -57 142 -65 209 -19 59 40 75 70 78 155 4 85 8 75 -113 296 -43 80 -49 97 -53 165 -3 64 1 91 28 176 17 55 34 130 37 166 5 58 2 74 -21 125 -37 80 -30 103 56 187 38 37 76 67 83 67 34 0 22 -26 -44 -95 -39 -41 -71 -82 -71 -90 0 -9 10 -35 21 -58 32 -63 29 -159 -11 -300 -50 -175 -45 -218 48 -376 72 -123 92 -178 92 -250 0 -146 -89 -244 -220 -244 -99 0 -152 41 -258 198 -118 177 -166 206 -372 229 -199 23 -287 55 -404 152 -210 174 -263 471 -129 738 137 275 420 478 913 657 124 45 143 47 138 18z m3821 -5165 c27 -63 90 -123 156 -151 25 -10 45 -20 45 -23 0 -3 -25 -16 -56 -29 -63 -27 -123 -90 -151 -156 -10 -25 -20 -45 -23 -45 -3 0 -16 25 -29 56 -27 63 -90 123 -156 151 -25 10 -45 20 -45 23 0 3 25 16 56 29 63 27 123 90 151 156 10 25 20 45 23 45 3 0 16 -25 29 -56z"/>
                         <path d="M3535 8214 c36 -28 61 -36 30 -10 -16 14 -34 26 -40 26 -5 -1 -1 -8 10 -16z"/>
                         <path d="M6739 8239 l-24 -20 30 17 c39 24 40 24 28 24 -6 0 -21 -9 -34 -21z"/>
                         <path d="M1555 7890 c-3 -5 -2 -10 4 -10 5 0 13 5 16 10 3 6 2 10 -4 10 -5 0 -13 -4 -16 -10z"/>
                         <path d="M2615 7295 c-5 -2 -43 -14 -82 -25 -53 -16 -73 -27 -73 -38 0 -39 70 -122 141 -169 31 -20 43 -23 65 -16 l27 9 -52 33 c-47 30 -81 66 -106 111 -5 8 13 -7 39 -33 27 -26 67 -57 90 -69 l41 -21 -42 45 c-38 42 -73 97 -73 114 0 4 16 -15 35 -42 42 -59 111 -113 144 -114 22 0 22 1 -12 39 -45 50 -65 88 -73 140 -6 36 -10 41 -33 40 -14 0 -30 -2 -36 -4z"/>
                         <path d="M2322 7184 c-124 -62 -125 -65 -71 -120 69 -71 190 -117 253 -98 15 5 5 14 -43 39 -76 41 -87 50 -123 99 -43 60 -33 60 23 1 54 -57 135 -105 178 -105 25 0 24 1 -9 21 -43 26 -98 77 -112 104 -7 14 -1 11 23 -10 65 -58 77 -66 123 -80 50 -15 63 -5 17 14 -41 18 -97 79 -121 134 -12 26 -27 47 -34 47 -7 0 -54 -21 -104 -46z m104 -202 c10 -7 0 -3 -22 8 -23 10 -66 42 -95 70 l-54 51 76 -58 c42 -32 85 -64 95 -71z"/>
                         <path d="M2152 7084 l-23 -16 38 -30 c50 -40 151 -88 199 -94 39 -4 39 -4 9 7 -53 21 -132 78 -156 114 -27 39 -35 42 -67 19z"/>
                         <path d="M2817 6994 c-46 -7 -87 -20 -98 -30 -32 -29 -52 -117 -47 -205 8 -131 77 -236 199 -304 51 -28 60 -30 164 -30 101 0 114 2 163 28 167 88 241 274 182 456 l-22 70 -52 11 c-28 6 -97 14 -153 17 l-103 5 1 -43 c1 -37 2 -40 9 -19 l8 25 2 -25 c1 -23 2 -23 10 -5 8 18 9 18 10 -5 1 -21 4 -18 15 15 12 35 14 36 9 8 -8 -50 5 -61 34 -27 16 20 20 22 13 7 -19 -38 -11 -39 21 -3 17 20 25 25 19 13 -6 -12 -16 -25 -21 -28 -6 -3 -10 -13 -10 -20 0 -9 16 2 36 23 l36 37 -26 -36 c-38 -53 -32 -58 16 -14 39 37 40 37 10 5 -34 -38 -43 -66 -17 -56 38 15 47 15 18 0 -39 -21 -44 -38 -7 -24 44 17 51 10 9 -9 -22 -11 -34 -20 -27 -20 7 -1 11 -5 8 -9 -2 -4 12 -7 32 -5 20 1 28 -1 17 -4 -11 -3 -29 -11 -39 -19 -15 -10 -16 -14 -5 -18 41 -13 43 -15 19 -16 -23 -1 -22 -3 10 -16 l35 -14 -40 5 c-40 4 -40 4 20 -25 64 -30 71 -40 12 -15 -58 24 -65 17 -14 -15 26 -16 47 -32 47 -35 0 -3 -17 5 -37 18 -47 30 -80 41 -87 29 -5 -9 41 -57 84 -85 13 -10 20 -17 14 -17 -6 0 -37 19 -70 42 l-59 42 39 -49 39 -50 -48 45 -48 45 32 -57 c38 -67 36 -75 -4 -18 -37 54 -42 44 -11 -19 35 -68 24 -65 -15 4 -33 59 -44 70 -29 29 15 -38 11 -53 -5 -24 l-14 25 -2 -35 -1 -35 -13 45 -13 45 -3 -55 -2 -55 -5 45 -4 45 -13 -35 -13 -35 -3 35 c-2 28 -4 24 -9 -20 l-7 -55 -2 55 -2 55 -15 -30 -14 -30 5 35 5 35 -25 -40 c-26 -42 -35 -38 -10 5 8 14 14 29 15 34 0 17 -32 -18 -51 -56 -11 -21 -22 -38 -25 -38 -3 0 8 26 25 57 l31 56 -27 -24 c-29 -26 -22 -7 10 29 36 39 8 24 -45 -25 l-52 -48 42 51 c23 27 42 54 42 58 0 4 -24 -12 -52 -36 -79 -65 -100 -78 -40 -24 28 26 49 52 46 58 -4 6 -2 8 3 5 6 -4 17 1 24 10 12 14 11 15 -11 8 -14 -37 -14 -52 -22 -16 -7 -28 -11 -28 -8 0 2 18 14 40 25 53 27 51 32 -7 15 -65 -20 -67 -18 -8 11 33 16 41 22 23 19 -76 -14 -79 -13 -28 5 l55 20 -70 -4 c-67 -5 -68 -4 -20 5 77 15 85 22 35 29 l-45 7 45 3 45 3 -40 7 -40 7 40 3 40 2 -45 14 c-39 12 -40 13 -10 9 19 -3 41 -1 49 4 11 7 4 14 -27 30 -23 12 -42 24 -42 26 0 3 18 -4 40 -15 45 -23 54 -25 44 -8 -5 8 -1 9 12 5 10 -4 -3 14 -31 39 -43 40 -44 42 -10 17 63 -47 70 -49 45 -12 l-23 34 31 -29 c18 -17 32 -25 32 -19 0 6 -7 16 -15 23 -8 7 -15 17 -15 23 0 6 12 0 28 -14 15 -13 21 -17 15 -9 -21 24 -14 34 9 14 12 -10 18 -13 14 -6 -4 6 -3 12 3 12 5 0 12 -6 14 -12 3 -7 6 1 7 17 1 26 3 27 10 10 8 -18 9 -18 10 5 l2 25 8 -25 c7 -22 8 -21 9 13 l1 38 -72 -2 c-40 -1 -108 -8 -151 -15z m153 -39 c0 -5 -5 -3 -10 5 -5 8 -10 20 -10 25 0 6 5 3 10 -5 5 -8 10 -19 10 -25z m-75 -1 c9 -15 12 -23 6 -20 -11 7 -35 46 -28 46 3 0 12 -12 22 -26z m-11 -30 c5 -14 4 -15 -9 -4 -17 14 -19 20 -6 20 5 0 12 -7 15 -16z m346 13 c0 -2 -14 -16 -31 -33 -22 -21 -28 -24 -23 -10 5 14 4 17 -4 12 -18 -11 -14 0 5 15 11 10 14 10 9 2 -10 -18 9 -16 24 2 12 14 20 19 20 12z m-369 -65 c-6 -2 -9 -8 -6 -13 9 -13 -55 -3 -68 11 -10 10 -8 10 10 1 31 -16 38 -14 22 7 -11 14 -11 15 1 5 26 -24 34 -13 9 14 l-24 26 33 -24 c18 -13 28 -25 23 -27z m409 33 c0 -2 -10 -9 -22 -15 -22 -11 -22 -10 -4 4 21 17 26 19 26 11z m-440 -80 c7 -8 8 -15 2 -15 -5 0 -15 7 -22 15 -7 8 -8 15 -2 15 5 0 15 -7 22 -15z m467 -1 c-3 -3 -12 -4 -19 -1 -8 3 -5 6 6 6 11 1 17 -2 13 -5z m-44 -11 c-7 -2 -19 -2 -25 0 -7 3 -2 5 12 5 14 0 19 -2 13 -5z m62 -103 c13 -5 14 -9 5 -9 -8 0 -24 4 -35 9 -13 5 -14 9 -5 9 8 0 24 -4 35 -9z m-535 -44 c0 -2 -7 -7 -16 -10 -8 -3 -12 -2 -9 4 6 10 25 14 25 6z m96 -15 c-4 -5 -30 -28 -59 -52 l-52 -43 50 52 c43 46 77 69 61 43z m434 -11 c8 -5 11 -10 5 -10 -5 0 -17 5 -25 10 -8 5 -10 10 -5 10 6 0 17 -5 25 -10z m-70 -87 c0 -8 -9 0 -50 45 l-45 47 48 -45 c26 -24 47 -45 47 -47z m-273 -15 c-3 -7 -5 -2 -5 12 0 14 2 19 5 13 2 -7 2 -19 0 -25z m173 -33 c0 -5 -5 -3 -10 5 -5 8 -10 20 -10 25 0 6 5 3 10 -5 5 -8 10 -19 10 -25z m-73 -7 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z m-110 -10 c-3 -8 -6 -5 -6 6 -1 11 2 17 5 13 3 -3 4 -12 1 -19z"/>
                         <path d="M6678 6946 c-89 -51 -207 -131 -258 -176 -19 -16 10 -1 65 36 55 36 148 89 207 119 67 33 101 56 91 59 -22 9 -23 9 -105 -38z"/>
                         <path d="M7150 6901 c-27 -7 -28 -11 -16 -54 11 -38 -16 -69 -58 -65 -40 4 -43 -14 -14 -72 55 -108 180 -119 245 -21 73 109 -29 248 -157 212z"/>
                         <path d="M6350 6683 c-98 -66 -140 -119 -110 -138 20 -13 59 -15 85 -5 l27 10 -25 45 c-14 25 -23 45 -19 45 9 0 62 -94 62 -109 0 -7 -23 -11 -60 -11 -52 0 -64 4 -84 24 l-22 25 -33 -20 c-23 -14 -31 -26 -29 -42 3 -20 9 -22 53 -21 82 1 236 17 232 23 -21 39 -39 93 -45 137 l-7 54 -25 -17z"/>
                     </g>
                   </motion.g>
               </g>
             )}

             {currentPoints.map((point) => {
               const isSelected = visualSelectionId === point.id;
               return (
                 <g key={point.id} onClick={() => handlePointClick(point)} className="cursor-pointer group">
                   <circle cx={point.x} cy={point.y} r="6" fill="transparent" />
                   <g transform={`translate(${point.x}, ${point.y})`}>
                      <JewelryRenderer point={point} isSelected={isSelected} />
                   </g>
                   <g className={`opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${isSelected ? 'opacity-100' : ''}`}>
                       <text 
                        x={point.x} 
                        y={point.y + 10} 
                        fontSize="3" 
                        fill="white"
                        textAnchor="middle"
                        className="font-sans pointer-events-none drop-shadow-md"
                        style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}
                        >
                        {point.label}
                        </text>
                   </g>
                 </g>
               );
             })}
           </svg>
           
           <AnimatePresence>
             {hoverMessage && (
               <motion.div
                 initial={{ opacity: 0, y: 5 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, y: 5 }}
                 className="absolute z-20 bg-brand-surface border border-white/10 text-slate-200 text-xs px-4 py-2 rounded-xl shadow-xl backdrop-blur-md whitespace-nowrap pointer-events-none flex items-center gap-2"
                 style={{ 
                   left: `${hoverMessage.x}%`, 
                   top: `${hoverMessage.y - 12}%`,
                   transform: 'translate(-50%, -100%)' 
                 }}
               >
                 <AlertCircle className="w-3 h-3 text-brand-primary" />
                 {hoverMessage.text}
                 <div className="absolute bottom-[-5px] left-1/2 -translate-x-1/2 w-2.5 h-2.5 bg-brand-surface border-b border-r border-white/10 rotate-45"></div>
               </motion.div>
             )}
           </AnimatePresence>
        </div>
      </div>

      <div className="order-1 md:order-2 h-full">
        <h3 className="text-2xl font-serif text-white mb-6 border-r-2 border-brand-primary pr-4">
           {selectedService ? 'הבחירה שלך' : 'בחר אזור לניקוב'}
        </h3>
        
        <AnimatePresence mode="wait">
          {selectedService ? (
            <motion.div
              key="selected"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-brand-surface border-brand-primary/30 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                 
                 <div className="relative z-10">
                   <div className="flex justify-between items-start mb-4">
                     <h2 className="text-3xl font-medium text-white">{selectedService.name}</h2>
                     <div className="text-3xl font-serif text-brand-primary">₪{selectedService.price}</div>
                   </div>
                   
                   <div className="space-y-4 mb-8">
                      <div className="flex items-center gap-3 text-slate-400">
                        <Clock className="w-4 h-4 text-brand-primary" />
                        <span>משך טיפול: <span className="text-white">{selectedService.duration_minutes} דקות</span></span>
                      </div>
                      <div className="flex items-center gap-3 text-slate-400">
                        <Sparkles className="w-4 h-4 text-brand-primary" />
                        <span>רמת כאב: <span className="text-white">●●○○○ (קל)</span></span>
                      </div>
                      <p className="text-slate-400 text-sm leading-relaxed border-t border-white/5 pt-4">
                        {selectedService.description}
                      </p>
                   </div>
                   
                   <div className="flex gap-3">
                     <button onClick={() => { onSelect(null as any); setVisualSelectionId(null); }} className="text-sm text-slate-500 hover:text-white underline">
                        בחר שירות אחר
                     </button>
                   </div>
                 </div>
              </Card>
            </motion.div>
          ) : (
             <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar"
             >
                <p className="text-slate-500 text-sm mb-4">
                   לחץ על האזורים במפה או בחר מהרשימה המלאה:
                </p>
                {services.filter(s => view === 'ear' ? s.category === 'Ear' : s.category !== 'Ear').map((service) => (
                   <div 
                      key={service.id}
                      onClick={() => {
                          const point = [...earPoints, ...facePoints].find(p => service.name.includes(p.keyword));
                          if (point) setVisualSelectionId(point.id);
                          onSelect(service);
                      }}
                      className="flex items-center justify-between p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/5 hover:border-brand-primary/20 cursor-pointer transition-all group"
                   >
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 rounded-lg bg-brand-dark overflow-hidden">
                            <img src={service.image_url} alt="" className="w-full h-full object-cover opacity-70 group-hover:opacity-100" />
                         </div>
                         <div>
                            <div className="text-white font-medium text-sm group-hover:text-brand-primary transition-colors">{service.name}</div>
                            <div className="text-xs text-slate-500">{service.duration_minutes} דק'</div>
                         </div>
                      </div>
                      <div className="text-brand-primary/70 font-serif">₪{service.price}</div>
                   </div>
                ))}
             </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const Booking: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(BookingStep.SELECT_SERVICE);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [availability, setAvailability] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [details, setDetails] = useState({ name: '', phone: '', email: '', notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
       const s = await api.getServices();
       setServices(s);
    };
    load();
  }, []);

  useEffect(() => {
      const loadSlots = async () => {
          setLoading(true);
          const slots = await api.getAvailability(selectedDate);
          setAvailability(slots);
          setLoading(false);
      };
      loadSlots();
  }, [selectedDate]);

  const handleNext = () => {
      if (step === BookingStep.SELECT_SERVICE && selectedService) setStep(BookingStep.SELECT_DATE);
      else if (step === BookingStep.SELECT_DATE && selectedSlot) setStep(BookingStep.DETAILS);
      else if (step === BookingStep.DETAILS && details.name && details.phone) handleSubmit();
  };

  const handleBack = () => {
      if (step === BookingStep.SELECT_DATE) setStep(BookingStep.SELECT_SERVICE);
      else if (step === BookingStep.DETAILS) setStep(BookingStep.SELECT_DATE);
  };

  const handleSubmit = async () => {
      if (!selectedService || !selectedSlot) return;
      
      setLoading(true);
      try {
          const [hours, minutes] = selectedSlot.split(':').map(Number);
          const startTime = new Date(selectedDate);
          startTime.setHours(hours, minutes);

          await api.createAppointment({
              service_id: selectedService.id,
              client_name: details.name,
              client_phone: details.phone,
              client_email: details.email,
              notes: details.notes,
              start_time: startTime.toISOString()
          });
          setStep(BookingStep.CONFIRMATION);
      } catch (e) {
          setError('אירעה שגיאה בקביעת התור. אנא נסה שנית.');
      }
      setLoading(false);
  };

  const formatDate = (date: Date) => {
      return date.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  const changeDate = (days: number) => {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + days);
      if (newDate < new Date()) return;
      setSelectedDate(newDate);
      setSelectedSlot(null);
  };

  return (
    <div className="pt-24 pb-20 container mx-auto px-6 min-h-screen">
       <div className="max-w-5xl mx-auto">
          <div className="mb-12 text-center">
             <h1 className="text-4xl font-serif text-white mb-4">קביעת תור</h1>
          </div>

          <Card className="min-h-[600px] p-0 overflow-hidden bg-brand-surface/50 border-white/5 relative">
             {loading && (
                 <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                 </div>
             )}

             <div className="p-6 md:p-8">
                {step === BookingStep.SELECT_SERVICE && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <AnatomyMap 
                            services={services} 
                            selectedService={selectedService} 
                            onSelect={setSelectedService} 
                        />
                        <div className="mt-8 flex justify-end">
                            <Button 
                                onClick={handleNext} 
                                disabled={!selectedService}
                                className="w-full md:w-auto"
                            >
                                המשך לבחירת תאריך <ArrowLeft className="w-4 h-4 mr-2" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === BookingStep.SELECT_DATE && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-8">
                        <div className="flex items-center justify-between bg-brand-dark/30 p-4 rounded-2xl border border-white/5">
                            <button onClick={() => changeDate(-1)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                <ArrowRight className="w-6 h-6" />
                            </button>
                            <div className="text-center">
                                <div className="text-slate-400 text-sm">תאריך נבחר</div>
                                <div className="text-xl text-white font-serif">{formatDate(selectedDate)}</div>
                            </div>
                            <button onClick={() => changeDate(1)} className="p-2 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        </div>

                        <div>
                            <h3 className="text-white mb-4 text-center">שעות פנויות</h3>
                            {availability.length > 0 ? (
                                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                                    {availability.map((slot, i) => (
                                        <button
                                            key={i}
                                            disabled={!slot.available}
                                            onClick={() => setSelectedSlot(slot.time)}
                                            className={`
                                                py-3 px-2 rounded-xl text-sm font-medium transition-all
                                                ${!slot.available ? 'opacity-30 cursor-not-allowed bg-white/5 text-slate-500' : 
                                                  selectedSlot === slot.time ? 'bg-brand-primary text-brand-dark shadow-lg scale-105' : 
                                                  'bg-brand-surface border border-white/10 text-white hover:border-brand-primary/50 hover:bg-white/5'}
                                            `}
                                        >
                                            {slot.time}
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-500 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    אין תורים פנויים לתאריך זה
                                </div>
                            )}
                        </div>

                        <div className="flex justify-between mt-8 pt-8 border-t border-white/5">
                            <Button variant="ghost" onClick={handleBack}>
                                <ArrowRight className="w-4 h-4 ml-2" /> חזרה
                            </Button>
                            <Button onClick={handleNext} disabled={!selectedSlot}>
                                המשך לפרטים <ArrowLeft className="w-4 h-4 mr-2" />
                            </Button>
                        </div>
                    </motion.div>
                )}

                {step === BookingStep.DETAILS && (
                     <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-md mx-auto space-y-6">
                        <h3 className="text-2xl font-serif text-white text-center mb-8">פרטים אישיים</h3>
                        <Input label="שם מלא" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} />
                        <Input label="טלפון" type="tel" value={details.phone} onChange={e => setDetails({...details, phone: e.target.value})} />
                        <Input label="אימייל" type="email" value={details.email} onChange={e => setDetails({...details, email: e.target.value})} />
                        <div className="flex flex-col gap-2">
                             <label className="text-sm font-medium text-slate-400 ms-1">הערות (אופציונלי)</label>
                             <textarea 
                                className="bg-brand-dark/50 border border-brand-border focus:border-brand-primary/50 text-white px-5 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600 focus:ring-1 focus:ring-brand-primary/20 h-24 resize-none"
                                value={details.notes}
                                onChange={e => setDetails({...details, notes: e.target.value})}
                             />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{error}</p>}

                        <div className="flex justify-between mt-8 pt-8 border-t border-white/5">
                            <Button variant="ghost" onClick={handleBack}>
                                <ArrowRight className="w-4 h-4 ml-2" /> חזרה
                            </Button>
                            <Button onClick={handleSubmit} disabled={!details.name || !details.phone}>
                                אשר הזמנה <Check className="w-4 h-4 mr-2" />
                            </Button>
                        </div>
                     </motion.div>
                )}

                {step === BookingStep.CONFIRMATION && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
                        <div className="w-20 h-20 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10" />
                        </div>
                        <h2 className="text-3xl font-serif text-white mb-4">התור נקבע בהצלחה!</h2>
                        <p className="text-slate-400 max-w-md mx-auto mb-8">
                            תודה {details.name}, קבענו לך תור ל{selectedService?.name} בתאריך {formatDate(selectedDate)} בשעה {selectedSlot}.
                            <br/> הודעת אישור נשלחה לנייד.
                        </p>
                        <Button onClick={() => window.location.href = '/'} variant="outline">
                            חזרה לדף הבית
                        </Button>
                    </motion.div>
                )}
             </div>
          </Card>
       </div>
    </div>
  );
};

export default Booking;