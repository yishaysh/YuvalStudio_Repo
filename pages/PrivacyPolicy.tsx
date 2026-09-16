import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Lock, Eye, Database, ShieldCheck, UserCheck, AlertCircle, Cookie, SlidersHorizontal } from 'lucide-react';
import { Card } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { api } from '../services/mockApi';
import { useCookieConsent } from '../contexts/CookieConsentContext';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const [studio, setStudio] = useState(DEFAULT_STUDIO_DETAILS);
  const { openSettingsModal } = useCookieConsent();

  useEffect(() => {
    api.getSettings().then(settings => {
      if (settings?.studio_details) {
        setStudio(prev => ({ ...prev, ...settings.studio_details }));
      }
    });
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-brand-dark">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Back navigation */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          aria-label="חזרה לעמוד הקודם"
        >
          <ArrowRight className="w-4 h-4" />
          <span>חזרה אחורה</span>
        </button>

        <Card className="p-8 md:p-12 relative overflow-hidden bg-brand-surface/80 border-white/5">
          {/* Subtle decorative glow */}
          <div className="absolute top-0 right-0 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

          <div className="relative z-10 space-y-8">
            <header className="text-center space-y-4">
              <div className="w-16 h-16 bg-brand-primary/10 rounded-2xl flex items-center justify-center text-brand-primary mx-auto mb-4 border border-brand-primary/20">
                <Lock className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">מדיניות פרטיות ואבטחת מידע</h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                הגנה על פרטיותך, שקיפות מלאה ועמידה מחמירה בחוק הגנת הפרטיות הישראלי (התשמ&quot;א-1981, לרבות תיקון 13) ועקרונות צמצום מידע.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
              </div>
            </header>

            <div className="space-y-8 text-slate-300 leading-relaxed text-right text-base">
              {/* Section 1: Core Commitment and Data Minimization */}
              <section className="space-y-3 p-5 rounded-2xl bg-brand-primary/5 border border-brand-primary/20">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  1. עקרון צמצום המידע (Data Minimization) – המחויבות שלנו
                </h2>
                <p>
                  סטודיו <strong>{studio.name}</strong> ({studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'}) פועל על פי עקרון יסוד מחמיר: <strong>איסוף המידע המינימלי וההכרחי בלבד</strong>.
                </p>
                <p>
                  אנו אוספים אך ורק מידע הנחוץ ישירות לקביעת התור, מתן שירות בטוח ומותאם אישית, ועמידה בדרישות הרגולטוריות של משרד הבריאות לגבי פעולות חודרניות והסכמה מדעת. <strong>איננו אוספים, שומרים או דורשים שום מידע עודף שאינו חיוני למטרות אלו.</strong>
                </p>
              </section>

              {/* Section 2: Data Collected */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-primary" />
                  2. איזה מידע אנו אוספים ולשם מה?
                </h2>
                <div className="space-y-4 pr-2">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base">א. פרטי התקשרות וזיהוי בסיסיים</h3>
                    <p className="text-slate-400 text-sm">
                      שם מלא, מספר טלפון וכתובת דואר אלקטרוני.
                    </p>
                    <p className="text-slate-400 text-sm">
                      <strong>מטרת האיסוף:</strong> תיאום התור, שליחת תזכורות ואישורי הגעה ב-SMS/WhatsApp/אימייל, והעברת הוראות טיפול מותאמות לאחר הניקוב.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base">ב. הצהרת בריאות רלוונטית לפירסינג</h3>
                    <p className="text-slate-400 text-sm">
                      דיווח על רגישויות למתכות, נטילת תרופות המשפיעות על קרישת דם, היריון, או מחלות עור רלוונטיות לאזור הניקוב.
                    </p>
                    <p className="text-slate-400 text-sm">
                      <strong>מטרת האיסוף:</strong> שמירה בלתי מתפשרת על בריאותך ובטיחותך האישית במהלך הטיפול, התאמת סוג המתכת (כגון טיטניום רפואי) ומניעת סיבוכים רפואיים.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base">ג. פרטי הורה / אפוטרופוס (לקטינים מתחת לגיל 16)</h3>
                    <p className="text-slate-400 text-sm">
                      שם ההורה, מספר תעודת זהות, טלפון וחתימת הסכמה.
                    </p>
                    <p className="text-slate-400 text-sm">
                      <strong>מטרת האיסוף:</strong> עמידה מחייבת בחוק הישראלי המחייב אישור הורה בכתב לביצוע פירסינג לקטינים.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base">ד. תמונת אוזן/אנטומיה (בשימוש אופציונלי בסטייל מאצ&apos;ר / AI)</h3>
                    <p className="text-slate-400 text-sm">
                      במידה ובחרת להעלות תמונה לייעוץ התאמת תכשיט וירטואלי, התמונה משמשת אך ורק לצורך ניתוח מבנה האוזן והתאמת התכשיטים לבחירתך. איננו עושים בה שום שימוש פרסומי ללא הסכמתך המפורשת מראש.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Absolute Non-Disclosure and No-Sale */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-brand-primary" />
                  3. אי-העברת מידע לצדדים שלישיים ואיסור מכירת מידע
                </h2>
                <p>
                  <strong>אנו מתחייבים באופן חד-משמעי:</strong> {studio.name} לעולם אינו מוכר, משכיר, סוחר או מעביר את המידע האישי שלך לגורמי צד שלישי לצרכי שיווק או רווח.
                </p>
                <p>
                  שיתוף מידע מוגבל אך ורק לספקי שירות טכנולוגיים חיוניים המאפשרים את תפעול האתר (כגון שרתי ענן מאובטחים, שירות שליחת SMS לאישורי תורים), וזאת תחת הסכמי סודיות והגנת מידע מחמירים (Data Processing Agreements) התואמים את החוק הישראלי ותקנות אבטחת המידע.
                </p>
              </section>

              {/* Section 4: Data Security Standards */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Lock className="w-5 h-5 text-brand-primary" />
                  4. אבטחת מידע והצפנה
                </h2>
                <p>
                  האתר מיישם מנגנוני הגנה מתקדמים בהתאם לתקנות הגנת הפרטיות (אבטחת מידע), התשע&quot;ז-2017:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>תקשורת מוצפנת בפרוטוקול SSL/TLS מתקדם בכל עמודי האתר.</li>
                  <li>הגבלת גישה לנתונים רגישים על בסיס הרשאות מחמירות (Role-Based Access) ואימות מאובטח.</li>
                  <li>ניטור שוטף של שרתי האתר ומניעת חדירות או דליפות מידע בלתי מורשות.</li>
                  <li>שמירה על בסיס נתונים בעל עמידות גבוהה וגיבויים תקופתיים מוצפנים.</li>
                </ul>
              </section>

              {/* Section 5: Data Retention Period */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Database className="w-5 h-5 text-brand-primary" />
                  5. תקופת שמירת המידע
                </h2>
                <p>
                  המידע האישי נשמר אך ורק למשך הזמן הנדרש להשגת המטרות לשמן נמסר, וכן לתקופות המחויבות על פי חוק (לרבות דיני התיישנות, רגולציית בריאות הציבור, ותיעוד חשבונאי על פי פקודת מס הכנסה). מידע רפואי או הצהרות שאינן נדרשות עוד יימחקו באופן בטוח ובלתי ניתן לשחזור.
                </p>
              </section>

              {/* Section 6: User Rights under Israeli Law */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Eye className="w-5 h-5 text-brand-primary" />
                  6. זכויות המשתמש/ת לפי חוק הגנת הפרטיות
                </h2>
                <p>
                  בהתאם לסעיפים 13 ו-14 לחוק הגנת הפרטיות, התשמ&quot;א-1981, עומדות לרשותך הזכויות הבאות:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">זכות העיון במידע (סעיף 13):</strong> כל אדם זכאי לעיין בעצמו, או על ידי בא-כוח מורשה בכתב, במידע המוחזק עליו במאגר המידע שלנו.
                  </li>
                  <li>
                    <strong className="text-slate-200">זכות לתיקון או מחיקה (סעיף 14):</strong> אדם שעיין במידע ומצא כי אינו נכון, שלם, ברור או מעודכן, רשאי לפנות אל בעל המאגר בבקשה לתקן את המידע או למחקו.
                  </li>
                  <li>
                    <strong className="text-slate-200">ביטול הסכמה לקבלת הודעות:</strong> ניתן להסיר את עצמך מרשימת התפוצה בכל עת באמצעות לחיצה על קישור ההסרה בכל הודעה או בפנייה ישירה אלינו.
                  </li>
                </ul>
                <p>
                  למימוש זכויות אלו, ניתן לשלוח פנייה ישירה בדוא&quot;ל לממונה הפרטיות של הסטודיו בכתובת: <a href={`mailto:${studio.email}`} className="text-brand-primary hover:underline">{studio.email}</a>. אנו נטפל בפנייתך תוך זמן סביר ובהתאם להוראות הדין.
                </p>
              </section>

              {/* Section 7: Cookie and Tracking Technologies */}
              <section className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                    <Cookie className="w-5 h-5 text-brand-primary" />
                    7. מדיניות קובצי עוגיות (Cookies) וטכנולוגיות מעקב
                  </h2>
                  <button
                    type="button"
                    onClick={openSettingsModal}
                    className="px-4 py-2 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 border border-brand-primary/30 text-brand-primary text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>ניהול הגדרות עוגיות</span>
                  </button>
                </div>
                <p>
                  אתר הסטודיו מכבד את פרטיותך ופועל על פי עקרון <strong>ההסכמה המוקדמת (Prior Consent)</strong>. משמעות הדבר היא ששום קובץ עוגייה שאינו חיוני באופן מוחלט לתפעול השוטף אינו מופעל במכשירך ללא אישורך המפורש.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="font-semibold text-white text-sm">א. עוגיות הכרחיות (חובה)</span>
                    <p className="text-xs text-slate-400">
                      מאפשרות את תפקודו התקין והמאובטח של האתר, לרבות סשן התחברות מאובטח, שמירת מזהה תור פעיל ומניעת מתקפות סייבר. לא ניתן להשבית עוגיות אלו.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="font-semibold text-white text-sm">ב. עוגיות אנליטיקה (אופציונלי)</span>
                    <p className="text-xs text-slate-400">
                      איסוף סטטיסטי אנונימי (למשל Google Analytics) לצורך מדידת כמות המבקרים, הבנת דפוסי שימוש ושיפור ביצועי האתר.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="font-semibold text-white text-sm">ג. עוגיות שיווק ומדיה (אופציונלי)</span>
                    <p className="text-xs text-slate-400">
                      התאמת תוכן פרסומי והצגת מודעות רלוונטיות של תכשיטים ושירותי הסטודיו ברשתות החברתיות (כגון Meta Pixel) על בסיס תחומי עניין.
                    </p>
                  </div>
                  <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
                    <span className="font-semibold text-white text-sm">ד. עוגיות העדפות (אופציונלי)</span>
                    <p className="text-xs text-slate-400">
                      זכירת העדפות תצוגה אישיות, המלצות הסטייל מאצ&apos;ר ושמירת מסנני חיפוש מועדפים לגלישה נוחה ואישית.
                    </p>
                  </div>
                </div>
                <p className="text-xs text-slate-400 pt-1">
                  באפשרותך לשנות את הסכמתך או לחזור בך בכל עת באמצעות לחיצה על כפתור העוגייה הצף בתחתית המסך, או דרך קישור &quot;ניהול העדפות עוגיות&quot; המופיע בתחתית כל עמוד (Footer).
                </p>
              </section>

              {/* Section 8: Data Protection Contact */}
              <section className="space-y-3 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-brand-primary" />
                  8. פניות ופרטי ממונה הגנת הפרטיות
                </h2>
                <p>
                  אם יש לך שאלות בנוגע למדיניות זו, או אם ברצונך לממש את זכויותיך על פי החוק, אנא פנה/י אלינו:
                </p>
                <ul className="space-y-2 text-slate-300">
                  <li><strong>שם הגורם האחראי:</strong> {studio.business_name || studio.name}</li>
                  <li><strong>מספר רישום עסק:</strong> {studio.registration_number || 'ע.מ 318854291'}</li>
                  <li><strong>כתובת:</strong> {studio.address}</li>
                  <li><strong>דוא&quot;ל לפניות פרטיות:</strong> <a href={`mailto:${studio.email}`} className="text-brand-primary hover:underline">{studio.email}</a></li>
                  <li><strong>טלפון:</strong> <a href={`tel:${studio.phone}`} className="text-brand-primary hover:underline">{studio.phone}</a></li>
                </ul>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
