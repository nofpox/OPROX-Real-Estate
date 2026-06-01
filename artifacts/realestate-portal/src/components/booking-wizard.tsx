import React, { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetPortalAvailability,
  useCreateBooking,
  getGetPortalAvailabilityQueryKey,
} from '@workspace/api-client-react';
import type { PortalAvailableRoom } from '@workspace/api-client-react';
import { usePortalAuth } from '@/lib/portal-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  LogIn, CalendarDays, BedDouble, User2, CheckCircle2,
  ChevronLeft, Moon, Users, Banknote, Hash,
} from 'lucide-react';

/* ── helpers ──────────────────────────────────────────────── */

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('en-SA', {
    style:               'currency',
    currency:            'SAR',
    maximumFractionDigits: 0,
  }).format(n);

const daysBetween = (a: string, b: string) =>
  Math.max(
    1,
    Math.round(
      (new Date(b + 'T00:00:00').getTime() - new Date(a + 'T00:00:00').getTime()) /
        86_400_000,
    ),
  );

const ROOM_TYPE_ICON: Record<string, React.ReactNode> = {
  Suite:       <BedDouble className="h-4 w-4 text-amber-500" />,
  Deluxe:      <BedDouble className="h-4 w-4 text-blue-500" />,
  Standard:    <BedDouble className="h-4 w-4 text-muted-foreground" />,
  Studio:      <BedDouble className="h-4 w-4 text-purple-500" />,
  '1-Bedroom': <BedDouble className="h-4 w-4 text-teal-500" />,
  '2-Bedroom': <BedDouble className="h-4 w-4 text-green-600" />,
};

const roomIcon = (type: string) => ROOM_TYPE_ICON[type] ?? <BedDouble className="h-4 w-4 text-muted-foreground" />;

/* ── step config ──────────────────────────────────────────── */

const STEPS = ['dates', 'rooms', 'guest', 'confirm'] as const;
type Step = (typeof STEPS)[number];

const STEP_LABELS: Record<Step, string> = {
  dates:   'Select Dates',
  rooms:   'Choose Room',
  guest:   'Your Details',
  confirm: 'Confirm',
};

/* ── component ────────────────────────────────────────────── */

interface BookingWizardProps {
  propertyId:   number;
  propertyName?: string;
}

