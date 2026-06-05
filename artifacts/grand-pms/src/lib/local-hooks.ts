/**
 * LOCAL HOOKS — Drop-in replacements for @workspace/api-client-react
 * All operations are synchronous on local in-memory data.
 * Uses React Query for caching/invalidation exactly as the real hooks did.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  PROPERTIES, ROOMS, STAFF, TASKS, WORK_ORDERS, SHIFTS,
  NOTIFICATIONS, ACTIVITY_LOGS, SUPPORT_TICKETS, APP_SETTINGS,
  nextId, generateHeatmap,
  type Property, type Room, type Staff, type Task, type WorkOrder,
  type Shift, type Notification, type ActivityLog, type SupportTicket,
} from "./local-data";

const LOCAL_TASK_COMMENTS: any[] = [];

// ── Query key factories ───────────────────────────────────────────────────────

export const getListPropertiesQueryKey   = () => ["listProperties"];
export const getListRoomsQueryKey        = () => ["listRooms"];
export const getListStaffQueryKey        = (_?: any) => ["listStaff"];
export const getListTasksQueryKey        = (_?: any) => ["listTasks"];
export const getListWorkOrdersQueryKey   = (_?: any) => ["listWorkOrders"];
export const getListShiftsQueryKey       = (_?: any) => ["listShifts"];
export const getListNotificationsQueryKey = (_?: any) => ["listNotifications"];
export const getListActivityLogsQueryKey  = (_?: any) => ["listActivityLogs"];
export const getListSupportTicketsQueryKey = (_?: any) => ["listSupportTickets"];
export const getGetPropertyQueryKey      = (id: number) => ["getProperty", id];
export const getGetPropertyStatsQueryKey = (id: number) => ["getPropertyStats", id];
export const getGetSettingsQueryKey      = () => ["getSettings"];
export const getListUsersQueryKey        = (_?: any) => ["listUsers"];
export const getListCustomRolesQueryKey  = () => ["listCustomRoles"];
export const getListTenantsQueryKey      = () => ["listTenants"];
export const getListActiveSessionsQueryKey = () => ["listActiveSessions"];
export const getListCustomFieldsQueryKey = () => ["listCustomFields"];

// ── Generic mutation result ───────────────────────────────────────────────────

function ok<T>(data: T) { return data; }

// ── PROPERTIES ────────────────────────────────────────────────────────────────

export function useListProperties() {
  return useQuery({ queryKey: getListPropertiesQueryKey(), queryFn: () => [...PROPERTIES], staleTime: Infinity });
}

export function useGetProperty(id: number, _opts?: any) {
  return useQuery({ queryKey: getGetPropertyQueryKey(id), queryFn: () => PROPERTIES.find(p => p.id === id) ?? null, staleTime: Infinity });
}

export function useGetPropertyStats(id: number, _opts?: any) {
  return useQuery({
    queryKey: getGetPropertyStatsQueryKey(id),
    queryFn: () => {
      const rooms = ROOMS.filter(r => r.propertyId === id);
      return {
        totalRooms: rooms.length,
        availableRooms: rooms.filter(r => r.status === "available").length,
        occupiedRooms: rooms.filter(r => r.status === "occupied").length,
        maintenanceRooms: rooms.filter(r => r.status === "maintenance").length,
        openWorkOrders: WORK_ORDERS.filter(w => w.propertyId === id && w.status !== "completed").length,
      };
    },
    staleTime: Infinity,
  });
}

export function useCreateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Property> }) => {
      const np: Property = { id: nextId(), name: data.name ?? "", address: data.address ?? "", city: data.city ?? "", country: data.country ?? "Saudi Arabia", description: data.description, status: data.status ?? "active", unitCount: 0, type: data.type ?? "hotel" };
      PROPERTIES.push(np); return np;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() }),
  });
}

export function useUpdateProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Property> }) => {
      const idx = PROPERTIES.findIndex(p => p.id === id);
      if (idx >= 0) Object.assign(PROPERTIES[idx], data);
      return PROPERTIES[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() }),
  });
}

export function useDeleteProperty() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = PROPERTIES.findIndex(p => p.id === id); if (i >= 0) PROPERTIES.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListPropertiesQueryKey() }),
  });
}

// ── ROOMS ─────────────────────────────────────────────────────────────────────

export function useListRooms(_params?: any) {
  return useQuery({ queryKey: getListRoomsQueryKey(), queryFn: () => [...ROOMS], staleTime: Infinity });
}

export function useCreateRoom(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Room> }) => {
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      const nr: Room = { id: nextId(), name: data.name ?? "", type: data.type ?? "Standard", status: data.status ?? "available", capacity: data.capacity ?? 2, pricePerNight: data.pricePerNight ?? 0, propertyId: data.propertyId ?? 0, propertyName: prop?.name };
      ROOMS.push(nr);
      if (prop) prop.unitCount = ROOMS.filter(r => r.propertyId === prop.id).length;
      return nr;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey() }),
  });
}

export function useCreateRoomsBulk(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: { propertyId: number; prefix: string; start: number; end: number; type: string; status: string; capacity: number; pricePerNight: number } }) => {
      const created: Room[] = [];
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      for (let i = data.start; i <= data.end; i++) {
        const nr: Room = { id: nextId(), name: `${data.prefix}${i}`, type: data.type, status: data.status, capacity: data.capacity, pricePerNight: data.pricePerNight, propertyId: data.propertyId, propertyName: prop?.name };
        ROOMS.push(nr); created.push(nr);
      }
      if (prop) prop.unitCount = ROOMS.filter(r => r.propertyId === prop.id).length;
      return created;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey() }),
  });
}

export function useUpdateRoom(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Room> }) => {
      const idx = ROOMS.findIndex(r => r.id === id);
      if (idx >= 0) Object.assign(ROOMS[idx], data);
      return ROOMS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey() }),
  });
}

export function useDeleteRoom(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => {
      const r = ROOMS.find(r => r.id === id);
      const i = ROOMS.findIndex(r => r.id === id);
      if (i >= 0) ROOMS.splice(i, 1);
      const prop = PROPERTIES.find(p => p.id === r?.propertyId);
      if (prop) prop.unitCount = ROOMS.filter(rm => rm.propertyId === prop.id).length;
      return ok(true);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListRoomsQueryKey() }),
  });
}

// ── STAFF ─────────────────────────────────────────────────────────────────────

export function useListStaff(_params?: any) {
  return useQuery({ queryKey: getListStaffQueryKey(), queryFn: () => [...STAFF], staleTime: Infinity });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Staff> }) => {
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      const ns: Staff = { id: nextId(), name: data.name ?? "", role: data.role ?? "", systemRole: data.systemRole ?? "supervisor", email: data.email ?? "", phone: data.phone, propertyId: data.propertyId as number | undefined, propertyName: prop?.name, status: data.status ?? "active", invitePending: false, hasAccount: false };
      STAFF.push(ns);
      return { ...ns, inviteCode: "123456", username: data.email?.split("@")[0] ?? "user" };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListStaffQueryKey() }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Staff> }) => {
      const idx = STAFF.findIndex(s => s.id === id);
      if (idx >= 0) Object.assign(STAFF[idx], data);
      return STAFF[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListStaffQueryKey() }),
  });
}

export function useDeleteStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = STAFF.findIndex(s => s.id === id); if (i >= 0) STAFF.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListStaffQueryKey() }),
  });
}

export function useResendStaffInvite() {
  return useMutation({ mutationFn: async (_: { id: number }) => ok(true) });
}

export function useBulkCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: { members: Partial<Staff>[] } }) => {
      const created = data.members.map(m => {
        const ns: Staff = { id: nextId(), name: m.name ?? "", role: m.role ?? "", systemRole: (m as any).systemRole ?? "supervisor", email: m.email ?? "", phone: m.phone, propertyId: m.propertyId as number | undefined, status: m.status ?? "active", invitePending: false, hasAccount: false };
        STAFF.push(ns); return ns;
      });
      return { created: created.length, errors: [] };
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListStaffQueryKey() }),
  });
}

// ── TASKS ─────────────────────────────────────────────────────────────────────

export function useListTasks(_params?: any) {
  return useQuery({ queryKey: getListTasksQueryKey(), queryFn: () => [...TASKS], staleTime: Infinity });
}

export function useCreateTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Task> }) => {
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      const assignee = STAFF.find(s => s.id === data.assignedToId);
      const room = ROOMS.find(r => r.id === data.unitId);
      const nt: Task = {
        id: nextId(), title: data.title ?? "", category: data.category ?? "general",
        status: data.status ?? "pending", priority: data.priority ?? "medium",
        propertyId: data.propertyId ?? 0, propertyName: prop?.name,
        unitId: data.unitId, unitName: room?.name,
        assignedToId: data.assignedToId, assigneeName: assignee?.name,
        description: data.description, dueDate: data.dueDate,
        createdAt: new Date().toISOString(), reportStatus: "none",
      };
      TASKS.push(nt); return nt;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() }),
  });
}

export function useUpdateTask(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Task> }) => {
      const idx = TASKS.findIndex(t => t.id === id);
      if (idx >= 0) {
        Object.assign(TASKS[idx], data);
        if (data.status === "completed" && !TASKS[idx].completedAt) TASKS[idx].completedAt = new Date().toISOString();
      }
      return TASKS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = TASKS.findIndex(t => t.id === id); if (i >= 0) TASKS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey() }),
  });
}

export function useCreateTaskComment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: { taskId: number; authorName: string; body: string; imageUrl?: string } }) => {
      const comment = { id: Date.now(), taskId: id, ...data, createdAt: new Date().toISOString() };
      LOCAL_TASK_COMMENTS.push(comment);
      return comment;
    },
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: [`/tasks/${vars.id}/comments`] }),
  });
}

// ── WORK ORDERS ───────────────────────────────────────────────────────────────

export function useListWorkOrders(_params?: any) {
  return useQuery({
    queryKey: getListWorkOrdersQueryKey(_params),
    queryFn: () => {
      let data = [...WORK_ORDERS];
      if (_params?.propertyId) data = data.filter(w => w.propertyId === _params.propertyId);
      if (_params?.status) data = data.filter(w => w.status === _params.status);
      if (_params?.priority) data = data.filter(w => w.priority === _params.priority);
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<WorkOrder> }) => {
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      const room = ROOMS.find(r => r.id === data.unitId);
      const nw: WorkOrder = { id: nextId(), title: data.title ?? "", description: data.description, priority: data.priority ?? "medium", status: data.status ?? "pending", propertyId: data.propertyId ?? 0, propertyName: prop?.name, unitId: data.unitId, unitName: room?.name, assignedTo: data.assignedTo, dueDate: data.dueDate, createdAt: new Date().toISOString() };
      WORK_ORDERS.push(nw); return nw;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listWorkOrders"] }),
  });
}

export function useUpdateWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<WorkOrder> }) => {
      const idx = WORK_ORDERS.findIndex(w => w.id === id);
      if (idx >= 0) Object.assign(WORK_ORDERS[idx], data);
      return WORK_ORDERS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listWorkOrders"] }),
  });
}

export function useDeleteWorkOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = WORK_ORDERS.findIndex(w => w.id === id); if (i >= 0) WORK_ORDERS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listWorkOrders"] }),
  });
}

// ── SHIFTS ────────────────────────────────────────────────────────────────────

export function useListShifts(_params?: any) {
  return useQuery({ queryKey: getListShiftsQueryKey(), queryFn: () => [...SHIFTS], staleTime: Infinity });
}

export function useCreateShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<Shift> }) => {
      const staff = STAFF.find(s => s.id === data.staffId);
      const prop = PROPERTIES.find(p => p.id === data.propertyId);
      const ns: Shift = { id: nextId(), staffId: data.staffId ?? 0, staffName: staff?.name, propertyId: data.propertyId ?? 0, propertyName: prop?.name, date: data.date ?? "", shiftType: data.shiftType ?? "morning", startTime: data.startTime ?? "07:00", endTime: data.endTime ?? "15:00", notes: data.notes };
      SHIFTS.push(ns); return ns;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListShiftsQueryKey() }),
  });
}

export function useDeleteShift() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = SHIFTS.findIndex(s => s.id === id); if (i >= 0) SHIFTS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListShiftsQueryKey() }),
  });
}

// ── NOTIFICATIONS ─────────────────────────────────────────────────────────────

export function useListNotifications(_params?: any) {
  return useQuery({ queryKey: getListNotificationsQueryKey(), queryFn: () => [...NOTIFICATIONS], staleTime: Infinity });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const n = NOTIFICATIONS.find(n => n.id === id); if (n) n.isRead = true; return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => { NOTIFICATIONS.forEach(n => n.isRead = true); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() }),
  });
}

export function useGenerateNotifications() {
  return useMutation({ mutationFn: async () => ({ generated: 0 }) });
}

// ── ACTIVITY LOGS ─────────────────────────────────────────────────────────────

export function useListActivityLogs(_params?: any) {
  return useQuery({ queryKey: getListActivityLogsQueryKey(), queryFn: () => [...ACTIVITY_LOGS], staleTime: Infinity });
}

// ── SETTINGS ──────────────────────────────────────────────────────────────────

export function useGetSettings(_opts?: any) {
  return useQuery({ queryKey: getGetSettingsQueryKey(), queryFn: () => ({ ...APP_SETTINGS }), staleTime: Infinity });
}

export function useUpdateSettings(_opts?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: any }) => { Object.assign(APP_SETTINGS, data); return { ...APP_SETTINGS }; },
    onSettled: () => qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }),
  });
}

// ── SUPPORT TICKETS ───────────────────────────────────────────────────────────

export function useListSupportTickets(_params?: any) {
  return useQuery({
    queryKey: getListSupportTicketsQueryKey(),
    queryFn: () => {
      let data = [...SUPPORT_TICKETS];
      if (_params?.status) data = data.filter(t => t.status === _params.status);
      return data;
    },
    staleTime: Infinity,
  });
}

export function useCreateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<SupportTicket> }) => {
      const nt: SupportTicket = { id: nextId(), title: data.title ?? "", description: data.description ?? "", category: data.category ?? "issue", status: "open", adminNotes: "", createdAt: new Date().toISOString() };
      SUPPORT_TICKETS.push(nt); return nt;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() }),
  });
}

export function useUpdateSupportTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SupportTicket> }) => {
      const idx = SUPPORT_TICKETS.findIndex(t => t.id === id);
      if (idx >= 0) Object.assign(SUPPORT_TICKETS[idx], data);
      return SUPPORT_TICKETS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListSupportTicketsQueryKey() }),
  });
}

// ── OCCUPANCY HEATMAP ─────────────────────────────────────────────────────────

export function useGetOccupancyHeatmap(_params?: any) {
  return useQuery({ queryKey: ["occupancyHeatmap"], queryFn: () => generateHeatmap(_params?.days ?? 42), staleTime: Infinity });
}

// ── USERS (User Management) ───────────────────────────────────────────────────

export type PmsUser = { id: number; username: string; displayName: string; email: string; role: string; status: string };
export type ActiveSession = { id: number; userId: number; displayName: string; role: string; ip: string; lastSeen: string };
export type CustomRole = { id: number; name: string; description: string; permissions: string[] };
export type CustomField = { id: number; entityType: string; fieldType: string; label: string; isRequired: boolean; options: string[] };
export type CreateCustomFieldInput = Partial<CustomField>;
export type UpdateCustomFieldInput = Partial<CustomField>;
export type NavConfigItem = { id: string; order: number; visible: boolean };
export type PermissionMatrix = Record<string, string[]>;
export type ServiceCategory = { id: number; slug: string; label: string; icon: string; color: string; isActive: boolean; responseTimeMin: number; sortOrder: number };
export type Tenant = { id: number; slug: string; name: string; status: string; createdAt: string };
export type CreateTenantInput = Partial<Tenant>;

const LOCAL_PMS_USERS: PmsUser[] = [
  { id: 1, username: "admin", displayName: "Nada Yousef", email: "admin@grandpms.com", role: "manager", status: "active" },
  { id: 2, username: "manager", displayName: "Sara Al-Qahtani", email: "manager@grandpms.com", role: "supervisor", status: "active" },
  { id: 3, username: "worker", displayName: "Khalid Al-Dosari", email: "worker@grandpms.com", role: "maintenance", status: "active" },
];

const LOCAL_CUSTOM_ROLES: CustomRole[] = [];
const LOCAL_CUSTOM_FIELDS: CustomField[] = [];
const LOCAL_SERVICE_CATEGORIES: ServiceCategory[] = [
  { id: 1, slug: "electrical", label: "Electrical", icon: "zap", color: "yellow", isActive: true, responseTimeMin: 60, sortOrder: 1 },
  { id: 2, slug: "plumbing", label: "Plumbing", icon: "droplets", color: "blue", isActive: true, responseTimeMin: 60, sortOrder: 2 },
  { id: 3, slug: "cleaning", label: "Cleaning", icon: "brush", color: "green", isActive: true, responseTimeMin: 30, sortOrder: 3 },
];
const LOCAL_TENANTS: Tenant[] = [
  { id: 1, slug: "grandpms", name: "Grand PMS", status: "active", createdAt: new Date().toISOString() },
];

export function useListUsers(_?: any) {
  return useQuery({ queryKey: getListUsersQueryKey(), queryFn: () => [...LOCAL_PMS_USERS], staleTime: Infinity });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<PmsUser> }) => {
      const nu = { id: nextId(), username: data.username ?? "", displayName: data.displayName ?? "", email: data.email ?? "", role: data.role ?? "supervisor", status: "active" };
      LOCAL_PMS_USERS.push(nu); return nu;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<PmsUser> }) => {
      const idx = LOCAL_PMS_USERS.findIndex(u => u.id === id);
      if (idx >= 0) Object.assign(LOCAL_PMS_USERS[idx], data);
      return LOCAL_PMS_USERS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }),
  });
}

export function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = LOCAL_PMS_USERS.findIndex(u => u.id === id); if (i >= 0) LOCAL_PMS_USERS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() }),
  });
}

export function useKillSwitchUser() {
  return useMutation({ mutationFn: async (_: any) => ok(true) });
}

export function useListCustomRoles() {
  return useQuery({ queryKey: getListCustomRolesQueryKey(), queryFn: () => [...LOCAL_CUSTOM_ROLES], staleTime: Infinity });
}

export function useCreateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<CustomRole> }) => {
      const nr = { id: nextId(), name: data.name ?? "", description: data.description ?? "", permissions: data.permissions ?? [] };
      LOCAL_CUSTOM_ROLES.push(nr); return nr;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomRolesQueryKey() }),
  });
}

export function useUpdateCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomRole> }) => {
      const idx = LOCAL_CUSTOM_ROLES.findIndex(r => r.id === id);
      if (idx >= 0) Object.assign(LOCAL_CUSTOM_ROLES[idx], data);
      return LOCAL_CUSTOM_ROLES[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomRolesQueryKey() }),
  });
}

export function useDeleteCustomRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = LOCAL_CUSTOM_ROLES.findIndex(r => r.id === id); if (i >= 0) LOCAL_CUSTOM_ROLES.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomRolesQueryKey() }),
  });
}

export function useListCustomFields(_?: any) {
  return useQuery({ queryKey: getListCustomFieldsQueryKey(), queryFn: () => [...LOCAL_CUSTOM_FIELDS], staleTime: Infinity });
}

export function useCreateCustomField(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<CustomField> }) => {
      const nf = { id: nextId(), entityType: data.entityType ?? "task", fieldType: data.fieldType ?? "text", label: data.label ?? "", isRequired: data.isRequired ?? false, options: data.options ?? [] };
      LOCAL_CUSTOM_FIELDS.push(nf); return nf;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() }),
  });
}

export function useUpdateCustomField(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CustomField> }) => {
      const idx = LOCAL_CUSTOM_FIELDS.findIndex(f => f.id === id);
      if (idx >= 0) Object.assign(LOCAL_CUSTOM_FIELDS[idx], data);
      return LOCAL_CUSTOM_FIELDS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() }),
  });
}

export function useDeleteCustomField(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = LOCAL_CUSTOM_FIELDS.findIndex(f => f.id === id); if (i >= 0) LOCAL_CUSTOM_FIELDS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListCustomFieldsQueryKey() }),
  });
}

// ── SERVICE CATEGORIES ────────────────────────────────────────────────────────

export function useCreateServiceCategory(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: Partial<ServiceCategory> }) => {
      const ns = { id: nextId(), slug: data.slug ?? "", label: data.label ?? "", icon: data.icon ?? "wrench", color: data.color ?? "blue", isActive: data.isActive ?? true, responseTimeMin: data.responseTimeMin ?? 60, sortOrder: LOCAL_SERVICE_CATEGORIES.length + 1 };
      LOCAL_SERVICE_CATEGORIES.push(ns); return ns;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listServiceCategories"] }),
  });
}

export function useUpdateServiceCategory(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ServiceCategory> }) => {
      const idx = LOCAL_SERVICE_CATEGORIES.findIndex(s => s.id === id);
      if (idx >= 0) Object.assign(LOCAL_SERVICE_CATEGORIES[idx], data);
      return LOCAL_SERVICE_CATEGORIES[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listServiceCategories"] }),
  });
}

export function useDeleteServiceCategory(_?: any) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = LOCAL_SERVICE_CATEGORIES.findIndex(s => s.id === id); if (i >= 0) LOCAL_SERVICE_CATEGORIES.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: ["listServiceCategories"] }),
  });
}

// ── TENANTS (super-admin) ─────────────────────────────────────────────────────

export function useListTenants() {
  return useQuery({ queryKey: getListTenantsQueryKey(), queryFn: () => [...LOCAL_TENANTS], staleTime: Infinity });
}

export function useCreateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ data }: { data: CreateTenantInput }) => {
      const nt = { id: nextId(), slug: data.slug ?? "", name: data.name ?? "", status: "active", createdAt: new Date().toISOString() };
      LOCAL_TENANTS.push(nt); return nt;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTenantsQueryKey() }),
  });
}

export function useUpdateTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Tenant> }) => {
      const idx = LOCAL_TENANTS.findIndex(t => t.id === id);
      if (idx >= 0) Object.assign(LOCAL_TENANTS[idx], data);
      return LOCAL_TENANTS[idx];
    },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTenantsQueryKey() }),
  });
}

export function useDeleteTenant() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => { const i = LOCAL_TENANTS.findIndex(t => t.id === id); if (i >= 0) LOCAL_TENANTS.splice(i, 1); return ok(true); },
    onSettled: () => qc.invalidateQueries({ queryKey: getListTenantsQueryKey() }),
  });
}

export function useGetTenantSettings(_tenantId?: number, _opts?: any) {
  return useQuery({ queryKey: ["tenantSettings", _tenantId], queryFn: () => ({ ...APP_SETTINGS }), staleTime: Infinity });
}

export function useUpdateTenantSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => { Object.assign(APP_SETTINGS, data); return { ...APP_SETTINGS }; },
    onSettled: () => qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() }),
  });
}

// ── ACTIVE SESSIONS ───────────────────────────────────────────────────────────

export function useListActiveSessions() {
  return useQuery({
    queryKey: getListActiveSessionsQueryKey(),
    queryFn: (): ActiveSession[] => [
      { id: 1, userId: 1, displayName: "Nada Yousef", role: "manager", ip: "192.168.1.1", lastSeen: new Date().toISOString() },
    ],
    staleTime: Infinity,
  });
}

// ── NO-OP HOOKS ───────────────────────────────────────────────────────────────

export function setDefaultHeaders(_headers: Record<string, string>) {}

// ── TENANT SETTINGS QUERY KEY ─────────────────────────────────────────────────

export function getGetTenantSettingsQueryKey(tenantId?: number) {
  return ["tenantSettings", tenantId];
}

// ── TASK COMMENTS ─────────────────────────────────────────────────────────────

export function useListTaskComments(taskId: number, _opts?: any) {
  return useQuery({
    queryKey: [`/tasks/${taskId}/comments`],
    queryFn: () => LOCAL_TASK_COMMENTS.filter(c => c.taskId === taskId),
    enabled: !!taskId,
  });
}

// ── TASK REPORT ACTIONS ───────────────────────────────────────────────────────

function patchTaskStatus(id: number, status: string) {
  const task = TASKS.find(t => t.id === id);
  if (task) (task as any).status = status;
  return task ?? null;
}

export function useSubmitTaskReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => patchTaskStatus(id, "pending_review"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}

export function useRejectTaskReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data: _data }: { id: number; data?: { notes?: string } }) => patchTaskStatus(id, "in_progress"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}

export function useEscalateTaskReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => patchTaskStatus(id, "escalated"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}

export function useApproveTaskReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => patchTaskStatus(id, "completed"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}

export function useRecallTaskReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => patchTaskStatus(id, "in_progress"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}

export function useReopenTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id }: { id: number }) => patchTaskStatus(id, "in_progress"),
    onSettled: () => qc.invalidateQueries({ queryKey: getListTasksQueryKey({}) }),
  });
}
