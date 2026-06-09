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

      {/* Official Rozoz Logo */}
      <div className="flex flex-col items-center gap-4">
        <img
          src={`${import.meta.env.BASE_URL}rozoz-logo.png`}
          alt="Rozoz"
          className="h-28 w-auto object-contain"
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
        <p className="text-xs text-white/40 tracking-[0.25em] uppercase">
          Smart Solutions · روزوز للحلول الذكية
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
        Smart Solutions · روزوز للحلول الذكية
      </p>

      <p className="text-white/15 text-[10px] tracking-wide">
        © {new Date().getFullYear()} جميع الحقوق محفوظة لـ Rozoz
      </p>
    </div>
  );
}
