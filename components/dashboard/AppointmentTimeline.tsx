import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Appointment } from '../../types';
import { Calendar, CheckCircle2, Clock, XCircle, MapPin, Sparkles, FileText } from 'lucide-react';
import { Card, NavigationModal } from '../ui';
import { DEFAULT_STUDIO_DETAILS } from '../../constants';

interface AppointmentTimelineProps {
    appointments: Appointment[];
}

export const AppointmentTimeline: React.FC<AppointmentTimelineProps> = ({ appointments }) => {
    const now = new Date();

    // Sort logic: Future (Ascending), Past (Descending)
    const future = appointments
        .filter(a => a.status !== 'cancelled' && new Date(a.start_time) > now)
        .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

    const past = appointments
        .filter(a => a.status !== 'cancelled' && new Date(a.start_time) <= now)
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());

    return (
        <div className="relative border-r-2 border-white/10 pr-8 mr-4 space-y-12 min-h-[500px]">
            {/* Timeline Line Decoration */}
            <div className="absolute top-0 bottom-0 right-[-1px] w-[2px] bg-gradient-to-b from-brand-primary/50 via-brand-primary/10 to-transparent"></div>

            {/* Future Section */}
            <div className="space-y-8">
                <h3 className="text-xl font-serif text-brand-primary flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
                    תורים קרובים
                </h3>
                {future.length > 0 ? (
                    future.map(app => (
                        <TimelineNode key={app.id} appointment={app} isFuture={true} />
                    ))
                ) : (
                    <div className="pr-4 text-slate-500 italic text-sm">אין תורים עתידיים כרגע.</div>
                )}
            </div>

            {/* Past Section */}
            {past.length > 0 && (
                <div className="space-y-8 pt-8">
                    <h3 className="text-lg font-serif text-slate-400 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-slate-600" />
                        היסטוריה
                    </h3>
                    {past.map(app => (
                        <TimelineNode key={app.id} appointment={app} isFuture={false} />
                    ))}
                </div>
            )}
        </div>
    );
};

const TimelineNode = ({ appointment, isFuture }: { appointment: Appointment, isFuture: boolean }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isNavOpen, setIsNavOpen] = useState(false);
    const { status, start_time, service_name } = appointment;
    const date = new Date(start_time);

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'confirmed': return { label: 'מאושר', color: 'text-brand-primary bg-brand-primary/10 border-brand-primary/20' };
            case 'pending': return { label: 'ממתין לאישור', color: 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20' };
            case 'cancelled': return { label: 'מבוטל', color: 'text-red-500 bg-red-500/10 border-red-500/20' };
            case 'completed': return { label: 'הושלם', color: 'text-green-500 bg-green-500/10 border-green-500/20' };
            default: return { label: s, color: 'text-slate-500 bg-slate-500/10 border-slate-500/20' };
        }
    };

    const statusConfig = getStatusConfig(status);

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="relative"
        >
            {/* Timeline Dot */}
            <div className={`absolute top-6 -right-[41px] w-5 h-5 rounded-full border-4 border-brand-dark z-10 
                ${isFuture ? 'bg-brand-primary shadow-[0_0_15px_rgba(212,181,133,0.5)]' : 'bg-slate-700'}`}
            />

            <Card
                className={`transition-all duration-300 cursor-pointer overflow-hidden group
                    ${isFuture
                        ? 'bg-brand-surface/80 border-brand-primary/30 hover:border-brand-primary/60 hover:shadow-[0_0_30px_rgba(212,181,133,0.1)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="p-5 flex justify-between items-start">
                    <div className="space-y-1">
                        <div className="text-xs font-medium text-brand-primary uppercase tracking-widest mb-1">
                            {service_name || 'טיפול כללי'}
                        </div>
                        <div className="text-xl font-serif text-white">
                            {date.toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </div>
                        <div className="text-sm text-slate-400 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {date.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>

                    <div className={`px-3 py-1 text-xs rounded-full font-bold border ${statusConfig.color}`}>
                        {statusConfig.label}
                    </div>
                </div>

                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/20 border-t border-white/5"
                        >
                            <div className="p-5 space-y-4 text-sm text-slate-300">
                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                                        <div>
                                            <div className="font-medium text-white">מיקום</div>
                                            <div
                                                className="text-xs cursor-pointer hover:text-brand-primary hover:underline transition-colors"
                                                onClick={() => setIsNavOpen(true)}
                                                title="לחץ לניווט"
                                            >
                                                {DEFAULT_STUDIO_DETAILS.address} ({DEFAULT_STUDIO_DETAILS.name})
                                            </div>
                                            <NavigationModal
                                                isOpen={isNavOpen}
                                                onClose={() => setIsNavOpen(false)}
                                                address={DEFAULT_STUDIO_DETAILS.address}
                                            />
                                        </div>
                                    </div>
                                    {/* Receipt Download Removed */}
                                </div>

                                {appointment.visual_plan && (
                                    <div className="mt-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Sparkles className="w-4 h-4 text-brand-primary" />
                                            <span className="font-bold text-white">תוכנית עיצוב (AI)</span>
                                        </div>
                                        <div className="bg-black/40 rounded-lg p-2 text-center text-xs text-slate-500">
                                            לחץ לצפייה בהדמייה שנשמרה
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>
        </motion.div>
    );
}
