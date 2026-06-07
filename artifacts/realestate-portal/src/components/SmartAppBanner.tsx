import React, { useEffect, useState } from 'react';
import { X, Building } from 'lucide-react';

const DISMISSED_KEY = 'rkz_app_banner_dismissed';

const APP_STORE_URL   = 'https://apps.apple.com/app/rkz/id000000000';
const PLAY_STORE_URL  = 'https://play.google.com/store/apps/details?id=com.rkz.app';

export function SmartAppBanner() {
  const [visible, setVisible]   = useState(false);
  const [platform, setPlatform] = useState<'ios' | 'android' | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent;
    const isIOS     = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);
    const dismissed = sessionStorage.getItem(DISMISSED_KEY);

    if ((isIOS || isAndroid) && !dismissed) {
      const plat = isIOS ? 'ios' : 'android';
      setPlatform(plat);
      // Heuristic: if the user came from a deep-link referrer, app is likely installed
      setInstalled(document.referrer.includes('rkz://'));
      setVisible(true);
    }
  }, []);

  function dismiss() {
    sessionStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  function handleAction() {
    if (installed) {
      window.location.href = 'rkz://open';
      setTimeout(() => {
        window.open(platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL, '_blank');
      }, 1500);
    } else {
      window.open(platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL, '_blank');
    }
  }

  if (!visible) return null;

  const btnLabel = installed
    ? 'فتح · Open'
    : platform === 'ios' ? 'تحميل · GET' : 'تثبيت · Install';

  return (
    <div
      dir="rtl"
      className="flex items-center gap-3 px-4 py-2.5 bg-[#0A1628] text-white shadow-md z-[60] border-b border-[#D4A843]/20"
    >
      {/* App Icon */}
      <div className="w-10 h-10 rounded-xl bg-[#D4A843] flex items-center justify-center shrink-0 shadow-sm">
        <Building className="h-5 w-5 text-[#0A1628]" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm leading-tight">روزوز · Rozoz</p>
        <p className="text-[11px] text-white/55 leading-tight mt-0.5">
          {platform === 'ios' ? '★★★★★  App Store' : '★★★★★  Google Play'}
        </p>
      </div>

      {/* CTA */}
      <button
        onClick={handleAction}
        className="shrink-0 bg-[#D4A843] text-[#0A1628] text-[11px] font-bold px-4 py-1.5 rounded-full hover:bg-[#C49A35] transition-colors active:scale-95"
      >
        {btnLabel}
      </button>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="shrink-0 p-1 text-white/40 hover:text-white transition-colors"
        aria-label="Dismiss app banner"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
