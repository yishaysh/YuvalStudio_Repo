import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/mockApi';
import { Appointment } from '../types';
import { AppointmentTimeline } from '../components/dashboard/AppointmentTimeline';
import { ActionDock } from '../components/dashboard/ActionDock';
import { AftercareAssistant } from '../components/dashboard/AftercareAssistant';
import { WishlistSection } from '../components/dashboard/WishlistSection';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { Button } from '../components/ui';
import { Loader2, LogOut, User, Calendar, Settings, Clock, Heart, Share2, Copy, Gift, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const ReferralDashboard = ({ profile }: { profile: any }) => {
    const [copied, setCopied] = useState(false);
    
    if (!profile?.referral_code) return null;

    const referralLink = `${window.location.origin}/?ref=${profile.referral_code}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: 'YuvalStudio - סטטודיו לפירסינג',
                text: 'היי! קבלי הפניה עם הנחה לפירסינג הבא שלך אצל יובל:',
                url: referralLink,
            }).catch(console.error);
        } else {
            handleCopy();
        }
    };

    return (
        <div className="bg-brand-surface border border-white/10 rounded-2xl overflow-hidden mt-6">
            <div className="bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 p-6 border-b border-brand-primary/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                    <Gift className="w-24 h-24 text-brand-primary" />
                </div>
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h3 className="text-xl font-serif text-white flex items-center gap-2 mb-1">
                            <Gift className="w-5 h-5 text-brand-primary" /> חברה מביאה חברה
                        </h3>
                        <p className="text-sm text-slate-300">הזמיני חברות וקבלי קרדיט לקניית תכשיטים!</p>
                    </div>
                </div>
            </div>
            
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between p-4 bg-brand-primary/5 border border-brand-primary/20 rounded-xl">
                    <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">הקרדיט שלך</div>
                        <div className="text-2xl font-serif text-brand-primary font-bold">₪{profile.credit_balance || 0}</div>
                    </div>
                    <Button variant="outline" className="text-sm border-brand-primary/50 text-brand-primary hover:bg-brand-primary hover:text-brand-dark" onClick={() => window.location.href = '/booking'}>
                        מימוש קרדיט
                    </Button>
                </div>

                <div>
                    <div className="text-sm text-slate-400 mb-2">ברגע שחברה תקבע תור דרך הלינק שלך, היא תקבל 10% הנחה ואת תקבלי 30 ₪ לקרדיט!</div>
                    <div className="flex gap-2 relative">
                        <div className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-300 truncate dir-ltr select-all">
                            {referralLink}
                        </div>
                        <Button variant="primary" onClick={handleShare} className="gap-2 shrink-0">
                            {copied ? <CheckCircle className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                            {copied ? 'הועתק!' : 'שתפי'}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const PersonalArea: React.FC = () => {
    const { user, profile, loading: authLoading, signOut } = useAuth();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [loadingAppointments, setLoadingAppointments] = useState(true);
    const navigate = useNavigate();

    const name = profile?.full_name || user?.user_metadata?.full_name || 'אורח';

    // Simple heuristic for gender estimation (Hebrew)
    // Default to Male (as requested by user who is male)
    const isFemale = React.useMemo(() => {
        if (!name || name === 'אורח') return false;
        const firstName = name.split(' ')[0].trim();
        // Check for common female endings
        return (firstName.endsWith('ה') || firstName.endsWith('ת') || firstName.endsWith('ית')) &&
            !['יהודה', 'יונה', 'שילה', 'נח', 'פטריק', 'מושיקו'].some(m => firstName.includes(m));
    }, [name]);

    const [studioDetails, setStudioDetails] = useState(DEFAULT_STUDIO_DETAILS);

    useEffect(() => {
        const fetchData = async () => {
            // Parallel fetch
            if (user?.id) {
                try {
                    const [appointmentsData, settingsData] = await Promise.all([
                        api.getAppointmentsForUser(user.id),
                        api.getSettings()
                    ]);
                    setAppointments(appointmentsData);
                    if (settingsData.studio_details) {
                        setStudioDetails(settingsData.studio_details);
                    }
                } catch (error) {
                    console.error("Failed to fetch data:", error);
                } finally {
                    setLoadingAppointments(false);
                }
            } else if (!authLoading && !user) {
                navigate('/');
            }
        };

        if (!authLoading) {
            fetchData();
        }
    }, [user, authLoading, navigate]);

    if (authLoading || loadingAppointments) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
            </div>
        );
    }



    return (
        <div className="min-h-screen bg-black text-white relative overflow-hidden">
            {/* Background Ambience - Simplified for Performance */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-full h-[500px] bg-gradient-to-b from-brand-primary/10 to-transparent opacity-40"></div>
                <div className="absolute bottom-0 left-0 w-full h-[500px] bg-gradient-to-t from-blue-900/10 to-transparent opacity-30"></div>
            </div>

            <div className="container mx-auto px-4 pt-24 pb-24 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                    <div className="flex items-center gap-6">
                        {/* Avatar */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.5 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-brand-primary/30 overflow-hidden bg-brand-primary/10 flex-shrink-0"
                        >
                            {(profile?.avatar_url || user?.user_metadata?.avatar_url) ? (
                                <img
                                    src={profile?.avatar_url || user?.user_metadata?.avatar_url}
                                    alt={name}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-3xl font-serif text-brand-primary">
                                    {name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </motion.div>

                        <div>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-brand-primary font-medium tracking-widest text-sm uppercase mb-2"
                            >
                                THE EAR IDENTITY PORTAL
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                                className="text-4xl md:text-6xl font-serif font-bold text-white mb-2"
                            >
                                שלום, {name}
                            </motion.h1>
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="text-slate-400 max-w-2xl text-lg leading-relaxed"
                            >
                                האיזור האישי שלך לניהול תורים וצפייה בהיסטוריית הטיפולים.
                            </motion.p>
                        </div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex gap-4"
                    >
                        {/* Stats / Quick Info Cards could go here */}
                        <div className="hidden md:block text-right">
                            <div className="text-2xl font-serif text-white">{appointments.length}</div>
                            <div className="text-xs text-slate-500 uppercase tracking-wider">טיפולים</div>
                        </div>
                    </motion.div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                    {/* Main Content Area - Timeline (Left/Right depending on RTL) */}
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 }}
                        className="lg:col-span-8 order-2 lg:order-1"
                    >
                        <AftercareAssistant appointments={appointments} />

                        <div className="mb-12">
                            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-brand-primary" />
                                ציר הזמן שלי
                            </h2>
                            <AppointmentTimeline appointments={appointments} studioDetails={studioDetails} />
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-serif text-white mb-6 flex items-center gap-2">
                                <Heart className="w-5 h-5 text-brand-primary" />
                                רשימת המשאלות שלי
                            </h2>
                            <WishlistSection />
                        </div>
                    </motion.div>

                    {/* Visual Area - Right Side (Desktop) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-4 order-1 lg:order-2 sticky top-24"
                    >
                        {/* Quick Actions Dock - Now prominent */}
                        <div className="mt-0">
                            <ActionDock
                                onBookNew={() => navigate('/booking')}
                                onViewGallery={() => navigate('/dashboard/gallery')}
                                onOpenSettings={() => navigate('/dashboard/settings')}
                                onLogout={signOut}
                            />
                        </div>

                        {/* Referral Action Card */}
                        <ReferralDashboard profile={profile} />
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PersonalArea;
