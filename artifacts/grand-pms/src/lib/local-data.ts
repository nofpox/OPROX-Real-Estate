/**
 * LOCAL DATA STORE — Grand PMS Standalone
 * All data lives in memory. No server, no network calls.
 * CRUD operations mutate these arrays and trigger React Query cache invalidation.
 */

// ── Seed Data ─────────────────────────────────────────────────────────────────

export type Property = {
  id: number; name: string; address: string; city: string; country: string;
  description?: string; status: string; unitCount: number; type: string;
};

export type Room = {
  id: number; name: string; type: string; status: string; capacity: number;
  pricePerNight: number; propertyId: number; propertyName?: string;
};

export type Staff = {
  id: number; name: string; role: string; systemRole: string; email: string;
  phone?: string; propertyId?: number; propertyName?: string; status: string;
  invitePending: boolean; hasAccount: boolean;
};

export type Task = {
  id: number; title: string; category: string; status: string; priority: string;
  propertyId: number; propertyName?: string; unitId?: number; unitName?: string;
  assignedToId?: number; assigneeName?: string; supervisorId?: number;
  description?: string; dueDate?: string; createdAt: string; completedAt?: string;
  reportStatus: string; afterPhotoUrl?: string; completionLat?: number; completionLng?: number;
};

export type WorkOrder = {
  id: number; title: string; description?: string; priority: string; status: string;
  propertyId: number; propertyName?: string; unitId?: number; unitName?: string;
  assignedTo?: string; dueDate?: string; createdAt: string;
};

export type Shift = {
  id: number; staffId: number; staffName?: string; propertyId: number; propertyName?: string;
  date: string; shiftType: string; startTime: string; endTime: string; notes?: string;
};

export type Notification = {
  id: number; type: string; title: string; message: string; isRead: boolean;
  createdAt: string; notifKey?: string; messageParams?: string;
};

export type ActivityLog = {
  id: number; action: string; entityType: string; entityId: number;
  actorName: string; actorRole: string; createdAt: string; proofPhotoUrl?: string;
  details?: string;
};

export type User = {
  id: number; username: string; displayName: string; email: string;
  role: string; status: string; mustChangePassword: boolean;
};

export type SupportTicket = {
  id: number; title: string; description: string; category: string;
  status: string; submittedBy?: string; adminNotes?: string; createdAt: string;
};

// ── In-Memory Stores ──────────────────────────────────────────────────────────

export const PROPERTIES: Property[] = [
  { id: 1, name: "Grand Hotel Downtown", address: "123 Main St", city: "Riyadh", country: "Saudi Arabia", description: "Luxury downtown hotel with 50 rooms", status: "active", unitCount: 15, type: "hotel" },
  { id: 2, name: "Sunset Apartments", address: "456 Palm Ave", city: "Jeddah", country: "Saudi Arabia", description: "Modern serviced apartments", status: "active", unitCount: 12, type: "serviced-apartments" },
  { id: 3, name: "Oakwood Compound", address: "789 Oak Rd", city: "Dammam", country: "Saudi Arabia", description: "Residential compound", status: "active", unitCount: 8, type: "compound" },
];

