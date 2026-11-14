import React, { useEffect, useState } from 'react';
import { Card, Button } from '../components/ui';
import { api } from '../services/mockApi';
import { Service } from '../types';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SmartImage } from '../components/SmartImage';
import { Money } from '../components/Money';
import { extractHealingTime, getPainDisplay } from '../shared/serviceInfo';

const m = motion as any;

const ServicesPage: React.FC = () => {
  const [services, setServices] = useState<Service[]>([]);
  const [showPainLevel, setShowPainLevel] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api
      .getBootstrap()
      .then((boot) => {
        setServices(boot.services.filter((s) => s.is_active !== false));
        setShowPainLevel(boot.settings?.show_pain_level !== false);
      })
      .catch(() => {
        api.getServices().then(setServices).catch(() => {});
      });
  }, []);

  const handleBookService = (service: Service) => {
    navigate('/booking', { state: { preSelectedServices: [service] } });
  };

  return (
    <div className="pt-24 pb-20">
      <section className="relative py-20 bg-brand-surface/30 mb-20">
        <div className="container mx-auto px-6 text-center relative z-10">
          <m.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
            className="will-change-transform"
          >
            <h1 className="text-5xl font-serif text-white mb-6">השירותים שלנו</h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light">
              מגוון רחב של שירותי פירסינג מקצועיים, המבוצעים בסטנדרטים הגבוהים ביותר של היגיינה ואסתטיקה.
            </p>
          </m.div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <h2 className="sr-only">רשימת טיפולי הפירסינג והמחירים</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, i) => {
            const pain = showPainLevel ? getPainDisplay(service.pain_level) : null;
            const healing = extractHealingTime(service);

            return (
              <m.div
                key={service.id}
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, margin: '50px' }}
                transition={{ delay: i * 0.04, duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
                className="will-change-transform"
              >
                <Card className="h-full flex flex-col">
                  <div className="aspect-square w-full mb-6 overflow-hidden rounded-lg bg-brand-dark/50">
                    <SmartImage
                      src={service.image_url}
                      alt={service.name}
                      className="w-full h-full object-cover opacity-90"
                    />
                  </div>
                  <div className="flex justify-between items-start gap-3 mb-3">
                    <h3 className="text-xl font-medium text-white">{service.name}</h3>
                    <Money amount={service.price} className="text-brand-primary font-serif text-lg shrink-0" />
                  </div>
                  {(pain || healing || Number(service.duration_minutes) > 0) && (
                    <div className="flex flex-wrap gap-2 mb-3 text-xs text-slate-300">
                      {Number(service.duration_minutes) > 0 && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                          {service.duration_minutes} דק&apos;
                        </span>
                      )}
                      {pain && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                          כאב {pain.label}
                        </span>
                      )}
                      {healing && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">
                          החלמה משוערת: {healing}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
                    {service.description}
                  </p>
                  <div className="w-full">
                    <Button
                      variant="outline"
                      className="w-full hover:bg-brand-primary hover:text-brand-dark"
                      onClick={() => handleBookService(service)}
                    >
                      הזמן תור
                    </Button>
                  </div>
                </Card>
              </m.div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
