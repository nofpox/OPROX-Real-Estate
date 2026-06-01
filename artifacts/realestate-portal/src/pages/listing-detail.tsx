import React, { useState } from 'react';
import { useRoute } from 'wouter';
import { useGetListingById, useSubmitListingInquiry } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, BedDouble, Bath, Square, Building2, Phone, Mail, User, Info, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

export const ListingDetail: React.FC = () => {
  const [, params] = useRoute('/listings/:id');
  const id = params?.id ? parseInt(params.id, 10) : 0;
  const { t, isRtl } = useLanguage();
  const { toast } = useToast();
  
  const { data: response, isLoading } = useGetListingById(id, {
    query: { enabled: !!id }
  });
  
  const submitInquiry = useSubmitListingInquiry();
  
  const listing = response?.data;
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    message: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!listing) return;
    
    submitInquiry.mutate({
      data: {
        listingId: listing.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        message: formData.message,
        source: 'website'
      }
    }, {
      onSuccess: () => {
        setSubmitted(true);
        toast({
          title: "Inquiry Sent",
          description: "We'll be in touch with you shortly.",
        });
      },
      onError: (err) => {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to send inquiry. Please try again later.",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Skeleton className="w-full h-[50vh] rounded-xl mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <div className="flex gap-4">
              <Skeleton className="h-24 w-24" />
              <Skeleton className="h-24 w-24" />
              <Skeleton className="h-24 w-24" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
          <div>
            <Skeleton className="h-96 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!listing) {
    return <div className="text-center py-24 text-2xl font-bold text-muted-foreground">Listing not found</div>;
  }

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat('en-SA', { style: 'currency', currency: currency || 'SAR', maximumFractionDigits: 0 }).format(price);
  };

  const hasMedia = listing.media && Array.isArray(listing.media) && listing.media.length > 0;
  const mainImage = hasMedia ? (listing.media[0] as any).url : null;

  return (
    <div className="bg-background pb-24">
      {/* Media Gallery / Hero */}
      <div className="w-full h-[40vh] md:h-[60vh] bg-muted relative border-b border-border">
        {mainImage ? (
          <img src={mainImage} alt={listing.title} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
            <Building2 className="w-32 h-32 text-primary/20" />
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-background to-transparent h-32" />
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="bg-card rounded-xl p-8 shadow-md border border-border mb-8">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-semibold rounded-full uppercase tracking-wider">
                      {listing.listingType}
                    </span>
                    <span className="px-3 py-1 bg-secondary/10 text-secondary-foreground text-xs font-semibold rounded-full uppercase tracking-wider">
                      {listing.propertyType}
                    </span>
                    {listing.status !== 'active' && (
                      <span className="px-3 py-1 bg-destructive/10 text-destructive text-xs font-semibold rounded-full uppercase tracking-wider">
                        {listing.status}
                      </span>
                    )}
                  </div>
                  <h1 className="text-3xl md:text-4xl font-bold text-primary mb-2">{listing.title}</h1>
                  <div className="flex items-center text-muted-foreground">
                    <MapPin className="h-5 w-5 mr-1" />
                    <span>{listing.district}, {listing.city}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-secondary-foreground">
                    {formatPrice(listing.price, listing.currency)}
                  </div>
                  {listing.listingType === 'rent' && <div className="text-muted-foreground text-sm">per year</div>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 py-6 border-y border-border my-6">
                {listing.bedrooms != null && (
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                    <BedDouble className="h-8 w-8 text-primary mb-2" />
                    <span className="text-xl font-semibold">{listing.bedrooms}</span>
                    <span className="text-sm text-muted-foreground">Bedrooms</span>
                  </div>
                )}
                {listing.bathrooms != null && (
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                    <Bath className="h-8 w-8 text-primary mb-2" />
                    <span className="text-xl font-semibold">{listing.bathrooms}</span>
                    <span className="text-sm text-muted-foreground">Bathrooms</span>
                  </div>
                )}
                {listing.areaSqm != null && (
                  <div className="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg">
                    <Square className="h-8 w-8 text-primary mb-2" />
                    <span className="text-xl font-semibold">{listing.areaSqm}</span>
                    <span className="text-sm text-muted-foreground">sqm Area</span>
                  </div>
                )}
              </div>

              <h2 className="text-2xl font-bold text-primary mb-4">Description</h2>
              <div className="text-muted-foreground leading-relaxed whitespace-pre-line mb-8">
                {listing.description}
              </div>

              {listing.amenities && listing.amenities.length > 0 && (
                <>
                  <h2 className="text-2xl font-bold text-primary mb-4">Amenities</h2>
                  <div className="flex flex-wrap gap-2 mb-8">
                    {listing.amenities.map((amenity, i) => (
                      <div key={i} className="flex items-center bg-muted px-4 py-2 rounded-lg text-sm font-medium border border-border">
                        <CheckCircle2 className="h-4 w-4 mr-2 text-secondary" />
                        {amenity}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Sidebar / Inquiry Form */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl p-6 shadow-md border border-border sticky top-24">
              <h3 className="text-xl font-bold text-primary mb-6">Interested in this property?</h3>
              
              {submitted ? (
                <div className="bg-green-50 border border-green-200 p-6 rounded-lg text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-green-900 mb-2">Inquiry Sent!</h4>
                  <p className="text-green-800 text-sm">Thank you for your interest. Our team will contact you shortly.</p>
                  <Button variant="outline" className="mt-6 w-full" onClick={() => setSubmitted(false)}>
                    Send Another Inquiry
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        required 
                        className="pl-9" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="email" 
                        required 
                        className="pl-9"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="tel" 
                        required 
                        className="pl-9"
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1">Message</label>
                    <Textarea 
                      rows={4} 
                      placeholder="I am interested in this property..."
                      value={formData.message}
                      onChange={e => setFormData({...formData, message: e.target.value})}
                    ></Textarea>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                    disabled={submitInquiry.isPending}
                  >
                    {submitInquiry.isPending ? 'Sending...' : 'Send Inquiry'}
                  </Button>
                </form>
              )}
              
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Info className="h-5 w-5 text-primary" />
                  <p>Or contact us directly at <a href="mailto:sales@rakez.sa" className="text-secondary font-medium hover:underline">sales@rakez.sa</a></p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
