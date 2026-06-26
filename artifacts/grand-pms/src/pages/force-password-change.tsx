import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, Eye, EyeOff } from "lucide-react";

interface Props { username: string; onSuccess: () => void; }

export default function ForcePasswordChange({ username, onSuccess }: Props) {
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showNext, setShowNext] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const rules = { length: next.length >= 8, upper: /[A-Z]/.test(next), number: /[0-9]/.test(next), match: next === confirm && next.length > 0 };
  const valid = Object.values(rules).every(Boolean);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 300));
    toast({ title: "Password updated. Welcome to Esteti In." });
    onSuccess();
    setLoading(false);
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
          <CardTitle>Set New Password</CardTitle>
          <CardDescription>Hello {username}, please set a new password to continue.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showNext ? "text" : "password"} value={next} onChange={e => setNext(e.target.value)} className="pe-10" required />
                <button type="button" onClick={() => setShowNext(v => !v)} className="absolute inset-y-0 end-0 flex items-center px-3 text-muted-foreground" tabIndex={-1}>
                  {showNext ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Confirm New Password</Label>
              <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
            </div>
            <div className="text-xs space-y-1 text-muted-foreground">
              {Object.entries({ "At least 8 characters": rules.length, "One uppercase letter": rules.upper, "One number": rules.number, "Passwords match": rules.match }).map(([label, ok]) => (
                <p key={label} className={ok ? "text-green-600" : ""}>{ok ? "✓" : "○"} {label}</p>
              ))}
            </div>
            <Button type="submit" className="w-full" disabled={!valid || loading}>
              {loading ? "Updating…" : "Set Password & Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
