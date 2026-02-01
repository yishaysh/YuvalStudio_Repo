import React from 'react';
import { Card } from '../components/ui';
import { Droplets, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const m = motion as any;

const AftercarePage: React.FC = () => {
  const steps = [
    {
      icon: Droplets,
      title: "ניקוי יומיומי",
      content: "יש לנקות את האזור 2-3 פעמים ביום באמצעות מי מלח סטריליים בלבד. השתמשו בפד גזה נקי או מקלון אוזניים."
    },
    {
      icon: Shield,
      title: "הימנעות ממגע",
      content: "אין לגעת בפירסינג בידיים לא שטופות. אין לסובב את העגיל, פעולה זו פוגעת ברקמה המרפא."
    },
    {
      icon: AlertTriangle,
      title: "מה לא לעשות",
      content: "אין להשתמש באלכוהול, מי חמצן או משחות אנטיביוטיות ללא הוראה מפורשת. אלו חומרים חזקים מדי."
    },
    {
      icon: CheckCircle,
      title: "סימני החלמה",
      content: "הפרשה שקופה/צהבהבה (לימפה) היא תקינה ומתייבשת לקרום. אדמומיות קלה ונפיחות בימים הראשונים הן נורמליות."
    }
  ];

  return (
    <div className="pt-24 pb-20 container mx-auto px-6 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-serif text-white mb-6">הוראות טיפול</h1>
        <p className="text-slate-400 text-lg">
          הצלחת הפירסינג תלויה ב-50% בביצוע וב-50% בטיפול שלכם בבית.
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, i) => (
          <m.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card className="flex flex-col md:flex-row gap-6 items-start border-white/5 hover:border-brand-primary/20 transition-colors">
              <div className="w-12 h-12 bg-brand-surface rounded-full flex items-center justify-center text-brand-primary shrink-0">
                <step.icon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-medium text-white mb-2">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed">{step.content}</p>
              </div>
            </Card>
          </m.div>
        ))}
      </div>

      <div className="mt-16 p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
        <h3 className="text-red-400 font-medium mb-2">מתי לפנות אלינו?</h3>
        <p className="text-slate-400 text-sm">
          בכל מקרה של נפיחות חריגה, חום מקומי, כאב שמתגבר או הפרשה מוגלתית (ירוקה/כהה), יש ליצור קשר מיידי עם הסטודיו או לפנות לרופא.
        </p>
      </div>
    </div>
  );
};

export default AftercarePage;