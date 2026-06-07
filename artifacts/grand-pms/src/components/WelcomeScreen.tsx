import { useEffect, useRef, useState } from "react";

// ── Palette ────────────────────────────────────────────────────────────────
const BG_DARK   = "#0A0E1A";
const GOLD      = "#C9A84C";
const GREEN     = "#22c55e";
const TEXT_PRI  = "#F5F0E8";
const TEXT_MUTED = "rgba(245,240,232,0.55)";

// ── Gauge maths ─────────────────────────────────────────────────────────────
const R          = 72;
const STROKE     = 7;
const CIRCUM     = 2 * Math.PI * R;            // ≈ 452.4
const TARGET     = 82;
const FILL_FRAC  = TARGET / 100;               // 0.82
const OFFSET_END = CIRCUM * (1 - FILL_FRAC);  // offset at 82 %

// ── Timing (ms) ──────────────────────────────────────────────────────────────
const T_LOGO    = 200;
const T_GAUGE   = 900;
const T_SCORE   = 1700;
const T_CHIP    = 2000;
const T_SKIP    = 2000;
const T_REASON  = 2500;
const T_CTA     = 3800;
const T_NAV     = 5000;

interface Props { onComplete: () => void }

export function WelcomeScreen({ onComplete }: Props) {
  const [phase, setPhase] = useState(0);
  // phase 1=logo, 2=gauge, 3=score, 4=chip+skip, 5=reason, 6=cta
  const done = useRef(false);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onComplete();
  };

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), T_LOGO),
      setTimeout(() => setPhase(2), T_GAUGE),
      setTimeout(() => setPhase(3), T_SCORE),
      setTimeout(() => setPhase(4), T_CHIP),
      setTimeout(() => setPhase(5), T_REASON),
      setTimeout(() => setPhase(6), T_CTA),
      setTimeout(finish, T_NAV),
    ];
    return () => timers.forEach(clearTimeout);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: BG_DARK,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Background radial glow */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: `radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,168,76,0.06) 0%, transparent 70%)`,
      }} />

      {/* Skip button */}
      {phase >= 4 && (
        <button
          onClick={finish}
          style={{
            position: "absolute", top: 24, right: 24,
            display: "flex", alignItems: "center", gap: 4,
            padding: "6px 14px",
            background: "rgba(201,168,76,0.07)",
            border: `1px solid rgba(201,168,76,0.25)`,
            borderRadius: 20, cursor: "pointer", color: "rgba(245,240,232,0.65)",
            fontSize: 13, letterSpacing: "0.3px",
            animation: "rkw-fade 0.4s ease both",
          }}
        >
          Skip <span style={{ color: GOLD, fontSize: 16, lineHeight: "18px" }}>›</span>
        </button>
      )}

      {/* Wordmark */}
      <div style={{
        opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "scale(1) translateY(0)" : "scale(0.88) translateY(6px)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)",
        marginBottom: 28,
        textAlign: "center",
      }}>
        <div style={{ color: GOLD, fontSize: 11, letterSpacing: "3px", textTransform: "uppercase", marginBottom: 6 }}>
          RKZ Smart Solutions
        </div>
        <img
          src={`${import.meta.env.BASE_URL}rkz-logo.jpg`}
          alt="Rkz"
          style={{ height: 46, width: "auto", objectFit: "contain", margin: "0 auto", display: "block" }}
        />
      </div>

      {/* Card */}
      <div style={{
        width: "min(340px, 90vw)",
        background: "rgba(255,255,255,0.035)",
        border: `1px solid ${GOLD}28`,
        borderRadius: 24,
        padding: "28px 24px",
        display: "flex", flexDirection: "column", alignItems: "center",
        boxShadow: `0 0 80px rgba(201,168,76,0.08)`,
        opacity: phase >= 2 ? 1 : 0,
        transform: phase >= 2 ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.6s ease, transform 0.6s cubic-bezier(0.16,1,0.3,1)",
      }}>
        {/* Header */}
        <div style={{ color: GOLD, fontSize: 11, fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", textAlign: "center", marginBottom: 10 }}>
          Eligibility Analysis Engine
        </div>
        <div style={{ width: 36, height: 1, background: GOLD, opacity: 0.5, marginBottom: 24 }} />

        {/* SVG Gauge */}
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
          <svg width={R * 2 + STROKE * 2} height={R * 2 + STROKE * 2}>
            {/* Track */}
            <circle
              cx={R + STROKE} cy={R + STROKE} r={R}
              stroke="rgba(255,255,255,0.07)" strokeWidth={STROKE} fill="none" strokeLinecap="round"
            />
            {/* Progress arc */}
            <circle
              cx={R + STROKE} cy={R + STROKE} r={R}
              stroke={GREEN} strokeWidth={STROKE} fill="none" strokeLinecap="round"
              strokeDasharray={CIRCUM}
              strokeDashoffset={phase >= 2 ? OFFSET_END : CIRCUM}
              transform={`rotate(-90 ${R + STROKE} ${R + STROKE})`}
              style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.16,1,0.3,1)" }}
            />
          </svg>

          {/* Score overlay */}
          <div style={{
            position: "absolute", display: "flex", flexDirection: "column", alignItems: "center",
            opacity: phase >= 3 ? 1 : 0,
            transform: phase >= 3 ? "scale(1)" : "scale(0.6)",
            transition: "opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          }}>
            <span style={{ color: TEXT_PRI, fontSize: 52, fontWeight: 700, lineHeight: "56px", letterSpacing: -1 }}>{TARGET}</span>
            <span style={{ color: TEXT_MUTED, fontSize: 13, marginTop: 2 }}>/ 100</span>
          </div>
        </div>

        {/* Chip */}
        {phase >= 4 && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: `${GREEN}18`, border: `1px solid ${GREEN}40`,
            borderRadius: 100, padding: "7px 14px",
            marginBottom: 12, animation: "rkw-slideup 0.35s ease both",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: 3, background: GREEN }} />
            <span style={{ color: GREEN, fontSize: 12, fontWeight: 600, letterSpacing: "0.5px" }}>Recommended: Mortgage</span>
          </div>
        )}

        {/* Reasoning */}
        <div style={{
          color: TEXT_MUTED, fontSize: 12, textAlign: "center", lineHeight: "18px",
          opacity: phase >= 5 ? 1 : 0,
          transition: "opacity 0.4s ease",
        }}>
          Strong repayment profile — 27% DTI ratio
        </div>
      </div>

      {/* CTA */}
      <div style={{
        marginTop: 28, display: "flex", flexDirection: "column", alignItems: "center", gap: 10,
        opacity: phase >= 6 ? 1 : 0,
        transform: phase >= 6 ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        <span style={{ color: TEXT_PRI, fontSize: 14, letterSpacing: "0.4px", textAlign: "center" }}>
          Download the Rkz app now
        </span>
        <div style={{ width: 32, height: 1.5, background: GOLD, borderRadius: 1 }} />
      </div>

      <style>{`
        @keyframes rkw-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rkw-slideup { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  );
}
