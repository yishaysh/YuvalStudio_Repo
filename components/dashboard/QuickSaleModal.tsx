import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plus, Minus, ShoppingBag, Zap, Check } from 'lucide-react';
import { Modal, Button } from '../ui';
import { Service, JewelryItem, StudioSettings } from '../../types';
import { api } from '../../services/mockApi';

interface CartItem {
    id: string;
    name: string;
    quantity: number;
    cost_price: number;
    final_price: number;
    is_service: boolean;
    image_url?: string;
    category?: string;
}

interface QuickSaleModalProps {
    isOpen: boolean;
    onClose: () => void;
    services: Service[];
    settings: StudioSettings;
    onSaved: () => void;
    editingApt?: any;
}

export const QuickSaleModal: React.FC<QuickSaleModalProps> = ({
    isOpen,
    onClose,
    services,
    settings,
    onSaved,
    editingApt
}) => {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [search, setSearch] = useState('');
    const [clientName, setClientName] = useState('');
    const [clientPhone, setClientPhone] = useState('');
    const [discountPercent, setDiscountPercent] = useState<number>(0);
    const [couponCode, setCouponCode] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [done, setDone] = useState(false);
    const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

    const inventoryItems: JewelryItem[] = (settings.inventory_items || []).filter(
        (item: JewelryItem) => item.price > 0
    );

    // Merge inventory and services into a single browsable list
    const allItems = useMemo(() => {
        const inv = inventoryItems.map(i => ({
            id: i.id,
            name: i.name,
            cost_price: i.cost_price || 0,
            final_price: i.price,
            image_url: i.image_url,
            category: i.category,
            is_service: false
        }));
        const svc = services.map(s => ({
            id: s.id,
            name: s.name,
            cost_price: 0,
            final_price: s.price,
            image_url: s.image_url,
            category: 'שירות',
            is_service: true
        }));
        return [...svc, ...inv];
    }, [inventoryItems, services]);

    React.useEffect(() => {
        if (isOpen && editingApt) {
            setClientName(editingApt.client_name === 'לקוח מזדמן' ? '' : editingApt.client_name);
            setClientPhone(editingApt.client_phone || '');
            
            if (editingApt.cart_items && Array.isArray(editingApt.cart_items)) {
                const restoredCart: CartItem[] = editingApt.cart_items.map((ci: any) => {
                    const matchedItem = allItems.find(ai => ai.id === ci.service_id);
                    return {
                        id: ci.service_id,
                        name: ci.name,
                        quantity: ci.quantity,
                        cost_price: ci.cost_price || 0,
                        final_price: ci.final_price || 0,
                        is_service: matchedItem ? matchedItem.is_service : false,
                        image_url: matchedItem?.image_url,
                        category: matchedItem?.category
                    };
                });
                setCart(restoredCart);
            } else {
                setCart([]);
            }
        } else if (!isOpen) {
            setCart([]);
            setClientName('');
            setClientPhone('');
            setSearch('');
            setDiscountPercent(0);
            setCouponCode('');
            setDone(false);
            setEnlargedImage(null);
        }
    }, [isOpen, editingApt, allItems]);

    const filtered = useMemo(() => {
        if (!search) return allItems;
        const q = search.toLowerCase();
        return allItems.filter(i => i.name.toLowerCase().includes(q));
    }, [allItems, search]);

    const addToCart = (item: typeof allItems[0]) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === item.id);
            if (existing) {
                return prev.map(c => c.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
            }
            const newItem: CartItem = {
                id: item.id,
                name: item.name,
                quantity: 1,
                cost_price: item.cost_price,
                final_price: item.final_price,
                is_service: item.is_service,
                image_url: item.image_url ?? undefined,
                category: item.category ?? undefined
            };
            return [...prev, newItem];
        });
    };

    const removeFromCart = (id: string) => {
        setCart(prev => {
            const existing = prev.find(c => c.id === id);
            if (existing && existing.quantity > 1) {
                return prev.map(c => c.id === id ? { ...c, quantity: c.quantity - 1 } : c);
            }
            return prev.filter(c => c.id !== id);
        });
    };

    const { totalRevenue, totalCost, totalProfit, baseRevenue } = useMemo(() => {
        let revenue = 0;
        let cost = 0;
        cart.forEach(c => {
            revenue += c.final_price * c.quantity;
            cost += c.cost_price * c.quantity;
        });
        
        const finalRev = Math.max(0, revenue * (1 - (discountPercent / 100)));
        return { totalRevenue: finalRev, totalCost: cost, totalProfit: finalRev - cost, baseRevenue: revenue };
    }, [cart, discountPercent]);

    const handleSave = async () => {
        if (cart.length === 0) return;
        setIsSaving(true);
        try {
            const now = new Date().toISOString();
            const cartItemsForApt = cart.map(c => ({
                service_id: c.id,
                name: c.name,
                quantity: c.quantity,
                cost_price: c.cost_price,
                final_price: c.final_price
            }));

            // Find the first service in cart as the "primary" service; else use generic
            const primaryService = cart.find(c => c.is_service);

            const notesStr = `מכירה מהירה (קופה)${discountPercent > 0 ? `\nהנחה מיושמת: ${discountPercent}%` : ''}`;

            if (editingApt) {
                // Update existing quick sale
                await api.updateAppointment(editingApt.id, {
                    client_name: clientName || 'לקוח מזדמן',
                    client_phone: clientPhone || '',
                    service_id: primaryService?.id || cart[0].id,
                    service_name: primaryService?.name || cart[0].name,
                    cart_items: cartItemsForApt,
                    final_price: totalRevenue,
                    price: baseRevenue,
                    notes: notesStr,
                    total_cost: totalCost,
                    total_profit: totalProfit,
                    coupon_code: couponCode || undefined
                });
            } else {
                // Create new quick sale
                await api.updateAppointment(
                    (await api.createAppointment({
                        client_id: undefined,
                        client_name: clientName || 'לקוח מזדמן',
                        client_email: '',
                        client_phone: clientPhone || '',
                        service_id: primaryService?.id || cart[0].id,
                        service_name: primaryService?.name || cart[0].name,
                        start_time: now,
                        end_time: now,
                        status: 'completed' as const,
                        notes: notesStr,
                        coupon_code: couponCode || undefined,
                        cart_items: cartItemsForApt,
                        final_price: totalRevenue,
                        total_cost: totalCost,
                        total_profit: totalProfit
                    })).id,
                    {
                        status: 'completed',
                        cart_items: cartItemsForApt,
                        final_price: totalRevenue,
                        total_cost: totalCost,
                        total_profit: totalProfit,
                        coupon_code: couponCode || undefined
                    }
                );
            }

            setDone(true);
            setTimeout(() => {
                setDone(false);
                setCart([]);
                setClientName('');
                setClientPhone('');
                onSaved();
                onClose();
            }, 1800);
        } catch (err) {
            console.error('Quick Sale error:', err);
            alert('אירעה שגיאה בשמירת המכירה');
        } finally {
            setIsSaving(false);
        }
    };

    const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={editingApt ? "עריכת קופה מהירה ⚡" : "קופה מהירה ⚡"}>
            {/* Scrollable content area */}
            <div className="flex flex-col gap-5" style={{ paddingBottom: cart.length > 0 ? '80px' : '0' }}>

                {/* Client (Optional) */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">שם לקוח (אופציונלי)</label>
                        <input
                            value={clientName}
                            onChange={e => setClientName(e.target.value)}
                            placeholder="לקוח מזדמן"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/50"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-slate-400 mb-1 block">טלפון (אופציונלי)</label>
                        <input
                            value={clientPhone}
                            onChange={e => setClientPhone(e.target.value)}
                            placeholder="050-0000000"
                            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/50"
                        />
                    </div>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="חפש שירות או תכשיט..."
                        className="w-full bg-white/5 border border-white/10 rounded-lg pr-9 pl-3 py-2 text-sm text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/50"
                    />
                </div>

                {/* Item Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                    {filtered.map(item => {
                        const inCart = cart.find(c => c.id === item.id);
                        return (
                            <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.96 }}
                                onClick={() => addToCart(item)}
                                className={`relative flex gap-2 p-2.5 rounded-xl border transition-all text-sm text-right ${
                                    inCart
                                        ? 'bg-brand-primary/15 border-brand-primary/40 text-white'
                                        : 'bg-white/5 border-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10'
                                }`}
                                style={{ alignItems: 'center' }}
                            >
                                {inCart && (
                                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-brand-primary text-xs text-black font-bold rounded-full flex items-center justify-center z-10 shadow-md">
                                        {inCart.quantity}
                                    </span>
                                )}
                                <div 
                                    className={`w-10 h-10 rounded-md shrink-0 overflow-hidden border border-white/10 flex flex-col items-center justify-center text-lg ${item.image_url ? 'cursor-zoom-in bg-black/40' : 'bg-white/5'}`}
                                    onClick={(e) => {
                                        if (item.image_url) {
                                            e.stopPropagation();
                                            setEnlargedImage(item.image_url);
                                        }
                                    }}
                                >
                                    {item.image_url ? 
                                        <img src={item.image_url} alt={item.name} className="w-full h-full object-cover rounded-md" /> :
                                        <span>{item.is_service ? '🎯' : '💎'}</span>
                                    }
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium truncate text-xs" title={item.name}>{item.name}</div>
                                    <div className="text-brand-primary font-bold mt-0.5">₪{item.final_price}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {item.is_service ? 'שירות' : 'תכשיט'}
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* Cart Summary */}
                {cart.length > 0 && (
                    <div className="bg-white/5 rounded-xl border border-white/10 p-3 space-y-2">
                        <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5" /> עגלה ({cartCount} פריטים)
                        </div>
                        {cart.map(item => (
                            <div key={item.id} className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2">
                                    <button onClick={() => removeFromCart(item.id)}
                                        className="w-5 h-5 rounded-full bg-white/10 hover:bg-red-500/20 flex items-center justify-center text-slate-400 hover:text-red-400 transition-colors">
                                        <Minus className="w-3 h-3" />
                                    </button>
                                    <span className="text-white text-xs w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => addToCart({ ...item, image_url: item.image_url ?? '', category: item.category ?? '' })}
                                        className="w-5 h-5 rounded-full bg-white/10 hover:bg-green-500/20 flex items-center justify-center text-slate-400 hover:text-green-400 transition-colors">
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                                <span className="text-slate-300 truncate max-w-[130px]">{item.name}</span>
                                <span className="text-brand-primary font-bold">₪{item.final_price * item.quantity}</span>
                            </div>
                        ))}
                        
                        {/* Discount and Coupon Config */}
                        <div className="pt-2 border-t border-white/10 grid grid-cols-2 gap-3 mt-2">
                            <div>
                                <label className="text-[10px] text-slate-400 mb-1 block">הנחה (%)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={discountPercent || ''}
                                    onChange={e => setDiscountPercent(Number(e.target.value) || 0)}
                                    placeholder="0"
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/50"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] text-slate-400 mb-1 block">קוד קופון</label>
                                <input
                                    value={couponCode}
                                    onChange={e => setCouponCode(e.target.value)}
                                    placeholder="הזן קוד..."
                                    className="w-full bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white placeholder:text-slate-600 outline-none focus:border-brand-primary/50"
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t border-white/10 flex justify-between text-sm font-bold">
                            <span className="text-slate-400">סה״כ לתשלום</span>
                            <span className="text-white text-base">₪{totalRevenue}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>רווח נקי</span>
                            <span className="text-emerald-400">₪{totalProfit}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Pay Button – always visible at bottom when cart has items */}
            <AnimatePresence>
                {cart.length > 0 && (
                    <motion.div
                        key="floating-btn"
                        initial={{ y: 30, opacity: 0, scale: 0.95 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.95 }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                        style={{
                            position: 'sticky',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 10,
                            marginTop: '12px',
                            marginLeft: '-1.5rem',
                            marginRight: '-1.5rem',
                            padding: '12px 1.5rem 16px',
                            background: 'linear-gradient(to top, rgba(15,15,30,0.98) 70%, transparent)',
                            backdropFilter: 'blur(12px)',
                        }}
                    >
                        <AnimatePresence mode="wait">
                            {done ? (
                                <motion.div
                                    key="done"
                                    initial={{ scale: 0.8, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    className="flex items-center justify-center gap-2 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-xl py-3 font-bold text-sm"
                                >
                                    <Check className="w-4 h-4" /> המכירה נשמרה בהצלחה!
                                </motion.div>
                            ) : (
                                <motion.div key="btn">
                                    <Button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="w-full flex items-center justify-center gap-2 py-3 text-base font-bold shadow-lg shadow-brand-primary/30"
                                        variant="primary"
                                    >
                                        <Zap className="w-5 h-5" />
                                        {isSaving ? 'שומר...' : `סיים וגבה תשלום • ₪${totalRevenue}`}
                                    </Button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}
            </AnimatePresence>
            </Modal>

            {/* Enlarged Image Modal */}
            <AnimatePresence>
                {enlargedImage && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-brand-dark/95 backdrop-blur-md"
                        onClick={() => setEnlargedImage(null)}
                    >
                        <motion.div 
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="relative max-w-4xl w-full max-h-screen flex items-center justify-center pointer-events-none"
                        >
                            <img 
                                src={enlargedImage} 
                                alt="enlarged preview" 
                                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl pointer-events-auto border border-white/10" 
                                onClick={(e) => e.stopPropagation()}
                            />
                            <button 
                                className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-all pointer-events-auto"
                                onClick={() => setEnlargedImage(null)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
};
