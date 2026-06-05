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
import { useListActivityLogs, useListProperties } from "@/lib/local-hooks";
import type { ActivityLog } from "@/lib/local-hooks";
import { RefreshCw } from "lucide-react";

// ── Relative time — plain string, no formatting library ───────────────────────
function relTime(iso: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60)    return t("notifications.justNow");
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function fullTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

// ── Table row — pure <tr> / <td>, inline styles only ─────────────────────────
function Row({ log }: { log: ActivityLog }) {
  const { t } = useTranslation();
  const rawKey = `activityLog.action.${log.action}`;
  const label = t(rawKey) !== rawKey
    ? t(rawKey)
    : log.action.replace(/[_.]/g, " ");
  const proofSrc = log.proofPhotoUrl ?? null;

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
          {log.actorName ?? t("activityLog.systemActor")}
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
            <img src={proofSrc} alt="proof" style={{ height: 48, width: 72, objectFit: "cover", borderRadius: 6, border: "1px solid #d1fae5" }} />
          </a>
        ) : null}
      </td>

      {/* Col 3 — timestamp, right-aligned */}
      <td style={{ verticalAlign: "top", padding: "10px 0 10px 8px", whiteSpace: "nowrap", textAlign: "right", fontSize: "12px", color: "#9ca3af" }}>
        <span title={fullTime(log.createdAt)}>{relTime(log.createdAt, t)}</span>
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

  const eventsLabel = isLoading
    ? t("activityLog.loading")
    : t("activityLog.eventsCount_other", { count: rows.length });

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
          { key: "total",       value: (logs ?? []).length },
          { key: "bookings",    value: (logs ?? []).filter(l => l.entityType === "booking").length },
          { key: "workOrders",  value: (logs ?? []).filter(l => l.entityType === "work_order").length },
          { key: "expenses",    value: (logs ?? []).filter(l => l.entityType === "expense").length },
        ].map((k) => (
          <div key={k.key} style={{ flex: "1 1 100px", border: "1px solid #e5e7eb", borderRadius: 8, padding: "14px 16px", background: "white" }}>
            <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1 }}>{isLoading ? "—" : k.value}</div>
            <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>{t(`activityLog.kpi.${k.key}`)}</div>
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
          <option value="all">{t("activityLog.allTypes")}</option>
          <option value="booking">{t("activityLog.filterType.booking")}</option>
          <option value="work_order">{t("activityLog.filterType.work_order")}</option>
          <option value="expense">{t("activityLog.filterType.expense")}</option>
          <option value="task">{t("activityLog.filterType.task")}</option>
          <option value="field_user">{t("activityLog.filterType.field_user")}</option>
        </select>
        <select
          value={propId}
          onChange={(e) => setPropId(e.target.value)}
          style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13, background: "white" }}
        >
          <option value="all">{t("common.allProperties")}</option>
          {(properties ?? []).map((p) => (
            <option key={p.id} value={String(p.id)}>{p.name}</option>
          ))}
        </select>
        <span style={{ fontSize: 12, color: "#9ca3af", marginLeft: "auto" }}>
          {eventsLabel}
        </span>
      </div>

      {/* Table — dir="ltr" so column order is fixed by the browser table engine */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, background: "white", overflow: "hidden" }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>{t("activityLog.loading")}</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "#9ca3af", fontSize: 14 }}>{t("activityLog.noActivity")}</div>
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
