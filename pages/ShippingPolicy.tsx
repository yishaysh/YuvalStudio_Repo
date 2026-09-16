import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Truck, Clock, MapPin, PackageCheck, AlertCircle, ShieldCheck } from 'lucide-react';
import { Card } from '../components/ui';
import { DEFAULT_STUDIO_DETAILS } from '../constants';
import { api } from '../services/mockApi';

export const ShippingPolicy: React.FC = () => {
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
                <Truck className="w-8 h-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-serif font-bold text-white">מדיניות משלוחים, הספקה ואיסוף עצמי</h1>
              <p className="text-slate-400 text-base md:text-lg max-w-2xl mx-auto">
                כל המידע על אפשרויות השילוח, זמני ההספקה, עלויות ואיסוף עצמי מסטודיו {studio.name}.
              </p>
              <div className="inline-block px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-400">
                עדכון אחרון: {new Date().toLocaleDateString('he-IL')}
              </div>
            </header>

            <div className="space-y-8 text-slate-300 leading-relaxed text-right text-base">
              {/* Section 1: Introduction */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-brand-primary" />
                  1. כללי
                </h2>
                <p>
                  סטודיו <strong>{studio.name}</strong> ({studio.business_name || 'יובל שבלב - סטודיו לפירסינג ותכשיטים'}, {studio.registration_number || 'ע.מ 318854291'}) מספק שירותי משלוחים מהירים ומאובטחים עבור כל תכשיטי הפירסינג, מוצרי ההחלמה והאביזרים הנרכשים באתר.
                </p>
                <p>
                  כל התכשיטים נארזים בקפידה באריזות הגנה סטריליות ומבוקרות לשמירה על שלמותם וניקיונם המרבי במהלך השינוע.
                </p>
              </section>

              {/* Section 2: Delivery Methods and Pricing */}
              <section className="space-y-4">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Truck className="w-5 h-5 text-brand-primary" />
                  2. אפשרויות שילוח, עלויות וזמני הספקה
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <div className="flex items-center gap-3 text-brand-primary font-semibold">
                      <Truck className="w-5 h-5" />
                      <span>שליח מהיר עד הבית / עבודה</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      שילוח באמצעות חברת שליחויות מובילה ישירות לכתובת המבוקשת.
                    </p>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li><strong>זמן אספקה:</strong> 3-5 ימי עסקים.</li>
                      <li><strong>עלות משלוח:</strong> 35 ₪.</li>
                      <li><strong>הטבה:</strong> משלוח חינם בהזמנה מעל 250 ₪!</li>
                    </ul>
                  </div>

                  <div className="p-5 rounded-2xl bg-white/5 border border-white/5 space-y-3">
                    <div className="flex items-center gap-3 text-brand-primary font-semibold">
                      <MapPin className="w-5 h-5" />
                      <span>איסוף עצמי מהסטודיו</span>
                    </div>
                    <p className="text-sm text-slate-400">
                      איסוף ישיר מהסטודיו ללא עלות, בתיאום מראש.
                    </p>
                    <ul className="text-sm text-slate-300 space-y-1">
                      <li><strong>זמן מוכנות:</strong> תוך 1-2 ימי עסקים.</li>
                      <li><strong>עלות:</strong> חינם (0 ₪).</li>
                      <li><strong>כתובת איסוף:</strong> {studio.address}.</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Section 3: Business Days Definition */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <Clock className="w-5 h-5 text-brand-primary" />
                  3. חישוב ימי עסקים
                </h2>
                <p>
                  &quot;ימי עסקים&quot; מוגדרים כימים ראשון עד חמישי, ואינם כוללים את ימי שישי, שבת, ערבי חג, ימי שבתון, מועדים רשמיים וימי חג. הזמנות הנקלטות במערכת לאחר השעה 14:00 ייחשבו כאילו נקלטו ביום העסקים הבא.
                </p>
              </section>

              {/* Section 4: Geographic Coverage & Remote Areas */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-brand-primary" />
                  4. אזורי חלוקה ומגבלות גישה
                </h2>
                <p>
                  שירות המשלוחים פועל בפריסה ארצית רחבה בכל רחבי ישראל. עם זאת:
                </p>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>
                    ביישובים מרוחקים במיוחד (רמת הגולן, בקעת הירדן, יישובי הערבה, אילת ויישובים מעבר לקו הירוק) זמני האספקה עשויים להתארך בעד 2-3 ימי עסקים נוספים, בהתאם ללוח סבבי החלוקה של חברת ההפצה.
                  </li>
                  <li>
                    במקרה של אזור שחברת השליחויות אינה מגיעה אליו מטעמי ביטחון או מגבלה לוגיסטית, נתאם עמך טלפונית איסוף מנקודת חלוקה סמוכה או ביטול ללא חיוב.
                  </li>
                </ul>
              </section>

              {/* Section 5: Tracking & Delivery Coordination */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <PackageCheck className="w-5 h-5 text-brand-primary" />
                  5. מעקב אחר משלוח ותיאום מסירה
                </h2>
                <ul className="list-disc list-inside space-y-2 pr-4 text-slate-400">
                  <li>עם יציאת המשלוח מהסטודיו, יישלח אליך עדכון עם מספר מעקב וקישור למעקב ישיר.</li>
                  <li>חברת השליחויות תיצור קשר טלפוני או תשלח הודעת SMS לפני הגעת השליח לצורך תיאום מועד המסירה.</li>
                  <li>באחריות הלקוח/ה להזין כתובת מלאה ומדויקת ומספר טלפון זמין ופעיל. הזנת כתובת שגויה או אי-מענה לשליח עלולים לגרור עלות שילוח חוזרת.</li>
                </ul>
              </section>

              {/* Section 6: Damaged or Missing Parcels */}
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-brand-primary flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-brand-primary" />
                  6. בדיקת החבילה וטיפול בנזקים
                </h2>
                <p>
                  בעת קבלת החבילה, מומלץ לוודא כי האריזה החיצונית שלמה ואינה פגומה. במקרה חריג של אובדן חבילה בידי חברת השילוח או נזק פיזי גלוי שנגרם בעת ההובלה, אנא פנו אלינו תוך 48 שעות ממועד המסירה, ואנו נדאג לשלוח פריט חלופי חדש באופן מיידי או לזכותכם במלוא הסכום.
                </p>
              </section>

              {/* Section 7: Contact */}
              <section className="space-y-3 pt-6 border-t border-white/10">
                <h2 className="text-xl font-bold text-brand-primary">7. בירורים ומעקב הזמנות</h2>
                <p>לשאלות בנוגע למשלוחים, תיאום איסוף עצמי או בדיקת סטטוס הזמנה:</p>
                <ul className="space-y-2 text-slate-300">
                  <li><strong>וואטסאפ / טלפון:</strong> <a href={`tel:${studio.phone}`} className="text-brand-primary hover:underline">{studio.phone}</a></li>
                  <li><strong>דואר אלקטרוני:</strong> <a href={`mailto:${studio.email}`} className="text-brand-primary hover:underline">{studio.email}</a></li>
                  <li><strong>כתובת לאיסוף עצמי:</strong> {studio.address} (בתיאום טלפוני מראש בלבד)</li>
                  <li><strong>שם העסק:</strong> {studio.business_name || studio.name} ({studio.registration_number || 'ע.מ 318854291'})</li>
                </ul>
              </section>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ShippingPolicy;