export const ROOMS: Room[] = [
  { id: 1, name: "Room 101", type: "Standard", status: "available", capacity: 2, pricePerNight: 350, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 2, name: "Room 102", type: "Deluxe", status: "occupied", capacity: 2, pricePerNight: 500, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 3, name: "Room 201", type: "Suite", status: "maintenance", capacity: 4, pricePerNight: 900, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 4, name: "Room 202", type: "Standard", status: "available", capacity: 2, pricePerNight: 350, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 5, name: "Room 301", type: "Deluxe", status: "cleaning", capacity: 2, pricePerNight: 500, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 6, name: "Unit A1", type: "Studio", status: "available", capacity: 2, pricePerNight: 400, propertyId: 2, propertyName: "Sunset Apartments" },
  { id: 7, name: "Unit A2", type: "Standard", status: "occupied", capacity: 3, pricePerNight: 600, propertyId: 2, propertyName: "Sunset Apartments" },
  { id: 8, name: "Unit B1", type: "Deluxe", status: "available", capacity: 4, pricePerNight: 750, propertyId: 2, propertyName: "Sunset Apartments" },
  { id: 9, name: "Unit B2", type: "Suite", status: "maintenance", capacity: 4, pricePerNight: 900, propertyId: 2, propertyName: "Sunset Apartments" },
  { id: 10, name: "Villa 1", type: "Standard", status: "occupied", capacity: 6, pricePerNight: 1200, propertyId: 3, propertyName: "Oakwood Compound" },
  { id: 11, name: "Villa 2", type: "Deluxe", status: "available", capacity: 6, pricePerNight: 1400, propertyId: 3, propertyName: "Oakwood Compound" },
  { id: 12, name: "Villa 3", type: "Standard", status: "cleaning", capacity: 5, pricePerNight: 1100, propertyId: 3, propertyName: "Oakwood Compound" },
  { id: 13, name: "Room 401", type: "Penthouse", status: "available", capacity: 4, pricePerNight: 1800, propertyId: 1, propertyName: "Grand Hotel Downtown" },
  { id: 14, name: "Unit C1", type: "Studio", status: "available", capacity: 2, pricePerNight: 380, propertyId: 2, propertyName: "Sunset Apartments" },
  { id: 15, name: "Villa 4", type: "Standard", status: "available", capacity: 5, pricePerNight: 1100, propertyId: 3, propertyName: "Oakwood Compound" },
];

export const STAFF: Staff[] = [
  { id: 1, name: "Ahmed Al-Rashidi", role: "General Manager", systemRole: "manager", email: "ahmed@grandpms.com", phone: "+966501234567", propertyId: 1, propertyName: "Grand Hotel Downtown", status: "active", invitePending: false, hasAccount: true },
  { id: 2, name: "Sara Al-Qahtani", role: "Front Desk Supervisor", systemRole: "supervisor", email: "sara@grandpms.com", phone: "+966509876543", propertyId: 1, propertyName: "Grand Hotel Downtown", status: "active", invitePending: false, hasAccount: true },
  { id: 3, name: "Khalid Al-Dosari", role: "Maintenance Technician", systemRole: "maintenance", email: "khalid@grandpms.com", phone: "+966512345678", propertyId: 1, propertyName: "Grand Hotel Downtown", status: "active", invitePending: false, hasAccount: true },
  { id: 4, name: "Fatima Al-Zahrani", role: "Housekeeping Supervisor", systemRole: "cleaning", email: "fatima@grandpms.com", phone: "+966521234567", propertyId: 2, propertyName: "Sunset Apartments", status: "active", invitePending: false, hasAccount: true },
  { id: 5, name: "Omar Al-Shehri", role: "Security Officer", systemRole: "security", email: "omar@grandpms.com", phone: "+966531234567", propertyId: 2, propertyName: "Sunset Apartments", status: "active", invitePending: false, hasAccount: true },
  { id: 6, name: "Nadia Al-Otaibi", role: "Property Manager", systemRole: "administrator", email: "nadia@grandpms.com", phone: "+966541234567", propertyId: 3, propertyName: "Oakwood Compound", status: "active", invitePending: false, hasAccount: true },
  { id: 7, name: "Youssef Al-Harbi", role: "HVAC Technician", systemRole: "maintenance", email: "youssef@grandpms.com", phone: "+966551234567", propertyId: 3, propertyName: "Oakwood Compound", status: "active", invitePending: false, hasAccount: true },
  { id: 8, name: "Layla Al-Ghamdi", role: "Receptionist", systemRole: "supervisor", email: "layla@grandpms.com", phone: "+966561234567", propertyId: 1, propertyName: "Grand Hotel Downtown", status: "active", invitePending: false, hasAccount: true },
  { id: 9, name: "Hassan Al-Mutairi", role: "Security Guard", systemRole: "security", email: "hassan@grandpms.com", phone: "+966571234567", propertyId: 2, propertyName: "Sunset Apartments", status: "active", invitePending: false, hasAccount: true },
  { id: 10, name: "Reem Al-Anazi", role: "Cleaning Staff", systemRole: "cleaning", email: "reem@grandpms.com", phone: "+966581234567", propertyId: 3, propertyName: "Oakwood Compound", status: "inactive", invitePending: false, hasAccount: false },
];

