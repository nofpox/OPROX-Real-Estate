import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Building2, Key, Users, CheckCircle2 } from 'lucide-react';

export const Services: React.FC = () => {
  return (
    <div className="bg-background min-h-screen">
      <Helmet>
        <title>Our Services | ركز للحلول الذكية</title>
        <meta name="description" content="Hotel operations, residential management, and corporate real estate services by Rakez Smart Solutions." />
        <meta property="og:title" content="Property Management Services | Rakez Smart Solutions" />
        <link rel="canonical" href="https://rakez.sa/realestate/services" />
      </Helmet>
      <div className="bg-primary text-primary-foreground py-20 text-center border-b border-primary-foreground/10">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">Operational Excellence</h1>
          <p className="text-lg md:text-xl text-primary-foreground/80 leading-relaxed">
            Rakez Smart Solutions provides end-to-end property management services designed to maximize asset value and deliver exceptional experiences for tenants, guests, and corporate clients.
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-20 max-w-6xl space-y-24">
        
        {/* Hotel Operations */}
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
              <Key className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-4">Hotel Operations</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              We manage premium hospitality assets with a focus on guest satisfaction, revenue optimization, and operational efficiency. Our experienced team handles everything from daily operations to strategic positioning.
            </p>
            <ul className="space-y-3">
              {[
                'Front desk & concierge management',
                'Housekeeping & maintenance services',
                'Revenue management & pricing strategy',
                'Guest experience optimization',
                'F&B operations management'
              ].map((item, i) => (
                <li key={i} className="flex items-center text-primary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-secondary mr-3 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop" alt="Hotel Interior" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Compound Management */}
        <div className="flex flex-col md:flex-row-reverse gap-12 items-center">
          <div className="flex-1">
            <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
              <Users className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-4">Compound Management</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Creating thriving residential communities through comprehensive compound management. We ensure secure, well-maintained, and vibrant living environments for all residents.
            </p>
            <ul className="space-y-3">
              {[
                '24/7 Security & access control',
                'Preventive maintenance programs',
                'Community events & lifestyle services',
                'Recreational facility management',
                'Tenant relations & leasing'
              ].map((item, i) => (
                <li key={i} className="flex items-center text-primary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-secondary mr-3 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=2070&auto=format&fit=crop" alt="Compound Pool" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

        {/* Corporate Facilities */}
        <div className="flex flex-col md:flex-row gap-12 items-center">
          <div className="flex-1">
            <div className="w-16 h-16 bg-secondary/20 rounded-2xl flex items-center justify-center mb-6">
              <Building2 className="h-8 w-8 text-secondary-foreground" />
            </div>
            <h2 className="text-3xl font-bold text-primary mb-4">Corporate Facilities</h2>
            <p className="text-muted-foreground text-lg mb-6 leading-relaxed">
              Delivering professional facility management services for corporate environments. We maintain optimal working conditions that enhance productivity and reflect your corporate identity.
            </p>
            <ul className="space-y-3">
              {[
                'Integrated facilities management',
                'Health, safety & environment compliance',
                'Energy management & sustainability',
                'Workspace planning & optimization',
                'Vendor & contract management'
              ].map((item, i) => (
                <li key={i} className="flex items-center text-primary font-medium">
                  <CheckCircle2 className="h-5 w-5 text-secondary mr-3 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="flex-1 w-full relative">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl">
              <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2069&auto=format&fit=crop" alt="Corporate Office" className="w-full h-full object-cover" loading="lazy" />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
