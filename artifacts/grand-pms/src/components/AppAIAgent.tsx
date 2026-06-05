import { useState, useRef, useCallback } from "react";
import { X, Send, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import type { AuthUser } from "@/App";

interface Message { role: "user" | "assistant"; content: string; isGreeting?: boolean; }
interface AppAIAgentProps { authUser: AuthUser | null; }

function buildGreeting(name: string|undefined, role: string|undefined): string {
  const fn = name?.split(" ")[0] || "";
  return `Hi${fn ? " " + fn : ""}! I'm Layla 👋\nYour AI assistant for Grand PMS.\n\nI'm here to help you with tasks, rooms, maintenance, and anything else. What can I help you with today?`;
}

const RULES: { pattern: RegExp; response: string }[] = [
  { pattern: /task|todo|pending|assign/i, response: "You can manage all tasks from the **Tasks** page. Use the Kanban board to move tasks between pending, in-progress, and completed. You can assign tasks to staff and set due dates." },
  { pattern: /room|unit|status|clean|maintenanc/i, response: "Room statuses can be updated from the **Properties** page or individual property detail pages. Available statuses are: Available, Occupied, Maintenance, and Cleaning." },
  { pattern: /staff|team|employee|schedule|shift/i, response: "Staff management is on the **Staff** page. You can add staff members, assign them to properties, and manage shifts from the **Shift Schedule** tab." },
  { pattern: /work.?order|repair|fix|broken/i, response: "Work orders are tracked on the **Maintenance** page. You can create new work orders, assign them to technicians, and track their status." },
  { pattern: /notification|alert/i, response: "Notifications appear in the bell icon in the top navigation. Click the bell to see unread notifications and mark them as read." },
  { pattern: /report|analytic|stat|chart/i, response: "The **Analytics** page provides detailed reports including task completion rates, staff performance, and property statistics. You can export reports as PDF." },
  { pattern: /setting|config|theme|color|logo/i, response: "App settings are on the **Admin Settings** page. You can customize the system name, logo, primary color, and configure which modules are enabled." },
  { pattern: /guest|request|visitor/i, response: "Guest service requests are on the **Guest Requests** page. You can view, prioritize, and update the status of incoming requests." },
  { pattern: /property|building|compound|apartment/i, response: "Your properties are listed on the **Properties** page. Click any property to see its units, work orders, and occupancy statistics." },
  { pattern: /hello|hi|hey|مرحبا|السلام/i, response: "Hello! How can I help you today? I can assist with tasks, rooms, staff, maintenance, and all other property management needs." },
  { pattern: /help|what can you|كيف/i, response: "I can help you with:\n• **Tasks** — create, assign, and track work\n• **Rooms** — check and update unit status\n• **Staff** — manage team members and shifts\n• **Maintenance** — create and track work orders\n• **Reports** — view analytics and statistics\n\nJust ask me anything!" },
];

function getResponse(input: string): string {
  for (const rule of RULES) {
    if (rule.pattern.test(input)) return rule.response;
  }
  return "I can help you with tasks, rooms, staff management, maintenance work orders, and property analytics. Could you give me a bit more detail about what you need?";
}

export function AppAIAgent({ authUser }: AppAIAgentProps) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const openChat = useCallback(() => {
    if (!open) {
      const greeting = buildGreeting(authUser?.displayName, authUser?.role);
      setMessages([{ role: "assistant", content: greeting, isGreeting: true }]);
      setOpen(true);
    } else setOpen(false);
  }, [open, authUser]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setThinking(true);
    await new Promise(r => setTimeout(r, 500 + Math.random() * 600));
    const response = getResponse(text);
    setMessages(prev => [...prev, { role: "assistant", content: response }]);
    setThinking(false);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  const isRtl = i18n.dir() === "rtl";

  return (
    <>
      <button onClick={openChat} className="fixed bottom-6 end-6 z-50 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-all" title="AI Assistant">
        {open ? <X className="h-5 w-5"/> : <Sparkles className="h-5 w-5"/>}
      </button>
      {open && (
        <div className={cn("fixed bottom-20 end-6 z-50 w-80 rounded-2xl shadow-2xl border bg-card text-card-foreground flex flex-col overflow-hidden", isRtl && "text-right")} style={{ height: "420px" }}>
          <div className="flex items-center justify-between px-4 py-3 border-b bg-primary/5">
            <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary"/><span className="font-semibold text-sm">Layla — AI Assistant</span></div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>setMessages([])}><Trash2 className="h-3.5 w-3.5"/></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={()=>setOpen(false)}><X className="h-3.5 w-3.5"/></Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex", msg.role==="user" ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed whitespace-pre-wrap", msg.role==="user" ? "bg-primary text-primary-foreground" : "bg-muted")}>
                  {msg.content}
                </div>
              </div>
            ))}
            {thinking && <div className="flex justify-start"><div className="bg-muted rounded-xl px-3 py-2 text-xs text-muted-foreground">Layla is thinking…</div></div>}
            <div ref={bottomRef}/>
          </div>
          <div className="border-t p-2 flex gap-2">
            <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder="Ask me anything…" className="flex-1 text-xs bg-muted rounded-lg px-3 py-2 outline-none placeholder:text-muted-foreground"/>
            <Button size="icon" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!input.trim()||thinking}><Send className="h-3.5 w-3.5"/></Button>
          </div>
        </div>
      )}
    </>
  );
}
