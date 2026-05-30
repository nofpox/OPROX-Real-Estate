/**
 * Task Report PDF Generator
 * Produces a professional A4 report for completed/verified tasks.
 * Client-side — no server dependency.
 * PDF labels are translated via i18n (French and Portuguese fully localized;
 * non-Latin scripts use English labels since jsPDF Helvetica does not support
 * CJK, Arabic, Devanagari, etc. without an embedded Unicode font).
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Task } from "@workspace/api-client-react";
import i18n from "@/i18n/index";

// ── Palette helpers ───────────────────────────────────────────────────────────
type RGB = [number, number, number];

const P: Record<string, RGB> = {
  primary: [245, 158,  11],   // amber-500
  dark:    [ 15,  23,  42],   // slate-900
  mid:     [ 51,  65,  85],   // slate-700
  muted:   [100, 116, 139],   // slate-500
  light:   [241, 245, 249],   // slate-100
  white:   [255, 255, 255],
  red:     [220,  38,  38],
  green:   [ 22, 163,  74],
  blue:    [ 59, 130, 246],
  violet:  [124,  58, 237],
  orange:  [234,  88,  12],
  amber:   [217, 119,   6],
  emerald: [ 16, 185, 129],
};

// ── i18n helper ───────────────────────────────────────────────────────────────
function p(key: string): string {
  return i18n.t(`pdf.${key}`);
}

// ── Formatters ────────────────────────────────────────────────────────────────

function fmt(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch { return "—"; }
}

function fmtDT(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  } catch { return "—"; }
}

function duration(startIso: string | null | undefined, endIso: string | null | undefined): string {
  if (!startIso || !endIso) return "—";
  const ms = new Date(endIso).getTime() - new Date(startIso).getTime();
  if (ms <= 0) return "—";
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function cap(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

function reportStatusLabel(rs: string | null | undefined): string {
  switch (rs) {
    case "submitted": return p("statusSubmitted");
    case "rejected":  return p("statusRejected");
    case "escalated": return p("statusEscalated");
    case "approved":  return p("statusApproved");
    default:          return "—";
  }
}

function reportStatusColor(rs: string | null | undefined): RGB {
  switch (rs) {
    case "submitted": return P.blue;
    case "rejected":  return P.red;
    case "escalated": return P.amber;
    case "approved":  return P.emerald;
    default:          return P.muted;
  }
}

/** Fetch an image URL and return a base64 data-URI, or null on failure. */
async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string ?? null);
      reader.onerror  = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch { return null; }
}

// ── Public interface ──────────────────────────────────────────────────────────

export interface ReportOptions {
  tasks:         Task[];
  dateFrom:      string;     // YYYY-MM-DD
  dateTo:        string;     // YYYY-MM-DD
  companyName:   string;
  propertyLabel: string;     // "All Properties" or a specific name
  generatedBy:   string;
  includePhotos: boolean;
  approvedOnly?: boolean;
}

// ── Main generator ────────────────────────────────────────────────────────────

