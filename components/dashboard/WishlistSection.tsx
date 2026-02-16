import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Service } from '../../types';
import { api } from '../../services/mockApi';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2, Heart, ShoppingBag } from 'lucide-react';
import { SmartImage } from '../SmartImage';
import { Button } from '../ui';
import { useNavigate } from 'react-router-dom';

export const WishlistSection: React.FC = () => {
    const { user } = useAuth();
    const [wishlistItems, setWishlistItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchWishlist = async () => {
            if (user?.id) {
                try {
                    const items = await api.getWishlist(user.id);
                    setWishlistItems(items);
                } catch (error) {
                    console.error("Failed to fetch wishlist", error);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchWishlist();
    }, [user]);

    const removeFromWishlist = async (serviceId: string) => {
        if (!user) return;
        try {
            const updatedIds = await api.toggleWishlist(user.id, serviceId);
            setWishlistItems(prev => prev.filter(item => updatedIds.includes(item.id)));
        } catch (error) {
            console.error("Failed to remove item", error);
        }
    };

    if (loading) return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>;

    if (wishlistItems.length === 0) {
        return (
            <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                <Heart className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                <h3 className="text-xl font-serif text-white mb-2">רשימת המשאלות ריקה</h3>
                <p className="text-slate-400 mb-6 max-w-sm mx-auto">שמור את התכשיטים שאתה אוהב כדי לתכנן את הלוק הבא שלך.</p>
                <Button onClick={() => navigate('/jewelry')}>
                    למעבר לגלריה
                </Button>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlistItems.map((item) => (
                <motion.div
                    key={item.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-white/5 border border-white/10"
                >
                    {/* Remove Button */}
                    <button
                        onClick={() => removeFromWishlist(item.id)}
                        className="absolute top-2 right-2 z-20 p-2 rounded-full bg-black/40 text-red-500 hover:bg-red-500/20 transition-colors"
                    >
                        <Heart className="w-4 h-4 fill-current" />
                    </button>

                    <SmartImage
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-100 flex flex-col justify-end p-4">
                        <h4 className="text-white font-medium text-sm truncate">{item.name}</h4>
                        <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-slate-400 uppercase">{item.category}</span>
                            <span className="text-brand-primary font-bold text-sm">₪{item.price}</span>
                        </div>
                    </div>
                </motion.div>
            ))}
        </div>
    );
};
