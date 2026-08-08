import { Router } from "express";
import { db, guestRequestsTable, settingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SENDER_FROM = process.env.SENDER_EMAIL ?? "روزوز للحلول الذكية <onboarding@resend.dev>";

interface LeadEmailTemplate {
  subject: string;
  intro: string;
  mapsUrl: string;
  bccEmail: string;
}

const DEFAULT_LEAD_EMAIL: LeadEmailTemplate = {
  subject: "Welcome to OPROX Properties – Your Visit Confirmation",
  intro: "Thank you for your interest in OPROX Properties. We are pleased to confirm that we have received your request.\n\nOur team is currently reviewing your inquiry and will contact you shortly to finalize the details of your visit.",
  mapsUrl: "https://www.google.com/maps/search/OPROX+Properties+Riyadh+Saudi+Arabia",
  bccEmail: "",
};

async function getLeadEmailTemplate(tenantId: number): Promise<LeadEmailTemplate> {
  try {
    const [row] = await db
      .select()
      .from(settingsTable)
      .where(and(eq(settingsTable.tenantId, tenantId), eq(settingsTable.key, "cms_leadEmail")));
    if (row?.value) {
      const parsed = JSON.parse(row.value) as Partial<LeadEmailTemplate>;
      return { ...DEFAULT_LEAD_EMAIL, ...parsed };
    }
  } catch { /* fall through */ }
  return { ...DEFAULT_LEAD_EMAIL };
}

async function sendLeadWelcomeEmail(to: string, name: string, tenantId = 1): Promise<void> {
  if (!resend) return;
  const tpl = await getLeadEmailTemplate(tenantId);

  const introParagraphs = tpl.intro
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 14px;color:#444;font-size:14px;line-height:1.75">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const servicesUrl = "https://rozoz.com/services";
  const year = new Date().getFullYear();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#f5f5f5;padding:20px 0">
      <div style="background:#1a2744;padding:28px 36px;border-radius:12px 12px 0 0;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:800;color:#c8a84b;letter-spacing:1px">OPROX PROPERTIES</p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:0.5px">SMART REAL ESTATE</p>
      </div>
      <div style="background:#ffffff;padding:36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
        <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1a2744">Dear ${name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")},</h2>
        ${introParagraphs}
        <div style="background:#f9f6ee;border:1px solid #c8a84b;border-radius:8px;padding:20px 24px;margin:24px 0">
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#1a2744;text-transform:uppercase;letter-spacing:0.5px">Visit Details</p>
          <table style="width:100%;border-collapse:collapse">
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#666;width:40%">Status</td>
              <td style="padding:6px 0;font-size:13px;font-weight:600;color:#1a7a4a">✓ Request Received</td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#666">Company Location</td>
              <td style="padding:6px 0;font-size:13px">
                <a href="${tpl.mapsUrl}" style="color:#c8a84b;font-weight:600;text-decoration:none">📍 Riyadh, Saudi Arabia ↗</a>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;font-size:13px;color:#666">Our Services</td>
              <td style="padding:6px 0;font-size:13px">
                <a href="${servicesUrl}" style="color:#c8a84b;font-weight:600;text-decoration:none">View Services Page ↗</a>
              </td>
            </tr>
          </table>
        </div>
        <p style="margin:0 0 6px;font-size:14px;color:#444;line-height:1.7">We look forward to welcoming you to our offices.</p>
        <p style="margin:24px 0 0;font-size:14px;color:#444">Best regards,<br/><strong style="color:#1a2744">The OPROX Properties Team</strong></p>
      </div>
      <div style="background:#f5f5f5;padding:16px 36px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
        <p style="margin:0;font-size:11px;color:#aaa">© ${year} OPROX Properties — All rights reserved</p>
      </div>
    </div>
  `;

  await resend.emails.send({
    from: SENDER_FROM,
    to:   [to],
    ...(tpl.bccEmail ? { bcc: [tpl.bccEmail] } : {}),
    subject: tpl.subject,
    html,
  });
}

const router = Router();

router.post("/guest/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body ?? {};
  if (!name || !email) {
    res.status(400).json({ error: "name and email are required" });
    return;
  }

  const refCode = `CNT-${Date.now().toString(36).toUpperCase()}`;
  const desc = [
    subject ? `Subject: ${String(subject).trim()}` : null,
    message ? String(message).trim() : null,
    `---\nEmail: ${String(email).trim()}`,
  ].filter(Boolean).join("\n\n");

  try {
    const [record] = await db
      .insert(guestRequestsTable)
      .values({
        tenantId:    1,
        roomId:      null as unknown as number,
        type:        "contact",
        description: desc,
        visitorName: String(name).trim(),
        visitorPhone: phone ? String(phone).trim() : null,
        facilityName: String(email).trim(),
        status:      "new",
        refCode,
      })
      .returning();

    sendLeadWelcomeEmail(String(email).trim(), String(name).trim(), 1).catch(() => {});

    res.status(201).json({ success: true, refCode, id: record.id });
  } catch (err) {
    req.log?.error({ err }, "POST /guest/contact failed");
    res.status(500).json({ error: "Failed to submit contact" });
  }
});

export default router;
