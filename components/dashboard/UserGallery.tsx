import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Calendar, Sparkles, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/mockApi';
import { Appointment } from '../../types';
import { SmartImage } from '../SmartImage';
import { Button } from '../ui';

export const UserGallery: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [images, setImages] = useState<{ id: string, url: string, date: string, serviceName: string }[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchImages = async () => {
            if (!user) return;
            try {
                const appointments = await api.getAppointmentsForUser(user.id);

                const galleryItems = appointments
                    .filter(app => app.visual_plan) // Only keep appointments with visual plan
                    .map(app => {
                        try {
                            const plan = JSON.parse(app.visual_plan || '{}');
                            // Prioritize uploaded original image or userImage
                            const imageUrl = plan.original_image || plan.userImage;

                            if (imageUrl) {
                                return {
                                    id: app.id,
                                    url: imageUrl,
                                    date: app.start_time,
                                    serviceName: app.service_name || 'טיפול אישי'
                                };
                            }
                            return null;
                        } catch (e) {
                            return null;
                        }
                    })
                    .filter((item): item is NonNullable<typeof item> => item !== null);

                setImages(galleryItems);
            } catch (error) {
                console.error("Failed to fetch user gallery", error);
            } finally {
                setLoading(false);
            }
        };

        fetchImages();
    }, [user]);

    return (
        <div className="min-h-screen bg-brand-dark text-white p-4 pt-24 pb-32">
            <div className="container mx-auto max-w-4xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif text-brand-primary">הגלריה שלי</h1>
                        <p className="text-slate-400 text-sm">תמונות מההדמיות והטיפולים שלך</p>
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="w-8 h-8 border-2 border-brand-primary border-t-transparent animate-spin rounded-full"></div>
                    </div>
                ) : images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {images.map((img) => (
                            <motion.div
                                key={img.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-white/5 bg-white/5"
                            >
                                <SmartImage
                                    src={img.url}
                                    alt={img.serviceName}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />

                                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                    <p className="text-white font-medium text-sm truncate">{img.serviceName}</p>
                                    <div className="flex items-center gap-1 text-xs text-brand-primary mt-1">
                                        <Calendar className="w-3 h-3" />
                                        <span>{new Date(img.date).toLocaleDateString('he-IL')}</span>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-16 h-16 rounded-full bg-white/5 mx-auto flex items-center justify-center mb-4">
                            <ImageIcon className="w-8 h-8 text-slate-500" />
                        </div>
                        <h3 className="text-xl font-medium text-white mb-2">אין תמונות עדיין</h3>
                        <p className="text-slate-400 max-w-xs mx-auto mb-6">
                            התמונות שתעלה במהלך הזמנת התור או ההדמיות שתיצור יופיעו כאן.
                        </p>
                        <Button onClick={() => navigate('/booking')}>
                            <Sparkles className="w-4 h-4 ml-2" />
                            צור הדמייה חדשה
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
};
