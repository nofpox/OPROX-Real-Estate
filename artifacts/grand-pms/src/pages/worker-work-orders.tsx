import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wrench, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import WorkerBottomNav from "@/components/worker-bottom-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useToast } from "@/hooks/use-toast";
import { useListWorkOrders, useUpdateWorkOrder, getListWorkOrdersQueryKey } from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";

const PRIORITY_BADGE: Record<string,string> = { urgent:"bg-red-500/20 text-red-400 border-red-500/30", high:"bg-orange-500/20 text-orange-400 border-orange-500/30", medium:"bg-amber-500/20 text-amber-400 border-amber-500/30", low:"bg-slate-500/20 text-slate-400 border-slate-500/30" };
const STATUS_COLORS: Record<string,string> = { pending:"bg-slate-500/20 text-slate-300 border-slate-500/30", "in-progress":"bg-amber-500/20 text-amber-300 border-amber-500/30", completed:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30", "on-hold":"bg-blue-500/20 text-blue-300 border-blue-500/30" };

export default function WorkerWorkOrders() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [tab, setTab] = useState<"pending"|"in-progress"|"completed"|"all">("pending");
  const [updatingId, setUpdatingId] = useState<number|null>(null);

  const { data: workOrders, isLoading } = useListWorkOrders();
  const updateWorkOrder = useUpdateWorkOrder();

  const filtered = (workOrders??[]).filter(wo => tab==="all" ? true : wo.status===tab);

  async function handleUpdate(id: number, status: string) {
    setUpdatingId(id);
    await updateWorkOrder.mutateAsync({ id, data: { status } });
    qc.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() });
    toast({ title: "Work order updated" });
    setUpdatingId(null);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="flex-1 overflow-auto pb-20">
        <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <h1 className="font-semibold">{t("nav.maintenance","Work Orders")}</h1>
          <div className="flex items-center gap-2"><LanguageSwitcher/><Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={()=>qc.invalidateQueries({ queryKey: getListWorkOrdersQueryKey() })}><RefreshCw className="h-4 w-4"/></Button></div>
        </div>
        <div className="flex border-b border-white/10 overflow-x-auto">
          {(["pending","in-progress","completed","all"] as const).map(s=>(
            <button key={s} onClick={()=>setTab(s)} className={`flex-1 py-2.5 text-xs font-medium capitalize transition-colors whitespace-nowrap px-3 ${tab===s?"border-b-2 border-amber-400 text-white":"text-white/50 hover:text-white/70"}`}>{s.replace("-"," ")}</button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {isLoading ? Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-24 rounded-xl bg-white/10"/>) :
           filtered.length===0 ? <div className="text-center py-12 text-white/40"><Wrench className="mx-auto h-10 w-10 mb-2"/>No work orders</div> :
           filtered.map(wo=>(
            <div key={wo.id} className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <p className="font-medium text-sm">{wo.title}</p>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${PRIORITY_BADGE[wo.priority]??PRIORITY_BADGE.medium}`}>{wo.priority}</span>
              </div>
              {wo.description && <p className="text-xs text-white/50">{wo.description}</p>}
              <div className="flex flex-wrap gap-2 text-xs text-white/50">
                {wo.propertyName && <span>{wo.propertyName}</span>}
                {wo.unitName && <span>· {wo.unitName}</span>}
                {wo.dueDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3"/>Due {wo.dueDate}</span>}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_COLORS[wo.status]??STATUS_COLORS.pending}`}>{wo.status.replace("-"," ")}</span>
                {wo.status==="pending" && <Button size="sm" variant="outline" className="border-white/20 text-white hover:bg-white/10 h-7 text-xs" disabled={updatingId===wo.id} onClick={()=>handleUpdate(wo.id,"in-progress")}>Start</Button>}
                {wo.status==="in-progress" && <Button size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white h-7 text-xs" disabled={updatingId===wo.id} onClick={()=>handleUpdate(wo.id,"completed")}>Complete</Button>}
              </div>
            </div>
          ))}
        </div>
      </div>
      <WorkerBottomNav active="work-orders" />
    </div>
  );
}
