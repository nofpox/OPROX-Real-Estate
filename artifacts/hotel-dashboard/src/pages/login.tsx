import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Building2, ArrowRight, KeyRound, RefreshCw } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

// ── Forgot-password dialog (2 steps) ─────────────────────────────────────────

function ForgotPasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [step, setStep]               = useState<"identify" | "reset">("identify");
  const [tenantSlug, setTenantSlug]   = useState("");
  const [email, setEmail]             = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [resetToken, setResetToken]   = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPwd, setConfirmPwd]   = useState("");
  const [showPwd, setShowPwd]         = useState(false);
  const [demoToken, setDemoToken]     = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);

  function handleClose() {
    setStep("identify");
    setTenantSlug(""); setEmail(""); setPhoneNumber("");
    setResetToken(""); setNewPassword(""); setConfirmPwd("");
    setDemoToken(null);
    onClose();
  }

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
      // data.resetToken is returned in demo mode (production would send via email/SMS)
      setDemoToken(data.resetToken ?? null);
      if (data.resetToken) setResetToken(data.resetToken);
      setStep("reset");
    } catch {
      toast({ title: "Network error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary" />
            {step === "identify" ? "Forgot Password" : "Set New Password"}
          </DialogTitle>
          <DialogDescription>
            {step === "identify"
              ? "Enter your Company Code, email and phone number to verify your identity."
              : "Enter the reset code sent to your email/phone, then choose a new password."}
          </DialogDescription>
        </DialogHeader>

        {step === "identify" ? (
          <form onSubmit={handleIdentify} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-tenant">Company Code</Label>
              <Input
                id="fp-tenant"
                value={tenantSlug}
                onChange={(e) => setTenantSlug(e.target.value)}
                placeholder="grand-pms"
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
              {loading ? "Verifying…" : "Send Reset Code"}
              {!loading && <ArrowRight className="ms-2 h-4 w-4" />}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            {demoToken && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3 text-sm">
                <p className="font-medium text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Demo mode — reset code
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  In production this is delivered via email/SMS.
                </p>
                <p className="mt-2 font-mono text-2xl font-bold tracking-widest text-center text-amber-900 dark:text-amber-200">
                  {demoToken}
                </p>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="fp-token">Reset Code</Label>
              <Input
                id="fp-token"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value.toUpperCase())}
                placeholder="A1B2C3"
                maxLength={6}
                required
                className="font-mono tracking-widest text-center text-lg"
              />
            </div>
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
              <Button type="button" variant="outline" className="flex-1" onClick={() => setStep("identify")}>
                Back
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
          description: data.attemptsLeft != null ? `${data.attemptsLeft} attempt${data.attemptsLeft === 1 ? "" : "s"} remaining` : undefined,
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
                  placeholder="grand-pms"
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
