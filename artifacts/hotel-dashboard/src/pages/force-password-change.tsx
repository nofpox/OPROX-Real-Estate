import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

interface Props {
  username: string;
  onSuccess: () => void;
}

export default function ForcePasswordChange({ username, onSuccess }: Props) {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [showNext, setShowNext] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const { toast } = useToast();

  const rules = {
    length:  next.length >= 8,
    upper:   /[A-Z]/.test(next),
    number:  /[0-9]/.test(next),
    match:   next === confirm && next.length > 0,
  };
  const valid = Object.values(rules).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      if (res.ok) {
        toast({ title: "Password updated. Welcome to ركز للحلول الذكية." });
        onSuccess();
      } else {
        const body = await res.json().catch(() => ({}));
        toast({ title: body.error ?? "Failed to update password", variant: "destructive" });
      }
    } catch {
      toast({ title: "Network error — please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-xl">Set Your Password</CardTitle>
          <CardDescription>
            For security, you must set a new password before continuing as <strong>{username}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div className="space-y-1.5">
              <Label htmlFor="current">Current Password</Label>
              <Input
                id="current"
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                placeholder="Your current password"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="next">New Password</Label>
              <div className="relative">
                <Input
                  id="next"
                  type={showNext ? "text" : "password"}
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowNext((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showNext ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirm">Confirm New Password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat new password"
                required
              />
            </div>

            {/* Live requirements */}
            {next.length > 0 && (
              <ul className="text-xs space-y-1 rounded-md border bg-muted/40 px-3 py-2">
                {[
                  { ok: rules.length, text: "At least 8 characters" },
                  { ok: rules.upper,  text: "One uppercase letter" },
                  { ok: rules.number, text: "One number" },
                  { ok: rules.match,  text: "Passwords match" },
                ].map(({ ok, text }) => (
                  <li key={text} className={`flex items-center gap-1.5 ${ok ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-muted-foreground/40"}`} />
                    {text}
                  </li>
                ))}
              </ul>
            )}

            <Button type="submit" className="w-full" disabled={loading || !valid}>
              {loading ? "Updating…" : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
