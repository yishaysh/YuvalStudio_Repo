import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Save, User, Phone, Mail, Loader2, AlertCircle, CheckCircle2, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import { api } from '../../services/mockApi';
import { Button, Input } from '../ui';

export const UserSettings: React.FC = () => {
    const { user, profile, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            setFullName(profile.full_name || '');
            setPhone(profile.phone || '');
            setAvatarUrl(profile.avatar_url || '');
        } else if (user) {
            setFullName(user.user_metadata?.full_name || '');
            setPhone(user.phone || '');
            setAvatarUrl(user.user_metadata?.avatar_url || '');
        }
    }, [profile, user]);

    const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setMessage(null);

        try {
            // Upload to Supabase Storage (using gallery-images as general storage for now)
            const publicUrl = await api.uploadImage(file, 'gallery-images');

            if (publicUrl) {
                setAvatarUrl(publicUrl);
                // Optional: Save immediately or wait for general save? 
                // Let's save immediately for better UX with images
                if (user && supabase) {
                    await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id);
                    await refreshProfile();
                }
                setMessage({ type: 'success', text: 'תמונת פרופיל עודכנה בהצלחה' });
            } else {
                setMessage({ type: 'error', text: 'שגיאה בהעלאת התמונה' });
            }
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'שגיאה בהעלאת התמונה' });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(null);
        setIsSaving(true);

        try {
            if (!user) throw new Error("No user logged in");

            const updateData = {
                full_name: fullName,
                phone: phone,
                avatar_url: avatarUrl
            };

            if (!supabase) {
                setMessage({ type: 'error', text: 'שגיאת מערכת: לא ניתן להתחבר לשרת' });
                return;
            }

            const { error } = await supabase
                .from('profiles')
                .update(updateData)
                .eq('id', user.id);

            if (error) throw error;

            await refreshProfile(); // Refresh AuthContext to update UI everywhere
            setMessage({ type: 'success', text: 'הפרטים עודכנו בהצלחה' });
        } catch (error) {
            console.error("Failed to update profile", error);
            setMessage({ type: 'error', text: 'אירעה שגיאה בעדכון הפרטים' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-brand-dark text-white p-4 pt-24 pb-32">
            <div className="container mx-auto max-w-xl">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-serif text-brand-primary">הגדרות חשבון</h1>
                        <p className="text-slate-400 text-sm">עדכון פרטים אישיים</p>
                    </div>
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8"
                >
                    <form onSubmit={handleSave} className="space-y-6">
                        {/* Avatar / Initials */}
                        <div className="flex flex-col items-center mb-8">
                            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                                <div className="w-24 h-24 rounded-full bg-brand-primary/10 border-2 border-brand-primary/30 flex items-center justify-center overflow-hidden">
                                    {isUploading ? (
                                        <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                    ) : avatarUrl ? (
                                        <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-3xl font-serif text-brand-primary">{fullName ? fullName.charAt(0).toUpperCase() : <User className="w-10 h-10" />}</span>
                                    )}
                                </div>
                                {/* Overlay */}
                                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="w-8 h-8 text-white/80" />
                                </div>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                            </div>
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="mt-2 text-sm text-brand-primary hover:text-brand-primary/80 transition-colors"
                            >
                                שינוי תמונה
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Input
                                    label="שם מלא"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="text-right"
                                    placeholder="שמך המלא"
                                    required
                                    icon={<User className="w-5 h-5" />}
                                />
                            </div>

                            <div>
                                <Input
                                    label="טלפון"
                                    value={phone}
                                    onChange={(e) => setPhone(e.target.value)}
                                    className="text-right"
                                    placeholder="מספר טלפון"
                                    dir="ltr"
                                    icon={<Phone className="w-5 h-5" />}
                                />
                            </div>

                            <div>
                                <Input
                                    label="אימייל (לקריאה בלבד)"
                                    value={user?.email || ''}
                                    readOnly
                                    className="opacity-60 cursor-not-allowed border-white/5 bg-white/5 text-left"
                                    icon={<Mail className="w-5 h-5" />}
                                />
                            </div>
                        </div>

                        {message && (
                            <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                {message.text}
                            </div>
                        )}

                        <div className="pt-4">
                            <Button
                                type="submit"
                                className="w-full h-12 text-base"
                                disabled={isSaving || isUploading}
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4 ml-2" /> שמור שינויים</>}
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
};
