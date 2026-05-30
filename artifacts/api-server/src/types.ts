/**
 * Shared type definitions that must not create circular imports.
 * Import from here when both auth.ts and session-store.ts need the same type.
 */

export type SessionUser = {
  id: number;
  username: string;
  displayName: string;
  email: string | null;
  phoneNumber: string | null;
  role: string;
  permissions: string[];
  isActive: boolean;
  createdAt: string;
  mustChangePassword: boolean;
  tenantId: number | null;
  isSuperAdmin: boolean;
};
