import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "./use-online-status";
import { getQueue, dequeue } from "@/lib/offline-queue";

/**
 * Global offline queue replay hook.
 * Mount this once at the authenticated app root (inside QueryClientProvider).
 * On every reconnection it drains the pending queue using raw fetch so it
 * works regardless of which page the user is currently viewing — not just Tasks.
 *
 * Retry policy:
 *  - 2xx / 4xx → dequeue (success or permanent failure, no point retrying)
 *  - 5xx        → keep in queue (server error, retry next reconnection)
 *  - network error → break loop (still offline despite onLine event)
 */
export function useOfflineSync() {
  const { isOnline } = useOnlineStatus();
  const queryClient  = useQueryClient();

  useEffect(() => {
    if (!isOnline) return;
    const queue = getQueue();
    if (!queue.length) return;

    (async () => {
      for (const { id: entryId, action } of queue) {
        let url = "";
        if      (action.type === "submit") url = `/api/tasks/${action.taskId}/submit`;
        else if (action.type === "recall") url = `/api/tasks/${action.taskId}/recall`;
        else if (action.type === "reopen") url = `/api/tasks/${action.taskId}/reopen`;
        else { dequeue(entryId); continue; }

        try {
          const res = await fetch(url, { method: "POST", credentials: "include" });
          if (res.status < 500) {
            dequeue(entryId);
          }
        } catch {
          break;
        }
      }
      queryClient.invalidateQueries({ queryKey: ["listTasks"] });
    })();
  // isOnline is the only stable trigger we want — queryClient is stable by design
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);
}
