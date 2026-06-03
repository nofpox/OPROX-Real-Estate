import { Router } from "express";
import { db, supportTicketsTable } from "@workspace/db";

const router = Router();

router.post("/portal/contact", async (req, res) => {
  const { subject, message } = req.body ?? {};
  if (!subject || !message) {
    res.status(400).json({ error: "subject and message are required" });
    return;
  }
  try {
    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        tenantId:    1,
        category:    "portal_inquiry",
        title:       String(subject).trim().substring(0, 255),
        description: String(message).trim(),
        status:      "open",
      })
      .returning();
    res.status(201).json({ success: true, ticketId: ticket.id });
  } catch (err) {
    req.log?.error({ err }, "POST /portal/contact failed");
    res.status(500).json({ error: "Failed to submit contact" });
  }
});

export default router;
