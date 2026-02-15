import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/mockApi';
import { Appointment } from '../types';
import { AppointmentTimeline } from '../components/dashboard/AppointmentTimeline';
import { ActionDock } from '../components/dashboard/ActionDock';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { Button } from '../components/ui';
import { Loader2, LogOut, User, Calendar, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

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
            {/* Background Ambience */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-[120px] opacity-30"></div>
                <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[100px] opacity-20"></div>
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
            </div>

            <div className="container mx-auto px-4 pt-24 pb-24 relative z-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
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
                        className="lg:col-span-5 order-2 lg:order-1"
                    >
                        <AppointmentTimeline appointments={appointments} studioDetails={studioDetails} />
                    </motion.div>

                    {/* Visual Area - Right Side (Desktop) */}
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.5 }}
                        className="lg:col-span-5 order-1 lg:order-2 sticky top-24"
                    >
                        {/* Quick Actions Dock - Now prominent */}
                        <div className="mt-0">
                            <ActionDock
                                onBookNew={() => navigate('/booking')}
                                onViewGallery={() => console.log('View Gallery')}
                                onOpenSettings={() => console.log('Settings')}
                                onLogout={signOut}
                            />
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default PersonalArea;
