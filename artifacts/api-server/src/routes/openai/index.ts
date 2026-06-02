import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, asc } from "drizzle-orm";
import type { SessionUser } from "../auth.js";

const router = Router();

function getCaller(req: import("express").Request): SessionUser | undefined {
  return (req as any).sessionUser as SessionUser | undefined;
}

function buildSystemPrompt(agentType: string, context: Record<string, unknown> = {}): string {
  if (agentType === "platform") {
    const snap = context as {
      propertyCount?: number;
      staffCount?: number;
      openWorkOrders?: number;
      bookingCount?: number;
      taskCompletionRate?: number;
      openTaskCount?: number;
    };
    return `You are an AI administrative assistant for the Owner of Rakez Smart Solutions PMS (Grand PMS).
You have full diagnostic visibility across the entire platform and all tenants.

Your capabilities:
- System-wide diagnostics and health reporting
- Staff performance and workload analysis
- Financial summaries, revenue trends, and cash-flow insights
- Occupancy analysis and booking pattern insights
- Tenant and property management advice
- Actionable, data-driven recommendations

Current system snapshot:
- Properties: ${snap.propertyCount ?? "unknown"}
- Active staff: ${snap.staffCount ?? "unknown"}
- Open work orders: ${snap.openWorkOrders ?? "unknown"}
- Open tasks: ${snap.openTaskCount ?? "unknown"}
- Task completion rate: ${snap.taskCompletionRate != null ? snap.taskCompletionRate + "%" : "unknown"}
- Active bookings this period: ${snap.bookingCount ?? "unknown"}

Respond concisely, use bullet points for data summaries, and suggest concrete next steps.
Support both English and Arabic — reply in whichever language the owner writes in.`;
  }

  const ctx = context as {
    name?: string;
    role?: string;
    property?: string;
    taskCount?: number;
    page?: string;
  };

  return `You are a helpful, proactive AI assistant embedded in the Rakez Smart Solutions PMS (Grand PMS).

Current user: ${ctx.name || "a team member"}
Role: ${ctx.role || "staff"}
Current page: ${ctx.page || "dashboard"}
Open tasks assigned to them: ${ctx.taskCount ?? 0}

Your job:
- Guide this user through their daily PMS operations
- Answer questions about tasks, bookings, maintenance, rooms, guests, and shifts
- Offer step-by-step help for workflows (e.g. how to check in a guest, how to complete a work order)
- Be concise and practical — no lengthy preambles

Boundaries — you cannot:
- Access admin configuration, billing, or system settings
- Create or permanently modify any data
- View other users' private data outside this user's scope

Reply in the same language the user writes in (supports Arabic and English). Keep answers short and actionable.`;
}

// GET /openai/conversations
router.get("/conversations", async (req, res) => {
  const user = getCaller(req);
  const tenantId = user?.tenantId ?? null;
  const userId = user?.id ?? null;

  const convList = await db
    .select()
    .from(conversations)
    .where(
      tenantId
        ? eq(conversations.tenantId, tenantId)
        : eq(conversations.userId, userId as number)
    )
    .orderBy(asc(conversations.createdAt));

  res.json(convList);
});

// POST /openai/conversations
router.post("/conversations", async (req, res) => {
  const user = getCaller(req);
  const { title, agentType = "app" } = req.body as { title?: string; agentType?: string };

  const [conv] = await db
    .insert(conversations)
    .values({
      title: title || "New Chat",
      agentType,
      userId: user?.id ?? null,
      tenantId: user?.tenantId ?? null,
    })
    .returning();

  res.status(201).json(conv);
});

// DELETE /openai/conversations/:id
router.delete("/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

// GET /openai/conversations/:id/messages
router.get("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  res.json(msgs);
});

// POST /openai/conversations/:id/messages — SSE streaming
router.post("/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { content, context } = req.body as { content: string; context?: Record<string, unknown> };

  if (!content?.trim()) {
    res.status(400).json({ error: "content is required" });
    return;
  }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) {
    res.status(404).json({ error: "Conversation not found" });
    return;
  }

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = buildSystemPrompt(conv.agentType, context ?? {});

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content },
  ];

  try {
    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 2048,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    await db.insert(messages).values({
      conversationId: id,
      role: "assistant",
      content: fullResponse || "(no response)",
    });

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    req.log.error({ err }, "AI chat stream error");
    res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
  }

  res.end();
});

export default router;
