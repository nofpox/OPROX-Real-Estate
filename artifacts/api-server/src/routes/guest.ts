import { Router } from "express";
import { db, guestRequestsTable, guestFeedbackTable, roomsTable, propertiesTable, unitFinancialsTable, settingsTable } from "@workspace/db";
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
  subject: "Welcome to Rkaz – Your Visit Confirmation",
  intro: "Thank you for your interest in Rkaz. We are pleased to confirm that we have received your request.\n\nOur team is currently reviewing your inquiry and will contact you shortly to finalize the details of your visit.",
  mapsUrl: "https://www.google.com/maps/search/Rkaz+Riyadh+Saudi+Arabia",
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
  } catch { /* fall through to default */ }
  return { ...DEFAULT_LEAD_EMAIL };
}

async function sendLeadWelcomeEmail(to: string, name: string, tenantId = 1): Promise<void> {
  if (!resend) return;
  const tpl = await getLeadEmailTemplate(tenantId);

  const introParagraphs = tpl.intro
    .split(/\n\n+/)
    .map(p => `<p style="margin:0 0 14px;color:#444;font-size:14px;line-height:1.75">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");

  const servicesUrl = "https://rkz-solutions.com/services";
  const year = new Date().getFullYear();

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:580px;margin:0 auto;background:#f5f5f5;padding:20px 0">
      <!-- Header -->
      <div style="background:#1a2744;padding:28px 36px;border-radius:12px 12px 0 0;text-align:center">
        <p style="margin:0;font-size:22px;font-weight:800;color:#c8a84b;letter-spacing:1px">RKAZ</p>
        <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.6);letter-spacing:0.5px">SMART SOLUTIONS</p>
      </div>
      <!-- Body -->
      <div style="background:#ffffff;padding:36px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
        <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#1a2744">Dear ${name},</h2>
        ${introParagraphs}
        <!-- Visit Details Box -->
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
        <p style="margin:24px 0 0;font-size:14px;color:#444">Best regards,<br/><strong style="color:#1a2744">The Rkaz Management Team</strong></p>
      </div>
      <!-- Footer -->
      <div style="background:#f5f5f5;padding:16px 36px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center">
        <p style="margin:0;font-size:11px;color:#aaa">© ${year} Rkaz Smart Solutions — All rights reserved</p>
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

// Guest-portal routes are PUBLIC (no session required). Tenant is resolved from the unit's property.

router.get("/guest/units/:unitId", async (req, res) => {
  const unitId = parseInt(req.params.unitId);
  if (isNaN(unitId)) { res.status(400).json({ error: "Invalid unit ID" }); return; }
  const [row] = await db
    .select({ room: roomsTable, property: propertiesTable })
    .from(roomsTable)
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(eq(roomsTable.id, unitId));
  if (!row) { res.status(404).json({ error: "Unit not found" }); return; }
  const [financial] = await db.select().from(unitFinancialsTable).where(eq(unitFinancialsTable.roomId, unitId));
  res.json({
    unit: {
      id: row.room.id, name: row.room.name, type: row.room.type,
      propertyId: row.room.propertyId, propertyName: row.property?.name ?? null,
    },
    financial: financial ? {
      dueDate: financial.dueDate,
      amountDue: financial.amountDue ? parseFloat(String(financial.amountDue)) : null,
      status: financial.status, checkIn: financial.checkIn, checkOut: financial.checkOut,
    } : null,
  });
});

router.get("/guest/requests", async (req, res) => {
  const { roomId, status } = req.query as { roomId?: string; status?: string };
  const conds = [];
  if (roomId) conds.push(eq(guestRequestsTable.roomId, parseInt(roomId)));
  if (status) conds.push(eq(guestRequestsTable.status, status));
  const rows = await db
    .select({ gr: guestRequestsTable, room: roomsTable, property: propertiesTable })
    .from(guestRequestsTable)
    .leftJoin(roomsTable, eq(guestRequestsTable.roomId, roomsTable.id))
    .leftJoin(propertiesTable, eq(roomsTable.propertyId, propertiesTable.id))
    .where(conds.length > 0 ? and(...conds) : undefined)
    .orderBy(guestRequestsTable.createdAt);
  res.json(rows.map(({ gr, room, property }) => ({
    ...gr, unitName: room?.name ?? null, propertyName: property?.name ?? null,
    createdAt: gr.createdAt.toISOString(),
  })));
});

router.post("/guest/requests", async (req, res) => {
  const { roomId, type, description, facilityName, scheduledAt, visitorName, visitorPhone } = req.body ?? {};
  if (!roomId || !type || !description) {
    res.status(400).json({ error: "roomId, type, and description are required" }); return;
  }

  // Infer tenantId from the room
  const [room] = await db.select({ tenantId: roomsTable.tenantId }).from(roomsTable).where(eq(roomsTable.id, parseInt(String(roomId))));
  const tenantId = room?.tenantId ?? 1;

  const refCode = `REQ-${Date.now().toString(36).toUpperCase()}`;
  const [request] = await db.insert(guestRequestsTable).values({
    tenantId,
    roomId: parseInt(String(roomId)), type: String(type), description: String(description),
    facilityName: facilityName ? String(facilityName) : null,
    scheduledAt: scheduledAt ? String(scheduledAt) : null,
    visitorName: visitorName ? String(visitorName) : null,
    visitorPhone: visitorPhone ? String(visitorPhone) : null,
    status: "new", refCode,
  }).returning();
  res.status(201).json({ ...request, createdAt: request.createdAt.toISOString() });
});

router.patch("/guest/requests/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  const { status } = req.body ?? {};
  if (!status) { res.status(400).json({ error: "status required" }); return; }
  const [request] = await db.update(guestRequestsTable).set({ status: String(status) }).where(eq(guestRequestsTable.id, id)).returning();
  if (!request) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...request, createdAt: request.createdAt.toISOString() });
});

/**
 * Public endpoint: Contact Us form → stored as a guest_request with type="contact",
 * roomId=null. Appears in the Service Requests dashboard under type "contact".
 */
router.post("/guest/contact", async (req, res) => {
  const { name, email, phone, subject, message } = req.body ?? {};
  if (!name || !email || !phone || !subject || !message) {
    res.status(400).json({ error: "name, email, phone, subject, and message are required" });
    return;
  }
  const refCode = `CNT-${Date.now().toString(36).toUpperCase()}`;
  const description = `Subject: ${String(subject).trim()}\n\n${String(message).trim()}\n\n---\nEmail: ${String(email).trim()}`;
  const [request] = await db.insert(guestRequestsTable).values({
    tenantId:      1,
    roomId:        null as unknown as number,
    type:          "contact",
    description,
    visitorName:   String(name).trim(),
    visitorPhone:  String(phone).trim(),
    facilityName:  String(email).trim(),
    status:        "new",
    refCode,
  }).returning();

  // Fire-and-forget: send welcome email to the lead
  sendLeadWelcomeEmail(String(email).trim(), String(name).trim()).catch(() => {});

  res.status(201).json({ refCode, id: request.id, createdAt: request.createdAt.toISOString() });
});

router.post("/guest/feedback", async (req, res) => {
  const { roomId, rating, comment } = req.body ?? {};
  if (!roomId || !rating) { res.status(400).json({ error: "roomId and rating required" }); return; }

  // Infer tenantId from the room
  const [room] = await db.select({ tenantId: roomsTable.tenantId }).from(roomsTable).where(eq(roomsTable.id, parseInt(String(roomId))));
  const tenantId = room?.tenantId ?? 1;

  const [feedback] = await db.insert(guestFeedbackTable).values({
    tenantId,
    roomId: parseInt(String(roomId)), rating: String(rating),
    comment: comment ? String(comment) : null,
  }).returning();
  res.status(201).json({ ...feedback, createdAt: feedback.createdAt.toISOString() });
});

export default router;
