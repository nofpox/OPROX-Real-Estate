import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortalAIAgent } from '@/components/PortalAIAgent';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { usePortalAuth } from '@/lib/portal-auth';
import { useCms } from '@/lib/cms-context';
import {
  useGetPortalProperties,
  useGetPortalBookings,
  useGetPortalFinancials,
  useGetPortalPropertyUnits,
  useCreatePortalProperty,
  useUpdatePortalProperty,
  useDeletePortalProperty,
  useCreatePortalUnit,
  useUpdatePortalUnit,
  useDeletePortalUnit,
  useGetPortalTeam,
  useUpdatePortalTeamPermissions,
  useGetPortalRolePermissions,
  useUpdatePortalRolePermissions,
  getGetPortalPropertiesQueryKey,
  getGetPortalPropertyUnitsQueryKey,
  getGetPortalTeamQueryKey,
  getGetPortalRolePermissionsQueryKey,
} from '@workspace/api-client-react';
import type {
  PortalProperty,
  PortalUnit,
  PortalPropertyInput,
  PortalUnitInput,
  PortalTeamMember,
} from '@workspace/api-client-react';
import { useLanguage } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  LogOut, Building, ArrowLeft, ArrowRight, TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Pencil, Trash2, Home, ChevronRight, Layers,
  Users, ShieldCheck, MessageSquare, CheckCircle,
  Globe, Bell, FileText, UserPlus, BrainCircuit, PowerOff, Power,
  ClipboardList, ScrollText, RefreshCw, X, Check, Ban,
  LayoutGrid, UserCheck, Mail, HardHat,
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

// ── Formatters ─────────────────────────────────────────────────────────────────
const fmtSAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

// ── Role helpers ──────────────────────────────────────────────────────────────
function getPortalTierLevel(role: string): number {
  const m: Record<string, number> = {
    super_admin: 0, owner: 1, company: 2,
    admin_manager: 3, 'admin-manager': 3, admin: 3, manager: 3,
    secretariat: 4, dept_manager: 5, 'property-manager': 5,
    admin_general: 6, administrator: 6,
    supervisor: 7, 'site-supervisor': 7, 'front-desk': 7,
    maintenance: 8, worker: 9, staff: 9, security: 10,
    client: 11, partner: 11, investor: 11,
  };
  return m[role] ?? 11;
}

function roleTier(role: string): 'admin' | 'supervisor' | 'worker' {
  if (['owner', 'admin', 'super_admin', 'admin_manager', 'admin-manager'].includes(role)) return 'admin';
  if (['manager', 'supervisor', 'property-manager', 'site-supervisor', 'front-desk'].includes(role)) return 'supervisor';
  return 'worker';
}

