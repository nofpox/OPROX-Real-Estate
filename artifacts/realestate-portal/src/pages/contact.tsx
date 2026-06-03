import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLanguage } from '@/lib/i18n';
import { useCms } from '@/lib/cms-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PhoneInputWithCountry } from '@/components/phone-input';

export const Contact: React.FC = () => {
  const { isRtl } = useLanguage();
  const { content } = useCms();
  const { toast } = useToast();
  const { contact, branding } = content;

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/realestate-api/guest/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? 'Submission failed');
      }
      const data = await res.json() as { refCode: string };
      toast({
        title: isRtl ? 'تم إرسال الرسالة' : 'Message Sent',
        description: isRtl
          ? `شكراً لتواصلك معنا. رقم طلبك: ${data.refCode}. سيتواصل معك فريقنا قريباً.`
          : `Thank you for reaching out. Your reference: ${data.refCode}. Our team will contact you shortly.`,
      });
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast({
        title: isRtl ? 'حدث خطأ' : 'Submission Failed',
        description: isRtl
          ? 'لم نتمكن من إرسال رسالتك. يرجى المحاولة مرة أخرى.'
          : 'We could not send your message. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addressLines = isRtl
    ? (contact.addressAr || '').split('\n')
    : (contact.addressEn || '').split('\n');

  return (
    <div className="bg-muted min-h-screen py-16">
      <Helmet>
        <title>
          {isRtl
            ? `اتصل بنا | ${branding.companyNameAr}`
            : `Contact Us | ${branding.companyNameEn}`}
        </title>
        <meta
          name="description"
          content={
            isRtl
              ? `تواصل مع ${branding.companyNameAr} لاستفسارات إدارة العقارات والشراكات والدعم.`
              : `Get in touch with ${branding.companyNameEn} for property management inquiries, partnerships, and support.`
          }
        />
      </Helmet>

      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold text-primary mb-4">
            {isRtl ? 'تواصل معنا' : 'Get in Touch'}
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            {isRtl
              ? 'سواء كنت تبحث عن خدمات إدارة العقارات، أو تبحث عن منزل جديد، أو لديك استفسار عام، فريقنا مستعد لمساعدتك.'
              : "Whether you're looking for property management services, seeking a new home, or have a general inquiry, our team is ready to assist you."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Address */}
            {(contact.addressEn || contact.addressAr) && (
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {isRtl ? 'المكتب الرئيسي' : 'Head Office'}
                </h3>
                <p className="text-muted-foreground leading-relaxed" dir={isRtl ? 'rtl' : 'ltr'}>
                  {addressLines.map((line, i) => (
                    <React.Fragment key={i}>
                      {line}{i < addressLines.length - 1 && <br />}
                    </React.Fragment>
                  ))}
                </p>
              </div>
            )}

            {/* Phone */}
            {(contact.phone || contact.fax || contact.supportPhone) && (
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Phone className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {isRtl ? 'أرقام التواصل' : 'Contact Numbers'}
                </h3>
                <p className="text-muted-foreground leading-relaxed" dir="ltr">
                  {contact.phone    && <>{isRtl ? 'هاتف' : 'Tel'}: {contact.phone}<br /></>}
                  {contact.fax      && <>{isRtl ? 'فاكس' : 'Fax'}: {contact.fax}<br /></>}
                  {contact.supportPhone && <>{isRtl ? 'الدعم' : 'Support'}: {contact.supportPhone}</>}
                </p>
              </div>
            )}

            {/* Email */}
            {(contact.email || contact.salesEmail || contact.supportEmail) && (
              <div className="bg-card p-6 rounded-xl border border-border shadow-sm">
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-primary mb-2">
                  {isRtl ? 'عناوين البريد الإلكتروني' : 'Email Addresses'}
                </h3>
                <p className="text-muted-foreground leading-relaxed" dir="ltr">
                  {contact.email        && <>{isRtl ? 'عام' : 'General'}: {contact.email}<br /></>}
                  {contact.salesEmail   && <>{isRtl ? 'المبيعات' : 'Sales'}: {contact.salesEmail}<br /></>}
                  {contact.supportEmail && <>{isRtl ? 'الدعم' : 'Support'}: {contact.supportEmail}</>}
                </p>
              </div>
            )}
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
                  disabled={submitting}
                  className="w-full md:w-auto bg-secondary text-secondary-foreground hover:bg-secondary/90 px-12 disabled:opacity-70"
                >
                  {submitting
                    ? (isRtl ? 'جارٍ الإرسال...' : 'Sending...')
                    : (isRtl ? 'إرسال الرسالة' : 'Send Message')}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
