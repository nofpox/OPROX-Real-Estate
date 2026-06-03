import { Router } from "express";
import { db, conversations, messages } from "@workspace/db";
import { openai } from "@workspace/integrations-openai-ai-server";
import { eq, asc } from "drizzle-orm";

const router = Router();

function buildPortalSystemPrompt(): string {
  return `You are Layla (ليلى), the AI Assistant for the Rkaz Real Estate Portal.

Persona:
- Warm, professional, and knowledgeable about real estate in Saudi Arabia
- Helpful with property inquiries, investment questions, and portfolio management
- Bilingual: responds in the same language the user writes in (Arabic or English)

Your capabilities:
- Answer questions about property listings, types, and locations
- Explain the investment and management process
- Help users understand compound, hotel, and corporate facility management
- Guide users through the investor portal features

Boundaries — you cannot:
- Access internal PMS (hotel management system) data
- Access other users' private information
- Make binding commitments or price quotations

Response style:
- Concise and professional
- Use bullet points for multi-item information
- Keep responses under 200 words unless detail is explicitly requested

Language: Detect from the user's message and reply in the same language.`;
}

router.get("/openai/conversations", async (req, res) => {
  const convList = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
  res.json(convList);
});

router.post("/openai/conversations", async (req, res) => {
  const { title } = req.body as { title?: string };
  const [conv] = await db
    .insert(conversations)
    .values({ title: title || "New Chat", agentType: "portal", userId: null, tenantId: 1 })
    .returning();
  res.status(201).json(conv);
});

router.delete("/openai/conversations/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  await db.delete(conversations).where(eq(conversations.id, id));
  res.status(204).end();
});

router.get("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const msgs = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  res.json(msgs);
});

router.post("/openai/conversations/:id/messages", async (req, res) => {
  const id = parseInt(req.params.id);
  const { content } = req.body as { content: string };
  if (!content?.trim()) { res.status(400).json({ error: "content is required" }); return; }

  const [conv] = await db.select().from(conversations).where(eq(conversations.id, id));
  if (!conv) { res.status(404).json({ error: "Conversation not found" }); return; }

  const history = await db.select().from(messages).where(eq(messages.conversationId, id)).orderBy(asc(messages.createdAt));
  const systemPrompt = buildPortalSystemPrompt();
  await db.insert(messages).values({ conversationId: id, role: "user", content });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const chatMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
    { role: "system", content: systemPrompt },
    ...history.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
    { role: "user", content },
  ];

  const heartbeat = setInterval(() => { try { res.write(": heartbeat\n\n"); } catch { /* gone */ } }, 15_000);
  let clientGone = false;
  req.on("close", () => { clientGone = true; });

  try {
    let fullResponse = "";
    const stream = await openai.chat.completions.create({
      model: "gpt-4.1",
      max_completion_tokens: 1024,
      messages: chatMessages,
      stream: true,
    });
    for await (const chunk of stream) {
      if (clientGone) { stream.controller.abort(); break; }
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) { fullResponse += delta; res.write(`data: ${JSON.stringify({ content: delta })}\n\n`); }
    }
    if (!clientGone) {
      await db.insert(messages).values({ conversationId: id, role: "assistant", content: fullResponse || "(no response)" });
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    }
  } catch (err) {
    req.log?.error({ err }, "AI chat stream error");
    if (!clientGone) res.write(`data: ${JSON.stringify({ error: "AI service unavailable" })}\n\n`);
  } finally {
    clearInterval(heartbeat);
  }
  res.end();
});

export default router;
