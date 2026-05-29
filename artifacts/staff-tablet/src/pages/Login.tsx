import { useState } from "react";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Card, CardContent, CardHeader } from "@/components/ui/card";
  import { Building2, Eye, EyeOff, AlertCircle } from "lucide-react";

  export default function Login() {
    const [, navigate] = useLocation();
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleLogin = async () => {
      if (!username || !password) { setError("Please enter username and password."); return; }
      setLoading(true); setError("");
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login failed");
        localStorage.setItem("grand_pms_session", JSON.stringify(data));
        navigate("/");
      } catch(e: any) {
        setError(e.message || "Invalid credentials. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-background">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-lg mb-4">
              <Building2 className="text-black" size={28} />
            </div>
            <h1 className="text-3xl font-serif font-bold text-foreground">Grand PMS</h1>
            <p className="text-muted-foreground text-sm mt-1">Staff Dashboard</p>
          </div>

          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <h2 className="text-lg font-semibold text-foreground">Sign In</h2>
              <p className="text-sm text-muted-foreground">Use your staff credentials</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle size={15} /> {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} autoFocus />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPass ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleLogin()} className="pr-10" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <Button onClick={handleLogin} disabled={loading} className="w-full h-11 font-semibold bg-amber-500 hover:bg-amber-600 text-black">
                {loading ? "Signing in…" : "Sign In"}
              </Button>
              <p className="text-center text-xs text-muted-foreground pt-1">Default: admin / Admin@1234</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
  