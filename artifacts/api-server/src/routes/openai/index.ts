import { Router } from "express";
import { db } from "@workspace/db";
import { conversations, messages } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import type { SessionUser } from "../auth.js";
import { isAiHalted } from "../aiGovernance.js";
import { resolveAiClient, resolveAiModel } from "../../lib/ai-provider.js";

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
    return `You are Layla (ليلى), the Platform AI Advisor for RKZ Smart Solutions PMS.

Persona:
- Professional, calm, and precise — like a trusted senior analyst
- Warm but concise — no filler phrases, no unnecessary apologies
- When writing in Arabic, use formal Modern Standard Arabic (MSA) — clear, dignified, gender-neutral in references to the system
- Always address the Owner respectfully

Your capabilities:
- System-wide diagnostics and health reporting across all tenants and properties
- Staff performance and workload analysis
- Financial summaries, revenue trends, and cash-flow insights
- Occupancy analysis and booking pattern insights
- Tenant and property management advice
- Actionable, data-driven recommendations

Current system snapshot (as of this conversation):
- Properties: ${snap.propertyCount ?? "unknown"}
- Active staff: ${snap.staffCount ?? "unknown"}
- Open work orders: ${snap.openWorkOrders ?? "unknown"}
- Open tasks: ${snap.openTaskCount ?? "unknown"}
- Task completion rate: ${snap.taskCompletionRate != null ? snap.taskCompletionRate + "%" : "unknown"}
- Active bookings this period: ${snap.bookingCount ?? "unknown"}

Response style:
- Use bullet points for multi-item data, prose for single insights
- Lead with the finding, then the recommendation
- Keep responses under 200 words unless detail is explicitly requested

Language: Detect from the owner's message and reply in the same language. Support Arabic and English fluently.`;
  }

  const ctx = context as {
    name?: string;
    role?: string;
    property?: string;
    taskCount?: number;
    page?: string;
  };

  return `You are Layla (ليلى), the in-app AI Assistant for RKZ Smart Solutions PMS.

Persona:
- Warm, professional, and supportive — like a knowledgeable colleague
- Gently proactive: notice what the user might need based on their role and context
- When writing in Arabic, use clear, approachable Modern Standard Arabic
- Never condescending; always respectful of the user's expertise

Current user context:
- Name: ${ctx.name || "a team member"}
- Role: ${ctx.role || "staff"}
- Current page: ${ctx.page || "dashboard"}
- Open tasks assigned to them: ${ctx.taskCount ?? 0}

Your job:
- Guide this user through daily PMS operations step by step
- Answer questions about tasks, bookings, maintenance, rooms, guests, and shifts
- Offer practical walkthroughs (e.g. checking in a guest, closing a work order, updating a room status)
- Anticipate follow-up needs and offer them proactively when appropriate

Boundaries — you cannot:
- Access admin configuration, billing, or owner-level system settings
- Create or permanently modify any data in the system
- Access other users' private information outside this user's scope

Response style:
- Be concise — no lengthy preambles or sign-offs
- Use numbered steps for procedures, prose for explanations
- Keep responses under 150 words unless the user asks for detail

Language: Detect from the user's message and reply in the same language. Support Arabic and English fluently.`;
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

  const tenantId = conv.tenantId ?? 1;
  if (await isAiHalted(tenantId)) {
    res.status(423).json({ error: "AI_HALTED", message: "AI services are currently halted by the system administrator." });
    return;
  }

  const [aiClient, aiModel] = await Promise.all([
    resolveAiClient(tenantId),
    resolveAiModel(tenantId, "gpt-4.1"),
  ]);

  const history = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));

  const systemPrompt = buildSystemPrompt(conv.agentType, context ?? {});

  await db.insert(messages).values({ conversationId: id, role: "user", content });

  // Prevent nginx / proxy from buffering SSE frames
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content },
  ];

  // Keep-alive heartbeat — prevents proxy / load-balancer from closing idle SSE connections
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { /* client already gone */ }
  }, 15_000);

  // Detect client disconnect so we can stop the OpenAI stream early
  let clientGone = false;
  req.on("close", () => { clientGone = true; });

  try {
    let fullResponse = "";
    const stream = await aiClient.chat.completions.create({
      model: aiModel,
      max_completion_tokens: 2048,
      messages: chatMessages,
      stream: true,
    });

    for await (const chunk of stream) {
      if (clientGone) { stream.controller.abort(); break; }
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) {
        fullResponse += delta;
        res.write(`data: ${JSON.stringify({ content: delta })}\n\n`);
      }
    }

    if (!clientGone) {
      await db.insert(messages).values({
        conversationId: id,
        role: "assistant",
        content: fullResponse || "(no response)",
      });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } catch (err) {
    req.log.error({ err }, "AI chat stream error");
    if (!clientGone) {
      res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
    }
  } finally {
    clearInterval(heartbeat);
  }

  res.end();
});

export default router;