function memberInitials(name: string): string {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── RBAC constants ────────────────────────────────────────────────────────────
const DELEGATION_CHAIN = [
  { role: 'owner',         tierLevel: 1,  activeClass: 'bg-amber-50   border-amber-500   text-amber-900'   },
  { role: 'manager',       tierLevel: 3,  activeClass: 'bg-blue-50    border-blue-500    text-blue-900'    },
  { role: 'secretariat',   tierLevel: 4,  activeClass: 'bg-cyan-50    border-cyan-500    text-cyan-900'    },
  { role: 'dept_manager',  tierLevel: 5,  activeClass: 'bg-teal-50    border-teal-500    text-teal-900'    },
  { role: 'admin_general', tierLevel: 6,  activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-900' },
  { role: 'supervisor',    tierLevel: 7,  activeClass: 'bg-orange-50  border-orange-500  text-orange-900'  },
  { role: 'maintenance',   tierLevel: 8,  activeClass: 'bg-red-50     border-red-500     text-red-900'     },
  { role: 'worker',        tierLevel: 9,  activeClass: 'bg-slate-100  border-slate-500   text-slate-900'   },
  { role: 'security',      tierLevel: 10, activeClass: 'bg-gray-100   border-gray-500    text-gray-900'    },
] as const;

const ALL_PERMS_LIST = [
  'property:add', 'property:edit', 'property:delete', 'property:publish',
  'marketing:campaigns', 'marketing:listings',
  'support:inquiries', 'support:messages',
] as const;

const PERM_GROUPS: Array<{ key: string; icon: React.ElementType; perms: string[] }> = [
  { key: 'property',  icon: Building,      perms: ['property:add', 'property:edit', 'property:delete', 'property:publish'] },
  { key: 'marketing', icon: TrendingUp,    perms: ['marketing:campaigns', 'marketing:listings'] },
  { key: 'support',   icon: MessageSquare, perms: ['support:inquiries', 'support:messages'] },
];

const PERM_LABEL_KEY: Record<string, string> = {
  'property:add':        'ops.perm.property_add',
  'property:edit':       'ops.perm.property_edit',
  'property:delete':     'ops.perm.property_delete',
  'property:publish':    'ops.perm.property_publish',
  'marketing:campaigns': 'ops.perm.marketing_campaigns',
  'marketing:listings':  'ops.perm.marketing_listings',
  'support:inquiries':   'ops.perm.support_inquiries',
  'support:messages':    'ops.perm.support_messages',
};

// ── Property / Unit constants ─────────────────────────────────────────────────
const PROPERTY_TYPES    = ['hotel', 'compound', 'apartment', 'villa', 'office', 'commercial', 'warehouse'];
const PROPERTY_STATUSES = ['active', 'inactive'];
const UNIT_TYPES        = ['studio', '1br', '2br', '3br', '4br', 'penthouse', 'duplex', 'apartment', 'villa', 'office', 'commercial'];
const UNIT_STATUSES     = ['available', 'occupied', 'maintenance'];

// ── Staff assignable roles ────────────────────────────────────────────────────
const STAFF_ASSIGNABLE_ROLES = [
  { value: 'manager',      label: 'Manager (tier 3)'        },
  { value: 'secretariat',  label: 'Secretariat (tier 4)'    },
  { value: 'dept_manager', label: 'Dept. Manager (tier 5)'  },
  { value: 'admin_general',label: 'Administrator (tier 6)'  },
  { value: 'supervisor',   label: 'Supervisor (tier 7)'     },
  { value: 'maintenance',  label: 'Maintenance (tier 8)'    },
  { value: 'worker',       label: 'Worker (tier 9)'         },
  { value: 'security',     label: 'Security (tier 10)'      },
  { value: 'client',       label: 'Client / Investor'       },
];

// ── Form state types ──────────────────────────────────────────────────────────
interface PropFormState {
  name: string; type: string; address: string; city: string; country: string; description: string; status: string;
}
interface UnitFormState {
  unitNumber: string; floor: string; type: string; area: string;
  bedroomCount: string; bathroomCount: string; status: string; monthlyRent: string; notes: string;
}
const emptyPropForm = (): PropFormState => ({ name: '', type: 'apartment', address: '', city: '', country: 'SA', description: '', status: 'active' });
const emptyUnitForm = (): UnitFormState => ({ unitNumber: '', floor: '', type: 'apartment', area: '', bedroomCount: '0', bathroomCount: '1', status: 'available', monthlyRent: '', notes: '' });

// ═══════════════════════════════════════════════════════════════════════════════
// AI Governance Panel
// ═══════════════════════════════════════════════════════════════════════════════
type AiActionStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

interface AiAction {
  id: number;
  actionType: string;
  targetEntity: string;
  description: string;
  proposedBy: string;
  status: AiActionStatus;
  reviewedByName: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

interface AiAuditEntry {
  id: number;
  event: string;
  actorType: string;
  actorName: string | null;
  targetEntity: string | null;
  description: string;
  createdAt: string;
}

const STATUS_BADGE: Record<AiActionStatus, string> = {
  pending:   'bg-amber-100 text-amber-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  cancelled: 'bg-slate-100 text-slate-700',
};

const EVENT_BADGE: Record<string, string> = {
  KILL_SWITCH_ACTIVATED:   'bg-red-100 text-red-800',
  KILL_SWITCH_DEACTIVATED: 'bg-green-100 text-green-800',
  ACTION_PROPOSED:         'bg-blue-100 text-blue-800',
  ACTION_APPROVED:         'bg-green-100 text-green-800',
  ACTION_REJECTED:         'bg-red-100 text-red-800',
  ACTION_CANCELLED:        'bg-slate-100 text-slate-700',
};

const AiGovernancePanel: React.FC<{ t: (k: string) => string; isRtl: boolean }> = ({ isRtl }) => {
  const { user } = usePortalAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // ── Global kill switch state (super_admin only) ────────────────────────────
  const [globalKillActive,  setGlobalKillActive]  = useState<boolean | null>(null);
  const [gksLoading,        setGksLoading]        = useState(true);
  const [gksUpdating,       setGksUpdating]       = useState(false);
  const [gksConfirm,        setGksConfirm]        = useState(false);

  // ── Tenant kill switch state ───────────────────────────────────────────────
  const [killActive,    setKillActive]   = useState<boolean | null>(null);
  const [ksLoading,     setKsLoading]    = useState(true);
  const [ksUpdating,    setKsUpdating]   = useState(false);
  const [ksConfirm,     setKsConfirm]    = useState(false);

  const [actions,       setActions]      = useState<AiAction[]>([]);
  const [actionsTotal,  setActionsTotal] = useState(0);
  const [actionsLoading,setActionsLoading] = useState(true);
  const [statusFilter,  setStatusFilter] = useState<string>('pending');

  const [auditLog,      setAuditLog]     = useState<AiAuditEntry[]>([]);
  const [auditTotal,    setAuditTotal]   = useState(0);
  const [auditLoading,  setAuditLoading] = useState(true);
  const [auditPage,     setAuditPage]    = useState(0);

  const [reviewId,      setReviewId]     = useState<number | null>(null);
  const [reviewDecision,setReviewDecision] = useState<'approved' | 'rejected' | null>(null);
  const [reviewNote,    setReviewNote]   = useState('');
  const [reviewBusy,    setReviewBusy]   = useState(false);

  const AUDIT_PAGE_SIZE = 20;

  // ── Load global kill-switch state (super_admin only) ─────────────────────
  async function loadGlobalKs() {
    if (!isSuperAdmin) { setGksLoading(false); return; }
    setGksLoading(true);
    try {
      const r = await fetch('/api/ai-governance/global-kill-switch', { credentials: 'include' });
      if (r.ok) { const d = await r.json(); setGlobalKillActive(d.active); }
    } catch { /* ignore */ }
    setGksLoading(false);
  }

  // ── Toggle global kill-switch ──────────────────────────────────────────────
  async function toggleGlobalKillSwitch() {
    setGksUpdating(true);
    try {
      const r = await fetch('/api/ai-governance/global-kill-switch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !globalKillActive }),
      });
      if (r.ok) { const d = await r.json(); setGlobalKillActive(d.active); }
    } catch { /* ignore */ }
    setGksUpdating(false);
    setGksConfirm(false);
    loadAudit(0);
  }

  // ── Load kill-switch state ─────────────────────────────────────────────────
  async function loadKs() {
    setKsLoading(true);
    try {
      const r = await fetch('/api/ai-governance/kill-switch', { credentials: 'include' });
      const d = await r.json();
      setKillActive(d.active);
    } catch { /* ignore */ }
    setKsLoading(false);
  }

  // ── Load action queue ──────────────────────────────────────────────────────
  async function loadActions(status: string) {
    setActionsLoading(true);
    try {
      const qs = status === 'all' ? '' : `?status=${status}`;
      const r = await fetch(`/api/ai-governance/action-queue${qs}&limit=50`, { credentials: 'include' });
      const d = await r.json();
      setActions(d.rows ?? []);
      setActionsTotal(d.total ?? 0);
    } catch { /* ignore */ }
    setActionsLoading(false);
  }

  // ── Load audit log ─────────────────────────────────────────────────────────
  async function loadAudit(page: number) {
    setAuditLoading(true);
    try {
      const offset = page * AUDIT_PAGE_SIZE;
      const r = await fetch(`/api/ai-governance/audit-log?limit=${AUDIT_PAGE_SIZE}&offset=${offset}`, { credentials: 'include' });
      const d = await r.json();
      setAuditLog(d.rows ?? []);
      setAuditTotal(d.total ?? 0);
    } catch { /* ignore */ }
    setAuditLoading(false);
  }

  useEffect(() => { loadGlobalKs(); loadKs(); loadActions('pending'); loadAudit(0); }, [isSuperAdmin]);

  // ── Toggle kill-switch ─────────────────────────────────────────────────────
  async function toggleKillSwitch() {
    setKsUpdating(true);
    try {
      const r = await fetch('/api/ai-governance/kill-switch', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !killActive }),
      });
      const d = await r.json();
      setKillActive(d.active);
    } catch { /* ignore */ }
    setKsUpdating(false);
    setKsConfirm(false);
    loadAudit(0);
  }

  // ── Review an action ───────────────────────────────────────────────────────
  async function submitReview() {
    if (!reviewId || !reviewDecision) return;
    setReviewBusy(true);
    try {
      await fetch(`/api/ai-governance/action-queue/${reviewId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision: reviewDecision, note: reviewNote || undefined }),
      });
      setReviewId(null);
      setReviewDecision(null);
      setReviewNote('');
      loadActions(statusFilter);
      loadAudit(0);
    } catch { /* ignore */ }
    setReviewBusy(false);
  }

  const fmtDt = (s: string) => new Date(s).toLocaleString('en-SA', { dateStyle: 'short', timeStyle: 'short' });

  return (
    <div className={`space-y-6 ${isRtl ? 'rtl' : 'ltr'}`}>

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-primary font-serif flex items-center gap-2">
          <BrainCircuit className="h-5 w-5" />
          AI Governance
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Kill-switch, action queue, and immutable audit trail for all autonomous AI actions.
        </p>
      </div>

      {/* ── MASTER EMERGENCY Kill Switch (super_admin only) ─────────────── */}
      {isSuperAdmin && (
        <div className={`rounded-xl border-2 p-5 flex items-start gap-4 shadow-md ${
          globalKillActive ? 'border-orange-500 bg-orange-50' : 'border-slate-400 bg-slate-50'
        }`}>
          <div className={`p-3 rounded-full ${globalKillActive ? 'bg-orange-100' : 'bg-slate-100'}`}>
            {globalKillActive
              ? <PowerOff className="h-6 w-6 text-orange-600" />
              : <Power className="h-6 w-6 text-slate-500" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <p className={`font-bold text-base ${globalKillActive ? 'text-orange-800' : 'text-slate-700'}`}>
                Master Emergency Kill Switch
              </p>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                globalKillActive ? 'bg-orange-200 text-orange-800' : 'bg-slate-200 text-slate-600'
              }`}>
                {globalKillActive ? 'SYSTEM-WIDE HALT' : 'SYSTEM OPERATIONAL'}
              </span>
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">SUPERADMIN</span>
            </div>
            <p className="text-sm mt-1 text-muted-foreground">
              {globalKillActive
                ? 'All AI processing is halted across every tenant and every app — RKZ, Portal, and Grand PMS simultaneously.'
                : 'Instantly halt all AI-driven processes across the entire ecosystem. Overrides all tenant-level settings.'}
            </p>
          </div>
          <div className="shrink-0">
            {gksLoading ? (
              <Skeleton className="h-10 w-32 rounded-lg" />
            ) : (
              <button
                onClick={() => setGksConfirm(true)}
                disabled={gksUpdating}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  globalKillActive
                    ? 'bg-slate-600 hover:bg-slate-700 text-white'
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {gksUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {globalKillActive ? 'Resume All AI' : 'Emergency Halt'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Kill-switch card ──────────────────────────────────────────────── */}
      <div className={`rounded-xl border-2 p-5 flex items-start gap-4 ${
        killActive ? 'border-red-400 bg-red-50' : 'border-green-400 bg-green-50'
      }`}>
        <div className={`p-3 rounded-full ${killActive ? 'bg-red-100' : 'bg-green-100'}`}>
          {killActive
            ? <PowerOff className="h-6 w-6 text-red-600" />
            : <Power className="h-6 w-6 text-green-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <p className={`font-bold text-base ${killActive ? 'text-red-800' : 'text-green-800'}`}>
              {killActive ? 'AI Processing: HALTED' : 'AI Processing: ACTIVE'}
            </p>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${killActive ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>
              {killActive ? 'KILL-SWITCH ON' : 'OPERATIONAL'}
            </span>
          </div>
          <p className="text-sm mt-1 text-muted-foreground">
            {killActive
              ? 'All autonomous AI actions are blocked. New actions cannot be proposed or executed until you resume.'
              : 'AI engine is active. Proposed actions require human review before execution.'}
          </p>
        </div>
        <div className="shrink-0">
          {ksLoading ? (
            <Skeleton className="h-10 w-28 rounded-lg" />
          ) : (
            <button
              onClick={() => setKsConfirm(true)}
              disabled={ksUpdating}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                killActive
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              {ksUpdating ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
              {killActive ? 'Resume AI' : 'Halt AI'}
            </button>
          )}
        </div>
      </div>

      {/* ── Action queue ──────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Action Queue
            {actionsTotal > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{actionsTotal}</span>
            )}
          </h2>
          <div className="flex gap-2 flex-wrap">
            {(['pending', 'approved', 'rejected', 'cancelled', 'all'] as const).map(s => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); loadActions(s); }}
                className={`text-xs px-3 py-1 rounded-full font-medium transition-colors capitalize ${
                  statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {s}
              </button>
            ))}
            <button onClick={() => loadActions(statusFilter)} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
              <RefreshCw className="h-3 w-3" />
            </button>
          </div>
        </div>

        {actionsLoading ? (
          <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full rounded-lg" />)}</div>
        ) : actions.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
            No {statusFilter === 'all' ? '' : statusFilter} actions in the queue.
          </div>
        ) : (
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Action</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Entity</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell">Proposed</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {actions.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-primary truncate max-w-[180px] md:max-w-none">{a.description}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{a.actionType}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">{a.targetEntity}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs whitespace-nowrap">{fmtDt(a.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${STATUS_BADGE[a.status] ?? 'bg-muted text-muted-foreground'}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {a.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setReviewId(a.id); setReviewDecision('approved'); setReviewNote(''); }}
                            className="p-1.5 rounded-md bg-green-50 hover:bg-green-100 text-green-700 transition-colors"
                            title="Approve"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setReviewId(a.id); setReviewDecision('rejected'); setReviewNote(''); }}
                            className="p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-700 transition-colors"
                            title="Reject"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => { setReviewId(a.id); setReviewDecision('rejected'); setReviewNote('Cancelled by admin'); }}
                            className="p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors"
                            title="Cancel"
                          >
                            <Ban className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">{a.reviewedByName ?? '—'}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Audit log ─────────────────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-primary flex items-center gap-2">
            <ScrollText className="h-4 w-4" />
            Immutable Audit Trail
            {auditTotal > 0 && (
              <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">{auditTotal} entries</span>
            )}
          </h2>
          <button onClick={() => { setAuditPage(0); loadAudit(0); }} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground hover:bg-muted/80">
            <RefreshCw className="h-3 w-3" />
          </button>
        </div>

        {auditLoading ? (
          <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}</div>
        ) : auditLog.length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-10 text-center text-muted-foreground text-sm">
            No audit entries yet.
          </div>
        ) : (
          <>
            <div className="border border-border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Event</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden md:table-cell">Actor</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Description</th>
                    <th className="text-left px-4 py-2.5 font-semibold text-muted-foreground text-xs uppercase tracking-wide hidden lg:table-cell whitespace-nowrap">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {auditLog.map(entry => (
                    <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${EVENT_BADGE[entry.event] ?? 'bg-muted text-muted-foreground'}`}>
                          {entry.event.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs text-muted-foreground">{entry.actorName ?? '—'}</p>
                        <p className="text-[10px] text-muted-foreground/60 capitalize">{entry.actorType}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground max-w-[240px] truncate">{entry.description}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell whitespace-nowrap">{fmtDt(entry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Pagination */}
            {auditTotal > AUDIT_PAGE_SIZE && (
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Showing {auditPage * AUDIT_PAGE_SIZE + 1}–{Math.min((auditPage + 1) * AUDIT_PAGE_SIZE, auditTotal)} of {auditTotal}</span>
                <div className="flex gap-2">
                  <button disabled={auditPage === 0} onClick={() => { const p = auditPage - 1; setAuditPage(p); loadAudit(p); }}
                    className="px-3 py-1 rounded-md border border-border disabled:opacity-40">Prev</button>
                  <button disabled={(auditPage + 1) * AUDIT_PAGE_SIZE >= auditTotal} onClick={() => { const p = auditPage + 1; setAuditPage(p); loadAudit(p); }}
                    className="px-3 py-1 rounded-md border border-border disabled:opacity-40">Next</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Global kill-switch confirm dialog (super_admin only) ─────────── */}
      {isSuperAdmin && (
        <Dialog open={gksConfirm} onOpenChange={v => { if (!v) setGksConfirm(false); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {globalKillActive
                  ? <><Power className="h-5 w-5 text-slate-600" /> Resume All AI Systems?</>
                  : <><PowerOff className="h-5 w-5 text-orange-600" /> Emergency System Halt?</>}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              {globalKillActive
                ? 'This will resume AI processing across ALL apps and ALL tenants simultaneously — RKZ, Real Estate Portal, and Grand PMS. Ensure the anomaly has been resolved before resuming.'
                : 'This will instantly halt ALL AI-driven processes across the entire ecosystem — every tenant, every app, simultaneously. This overrides all tenant-level settings and is logged in the immutable audit trail.'}
            </p>
            {!globalKillActive && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg px-4 py-3 text-sm text-orange-800 font-medium">
                ⚠ This is a system-wide emergency action. It cannot be undone without another administrator action.
              </div>
            )}
            <DialogFooter className="gap-2">
              <button onClick={() => setGksConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
              <button
                onClick={toggleGlobalKillSwitch}
                disabled={gksUpdating}
                className={`px-4 py-2 text-sm rounded-lg font-semibold text-white transition-colors flex items-center gap-2 ${
                  globalKillActive ? 'bg-slate-600 hover:bg-slate-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {gksUpdating && <RefreshCw className="h-4 w-4 animate-spin" />}
                {globalKillActive ? 'Resume All AI' : 'Confirm Emergency Halt'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Kill-switch confirm dialog ────────────────────────────────────── */}
      <Dialog open={ksConfirm} onOpenChange={v => { if (!v) setKsConfirm(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {killActive ? <Power className="h-5 w-5 text-green-600" /> : <PowerOff className="h-5 w-5 text-red-600" />}
              {killActive ? 'Resume AI Processing?' : 'Halt AI Processing?'}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">
            {killActive
              ? 'This will allow the AI engine to propose and execute autonomous actions again. Ensure you have reviewed the action queue before resuming.'
              : 'This will immediately block all autonomous AI actions. No new actions can be proposed or executed until you resume. This action is logged in the immutable audit trail.'}
          </p>
          <DialogFooter className="gap-2">
            <button onClick={() => setKsConfirm(false)} className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">Cancel</button>
            <button
              onClick={toggleKillSwitch}
              disabled={ksUpdating}
              className={`px-4 py-2 text-sm rounded-lg font-semibold text-white transition-colors flex items-center gap-2 ${
                killActive ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {ksUpdating && <RefreshCw className="h-4 w-4 animate-spin" />}
              {killActive ? 'Resume AI' : 'Halt AI'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Review action dialog ───────────────────────────────────────────── */}
      <Dialog open={reviewId !== null} onOpenChange={v => { if (!v) { setReviewId(null); setReviewDecision(null); setReviewNote(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {reviewDecision === 'approved'
                ? <><Check className="h-5 w-5 text-green-600" /> Approve Action</>
                : <><X className="h-5 w-5 text-red-600" /> Reject Action</>}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {reviewId !== null && (() => {
              const a = actions.find(x => x.id === reviewId);
              return a ? (
                <div className="bg-muted/50 rounded-lg p-3 text-sm">
                  <p className="font-medium text-primary">{a.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">{a.actionType} · {a.targetEntity}</p>
                </div>
              ) : null;
            })()}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Note (optional)</label>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-1 focus:ring-primary"
                rows={3}
                placeholder="Add a review note for the audit trail…"
                value={reviewNote}
                onChange={e => setReviewNote(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <button onClick={() => { setReviewId(null); setReviewDecision(null); setReviewNote(''); }}
              className="px-4 py-2 text-sm rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors">
              Cancel
            </button>
            <button
              onClick={submitReview}
              disabled={reviewBusy}
              className={`px-4 py-2 text-sm rounded-lg font-semibold text-white transition-colors flex items-center gap-2 ${
                reviewDecision === 'approved' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {reviewBusy && <RefreshCw className="h-4 w-4 animate-spin" />}
              {reviewDecision === 'approved' ? 'Approve' : 'Reject'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// CMS Panel — edit all website sections
// ═══════════════════════════════════════════════════════════════════════════════
type CmsKey = 'branding' | 'hero' | 'contact' | 'about' | 'cta' | 'footer' | 'listingsPage' | 'announcements';

interface CmsPanelProps { t: (k: string) => string; isRtl: boolean; }

const CmsPanel: React.FC<CmsPanelProps> = ({ t }) => {
  const { content, isLoading } = useCms();
  const [active,   setActive]  = useState<CmsKey>('branding');
  const [sections, setSections] = useState<Record<string, unknown>>({});
  const [saving,   setSaving]  = useState(false);
  const [saved,    setSaved]   = useState(false);
  const [err,      setErr]     = useState('');
  const [newAnn,   setNewAnn]  = useState('');

  useEffect(() => {
    if (!isLoading && content) {
      setSections({
        branding:     { ...content.branding },
        hero:         { ...content.hero },
        contact:      { ...content.contact },
        about:        { ...content.about },
        cta:          { ...content.cta },
        footer:       { ...content.footer },
        listingsPage: { ...content.listingsPage },
        announcements: [...content.announcements],
      });
    }
  }, [content, isLoading]);

  const sec = (key?: string): Record<string, unknown> =>
    (sections[key ?? active] ?? {}) as Record<string, unknown>;

  const setField = (field: string, value: unknown, key?: string) => {
    const k = key ?? active;
    setSections(prev => ({ ...prev, [k]: { ...(prev[k] as Record<string, unknown> ?? {}), [field]: value } }));
  };

  const save = async () => {
    setSaving(true); setSaved(false); setErr('');
    try {
      const res = await fetch(`/realestate-api/cms/site-content/${active}`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sections[active]),
      });
      if (!res.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { setErr(t('cms.saveError')); }
    finally { setSaving(false); }
  };

  const Field = ({ label, field, multi = false, secKey }: { label: string; field: string; multi?: boolean; secKey?: string }) => {
    const val = (sec(secKey)[field] as string) ?? '';
    return (
      <div className="space-y-1.5">
        <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</Label>
        {multi
          ? <Textarea rows={3} value={val} onChange={e => setField(field, e.target.value, secKey)} className="text-sm" />
          : <Input value={val} onChange={e => setField(field, e.target.value, secKey)} className="text-sm" />}
      </div>
    );
  };

  const anns = (sections.announcements as Array<{ id: string; text: string; isActive: boolean }>) ?? [];

  const addAnn = () => {
    if (!newAnn.trim()) return;
    setSections(prev => ({
      ...prev,
      announcements: [...((prev.announcements as any[]) ?? []), { id: Date.now().toString(), text: newAnn.trim(), isActive: true }],
    }));
    setNewAnn('');
  };
  const removeAnn = (id: string) =>
    setSections(prev => ({ ...prev, announcements: ((prev.announcements as any[]) ?? []).filter((a: any) => a.id !== id) }));
  const toggleAnn = (id: string) =>
    setSections(prev => ({
      ...prev,
      announcements: ((prev.announcements as any[]) ?? []).map((a: any) => a.id === id ? { ...a, isActive: !a.isActive } : a),
    }));

  const NAV: { key: CmsKey; icon: React.ElementType; label: string }[] = [
    { key: 'branding',      icon: Building,      label: t('cms.branding')      },
    { key: 'hero',          icon: Globe,         label: t('cms.hero')          },
    { key: 'contact',       icon: MessageSquare, label: t('cms.contact')       },
    { key: 'about',         icon: FileText,      label: t('cms.about')         },
    { key: 'cta',           icon: TrendingUp,    label: t('cms.cta')           },
    { key: 'footer',        icon: Layers,        label: t('cms.footer')        },
    { key: 'listingsPage',  icon: Home,          label: t('cms.listings')      },
    { key: 'announcements', icon: Bell,          label: t('cms.announcements') },
  ];

  if (isLoading) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-64 w-full" /></div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-primary font-serif">{t('cms.title')}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">{t('cms.subtitle')}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Section nav */}
        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible md:w-44 shrink-0 pb-1 md:pb-0">
          {NAV.map(n => (
            <button key={n.key} onClick={() => { setActive(n.key); setSaved(false); setErr(''); }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                active === n.key ? 'bg-primary text-primary-foreground font-medium' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              <n.icon className="h-4 w-4 shrink-0" />
              {n.label}
            </button>
          ))}
        </nav>

        {/* Form */}
        <div className="flex-1 min-w-0">
          <Card className="p-5">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <h2 className="text-base font-semibold text-primary">{NAV.find(n => n.key === active)?.label}</h2>
              <div className="flex items-center gap-2">
                {err  && <span className="text-xs text-destructive">{err}</span>}
                {saved && <span className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle className="h-3 w-3" />{t('cms.saved')}</span>}
                <Button size="sm" onClick={save} disabled={saving} className="h-8 px-4">
                  {saving ? t('cms.saving') : t('cms.save')}
                </Button>
              </div>
            </div>

            {active === 'branding' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.companyNameEn')} field="companyNameEn" />
                <Field label={t('cms.field.companyNameAr')} field="companyNameAr" />
                <Field label={t('cms.field.taglineEn')} field="taglineEn" />
                <Field label={t('cms.field.taglineAr')} field="taglineAr" />
                <div className="md:col-span-2"><Field label={t('cms.field.logoUrl')} field="logoUrl" /></div>
              </div>
            )}

            {active === 'hero' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.titleEn')} field="titleEn" multi />
                <Field label={t('cms.field.titleAr')} field="titleAr" multi />
                <Field label={t('cms.field.subtitleEn')} field="subtitleEn" multi />
                <Field label={t('cms.field.subtitleAr')} field="subtitleAr" multi />
                <Field label={t('cms.field.ctaButtonEn')} field="ctaButtonEn" />
                <Field label={t('cms.field.ctaButtonAr')} field="ctaButtonAr" />
                <div className="md:col-span-2">
                  <Field label={t('cms.field.imageUrl')} field="imageUrl" />
                  {(sec().imageUrl as string) && (
                    <img src={sec().imageUrl as string} alt="" className="mt-2 h-28 w-full object-cover rounded-lg opacity-80"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  )}
                </div>
              </div>
            )}

            {active === 'contact' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.email')} field="email" />
                <Field label="Sales Email" field="salesEmail" />
                <Field label="Support Email" field="supportEmail" />
                <Field label={t('cms.field.phone')} field="phone" />
                <Field label="Fax" field="fax" />
                <Field label="Support Phone" field="supportPhone" />
                <div className="md:col-span-2"><Field label={t('cms.field.whatsapp')} field="whatsapp" /></div>
                <div className="md:col-span-2"><Field label={t('cms.field.addressEn')} field="addressEn" multi /></div>
                <div className="md:col-span-2"><Field label={t('cms.field.addressAr')} field="addressAr" multi /></div>
              </div>
            )}

            {active === 'about' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label={t('cms.field.titleEn')} field="titleEn" />
                  <Field label={t('cms.field.titleAr')} field="titleAr" />
                </div>
                <Field label={t('cms.field.body')} field="body" multi />
                <Field label={t('cms.field.imageUrl')} field="imageUrl" />
                {(sec().imageUrl as string) && (
                  <img src={sec().imageUrl as string} alt="" className="h-28 w-full object-cover rounded-lg opacity-80"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                )}
              </div>
            )}

            {active === 'cta' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.headlineEn')} field="headlineEn" />
                <Field label={t('cms.field.headlineAr')} field="headlineAr" />
                <Field label={t('cms.field.subtitleEn')} field="subtitleEn" multi />
                <Field label={t('cms.field.subtitleAr')} field="subtitleAr" multi />
                <Field label={t('cms.field.buttonEn')} field="buttonEn" />
                <Field label={t('cms.field.buttonAr')} field="buttonAr" />
              </div>
            )}

            {active === 'footer' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.descriptionEn')} field="descriptionEn" multi />
                <Field label={t('cms.field.descriptionAr')} field="descriptionAr" multi />
              </div>
            )}

            {active === 'listingsPage' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label={t('cms.field.pageTitleEn')} field="pageTitleEn" />
                <Field label={t('cms.field.pageTitleAr')} field="pageTitleAr" />
                <Field label={t('cms.field.subtitleEn')} field="subtitleEn" multi />
                <Field label={t('cms.field.subtitleAr')} field="subtitleAr" multi />
                <div className="md:col-span-2"><Field label={t('cms.field.metaDescription')} field="metaDescription" multi /></div>
              </div>
            )}

            {active === 'announcements' && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input value={newAnn} onChange={e => setNewAnn(e.target.value)}
                    placeholder={t('cms.announcementText')} className="flex-1 text-sm"
                    onKeyDown={e => e.key === 'Enter' && addAnn()} />
                  <Button onClick={addAnn} size="sm">
                    <Plus className="h-4 w-4 me-1" />{t('cms.addAnnouncement')}
                  </Button>
                </div>
                {anns.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6 italic">{t('cms.noAnnouncements')}</p>
                ) : (
                  <div className="space-y-2">
                    {anns.map(a => (
                      <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/30">
                        <Switch checked={a.isActive} onCheckedChange={() => toggleAnn(a.id)} className="scale-[0.85]" />
                        <span className={`flex-1 text-sm ${a.isActive ? '' : 'text-muted-foreground line-through'}`}>{a.text}</span>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => removeAnn(a.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground">{t('cms.announcementsNote')}</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// RBAC Panel — role permission management (refactored OpsControlPanel)
// ═══════════════════════════════════════════════════════════════════════════════
interface RbacPanelProps { user: unknown; t: (k: string) => string; isRtl: boolean; }

const RbacPanel: React.FC<RbacPanelProps> = ({ user, t, isRtl }) => {
  const queryClient     = useQueryClient();
  const callerRole      = ((user as unknown) as Record<string, string>)?.role ?? '';
  const callerTierLevel = getPortalTierLevel(callerRole);

  const { data: rolePermsRes, isLoading: isLoadingRP } = useGetPortalRolePermissions({ query: { enabled: true } } as any);
  const updateRolePermsMut = useUpdatePortalRolePermissions();
  const { data: teamRes,     isLoading: isLoadingTeam } = useGetPortalTeam({ query: { enabled: true } } as any);
  const updateUserPermsMut = useUpdatePortalTeamPermissions();

  const [localRolePerms, setLocalRolePerms] = useState<Record<string, string[]>>({});
  const [selectedRole,   setSelectedRole]   = useState<string>('manager');
  const [isSavingRole,   setIsSavingRole]   = useState(false);
  const [savedRoleName,  setSavedRoleName]  = useState<string | null>(null);
  const [localUserPerms, setLocalUserPerms] = useState<Record<number, string[]>>({});
  const [savingUsers,    setSavingUsers]    = useState<Set<number>>(new Set());
  const [savedUsers,     setSavedUsers]     = useState<Set<number>>(new Set());

  useEffect(() => {
    const map = (rolePermsRes as any)?.data ?? {};
    setLocalRolePerms({ ...map, owner: [...ALL_PERMS_LIST] });
  }, [rolePermsRes]);

  const teamMembers: PortalTeamMember[] = (teamRes as any)?.data ?? [];
  useEffect(() => {
    if (!teamMembers.length) return;
    const map: Record<number, string[]> = {};
    for (const m of teamMembers) map[m.id] = [...m.permissions];
    setLocalUserPerms(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRes]);

  const canEditRoleLevel = (tierLevel: number, role: string) =>
    role !== 'owner' && callerTierLevel <= 3 && tierLevel > callerTierLevel;

  const selectedChain     = DELEGATION_CHAIN.find(c => c.role === selectedRole)!;
  const isOwnerSelected   = selectedRole === 'owner';
  const canEditSelected   = canEditRoleLevel(selectedChain?.tierLevel ?? 99, selectedRole);
  const selectedRolePerms = localRolePerms[selectedRole] ?? (isOwnerSelected ? [...ALL_PERMS_LIST] : []);
  const membersForRole    = teamMembers.filter(m => getPortalTierLevel(m.role) === (selectedChain?.tierLevel ?? -1));

  const toggleRolePerm = (perm: string) => {
    if (!canEditSelected) return;
    const has     = selectedRolePerms.includes(perm);
    const updated = has ? selectedRolePerms.filter(p => p !== perm) : [...selectedRolePerms, perm];
    setLocalRolePerms(prev => ({ ...prev, [selectedRole]: updated }));
  };

  const saveRolePerms = () => {
    if (!canEditSelected || isSavingRole) return;
    setIsSavingRole(true);
    updateRolePermsMut.mutate({ data: { role: selectedRole, permissions: localRolePerms[selectedRole] ?? [] } } as any, {
      onSuccess: res => {
        const newMap = (res as any)?.data ?? {};
        setLocalRolePerms({ ...newMap, owner: [...ALL_PERMS_LIST] });
        setIsSavingRole(false);
        setSavedRoleName(selectedRole);
        setTimeout(() => setSavedRoleName(null), 2500);
        queryClient.invalidateQueries({ queryKey: getGetPortalRolePermissionsQueryKey() as any });
      },
      onError: () => {
        setIsSavingRole(false);
        const map = (rolePermsRes as any)?.data ?? {};
        setLocalRolePerms({ ...map, owner: [...ALL_PERMS_LIST] });
      },
    });
  };

  const toggleUserPerm = (userId: number, perm: string) => {
    const current = localUserPerms[userId] ?? [];
    const has     = current.includes(perm);
    const updated = has ? current.filter(p => p !== perm) : [...current, perm];
    setLocalUserPerms(prev => ({ ...prev, [userId]: updated }));
    setSavingUsers(prev => new Set([...prev, userId]));
    updateUserPermsMut.mutate({ userId, data: { permissions: updated } }, {
      onSuccess: res => {
        const serverPerms: string[] = (res as any)?.data?.permissions ?? updated;
        setLocalUserPerms(prev => ({ ...prev, [userId]: serverPerms }));
        setSavingUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
        setSavedUsers(prev => {
          const n = new Set([...prev, userId]);
          setTimeout(() => setSavedUsers(p => { const m = new Set(p); m.delete(userId); return m; }), 2000);
          return n;
        });
        queryClient.invalidateQueries({ queryKey: getGetPortalTeamQueryKey() as any });
      },
      onError: () => {
        setLocalUserPerms(prev => ({ ...prev, [userId]: current }));
        setSavingUsers(prev => { const n = new Set(prev); n.delete(userId); return n; });
      },
    });
  };

  if (isLoadingRP || isLoadingTeam) {
    return <div className="space-y-3"><Skeleton className="h-10 w-full" /><Skeleton className="h-56 w-full" /></div>;
  }

  return (
    <div className="space-y-5">
      {callerTierLevel <= 1 && (
        <Card className="p-4 border-amber-400 bg-amber-50 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-900">{t('ops.ownerSupremeTitle')}</p>
            <p className="text-xs text-amber-800 mt-1">{t('ops.ownerSupremeDesc')}</p>
          </div>
        </Card>
      )}
      {callerTierLevel === 3 && (
        <Card className="p-4 border-blue-300 bg-blue-50 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-blue-900">{t('ops.managerDelegationTitle')}</p>
            <p className="text-xs text-blue-800 mt-1">{t('ops.managerDelegationDesc')}</p>
          </div>
        </Card>
      )}

      {/* Delegation chain */}
      <div>
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-muted-foreground uppercase mb-3">{t('ops.chainTitle')}</p>
        <div className={`flex items-center gap-0 overflow-x-auto pb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {DELEGATION_CHAIN.map((entry, idx) => {
            const perms      = entry.role === 'owner' ? ALL_PERMS_LIST : (localRolePerms[entry.role] ?? []);
            const isSelected = selectedRole === entry.role;
            const isAbove    = entry.tierLevel <= callerTierLevel && entry.role !== 'owner' && callerTierLevel > 0;
            return (
              <React.Fragment key={entry.role}>
                <button onClick={() => setSelectedRole(entry.role)}
                  className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all min-w-[80px] ${
                    isSelected ? entry.activeClass : 'bg-background border-border text-muted-foreground hover:border-primary/40'
                  } ${isAbove ? 'opacity-50 cursor-default' : ''}`}
                >
                  <span className="text-[11px] font-bold whitespace-nowrap leading-tight">{t(`ops.role.${entry.role}`)}</span>
                  <span className="text-[10px] mt-0.5 opacity-70">{entry.role === 'owner' ? '∞' : `${perms.length}/${ALL_PERMS_LIST.length}`}</span>
                </button>
                {idx < DELEGATION_CHAIN.length - 1 && (
                  <ChevronRight className={`h-3 w-3 text-muted-foreground/30 flex-shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Role permissions card */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border-2 ${selectedChain?.activeClass ?? ''}`}>
              {t(`ops.role.${selectedRole}`)}
            </span>
            {isOwnerSelected && <span className="text-xs text-muted-foreground italic">{t('ops.ownerAllPerms')}</span>}
            {!isOwnerSelected && !canEditSelected && (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" />{t('ops.readonlyForTier')}
              </span>
            )}
          </div>
          {canEditSelected && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" disabled={isSavingRole}
                onClick={() => setLocalRolePerms(p => ({ ...p, [selectedRole]: [...ALL_PERMS_LIST] }))}>{t('ops.grantAll')}</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs px-2.5" disabled={isSavingRole}
                onClick={() => setLocalRolePerms(p => ({ ...p, [selectedRole]: [] }))}>{t('ops.clearAll')}</Button>
              <Button size="sm" className="h-7 text-xs px-3" onClick={saveRolePerms} disabled={isSavingRole}>
                {isSavingRole ? t('ops.rolePermsSaving')
                  : savedRoleName === selectedRole
                    ? <><CheckCircle className="h-3.5 w-3.5 me-1" />{t('ops.rolePermsSaved')}</>
                    : t('ops.saveRolePerms')}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-4">
          {PERM_GROUPS.map(group => (
            <div key={group.key}>
              <div className="flex items-center gap-1.5 mb-2.5 pb-1.5 border-b border-border/50">
                <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{t(`ops.group.${group.key}`)}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {group.perms.map(perm => {
                  const isOn = isOwnerSelected || selectedRolePerms.includes(perm);
                  return (
                    <label key={perm}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer select-none transition-colors ${
                        isOn ? 'border-primary/40 bg-primary/5' : 'border-border bg-background'
                      } ${(!canEditSelected || isOwnerSelected) ? 'cursor-default opacity-75' : 'hover:border-primary/60'}`}
                    >
                      <input type="checkbox" className="accent-primary h-3.5 w-3.5 shrink-0"
                        checked={isOn} onChange={() => toggleRolePerm(perm)}
                        disabled={!canEditSelected || isOwnerSelected || isSavingRole} />
                      <span className="text-xs leading-tight text-foreground/80">{t(PERM_LABEL_KEY[perm] ?? perm)}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* My team for this role */}
      {!isOwnerSelected && membersForRole.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold">{t('ops.teamForRole')}</h4>
            <Badge variant="secondary" className="text-xs h-5 px-2">{membersForRole.length}</Badge>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {membersForRole.map(member => {
              const perms    = localUserPerms[member.id] ?? member.permissions;
              const isSavingM = savingUsers.has(member.id);
              const wasSavedM = savedUsers.has(member.id);
              return (
                <Card key={member.id} className={`p-4 ${!member.isActive ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                      {memberInitials(member.displayName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm truncate">{member.displayName}</p>
                        {wasSavedM && <span className="text-xs text-emerald-600 flex items-center gap-0.5"><CheckCircle className="h-3 w-3" />{t('ops.saved')}</span>}
                        {isSavingM && <span className="text-xs text-muted-foreground italic">{t('ops.saving')}</span>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">{member.role}</span>
                        {!member.isActive && <span className="text-xs text-destructive">{t('ops.inactiveLabel')}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {ALL_PERMS_LIST.map(perm => (
                      <div key={perm} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground/75 leading-tight truncate">{t(PERM_LABEL_KEY[perm] ?? perm)}</span>
                        <Switch checked={perms.includes(perm)} onCheckedChange={() => toggleUserPerm(member.id, perm)}
                          disabled={isSavingM} className="scale-[0.8] shrink-0" />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {!isOwnerSelected && membersForRole.length === 0 && (
        <p className="text-sm text-muted-foreground italic">{t('ops.noTeamForRole')}</p>
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Staff Panel — team member CRUD
// ═══════════════════════════════════════════════════════════════════════════════
// ── Unit Map Panel ─────────────────────────────────────────────────────────────
interface PropertyUnitGridProps { property: PortalProperty; isRtl: boolean; }
const PropertyUnitGrid: React.FC<PropertyUnitGridProps> = ({ property, isRtl }) => {
  const { data: unitsRes, isLoading } = useGetPortalPropertyUnits(property.id, { page: 1, limit: 100 }, { query: { enabled: true } } as any);
  const units: PortalUnit[] = (unitsRes as any)?.data ?? [];

  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string; border: string }> = {
    available:   { label: isRtl ? 'متاح'  : 'Available',   bg: 'bg-green-50',  text: 'text-green-800', dot: 'bg-green-500',  border: 'border-green-300' },
    occupied:    { label: isRtl ? 'مؤجر'  : 'Occupied',    bg: 'bg-amber-50',  text: 'text-amber-800', dot: 'bg-amber-500',  border: 'border-amber-300' },
    maintenance: { label: isRtl ? 'صيانة' : 'Maintenance', bg: 'bg-red-50',    text: 'text-red-800',   dot: 'bg-red-500',    border: 'border-red-300'   },
    reserved:    { label: isRtl ? 'محجوز' : 'Reserved',    bg: 'bg-blue-50',   text: 'text-blue-800',  dot: 'bg-blue-500',   border: 'border-blue-300'  },
  };

  const available   = units.filter(u => u.status === 'available').length;
  const occupied    = units.filter(u => u.status === 'occupied').length;
  const maintenance = units.filter(u => u.status === 'maintenance').length;

  if (isLoading) return (
    <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
      {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}
    </div>
  );

  if (units.length === 0) return (
    <div className="text-center py-6 text-muted-foreground text-xs border border-dashed rounded-xl">
      {isRtl ? 'لا توجد وحدات مسجلة' : 'No units registered'}
    </div>
  );

  return (
    <div className="space-y-3">
      {/* Mini summary bar */}
      <div className="flex items-center gap-4 text-xs flex-wrap">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-green-500" />{isRtl ? 'متاح' : 'Available'}: <strong className="text-foreground">{available}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-amber-500" />{isRtl ? 'مؤجر' : 'Occupied'}: <strong className="text-foreground">{occupied}</strong>
        </span>
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-red-500" />{isRtl ? 'صيانة' : 'Maintenance'}: <strong className="text-foreground">{maintenance}</strong>
        </span>
      </div>
      {/* Unit card grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2">
        {units.map(unit => {
          const cfg = statusConfig[unit.status ?? 'available'] ?? statusConfig['available'];
          const tooltip = [
            `Unit ${unit.unitNumber}`,
            unit.type,
            unit.floor != null ? (isRtl ? `الطابق ${unit.floor}` : `Floor ${unit.floor}`) : null,
            unit.monthlyRent ? `SAR ${Number(unit.monthlyRent).toLocaleString()}/mo` : null,
            cfg.label,
          ].filter(Boolean).join(' · ');
          return (
            <div
              key={unit.id}
              title={tooltip}
              className={`${cfg.bg} ${cfg.border} border rounded-lg p-2 text-center cursor-default hover:shadow-md hover:scale-105 transition-all`}
            >
              <div className="flex justify-center mb-1">
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              </div>
              <p className={`text-[11px] font-bold ${cfg.text} leading-tight truncate`}>{unit.unitNumber}</p>
              <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight truncate capitalize">{unit.type}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface UnitMapPanelProps { t: (k: string) => string; isRtl: boolean; }
const UnitMapPanel: React.FC<UnitMapPanelProps> = ({ isRtl }) => {
  const { data: propsRes, isLoading: loadingProps } = useGetPortalProperties({ query: { enabled: true } } as any);
  const properties: PortalProperty[] = (propsRes as any)?.data ?? [];

  const statusLegend = [
    { dot: 'bg-green-500',  bg: 'bg-green-50 border-green-300',  label: isRtl ? 'متاح للإيجار'  : 'Available for rent'    },
    { dot: 'bg-amber-500',  bg: 'bg-amber-50 border-amber-300',  label: isRtl ? 'مؤجر حالياً'   : 'Currently occupied'    },
    { dot: 'bg-red-500',    bg: 'bg-red-50 border-red-300',      label: isRtl ? 'تحت الصيانة'   : 'Under maintenance'     },
    { dot: 'bg-blue-500',   bg: 'bg-blue-50 border-blue-300',    label: isRtl ? 'محجوز'         : 'Reserved / held'       },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary font-serif">{isRtl ? 'خريطة الوحدات' : 'Unit Map'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isRtl ? 'عرض بصري لحالة جميع الوحدات عبر العقارات — مرر الماوس على الوحدة لعرض التفاصيل' : 'Visual status board across all properties — hover over a unit to see details'}
        </p>
      </div>

      {/* Legend */}
      <Card className="p-4 border-border">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">{isRtl ? 'مفتاح الألوان' : 'Status Legend'}</p>
        <div className="flex flex-wrap gap-4">
          {statusLegend.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className={`w-5 h-5 rounded ${s.bg} border flex items-center justify-center`}>
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
              </div>
              <span className="text-xs text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Property grids */}
      {loadingProps ? (
        <div className="space-y-4">{[1,2].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}</div>
      ) : properties.length === 0 ? (
        <Card className="p-16 text-center border-dashed border-2">
          <LayoutGrid className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">{isRtl ? 'لا توجد عقارات مسجلة بعد' : 'No properties registered yet'}</p>
        </Card>
      ) : (
        <div className="space-y-5">
          {properties.map((prop: PortalProperty) => (
            <Card key={prop.id} className="p-5 border-border">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-bold text-base text-primary leading-tight">{prop.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">{prop.address}{prop.city ? `, ${prop.city}` : ''}</p>
                </div>
                <Badge variant={prop.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0 capitalize">
                  {prop.status}
                </Badge>
              </div>
              <PropertyUnitGrid property={prop} isRtl={isRtl} />
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

// ── Personnel Affairs Panel ────────────────────────────────────────────────────
interface PersonnelPanelProps { t: (k: string) => string; isRtl: boolean; callerTierLevel: number; }
const PersonnelPanel: React.FC<PersonnelPanelProps> = ({ isRtl, callerTierLevel }) => {
  const queryClient = useQueryClient();
  const { data: teamRes, isLoading } = useGetPortalTeam({ query: { enabled: true } } as any);
  const team: PortalTeamMember[] = (teamRes as any)?.data ?? [];

  const [resendingId,  setResendingId]  = useState<number | null>(null);
  const [resendResult, setResendResult] = useState<Record<number, string>>({});

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetPortalTeamQueryKey() as any });

  const toggleStatus = async (id: number) => {
    try {
      await fetch(`/api/portal/team/${id}/status`, { method: 'PATCH', credentials: 'include' });
      invalidate();
    } catch {}
  };

  const handleResendInvite = async (id: number) => {
    setResendingId(id);
    try {
      const res  = await fetch(`/api/staff/${id}/resend-invite`, { method: 'POST', credentials: 'include' });
      const data = await res.json();
      const msg  = data.inviteCode
        ? `${isRtl ? 'الكود' : 'Code'}: ${data.inviteCode}`
        : (isRtl ? 'تم الإرسال بنجاح' : 'Invite sent');
      setResendResult(prev => ({ ...prev, [id]: msg }));
    } catch {
      setResendResult(prev => ({ ...prev, [id]: isRtl ? 'فشل الإرسال' : 'Failed to send' }));
    } finally { setResendingId(null); }
  };

  const active   = team.filter(m => (m as any).isActive !== false).length;
  const inactive = team.filter(m => (m as any).isActive === false).length;
  const pending  = team.filter(m => (m as any).invitePending).length;

  const roleBadgeColor = (tl: number) => {
    if (tl <= 3)  return 'bg-blue-100 text-blue-800';
    if (tl <= 5)  return 'bg-teal-100 text-teal-800';
    if (tl <= 7)  return 'bg-orange-100 text-orange-800';
    return               'bg-slate-100 text-slate-700';
  };

  const kpis = [
    { label: isRtl ? 'إجمالي الأعضاء' : 'Total Members',    value: team.length, bg: 'bg-primary/10',  fg: 'text-primary',    Icon: Users      },
    { label: isRtl ? 'نشط'            : 'Active',            value: active,      bg: 'bg-green-100',   fg: 'text-green-600',  Icon: UserCheck  },
    { label: isRtl ? 'غير نشط'        : 'Inactive',          value: inactive,    bg: 'bg-slate-100',   fg: 'text-slate-600',  Icon: HardHat    },
    { label: isRtl ? 'دعوة معلقة'     : 'Pending Invite',    value: pending,     bg: 'bg-amber-100',   fg: 'text-amber-600',  Icon: Mail       },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary font-serif">{isRtl ? 'شؤون الموظفين' : 'Personnel Affairs'}</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {isRtl ? 'إدارة بيانات الفريق وحالة الوصول والدعوات' : 'Manage team records, access status, and onboarding invitations'}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.map(k => (
          <Card key={k.label} className="p-4 border-border">
            <div className="flex items-center gap-2 mb-2">
              <div className={`${k.bg} p-1.5 rounded-full`}><k.Icon className={`h-3.5 w-3.5 ${k.fg}`} /></div>
              <span className="text-xs text-muted-foreground leading-tight">{k.label}</span>
            </div>
            <p className="text-2xl font-bold text-primary">{isLoading ? '—' : k.value}</p>
          </Card>
        ))}
      </div>

      {/* Personnel table */}
      {isLoading ? (
        <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-16 rounded-lg" />)}</div>
      ) : team.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground">{isRtl ? 'لا يوجد أعضاء في الفريق بعد' : 'No team members yet'}</p>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wide">{isRtl ? 'الموظف'        : 'Member'  }</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">{isRtl ? 'الدور'          : 'Role'    }</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">{isRtl ? 'البريد الإلكتروني' : 'Email'   }</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">{isRtl ? 'الحالة'        : 'Status'  }</th>
                  <th className="px-4 py-3 text-start text-xs font-semibold text-muted-foreground uppercase tracking-wide">{isRtl ? 'الإجراءات'    : 'Actions' }</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {team.map((member: PortalTeamMember) => {
                  const m        = member as any;
                  const tierLvl  = getPortalTierLevel(m.role ?? 'viewer');
                  const isActive = m.isActive !== false;
                  const hasPend  = !!m.invitePending;
                  const initials = (m.displayName ?? m.username ?? 'U')
                    .split(' ').slice(0, 2).map((w: string) => w[0] ?? '').join('').toUpperCase();
                  const canManage = tierLvl > callerTierLevel;
                  return (
                    <tr key={m.id} className="hover:bg-muted/30 transition-colors">
                      {/* Member */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isActive ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-primary text-sm leading-tight">{m.displayName ?? m.username}</p>
                            <p className="text-xs text-muted-foreground">@{m.username}</p>
                          </div>
                        </div>
                      </td>
                      {/* Role */}
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${roleBadgeColor(tierLvl)}`}>
                          {m.role ?? 'viewer'}
                        </span>
                      </td>
                      {/* Email */}
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{m.email ?? '—'}</span>
                      </td>
                      {/* Status badge */}
                      <td className="px-4 py-3 text-center">
                        {hasPend ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            {isRtl ? 'دعوة معلقة' : 'Pending'}
                          </span>
                        ) : isActive ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            {isRtl ? 'نشط' : 'Active'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            {isRtl ? 'غير نشط' : 'Inactive'}
                          </span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {canManage && (
                            <Switch
                              checked={isActive}
                              onCheckedChange={() => toggleStatus(m.id)}
                              className="h-5 data-[state=checked]:bg-green-500"
                              aria-label={isRtl ? 'تبديل الحالة' : 'Toggle status'}
                            />
                          )}
                          {canManage && hasPend && (
                            <Button
                              size="sm" variant="outline"
                              className="h-7 text-xs px-2"
                              disabled={resendingId === m.id}
                              onClick={() => handleResendInvite(m.id)}
                            >
                              {resendingId === m.id
                                ? <RefreshCw className="h-3 w-3 animate-spin" />
                                : (isRtl ? 'إعادة الدعوة' : 'Resend Invite')}
                            </Button>
                          )}
                          {resendResult[m.id] && (
                            <span className="text-xs text-green-600 font-medium">{resendResult[m.id]}</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

// ── Staff Panel ────────────────────────────────────────────────────────────────
interface StaffPanelProps { t: (k: string) => string; isRtl: boolean; callerTierLevel: number; }
const emptyStaffForm = () => ({ username: '', displayName: '', email: '', phone: '', password: '', role: 'manager' });

const StaffPanel: React.FC<StaffPanelProps> = ({ t, isRtl, callerTierLevel }) => {
  const queryClient = useQueryClient();
  const { data: teamRes, isLoading } = useGetPortalTeam({ query: { enabled: true } } as any);
  const teamMembers: PortalTeamMember[] = (teamRes as any)?.data ?? [];

  const [showAdd,  setShowAdd]  = useState(false);
  const [form,     setForm]     = useState(emptyStaffForm());
  const [adding,   setAdding]   = useState(false);
  const [addErr,   setAddErr]   = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getGetPortalTeamQueryKey() as any });

  const handleAdd = async () => {
    if (!form.username || !form.displayName || !form.email || !form.password || !form.role) return;
    if (form.password.length < 8) { setAddErr(t('staff.passwordTooShort')); return; }
    setAdding(true); setAddErr('');
    try {
      const res = await fetch('/api/portal/team', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.status === 409) { setAddErr(t('staff.usernameTaken')); setAdding(false); return; }
      if (!res.ok) throw new Error('Failed');
      setShowAdd(false); setForm(emptyStaffForm()); invalidate();
    } catch { setAddErr('Failed to create member. Please try again.'); }
    finally { setAdding(false); }
  };

  const toggleStatus = async (id: number) => {
    try {
      await fetch(`/api/portal/team/${id}/status`, { method: 'PATCH', credentials: 'include' });
      invalidate();
    } catch {}
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/portal/team/${deleteId}`, { method: 'DELETE', credentials: 'include' });
      setDeleteId(null); invalidate();
    } catch {} finally { setDeleting(false); }
  };

  const assignableRoles = STAFF_ASSIGNABLE_ROLES.filter(r => getPortalTierLevel(r.value) > callerTierLevel);

  const roleBadgeColor = (tierLevel: number) => {
    if (tierLevel <= 3)  return 'bg-blue-100    text-blue-800';
    if (tierLevel <= 5)  return 'bg-teal-100    text-teal-800';
    if (tierLevel <= 7)  return 'bg-orange-100  text-orange-800';
    if (tierLevel <= 10) return 'bg-slate-100   text-slate-700';
    return                      'bg-gray-100    text-gray-700';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary font-serif">{t('staff.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('staff.subtitle')}</p>
        </div>
        <Button onClick={() => { setShowAdd(true); setForm(emptyStaffForm()); setAddErr(''); }} className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />{t('staff.addMember')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : teamMembers.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-2">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm text-muted-foreground mb-4">{t('staff.noMembers')}</p>
          <Button onClick={() => setShowAdd(true)} variant="outline" className="flex items-center gap-2">
            <UserPlus className="h-4 w-4" />{t('staff.addMember')}
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium text-start">{t('staff.name')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('staff.username')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('staff.role')}</th>
                  <th className="px-4 py-3 font-medium text-center">{t('staff.active')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('portal.col.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {teamMembers.map(m => {
                  const tierLvl = getPortalTierLevel(m.role);
                  return (
                    <tr key={m.id} className={`hover:bg-muted/40 transition-colors ${!m.isActive ? 'opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                            {memberInitials(m.displayName)}
                          </div>
                          <span className="font-medium text-primary">{m.displayName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">@{m.username}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${roleBadgeColor(tierLvl)}`}>{m.role}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Switch checked={m.isActive ?? false} onCheckedChange={() => toggleStatus(m.id)} className="scale-[0.85]" />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(m.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add Member Dialog */}
      <Dialog open={showAdd} onOpenChange={v => { if (!v) setShowAdd(false); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t('staff.addTitle')}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>{t('staff.name')} *</Label>
              <Input value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} placeholder="Nada Yousef" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.username')} *</Label>
              <Input value={form.username} onChange={e => setForm({ ...form, username: e.target.value.toLowerCase() })} placeholder="nada_yousef" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.email')} *</Label>
              <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="nada@example.com" />
            </div>
            <div className="space-y-1.5">
              <Label>{isRtl ? 'رقم الجوال' : 'Mobile Number'}</Label>
              <Input type="tel" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+966501234567" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.password')} *</Label>
              <Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Min. 8 characters" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.role')} *</Label>
              <Select value={form.role} onValueChange={v => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {assignableRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {addErr && <p className="text-xs text-destructive">{addErr}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAdd(false)}>{t('staff.cancel')}</Button>
            <Button onClick={handleAdd} disabled={adding || !form.username || !form.displayName || !form.email || !form.password}>
              {adding ? t('staff.creating') : t('staff.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteId !== null} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('staff.delete')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('staff.confirmDelete')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('staff.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('staff.deleting') : t('staff.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Units sub-panel (unchanged from original)
// ═══════════════════════════════════════════════════════════════════════════════
interface UnitsPanelProps { property: PortalProperty; onBack: () => void; t: (k: string) => string; isRtl: boolean; }

const UnitsPanel: React.FC<UnitsPanelProps> = ({ property, onBack, t, isRtl }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editUnit, setEditUnit] = useState<PortalUnit | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form,     setForm]     = useState<UnitFormState>(emptyUnitForm());

  const { data: unitsRes, isLoading } = useGetPortalPropertyUnits(property.id, { page: 1, limit: 100 }, { query: { enabled: true } } as any);
  const units = (unitsRes as any)?.data ?? [];

  const createMut = useCreatePortalUnit();
  const updateMut = useUpdatePortalUnit();
  const deleteMut = useDeletePortalUnit();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertyUnitsQueryKey(property.id) as any });
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });
  };

  const openAdd  = () => { setForm(emptyUnitForm()); setEditUnit(null); setShowForm(true); };
  const openEdit = (u: PortalUnit) => {
    setForm({
      unitNumber:    u.unitNumber,
      floor:         u.floor != null ? String(u.floor) : '',
      type:          u.type,
      area:          u.area != null ? String(u.area) : '',
      bedroomCount:  String(u.bedroomCount ?? 0),
      bathroomCount: String(u.bathroomCount ?? 1),
      status:        u.status,
      monthlyRent:   u.monthlyRent != null ? String(u.monthlyRent) : '',
      notes:         u.notes ?? '',
    });
    setEditUnit(u); setShowForm(true);
  };

  const buildPayload = (): PortalUnitInput => ({
    portalPropertyId: property.id,
    unitNumber:    form.unitNumber.trim(),
    floor:         form.floor ? parseInt(form.floor) : undefined,
    type:          form.type,
    area:          form.area ? parseFloat(form.area) : undefined,
    bedroomCount:  parseInt(form.bedroomCount) || 0,
    bathroomCount: parseInt(form.bathroomCount) || 1,
    status:        form.status,
    monthlyRent:   form.monthlyRent ? parseFloat(form.monthlyRent) : undefined,
    notes:         form.notes.trim() || undefined,
    tenantId:      1,
  } as any);

  const handleSave = () => {
    if (!form.unitNumber.trim()) return;
    const payload = buildPayload();
    if (editUnit) {
      updateMut.mutate({ id: editUnit.id, data: payload } as any, { onSuccess: () => { invalidate(); setShowForm(false); } });
    } else {
      createMut.mutate({ data: payload }, { onSuccess: () => { invalidate(); setShowForm(false); } });
    }
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteMut.mutate({ id: deleteId } as any, { onSuccess: () => { invalidate(); setDeleteId(null); } });
  };

  const isBusy = createMut.isPending || updateMut.isPending;
  const statusColor = (s: string) => s === 'available' ? 'default' : s === 'occupied' ? 'secondary' : 'outline';
  const unitTypeLabel = (type: string) => { const k = `portal.type.${type}`; const tr = t(k); return tr !== k ? tr : type; };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack} className="flex items-center gap-1 text-muted-foreground">
          {isRtl ? <ChevronRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {t('portal.backToProperties')}
        </Button>
        <span className="text-muted-foreground">/</span>
        <span className="font-semibold text-primary">{property.name}</span>
      </div>

      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-bold text-primary">{t('portal.units')}</h3>
        <Button onClick={openAdd} className="flex items-center gap-2"><Plus className="h-4 w-4" />{t('portal.addUnit')}</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
      ) : units.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed border-2">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('portal.noUnits')}</p>
          <Button onClick={openAdd} variant="outline" className="mt-4"><Plus className="h-4 w-4 mr-2" />{t('portal.addUnit')}</Button>
        </Card>
      ) : (
        <Card className="border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitNumber')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitType')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitArea')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitBedrooms')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitBathrooms')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitStatus')}</th>
                  <th className="px-4 py-3 font-medium text-start">{t('portal.col.unitRent')}</th>
                  <th className="px-4 py-3 font-medium text-end">{t('portal.col.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {units.map((u: PortalUnit) => (
                  <tr key={u.id} className="hover:bg-muted/40 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">{u.unitNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">{unitTypeLabel(u.type)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.area != null ? `${u.area} م²` : '—'}</td>
                    <td className="px-4 py-3 text-center">{u.bedroomCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">{u.bathroomCount ?? 1}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(u.status)}>
                        {t(`portal.status.${u.status}`) !== `portal.status.${u.status}` ? t(`portal.status.${u.status}`) : u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{u.monthlyRent != null ? fmtSAR(u.monthlyRent) : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog open={showForm} onOpenChange={v => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editUnit ? t('portal.editUnit') : t('portal.addUnit')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitNumber')} *</Label>
              <Input value={form.unitNumber} onChange={e => setForm({ ...form, unitNumber: e.target.value })} placeholder="A-101" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitType')}</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_TYPES.map(tp => <SelectItem key={tp} value={tp}>{t(`portal.type.${tp}`) !== `portal.type.${tp}` ? t(`portal.type.${tp}`) : tp}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitStatus')}</Label>
              <Select value={form.status} onValueChange={v => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`portal.status.${s}`) !== `portal.status.${s}` ? t(`portal.status.${s}`) : s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{t('portal.unitFloor')}</Label><Input type="number" value={form.floor} onChange={e => setForm({ ...form, floor: e.target.value })} placeholder="1" /></div>
            <div className="space-y-1.5"><Label>{t('portal.unitArea')}</Label><Input type="number" value={form.area} onChange={e => setForm({ ...form, area: e.target.value })} placeholder="75" /></div>
            <div className="space-y-1.5"><Label>{t('portal.unitBedrooms')}</Label><Input type="number" min="0" value={form.bedroomCount} onChange={e => setForm({ ...form, bedroomCount: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>{t('portal.unitBathrooms')}</Label><Input type="number" min="1" value={form.bathroomCount} onChange={e => setForm({ ...form, bathroomCount: e.target.value })} /></div>
            <div className="col-span-2 space-y-1.5"><Label>{t('portal.unitRent')}</Label><Input type="number" value={form.monthlyRent} onChange={e => setForm({ ...form, monthlyRent: e.target.value })} placeholder="3500" /></div>
            <div className="col-span-2 space-y-1.5"><Label>{t('portal.unitNotes')}</Label><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('portal.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.unitNumber.trim() || isBusy}>{isBusy ? t('portal.saving') : t('portal.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteId !== null} onOpenChange={v => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('portal.deleteUnit')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDeleteUnit')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>{deleteMut.isPending ? t('portal.deleting') : t('portal.delete')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// Portal Dashboard — main shell with sidebar navigation
// ═══════════════════════════════════════════════════════════════════════════════
export const PortalDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl, language } = useLanguage();
  const queryClient = useQueryClient();

  const [activePanel,      setActivePanel]      = useState('');
  const [propertyIdFilter, setPropertyIdFilter] = useState<string>('all');
  const [statusFilter,     setStatusFilter]     = useState<string>('all');
  const [months,           setMonths]           = useState<string>('6');
  const [selectedProp,     setSelectedProp]     = useState<PortalProperty | null>(null);
  const [showPropForm,     setShowPropForm]     = useState(false);
  const [editProp,         setEditProp]         = useState<PortalProperty | null>(null);
  const [deletePropId,     setDeletePropId]     = useState<number | null>(null);
  const [propForm,         setPropForm]         = useState<PropFormState>(emptyPropForm());
  const [contactSubject,   setContactSubject]   = useState('');
  const [contactMessage,   setContactMessage]   = useState('');
  const [contactSending,   setContactSending]   = useState(false);
  const [contactSuccess,   setContactSuccess]   = useState(false);
  const [contactError,     setContactError]     = useState('');

  useEffect(() => {
    if (!import.meta.env.DEV && !isLoading && !isAuthenticated) setLocation('/portal');
  }, [isLoading, isAuthenticated, setLocation]);

  useEffect(() => {
    if (user) {
      const role = ((user as unknown) as Record<string, string>)?.role ?? '';
      const tier = getPortalTierLevel(role);
      if (tier <= 1) setActivePanel('cms');
      else if (tier <= 3) setActivePanel('rbac');
      else if (tier <= 7) setActivePanel('properties');
      else setActivePanel('portfolio');
    }
  }, [user]);

  const { data: propertiesRes, isLoading: isLoadingProps }    = useGetPortalProperties({ page: 1, limit: 50 }, { query: { enabled: isAuthenticated } } as any);
  const { data: bookingsRes,   isLoading: isLoadingBookings } = useGetPortalBookings({ page: 1, limit: 20, ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}), ...(statusFilter !== 'all' ? { status: statusFilter } : {}) }, { query: { enabled: isAuthenticated } } as any);
  const { data: financialsRes, isLoading: isLoadingFin }      = useGetPortalFinancials({ months: parseInt(months), ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}) }, { query: { enabled: isAuthenticated } } as any);

  const createPropMut = useCreatePortalProperty();
  const updatePropMut = useUpdatePortalProperty();
  const deletePropMut = useDeletePortalProperty();
  const invalidateProps = () => queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });

  if (!import.meta.env.DEV && (isLoading || !isAuthenticated)) {
    return <div className="min-h-screen flex items-center justify-center bg-muted"><Skeleton className="h-32 w-64 rounded-xl" /></div>;
  }

  const properties  = (propertiesRes as any)?.data  ?? [];
  const bookings    = (bookingsRes as any)?.data     ?? [];
  const financials  = (financialsRes as any)?.data;

  const userRole    = ((user as unknown) as Record<string, string>)?.role ?? '';
  const tierLevel   = getPortalTierLevel(userRole);
  const displayName = ((user as unknown) as Record<string, string>)?.displayName ?? ((user as unknown) as Record<string, string>)?.username ?? '';
  const userTier    = roleTier(userRole);

  const handleLogout = async () => { await logout(); setLocation('/portal'); };

  const propTypeLabel = (type?: string) => { if (!type) return ''; const k = `portal.type.${type.toLowerCase()}`; const tr = t(k); return tr !== k ? tr : type; };
  const statusLabel   = (status: string) => ({ active: t('portal.status.active'), inactive: t('portal.status.inactive'), confirmed: t('portal.status.confirmed'), checked_in: t('portal.status.checkedIn'), checked_out: t('portal.status.checkedOut'), cancelled: t('portal.status.cancelled'), pending: t('portal.status.pending') }[status] ?? status.replace(/_/g, ' '));
  const lastMonths    = (n: string) => isRtl ? `آخر ${n} أشهر` : `Last ${n} months`;
  const fmtMonth      = (v: string) => { const [y, m] = v.split('-'); return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' }); };
  const fmtMonthFull  = (v: string) => new Date(v + '-01T00:00:00').toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });

  const openAddProp  = () => { setPropForm(emptyPropForm()); setEditProp(null); setShowPropForm(true); };
  const openEditProp = (p: PortalProperty) => { setPropForm({ name: p.name, type: p.type, address: p.address, city: p.city, country: p.country, description: (p as any).description ?? '', status: p.status }); setEditProp(p); setShowPropForm(true); };
  const handleSaveProp = () => {
    if (!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim()) return;
    const payload: PortalPropertyInput = { name: propForm.name.trim(), type: propForm.type, address: propForm.address.trim(), city: propForm.city.trim(), country: propForm.country.trim() || 'SA', description: propForm.description.trim() || undefined, status: propForm.status } as any;
    if (editProp) { updatePropMut.mutate({ id: editProp.id, data: payload } as any, { onSuccess: () => { invalidateProps(); setShowPropForm(false); } }); }
    else { createPropMut.mutate({ data: payload }, { onSuccess: () => { invalidateProps(); setShowPropForm(false); } }); }
  };
  const handleDeleteProp = () => {
    if (deletePropId == null) return;
    deletePropMut.mutate({ id: deletePropId } as any, { onSuccess: () => { invalidateProps(); setDeletePropId(null); } });
  };
  const isPropBusy = createPropMut.isPending || updatePropMut.isPending;

  const sendContactMessage = async () => {
    if (!contactSubject.trim() || !contactMessage.trim()) return;
    setContactSending(true); setContactError('');
    try {
      const res = await fetch('/realestate-api/portal/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ subject: contactSubject.trim(), message: contactMessage.trim() }) });
      if (!res.ok) throw new Error('Failed');
      setContactSuccess(true); setContactSubject(''); setContactMessage('');
    } catch { setContactError(t('portal.contact.error')); }
    finally { setContactSending(false); }
  };

  // Navigation items by role
  const navItems = [
    ...(tierLevel <= 1 ? [{ key: 'cms',        icon: Globe,        label: t('admin.nav.cms')        }] : []),
    ...(tierLevel <= 3 ? [{ key: 'rbac',        icon: ShieldCheck,  label: t('admin.nav.rbac')       }] : []),
    ...(tierLevel <= 3 ? [{ key: 'staff',       icon: Users,        label: t('admin.nav.staff')      }] : []),
    ...(tierLevel <= 3 ? [{ key: 'personnel',   icon: UserCheck,    label: isRtl ? 'شؤون الموظفين' : 'Personnel'    }] : []),
    ...(tierLevel <= 7 ? [{ key: 'properties',  icon: Building,     label: t('admin.nav.properties') }] : []),
    ...(tierLevel <= 7 ? [{ key: 'unit-map',    icon: LayoutGrid,   label: isRtl ? 'خريطة الوحدات' : 'Unit Map'     }] : []),
    ...(tierLevel <= 7 ? [{ key: 'financials',  icon: BarChart2,    label: t('admin.nav.financials') }] : []),
    ...(tierLevel <= 3 ? [{ key: 'ai',          icon: BrainCircuit, label: t('admin.nav.ai')         }] : []),
    ...(tierLevel > 7  ? [{ key: 'portfolio',   icon: TrendingUp,   label: t('admin.nav.portfolio')  }] : []),
  ] as { key: string; icon: React.ElementType; label: string }[];

  return (
    <div className="h-dvh bg-muted flex flex-col overflow-hidden">
      <Helmet>
        <title>{(userTier === 'admin' || userTier === 'supervisor') ? (isRtl ? 'لوحة التحكم الإدارية' : 'Admin Dashboard') : (isRtl ? 'بوابة المستثمر' : 'Investor Portal')} | ركز</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <header className="bg-card border-b border-border shrink-0 shadow-sm z-40">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Building className="h-4 w-4 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-bold text-primary leading-none">{isRtl ? 'ركز للحلول الذكية' : 'Rakez Smart Solutions'}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{tierLevel <= 7 ? t('portal.managementPortal') : t('portal.myPortfolio')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-xs text-muted-foreground hidden sm:block">{t('portal.welcome')} <strong>{displayName}</strong></span>
            <Badge variant="outline" className="text-xs hidden sm:inline-flex capitalize">{userRole}</Badge>
            <Link href="/" className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 border border-border rounded-md px-2 py-1">
              {isRtl ? <ArrowRight className="h-3 w-3" /> : <ArrowLeft className="h-3 w-3" />}
              <span className="hidden sm:inline">{t('portal.backToWebsite')}</span>
            </Link>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="flex items-center gap-1.5 text-muted-foreground">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t('portal.logout')}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Sidebar (desktop) ─────────────────────────────────────────────── */}
        <aside className="hidden md:flex flex-col w-52 bg-card border-r border-border shrink-0">
          <div className="p-3 space-y-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-3 py-2">
              {isRtl ? 'لوحة التحكم' : 'Control Panel'}
            </p>
            {navItems.map(item => (
              <button key={item.key} onClick={() => setActivePanel(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-start ${
                  activePanel === item.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </div>
        </aside>

        {/* ── Mobile nav (bottom tabs) ──────────────────────────────────────── */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex overflow-x-auto">
          {navItems.map(item => (
            <button key={item.key} onClick={() => setActivePanel(item.key)}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors min-w-[3.5rem] ${
                activePanel === item.key ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              <item.icon className={`h-5 w-5 ${activePanel === item.key ? 'text-primary' : 'text-muted-foreground'}`} />
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <main className="flex-1 overflow-auto p-4 md:p-6 pb-20 md:pb-6 min-h-0">

          {/* CMS — Owner only */}
          {activePanel === 'cms' && tierLevel <= 1 && <CmsPanel t={t} isRtl={isRtl} />}

          {/* RBAC */}
          {activePanel === 'rbac' && tierLevel <= 3 && (
            <div className="space-y-4">
              <div>
                <h1 className="text-xl font-bold text-primary font-serif">{t('ops.title')}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">{t('ops.subtitle')}</p>
              </div>
              <RbacPanel user={user} t={t} isRtl={isRtl} />
            </div>
          )}

          {/* Staff Management */}
          {activePanel === 'staff' && tierLevel <= 3 && <StaffPanel t={t} isRtl={isRtl} callerTierLevel={tierLevel} />}

          {/* Personnel Affairs */}
          {activePanel === 'personnel' && tierLevel <= 3 && <PersonnelPanel t={t} isRtl={isRtl} callerTierLevel={tierLevel} />}

          {/* Unit Map */}
          {activePanel === 'unit-map' && tierLevel <= 7 && <UnitMapPanel t={t} isRtl={isRtl} />}

          {/* Properties */}
          {activePanel === 'properties' && tierLevel <= 7 && (
            selectedProp ? (
              <UnitsPanel property={selectedProp} onBack={() => setSelectedProp(null)} t={t} isRtl={isRtl} />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-primary font-serif">{t('portal.manage')}</h2>
                  <Button onClick={openAddProp} className="flex items-center gap-2"><Plus className="h-4 w-4" />{t('portal.addProperty')}</Button>
                </div>
                {isLoadingProps ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{[1, 2, 3].map(i => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}</div>
                ) : properties.length === 0 ? (
                  <Card className="p-16 text-center text-muted-foreground border-dashed border-2">
                    <Home className="h-14 w-14 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">{t('portal.noProperties')}</p>
                    <Button onClick={openAddProp} variant="outline"><Plus className="h-4 w-4 mr-2" />{t('portal.addProperty')}</Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop: PortalProperty) => (
                      <Card key={prop.id} className="p-5 border-border flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-base text-primary leading-tight">{prop.name}</h3>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>{statusLabel(prop.status ?? '')}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{propTypeLabel(prop.type)}</p>
                        <p className="text-xs text-muted-foreground mb-1 truncate">{prop.address}</p>
                        <p className="text-xs text-muted-foreground mb-3">{prop.city}{prop.country ? `, ${prop.country}` : ''}</p>
                        <div className="mt-auto pt-3 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">{t('portal.units')}</span>
                            <span className="font-bold text-primary">{(prop as any).unitCount ?? 0} {t('portal.unitsCount')}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button variant="outline" size="sm" className="col-span-1 flex items-center gap-1.5" onClick={() => setSelectedProp(prop)}>
                              <Layers className="h-3.5 w-3.5" />{t('portal.units')}
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center gap-1.5" onClick={() => openEditProp(prop)}>
                              <Pencil className="h-3.5 w-3.5" />{t('portal.editProperty')}
                            </Button>
                            <Button variant="outline" size="sm" className="flex items-center gap-1.5 text-destructive hover:text-destructive" onClick={() => setDeletePropId(prop.id)}>
                              <Trash2 className="h-3.5 w-3.5" />{t('portal.delete')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )
          )}

          {/* Financials */}
          {activePanel === 'financials' && tierLevel <= 7 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-primary font-serif">{t('portal.financials')}</h2>

              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-muted-foreground">{t('portal.period')}:</span>
                {['3', '6', '12'].map(m => (
                  <button key={m} onClick={() => setMonths(m)}
                    className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${months === m ? 'bg-primary text-primary-foreground' : 'bg-card border border-border hover:border-primary text-muted-foreground'}`}
                  >{m}M</button>
                ))}
              </div>

              {isLoadingFin ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32 rounded-xl" />)}</div>
              ) : (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: t('portal.revenue'), value: fmtSAR(financials?.totalRevenue ?? 0), sub: lastMonths(months), icon: DollarSign, bg: 'bg-green-100', fg: 'text-green-600' },
                    { label: t('portal.expenses'), value: fmtSAR(financials?.totalExpenses ?? 0), sub: lastMonths(months), icon: TrendingDown, bg: 'bg-red-100', fg: 'text-red-500' },
                    { label: t('portal.netProfit'), value: fmtSAR(financials?.netProfit ?? 0), sub: t('portal.revenueMinusExpenses'), icon: TrendingUp, bg: 'bg-secondary/20', fg: 'text-secondary' },
                    { label: t('portal.margin'), value: `${financials?.profitMargin ?? 0}%`, sub: t('portal.profitMargin'), icon: BarChart2, bg: 'bg-primary/10', fg: 'text-primary' },
                  ].map(kpi => (
                    <Card key={kpi.label} className="p-5 border-border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`${kpi.bg} p-2.5 rounded-full`}><kpi.icon className={`h-5 w-5 ${kpi.fg}`} /></div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                      </div>
                      <p className="text-2xl font-bold text-primary">{kpi.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.sub}</p>
                    </Card>
                  ))}
                </div>
              )}

              <Card className="p-6 border-border">
                <h3 className="text-lg font-bold text-primary mb-6">{t('portal.monthlyCashFlow')}</h3>
                {isLoadingFin ? <Skeleton className="h-64 w-full rounded-lg" />
                  : (financials?.monthly ?? []).length === 0 ? (
                    <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">{t('portal.noFinancialData')}</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={280}>
                      <ComposedChart data={financials?.monthly ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={fmtMonth} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                        <Tooltip formatter={(value: number, name: string) => [fmtSAR(value), name]} />
                        <Legend />
                        <Bar dataKey="revenue"   name={t('portal.revenue')}   fill="hsl(var(--secondary))"       radius={[3, 3, 0, 0]} />
                        <Bar dataKey="expenses"  name={t('portal.expenses')}  fill="hsl(var(--destructive)/0.6)" radius={[3, 3, 0, 0]} />
                        <Line type="monotone" dataKey="netIncome" name={t('portal.netIncome')} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
              </Card>

              {!isLoadingFin && (financials?.monthly ?? []).length > 0 && (
                <Card className="border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-muted text-muted-foreground">
                        <tr>
                          <th className="px-6 py-3 font-medium">{t('portal.col.month')}</th>
                          <th className="px-6 py-3 font-medium text-right">{t('portal.revenue')}</th>
                          <th className="px-6 py-3 font-medium text-right">{t('portal.expenses')}</th>
                          <th className="px-6 py-3 font-medium text-right">{t('portal.netIncome')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {[...(financials?.monthly ?? [])].reverse().map((row: any) => (
                          <tr key={row.month} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-3 font-medium text-primary">{fmtMonthFull(row.month)}</td>
                            <td className="px-6 py-3 text-right text-green-700">{fmtSAR(row.revenue)}</td>
                            <td className="px-6 py-3 text-right text-red-600">{fmtSAR(row.expenses)}</td>
                            <td className={`px-6 py-3 text-right font-semibold ${row.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>{fmtSAR(row.netIncome)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* AI Governance — admin/manager only */}
          {activePanel === 'ai' && tierLevel <= 3 && (
            <AiGovernancePanel t={t} isRtl={isRtl} />
          )}

          {/* Portfolio (clients/investors) */}
          {activePanel === 'portfolio' && tierLevel > 7 && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-primary font-serif">{t('portal.portfolio.title')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t('portal.portfolio.subtitle')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: t('portal.portfolio.monthlyIncome'), value: fmtSAR(financials?.totalRevenue ?? 0), icon: DollarSign, bg: 'bg-green-100', fg: 'text-green-600' },
                  { label: t('portal.portfolio.totalInvestment'), value: String(properties.length), icon: Building, bg: 'bg-primary/10', fg: 'text-primary' },
                  { label: t('portal.portfolio.netReturn'), value: fmtSAR(financials?.netProfit ?? 0), icon: TrendingUp, bg: 'bg-secondary/20', fg: 'text-secondary' },
                ].map(kpi => (
                  <Card key={kpi.label} className="p-5 border-border">
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`${kpi.bg} p-2.5 rounded-full`}><kpi.icon className={`h-5 w-5 ${kpi.fg}`} /></div>
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{kpi.label}</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">{kpi.value}</p>
                  </Card>
                ))}
              </div>

              {properties.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-primary mb-3">{t('portal.managedProperties')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map((prop: PortalProperty) => (
                      <Card key={prop.id} className="p-4 border-border">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm text-primary leading-tight">{prop.name}</h4>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0 ms-2">{statusLabel(prop.status ?? '')}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{propTypeLabel(prop.type)}</p>
                        <p className="text-xs text-muted-foreground truncate">{prop.city}</p>
                        <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{t('portal.roomsUnit')}</span>
                          <span className="font-semibold text-primary">{(prop as any).unitCount ?? 0}</span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              )}

              {properties.length === 0 && !isLoadingProps && (
                <p className="text-sm text-muted-foreground py-4">{t('portal.portfolio.noData')}</p>
              )}

              {/* Contact / Support form */}
              <Card className="p-6 border-border">
                <div className="flex items-center gap-3 mb-5">
                  <div className="bg-primary/10 p-2.5 rounded-full"><MessageSquare className="h-5 w-5 text-primary" /></div>
                  <div>
                    <h3 className="font-semibold text-primary">{t('portal.contact.title')}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{t('portal.contact.subtitle')}</p>
                  </div>
                </div>
                {contactSuccess ? (
                  <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200 text-green-700">
                    <CheckCircle className="h-5 w-5 shrink-0" />
                    <p className="text-sm">{t('portal.contact.success')}</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm">{t('portal.contact.subject')}</Label>
                      <Input className="mt-1.5" placeholder={t('portal.contact.subjectPlaceholder')} value={contactSubject} onChange={e => setContactSubject(e.target.value)} disabled={contactSending} dir={isRtl ? 'rtl' : 'ltr'} />
                    </div>
                    <div>
                      <Label className="text-sm">{t('portal.contact.message')}</Label>
                      <Textarea className="mt-1.5 min-h-[100px]" placeholder={t('portal.contact.messagePlaceholder')} value={contactMessage} onChange={e => setContactMessage(e.target.value)} disabled={contactSending} dir={isRtl ? 'rtl' : 'ltr'} />
                    </div>
                    {contactError && <p className="text-sm text-destructive">{contactError}</p>}
                    <Button onClick={sendContactMessage} disabled={!contactSubject.trim() || !contactMessage.trim() || contactSending} className="w-full sm:w-auto">
                      {contactSending ? t('portal.contact.sending') : t('portal.contact.send')}
                    </Button>
                  </div>
                )}
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* ── Add/Edit Property Dialog ─────────────────────────────────────────── */}
      <Dialog open={showPropForm} onOpenChange={v => { if (!v) setShowPropForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editProp ? t('portal.editProperty') : t('portal.addProperty')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5"><Label>{t('portal.propertyName')} *</Label><Input value={propForm.name} onChange={e => setPropForm({ ...propForm, name: e.target.value })} placeholder={isRtl ? 'برج الرياض' : 'Riyadh Tower'} /></div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyType')}</Label>
              <Select value={propForm.type} onValueChange={v => setPropForm({ ...propForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_TYPES.map(tp => <SelectItem key={tp} value={tp}>{propTypeLabel(tp)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyStatus')}</Label>
              <Select value={propForm.status} onValueChange={v => setPropForm({ ...propForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{PROPERTY_STATUSES.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5"><Label>{t('portal.propertyAddress')} *</Label><Input value={propForm.address} onChange={e => setPropForm({ ...propForm, address: e.target.value })} placeholder={isRtl ? 'شارع الملك فهد' : 'King Fahd Road'} /></div>
            <div className="space-y-1.5"><Label>{t('portal.propertyCity')} *</Label><Input value={propForm.city} onChange={e => setPropForm({ ...propForm, city: e.target.value })} placeholder={isRtl ? 'الرياض' : 'Riyadh'} /></div>
            <div className="space-y-1.5"><Label>{t('portal.propertyCountry')}</Label><Input value={propForm.country} onChange={e => setPropForm({ ...propForm, country: e.target.value })} placeholder="SA" /></div>
            <div className="col-span-2 space-y-1.5"><Label>{t('portal.propertyDescription')}</Label><Textarea rows={3} value={propForm.description} onChange={e => setPropForm({ ...propForm, description: e.target.value })} /></div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPropForm(false)}>{t('portal.cancel')}</Button>
            <Button onClick={handleSaveProp} disabled={!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim() || isPropBusy}>
              {isPropBusy ? t('portal.saving') : t('portal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Property Confirm ──────────────────────────────────────────── */}
      <Dialog open={deletePropId !== null} onOpenChange={v => { if (!v) setDeletePropId(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{t('portal.deleteProperty')}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDelete')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletePropId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteProp} disabled={deletePropMut.isPending}>
              {deletePropMut.isPending ? t('portal.deleting') : t('portal.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PortalAIAgent />
    </div>
  );
};
