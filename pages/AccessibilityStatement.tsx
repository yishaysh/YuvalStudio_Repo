import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Accessibility, CheckCircle2, Phone, Mail, MapPin, Sparkles } from 'lucide-react';
import { Card } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { api } from '../services/mockApi';

export const AccessibilityStatement: React.FC = () => {
  const navigate = useNavigate();
  const [studio, setStudio] = useState(DEFAULT_STUDIO_DETAILS);

  useEffect(() => {
    api.getSettings().then(settings => {
      if (settings?.studio_details) {
        setStudio(prev => ({ ...prev, ...settings.studio_details }));
      }
    });
  }, []);

  const coordinatorName = studio.accessibility_coordinator_name || 'יובל שבלב';
  const coordinatorPhone = studio.accessibility_coordinator_phone || studio.phone;
  const coordinatorEmail = studio.accessibility_coordinator_email || studio.email;

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
                <Accessibility className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">הצהרת נגישות</h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                הצהרת הנגישות של אתר האינטרנט והסטודיו הפיזי של {studio.name} ({studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'}).
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                עדכון אחרון: {new Date().toLocaleDateString('he-IL')} | עמידה בתקן ת&quot;י 5568 רמה AA
              </div>
            </header>

            <div className="space-y-8 text-slate-300 leading-relaxed text-right text-base">
              {/* Section 1: Commitment */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  1. מחויבות עמוקה לשוויון ונגישות
                </h2>
                <p>
                  בסטודיו <strong>{studio.name}</strong> אנו מאמינים כי שירותי יופי, פירסינג ואומנות הגוף צריכים להיות פתוחים, מכבדים ונגישים באופן מלא ושוויוני לכל אדם, לרבות אנשים עם מוגבלויות.
                </p>
                <p>
                  אנו משקיעים מאמצים ומשאבים מתמידים בהנגשת אתר האינטרנט ובשיפור הסדרי הנגישות בסטודיו הפיזי, בהתאם לחוק שוויון זכויות לאנשים עם מוגבלות, התשנ&quot;ח-1998, ותקנות הנגישות הנגזרות ממנו.
                </p>
              </section>

              {/* Section 2: Digital Web Accessibility */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-primary" />
                  2. נגישות אתר האינטרנט (ת&quot;י 5568 / WCAG 2.1 AA)
                </h2>
                <p>
                  אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013, ומותאם להנחיות התקן הישראלי ת&quot;י 5568 ברמת הנגישות AA, המבוסס על מסמך ההנחיות הבין-לאומי WCAG 2.1 של ארגון W3C.
                </p>
                <p>בין ההתאמות הטכנולוגיות המיושמות באתר:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                      ניווט מקלדת מלא (Keyboard Focus)
                    </h3>
                    <p className="text-sm text-slate-400">
                      תמיכה מלאה בניווט ללא עכבר באמצעות מקשי Tab, Shift+Tab, Enter ומקשי החצים. מחווני הפוקוס מודגשים וברורים.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                      תפריט נגישות ייעודי
                    </h3>
                    <p className="text-sm text-slate-400">
                      כפתור נגישות קבוע המאפשר הגדלה והקטנה של גודל הטקסט, מעבר לניגודיות גבוהה, גווני אפור, הדגשת קישורים ועצירת אנימציות.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                      תאימות לקוראי מסך
                    </h3>
                    <p className="text-sm text-slate-400">
                      מבנה סמנטי תקין (HTML5 Landmarks, כותרות h1-h6, תגיות ARIA מותאמות), והזנת תיאור טקסטואלי חלופי (Alt Text) לתמונות משמעותיות.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                    <h3 className="text-white font-semibold text-base flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                      ניגודיות צבעים והתאמה למובייל
                    </h3>
                    <p className="text-sm text-slate-400">
                      עמידה ביחסי ניגודיות מחמירים בין טקסט לרקע, ועיצוב רספונסיבי המאפשר קריאה נוחה בכל גודל מסך ללא גלילה אופקית.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 3: Physical Studio Accessibility */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  3. הסדרי נגישות בסטודיו הפיזי
                </h2>
                <p>
                  הסטודיו שלנו ממוקם בכתובת <strong>{studio.address}</strong>. להלן פירוט הסדרי הנגישות הפיזיים:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">חניית נכים:</strong> קיימת חניה מוסדרת בקרבת הכניסה לסטודיו לבעלי תג נכה.
                  </li>
                  <li>
                    <strong className="text-slate-200">דרכי גישה וכניסה:</strong> דרך הגישה לסטודיו הינה מישורית, רציפה וללא מדרגות החוסמות מעבר כיסא גלגלים.
                  </li>
                  <li>
                    <strong className="text-slate-200">פתחי דלתות ומעברים:</strong> דלת הכניסה הראשית ודלתות הפנים רחבות ומאפשרות כניסה נוחה עם כיסא גלגלים, הליכון או עגלה.
                  </li>
                  <li>
                    <strong className="text-slate-200">שירותי נכים:</strong> במתחם קיימים שירותים מותאמים ונגישים.
                  </li>
                  <li>
                    <strong className="text-slate-200">חיות שירות:</strong> כניסת חיות שירות המסייעות לאנשים עם מוגבלות (כגון כלבי נחייה) מותרת ומבורכת בסטודיו בהתאם לחוק.
                  </li>
                </ul>
              </section>

              {/* Section 4: Accessibility Coordinator & Contact */}
              <section className="space-y-3 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Phone className="w-5 h-5 text-brand-primary" />
                  4. רכז/ת נגישות, דיווח על תקלות ובקשות התאמה
                </h2>
                <p>
                  למרות מאמצינו להנגיש את כלל דפי האתר והמתקנים, ייתכן ויתגלו חלקים הדורשים שיפור או התאמה נוספת. אם נתקלתם בקושי בגלישה, זקוקים להתאמה אישית, או שיש לכם הצעה לשיפור – נשמח מאוד לסייע ולתקן:
                </p>

                <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                  <ul className="space-y-2 text-slate-300">
                    <li><strong>רכז/ת הנגישות בסטודיו:</strong> {coordinatorName}</li>
                    <li className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-brand-primary" />
                      <span>טלפון / וואטסאפ:</span>
                      <a href={`tel:${coordinatorPhone}`} className="text-brand-primary hover:underline">{coordinatorPhone}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-brand-primary" />
                      <span>דואר אלקטרוני:</span>
                      <a href={`mailto:${coordinatorEmail}`} className="text-brand-primary hover:underline">{coordinatorEmail}</a>
                    </li>
                    <li className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-brand-primary" />
                      <span>כתובת פיזית:</span>
                      <span>{studio.address}</span>
                    </li>
                  </ul>
                  <p className="text-xs text-slate-400">
                    זמן מענה מובטח לפניות נגישות: עד 48 שעות בימי עסקים.
                  </p>
                </div>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AccessibilityStatement;
