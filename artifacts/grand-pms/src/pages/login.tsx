import React, { useState } from "react";
import { ArrowRight } from "lucide-react";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

function FalconMark({ size = 64 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="46" stroke="#C9A84C" strokeWidth="1.2" strokeDasharray="4 3" opacity="0.4" />
      <ellipse cx="52" cy="58" rx="18" ry="26" fill="#C9A84C" opacity="0.15" />
      <circle cx="50" cy="34" r="14" fill="#C9A84C" />
      <path d="M44 38 Q40 43 44 44 L50 40Z" fill="#8B6914" />
      <circle cx="46" cy="31" r="2.5" fill="#1A1200" />
      <circle cx="45.3" cy="30.3" r="0.9" fill="white" />
      <path d="M50 20 Q46 14 44 18 Q48 16 50 20Z" fill="#C9A84C" />
      <path d="M50 20 Q52 13 55 17 Q52 15 50 20Z" fill="#C9A84C" />
      <path d="M50 20 Q58 15 58 19 Q55 17 50 20Z" fill="#B8953A" />
      <path d="M36 52 Q22 60 24 72 Q32 62 44 66 Q40 60 36 52Z" fill="#C9A84C" opacity="0.9" />
      <path d="M64 52 Q78 60 76 72 Q68 62 56 66 Q60 60 64 52Z" fill="#C9A84C" opacity="0.9" />
      <path d="M44 52 Q50 46 56 52 Q50 80 44 52Z" fill="#B8953A" opacity="0.55" />
      <path d="M44 82 Q42 86 40 88 M44 82 Q44 87 43 90 M44 82 Q46 87 47 89" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M56 82 Q54 86 52 88 M56 82 Q56 87 55 90 M56 82 Q58 87 59 89" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
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

      {/* Brand mark */}
      <div className="flex flex-col items-center gap-3">
        <FalconMark size={88} />
        <div className="text-center space-y-1">
          <p className="font-serif text-3xl font-bold text-white tracking-widest">
            روزوز <span className="text-[#C9A84C]">|</span> Rozoz
          </p>
          <p className="text-xs text-white/40 tracking-[0.25em] uppercase">
            Smart Solutions · روزوز للحلول الذكية
          </p>
        </div>
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
        Property Management System
      </p>
    </div>
  );
}
