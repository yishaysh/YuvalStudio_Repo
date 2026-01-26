import React from 'react';
import { SectionHeading, Card, Button } from '../components/ui';
import { SERVICES } from '../constants';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const ServicesPage: React.FC = () => {
  return (
    <div className="pt-24 pb-20">
      <section className="relative py-20 bg-brand-surface/30 mb-20">
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-5xl font-serif text-white mb-6">השירותים שלנו</h1>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light">
              מגוון רחב של שירותי פירסינג מקצועיים, המבוצעים בסטנדרטים הגבוהים ביותר של היגיינה ואסתטיקה.
            </p>
          </motion.div>
        </div>
      </section>

      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {SERVICES.map((service, i) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full flex flex-col group hover:border-brand-primary/30 transition-colors">
                <div className="aspect-square w-full mb-6 overflow-hidden rounded-lg">
                  <img 
                    src={service.image_url} 
                    alt={service.name} 
                    className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-medium text-white">{service.name}</h3>
                  <span className="text-brand-primary font-serif text-lg">₪{service.price}</span>
                </div>
                <p className="text-slate-400 text-sm mb-6 flex-grow leading-relaxed">
                  {service.description}
                </p>
                <Link to="/booking" className="w-full">
                  <Button variant="outline" className="w-full group-hover:bg-brand-primary group-hover:text-brand-dark">
                    הזמן תור
                  </Button>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;