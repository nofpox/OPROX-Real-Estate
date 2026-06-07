import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Compass } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { LOCAL_USERS } from "@/lib/local-data";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

// Golden falcon SVG brand mark — inline, no file dependency
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
  const { t } = useTranslation();
  const { toast } = useToast();
  const settings = useSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    const entry = LOCAL_USERS[username.trim().toLowerCase()];
    if (entry && entry.password === password) {
      onLogin({ ...entry.user, permissions: [] });
    } else {
      toast({ title: t("login.invalidCreds") || "Invalid username or password", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleGuestExplore = async () => {
    setGuestLoading(true);
    await new Promise(r => setTimeout(r, 400));
    // Log in as a read-only guest — uses 'manager' role so all pages are visible
    onLogin({
      username: "guest",
      role: "manager",
      displayName: "Guest",
      name: "Guest",
      isGuest: true,
      permissions: [],
    });
    setGuestLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 gap-4">

      {/* ── Official Brand Mark ─────────────────────────────────────────────── */}
      <div className="flex flex-col items-center gap-2 mb-2">
        <FalconMark size={72} />
        <div className="text-center">
          <p className="font-serif text-2xl font-bold text-foreground tracking-widest">
            ركز | RKZ
          </p>
          <p className="text-xs text-muted-foreground tracking-widest uppercase mt-0.5">
            Smart Solutions
          </p>
        </div>
      </div>

      {/* ── Admin Login Card ────────────────────────────────────────────────── */}
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          {settings.logoUrl && (
            <div className="flex justify-center mb-3">
              <img
                src={settings.logoUrl}
                alt={settings.propertyName}
                className="h-10 w-auto object-contain max-w-32"
                onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            </div>
          )}
          <CardTitle className="text-xl font-serif">{settings.propertyName}</CardTitle>
          <CardDescription>ركز للحلول الذكية · RKZ Smart Solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("login.username") || "Username"}</Label>
              <Input
                id="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin / manager / worker"
                autoComplete="username"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password") || "Password"}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder={t("login.passwordPlaceholder") || "Password"}
                  className="pe-10"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (t("login.signingIn") || "Signing in…") : (t("login.signIn") || "Sign In")}
            </Button>
          </form>

          <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground/70">Demo credentials:</p>
            <p>admin / admin123 — Manager access</p>
            <p>manager / manager123 — Supervisor access</p>
            <p>worker / worker123 — Worker access</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Divider ─────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-sm flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="text-muted-foreground/50 text-xs uppercase tracking-widest">or</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* ── Guest Explore Button ─────────────────────────────────────────────── */}
      <div className="w-full max-w-sm space-y-1.5">
        <button
          onClick={handleGuestExplore}
          disabled={guestLoading}
          className="
            group w-full h-14 rounded-2xl
            border-2 border-amber-400/50 hover:border-amber-400
            bg-amber-50/60 hover:bg-amber-50
            flex items-center justify-center gap-3
            transition-all duration-300
            hover:shadow-[0_0_20px_rgba(201,168,76,0.2)]
            active:scale-[0.98] disabled:opacity-60
          "
        >
          {guestLoading ? (
            <div className="h-5 w-5 border-2 border-amber-600/30 border-t-amber-600 rounded-full animate-spin" />
          ) : (
            <Compass className="h-5 w-5 text-amber-700 shrink-0 group-hover:rotate-12 transition-transform duration-300" />
          )}
          <span className="text-amber-800 font-semibold text-sm text-center leading-snug">
            استكشف تجربة Rkz&nbsp;&nbsp;|&nbsp;&nbsp;Explore Rkz Experience
          </span>
        </button>
        <p className="text-muted-foreground/50 text-[10px] text-center tracking-wide">
          Guest access · View only · No credentials needed
        </p>
      </div>
    </div>
  );
}
