import React from 'react';
import { motion } from 'framer-motion';

export const EarIdentity: React.FC = () => {
    return (
        <div className="relative w-full h-[500px] flex items-center justify-center overflow-hidden">
            {/* Background Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[100px] animate-pulse-slow"></div>

            {/* Central Ear Graphic Placeholder (SVG or 3D Model Container) */}
            <div className="relative z-10 w-64 h-80 border border-brand-primary/20 rounded-[4rem] bg-brand-surface/10 backdrop-blur-md flex items-center justify-center group overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <div className="absolute inset-0 bg-gradient-to-tr from-brand-primary/10 to-transparent opacity-50 group-hover:opacity-100 transition-opacity duration-700"></div>

                {/* Ear Silhouette SVG */}
                <svg viewBox="0 0 200 300" className="w-40 h-60 text-brand-primary/50 fill-none stroke-current stroke-2 drop-shadow-[0_0_10px_rgba(212,181,133,0.3)]">
                    <path d="M60,40 Q140,40 160,100 Q180,160 140,240 Q100,320 60,260 Q40,230 40,180 Q40,130 60,100 T100,140" />
                </svg>

                {/* Floating Nodes (Piercing Spots) */}
                {[1, 2, 3].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white]"
                        style={{ top: `${30 + i * 20}%`, left: `${60 + i * 10}%` }}
                        animate={{ scale: [1, 1.2, 1], opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.5 }}
                    />
                ))}

                <div className="absolute bottom-6 text-brand-primary font-serif tracking-widest text-xs opacity-70">EAR IDENTITY</div>
            </div>

            {/* Orbiting Elements */}
            <motion.div
                className="absolute w-[400px] h-[400px] border border-white/5 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute top-0 left-1/2 w-2 h-2 bg-brand-primary/50 rounded-full blur-sm"></div>
            </motion.div>
            <motion.div
                className="absolute w-[500px] h-[500px] border border-white/5 rounded-full"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            >
                <div className="absolute bottom-0 left-1/2 w-1 h-1 bg-white/30 rounded-full"></div>
            </motion.div>
        </div>
    );
};
