import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, ShieldAlert, HeartPulse, Scale, CheckCircle2 } from 'lucide-react';
import { Card } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { api } from '../services/mockApi';

export const TermsOfService: React.FC = () => {
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
                <FileText className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">תקנון ותנאי שימוש</h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                תקנון שימוש באתר האינטרנט, תיאום תורים, וקבלת שירותים בסטודיו {studio.name} ({studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'}).
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
              </div>
            </header>

            <div className="space-y-8 text-slate-300 leading-relaxed text-right text-base">
              {/* Section 1: Introduction */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                  1. מבוא והסכמה לתנאי השימוש
                </h2>
                <p>
                  ברוכים הבאים לאתר <strong>{studio.name}</strong> (להלן: &quot;האתר&quot; או &quot;הסטודיו&quot;), המופעל ומנוהל על ידי {studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'} שכתובתו הרשומה הינה {studio.address}.
                </p>
                <p>
                  הגלישה באתר, שימוש בשירותים המוצעים בו, לרבות תיאום תורים מקוון, רכישת מוצרים ותכשיטים, והשימוש בכל תוכן המוצג בו, כפופים להסכמתך המלאה לתנאים המפורטים בתקנון זה. אם אינך מסכים/ה לאחד או יותר מתנאי התקנון, הנך מתבקש/ת לחדול מכל שימוש נוסף באתר.
                </p>
              </section>

              {/* Section 2: Age Verification & Legal Capacity */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-primary" />
                  2. גיל כשירות, זיהוי והסכמת הורים לפירסינג
                </h2>
                <p>
                  ביצוע פעולות חודרניות (פירסינג) בסטודיו כפוף להוראות הדין הישראלי, הנחיות משרד הבריאות וכללי הבטיחות והאתיקה המחמירים ביותר:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">מגיל 16 ומעלה:</strong> רשאים לקבל שירותי ניקוב פירסינג בהצגת תעודת זהות פיזית מקורית (או דרכון / רישיון נהיגה בתוקף) בלבד.
                  </li>
                  <li>
                    <strong className="text-slate-200">מתחת לגיל 16 (קטינים):</strong> ביצוע פירסינג מותנה בליווי פיזי של הורה או אפוטרופוס חוקי לסטודיו, הצגת תעודת זהות של ההורה הכוללת ספח שבו רשום הקטין, וחתימה מלאה של ההורה על טופס הסכמה ייעודי.
                  </li>
                  <li>
                    <strong className="text-slate-200">סוגי ניקובים מסוימים:</strong> הסטודיו שומר לעצמו את הזכות הבלעדית לקבוע הגבלת גיל מחמירה יותר (כגון 18+) עבור מיקומי פירסינג אינטימיים או מורכבים במיוחד.
                  </li>
                  <li>
                    לא יבוצע כל ניקוב ללא הצגת תעודה מזהה רשמית במעמד התור. אי הצגת תעודה תוביל לביטול התור ללא החזר דמי מקדמה.
                  </li>
                </ul>
              </section>

              {/* Section 3: Health Declaration & Medical Prerequisites */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-brand-primary" />
                  3. הצהרת בריאות וכשירות רפואית
                </h2>
                <p>
                  בריאות ובטיחות הלקוח/ה עומדות בראש סדר העדיפויות שלנו. על כל לקוח/ה למלא באופן מלא ומדויק הצהרת בריאות במעמד קביעת התור והגעתם לסטודיו:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    חובה לדווח על כל מצב רפואי רלוונטי, לרבות: סוכרת, מחלות לב, בעיות קרישת דם או נטילת מדללי דם, אלרגיות למתכות (כגון ניקל), נטייה להצטלקות קלואידית, אפילפסיה, מחלות עור, מערכת חיסונית מוחלשת, וכן היריון או הנקה.
                  </li>
                  <li>
                    <strong>נשים בהיריון או מניקות:</strong> מטעמי זהירות רפואית ומניעת זיהומים, הסטודיו אינו מבצע פירסינג חדש לנשים בהיריון.
                  </li>
                  <li>
                    הסטודיו רשאי לסרב להעניק שירות לכל אדם המצוי תחת השפעת אלכוהול, סמים, או תרופות מטשטשות, וכן במקרה של עור פגוע, מגורה או מזוהם באזור הניקוב המבוקש.
                  </li>
                </ul>
              </section>

              {/* Section 4: Booking, Appointments & Cancellation */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Scale className="w-5 h-5 text-brand-primary" />
                  4. תיאום תורים, הגעה, איחורים ומדיניות ביטולים
                </h2>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    <strong className="text-slate-200">תיאום תור מראש:</strong> קבלת קהל בסטודיו מתבצעת בתיאום תור מראש באמצעות מערכת ההזמנות באתר או בערוצי הקשר הרשמיים.
                  </li>
                  <li>
                    <strong className="text-slate-200">הגעה בזמן:</strong> יש להגיע כ-5-10 דקות לפני מועד התור שנקבע לצורך רישום, אימות מסמכים ומילוי הצהרת בריאות.
                  </li>
                  <li>
                    <strong className="text-slate-200">איחורים:</strong> איחור של מעל 10 דקות ממועד התור עלול להביא לקיצור הטיפול או לביטולו, וזאת על מנת שלא לפגוע בלקוחות הבאים.
                  </li>
                  <li>
                    <strong className="text-slate-200">מדיניות ביטול תור:</strong> ניתן לבטל או לשנות מועד תור עד 24 שעות לפני המועד שנקבע ללא עלות. ביטול בהודעה קצרה מ-24 שעות או אי-הופעה לתור (No-Show) יגרור חיוב מלא או חלקי בהתאם לתקנות הגנת הצרכן (ביטול עסקה), כמפורט במדיניות ההחזרים והביטולים של הסטודיו.
                  </li>
                </ul>
              </section>

              {/* Section 5: Sterilization, Quality & Materials */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                  5. תקני סטריליזציה, היגיינה ואיכות תכשיטים
                </h2>
                <p>
                  כל הניקובים בסטודיו מבוצעים תוך הקפדה יתרה על תקני סניטציה בין-לאומיים:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>שימוש במחטים חד-פעמיות סטריליות בלבד הנפתחות לעיני הלקוח/ה ונזרקות מיד למיכל פסולת רפואית ייעודי (חד וחלק). לעולם איננו משתמשים באקדחי ניקוב.</li>
                  <li>חיטוי ועיקור מלא של כלים רב-פעמיים באמצעות מכשיר אוטוקלאב (Autoclave) רפואי תקני ומבוקר.</li>
                  <li>שימוש בעגילי פתיחה וחומרי גלם באיכות רפואית עליונה בלבד: טיטניום רפואי נטול ניקל (Implant-Grade Titanium ASTM F-136) או זהב מלא 14K/18K.</li>
                </ul>
              </section>

              {/* Section 6: Aftercare & Client Responsibility */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <HeartPulse className="w-5 h-5 text-brand-primary" />
                  6. הוראות טיפול ואחריות הלקוח/ה בהחלמה
                </h2>
                <p>
                  תהליך ההחלמה והצלחתו תלויים במידה מכרעת בטיפול הנכון והיומיומי בבית. הסטודיו מספק לכל לקוח/ה הוראות טיפול מפורטות ומדויקות (המופיעות גם בעמוד &quot;הוראות טיפול&quot; באתר).
                </p>
                <p>
                  הסטודיו אינו נושא באחריות לסיבוכים, זיהומים, דחיית עגיל או צלקות הנגרמים כתוצאה מאי-ציות להנחיות הטיפול, מגע בידיים לא נקיות, שחייה במקורות מים מזוהמים בזמן ההחלמה, או החלפת תכשיט מוקדמת בטרם סיום שלב ההחלמה הראשוני.
                </p>
              </section>

              {/* Section 7: Intellectual Property */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-brand-primary" />
                  7. קניין רוחני וזכויות יוצרים
                </h2>
                <p>
                  כל הזכויות באתר, לרבות שם המותג, הלוגו, העיצובים, התצלומים, הטקסטים, הסרטונים, קוד המקור וממשק המשתמש, הינן קניינו הבלעדי של {studio.business_name || studio.name}. חל איסור מוחלט להעתיק, לשכפל, להפיץ, לפרסם או לעשות כל שימוש מסחרי בתכנים אלו ללא אישור מראש ובכתב.
                </p>
              </section>

              {/* Section 8: Limitation of Liability */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-brand-primary" />
                  8. הגבלת אחריות
                </h2>
                <p>
                  המידע המופיע באתר נועד למטרות אינפורמטיביות וכלליות בלבד, ואינו מהווה תחליף לייעוץ רפואי מקצועי. הסטודיו פועל לפי תקני המקצוע הגבוהים ביותר, אולם תגובת הגוף לפירסינג עשויה להשתנות מאדם לאדם. הסטודיו לא יישא באחריות לנזקים עקיפים, תוצאתיים או מיוחדים שאינם נובעים מרשלנות ישירה ומוכחת של הסטודיו.
                </p>
              </section>

              {/* Section 9: Governing Law & Jurisdiction */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Scale className="w-5 h-5 text-brand-primary" />
                  9. דין וסמכות שיפוט
                </h2>
                <p>
                  על תקנון זה ועל כל עניין הנובע מהשימוש באתר או משירותי הסטודיו יחולו אך ורק דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל מחלוקת תהא מסורה לבתי המשפט המוסמכים במחוז מרכז או מחוז תל אביב-יפו.
                </p>
              </section>

              {/* Section 10: Contact Information */}
              <section className="space-y-3 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-brand-primary">10. פרטי התקשרות ובירורים</h2>
                <p>לכל שאלה, בירור או הבהרה בנוגע לתקנון ותנאי השירות, הנכם מוזמנים לפנות אלינו:</p>
                <ul className="space-y-2 text-slate-300">
                  <li><strong>שם העסק:</strong> {studio.business_name || studio.name}</li>
                  <li><strong>מספר עוסק / ח.פ:</strong> {studio.registration_number || 'ע.מ 318854291'}</li>
                  <li><strong>כתובת הסטודיו:</strong> {studio.address}</li>
                  <li><strong>טלפון / וואטסאפ:</strong> <a href={`tel:${studio.phone}`} className="text-brand-primary hover:underline">{studio.phone}</a></li>
                  <li><strong>דואר אלקטרוני:</strong> <a href={`mailto:${studio.email}`} className="text-brand-primary hover:underline">{studio.email}</a></li>
                </ul>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TermsOfService;
