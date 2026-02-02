import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, SectionHeading } from '../components/ui';
import { Trash2, RotateCw, Save, RefreshCw, Move, Plus, Sparkles } from 'lucide-react';
// @ts-ignore
import html2canvas from 'html2canvas';

const m = motion as any;

// Types
type JewelryType = 'hoop' | 'stud' | 'pendant' | 'cuff';
interface PlacedItem {
    id: string;
    type: JewelryType;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    color: string;
}

const JEWELRY_PALETTE = [
    { id: 'gold', color: '#fbbf24', name: 'זהב' }, // Gold
    { id: 'silver', color: '#e2e8f0', name: 'כסף' }, // Silver
    { id: 'rose', color: '#f43f5e', name: 'רוז' }, // Rose Gold
    { id: 'black', color: '#1e293b', name: 'שחור' }, // Black
];

const JEWELRY_ASSETS = [
    { type: 'stud', label: 'נקודה' },
    { type: 'hoop', label: 'חישוק' },
    { type: 'pendant', label: 'תליון' },
    { type: 'cuff', label: 'חבק' },
];

// SVG Components for Jewelry
const JewelryIcon = ({ type, color }: { type: string, color: string }) => {
    switch (type) {
        case 'stud':
            return <circle cx="10" cy="10" r="5" fill={color} stroke="rgba(0,0,0,0.2)" strokeWidth="1" />;
        case 'hoop':
            return <path d="M10,2 A8,8 0 1,1 10,18 A8,8 0 1,1 10,2" fill="none" stroke={color} strokeWidth="2.5" />;
        case 'pendant':
             return (
                 <g>
                    <circle cx="10" cy="4" r="2" fill={color} />
                    <line x1="10" y1="4" x2="10" y2="12" stroke={color} strokeWidth="1" />
                    <path d="M10,12 L7,18 L13,18 Z" fill={color} />
                 </g>
             );
        case 'cuff':
            return <path d="M5,5 Q10,0 15,5 L15,15 Q10,20 5,15 Z" fill="none" stroke={color} strokeWidth="3" />;
        default:
            return <circle cx="10" cy="10" r="5" fill={color} />;
    }
};

