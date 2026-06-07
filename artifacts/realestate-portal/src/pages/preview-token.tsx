import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { Helmet } from 'react-helmet-async';
import { Shield, Clock, ExternalLink, AlertTriangle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BASE = '/realestate-api';

const PORTAL_META: Record<string, { label: string; labelAr: string; path: string }> = {
  'rkz':       { label: 'Rozoz Real Estate Portal',    labelAr: 'بوابة روزوز العقارية',       path: '/realestate/' },
  'grand-pms': { label: 'Grand PMS Dashboard',       labelAr: 'لوحة تحكم جراند',           path: '/hotel-dashboard/' },
};

type Status = 'loading' | 'valid' | 'expired' | 'revoked' | 'invalid';

interface LinkData {
  portal: string;
  label: string;
  expiresAt: string;
}

function formatExpiry(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export function PreviewToken() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>('loading');
  const [data, setData] = useState<LinkData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!token) { setStatus('invalid'); return; }
    fetch(`${BASE}/preview/${token}`)
      .then(async (r) => {
        const body = await r.json();
        if (r.status === 410) {
          const msg = String(body.error ?? '');
          setErrorMsg(msg);
          setStatus(msg.toLowerCase().includes('revok') ? 'revoked' : 'expired');
          return;
        }
        if (!r.ok) { setErrorMsg(body.error ?? 'Unknown error'); setStatus('invalid'); return; }
        setData({ portal: body.portal, label: body.label, expiresAt: body.expiresAt });
        setStatus('valid');
      })
      .catch(() => { setErrorMsg('Network error'); setStatus('invalid'); });
  }, [token]);

  const portalInfo = data ? PORTAL_META[data.portal] : null;

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Validating preview link…</p>
        </div>
      </div>
    );
  }

  if (status !== 'valid') {
    const isExpired = status === 'expired';
    const isRevoked = status === 'revoked';
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
        <Helmet><title>Preview Link Invalid | Rozoz</title></Helmet>
        <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-xl space-y-4">
          <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            {isRevoked ? <XCircle className="h-7 w-7 text-destructive" /> : <AlertTriangle className="h-7 w-7 text-destructive" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground mb-1">
              {isExpired ? 'Link Expired' : isRevoked ? 'Link Revoked' : 'Invalid Link'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isExpired
                ? 'This preview link has passed its expiration time.'
                : isRevoked
                ? 'This preview link has been manually deactivated by an administrator.'
                : errorMsg || 'This preview link is not valid.'}
            </p>
          </div>
          <Button variant="outline" className="w-full" onClick={() => navigate('/realestate/')}>
            Go to Rozoz Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <Helmet><title>Preview Access | Rozoz</title></Helmet>
      <div className="bg-card border border-border rounded-2xl p-8 max-w-sm w-full text-center shadow-xl space-y-5">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <Shield className="h-8 w-8 text-primary" />
        </div>

        {/* Title */}
        <div>
          <p className="text-xs font-medium text-primary uppercase tracking-wider mb-1">Secure Preview Access</p>
          <h1 className="text-xl font-bold text-foreground">
            {portalInfo?.label ?? data?.portal}
          </h1>
          {data?.label && (
            <p className="text-sm text-muted-foreground mt-1 italic">"{data.label}"</p>
          )}
        </div>

        {/* Expiry badge */}
        <div className="flex items-center justify-center gap-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 rounded-xl px-4 py-2.5 text-sm font-medium border border-amber-200 dark:border-amber-800">
          <Clock className="h-4 w-4 shrink-0" />
          <span>{formatExpiry(data!.expiresAt)}</span>
        </div>

        {/* Security notice */}
        <p className="text-xs text-muted-foreground/70 leading-relaxed">
          This is a time-limited preview link. Access will automatically expire and cannot be shared beyond this session.
        </p>

        {/* CTA */}
        <div className="space-y-2">
          <a
            href={portalInfo?.path ?? '/realestate/'}
            className="flex items-center justify-center gap-2 w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Open {portalInfo?.label ?? 'Portal'}
          </a>
          <p className="text-[10px] text-muted-foreground/50">
            Expires {new Date(data!.expiresAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}
