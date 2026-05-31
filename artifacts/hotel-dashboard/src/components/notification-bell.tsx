import React, { useEffect } from "react";
import {
  useListNotifications, getListNotificationsQueryKey,
  useGenerateNotifications, useMarkNotificationRead, useMarkAllNotificationsRead,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bell, CheckCheck, DoorOpen, DoorClosed, Wrench } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/language-context";

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "check-in": return <DoorOpen className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />;
    case "check-out": return <DoorClosed className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />;
    default: return <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />;
  }
}

/**
 * Parse the messageParams JSON string safely.
 * Returns an empty object on any parse failure.
 */
function parseParams(raw: string | null | undefined): Record<string, string> {
  if (!raw) return {};
  try { return JSON.parse(raw) as Record<string, string>; } catch { return {}; }
}

export function NotificationBell() {
  const { t } = useTranslation();
  const { lang } = useLanguage();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notifications } = useListNotifications({});
  const generateNotifications = useGenerateNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  useEffect(() => {
    generateNotifications.mutate(undefined, {
      onSuccess: (data) => {
        if (data.generated > 0) {
          queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
        }
      },
    });
  }, []);

  const handleMarkRead = (id: number) => {
    markRead.mutate({ id }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) }); },
    });
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate(undefined, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey({}) });
        toast({ title: t("notifications.markAllRead") });
      },
    });
  };

  function formatTime(iso: string) {
    const date = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return t("notifications.justNow");
    if (diffMins < 60) return t("notifications.minsAgo", { count: diffMins });
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return t("notifications.hoursAgo", { count: diffHrs });
    return date.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US");
  }

  /**
   * Resolve a localised title/message for a notification.
   * If the server has set `notifKey`, translate it with `messageParams`.
   * Falls back gracefully to the stored English string.
   */
  function localise(
    notifKey: string | null | undefined,
    messageParams: string | null | undefined,
    fallback: string,
    suffix: "title" | "message",
  ): string {
    if (!notifKey) return fallback;
    const key = `notif.${notifKey}.${suffix}`;
    const params = parseParams(messageParams);
    const translated = t(key, params);
    // i18next returns the key itself when the key is missing — treat that as a fallback signal
    return translated === key ? fallback : translated;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute end-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
          <span className="sr-only">{t("notifications.title")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="font-semibold text-sm">{t("notifications.title")}</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="me-1 h-3.5 w-3.5" />
              {t("notifications.markAllRead")}
            </Button>
          )}
        </div>
        <div className="max-h-[380px] overflow-y-auto">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
              <p className="text-sm text-muted-foreground">{t("notifications.empty")}</p>
              <p className="text-xs text-muted-foreground/70 mt-1">{t("notifications.emptyDesc")}</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => {
                const title   = localise(n.notifKey, n.messageParams, n.title,   "title");
                const message = localise(n.notifKey, n.messageParams, n.message, "message");
                return (
                  <button
                    key={n.id}
                    className={`w-full text-start px-4 py-3 ${!n.isRead ? "bg-primary/5" : ""}`}
                    onClick={() => !n.isRead && handleMarkRead(n.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5"><NotificationIcon type={n.type} /></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs font-semibold ${!n.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {title}
                          </p>
                          {!n.isRead && <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">{formatTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
