import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PhoneInputWithCountry } from '@/components/phone-input';

export const Contact: React.FC = () => {
  const { t, isRtl } = useLanguage();
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
    toast({
      title: isRtl ? 'تم إرسال الرسالة' : 'Message Sent',
      description: isRtl
        ? 'شكراً لتواصلك معنا. سيقوم فريقنا بالرد عليك قريباً.'
        : 'Thank you for reaching out. We will get back to you soon.',
    });
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="bg-muted min-h-screen py-16">
      <Helmet>
        <title>
          {isRtl ? 'اتصل بنا | ركز للحلول الذكية' : 'Contact Us | ركز للحلول الذكية'}
        </title>
        <meta
          name="description"
          content={
            isRtl
              ? 'تواصل مع ركز للحلول الذكية لاستفسارات إدارة العقارات والشراكات والدعم.'
              : 'Get in touch with Rakez Smart Solutions for property management inquiries, partnerships, and support.'
          }
        />
        <link rel="canonical" href="https://rakez.sa/realestate/contact" />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-primary mb-4">{t('contact.title')}</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isRtl
              ? 'سواء كنت تبحث عن خدمات إدارة العقارات، أو تبحث عن منزل جديد، أو لديك استفسار عام، فريقنا مستعد لمساعدتك.'
              : "Whether you're looking for property management services, seeking a new home, or have a general inquiry, our team is ready to assist you."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <MapPin className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">
                {isRtl ? 'المكتب الرئيسي' : 'Head Office'}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isRtl ? (
                  <>
                    طريق الملك فهد، حي العليا<br />
                    ص.ب. 12345<br />
                    الرياض 11471، المملكة العربية السعودية
                  </>
                ) : (
                  <>
                    King Fahd Road, Olaya District<br />
                    P.O. Box 12345<br />
                    Riyadh 11471, Saudi Arabia
                  </>
                )}
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">
                {isRtl ? 'أرقام التواصل' : 'Contact Numbers'}
              </h3>
              <p className="text-muted-foreground leading-relaxed" dir="ltr">
                Tel: +966 11 234 5678<br />
                Fax: +966 11 234 5679<br />
                Support: 9200 12345
              </p>
            </div>

            <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-bold text-primary mb-2">
                {isRtl ? 'عناوين البريد الإلكتروني' : 'Email Addresses'}
              </h3>
              <p className="text-muted-foreground leading-relaxed" dir="ltr">
                General: info@rakez-solutions.com<br />
                Sales: sales@rakez-solutions.com<br />
                Support: support@rakez-solutions.com
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-card p-8 rounded-xl border border-border shadow-sm">
              <h2 className="text-2xl font-bold text-primary mb-6">
                {isRtl ? 'أرسل لنا رسالة' : 'Send us a Message'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {isRtl ? 'الاسم الكامل' : 'Full Name'}
                    </label>
                    <Input
                      required
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {isRtl ? 'البريد الإلكتروني' : 'Email Address'}
                    </label>
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {isRtl ? 'رقم الهاتف' : 'Phone Number'}
                      <span className="text-red-500 ms-1">*</span>
                    </label>
                    <PhoneInputWithCountry
                      required
                      isRtl={isRtl}
                      value={formData.phone}
                      onChange={phone => setFormData({ ...formData, phone })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-2">
                      {isRtl ? 'الموضوع' : 'Subject'}
                    </label>
                    <Input
                      required
                      value={formData.subject}
                      onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-primary mb-2">
                    {isRtl ? 'رسالتك' : 'Your Message'}
                  </label>
                  <Textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={e => setFormData({ ...formData, message: e.target.value })}
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full md:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 px-12"
                >
                  {isRtl ? 'إرسال الرسالة' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