export const BookingWizard: React.FC<BookingWizardProps> = ({
  propertyId,
  propertyName,
}) => {
  const { isAuthenticated, user }  = usePortalAuth();
  const { toast }                  = useToast();
  const queryClient                = useQueryClient();

  const [step, setStep]                   = useState<Step>('dates');
  const [checkIn,  setCheckIn]            = useState('');
  const [checkOut, setCheckOut]           = useState('');
  const [selectedRoom, setSelectedRoom]   = useState<PortalAvailableRoom | null>(null);
  const [guestName,  setGuestName]        = useState('');
  const [guestEmail, setGuestEmail]       = useState('');
  const [guestPhone, setGuestPhone]       = useState('');
  const [confirmedId, setConfirmedId]     = useState<number | null>(null);

  const today      = new Date().toISOString().split('T')[0];
  const datesValid =
    !!checkIn && !!checkOut &&
    new Date(checkIn + 'T00:00:00') < new Date(checkOut + 'T00:00:00');
  const nights      = datesValid ? daysBetween(checkIn, checkOut) : 0;
  const pricePerNight =
    selectedRoom?.pricePerNight ? parseFloat(selectedRoom.pricePerNight) : 0;
  const totalAmount = pricePerNight * nights;

  /* pre-fill from portal auth */
  useEffect(() => {
    if (user) {
      const u = user as unknown as Record<string, unknown>;
      setGuestName( (u.displayName as string) ?? (u.username as string) ?? '');
      setGuestEmail((u.email       as string) ?? '');
    }
  }, [user]);

  /* availability query — fires only when on rooms step with valid dates */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: availRes, isLoading: loadingRooms, error: availError } = useGetPortalAvailability(
    { propertyId, checkIn, checkOut },
    { query: { enabled: step === 'rooms' && datesValid, staleTime: 30_000 } } as any,
  );
  const rooms = (availRes?.data ?? []) as PortalAvailableRoom[];

  /* booking mutation */
  const createBooking = useCreateBooking();

  const handleConfirm = async () => {
    if (!selectedRoom || !datesValid) return;
    try {
      const result = await createBooking.mutateAsync({
        data: {
          guestName,
          guestEmail,
          guestPhone:  guestPhone || undefined,
          roomId:      selectedRoom.id,
          checkIn,
          checkOut,
          totalAmount,
          status:      'confirmed',
        },
      });
      /* capture booking ID for reference number */
      const bookingId = (result as unknown as Record<string, unknown>)?.id as number | undefined;
      setConfirmedId(bookingId ?? null);

      /* invalidate availability so re-booking the same dates shows correctly */
      queryClient.invalidateQueries({
        queryKey: getGetPortalAvailabilityQueryKey({ propertyId, checkIn, checkOut }),
      });
    } catch {
      toast({
        title:       'Booking failed',
        description: 'Unable to complete the reservation. Please try again.',
        variant:     'destructive',
      });
    }
  };

  const reset = () => {
    setConfirmedId(null);
    setStep('dates');
    setSelectedRoom(null);
    setCheckIn('');
    setCheckOut('');
  };

  const back = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 0) setStep(STEPS[idx - 1]);
  };

  /* ── Step progress header ─────────────────────────────── */
  const stepIdx = STEPS.indexOf(step);

  const ProgressHeader = () => (
    <div className="mb-6">
      {/* Bar */}
      <div className="flex gap-1 mb-2">
        {STEPS.map((s, i) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i <= stepIdx ? 'bg-secondary' : 'bg-muted'
            }`}
          />
        ))}
      </div>
      {/* Step label */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-primary">{STEP_LABELS[step]}</span>
        <span>Step {stepIdx + 1} of {STEPS.length}</span>
      </div>
    </div>
  );

  const BackButton = ({ label }: { label: string }) => (
    <button
      onClick={back}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors mb-4"
    >
      <ChevronLeft className="h-3.5 w-3.5" />
      {label}
    </button>
  );

  /* ── Not authenticated ────────────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="text-center py-6">
        <div className="bg-primary/5 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
          <LogIn className="h-8 w-8 text-primary/50" />
        </div>
        <p className="font-semibold text-primary mb-1">Sign in to book directly</p>
        <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
          Portal clients can check real-time availability and complete reservations instantly.
        </p>
        <Button
          asChild
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          <Link href="/portal">Sign In to Portal</Link>
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">
          Or send an inquiry using the form below.
        </p>
      </div>
    );
  }

  /* ── Booking confirmed ────────────────────────────────── */
  if (confirmedId !== null) {
    return (
      <div className="text-center py-4">
        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-4">
          <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
          <h4 className="text-lg font-bold text-green-900 mb-1">Booking Confirmed</h4>
          {confirmedId && (
            <div className="inline-flex items-center gap-1.5 bg-white border border-green-200 rounded-full px-3 py-1 text-sm font-mono text-green-800 mb-3">
              <Hash className="h-3.5 w-3.5" />
              REF-{String(confirmedId).padStart(5, '0')}
            </div>
          )}
          <div className="text-sm text-green-700 space-y-0.5">
            <p className="font-medium">{selectedRoom?.name}</p>
            <p>{checkIn} → {checkOut} &bull; {nights} night{nights !== 1 ? 's' : ''}</p>
            <p className="font-bold text-base text-green-800 mt-2">{fmtSAR(totalAmount)}</p>
          </div>
        </div>
        <div className="bg-muted rounded-xl p-4 text-left text-sm mb-4">
          <p className="font-semibold text-primary">{guestName}</p>
          <p className="text-muted-foreground">{guestEmail}</p>
          {guestPhone && <p className="text-muted-foreground">{guestPhone}</p>}
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Your booking is recorded in your portal dashboard under "Recent Bookings."
        </p>
        <Button variant="outline" className="w-full" onClick={reset}>
          Make Another Booking
        </Button>
      </div>
    );
  }

  /* ── Step 1: Dates ────────────────────────────────────── */
  if (step === 'dates') {
    return (
      <div className="space-y-4">
        <ProgressHeader />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
              Check In
            </label>
            <Input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => {
                setCheckIn(e.target.value);
                setSelectedRoom(null);
                if (checkOut && e.target.value >= checkOut) setCheckOut('');
              }}
              className="text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
              Check Out
            </label>
            <Input
              type="date"
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => { setCheckOut(e.target.value); setSelectedRoom(null); }}
              className="text-sm"
            />
          </div>
        </div>

        {/* Nights summary pill — shown when dates are valid */}
        {datesValid && (
          <div className="flex items-center justify-between bg-secondary/10 border border-secondary/20 rounded-lg px-4 py-2.5">
            <span className="text-sm text-muted-foreground">Duration</span>
            <div className="flex items-center gap-1.5 text-sm font-semibold text-secondary">
              <Moon className="h-3.5 w-3.5" />
              {nights} night{nights !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {checkIn && checkOut && !datesValid && (
          <p className="text-destructive text-xs">Check-out must be after check-in.</p>
        )}

        {propertyName && (
          <p className="text-xs text-muted-foreground">
            Checking availability for <span className="font-medium text-primary">{propertyName}</span>
          </p>
        )}

        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10"
          disabled={!datesValid}
          onClick={() => setStep('rooms')}
        >
          <CalendarDays className="h-4 w-4 mr-2" />
          Check Availability
        </Button>
      </div>
    );
  }

  /* ── Step 2: Room selection ───────────────────────────── */
  if (step === 'rooms') {
    return (
      <div>
        <ProgressHeader />
        <BackButton label={`${checkIn} → ${checkOut} · ${nights} night${nights !== 1 ? 's' : ''}`} />

        {availError ? (
          <div className="text-center py-8 text-destructive text-sm">
            <p>Could not load availability. Please try again.</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={back}>
              Change Dates
            </Button>
          </div>
        ) : loadingRooms ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8">
            <div className="bg-muted rounded-full w-14 h-14 flex items-center justify-center mx-auto mb-3">
              <BedDouble className="h-7 w-7 text-muted-foreground/40" />
            </div>
            <p className="font-medium text-primary mb-1">No rooms available</p>
            <p className="text-sm text-muted-foreground mb-4">
              All rooms are booked for these dates. Try different dates.
            </p>
            <Button variant="outline" size="sm" onClick={back}>
              Change Dates
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {rooms.map((room) => {
              const price     = room.pricePerNight ? parseFloat(room.pricePerNight) : 0;
              const roomTotal = price * nights;
              const isSelected = selectedRoom?.id === room.id;
              return (
                <div
                  key={room.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setSelectedRoom(room); setStep('guest'); }}
                  onKeyDown={(e) => e.key === 'Enter' && (setSelectedRoom(room), setStep('guest'))}
                  className={`border rounded-xl p-4 cursor-pointer transition-all duration-150
                    hover:border-secondary hover:shadow-sm active:scale-[0.99]
                    ${isSelected ? 'border-secondary bg-secondary/5 shadow-sm' : 'border-border bg-card'}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="mt-0.5 shrink-0">{roomIcon(room.type)}</div>
                      <div className="min-w-0">
                        <p className="font-semibold text-primary text-sm leading-tight">{room.name}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                          <span className="capitalize">{room.type}</span>
                          {room.capacity && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Users className="h-3 w-3" />
                                {room.capacity}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {price > 0 ? (
                        <>
                          <p className="font-bold text-secondary text-sm">
                            {fmtSAR(price)}<span className="text-xs font-normal text-muted-foreground">/night</span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {fmtSAR(roomTotal)} total
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground">Contact for price</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  /* ── Step 3: Guest details ────────────────────────────── */
  if (step === 'guest') {
    return (
      <div className="space-y-4">
        <ProgressHeader />
        <BackButton label={selectedRoom?.name ?? 'Back'} />

        {/* Mini booking summary */}
        <div className="bg-secondary/8 border border-secondary/20 rounded-lg px-4 py-2.5 flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Moon className="h-3.5 w-3.5" />
            <span>{nights} night{nights !== 1 ? 's' : ''}</span>
          </div>
          <span className="font-bold text-secondary">
            {pricePerNight > 0 ? fmtSAR(totalAmount) : 'Contact for price'}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
            Full Name <span className="text-destructive">*</span>
          </label>
          <div className="relative">
            <User2 className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9 text-sm"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Your full name"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
            Email <span className="text-destructive">*</span>
          </label>
          <Input
            type="email"
            className="text-sm"
            value={guestEmail}
            onChange={(e) => setGuestEmail(e.target.value)}
            placeholder="email@example.com"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-primary mb-1.5 uppercase tracking-wide">
            Phone <span className="text-muted-foreground font-normal normal-case">(optional)</span>
          </label>
          <Input
            type="tel"
            className="text-sm"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="+966 5x xxx xxxx"
          />
        </div>

        <Button
          className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-10"
          disabled={!guestName.trim() || !guestEmail.trim()}
          onClick={() => setStep('confirm')}
        >
          Review Booking
        </Button>
      </div>
    );
  }

  /* ── Step 4: Confirm ──────────────────────────────────── */
  return (
    <div className="space-y-4">
      <ProgressHeader />
      <BackButton label="Edit guest details" />

      {/* Booking summary card */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-primary/5 px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-primary uppercase tracking-wide">Booking Summary</p>
        </div>
        <div className="divide-y divide-border text-sm">
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Room</span>
            <span className="font-medium text-primary">{selectedRoom?.name}</span>
          </div>
          {propertyName && (
            <div className="flex justify-between px-4 py-2.5">
              <span className="text-muted-foreground">Property</span>
              <span className="font-medium text-primary">{propertyName}</span>
            </div>
          )}
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Check In</span>
            <span className="font-medium">{new Date(checkIn + 'T00:00:00').toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground">Check Out</span>
            <span className="font-medium">{new Date(checkOut + 'T00:00:00').toLocaleDateString('en-SA', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Moon className="h-3.5 w-3.5" /> Nights
            </span>
            <span className="font-medium">{nights}</span>
          </div>
          <div className="flex justify-between px-4 py-2.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5" /> Rate
            </span>
            <span className="font-medium">{fmtSAR(pricePerNight)}/night</span>
          </div>
          <div className="flex justify-between px-4 py-3 bg-muted/40">
            <span className="font-semibold text-primary">Total</span>
            <span className="font-bold text-secondary text-base">{fmtSAR(totalAmount)}</span>
          </div>
        </div>
      </div>

      {/* Guest summary */}
      <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guest</p>
        <p className="font-semibold text-primary">{guestName}</p>
        <p className="text-muted-foreground">{guestEmail}</p>
        {guestPhone && <p className="text-muted-foreground">{guestPhone}</p>}
      </div>

      <Button
        className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90 h-11 text-base font-semibold"
        disabled={createBooking.isPending}
        onClick={handleConfirm}
      >
        {createBooking.isPending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 border-2 border-secondary-foreground/30 border-t-secondary-foreground rounded-full animate-spin" />
            Confirming reservation...
          </span>
        ) : (
          'Confirm Reservation'
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        Your booking will appear in your portal dashboard immediately.
      </p>
    </div>
  );
};
