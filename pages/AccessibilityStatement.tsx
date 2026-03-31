import React from 'react';
import { Card } from '../components/ui';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const AccessibilityStatement = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 bg-brand-dark">
            <div className="max-w-4xl mx-auto space-y-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
                >
                    <ArrowRight className="w-4 h-4" />
                    חזרה אחורה
                </button>

                <Card className="p-8 md:p-12 relative overflow-hidden bg-brand-surface/80">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                    <div className="relative z-10 space-y-8">
                        <header className="text-center space-y-4">
                            <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mx-auto mb-6">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">הצהרת נגישות</h1>
                            <p className="text-slate-400 text-lg">אנו פועלים רבות במטרה להנגיש את השירותים שאנו מציעים לכלל הציבור.</p>
                        </header>

                        <div className="space-y-6 text-slate-300 leading-relaxed text-right text-base md:text-lg">
                            
                            <section className="space-y-3">
                                <h2 className="text-xl font-bold text-brand-primary">מחוייבות לנגישות</h2>
                                <p>אנו רואים חשיבות רבה במתן שירות שוויוני ונגיש לאנשים עם מוגבלויות. אתר האינטרנט שלנו והסטודיו הפיזי הותאמו במטרה לאפשר לכל אדם לגלוש, לקרוא ולקבל את השירותים שלנו בדרך הפשוטה והנוחה ביותר.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-bold text-brand-primary">נגישות דיגיטלית באתר</h2>
                                <p>האתר שלנו עבר תהליכי התאמה והנגשה, והוא כולל תפריט נגישות המאפשר:</p>
                                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                                    <li>הגדלת והקטנת טקסטים לנוחות קריאה.</li>
                                    <li>שינוי ניגודיות לצבעים ניגודיים גבוהים.</li>
                                    <li>העברת האתר לתצוגת גווני אפור (ללא צבע).</li>
                                    <li>החלפת גופן האתר לגופן קריא ופשוט.</li>
                                    <li>הדגשת קישורים (הוספת קו תחתון בולט).</li>
                                    <li>עצירת הנפשות (אנימציות) מהבהבות.</li>
                                </ul>
                                <p>להפעלת אפשרויות אלו יש ללחוץ על אזור "תפריט נגישות" המופיע בצידו של המסך.</p>
                            </section>

                            <section className="space-y-3">
                                <h2 className="text-xl font-bold text-brand-primary">הסדרי נגישות בסטודיו (הפיזי)</h2>
                                <p>לתשומת לבך – להלן הסדרי הנגישות בסטודיו שלנו:</p>
                                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                                    <li><strong className="text-slate-300">חניית נכים:</strong> קיימת חניית נכים מוסדרת קרוב לכניסה אל הסטודיו.</li>
                                    <li><strong className="text-slate-300">דרכי גישה:</strong> הגישה לסטודיו היא מישורית וללא מדרגות/רמפה תקנית מסודרת.</li>
                                    <li><strong className="text-slate-300">דלתות פנים:</strong> רוחב דלת הכניסה עומד בתקן ומאפשר מעבר נוח לכיסא גלגלים.</li>
                                    <li><strong className="text-slate-300">שירותי נכים:</strong> במתחם קיימים שירותים נגישים במלואם לאנשים עם מוגבלות.</li>
                                </ul>
                                <p className="text-sm text-slate-500 italic">* פירוט זה נתון לשינוי אנא ודא מולנו באופן טלפוני לפני ההגעה באם נדרשת הערכות מיוחדת.</p>
                            </section>

                            <section className="space-y-3 pt-6 border-t border-white/10">
                                <h2 className="text-xl font-bold text-brand-primary">יצירת קשר ופידבק</h2>
                                <p>אם מצאתם באתר בעיה כלשהי הקשורה לנגישות, או שיש לכם הצעה לשיפור, נשמח מאוד לשמוע מכם ולטפל בבעיה בהקדם האפשרי.</p>
                                <p><strong>ניתן לפנות אלינו באחת מהדרכים הבאות:</strong></p>
                                <ul className="space-y-2 mt-2">
                                    <li>מייל: <a href="mailto:support@yuvalstudio.co.il" className="text-brand-primary hover:underline">support@yuvalstudio.co.il</a></li>
                                    <li>טלפון / וואטסאפ: 054-000-0000</li>
                                </ul>
                                <p className="text-sm text-slate-500 mt-4">תאריך עדכון ההצהרה: {new Date().toLocaleDateString('he-IL')}</p>
                            </section>

                        </div>
                    </div>
                </Card>
            </div>
        </div>
    );
};
