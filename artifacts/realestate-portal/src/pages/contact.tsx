import React, { useState } from 'react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const Contact: React.FC = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would hit a generic contact endpoint
    toast({
      title: "Message Sent",
      description: "Thank you for reaching out. We will get back to you soon.",
    });
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="bg-muted min-h-screen py-16">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-primary mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Whether you're looking for property management services, seeking a new home, or have a general inquiry, our team is ready to assist you.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Head Office</h3>
              <p className="text-muted-foreground leading-relaxed">
                King Fahd Road, Olaya District<br />
                P.O. Box 12345<br />
                Riyadh 11471, Saudi Arabia
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Contact Numbers</h3>
              <p className="text-muted-foreground leading-relaxed">
                Tel: +966 11 234 5678<br />
                Fax: +966 11 234 5679<br />
                Support: 9200 12345
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">Email Addresses</h3>
              <p className="text-muted-foreground leading-relaxed">
                General: info@rakez-solutions.com<br />
                Sales: sales@rakez-solutions.com<br />
                Support: support@rakez-solutions.com
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-6">Send us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Full Name</label>
                    <Input 
                      required 
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Email Address</label>
                    <Input 
                      type="email" 
                      required 
                      value={formData.email}
                      onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Phone Number</label>
                    <Input 
                      type="tel" 
                      value={formData.phone}
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">Subject</label>
                    <Input 
                      required 
                      value={formData.subject}
                      onChange={e => setFormData({...formData, subject: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">Your Message</label>
                  <Textarea 
                    required 
                    rows={6}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                  />
                </div>

                <Button type="submit" size="lg" className="w-full md:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 px-12">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
