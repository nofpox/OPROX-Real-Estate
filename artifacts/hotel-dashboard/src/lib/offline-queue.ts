/**
 * Lightweight offline queue backed by localStorage.
 * Used to persist pending task mutations across page refreshes.
 * Only text-only operations (no binary/file uploads) can be safely queued.
 */

export type QueuedAction =
  | { type: "submit"; taskId: number }
  | { type: "recall"; taskId: number }
  | { type: "reopen"; taskId: number };

interface QueueEntry {
  id: string;
  action: QueuedAction;
  timestamp: number;
}

const QUEUE_KEY = "grand-pms:offline-queue";

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
  const queue = getQueue();
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, entry]));
  return entry.id;
}

export function dequeue(id: string): void {
  const queue = getQueue().filter((e) => e.id !== id);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function clearQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}
