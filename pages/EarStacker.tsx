
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Card, SectionHeading } from '../components/ui';
import { Trash2, RotateCw, Save, RefreshCw, Move, Plus, Sparkles, Upload, Camera, ShoppingBag, X, Loader2 } from 'lucide-react';
import { api, JewelryLibraryItem } from '../services/mockApi';
// @ts-ignore
import html2canvas from 'html2canvas';

const m = motion as any;

interface PlacedJewel {
    id: string;
    libraryId: string;
    name: string;
    imageUrl: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
}

const EarStacker: React.FC = () => {
    const [bgImage, setBgImage] = useState<string | null>(null);
    const [jewelryCatalog, setJewelryCatalog] = useState<JewelryLibraryItem[]>([]);
    const [placedJewels, setPlacedJewels] = useState<PlacedJewel[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const load = async () => {
            const items = await api.getJewelryLibrary();
            setJewelryCatalog(items);
            setIsLoading(false);
        };
        load();
    }, []);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => setBgImage(event.target?.result as string);
            reader.readAsDataURL(file);
        }
    };

    const addJewel = (item: JewelryLibraryItem) => {
        const newJewel: PlacedJewel = {
            id: Math.random().toString(36).substr(2, 9),
            libraryId: item.id,
            name: item.name,
            imageUrl: item.image_url,
            x: 150,
            y: 150,
            rotation: 0,
            scale: 1
        };
        setPlacedJewels([...placedJewels, newJewel]);
        setSelectedId(newJewel.id);
    };

    const updateJewel = (id: string, updates: Partial<PlacedJewel>) => {
        setPlacedJewels(prev => prev.map(j => j.id === id ? { ...j, ...updates } : j));
    };

    const removeJewel = (id: string) => {
        setPlacedJewels(prev => prev.filter(j => j.id !== id));
        if (selectedId === id) setSelectedId(null);
    };

    const handleSave = async () => {
        if (!canvasRef.current) return;
        setIsSaving(true);
        try {
            const canvas = await html2canvas(canvasRef.current, { 
                useCORS: true,
                backgroundColor: '#0f172a'
            });
            const link = document.createElement('a');
            link.download = 'my-ear-design.png';
            link.href = canvas.toDataURL();
            link.click();
        } catch (err) {
            console.error(err);
        }
        setIsSaving(false);
    };

    return (
        <div className="pt-24 pb-20 min-h-screen bg-brand-dark">
            <div className="container mx-auto px-6">
                <SectionHeading title="Ear Architect" subtitle="עצבי את האוזן המושלמת שלך" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    
                    {/* Catalog Sidebar */}
                    <div className="lg:col-span-3 space-y-6">
                        <Card className="p-4">
                            <h3 className="text-white font-medium mb-4 flex items-center gap-2">
                                <ShoppingBag className="w-4 h-4 text-brand-primary" /> קטלוג תכשיטים
                            </h3>
                            {isLoading ? (
                                <div className="flex justify-center py-10"><Loader2 className="animate-spin text-brand-primary" /></div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto custom-scrollbar pr-2">
                                    {jewelryCatalog.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => addJewel(item)}
                                            className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 hover:border-brand-primary/50 transition-all bg-brand-dark/40"
                                        >
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-contain p-2 opacity-80 group-hover:opacity-100 transition-opacity" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <Plus className="text-white w-6 h-6" />
                                            </div>
                                        </button>
                                    ))}
                                    {jewelryCatalog.length === 0 && <p className="col-span-2 text-center text-slate-500 text-xs py-10">אין תכשיטים במאגר</p>}
                                </div>
                            )}
                        </Card>
                        
                        <div className="p-4 bg-brand-primary/5 border border-brand-primary/10 rounded-xl text-xs text-slate-400 leading-relaxed">
                            <p className="font-bold text-brand-primary mb-1 italic">איך זה עובד?</p>
                            1. העלי תמונה של האוזן שלך.<br/>
                            2. בחרי תכשיטים מהקטלוג.<br/>
                            3. גררי, סובבי והתאימי את הגודל.<br/>
                            4. שמרי את העיצוב ושלחי לנו!
                        </div>
                    </div>

                    {/* Canvas Stage */}
                    <div className="lg:col-span-6 flex flex-col items-center">
                        <div 
                            ref={canvasRef}
                            className="relative w-full max-w-[450px] aspect-[3/4] bg-slate-900 rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden touch-none"
                            onClick={() => setSelectedId(null)}
                        >
                            {bgImage ? (
                                <img src={bgImage} alt="Ear" className="w-full h-full object-cover pointer-events-none" />
                            ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-brand-primary/5 via-transparent to-transparent">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6 text-slate-500 border border-white/5">
                                        <Camera className="w-10 h-10" />
                                    </div>
                                    <h4 className="text-xl text-white mb-2 font-serif">התחילי כאן</h4>
                                    <p className="text-slate-500 text-sm mb-6">העלי תמונה של האוזן שלך כדי להתחיל לעצב</p>
                                    <Button onClick={() => fileInputRef.current?.click()}>
                                        <Upload className="w-4 h-4" /> העלאת תמונה
                                    </Button>
                                </div>
                            )}

                            {/* Placed Items */}
                            {placedJewels.map((jewel) => (
                                <m.div
                                    key={jewel.id}
                                    drag
                                    dragMomentum={false}
                                    onTap={() => setSelectedId(jewel.id)}
                                    initial={{ scale: 0 }}
                                    animate={{ 
                                        scale: jewel.scale, 
                                        rotate: jewel.rotation,
                                        opacity: 1
                                    }}
                                    className={`absolute cursor-move ${selectedId === jewel.id ? 'z-50' : 'z-10'}`}
                                    style={{ left: 0, top: 0, x: jewel.x, y: jewel.y }}
                                    onDragEnd={(_: any, info: any) => {
                                        updateJewel(jewel.id, { x: jewel.x + info.offset.x, y: jewel.y + info.offset.y });
                                    }}
                                >
                                    <div className={`relative ${selectedId === jewel.id ? 'ring-2 ring-brand-primary ring-offset-2 ring-offset-transparent rounded-full shadow-[0_0_15px_rgba(212,181,133,0.5)]' : ''}`}>
                                        <img 
                                            src={jewel.imageUrl} 
                                            alt={jewel.name} 
                                            className="w-12 h-12 md:w-16 md:h-16 object-contain pointer-events-none drop-shadow-lg" 
                                        />
                                    </div>
                                </m.div>
                            ))}
                        </div>

                        <div className="mt-8 flex gap-4 w-full max-w-[450px]">
                            <Button variant="secondary" onClick={() => { setBgImage(null); setPlacedJewels([]); }} className="flex-1">
                                <RefreshCw className="w-4 h-4" /> איפוס
                            </Button>
                            <Button onClick={handleSave} isLoading={isSaving} disabled={!bgImage} className="flex-[2] shadow-xl shadow-brand-primary/20">
                                <Save className="w-4 h-4" /> שמירת עיצוב
                            </Button>
                        </div>
                    </div>

                    {/* Active Jewel Controls */}
                    <div className="lg:col-span-3">
                        <AnimatePresence mode="wait">
                            {selectedId ? (
                                <m.div
                                    key="controls"
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                >
                                    <Card className="p-6 border-brand-primary/30">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-white font-medium">עריכת תכשיט</h3>
                                            <button onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-white"><X className="w-4 h-4" /></button>
                                        </div>
                                        
                                        <div className="space-y-8">
                                            <div>
                                                <label className="text-xs text-slate-500 block mb-3 uppercase tracking-wider">סיבוב</label>
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="range" min="0" max="360" 
                                                        value={placedJewels.find(j => j.id === selectedId)?.rotation || 0}
                                                        onChange={(e) => updateJewel(selectedId, { rotation: parseInt(e.target.value) })}
                                                        className="w-full accent-brand-primary"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-xs text-slate-500 block mb-3 uppercase tracking-wider">גודל</label>
                                                <div className="flex items-center gap-4">
                                                    <input 
                                                        type="range" min="0.3" max="2.5" step="0.05"
                                                        value={placedJewels.find(j => j.id === selectedId)?.scale || 1}
                                                        onChange={(e) => updateJewel(selectedId, { scale: parseFloat(e.target.value) })}
                                                        className="w-full accent-brand-primary"
                                                    />
                                                </div>
                                            </div>

                                            <Button variant="danger" onClick={() => removeJewel(selectedId)} className="w-full">
                                                <Trash2 className="w-4 h-4" /> הסרת תכשיט
                                            </Button>
                                        </div>
                                    </Card>
                                </m.div>
                            ) : (
                                <div className="text-center p-8 border border-dashed border-white/10 rounded-2xl">
                                    <Sparkles className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                    <p className="text-slate-500 text-sm">בחרי תכשיט על האוזן כדי לערוך אותו</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleUpload} accept="image/*" className="hidden" />
        </div>
    );
};

export default EarStacker;
