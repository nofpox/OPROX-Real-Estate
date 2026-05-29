import { useState } from "react";
  import { useLocation } from "wouter";
  import { Button } from "@/components/ui/button";
  import { Input } from "@/components/ui/input";
  import { Card, CardContent } from "@/components/ui/card";
  import { Building2, Wifi, Wrench, Star } from "lucide-react";

  export default function Landing() {
    const [, navigate] = useLocation();
    const [unitNum, setUnitNum] = useState("");
    const [error, setError] = useState("");

    const handleAccess = () => {
      const trimmed = unitNum.trim();
      if (!trimmed || isNaN(Number(trimmed)) || Number(trimmed) <= 0) {
        setError("Please enter a valid unit number.");
        return;
      }
      setError("");
      navigate(`/unit/${trimmed}`);
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-amber-50/30 to-white flex flex-col">
        {/* Header */}
        <header className="px-6 pt-10 pb-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-500 rounded-2xl shadow-lg mb-4">
            <Building2 className="text-white" size={28} />
          </div>
          <h1 className="text-3xl font-serif font-bold text-slate-900">Grand PMS</h1>
          <p className="mt-1 text-slate-500 text-sm">Resident Services Portal</p>
        </header>

        {/* Main */}
        <main className="flex-1 px-6 flex flex-col items-center justify-center -mt-8">
          <Card className="w-full max-w-sm shadow-xl border-0 rounded-3xl overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-400 px-6 py-5">
              <h2 className="text-xl font-bold text-white">Access Your Unit</h2>
              <p className="text-amber-100 text-sm mt-0.5">Enter your unit number to get started</p>
            </div>
            <CardContent className="px-6 pt-6 pb-8 space-y-4">
              <div>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 101"
                  value={unitNum}
                  onChange={(e) => { setUnitNum(e.target.value); setError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleAccess()}
                  className="text-center text-2xl h-14 font-bold tracking-widest border-2 focus-visible:ring-amber-500"
                />
                {error && <p className="text-destructive text-sm mt-1.5 text-center">{error}</p>}
              </div>
              <Button onClick={handleAccess} className="w-full h-12 text-base font-bold bg-amber-500 hover:bg-amber-600 text-white rounded-xl">
                Access Portal
              </Button>
            </CardContent>
          </Card>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            {[
              { icon: Wrench, label: "Submit Requests", color: "bg-blue-50 text-blue-700" },
              { icon: Star, label: "Rate Your Stay", color: "bg-purple-50 text-purple-700" },
              { icon: Wifi, label: "Unit Details", color: "bg-green-50 text-green-700" },
            ].map(({ icon: Icon, label, color }) => (
              <span key={label} className={`${color} flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold`}>
                <Icon size={13} /> {label}
              </span>
            ))}
          </div>
        </main>

        <footer className="text-center py-6 text-xs text-slate-400">
          Powered by Grand PMS
        </footer>
      </div>
    );
  }
  