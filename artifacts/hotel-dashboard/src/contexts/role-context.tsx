import React, { createContext, useContext, useState } from "react";

export type AppRole = "manager" | "front-desk" | "housekeeping" | "maintenance" | "security";

export interface RoleDefinition {
  id: AppRole;
  label: string;
  description: string;
  allowedNav: string[];
  taskCategories: string[] | null;
}

export const ROLES: RoleDefinition[] = [
  {
    id: "manager",
    label: "Manager",
    description: "Full access to all features",
    allowedNav: ["/", "/bookings", "/properties", "/rooms", "/guests", "/finance", "/maintenance", "/staff", "/tasks"],
    taskCategories: null,
  },
  {
    id: "front-desk",
    label: "Front Desk",
    description: "Bookings, guests, and room management",
    allowedNav: ["/", "/bookings", "/rooms", "/guests"],
    taskCategories: ["reception", "general"],
  },
  {
    id: "housekeeping",
    label: "Housekeeping",
    description: "Housekeeping tasks and room status",
    allowedNav: ["/rooms", "/tasks"],
    taskCategories: ["housekeeping"],
  },
  {
    id: "maintenance",
    label: "Maintenance",
    description: "Work orders and maintenance tasks",
    allowedNav: ["/maintenance", "/tasks"],
    taskCategories: ["maintenance"],
  },
  {
    id: "security",
    label: "Security",
    description: "Security tasks and property access",
    allowedNav: ["/tasks"],
    taskCategories: ["security"],
  },
];

interface RoleContextValue {
  role: RoleDefinition;
  setRoleId: (id: AppRole) => void;
  can: (path: string) => boolean;
  allowedTaskCategories: string[] | null;
}

const RoleContext = createContext<RoleContextValue | null>(null);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [roleId, setRoleId] = useState<AppRole>("manager");
  const role = ROLES.find((r) => r.id === roleId)!;

  const can = (path: string) => {
    if (role.id === "manager") return true;
    return role.allowedNav.some((allowed) =>
      path === "/" ? allowed === "/" : allowed === path || path.startsWith(allowed + "/")
    );
  };

  return (
    <RoleContext.Provider value={{ role, setRoleId, can, allowedTaskCategories: role.taskCategories }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
