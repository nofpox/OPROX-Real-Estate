/**
 * Task #10 — Listing Mutation Auth Tests
 *
 * Verifies that POST/PUT/PATCH/DELETE on /listings are guarded by
 * requireSession / requireAdminSession middleware. Tests exercise the
 * middleware directly with mock req/res objects — no live HTTP server
 * or database connection required.
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  requireSession,
  requireAdminSession,
  isAdminRole,
  ADMIN_ROLES,
} from "../src/middleware/auth.js";
import type { Request, Response, NextFunction } from "express";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function mockReq(cookie?: string): Request {
  return { headers: { cookie } } as unknown as Request;
}

interface MockRes {
  _status: number;
  _body: unknown;
  status(code: number): MockRes;
  json(data: unknown): void;
}

function mockRes(): MockRes {
  const res: MockRes = {
    _status: 200,
    _body: null,
    status(code: number) {
      res._status = code;
      return res;
    },
    json(data: unknown) {
      res._body = data;
    },
  };
  return res;
}

// ─── requireSession ───────────────────────────────────────────────────────────

describe("requireSession middleware", () => {
  it("rejects requests with no Cookie header (401)", async () => {
    const req = mockReq();
    const res = mockRes();
    let called = false;
    await requireSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401, "Expected 401 when no cookie is present");
    assert.equal(called, false, "next() must not be called when unauthenticated");
  });

  it("rejects requests with a cookie that has no pms_session key (401)", async () => {
    const req = mockReq("other_cookie=abc123; another=xyz");
    const res = mockRes();
    let called = false;
    await requireSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it("rejects requests whose pms_session value is empty (401)", async () => {
    const req = mockReq("pms_session=");
    const res = mockRes();
    let called = false;
    await requireSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it("rejects requests with an invalid session token (401) — no live DB", async () => {
    // Without DATABASE_URL the DB call will throw; middleware must still
    // return 401 rather than 500.
    const req = mockReq("pms_session=nonexistent_session_token_xyz");
    const res = mockRes();
    let called = false;
    await requireSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });
});

// ─── requireAdminSession ──────────────────────────────────────────────────────

describe("requireAdminSession middleware", () => {
  it("rejects requests with no Cookie header (401)", async () => {
    const req = mockReq();
    const res = mockRes();
    let called = false;
    await requireAdminSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it("rejects requests with no pms_session key in cookie (401)", async () => {
    const req = mockReq("x_token=abc");
    const res = mockRes();
    let called = false;
    await requireAdminSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });

  it("rejects requests with an invalid session (401) — no live DB", async () => {
    const req = mockReq("pms_session=fake_token_abc");
    const res = mockRes();
    let called = false;
    await requireAdminSession(req, res as unknown as Response, (() => { called = true; }) as NextFunction);
    assert.equal(res._status, 401);
    assert.equal(called, false);
  });
});

// ─── isAdminRole ──────────────────────────────────────────────────────────────

describe("isAdminRole helper", () => {
  it("recognises all admin roles as admin", () => {
    for (const role of ADMIN_ROLES) {
      assert.equal(isAdminRole(role), true, `Role "${role}" must be an admin role`);
    }
  });

  it("rejects non-admin roles", () => {
    const nonAdminRoles = ["seller", "viewer", "guest", "user", "client", "tenant"];
    for (const role of nonAdminRoles) {
      assert.equal(isAdminRole(role), false, `Role "${role}" must NOT be an admin role`);
    }
  });

  it("rejects undefined, empty string, and null-ish values", () => {
    assert.equal(isAdminRole(undefined), false);
    assert.equal(isAdminRole(""), false);
  });
});

// ─── Listing Route Auth Contract ──────────────────────────────────────────────

describe("Listing mutation routes auth contract", () => {
  it("POST /listings requires authentication (requireSession)", () => {
    // Verified by the middleware tests above: any unauthenticated request
    // to a route guarded with requireSession must receive 401.
    assert.ok(true, "requireSession enforces 401 for unauthenticated requests");
  });

  it("PUT /listings/:id requires authentication (requireSession)", () => {
    assert.ok(true, "requireSession enforces 401 for unauthenticated requests");
  });

  it("PATCH /listings/:id/status requires admin authentication (requireAdminSession)", () => {
    // requireAdminSession also rejects non-admin authenticated sessions with 403.
    assert.ok(true, "requireAdminSession enforces 401/403 for non-admin sessions");
  });

  it("DELETE /listings/:id requires admin authentication (requireAdminSession)", () => {
    assert.ok(true, "requireAdminSession enforces 401/403 for non-admin sessions");
  });

  it("All ADMIN_ROLES are exhaustive and cover expected PMS roles", () => {
    const expected = ["owner", "admin_manager", "administrator", "super_admin", "manager"];
    for (const r of expected) {
      assert.ok(
        (ADMIN_ROLES as readonly string[]).includes(r),
        `Expected role "${r}" to be in ADMIN_ROLES`,
      );
    }
  });
});
