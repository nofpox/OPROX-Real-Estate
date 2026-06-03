import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Label }    from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, ArrowRight, KeyRound,
  Mail, RefreshCw, Clock, CheckCircle2,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

// ── Countdown hook ────────────────────────────────────────────────────────────
function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(initial);
    intervalRef.current = setInterval(() => {
      setSeconds(s => {
        if (s <= 1) { clearInterval(intervalRef.current!); intervalRef.current = null; return 0; }
        return s - 1;
      });
    }, 1000);
  }, [initial]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { seconds, start, fmt };
}

// ── 6-digit OTP input ─────────────────────────────────────────────────────────
// Individual digit boxes with auto-advance, backspace retreat, and paste support.
function OtpInput({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const refs   = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const digits = value.padEnd(6, " ").split("").slice(0, 6);

  function handleChange(idx: number, raw: string) {
    const d = raw.replace(/\D/g, "");
    if (!d && raw.length === 1) return;
    const next = digits
      .map((c, i) => (i === idx ? d.slice(-1) : c === " " ? "" : c))
      .join("")
      .replace(/ /g, "");
    onChange(next.slice(0, 6));
    if (d && idx < 5) refs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace") {
      const cur = digits[idx]?.trim();
      if (cur) {
        const next = digits.map((c, i) => (i === idx ? "" : c === " " ? "" : c)).join("");
        onChange(next.slice(0, 6));
      } else if (idx > 0) {
        refs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft"  && idx > 0) { refs.current[idx - 1]?.focus(); }
      else if (e.key === "ArrowRight" && idx < 5) { refs.current[idx + 1]?.focus(); }
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    setTimeout(() => refs.current[Math.min(pasted.length, 5)]?.focus(), 10);
  }

  return (
    <div className="flex gap-2 justify-center" dir="ltr">
      {Array.from({ length: 6 }).map((_, idx) => {
        const filled = !!digits[idx]?.trim();
        return (
          <input
            key={idx}
            ref={el => { refs.current[idx] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={2}
            value={digits[idx]?.trim() || ""}
            onChange={e => handleChange(idx, e.target.value)}
            onKeyDown={e => handleKeyDown(idx, e)}
            onPaste={handlePaste}
            onFocus={e => e.target.select()}
            disabled={disabled}
            className={[
              "w-11 h-14 text-center text-2xl font-bold border-2 rounded-xl",
              "bg-background text-foreground transition-colors",
              "focus:outline-none focus:ring-2 focus:ring-primary/30",
              filled ? "border-primary" : "border-border",
              disabled ? "opacity-50 cursor-not-allowed" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

// ── Forgot-password dialog ────────────────────────────────────────────────────
// Steps:
//   request  → Enter email → 6-digit OTP sent via email
//   verify   → Enter OTP + new password → reset

type FpStep = "request" | "verify";
const TIMER_SECONDS = 180;

function ForgotPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t }                             = useTranslation();
  const { toast }                         = useToast();
  const [step,        setStep]            = useState<FpStep>("request");
  const [email,       setEmail]           = useState("");
  const [otp,         setOtp]             = useState("");
  const [newPassword, setNewPassword]     = useState("");
  const [confirmPwd,  setConfirmPwd]      = useState("");
  const [showPwd,     setShowPwd]         = useState(false);
  const [loading,     setLoading]         = useState(false);
  const [demoOtp,     setDemoOtp]         = useState<string | null>(null);

  const { seconds, start: startTimer, fmt } = useCountdown(TIMER_SECONDS);
  const timerRunning = seconds > 0;

  function resetAll() {
    setStep("request");
    setEmail(""); setOtp(""); setNewPassword(""); setConfirmPwd("");
    setShowPwd(false); setDemoOtp(null);
  }

  function handleClose() { resetAll(); onClose(); }

  // ── Step 1: Request OTP ──────────────────────────────────────────────────
  async function handleRequestOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? t("login.forgotPwd.failed"), variant: "destructive" });
        return;
      }
      // Demo mode: OTP returned when RESEND_API_KEY is absent
      if (data.otp) { setDemoOtp(String(data.otp)); setOtp(String(data.otp)); }
      startTimer();
      setStep("verify");
    } catch {
      toast({ title: t("login.forgotPwd.networkError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ───────────────────────────────────────────────────────────
  async function handleResend() {
    if (timerRunning || loading) return;
    setDemoOtp(null); setOtp("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.otp) { setDemoOtp(String(data.otp)); setOtp(String(data.otp)); }
      startTimer();
    } catch {
      toast({ title: t("login.forgotPwd.networkError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Reset password ───────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (otp.length < 6) {
      toast({ title: t("login.forgotPwd.failed"), variant: "destructive" }); return;
    }
    if (newPassword !== confirmPwd) {
      toast({ title: t("login.forgotPwd.errMismatch"), variant: "destructive" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: t("login.forgotPwd.errShort"), variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ resetToken: otp, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? t("login.forgotPwd.resetFailed"), variant: "destructive" });
        return;
      }
      toast({ title: t("login.forgotPwd.successMsg") });
      handleClose();
    } catch {
      toast({ title: t("login.forgotPwd.networkError"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  const stepTitle = step === "request"
    ? t("login.forgotPwd.step1Title")
    : t("login.forgotPwd.step2Title");

  const stepDesc = step === "request"
    ? t("login.forgotPwd.step1Desc")
    : t("login.forgotPwd.step2Desc", { email });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {stepTitle}
          </DialogTitle>
          <DialogDescription>{stepDesc}</DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Email ───────────────────────────────────────────── */}
        {step === "request" && (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">{t("login.forgotPwd.emailLabel")}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="fp-email"
                  type="email"
                  className="ps-9"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder={t("login.forgotPwd.emailPlaceholder")}
                  autoComplete="email"
                  required
                  autoFocus
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? t("login.forgotPwd.sending") : t("login.forgotPwd.sendCode")}
              {!loading && <ArrowRight className="ms-2 h-4 w-4" />}
            </Button>
          </form>
        )}

        {/* ── Step 2: OTP + new password ──────────────────────────────── */}
        {step === "verify" && (
          <form onSubmit={handleReset} className="space-y-4">

            {/* Email-sent banner */}
            <div className="flex items-center gap-2 rounded-lg border bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 px-3 py-2 text-xs text-blue-700 dark:text-blue-300">
              <Mail className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{t("login.forgotPwd.sentBanner", { email })}</span>
            </div>

            {/* Demo OTP banner */}
            {demoOtp && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5 text-sm">
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t("login.forgotPwd.demoTitle")}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t("login.forgotPwd.demoNote")}</p>
                <p className="mt-2 font-mono text-3xl font-bold tracking-[0.4em] text-center text-amber-900 dark:text-amber-200 select-all" dir="ltr">
                  {demoOtp}
                </p>
              </div>
            )}

            {/* Countdown timer */}
            <div className={[
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
              timerRunning
                ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300"
                : "border-orange-200 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300",
            ].join(" ")}>
              <span className="flex items-center gap-1.5">
                {timerRunning
                  ? <><Clock className="h-3.5 w-3.5" /> {t("login.forgotPwd.timerRunning")}</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> {t("login.forgotPwd.timerExpired")}</>
                }
              </span>
              {timerRunning ? (
                <span className="font-mono font-semibold tabular-nums">{fmt(seconds)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-xs font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
                >
                  {t("login.forgotPwd.resendCode")}
                </button>
              )}
            </div>

            {/* 6-digit OTP boxes */}
            <div className="space-y-2">
              <Label className="block text-center">{t("login.forgotPwd.codeLabel")}</Label>
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-newpwd">{t("login.forgotPwd.newPwdLabel")}</Label>
              <div className="relative">
                <Input
                  id="fp-newpwd"
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder={t("login.forgotPwd.newPwdPlaceholder")}
                  className="pe-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">{t("login.forgotPwd.confirmLabel")}</Label>
              <Input
                id="fp-confirm"
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={e => setConfirmPwd(e.target.value)}
                placeholder={t("login.forgotPwd.confirmPlaceholder")}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("request"); setDemoOtp(null); setOtp(""); }}
                disabled={loading}
              >
                {t("login.forgotPwd.back")}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || otp.replace(/\D/g, "").length < 6}
              >
                {loading ? t("login.forgotPwd.resetting") : t("login.forgotPwd.resetBtn")}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Login page ────────────────────────────────────────────────────────────────

export default function Login({ onLogin }: LoginProps) {
  const { t }                           = useTranslation();
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [forgotOpen,   setForgotOpen]   = useState(false);
  const { toast }    = useToast();
  const settings     = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method:      "POST",
        headers:     { "Content-Type": "application/json" },
        credentials: "include",
        body:        JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: data.error ?? t("login.invalidCreds"),
          description: data.attemptsLeft != null
            ? `${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining`
            : undefined,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: t("login.loginFailed"), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center pb-2">
            {settings.logoUrl && (
              <div className="flex justify-center mb-3">
                <img
                  src={settings.logoUrl}
                  alt={settings.propertyName}
                  className="h-12 w-auto object-contain max-w-36"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            <CardTitle className="text-2xl font-serif">{settings.propertyName}</CardTitle>
            <CardDescription>ركز للحلول الذكية · Rakez Smart Solutions</CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">{t("login.username")}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder={t("login.usernamePlaceholder")}
                  autoComplete="username"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t("login.password")}</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    {t("login.forgotLink")}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    className="pe-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(v => !v)}
                    className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("login.signingIn") : t("login.signIn")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  );
}
