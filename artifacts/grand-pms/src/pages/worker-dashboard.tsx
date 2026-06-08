import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LogOut, Layers, Wrench, CheckCircle2, RefreshCw } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import WorkerBottomNav from "@/components/worker-bottom-nav";
import { useListRooms, useListProperties } from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_BG: Record<string, string> = {
  available:   "bg-emerald-500/20 border-emerald-500/40 hover:bg-emerald-500/30",
  occupied:    "bg-blue-500/20 border-blue-500/40 hover:bg-blue-500/30",
  maintenance: "bg-amber-500/20 border-amber-500/40 hover:bg-amber-500/30",
  cleaning:    "bg-purple-500/20 border-purple-500/40 hover:bg-purple-500/30",
};
const STATUS_DOT: Record<string, string> = {
  available:"bg-emerald-400", occupied:"bg-blue-400", maintenance:"bg-amber-400", cleaning:"bg-purple-400",
};

export default function WorkerDashboard({ onLogout }: { onLogout: () => void }) {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [propertyFilter, setPropertyFilter] = useState<number | null>(null);
  const { data: rooms, isLoading: roomsLoading } = useListRooms();
  const { data: properties } = useListProperties();

  const filtered = rooms?.filter(r => propertyFilter === null || r.propertyId === propertyFilter) ?? [];
  const statusCounts = { available: rooms?.filter(r=>r.status==="available").length||0, occupied: rooms?.filter(r=>r.status==="occupied").length||0, maintenance: rooms?.filter(r=>r.status==="maintenance").length||0, cleaning: rooms?.filter(r=>r.status==="cleaning").length||0 };

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 overflow-auto pb-20">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={`${import.meta.env.BASE_URL}rkz-logo.jpg`} alt="Rozoz" className="h-7 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button size="sm" variant="ghost" onClick={() => qc.invalidateQueries()} className="h-8 w-8 p-0"><RefreshCw className="h-4 w-4"/></Button>
            <Button size="sm" variant="ghost" onClick={onLogout} className="h-8 w-8 p-0"><LogOut className="h-4 w-4"/></Button>
          </div>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {([["available","Available",statusCounts.available,"text-emerald-400"],["occupied","Occupied",statusCounts.occupied,"text-blue-400"],["maintenance","Maintenance",statusCounts.maintenance,"text-amber-400"],["cleaning","Cleaning",statusCounts.cleaning,"text-purple-400"]] as any[]).map(([k,l,v,c])=>(
              <button key={k} onClick={()=>setPropertyFilter(null)} className={`rounded-xl border p-3 text-start ${STATUS_BG[k]} transition-colors`}>
                <div className={`text-2xl font-bold ${c}`}>{v}</div>
                <div className="text-xs text-white/70 mt-0.5">{l}</div>
              </button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={()=>setPropertyFilter(null)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${propertyFilter===null?"bg-white/20 border-white/40":"border-white/20 hover:bg-white/10"}`}>All</button>
            {(properties??[]).map(p=>(
              <button key={p.id} onClick={()=>setPropertyFilter(p.id)} className={`text-xs px-3 py-1 rounded-full border transition-colors ${propertyFilter===p.id?"bg-white/20 border-white/40":"border-white/20 hover:bg-white/10"}`}>{p.name}</button>
            ))}
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2"><Layers className="h-4 w-4"/>Unit Overview</h2>
            {roomsLoading ? <div className="grid grid-cols-3 gap-2">{Array.from({length:6}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl bg-white/10"/>)}</div> : (
              <div className="grid grid-cols-3 gap-2">
                {filtered.map(room=>(
                  <button key={room.id} onClick={()=>navigate(`/worker/unit/${room.id}`)} className={`rounded-xl border p-2 text-start transition-colors ${STATUS_BG[room.status]??'border-white/20'}`}>
                    <div className="flex items-center gap-1.5 mb-1"><div className={`h-2 w-2 rounded-full ${STATUS_DOT[room.status]??'bg-slate-400'}`}/></div>
                    <div className="text-xs font-medium truncate">{room.name}</div>
                    <div className="text-[10px] text-white/50 capitalize">{room.status}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      <WorkerBottomNav active="units" />
    </div>
  );
}
