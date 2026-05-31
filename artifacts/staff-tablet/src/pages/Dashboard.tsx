import { useState } from "react";
  import { useLocation } from "wouter";
  import { useQuery } from "@tanstack/react-query";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import { Building2, LogOut, Layers, Users, Wrench, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
  import BottomNav from "@/components/BottomNav";

  type Room = { id: number; name: string; type: string; status: string; capacity: number };
  type Property = { id: number; name: string; type: string };
  type Request = { id: number; roomId: number; status: string };

  const STATUS_BG: Record<string, string> = {
    available: "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30",
    occupied: "bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30",
    maintenance: "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30",
    cleaning: "bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30",
  };

  const STATUS_DOT: Record<string, string> = {
    available: "bg-emerald-400",
    occupied: "bg-blue-400",
    maintenance: "bg-amber-400",
    cleaning: "bg-purple-400",
  };

  const STATUS_LABEL: Record<string, string> = {
    available: "Available",
    occupied: "Occupied",
    maintenance: "Maintenance",
    cleaning: "Cleaning",
  };

  export default function Dashboard() {
    const [, navigate] = useLocation();
    const [propertyFilter, setPropertyFilter] = useState<number | null>(null);

    const session = JSON.parse(localStorage.getItem("rakz_session") || "{}");

    const { data: rooms, isLoading: roomsLoading, refetch } = useQuery<Room[]>({
      queryKey: ["rooms"],
      queryFn: () => fetch("/api/rooms").then(r => r.json()),
    });

    const { data: properties } = useQuery<Property[]>({
      queryKey: ["properties"],
      queryFn: () => fetch("/api/properties").then(r => r.json()),
    });

    const { data: requests } = useQuery<Request[]>({
      queryKey: ["guest-requests"],
      queryFn: () => fetch("/api/guest/requests", { credentials: "include" }).then(r => r.ok ? r.json() : []),
    });

    const handleLogout = async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
      localStorage.removeItem("rakz_session");
      navigate("/login");
    };

    const filtered = rooms?.filter(r => propertyFilter === null ? true : true); // TODO: match by property
    const pendingByRoom = (roomId: number) => requests?.filter(r => r.roomId === roomId && r.status === "new").length || 0;

    const statusCounts = {
      available: rooms?.filter(r => r.status === "available").length || 0,
      occupied: rooms?.filter(r => r.status === "occupied").length || 0,
      maintenance: rooms?.filter(r => r.status === "maintenance").length || 0,
    };

    return (
      <div className="min-h-screen bg-background pb-20">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center">
              <Building2 size={18} className="text-black" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-foreground leading-tight">Rakz</h1>
              <p className="text-xs text-muted-foreground">Staff Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground hidden sm:block">{session.displayName || session.username}</span>
            <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-8 w-8 p-0">
              <RefreshCw size={15} />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleLogout} className="h-8 text-muted-foreground hover:text-destructive gap-1.5">
              <LogOut size={15} /> <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </header>

        <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
          {/* Stats row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Total Units", value: rooms?.length || 0, icon: Layers, color: "text-slate-400" },
              { label: "Available", value: statusCounts.available, icon: CheckCircle2, color: "text-emerald-400" },
              { label: "Occupied", value: statusCounts.occupied, icon: Users, color: "text-blue-400" },
              { label: "Maintenance", value: statusCounts.maintenance, icon: Wrench, color: "text-amber-400" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-card rounded-xl p-3 border border-border/50 text-center">
                <Icon size={18} className={`${color} mx-auto mb-1`} />
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Property filter */}
          {properties && properties.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button
                onClick={() => setPropertyFilter(null)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${propertyFilter === null ? "bg-amber-500 text-black" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
              >
                All Properties
              </button>
              {properties.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPropertyFilter(p.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${propertyFilter === p.id ? "bg-amber-500 text-black" : "bg-card border border-border text-muted-foreground hover:text-foreground"}`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-3">
            {Object.entries(STATUS_DOT).map(([status, dot]) => (
              <span key={status} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={`w-2.5 h-2.5 rounded-full ${dot}`} />
                {STATUS_LABEL[status]}
              </span>
            ))}
          </div>

          {/* Unit grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {roomsLoading
              ? Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
              : filtered?.map(room => {
                const pending = pendingByRoom(room.id);
                return (
                  <button
                    key={room.id}
                    onClick={() => navigate(`/unit/${room.id}`)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-all cursor-pointer ${STATUS_BG[room.status] || "bg-card border-border hover:bg-muted"}`}
                  >
                    {pending > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full px-1">
                        {pending}
                      </span>
                    )}
                    <div className={`w-2.5 h-2.5 rounded-full mb-3 ${STATUS_DOT[room.status] || "bg-slate-400"}`} />
                    <p className="font-bold text-foreground text-sm leading-tight">{room.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{room.type}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">{room.status}</p>
                  </button>
                );
              })}
          </div>
        </div>
        <BottomNav active="rooms" />
      </div>
    );
  }
  