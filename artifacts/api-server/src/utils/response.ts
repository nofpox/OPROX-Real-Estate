import type { Response } from "express";

export interface ApiMeta {
  total?:      number;
  page?:       number;
  limit?:      number;
  totalPages?: number;
  [key: string]: unknown;
}

// ── Standard envelope ─────────────────────────────────────────────────────────
// { status, data, meta, timestamp }
export function sendSuccess<T>(res: Response, data: T, meta?: ApiMeta, statusCode = 200): void {
  res.status(statusCode).json({
    status:    "success",
    data,
    meta:      meta ?? null,
    timestamp: new Date().toISOString(),
  });
}

export function sendError(res: Response, statusCode: number, message: string, code?: string): void {
  res.status(statusCode).json({
    status:    "error",
    error:     message,
    code:      code ?? null,
    timestamp: new Date().toISOString(),
  });
}

// ── Pagination helpers ────────────────────────────────────────────────────────
export function parsePagination(query: Record<string, unknown>): { page: number; limit: number; offset: number } {
  const page  = Math.max(1, parseInt(String(query.page  ?? "1"),    10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(String(query.limit ?? "20"), 10) || 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function buildMeta(total: number, page: number, limit: number): ApiMeta {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}