const now = new Date();
const d = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString();
const ds = (offset: number) => new Date(now.getTime() + offset * 86400000).toISOString().split("T")[0];

export const TASKS: Task[] = [
  { id: 1, title: "Deep clean pool area", category: "cleaning", status: "pending", priority: "high", propertyId: 1, propertyName: "Grand Hotel Downtown", unitId: 3, unitName: "Room 201", assignedToId: 4, assigneeName: "Fatima Al-Zahrani", description: "Full scrub and water treatment", dueDate: ds(2), createdAt: d(-1), reportStatus: "none" },
  { id: 2, title: "Fix AC unit Room 102", category: "maintenance", status: "in-progress", priority: "urgent", propertyId: 1, propertyName: "Grand Hotel Downtown", unitId: 2, unitName: "Room 102", assignedToId: 3, assigneeName: "Khalid Al-Dosari", description: "AC not cooling properly", dueDate: ds(0), createdAt: d(-2), reportStatus: "none" },
  { id: 3, title: "Security patrol rounds", category: "security", status: "completed", priority: "medium", propertyId: 2, propertyName: "Sunset Apartments", assignedToId: 5, assigneeName: "Omar Al-Shehri", dueDate: ds(-1), createdAt: d(-3), completedAt: d(-1), reportStatus: "approved", afterPhotoUrl: undefined },
  { id: 4, title: "Inspect fire safety equipment", category: "maintenance", status: "pending", priority: "high", propertyId: 3, propertyName: "Oakwood Compound", assignedToId: 7, assigneeName: "Youssef Al-Harbi", dueDate: ds(3), createdAt: d(-1), reportStatus: "none" },
  { id: 5, title: "Guest check-in preparation", category: "reception", status: "completed", priority: "medium", propertyId: 1, propertyName: "Grand Hotel Downtown", unitId: 1, unitName: "Room 101", assignedToId: 2, assigneeName: "Sara Al-Qahtani", createdAt: d(-2), completedAt: d(-2), reportStatus: "approved" },
  { id: 6, title: "Landscape maintenance Villa 1", category: "general", status: "pending", priority: "low", propertyId: 3, propertyName: "Oakwood Compound", unitId: 10, unitName: "Villa 1", assignedToId: 6, assigneeName: "Nadia Al-Otaibi", dueDate: ds(5), createdAt: d(-1), reportStatus: "none" },
  { id: 7, title: "Elevator maintenance check", category: "maintenance", status: "in-progress", priority: "high", propertyId: 2, propertyName: "Sunset Apartments", assignedToId: 3, assigneeName: "Khalid Al-Dosari", dueDate: ds(1), createdAt: d(-1), reportStatus: "none" },
  { id: 8, title: "Reception desk sanitization", category: "cleaning", status: "completed", priority: "medium", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedToId: 4, assigneeName: "Fatima Al-Zahrani", createdAt: d(-3), completedAt: d(-2), reportStatus: "approved" },
  { id: 9, title: "CCTV camera calibration", category: "security", status: "pending", priority: "medium", propertyId: 2, propertyName: "Sunset Apartments", assignedToId: 9, assigneeName: "Hassan Al-Mutairi", dueDate: ds(4), createdAt: d(0), reportStatus: "none" },
  { id: 10, title: "Plumbing repair Unit B2", category: "maintenance", status: "completed", priority: "urgent", propertyId: 2, propertyName: "Sunset Apartments", unitId: 9, unitName: "Unit B2", assignedToId: 7, assigneeName: "Youssef Al-Harbi", createdAt: d(-4), completedAt: d(-2), reportStatus: "approved" },
  { id: 11, title: "Weekly deep clean Villa 2", category: "cleaning", status: "pending", priority: "medium", propertyId: 3, propertyName: "Oakwood Compound", unitId: 11, unitName: "Villa 2", assignedToId: 10, assigneeName: "Reem Al-Anazi", dueDate: ds(2), createdAt: d(0), reportStatus: "none" },
  { id: 12, title: "Parking area inspection", category: "security", status: "in-progress", priority: "low", propertyId: 3, propertyName: "Oakwood Compound", assignedToId: 5, assigneeName: "Omar Al-Shehri", dueDate: ds(1), createdAt: d(-1), reportStatus: "none" },
  { id: 13, title: "Guest welcome package prep", category: "reception", status: "pending", priority: "medium", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedToId: 8, assigneeName: "Layla Al-Ghamdi", dueDate: ds(1), createdAt: d(0), reportStatus: "none" },
  { id: 14, title: "Pool chemical balancing", category: "maintenance", status: "verified", priority: "high", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedToId: 3, assigneeName: "Khalid Al-Dosari", createdAt: d(-5), completedAt: d(-3), reportStatus: "approved" },
  { id: 15, title: "Security perimeter check", category: "security", status: "completed", priority: "medium", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedToId: 9, assigneeName: "Hassan Al-Mutairi", createdAt: d(-2), completedAt: d(-1), reportStatus: "pending" },
];

