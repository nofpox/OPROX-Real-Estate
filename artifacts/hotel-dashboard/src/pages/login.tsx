import React, { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Eye, EyeOff, Building2, ArrowRight, KeyRound,
  Smartphone, Mail, RefreshCw, Clock, CheckCircle2,
} from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

// ── Countdown hook ────────────────────────────────────────────────────────────
// Returns remaining seconds and a restart function.  Counts from `initial` to 0.
function useCountdown(initial: number) {
  const [seconds, setSeconds] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSeconds(initial);
    intervalRef.current = setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          intervalRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [initial]);

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return { seconds, start, fmt };
}

// ── Forgot-password dialog ────────────────────────────────────────────────────
// Steps:
//   identify      → Company Code + Email + Phone (verify identity, no token yet)
//   choose         → Pick SMS or Email delivery method
//   verify         → Enter 6-char code + 180 s timer + new password

const TIMER_SECONDS = 180;

type FpStep = "identify" | "choose" | "verify";

function ForgotPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast }                     = useToast();
  const [step, setStep]               = useState<FpStep>("identify");

  // identity fields (step 1)
  const [tenantSlug,   setTenantSlug]   = useState("");
  const [email,        setEmail]        = useState("");
  const [phoneNumber,  setPhoneNumber]  = useState("");

  // returned from server after identity check
  const [maskedEmail,  setMaskedEmail]  = useState("");
  const [maskedPhone,  setMaskedPhone]  = useState("");

  // reset fields (step 3)
  const [demoToken,    setDemoToken]    = useState<string | null>(null);
  const [resetToken,   setResetToken]   = useState("");
  const [newPassword,  setNewPassword]  = useState("");
  const [confirmPwd,   setConfirmPwd]   = useState("");
  const [showPwd,      setShowPwd]      = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"sms" | "email" | null>(null);

  const { seconds, start: startTimer, fmt } = useCountdown(TIMER_SECONDS);
  const timerRunning = seconds > 0;

  // ── Reset all state ────────────────────────────────────────────────────────
  function resetAll() {
    setStep("identify");
    setTenantSlug(""); setEmail(""); setPhoneNumber("");
    setMaskedEmail(""); setMaskedPhone("");
    setDemoToken(null); setResetToken(""); setNewPassword(""); setConfirmPwd("");
    setShowPwd(false); setDeliveryMethod(null);
  }

  function handleClose() { resetAll(); onClose(); }

  // ── Step 1: verify identity (Mode A — no deliveryMethod) ──────────────────
  async function handleIdentify(e: React.FormEvent) {
    e.preventDefault();
    if (!tenantSlug || !email || !phoneNumber) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, email, phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Request failed", variant: "destructive" });
        return;
      }
      // Always show the choose screen — even if userFound=false we silently proceed
      // (prevents user enumeration on the UI side too)
      setMaskedEmail(data.maskedEmail ?? email.replace(/(.{1}).+(@.+)/, "$1****$2"));
      setMaskedPhone(data.maskedPhone ?? phoneNumber.replace(/.(?=.{4})/g, "*"));
      setStep("choose");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2 → 3: choose delivery + send code (Mode B) ─────────────────────
  async function handleSendCode(method: "sms" | "email") {
    setDeliveryMethod(method);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantSlug, email, phoneNumber, deliveryMethod: method }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Failed to send code", variant: "destructive" });
        return;
      }
      // demo mode: token returned in response
      if (data.resetToken) {
        setDemoToken(data.resetToken);
        setResetToken(data.resetToken);
      }
      startTimer();
      setStep("verify");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Resend: re-send with the same delivery method ──────────────────────────
  async function handleResend() {
    if (!deliveryMethod || timerRunning) return;
    setDemoToken(null);
    setResetToken("");
    await handleSendCode(deliveryMethod);
  }

  // ── Step 3: reset password ─────────────────────────────────────────────────
  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPwd) {
      toast({ title: "Passwords do not match", variant: "destructive" }); return;
    }
    if (newPassword.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" }); return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resetToken, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data.error ?? "Reset failed", variant: "destructive" }); return;
      }
      toast({ title: "Password reset successfully. Please sign in." });
      handleClose();
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  // ── Dialog title / description ─────────────────────────────────────────────
  const titles: Record<FpStep, string> = {
    identify: "Forgot Password",
    choose:   "How would you like to receive your code?",
    verify:   "Enter Verification Code",
  };
  const descs: Record<FpStep, string> = {
    identify: "Enter your Company Code, email and phone number to verify your identity.",
    choose:   "We'll send a 6-character verification code to your chosen contact method.",
    verify:   "Enter the code we sent you, then choose a new password.",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {titles[step]}
          </DialogTitle>
          <DialogDescription>{descs[step]}</DialogDescription>
        </DialogHeader>

        {/* ── Step 1: Identify ─────────────────────────────────────────── */}
        {step === "identify" && (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-tenant">Company Code</Label>
              <Input
                id="fp-tenant"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="rakz"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fp-phone">Phone Number</Label>
              <Input
                id="fp-phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1-555-000-0001"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Verifying…" : "Continue"}
              {!loading && <ArrowRight className="ms-2 h-4 w-4" />}
            </Button>
          </form>
        )}

        {/* ── Step 2: Choose delivery ───────────────────────────────────── */}
        {step === "choose" && (
          <div className="space-y-4">
            {/* SMS option */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSendCode("sms")}
              className="w-full flex items-start gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-60"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Smartphone className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-sm">SMS to my mobile number</p>
                <p className="text-xs text-muted-foreground mt-0.5">{maskedPhone}</p>
              </div>
              <ArrowRight className="ms-auto mt-2 h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            {/* Email option */}
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSendCode("email")}
              className="w-full flex items-start gap-4 rounded-xl border-2 border-border bg-card p-4 text-left transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-60"
            >
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Mail className="h-4 w-4" />
              </span>
              <div>
                <p className="font-medium text-sm">Email to my registered address</p>
                <p className="text-xs text-muted-foreground mt-0.5">{maskedEmail}</p>
              </div>
              <ArrowRight className="ms-auto mt-2 h-4 w-4 text-muted-foreground shrink-0" />
            </button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setStep("identify")}
              disabled={loading}
            >
              ← Back
            </Button>
          </div>
        )}

        {/* ── Step 3: Verify code + new password ───────────────────────── */}
        {step === "verify" && (
          <form onSubmit={handleReset} className="space-y-4">

            {/* Delivery banner */}
            <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              {deliveryMethod === "sms"
                ? <><Smartphone className="h-3.5 w-3.5 shrink-0 text-primary" /> Code sent via SMS to {maskedPhone}</>
                : <><Mail className="h-3.5 w-3.5 shrink-0 text-primary" /> Code sent via Email to {maskedEmail}</>
              }
            </div>

            {/* Demo mode token banner */}
            {demoToken && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Demo mode — your code
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  In production this is delivered via {deliveryMethod === "sms" ? "SMS" : "email"}.
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-center text-amber-900 dark:text-amber-200 select-all">
                  {demoToken}
                </p>
              </div>
            )}

            {/* 180 s countdown timer */}
            <div className={[
              "flex items-center justify-between rounded-lg border px-3 py-2 text-sm",
              timerRunning
                ? "border-blue-200 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                : "border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800 text-green-700 dark:text-green-300",
            ].join(" ")}>
              <span className="flex items-center gap-1.5">
                {timerRunning
                  ? <><Clock className="h-3.5 w-3.5" /> Code expires in</>
                  : <><CheckCircle2 className="h-3.5 w-3.5" /> Code expired</>
                }
              </span>
              {timerRunning ? (
                <span className="font-mono font-semibold tabular-nums">{fmt(seconds)}</span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="flex items-center gap-1 text-xs font-semibold underline underline-offset-2 hover:no-underline disabled:opacity-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  Resend code
                </button>
              )}
            </div>

            {/* 6-char code input */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-token">Verification Code</Label>
              <Input
                id="fp-token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                maxLength={6}
                required
                className="font-mono tracking-[0.3em] text-center text-lg"
              />
            </div>

            {/* New password */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-newpwd">New Password</Label>
              <div className="relative">
                <Input
                  id="fp-newpwd"
                  type={showPwd ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="space-y-1.5">
              <Label htmlFor="fp-confirm">Confirm Password</Label>
              <Input
                id="fp-confirm"
                type={showPwd ? "text" : "password"}
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                placeholder="Repeat password"
                required
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("choose"); setDemoToken(null); setResetToken(""); }}
                disabled={loading}
              >
                ← Back
              </Button>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? "Resetting…" : "Reset Password"}
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
  const [tenantSlug,   setTenantSlug]   = useState("");
  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [forgotOpen,   setForgotOpen]   = useState(false);
  const { toast } = useToast();
  const settings = useSettings();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ username, password, tenantSlug: tenantSlug.trim() || undefined }),
      });
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: data.error ?? "Invalid credentials",
          description:
            data.attemptsLeft != null
              ? `${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining`
              : undefined,
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Login failed", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm shadow-lg">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-serif">{settings.propertyName}</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* Step 1: Company Code */}
              <div className="space-y-1.5">
                <Label htmlFor="tenantSlug" className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  Company Code
                </Label>
                <Input
                  id="tenantSlug"
                  value={tenantSlug}
                  onChange={(e) => setTenantSlug(e.target.value)}
                  placeholder="rakz"
                  autoComplete="organization"
                />
                <p className="text-xs text-muted-foreground">
                  Your organisation's unique identifier
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Your credentials</span>
                </div>
              </div>

              {/* Step 2: Username */}
              <div className="space-y-1.5">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                />
              </div>

              {/* Step 3: Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button
                    type="button"
                    onClick={() => setForgotOpen(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-10"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </>
  );
}
