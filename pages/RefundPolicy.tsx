import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, RotateCcw, Calendar, Gem, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { api } from '../services/mockApi';

export const RefundPolicy: React.FC = () => {
  const navigate = useNavigate();
  const [studio, setStudio] = useState(DEFAULT_STUDIO_DETAILS);

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
                <RotateCcw className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">מדיניות ביטולים, החזרות והחלפות</h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                בהתאם להוראות חוק הגנת הצרכן, התשמ&quot;א-1981 ותקנות הגנת הצרכן (ביטול עסקה), התשע&quot;א-2010.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
              </div>
            </header>

            <div className="space-y-8 text-slate-300 leading-relaxed text-right text-base">
              {/* Section 1: Overview */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  1. מבוא ועקרונות כלליים
                </h2>
                <p>
                  סטודיו <strong>{studio.name}</strong> ({studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'}) מחויב לשירות לקוחות הוגן, שקוף ומקצועי, בהתאם לדיני הגנת הצרכן במדינת ישראל.
                </p>
                <p>
                  מדיניות זו מפרטת את הכללים והזכויות החלות על ביטול שירותי פירסינג (תורים), וכן על רכישה, החזרה והחלפה של תכשיטי גוף ומוצרי עזר.
                </p>
              </section>

              {/* Section 2: Cancellation of Piercing Services / Appointments */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-brand-primary" />
                  2. ביטול ושינוי מועד תורים לשירותי פירסינג
                </h2>
                <p>
                  תור לפירסינג הינו שירות אישי המוזמן למועד מוגדר. בהתאם לחוק הגנת הצרכן (עסקת מכר מרחוק):
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">מועד הביטול:</strong> ניתן לבטל עסקת שירות בתוך 14 ימים מיום עשיית העסקה או קבלת אישור ההזמנה, ובלבד שהביטול ייעשה לפחות 2 ימי עסקים שאינם ימי מנוחה לפני המועד שבו אמור השירות להינתן.
                  </li>
                  <li>
                    <strong className="text-slate-200">דמי ביטול כחוק:</strong> במקרה של ביטול העומד בתנאים אלו, ייגבו דמי ביטול בשיעור של עד 5% ממחיר העסקה או 100 ₪, לפי הנמוך מביניהם.
                  </li>
                  <li>
                    <strong className="text-slate-200">הודעה מוקדמת של 24 שעות ומעלה:</strong> לפנים משורת הדין, אנו מאפשרים לכל לקוח/ה לשנות מועד תור או לדחותו ללא כל עלות, ובלבד שההודעה נמסרה לפחות 24 שעות לפני מועד התור המקורי.
                  </li>
                  <li>
                    <strong className="text-slate-200">ביטול בפחות מ-24 שעות או אי-הופעה (No-Show):</strong> לקוח שלא יופיע לתור במועדו ולא מסר הודעה מוקדמת של 24 שעות לפחות, יחויב בדמי מקדמה/טיפול כחוק, שכן השעה נשמרה עבורו במיוחד ונמנע מתן שירות ללקוחות אחרים.
                  </li>
                </ul>
              </section>

              {/* Section 3: Jewelry & Hygiene Regulations Exclusion */}
              <section className="space-y-3 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                  3. מדיניות החזרת תכשיטי פירסינג – היגיינה ובריאות הציבור
                </h2>
                <p className="text-slate-300">
                  <strong>לתשומת לב מרבית:</strong> תכשיטי גוף ופירסינג הינם פריטים חודרניים הבאים במגע ישיר עם רקמות הגוף, דם והפרשות.
                </p>
                <div className="space-y-3 text-slate-400 pr-2">
                  <p>
                    בהתאם לסעיף 6(א)(4) לתקנות הגנת הצרכן (ביטול עסקה), התשע&quot;א-2010 ולהנחיות משרד הבריאות לשמירה על בריאות הציבור ומניעת זיהומים צולבים:
                  </p>
                  <ul className="list-disc list-inside space-y-2">
                    <li>
                      <strong className="text-slate-200">תכשיט שנפתח מאריזתו הסטרילית, נענד או נמדד:</strong> אינו ניתן להחזרה, החלפה או קבלת החזר כספי בשום מקרה, מטעמי בריאות והיגיינה חמורים.
                    </li>
                    <li>
                      <strong className="text-slate-200">תכשיט באריזה סטרילית מקורית ואטומה לחלוטין:</strong> ניתן להחזרה או להחלפה תוך 14 יום מקבלת המוצר, ובלבד שהאריזה והמדבקה המאבטחת לא נפתחו, נקרעו או נפגמו בכל צורה שהיא, ובצירוף חשבונית רכישה מקורית.
                    </li>
                    <li>
                      מוצרי טיפול והיגיינה (כגון תמיסות מי מלח סטריליות, תרסיסי חיטוי) אינם ניתנים להחזרה לאחר פתיחת המוצר.
                    </li>
                  </ul>
                </div>
              </section>

              {/* Section 4: Defective or Mismatched Goods */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Gem className="w-5 h-5 text-brand-primary" />
                  4. פגם במוצר, אי-התאמה או נזק במשלוח
                </h2>
                <p>
                  במקרה של קבלת מוצר פגום, שבור, או שאינו תואם את ההזמנה שבוצעה באתר:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>יש לפנות לשירות הלקוחות בתוך 48 שעות מקבלת הפריט בצירוף תמונה ברורה של הפגם ומספר ההזמנה.</li>
                  <li>לאחר בדיקה ואימות הפגם, הלקוח/ה יהיו זכאים לבחור בין החלפה למוצר תקין חדש (ללא עלות משלוח נוספת) לבין ביטול העסקה וקבלת החזר כספי מלא (כולל דמי המשלוח) ללא גביית דמי ביטול.</li>
                  <li>האחריות אינה חלה על נזק שנגרם כתוצאה משימוש לא נכון, הפעלת כוח מופרז, שחיקה סבירה או אובדן חלקי תכשיט (כגון סוגרים/הברגות).</li>
                </ul>
              </section>

              {/* Section 5: Processing the Refund */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-brand-primary" />
                  5. אופן ביצוע ההחזר הכספי
                </h2>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>החזר כספי יבוצע לאמצעי התשלום שממנו בוצעה העסקה בלבד (כרטיס אשראי, ביט, העברה בנקאית).</li>
                  <li>ההחזר יבוצע בתוך 14 ימי עסקים לכל המאוחר ממועד אישור הביטול או קבלת המוצר המוחזר בסטודיו ובדיקתו.</li>
                  <li>עותק אישור הזיכוי יישלח בדוא&quot;ל או בהודעת SMS.</li>
                </ul>
              </section>

              {/* Section 6: Cancellation Channels & Contact */}
              <section className="space-y-3 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-brand-primary">6. דרכי מתן הודעת ביטול והתקשרות</h2>
                <p>הודעת ביטול עסקה או בקשת החלפה ניתנת למסירה באחת מהדרכים הבאות:</p>
                <ul className="space-y-2 text-slate-300">
                  <li><strong>וואטסאפ / טלפון מהיר:</strong> <a href={`tel:${studio.phone}`} className="text-brand-primary hover:underline">{studio.phone}</a></li>
                  <li><strong>דואר אלקטרוני:</strong> <a href={`mailto:${studio.email}`} className="text-brand-primary hover:underline">{studio.email}</a></li>
                  <li><strong>מסירה אישית בסטודיו:</strong> {studio.address} (בתיאום מראש)</li>
                  <li><strong>שם העסק:</strong> {studio.business_name || studio.name} (מספר ע.מ {studio.registration_number || '318854291'})</li>
                </ul>
                <p className="text-sm text-slate-500 mt-2">
                  בהודעת הביטול יש לציין: שם מלא, מספר טלפון, מועד התור או מספר ההזמנה, ופרטי הבקשה.
                </p>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RefundPolicy;