export const WORK_ORDERS: WorkOrder[] = [
  { id: 1, title: "AC replacement Room 201", description: "Full AC unit replacement needed", priority: "urgent", status: "in-progress", propertyId: 1, propertyName: "Grand Hotel Downtown", unitId: 3, unitName: "Room 201", assignedTo: "Khalid Al-Dosari", dueDate: ds(1), createdAt: d(-2) },
  { id: 2, title: "Plumbing leak Unit B2", description: "Water leak from ceiling pipe", priority: "high", status: "pending", propertyId: 2, propertyName: "Sunset Apartments", unitId: 9, unitName: "Unit B2", assignedTo: "Youssef Al-Harbi", dueDate: ds(0), createdAt: d(-1) },
  { id: 3, title: "Electrical panel inspection", description: "Annual safety inspection", priority: "medium", status: "completed", propertyId: 3, propertyName: "Oakwood Compound", assignedTo: "Khalid Al-Dosari", dueDate: ds(-2), createdAt: d(-7) },
  { id: 4, title: "Elevator maintenance", description: "Quarterly elevator service", priority: "high", status: "in-progress", propertyId: 2, propertyName: "Sunset Apartments", assignedTo: "Youssef Al-Harbi", dueDate: ds(2), createdAt: d(-3) },
  { id: 5, title: "Roof waterproofing Villa 3", description: "Seal identified leak points", priority: "high", status: "pending", propertyId: 3, propertyName: "Oakwood Compound", unitId: 12, unitName: "Villa 3", assignedTo: "Youssef Al-Harbi", dueDate: ds(4), createdAt: d(-1) },
  { id: 6, title: "HVAC filter replacement", description: "Replace all HVAC filters", priority: "medium", status: "completed", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedTo: "Khalid Al-Dosari", dueDate: ds(-5), createdAt: d(-10) },
  { id: 7, title: "Lobby renovation work", description: "Paint and flooring update", priority: "low", status: "on-hold", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedTo: "Nadia Al-Otaibi", dueDate: ds(14), createdAt: d(-5) },
  { id: 8, title: "Pool pump replacement", description: "Replace aging pool pump", priority: "medium", status: "pending", propertyId: 1, propertyName: "Grand Hotel Downtown", assignedTo: "Khalid Al-Dosari", dueDate: ds(6), createdAt: d(-2) },
  { id: 9, title: "Gate motor repair", description: "Compound main gate motor faulty", priority: "urgent", status: "in-progress", propertyId: 3, propertyName: "Oakwood Compound", assignedTo: "Youssef Al-Harbi", dueDate: ds(0), createdAt: d(-1) },
  { id: 10, title: "Generator servicing", description: "Annual generator maintenance", priority: "medium", status: "completed", propertyId: 2, propertyName: "Sunset Apartments", assignedTo: "Khalid Al-Dosari", dueDate: ds(-3), createdAt: d(-8) },
  { id: 11, title: "Window sealing Unit A1", description: "Water ingress around windows", priority: "medium", status: "pending", propertyId: 2, propertyName: "Sunset Apartments", unitId: 6, unitName: "Unit A1", assignedTo: "Youssef Al-Harbi", dueDate: ds(5), createdAt: d(-1) },
  { id: 12, title: "Parking lot lighting", description: "Replace faulty light fixtures", priority: "low", status: "completed", propertyId: 3, propertyName: "Oakwood Compound", assignedTo: "Khalid Al-Dosari", dueDate: ds(-7), createdAt: d(-14) },
];

