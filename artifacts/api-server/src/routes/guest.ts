import { Router } from "express";
import { db, guestRequestsTable, guestFeedbackTable, roomsTable, propertiesTable, unitFinancialsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const SENDER_FROM = process.env.SENDER_EMAIL ?? "ركز للحلول الذكية <onboarding@resend.dev>";

async function sendLeadWelcomeEmail(to: string, name: string): Promise<void> {
  if (!resend) return;
  await resend.emails.send({
    from: SENDER_FROM,
    to:   [to],
    subject: "شكراً على تواصلك | Thank You for Reaching Out – ركز Rakez",
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:0;background:#f8f8f8">
        <div style="background:#1a2744;padding:24px 32px;border-radius:12px 12px 0 0">
          <p style="margin:0;font-size:18px;font-weight:700;color:#fff;letter-spacing:0.3px">ركز | Rakez Smart Solutions</p>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.55)">Premium Property Management</p>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none">
          <h2 style="margin:0 0 8px;font-size:17px;font-weight:700;color:#111">Dear ${name},</h2>
          <p style="margin:0 0 20px;color:#444;font-size:14px;line-height:1.7">
            Thank you for your interest in partnering with <strong>Rakez Smart Solutions</strong>. We have received your inquiry and our team will be in touch with you within <strong>24 hours</strong>.
          </p>
          <div style="background:#f0f4ff;border-left:4px solid #c8a84b;border-radius:6px;padding:16px 20px;margin-bottom:24px">
            <p style="margin:0;font-size:13px;font-weight:600;color:#1a2744">Our offices</p>
            <p style="margin:6px 0 0;font-size:13px;color:#555;line-height:1.6">
              King Fahd Road, Olaya District · Riyadh, Saudi Arabia<br/>
              📞 +966 11 234 5678 &nbsp;|&nbsp; ✉️ info@rakez-solutions.com
            </p>
          </div>
          <hr style="border:none;border-top:1px solid #f0f0f0;margin:0 0 20px"/>
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#111;direction:rtl;text-align:right">عزيزي ${name}،</p>
          <p style="margin:0;color:#444;font-size:14px;line-height:1.7;direction:rtl;text-align:right">
            شكراً لاهتمامك بالتعاون مع <strong>ركز للحلول الذكية</strong>. لقد استلمنا استفساركم وسيتواصل معكم فريقنا خلال <strong>24 ساعة</strong>.
          </p>
          <div style="margin-top:24px;text-align:center">
            <p style="font-size:11px;color:#aaa;margin:0">© ${new Date().getFullYear()} Rakez Smart Solutions — جميع الحقوق محفوظة</p>
          </div>
        </div>
      </div>
    `,
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