const EarStacker: React.FC = () => {
    const [items, setItems] = useState<PlacedItem[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [activeColor, setActiveColor] = useState('#fbbf24');
    const containerRef = useRef<HTMLDivElement>(null);
    const [isSaving, setIsSaving] = useState(false);

    const addItem = (type: JewelryType) => {
        const newItem: PlacedItem = {
            id: Math.random().toString(36).substr(2, 9),
            type,
            x: 150, // Center-ish relative to canvas
            y: 150,
            rotation: 0,
            scale: 1,
            color: activeColor
        };
        setItems([...items, newItem]);
        setSelectedId(newItem.id);
    };

    const updateItem = (id: string, updates: Partial<PlacedItem>) => {
        setItems(items.map(item => item.id === id ? { ...item, ...updates } : item));
    };

    const removeItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const handleSaveImage = async () => {
        if (!containerRef.current) return;
        setIsSaving(true);
        try {
            const canvas = await html2canvas(containerRef.current, { backgroundColor: null, scale: 2 });
            const link = document.createElement('a');
            link.download = 'my-ear-stack.png';
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error(err);
        }
        setIsSaving(false);
    };

    return (
        <div className="pt-24 pb-20 min-h-screen bg-brand-dark overflow-hidden">
            <div className="container mx-auto px-4 lg:px-8">
                <SectionHeading title="Ear Stacker" subtitle="עצבי את האוזן שלך" />

                <div className="flex flex-col lg:flex-row gap-8 items-start max-w-6xl mx-auto">
                    
                    {/* TOOLBOX */}
                    <div className="w-full lg:w-64 space-y-6">
                        <Card className="p-5">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2"><Sparkles className="w-4 h-4 text-brand-primary"/> בחר צבע</h3>
                            <div className="flex gap-3">
                                {JEWELRY_PALETTE.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => setActiveColor(p.color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${activeColor === p.color ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-70'}`}
                                        style={{ backgroundColor: p.color }}
                                        title={p.name}
                                    />
                                ))}
                            </div>
                        </Card>

                        <Card className="p-5">
                            <h3 className="text-white font-medium mb-4">תכשיטים</h3>
                            <div className="grid grid-cols-2 gap-3">
                                {JEWELRY_ASSETS.map((asset) => (
                                    <button
                                        key={asset.type}
                                        onClick={() => addItem(asset.type as JewelryType)}
                                        className="flex flex-col items-center justify-center p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 hover:border-brand-primary/30 transition-all group"
                                    >
                                        <svg width="30" height="30" viewBox="0 0 20 20" className="mb-2">
                                            <JewelryIcon type={asset.type} color={activeColor} />
                                        </svg>
                                        <span className="text-xs text-slate-400 group-hover:text-white">{asset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </Card>

                        <div className="hidden lg:block text-slate-500 text-xs leading-relaxed p-4 bg-brand-surface/50 rounded-xl border border-white/5">
                            <p className="mb-2">💡 <strong>טיפ:</strong> גררי את התכשיטים על גבי האוזן. לחצי על תכשיט כדי לסובב אותו או למחוק.</p>
                            <p>סיימת? שמרי את התמונה ושלחי לנו לוואטסאפ!</p>
                        </div>
                    </div>

                    {/* CANVAS AREA */}
                    <div className="flex-1 w-full flex flex-col items-center">
                        <div 
                            ref={containerRef}
                            className="relative w-full max-w-[400px] aspect-[3/4] bg-gradient-to-br from-brand-surface to-brand-dark rounded-3xl border border-white/10 shadow-2xl overflow-hidden select-none touch-none"
                            onClick={() => setSelectedId(null)}
                        >
                            {/* EAR SVG BACKGROUND */}
                            <svg viewBox="0 0 300 400" className="absolute inset-0 w-full h-full opacity-90 pointer-events-none">
                                <defs>
                                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                                        <feGaussianBlur stdDeviation="5" result="blur" />
                                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                                    </filter>
                                </defs>
                                {/* Simple Abstract Ear Shape */}
                                <path 
                                    d="M100,80 C50,80 30,150 40,250 C50,330 90,380 150,380 C190,380 200,350 190,330 C180,310 160,320 150,320 C110,320 80,280 80,200 C80,140 100,120 130,120 C160,120 180,140 180,180 C180,220 160,250 160,250" 
                                    fill="none" 
                                    stroke="#e2e8f0" 
                                    strokeWidth="2" 
                                    strokeLinecap="round"
                                    filter="url(#glow)"
                                    opacity="0.3"
                                />
                                {/* Detailed Anatomy Lines (Helix, Rook, Daith placeholders) */}
                                <path d="M70,120 Q60,180 60,220" stroke="#e2e8f0" strokeWidth="1" fill="none" opacity="0.1" />
                                <path d="M120,160 Q130,180 120,200" stroke="#e2e8f0" strokeWidth="1" fill="none" opacity="0.1" />
                            </svg>

                            {/* Render Items */}
                            {items.map(item => (
                                <m.div
                                    key={item.id}
                                    drag
                                    dragMomentum={false}
                                    onTap={() => setSelectedId(item.id)}
                                    initial={{ scale: 0 }}
                                    animate={{ 
                                        scale: item.scale, 
                                        rotate: item.rotation 
                                    }}
                                    className={`absolute cursor-move ${selectedId === item.id ? 'z-50 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'z-10'}`}
                                    style={{ 
                                        left: 0, 
                                        top: 0,
                                        x: item.x,
                                        y: item.y
                                    }}
                                    onDragEnd={(_: any, info: any) => {
                                        updateItem(item.id, { x: item.x + info.offset.x, y: item.y + info.offset.y });
                                    }}
                                >
                                    <div className="w-12 h-12 flex items-center justify-center pointer-events-none">
                                        <svg width="40" height="40" viewBox="0 0 20 20">
                                            <JewelryIcon type={item.type} color={item.color} />
                                        </svg>
                                    </div>
                                    
                                    {/* Selection Ring */}
                                    {selectedId === item.id && (
                                        <div className="absolute inset-0 border border-brand-primary rounded-full opacity-50 pointer-events-none animate-pulse" />
                                    )}
                                </m.div>
                            ))}

                            {/* Controls for Selected Item (Floating near bottom of canvas) */}
                            <AnimatePresence>
                                {selectedId && (
                                    <m.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 20 }}
                                        className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-[100]"
                                        onClick={(e: any) => e.stopPropagation()}
                                    >
                                        <div className="bg-brand-dark/90 backdrop-blur border border-white/10 rounded-full p-2 flex gap-3 shadow-xl">
                                            <button 
                                                onClick={() => {
                                                    const item = items.find(i => i.id === selectedId);
                                                    if(item) updateItem(item.id, { rotation: item.rotation + 45 });
                                                }}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
                                                title="סובב"
                                            >
                                                <RotateCw className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const item = items.find(i => i.id === selectedId);
                                                    if(item) updateItem(item.id, { scale: item.scale === 1 ? 1.5 : 1 });
                                                }}
                                                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors"
                                                title="שנה גודל"
                                            >
                                                <Move className="w-4 h-4" />
                                            </button>
                                            <div className="w-[1px] h-auto bg-white/10"></div>
                                            <button 
                                                onClick={() => selectedId && removeItem(selectedId)}
                                                className="p-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 rounded-full transition-colors"
                                                title="מחק"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </m.div>
                                )}
                            </AnimatePresence>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-6 w-full max-w-[400px]">
                            <Button variant="secondary" onClick={() => setItems([])} className="flex-1">
                                <RefreshCw className="w-4 h-4" /> נקה הכל
                            </Button>
                            <Button onClick={handleSaveImage} isLoading={isSaving} className="flex-[2]">
                                <Save className="w-4 h-4" /> שמור עיצוב
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EarStacker;