export const SHIFTS: Shift[] = [
  { id: 1, staffId: 2, staffName: "Sara Al-Qahtani", propertyId: 1, propertyName: "Grand Hotel Downtown", date: ds(0), shiftType: "morning", startTime: "07:00", endTime: "15:00" },
  { id: 2, staffId: 3, staffName: "Khalid Al-Dosari", propertyId: 1, propertyName: "Grand Hotel Downtown", date: ds(0), shiftType: "afternoon", startTime: "12:00", endTime: "20:00" },
  { id: 3, staffId: 5, staffName: "Omar Al-Shehri", propertyId: 2, propertyName: "Sunset Apartments", date: ds(0), shiftType: "night", startTime: "23:00", endTime: "07:00" },
  { id: 4, staffId: 8, staffName: "Layla Al-Ghamdi", propertyId: 1, propertyName: "Grand Hotel Downtown", date: ds(1), shiftType: "morning", startTime: "07:00", endTime: "15:00" },
  { id: 5, staffId: 4, staffName: "Fatima Al-Zahrani", propertyId: 2, propertyName: "Sunset Apartments", date: ds(1), shiftType: "afternoon", startTime: "12:00", endTime: "20:00" },
  { id: 6, staffId: 9, staffName: "Hassan Al-Mutairi", propertyId: 2, propertyName: "Sunset Apartments", date: ds(-1), shiftType: "night", startTime: "23:00", endTime: "07:00" },
  { id: 7, staffId: 6, staffName: "Nadia Al-Otaibi", propertyId: 3, propertyName: "Oakwood Compound", date: ds(-1), shiftType: "morning", startTime: "07:00", endTime: "15:00" },
  { id: 8, staffId: 7, staffName: "Youssef Al-Harbi", propertyId: 3, propertyName: "Oakwood Compound", date: ds(0), shiftType: "evening", startTime: "15:00", endTime: "23:00" },
  { id: 9, staffId: 2, staffName: "Sara Al-Qahtani", propertyId: 1, propertyName: "Grand Hotel Downtown", date: ds(2), shiftType: "morning", startTime: "07:00", endTime: "15:00" },
  { id: 10, staffId: 3, staffName: "Khalid Al-Dosari", propertyId: 1, propertyName: "Grand Hotel Downtown", date: ds(2), shiftType: "afternoon", startTime: "12:00", endTime: "20:00" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: 1, type: "maintenance", title: "Urgent Work Order", message: "AC replacement needed in Room 201 — marked urgent", isRead: false, createdAt: d(-0.1) },
  { id: 2, type: "check-in", title: "Guest Check-In", message: "Room 101 guest checked in successfully", isRead: false, createdAt: d(-0.5) },
  { id: 3, type: "maintenance", title: "Plumbing Issue Reported", message: "Water leak reported in Unit B2 — assigned to Youssef", isRead: true, createdAt: d(-1) },
  { id: 4, type: "check-out", title: "Guest Check-Out", message: "Room 202 guest checked out — room ready for cleaning", isRead: true, createdAt: d(-2) },
];

export const ACTIVITY_LOGS: ActivityLog[] = [
  { id: 1, action: "task.completed", entityType: "task", entityId: 3, actorName: "Omar Al-Shehri", actorRole: "security", createdAt: d(-1), details: "Security patrol rounds completed" },
  { id: 2, action: "work_order.created", entityType: "work_order", entityId: 1, actorName: "Ahmed Al-Rashidi", actorRole: "manager", createdAt: d(-2), details: "AC replacement work order created" },
  { id: 3, action: "task.status_changed", entityType: "task", entityId: 2, actorName: "Khalid Al-Dosari", actorRole: "maintenance", createdAt: d(-2), details: "Task moved to in-progress" },
  { id: 4, action: "staff.created", entityType: "staff", entityId: 10, actorName: "Ahmed Al-Rashidi", actorRole: "manager", createdAt: d(-3), details: "New staff member added" },
  { id: 5, action: "property.updated", entityType: "property", entityId: 2, actorName: "Nadia Al-Otaibi", actorRole: "administrator", createdAt: d(-4), details: "Property details updated" },
  { id: 6, action: "task.report_submitted", entityType: "task", entityId: 5, actorName: "Sara Al-Qahtani", actorRole: "supervisor", createdAt: d(-2), details: "Work report submitted" },
  { id: 7, action: "work_order.status_changed", entityType: "work_order", entityId: 3, actorName: "Khalid Al-Dosari", actorRole: "maintenance", createdAt: d(-5), details: "Electrical inspection completed" },
  { id: 8, action: "shift.created", entityType: "shift", entityId: 1, actorName: "Ahmed Al-Rashidi", actorRole: "manager", createdAt: d(-1), details: "Morning shift scheduled" },
];

