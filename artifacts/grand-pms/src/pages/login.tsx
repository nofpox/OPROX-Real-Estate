import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { LOCAL_USERS } from "@/lib/local-data";

interface LoginProps {
  onLogin: (user: unknown) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const settings = useSettings();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          {settings.logoUrl && (
            <div className="flex justify-center mb-3">
              <img src={settings.logoUrl} alt={settings.propertyName} className="h-12 w-auto object-contain max-w-36" onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
            </div>
          )}
          <CardTitle className="text-2xl font-serif">{settings.propertyName}</CardTitle>
          <CardDescription>ركز للحلول الذكية · Rakez Smart Solutions</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">{t("login.username") || "Username"}</Label>
              <Input id="username" value={username} onChange={e => setUsername(e.target.value)} placeholder="admin / manager / worker" autoComplete="username" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">{t("login.password") || "Password"}</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder={t("login.passwordPlaceholder") || "Password"} className="pe-10" autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword(v => !v)} className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground hover:text-foreground" tabIndex={-1}>
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
    </div>
  );
}
