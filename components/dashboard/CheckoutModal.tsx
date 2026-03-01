import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Search, Plus, Minus, DollarSign, Sparkles } from 'lucide-react';
import { Modal, Button } from '../ui';
import { Appointment, JewelryItem } from '../../types';

interface CartItem {
    service_id: string;
    name: string;
    quantity: number;
    cost_price: number;
    final_price: number;
    image_url?: string;
    category?: string;
}

interface CheckoutModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointment: Appointment;
    inventoryItems: JewelryItem[];
    baseServicesPrice?: number;
    onSave: (data: {
        cart_items: CartItem[];
        total_cost: number;
        total_profit: number;
        final_price: number;
    }) => Promise<void>;
}

const CheckoutModal: React.FC<CheckoutModalProps> = ({
    isOpen,
    onClose,
    appointment,
    inventoryItems,
    baseServicesPrice = 0,
    onSave
}) => {
    const [cartItems, setCartItems] = useState<CartItem[]>(appointment.cart_items || []);
    const [searchQuery, setSearchQuery] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Computed totals
    const { totalJewelryRevenue, totalCost, totalProfit } = useMemo(() => {
        let revenue = 0;
        let cost = 0;
        cartItems.forEach(item => {
            revenue += item.final_price * item.quantity;
            cost += item.cost_price * item.quantity;
        });
        return {
            totalJewelryRevenue: revenue,
            totalCost: cost,
            totalProfit: revenue - cost
        };
    }, [cartItems]);

    const finalCartPrice = baseServicesPrice + totalJewelryRevenue;

    const filteredInventory = useMemo(() => {
        if (!searchQuery) return inventoryItems;
        const lowerQ = searchQuery.toLowerCase();
        return inventoryItems.filter(item =>
            item.name.toLowerCase().includes(lowerQ) ||
            item.category.toLowerCase().includes(lowerQ)
        );
    }, [inventoryItems, searchQuery]);

    const handleAddItem = (item: JewelryItem) => {
        setCartItems(prev => {
            const existing = prev.find(p => p.service_id === item.id);
            if (existing) {
                return prev.map(p => p.service_id === item.id ? { ...p, quantity: p.quantity + 1 } : p);
            }
            return [...prev, {
                service_id: item.id,
                name: item.name,
                quantity: 1,
                cost_price: item.cost_price || 0,
                final_price: item.price,
                image_url: item.image_url,
                category: item.category
            }];
        });
    };

    const updateItemQuantity = (id: string, delta: number) => {
        setCartItems(prev => prev.map(item => {
            if (item.service_id === id) {
                const newQ = Math.max(0, item.quantity + delta);
                return { ...item, quantity: newQ };
            }
            return item;
        }).filter(item => item.quantity > 0));
    };

    const updateItemPrice = (id: string, price: number) => {
        setCartItems(prev => prev.map(item => {
            if (item.service_id === id) {
                return { ...item, final_price: price };
            }
            return item;
        }));
    };

    const handleComplete = async () => {
        setIsSaving(true);
        try {
            await onSave({
                cart_items: cartItems,
                total_cost: totalCost,
                total_profit: totalProfit,
                final_price: finalCartPrice
            });
            onClose();
        } catch (error) {
            console.error('Error saving checkout:', error);
            alert('שגיאה בשמירת סיכום תור');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`סיכום תור - ${appointment.client_name}`}>
            <div className="flex flex-col lg:flex-row gap-6 h-[70vh]">

                {/* Left Panel: Inventory Selection */}
                <div className="flex-1 flex flex-col bg-brand-dark/30 rounded-2xl border border-white/5 overflow-hidden">
                    <div className="p-4 border-b border-white/5 bg-brand-surface/50">
                        <h3 className="font-medium text-white mb-3">בחירת תכשיטים שהוכנסו</h3>
                        <div className="relative">
                            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="חיפוש לפי שם או קטגוריה..."
                                className="w-full bg-brand-dark border border-white/10 rounded-xl pr-10 pl-4 py-2 text-sm text-white focus:border-brand-primary outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {filteredInventory.map(item => {
                                const inCart = cartItems.find(c => c.service_id === item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleAddItem(item)}
                                        className={`relative p-2 rounded-xl border cursor-pointer transition-all hover:scale-[1.02] flex flex-col items-center text-center group ${inCart ? 'bg-brand-primary/10 border-brand-primary/50' : 'bg-brand-surface border-white/5 hover:border-brand-primary/30'}`}
                                    >
                                        {inCart && (
                                            <div className="absolute -top-2 -right-2 w-6 h-6 bg-brand-primary rounded-full text-brand-dark flex items-center justify-center font-bold text-xs shadow-lg z-10">
                                                {inCart.quantity}
                                            </div>
                                        )}
                                        <div className="w-16 h-16 rounded-lg overflow-hidden bg-black mb-2 relative">
                                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                                            {(!item.in_stock || (item.stock_quantity && item.stock_quantity <= 0)) && (
                                                <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                                                    <span className="text-[10px] text-red-400 font-bold bg-black/50 px-1 py-0.5 rounded">חסר במלאי</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="text-xs font-medium text-white mb-1 line-clamp-1 w-full" title={item.name}>{item.name}</div>
                                        <div className="text-[10px] text-brand-primary font-bold">₪{item.price}</div>
                                        {(item.stock_quantity !== undefined && item.stock_quantity > 0) && (
                                            <div className="text-[9px] text-slate-500 mt-0.5">מלאי: {item.stock_quantity}</div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Right Panel: Cart & Summary */}
                <div className="w-full lg:w-[380px] flex flex-col h-full bg-brand-surface rounded-2xl border border-white/5">
                    <div className="p-4 border-b border-white/5 bg-brand-dark/50 flex justify-between items-center">
                        <h3 className="font-medium text-white">סיכום חיובים</h3>
                        <span className="text-xs px-2 py-1 rounded-full bg-slate-800 text-slate-300">
                            {cartItems.reduce((acc, item) => acc + item.quantity, 0)} פריטים
                        </span>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {/* Services Base Cost */}
                        <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                            <div>
                                <div className="text-sm text-white">עלות טיפולים מיומן</div>
                                <div className="text-[10px] text-slate-400">ללא תכשיטים</div>
                            </div>
                            <div className="font-bold text-white text-sm">₪{baseServicesPrice}</div>
                        </div>

                        {/* Cart Items */}
                        {cartItems.map(item => (
                            <div key={item.service_id} className="p-3 bg-brand-primary/5 rounded-xl border border-brand-primary/20 space-y-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-black shrink-0">
                                        {item.image_url ? <img src={item.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-800" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-white truncate">{item.name}</div>
                                        <div className="text-[10px] text-slate-400">עלות: ₪{item.cost_price} ליחידה</div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <div className="flex items-center gap-2 bg-brand-dark rounded-lg p-1">
                                        <button onClick={() => updateItemQuantity(item.service_id, -1)} className="w-6 h-6 flex items-center justify-center rounded-md text-slate-400 hover:text-white hover:bg-white/10">
                                            <Minus className="w-3 h-3" />
                                        </button>
                                        <span className="text-xs font-bold w-4 text-center text-white">{item.quantity}</span>
                                        <button onClick={() => updateItemQuantity(item.service_id, 1)} className="w-6 h-6 flex items-center justify-center rounded-md text-brand-primary hover:bg-brand-primary/20">
                                            <Plus className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] text-slate-400">₪</span>
                                        <input
                                            type="number"
                                            value={item.final_price}
                                            onChange={(e) => updateItemPrice(item.service_id, Number(e.target.value) || 0)}
                                            className="w-16 text-xs text-center bg-brand-dark border border-white/10 rounded py-1 px-1 text-white focus:border-brand-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                        {cartItems.length === 0 && (
                            <div className="text-center py-8 text-slate-500 text-sm">
                                לא נבחרו תכשיטים
                            </div>
                        )}
                    </div>

                    <div className="p-5 border-t border-white/5 bg-gradient-to-br from-brand-surface to-brand-dark/50">
                        <div className="space-y-2 mb-4 text-sm">
                            <div className="flex justify-between text-slate-400">
                                <span>סך הכל טיפולים:</span>
                                <span>₪{baseServicesPrice}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>סך הכל תכשיטים:</span>
                                <span>₪{totalJewelryRevenue}</span>
                            </div>
                            <div className="flex justify-between text-brand-primary/80 pt-2 border-t border-white/5">
                                <span>סה"כ חייב לקוח:</span>
                                <span className="font-bold text-brand-primary text-lg">₪{finalCartPrice}</span>
                            </div>
                            {totalProfit > 0 && (
                                <div className="flex justify-between text-emerald-400 pt-1 text-xs font-bold items-center">
                                    <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> רווח נקי מתכשיטים:</span>
                                    <span>₪{totalProfit}</span>
                                </div>
                            )}
                        </div>

                        <Button
                            onClick={handleComplete}
                            disabled={isSaving}
                            className="w-full flex justify-center items-center gap-2"
                        >
                            {isSaving ? 'שומר...' : (
                                <>
                                    <Check className="w-4 h-4" /> שמור וסיים תור
                                </>
                            )}
                        </Button>
                    </div>
                </div>

            </div>
        </Modal>
    );
};

export default CheckoutModal;