export const SUPPORT_TICKETS: SupportTicket[] = [
  { id: 1, title: "Cannot access reports", description: "The analytics page shows an error when I try to load the monthly report.", category: "bug", status: "open", submittedBy: "Sara Al-Qahtani", adminNotes: "", createdAt: d(-2) },
  { id: 2, title: "Add bulk shift scheduling", description: "Would be very helpful to assign shifts to multiple staff at once.", category: "suggestion", status: "in-progress", submittedBy: "Ahmed Al-Rashidi", adminNotes: "Under review for next release", createdAt: d(-5) },
  { id: 3, title: "Login issue on mobile", description: "App freezes during login on Android 13 devices.", category: "bug", status: "resolved", submittedBy: "Layla Al-Ghamdi", adminNotes: "Fixed in latest update", createdAt: d(-10) },
];

export const APP_SETTINGS = {
  propertyName: "Grand PMS",
  logoText: "Grand",
  logoSub: "Property Management System",
  logoUrl: "",
  businessMode: "hotel" as const,
  enabledModules: ["maintenance", "housekeeping", "serviceRequests", "staff", "tasks"],
  navConfig: [],
  permissionMatrix: {},
  primaryColor: "",
  secondaryColor: "",
  companyName: "Grand PMS",
};

// ── ID counter ────────────────────────────────────────────────────────────────

let _nextId = 100;
export function nextId() { return ++_nextId; }

// ── Local credentials ─────────────────────────────────────────────────────────

export const LOCAL_USERS: Record<string, { password: string; user: User }> = {
  admin: {
    password: "admin123",
    user: { id: 1, username: "admin", displayName: "Ahmed Al-Rashidi", email: "admin@grandpms.com", role: "manager", status: "active", mustChangePassword: false },
  },
  manager: {
    password: "manager123",
    user: { id: 2, username: "manager", displayName: "Sara Al-Qahtani", email: "manager@grandpms.com", role: "supervisor", status: "active", mustChangePassword: false },
  },
  worker: {
    password: "worker123",
    user: { id: 3, username: "worker", displayName: "Khalid Al-Dosari", email: "worker@grandpms.com", role: "maintenance", status: "active", mustChangePassword: false },
  },
};

// ── Heatmap data generator ────────────────────────────────────────────────────

export type OccupancyHeatmapEntry = {
  propertyId: number; propertyName: string; date: string;
  occupiedRooms: number; totalRooms: number; occupancyPct: number;
};

export function generateHeatmap(days: number = 42): OccupancyHeatmapEntry[] {
  const entries: OccupancyHeatmapEntry[] = [];
  const seed = (s: string) => s.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  for (let i = 0; i < days; i++) {
    const date = new Date(now.getTime() - (days - i - 1) * 86400000);
    const dateStr = date.toISOString().split("T")[0];
    for (const p of PROPERTIES) {
      const rooms = ROOMS.filter(r => r.propertyId === p.id);
      const total = rooms.length;
      const h = seed(dateStr + p.id);
      const pct = Math.min(100, Math.max(0, 30 + (h % 60) + (i > days / 2 ? 10 : 0)));
      const occupied = Math.round(total * pct / 100);
      entries.push({ propertyId: p.id, propertyName: p.name, date: dateStr, occupiedRooms: occupied, totalRooms: total, occupancyPct: pct });
    }
  }
  return entries;
}
