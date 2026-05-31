/**
 * Lightweight offline queue for the Staff Tablet.
 * Backed by localStorage so pending actions survive page refreshes.
 * Only text/JSON operations — no binary uploads.
 */

export type QueuedAction =
  | { type: "updateStatus"; roomId: number; status: string }
  | { type: "resolveRequest"; requestId: number };

interface QueueEntry {
  id: string;
  action: QueuedAction;
  timestamp: number;
}

const QUEUE_KEY = "rakz-tablet:offline-queue";

export function getQueue(): QueueEntry[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function enqueue(action: QueuedAction): string {
  const entry: QueueEntry = {
    id: Math.random().toString(36).slice(2),
    action,
    timestamp: Date.now(),
  };
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...getQueue(), entry]));
  return entry.id;
}

export function dequeue(id: string): void {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(getQueue().filter((e) => e.id !== id)));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
