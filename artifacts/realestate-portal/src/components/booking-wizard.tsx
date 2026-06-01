import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import {
  useGetPortalAvailability,
  useCreateBooking,
} from '@workspace/api-client-react';
import type { PortalAvailableRoom } from '@workspace/api-client-react';
import { usePortalAuth } from '@/lib/portal-auth';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CalendarDays, BedDouble, CheckCircle2, LogIn } from 'lucide-react';

interface BookingWizardProps {
  propertyId: number;
}

const STEPS = ['dates', 'rooms', 'guest', 'confirm'] as const;
type Step = (typeof STEPS)[number];

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

const daysBetween = (a: string, b: string) =>
  Math.max(1, Math.round((new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) / 86_400_000));

export const BookingWizard: React.FC<BookingWizardProps> = ({ propertyId }) => {
  const { isAuthenticated, user } = usePortalAuth();
  const { isRtl } = useLanguage();
  const { toast } = useToast();

  const [step, setStep]               = useState<Step>('dates');
  const [checkIn, setCheckIn]         = useState('');
  const [checkOut, setCheckOut]       = useState('');
  const [selectedRoom, setSelectedRoom] = useState<PortalAvailableRoom | null>(null);
  const [guestName, setGuestName]     = useState('');
  const [guestEmail, setGuestEmail]   = useState('');
  const [guestPhone, setGuestPhone]   = useState('');
  const [confirmed, setConfirmed]     = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const datesValid = !!checkIn && !!checkOut && new Date(checkIn + 'T00:00:00') < new Date(checkOut + 'T00:00:00');
  const nights     = datesValid ? daysBetween(checkIn, checkOut) : 0;
  const totalAmount = selectedRoom?.pricePerNight
    ? parseFloat(selectedRoom.pricePerNight) * nights
    : 0;

  useEffect(() => {
    if (user) {
      const u = user as unknown as Record<string, unknown>;
      setGuestName((u.displayName as string) ?? (u.username as string) ?? '');
      setGuestEmail((u.email as string) ?? '');
    }
  }, [user]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: availRes, isLoading: loadingRooms } = useGetPortalAvailability(
    { propertyId, checkIn, checkOut },
    { query: { enabled: step === 'rooms' && datesValid } } as any,
  );
  const rooms = (availRes?.data ?? []) as PortalAvailableRoom[];

  const createBooking = useCreateBooking();

  const handleConfirm = async () => {
    if (!selectedRoom) return;
    try {
      await createBooking.mutateAsync({
        data: {
          guestName,
          guestEmail,
          guestPhone: guestPhone || undefined,
          roomId:      selectedRoom.id,
          checkIn,
          checkOut,
          totalAmount,
          status:      'confirmed',
        },
      });
      setConfirmed(true);
    } catch {
      toast({ title: 'Booking failed', description: 'Please try again.', variant: 'destructive' });
    }
  };

  const reset = () => {
    setConfirmed(false);
    setStep('dates');
    setSelectedRoom(null);
    setCheckIn('');
    setCheckOut('');
  };

  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  const backArrow = isRtl ? '→' : '←';

  /* ── Not authenticated ───────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <LogIn className="h-10 w-10 text-primary/40 mx-auto mb-3" />
        <p className="text-muted-foreground text-sm mb-5">
          Sign in to your portal account to book this property directly.
        </p>
        <Button asChild className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90">
          <Link href="/portal">Sign In to Book</Link>
        </Button>
      </div>
    );
  }

  /* ── Confirmed ───────────────────────────────────── */
  if (confirmed) {
    return (
      <div className="text-center py-6">
        <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
        <h4 className="text-lg font-bold text-primary mb-2">Booking Confirmed!</h4>
        <p className="text-sm text-muted-foreground mb-1">
          {selectedRoom?.name} &bull; {checkIn} → {checkOut}
        </p>
        <p className="text-secondary font-bold text-xl mt-1">{fmtCurrency(totalAmount)}</p>
        <p className="text-xs text-muted-foreground mt-1">
          A summary has been sent to <strong>{guestEmail}</strong>
        </p>
        <Button variant="outline" className="mt-6 w-full" onClick={reset}>
          Book Another Stay
        </Button>
      </div>
    );
  }

  /* ── Step progress bar ───────────────────────────── */
  const stepIdx = STEPS.indexOf(step);
  const progress = (
    <div className="flex gap-1 mb-6">
      {STEPS.map((s, i) => (
        <div
          key={s}
          className={`h-1 flex-1 rounded-full transition-colors ${
            i <= stepIdx ? 'bg-secondary' : 'bg-muted'
          }`}
        />
      ))}
    </div>
  );

  /* ── Step 1: Dates ───────────────────────────────── */
  if (step === 'dates') {
    return (
      <div className="space-y-4">
        {progress}
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Check In</label>
          <Input
            type="date"
            min={today}
            value={checkIn}
            onChange={(e) => { setCheckIn(e.target.value); setSelectedRoom(null); }}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Check Out</label>
          <Input
            type="date"
            min={checkIn || today}
            value={checkOut}
            onChange={(e) => { setCheckOut(e.target.value); setSelectedRoom(null); }}
          />
        </div>
        {checkIn && checkOut && !datesValid && (
          <p className="text-destructive text-xs">Check-out must be after check-in.</p>
        )}
        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          disabled={!datesValid}
          onClick={() => setStep('rooms')}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Check Availability
        </Button>
      </div>
    );
  }

  /* ── Step 2: Room selection ──────────────────────── */
  if (step === 'rooms') {
    return (
      <div className="space-y-3">
        {progress}
        <button onClick={back} className="text-xs text-muted-foreground hover:text-primary mb-1 flex items-center gap-1">
          {backArrow} Dates: {checkIn} → {checkOut}
        </button>
        {loadingRooms ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <BedDouble className="h-10 w-10 mx-auto mb-3 opacity-25" />
            <p className="text-sm">No rooms available for these dates.</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={back}>
              Change Dates
            </Button>
          </div>
        ) : (
          rooms.map((room) => (
            <div
              key={room.id}
              role="button"
              onClick={() => { setSelectedRoom(room); setStep('guest'); }}
              className={`border rounded-xl p-4 cursor-pointer transition-all hover:border-secondary hover:shadow-sm ${
                selectedRoom?.id === room.id ? 'border-secondary bg-secondary/5' : 'border-border'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-primary text-sm">{room.name}</p>
                  <p className="text-xs text-muted-foreground capitalize mt-0.5">
                    {room.type}{room.capacity ? ` · ${room.capacity} guests` : ''}
                  </p>
                </div>
                <div className="text-right shrink-0 ml-4">
                  <p className="font-bold text-secondary text-sm">
                    {room.pricePerNight ? `${fmtCurrency(parseFloat(room.pricePerNight))}/night` : 'Contact'}
                  </p>
                  {nights > 0 && room.pricePerNight && (
                    <p className="text-xs text-muted-foreground">
                      {fmtCurrency(parseFloat(room.pricePerNight) * nights)} total
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    );
  }

  /* ── Step 3: Guest info ──────────────────────────── */
  if (step === 'guest') {
    return (
      <div className="space-y-4">
        {progress}
        <button onClick={back} className="text-xs text-muted-foreground hover:text-primary mb-1">
          {backArrow} {selectedRoom?.name}
        </button>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Full Name</label>
          <Input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Email</label>
          <Input
            type="email"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-primary mb-1">Phone (optional)</label>
          <Input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+966..."
          />
        </div>
        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
          disabled={!guestName.trim() || !guestEmail.trim()}
          onClick={() => setStep('confirm')}
        >
          Review Booking
        </Button>
      </div>
    );
  }

  /* ── Step 4: Confirm ─────────────────────────────── */
  return (
    <div className="space-y-4">
      {progress}
      <button onClick={back} className="text-xs text-muted-foreground hover:text-primary mb-1">
        {backArrow} Edit guest info
      </button>
      <div className="bg-muted rounded-xl p-4 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Room</span>
          <span className="font-medium">{selectedRoom?.name}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Check In</span>
          <span className="font-medium">{checkIn}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Check Out</span>
          <span className="font-medium">{checkOut}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Nights</span>
          <span className="font-medium">{nights}</span>
        </div>
        <div className="border-t border-border pt-2 flex justify-between font-bold">
          <span>Total</span>
          <span className="text-secondary text-base">{fmtCurrency(totalAmount)}</span>
        </div>
      </div>
      <div className="bg-card border border-border rounded-xl p-3 text-sm space-y-0.5">
        <p className="font-semibold text-primary">{guestName}</p>
        <p className="text-muted-foreground">{guestEmail}</p>
        {guestPhone && <p className="text-muted-foreground">{guestPhone}</p>}
      </div>
      <Button
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        disabled={createBooking.isPending}
        onClick={handleConfirm}
      >
        {createBooking.isPending ? 'Confirming...' : 'Confirm Booking'}
      </Button>
      <p className="text-xs text-center text-muted-foreground">
        Booking is subject to availability confirmation.
      </p>
    </div>
  );
};
