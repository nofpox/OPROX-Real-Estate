import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, DoorOpen, DoorClosed, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

function NotificationIcon({ type }: { type: string }) {
  if (type === "check-in") return <DoorOpen className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />;
  if (type === "check-out") return <DoorClosed className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
  return <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />;
}

export function NotificationBell() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: notifications } = useListNotifications({});
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const unreadCount = notifications?.filter(n => !n.isRead).length || 0;

  function handleMarkRead(id: number) {
    markRead.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }) });
  }
  function handleMarkAllRead() {
    markAllRead.mutate(undefined, { onSuccess: () => { qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }); toast({ title: t("notifications.markAllRead") }); } });
  }
  function formatTime(iso: string) {
    const diffMins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMins < 1) return t("notifications.justNow");
    if (diffMins < 60) return t("notifications.minsAgo", { count: diffMins });
    const hrs = Math.floor(diffMins / 60);
    if (hrs < 24) return t("notifications.hoursAgo", { count: hrs });
    return new Date(iso).toLocaleDateString();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && <span className="absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold text-sm">{t("notifications.title")}</p>
          {unreadCount > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground" onClick={handleMarkAllRead}><CheckCheck className="me-1 h-3.5 w-3.5"/>{t("notifications.markAllRead")}</Button>}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2"/>
              <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map(n => (
                <button key={n.id} className={`w-full text-start px-4 py-3 ${!n.isRead ? "bg-primary/5" : ""}`} onClick={() => !n.isRead && handleMarkRead(n.id)}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5"><NotificationIcon type={n.type}/></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>{n.title}</p>
                        {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0"/>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatTime(n.createdAt)}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
