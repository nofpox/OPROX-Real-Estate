import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { getQueue } from "@/lib/offline-queue";

export function OfflineBanner() {
  const { isOnline }    = useOnlineStatus();
  const [wasSyncing,  setWasSyncing]  = useState(false);
  const [showSynced,  setShowSynced]  = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    setPendingCount(getQueue().length);
  }, [isOnline]);

  useEffect(() => {
    if (isOnline && pendingCount > 0) setWasSyncing(true);
    if (isOnline && wasSyncing) {
      const t = setTimeout(() => {
        setShowSynced(true);
        setWasSyncing(false);
        setPendingCount(getQueue().length);
        setTimeout(() => setShowSynced(false), 3000);
      }, 1200);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [isOnline, wasSyncing, pendingCount]);

  if (isOnline && !showSynced) return null;

  if (showSynced) {
    return (
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-white text-sm shadow-lg">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>Back online — changes saved</span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 bg-zinc-900 text-white border-t border-zinc-700">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0">
            <p className="text-sm font-medium leading-tight">You're offline</p>
            <p className="text-xs text-zinc-400 leading-tight">Changes will sync automatically when reconnected</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <RefreshCw className="h-3.5 w-3.5 text-amber-400 animate-spin" />
            <span className="text-xs font-medium text-amber-300">{pendingCount} pending</span>
          </div>
        )}
      </div>
    </div>
  );
}
