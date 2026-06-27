import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [loading, setLoading] = useState(false);

  const handleEnter = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 350));
    onLogin({
      id: 1,
      username: "manager",
      displayName: "Manager",
      name: "Manager",
      role: "manager",
      permissions: [],
    });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A1628] p-6 gap-8">

      {/* Logo */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center justify-center w-28 h-28 rounded-2xl bg-white/90 border border-[#C9A84C]/30 shadow-[0_0_40px_rgba(201,168,76,0.15)]">
          <img
            src="/grand-pms/housin-logo.png"
            alt="HousIn"
            className="w-20 h-20 object-contain"
            onError={(e) => {
              const el = e.currentTarget;
              el.style.display = "none";
              const fallback = el.nextElementSibling as HTMLElement | null;
              if (fallback) fallback.style.display = "block";
            }}
          />
          <span
            style={{
              display: "none",
              fontFamily: "'Georgia', 'Times New Roman', serif",
              fontSize: 38,
              fontWeight: 800,
              letterSpacing: "-0.5px",
              color: "#C9A84C",
            }}
          >
            H
          </span>
        </div>
        <p className="text-xs text-white/40 tracking-[0.25em] uppercase">
          HousIn · للحلول الذكية
        </p>
      </div>

      {/* Thin gold rule */}
      <div className="w-24 h-px bg-[#C9A84C]/30" />

      {/* Enter button */}
      <button
        onClick={handleEnter}
        disabled={loading}
        className="
          group relative flex items-center justify-center gap-3
          w-full max-w-xs h-14 rounded-2xl
          bg-[#C9A84C] hover:bg-[#D4B85A]
          text-[#0A1628] font-bold text-lg
          shadow-[0_0_30px_rgba(201,168,76,0.35)]
          hover:shadow-[0_0_40px_rgba(201,168,76,0.55)]
          transition-all duration-300 active:scale-[0.97]
          disabled:opacity-60 disabled:cursor-not-allowed
        "
      >
        {loading ? (
          <div className="h-5 w-5 border-2 border-[#0A1628]/30 border-t-[#0A1628] rounded-full animate-spin" />
        ) : (
          <>
            <span>دخول</span>
            <span className="text-sm font-semibold opacity-70">|</span>
            <span>Enter</span>
            <ArrowRight className="h-4 w-4 opacity-60 group-hover:translate-x-1 transition-transform duration-200" />
          </>
        )}
      </button>

      <p className="text-white/20 text-[11px] tracking-widest uppercase">
        Smart Solutions · HousIn للحلول الذكية
      </p>

      <p className="text-white/15 text-[10px] tracking-wide">
        © {new Date().getFullYear()} جميع الحقوق محفوظة لـ HousIn
      </p>
    </div>
  );
}