export async function generateTaskReport(opts: ReportOptions): Promise<void> {
  const { tasks, dateFrom, dateTo, companyName, propertyLabel, generatedBy, includePhotos, approvedOnly } = opts;

  // Filter: completed or verified, completedAt within range
  const report = tasks.filter((t) => {
    if (t.status !== "completed" && t.status !== "verified") return false;
    if (approvedOnly && t.reportStatus !== "approved") return false;
    const d = (t.completedAt ?? t.createdAt).split("T")[0];
    return d >= dateFrom && d <= dateTo;
  });

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W   = doc.internal.pageSize.getWidth();
  const H   = doc.internal.pageSize.getHeight();
  const ML  = 14;
  const MR  = 14;
  const CW  = W - ML - MR;

  // ── Cover band ─────────────────────────────────────────────────────────────
  doc.setFillColor(...P.dark);
  doc.rect(0, 0, W, 40, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...P.white);
  doc.text(companyName, ML, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...P.primary);
  doc.text(approvedOnly ? p("approvedReport") : p("completionReport"), ML, 26);

  doc.setDrawColor(...P.primary);
  doc.setLineWidth(0.8);
  doc.line(ML, 29, ML + 60, 29);

  doc.setTextColor(...P.white);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${fmt(dateFrom)} — ${fmt(dateTo)}`, W - MR, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 180, 200);
  doc.text(propertyLabel, W - MR, 24, { align: "right" });
  doc.text(`Generated: ${fmtDT(new Date().toISOString())}`, W - MR, 29, { align: "right" });
  doc.text(`By: ${generatedBy}`, W - MR, 34, { align: "right" });

  let curY = 52;

  // ── KPI cards ─────────────────────────────────────────────────────────────
  const total    = report.length;
  const verified = report.filter((t) => t.status === "verified").length;
  const approved = report.filter((t) => t.reportStatus === "approved").length;

  const durArr = report
    .filter((t) => t.startedAt && t.completedAt)
    .map((t) => new Date(t.completedAt!).getTime() - new Date(t.startedAt!).getTime());
  const avgH = durArr.length
    ? `${(durArr.reduce((a, b) => a + b, 0) / durArr.length / 3_600_000).toFixed(1)}h`
    : "—";

  const KPI_CARDS: { label: string; value: string; color: RGB }[] = [
    { label: p("completed"),   value: String(total),    color: P.green   },
    { label: p("verified"),    value: String(verified), color: P.violet  },
    { label: p("approved"),    value: String(approved), color: P.emerald },
    { label: p("avgDuration"), value: avgH,             color: P.primary },
  ];

  const cardW = (CW - 9) / 4;
  KPI_CARDS.forEach((s, i) => {
    const x = ML + i * (cardW + 3);
    doc.setFillColor(...P.light);
    doc.roundedRect(x, curY, cardW, 20, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(...s.color);
    doc.text(s.value, x + cardW / 2, curY + 11, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...P.muted);
    doc.text(s.label.toUpperCase(), x + cardW / 2, curY + 17, { align: "center" });
  });
  curY += 28;

  // ── Category breakdown ─────────────────────────────────────────────────────
  const byCat: Record<string, number> = {};
  for (const t of report) byCat[t.category] = (byCat[t.category] ?? 0) + 1;
  const catEntries = Object.entries(byCat).sort((a, b) => b[1] - a[1]);

  if (total > 0 && catEntries.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...P.mid);
    doc.text(p("categoryBreakdown"), ML, curY);
    curY += 5;

    const BAR_COLORS: RGB[] = [P.primary, P.blue, P.green, P.red, P.violet];
    const barH = 5;

    doc.setFillColor(...P.light);
    doc.roundedRect(ML, curY, CW, barH, 1, 1, "F");

    let xOff = 0;
    catEntries.forEach(([, cnt], i) => {
      const segW = (cnt / total) * CW;
      doc.setFillColor(...(BAR_COLORS[i % BAR_COLORS.length]));
      if (i === 0) doc.roundedRect(ML + xOff, curY, segW, barH, 1, 1, "F");
      else        doc.rect(ML + xOff, curY, segW, barH, "F");
      xOff += segW;
    });
    curY += barH + 3;

    // Legend
    let lx = ML;
    catEntries.forEach(([cat, cnt], i) => {
      const label = `${cap(cat)}: ${cnt}`;
      const tw    = doc.getTextWidth(label);
      if (lx + tw + 10 > W - MR) { lx = ML; curY += 5; }
      doc.setFillColor(...(BAR_COLORS[i % BAR_COLORS.length]));
      doc.rect(lx, curY - 2.5, 3, 3, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...P.muted);
      doc.text(label, lx + 5, curY);
      lx += tw + 12;
    });
    curY += 8;
  }

  // ── Section header bar ─────────────────────────────────────────────────────
  const taskWord = total !== 1 ? p("taskPlural") : p("taskSingular");
  doc.setFillColor(...P.dark);
  doc.rect(ML, curY, CW, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...P.white);
  doc.text(p("completedTasksSection"), ML + 3, curY + 4.8);
  doc.text(`${total} ${taskWord}`, W - MR, curY + 4.8, { align: "right" });
  curY += 10;

  // ── Tasks table ────────────────────────────────────────────────────────────
  if (total === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...P.muted);
    doc.text(p("noTasks"), ML, curY + 8);
  } else {
    autoTable(doc, {
      startY: curY,
      margin: { left: ML, right: MR },
      head: [[
        { content: "#",              styles: { cellWidth: 7  } },
        { content: p("colTitle"),    styles: { cellWidth: 42 } },
        { content: p("colCategory"), styles: { cellWidth: 20 } },
        { content: p("colPriority"), styles: { cellWidth: 16 } },
        { content: p("colAssignee"), styles: { cellWidth: 22 } },
        { content: p("colCompleted"),styles: { cellWidth: 22 } },
        { content: p("colDuration"), styles: { cellWidth: 14 } },
        { content: p("colStatus"),   styles: { cellWidth: 18 } },
        { content: p("colReport"),   styles: { cellWidth: 18 } },
      ]],
      body: report.map((t, i) => [
        String(i + 1),
        t.title + (t.propertyName ? `\n${t.propertyName}` : ""),
        cap(t.category),
        cap(t.priority),
        t.assigneeName ?? p("unassigned"),
        fmt(t.completedAt),
        duration(t.startedAt, t.completedAt),
        t.status === "verified" ? p("verifiedCheck") : p("completed"),
        reportStatusLabel(t.reportStatus),
      ]),
      headStyles: {
        fillColor: P.mid,
        textColor: P.white,
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
        textColor: P.dark,
        minCellHeight: 9,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] as RGB },
      columnStyles: {
        0: { halign: "center", textColor: P.muted },
        6: { halign: "center" },
        7: { halign: "center", fontStyle: "bold" },
        8: { halign: "center", fontStyle: "bold" },
      },
      didParseCell(data) {
        if (data.section !== "body") return;
        if (data.column.index === 7 && String(data.cell.raw).includes("✓")) {
          data.cell.styles.textColor = P.violet;
        }
        if (data.column.index === 8) {
          const rs = String(data.cell.raw);
          const key = rs === p("statusSubmitted") ? "submitted"
            : rs === p("statusRejected") ? "rejected"
            : rs === p("statusEscalated") ? "escalated"
            : rs === p("statusApproved") ? "approved"
            : "none";
          data.cell.styles.textColor = reportStatusColor(key);
        }
        if (data.column.index === 3) {
          const pv = String(data.cell.raw).toLowerCase();
          if (pv === "urgent")    data.cell.styles.textColor = P.red;
          else if (pv === "high") data.cell.styles.textColor = P.orange;
        }
      },
    });
  }

  // ── Approval Audit Trail ────────────────────────────────────────────────────
  const withTrail = report.filter((t) =>
    t.reportStatus && t.reportStatus !== "none" && t.submittedAt
  );

  if (withTrail.length > 0) {
    const tblY = (doc as any).lastAutoTable?.finalY ?? curY;
    let ay = tblY + 14;

    if (ay + 20 > H - 16) { doc.addPage(); ay = 20; }

    const recWord = withTrail.length !== 1 ? p("recordPlural") : p("recordSingular");
    doc.setFillColor(...P.dark);
    doc.rect(ML, ay, CW, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...P.white);
    doc.text(p("auditTrailSection"), ML + 3, ay + 4.8);
    doc.text(`${withTrail.length} ${recWord}`, W - MR, ay + 4.8, { align: "right" });
    ay += 10;

    autoTable(doc, {
      startY: ay,
      margin: { left: ML, right: MR },
      head: [[
        { content: "#",                  styles: { cellWidth: 7  } },
        { content: p("colTask"),         styles: { cellWidth: 40 } },
        { content: p("colSubmitted"),    styles: { cellWidth: 32 } },
        { content: p("colReviewedBy"),   styles: { cellWidth: 36 } },
        { content: p("colApprovedBy"),   styles: { cellWidth: 30 } },
        { content: p("colReportStatus"), styles: { cellWidth: 22 } },
        { content: p("colNotes"),        styles: { cellWidth: 30 } },
      ]],
      body: withTrail.map((t, i) => {
        const reviewedAt = t.rejectedAt ?? t.escalatedAt;
        return [
          String(i + 1),
          t.title + (t.propertyName ? `\n${t.propertyName}` : ""),
          fmtDT(t.submittedAt),
          reviewedAt ? fmtDT(reviewedAt) : p("pending"),
          t.approvedAt ? fmtDT(t.approvedAt) : p("pending"),
          reportStatusLabel(t.reportStatus),
          t.rejectionNotes ?? "",
        ];
      }),
      headStyles: {
        fillColor: P.mid,
        textColor: P.white,
        fontStyle: "bold",
        fontSize: 7.5,
        cellPadding: 3,
      },
      bodyStyles: {
        fontSize: 6.5,
        cellPadding: { top: 2.5, right: 2.5, bottom: 2.5, left: 2.5 },
        textColor: P.dark,
        minCellHeight: 9,
      },
      alternateRowStyles: { fillColor: [248, 250, 252] as RGB },
      columnStyles: {
        0: { halign: "center", textColor: P.muted },
        5: { halign: "center", fontStyle: "bold" },
        6: { textColor: P.red, fontStyle: "italic" },
      },
      didParseCell(data) {
        if (data.section !== "body") return;
        if (data.column.index === 5) {
          const rs = String(data.cell.raw);
          const key = rs === p("statusSubmitted") ? "submitted"
            : rs === p("statusRejected") ? "rejected"
            : rs === p("statusEscalated") ? "escalated"
            : rs === p("statusApproved") ? "approved"
            : "none";
          data.cell.styles.textColor = reportStatusColor(key);
        }
        const pendingLabel = p("pending");
        if (data.column.index === 3 && String(data.cell.raw) === pendingLabel) {
          data.cell.styles.textColor = P.muted;
          data.cell.styles.fontStyle = "italic";
        }
        if (data.column.index === 4 && String(data.cell.raw) === pendingLabel) {
          data.cell.styles.textColor = P.muted;
          data.cell.styles.fontStyle = "italic";
        }
      },
    });
  }

  // ── Photo appendix ─────────────────────────────────────────────────────────
  if (includePhotos && total > 0) {
    const withPhotos = report.filter((t) => t.beforePhotoUrl || t.afterPhotoUrl);

    if (withPhotos.length > 0) {
      doc.addPage();

      doc.setFillColor(...P.dark);
      doc.rect(0, 0, W, 14, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...P.white);
      doc.text(p("photoAppendix"), ML, 9.5);

      let py = 22;
      const photoW = (CW - 5) / 2;
      const photoH = 34;

      for (const t of withPhotos) {
        const rowH = 7 + photoH + 8;
        if (py + rowH > H - 16) { doc.addPage(); py = 14; }

        // Task title bar
        doc.setFillColor(...P.light);
        doc.rect(ML, py, CW, 7, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(...P.dark);
        doc.text(`#${t.id} — ${t.title}`, ML + 2, py + 5);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...P.muted);
        doc.text(
          `${cap(t.category)} · ${cap(t.priority)} · ${p("completed")}: ${fmt(t.completedAt)}`,
          W - MR, py + 5, { align: "right" }
        );
        py += 9;

        const photoPairs: Array<{ label: string; url: string | null | undefined; color: RGB }> = [
          { label: p("before"), url: t.beforePhotoUrl, color: P.blue  },
          { label: p("after"),  url: t.afterPhotoUrl,  color: P.green },
        ];

        for (const { label, url, color } of photoPairs) {
          const px = label === p("before") ? ML : ML + photoW + 5;

          doc.setFillColor(...P.light);
          doc.roundedRect(px, py, photoW, photoH, 2, 2, "F");

          // Label banner
          doc.setFillColor(...color);
          doc.roundedRect(px, py, photoW, 6, 2, 2, "F");
          doc.rect(px, py + 3, photoW, 3, "F");
          doc.setFont("helvetica", "bold");
          doc.setFontSize(7);
          doc.setTextColor(...P.white);
          doc.text(label, px + photoW / 2, py + 4.2, { align: "center" });

          if (url) {
            const dataUrl = await toDataUrl(url);
            if (dataUrl) {
              try {
                doc.addImage(dataUrl, "JPEG", px + 2, py + 7, photoW - 4, photoH - 9);
              } catch {
                doc.setFont("helvetica", "italic");
                doc.setFontSize(7);
                doc.setTextColor(...P.muted);
                doc.text(p("photoUnavailable"), px + photoW / 2, py + photoH / 2, { align: "center" });
              }
            } else {
              doc.setFont("helvetica", "italic");
              doc.setFontSize(7);
              doc.setTextColor(...P.muted);
              doc.text(p("couldNotLoad"), px + photoW / 2, py + photoH / 2, { align: "center" });
            }
          } else {
            doc.setFont("helvetica", "italic");
            doc.setFontSize(7);
            doc.setTextColor(...P.muted);
            doc.text(p("noPhoto"), px + photoW / 2, py + photoH / 2, { align: "center" });
          }
        }

        py += photoH + 8;
      }
    }
  }

  // ── Page numbers & footer ─────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let pg = 1; pg <= totalPages; pg++) {
    doc.setPage(pg);
    doc.setDrawColor(...P.light);
    doc.setLineWidth(0.3);
    doc.line(ML, H - 12, W - MR, H - 12);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...P.muted);
    const pageLabel = p("pageOf")
      .replace("{{current}}", String(pg))
      .replace("{{total}}", String(totalPages));
    doc.text(companyName,                    ML,     H - 8);
    doc.text(pageLabel,                      W / 2,  H - 8, { align: "center" });
    doc.text(`${p("confidential")} — ${new Date().getFullYear()}`, W - MR, H - 8, { align: "right" });
  }

  // ── Download ───────────────────────────────────────────────────────────────
  const from   = dateFrom.replace(/-/g, "");
  const to     = dateTo.replace(/-/g, "");
  const suffix = approvedOnly ? "-approved" : "";
  doc.save(`task-report-${from}-${to}${suffix}.pdf`);
}
