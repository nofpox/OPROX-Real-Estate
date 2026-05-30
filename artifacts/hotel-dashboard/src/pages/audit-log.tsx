/**
 * AuditLog — complete rewrite, zero legacy code.
 *
 * Structure:
 *   • No Card / Skeleton / animation components
 *   • No opacity or backdrop-filter CSS classes
 *   • Plain HTML <table dir="ltr"> with <colgroup> for fixed column widths
 *   • Native <input> and <select> elements for filtering
 *   • key={lang} on the outer wrapper forces a full browser re-layout on
 *     every language switch — the browser recalculates from scratch
 */

import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/language-context";
import { useListActivityLogs, useListProperties } from "@workspace/api-client-react";
import type { ActivityLog } from "@workspace/api-client-react";
import { RefreshCw } from "lucide-react";

// ── Action labels — static English strings, never translated ──────────────────
const ACTION_LABEL: Record<string, string> = {
  "task.created":              "Task Created",
  "task.status_changed":       "Status Changed",
  "task.assigned":             "Task Assigned",
  "task.deleted":              "Task Deleted",
  "work_order.created":        "Work Order Created",
  "work_order.status_changed": "Work Order Updated",
  "work_order.deleted":        "Work Order Deleted",
  "booking.created":           "Booking Created",
  "booking.checked_in":        "Checked In",
  "booking.checked_out":       "Checked Out",
  "booking.cancelled":         "Booking Cancelled",
  "booking.confirmed":         "Booking Confirmed",
  "booking.status_changed":    "Booking Updated",
  "field_user.created":        "Team Member Added",
  "field_user.updated":        "Team Member Updated",
  "field_user.deactivated":    "Member Deactivated",
  "field_user.reactivated":    "Member Reactivated",
  "field_user.deleted":        "Team Member Removed",
};

// ── Relative time — plain string, no formatting library ───────────────────────
function relTime(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)   return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ── Table row — pure <tr> / <td>, inline styles only ─────────────────────────
function Row({ log }: { log: ActivityLog }) {
  const label = ACTION_LABEL[log.action] ?? log.action.replace(/[_.]/g, " ");
  const proofSrc = log.proofPhotoUrl ? `/api/storage${log.proofPhotoUrl}` : null;

  return (
    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>

      {/* Col 1 — action type pill */}
      <td style={{ verticalAlign: "top", padding: "10px 8px 10px 0", whiteSpace: "nowrap" }}>
        <span style={{
          display: "inline-block",
          padding: "2px 8px",
          borderRadius: "9999px",
          fontSize: "11px",
          fontWeight: 600,
          background: "#f3f4f6",
          color: "#374151",
          whiteSpace: "nowrap",
        }}>
          {label}
        </span>
      </td>

      {/* Col 2 — entity + actor */}
      <td style={{ verticalAlign: "top", padding: "10px 8px", overflow: "hidden" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {log.entityLabel ?? `${log.entityType} #${log.entityId}`}
        </div>
        <div style={{ fontSize: "12px", color: "#6b7280" }}>
          {log.actorName ?? "System"}
          {log.actorRole ? <span style={{ marginLeft: 4 }}>· {log.actorRole}</span> : null}
          {log.propertyName ? <span style={{ marginLeft: 4 }}>· {log.propertyName}</span> : null}
        </div>
        {log.details ? (
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
            {log.details}
          </div>
        ) : null}
        {proofSrc ? (
          <a href={proofSrc} target="_blank" rel="noopener noreferrer" style={{ display: "inline-block", marginTop: "6px" }}>
            <img src={proofSrc} alt="Proof" style={{ height: 48, width: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #d1fae5" }} />
          </a>
        ) : null}
      </td>

      {/* Col 3 — timestamp, right-aligned */}
      <td style={{ verticalAlign: "top", padding: "10px 0 10px 8px", whiteSpace: "nowrap", textAlign: "right", fontSize: "12px", color: "#9ca3af" }}>
        <span title={fullTime(log.createdAt)}>{relTime(log.createdAt)}</span>
      </td>
    </tr>
  );
}

// ── Inner page component ───────────────────────────────────────────────────────
function AuditLogInner() {
  const { t } = useTranslation();
  const [search,  setSearch]  = useState("");
  const [entity,  setEntity]  = useState("all");
  const [propId,  setPropId]  = useState("all");

  const { data: properties } = useListProperties();
  const { data: logs, isLoading, refetch, isFetching } = useListActivityLogs({
    limit: 200,
    entityType: entity !== "all" ? entity : undefined,
    propertyId: propId !== "all" ? parseInt(propId) : undefined,
  });

  const rows = useMemo(() => {
    const all = logs ?? [];
    if (!search.trim()) return all;
    const q = search.toLowerCase();
    return all.filter((l) =>
      (l.actorName    ?? "").toLowerCase().includes(q) ||
      (l.entityLabel  ?? "").toLowerCase().includes(q) ||
      (l.details      ?? "").toLowerCase().includes(q) ||
      (l.propertyName ?? "").toLowerCase().includes(q)
    );
  }, [logs, search]);

  // ── Outer page: plain white background, no opacity classes ─────────────────
  return (
    <div style={{ padding: 0 }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0, fontFamily: "Georgia, serif" }}>
            {t("activityLog.title")}
          </h1>
          <p style={{ fontSize: 14, color: "#6b7280", margin: "4px 0 0" }}>
            {t("activityLog.subtitle")}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", border: "1px solid #d1d5db", borderRadius: 6, background: "white", cursor: "pointer", fontSize: 13 }}
        >
          <RefreshCw size={14} style={{ animation: isFetching ? "spin 1s linear infinite" : "none" }} />
          {t("activityLog.refresh")}
        </button>
      </div>

      {/* KPI row — plain bordered boxes, no opacity/blur */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Total Events",  value: (logs ?? []).length },
          { label: "Tasks",         value: (logs ?? []).filter(l => l.entityType === "task").length },
          { label: "Work Orders",   value: (logs ?? []).filter(l => l.entityType === "work_order").length },
          { label: "Team Changes",  value: (logs ?? []).filter(l => l.entityType === "field_user").length },
        ].map((k) => (
          <div key={k.label} style={{ flex: "1 1 100px", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px", background: "white" }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{isLoading ? "—" : k.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input
          type="search"
          placeholder={t("activityLog.searchPlaceholder")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: "1 1 200px", padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, outline: "none" }}
        />
        <select
          value={entity}
          onChange={(e) => setEntity(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "white" }}
        >
          <option value="all">All Types</option>
          <option value="task">Tasks</option>
          <option value="work_order">Work Orders</option>
          <option value="booking">Bookings</option>
          <option value="field_user">Team</option>
        </select>
        <select
          value={propId}
          onChange={(e) => setPropId(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "white" }}
        >
          <option value="all">All Properties</option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
          {isLoading ? "Loading…" : `${rows.length} events`}
        </span>
      </div>

      {/* Table — dir="ltr" so column order is fixed by the browser table engine */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "white", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>Loading…</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>No activity found.</div>
        ) : (
          <table
            dir="ltr"
            style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}
          >
            <colgroup>
              <col style={{ width: "9rem" }} />
              <col />
              <col style={{ width: "4rem" }} />
            </colgroup>
            <tbody>
              {rows.map((log) => <Row key={log.id} log={log} />)}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}

// ── Public export — key={lang} forces full re-mount on language change ─────────
export default function AuditLog() {
  const { lang } = useLanguage();
  return <AuditLogInner key={lang} />;
}
