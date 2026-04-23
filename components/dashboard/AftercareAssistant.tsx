import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { api } from '../../services/mockApi';
import { Appointment } from '../../types';
import { Card, Button } from '../ui';
import { CheckCircle2, AlertCircle, Sparkles, Clock, ShieldCheck } from 'lucide-react';

interface AftercareAssistantProps {
    appointments: Appointment[];
}

// Helper to calculate days diff
const getDaysDifference = (date: string) => {
    const start = new Date(date).getTime();
    const now = new Date().getTime();
    const diffTime = Math.abs(now - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const AftercareAssistant: React.FC<AftercareAssistantProps> = ({ appointments }) => {
    const { user } = useAuth();
    const [completedTask, setCompletedTask] = useState(false);

    // Check status on mount
    useEffect(() => {
        const checkStatus = async () => {
            if (user?.id) {
                try {
                    const lastCheckin = await api.getLastAftercareCheckin(user.id);
                    console.log("Aftercare: Loaded last checkin:", lastCheckin);

                    if (lastCheckin) {
                        const today = new Date().toDateString();
                        const checkinDate = new Date(lastCheckin).toDateString();
                        console.log("Aftercare: Comparing dates - Today:", today, "Checkin:", checkinDate);

                        if (today === checkinDate) {
                            setCompletedTask(true);
                        }
                    }
                } catch (e) {
                    console.error("Aftercare: Error checking status", e);
                }
            }
        };
        checkStatus();
    }, [user]);

    const handleCheckin = async () => {
        setCompletedTask(true);
        if (user?.id) {
            await api.checkInAftercare(user.id);
        }
    };

    // Find latest completed/confirmed appointment
    const latestAppointment = appointments
        .filter(a => a.status === 'confirmed')
        .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime())[0];

    if (!latestAppointment) return null;

    const daysSince = getDaysDifference(latestAppointment.start_time);
    const serviceName = latestAppointment.service_name || 'Piercing';

    // Determine Phase
    let phase = {
        title: 'שלב בריאות ראשוני',
        color: 'text-red-400',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        icon: <AlertCircle className="w-5 h-5 text-red-400" />,
        instructions: [
            'לשטוף במי מלח פעמיים ביום (בוקר וערב).',
            'לא לגעת בעגיל עם ידיים לא שטופות.',
            'להימנע משינה על הצד של העגיל.',
            'לא לסובב את העגיל!'
        ]
    };

    if (daysSince > 3 && daysSince <= 14) {
        phase = {
            title: 'שלב ההחלמה הפעיל',
            color: 'text-amber-400',
            bgColor: 'bg-amber-500/10',
            borderColor: 'border-amber-500/20',
            icon: <Clock className="w-5 h-5 text-amber-400" />,
            instructions: [
                'להמשיך לחטא פעם אחת ביום.',
                'לשים לב אם יש אדמומיות חריגה ומעבר לכאב סביר.',
                'להיזהר ממכות או היתפסות בבגדים.'
            ]
        };
    } else if (daysSince > 14 && daysSince <= 45) {
        phase = {
            title: 'שלב ההסתגלות',
            color: 'text-blue-400',
            bgColor: 'bg-blue-500/10',
            borderColor: 'border-blue-500/20',
            icon: <ShieldCheck className="w-5 h-5 text-blue-400" />,
            instructions: [
                'אפשר להוריד מינון חיטוי לפעמיים בשבוע.',
                'זה הזמן לקבוע תור לביקורת (Downsize) אם המוט מרגיש ארוך.',
                'עדיין לא להחליף תכשיט לבד!'
            ]
        };
    } else if (daysSince > 45) {
        phase = {
            title: 'החלמה מתקדמת',
            color: 'text-green-400',
            bgColor: 'bg-green-500/10',
            borderColor: 'border-green-500/20',
            icon: <Sparkles className="w-5 h-5 text-green-400" />,
            instructions: [
                'העגיל כנראה כבר מרגיש חלק ממך.',
                'אפשר להחליף תכשיט בסטודיו.',
                'להמשיך לשמור על היגיינה בסיסית.'
            ]
        };
    }

    return (
        <Card className={`mb-8 border ${phase.borderColor} ${phase.bgColor} relative overflow-hidden`}>
            <div className="absolute top-0 left-0 right-0 h-1 bg-white/5">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((daysSince / 60) * 100, 100)}%` }}
                    className={`h-full ${phase.color.replace('text-', 'bg-')}`}
                />
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-full bg-black/20 ${phase.color}`}>
                            {phase.icon}
                        </div>
                        <div>
                            <h3 className="text-xl font-serif text-white">{phase.title}</h3>
                            <p className="text-sm text-slate-400">
                                {daysSince} ימים מאז הטיפול ב-{serviceName}
                            </p>
                        </div>
                    </div>

                    <ul className="space-y-2 mt-4">
                        {phase.instructions.map((inst, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-slate-300">
                                <span className={`mt-1.5 w-1.5 h-1.5 rounded-full ${phase.color.replace('text-', 'bg-')} shrink-0`} />
                                {inst}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="w-full md:w-auto flex flex-col items-center justify-center p-4 bg-black/20 rounded-xl border border-white/5">
                    <p className="text-xs text-slate-400 mb-3 text-center">המשימה היומית שלך</p>
                    <AnimatePresence mode="wait">
                        {!completedTask ? (
                            <Button
                                onClick={handleCheckin}
                                className="w-full bg-white/10 hover:bg-white/20 border border-white/10"
                            >
                                חיטיתי היום 💧
                            </Button>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, transform: "scale(0.95)" }}
                                animate={{ opacity: 1, transform: "scale(1)" }}
                                transition={{ ease: [0.23, 1, 0.32, 1], duration: 0.3 }}
                                className="flex items-center gap-2 text-green-400 font-medium px-4 py-2"
                            >
                                <CheckCircle2 className="w-5 h-5" />
                                כל הכבוד!
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </Card>
    );
};
