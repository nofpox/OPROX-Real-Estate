import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PortalAIAgent } from '@/components/PortalAIAgent';
import { useLocation, Link } from 'wouter';
import { useQueryClient } from '@tanstack/react-query';
import { usePortalAuth } from '@/lib/portal-auth';
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import {
  LogOut, Building, Calendar, Percent, ArrowRight, ArrowLeft,
  TrendingUp, TrendingDown, DollarSign, BarChart2,
  Plus, Pencil, Trash2, Home, ChevronRight, Layers,
  Users, ShieldCheck, MessageSquare, CheckCircle, Settings2,
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

const fmtSAR = (n: number) =>
  new Intl.NumberFormat('en-SA', { style: 'currency', currency: 'SAR', maximumFractionDigits: 0 }).format(n);

// ── Role tier helpers ─────────────────────────────────────────────────────────
function roleTier(role: string): 'admin' | 'supervisor' | 'worker' {
  if (['owner', 'admin', 'super_admin', 'admin_manager', 'admin-manager'].includes(role)) return 'admin';
  if (['manager', 'supervisor', 'property-manager', 'site-supervisor', 'front-desk'].includes(role)) return 'supervisor';
  return 'worker';
}

function getPortalTierLevel(role: string): number {
  const m: Record<string, number> = {
    super_admin: 0, owner: 1, company: 2,
    admin_manager: 3, 'admin-manager': 3, admin: 3, manager: 3,
    secretariat: 4, dept_manager: 5, 'property-manager': 5,
    admin_general: 6, administrator: 6,
    supervisor: 7, 'site-supervisor': 7, 'front-desk': 7,
    maintenance: 8, worker: 9, staff: 9, security: 10, partner: 10,
  };
  return m[role] ?? 9;
}

// ── Delegation chain definition ───────────────────────────────────────────────
// 9-tier hierarchy (Company is an internal multi-tenancy concept, not shown in admin settings)
const DELEGATION_CHAIN = [
  { role: 'owner',         tierLevel: 1,  activeClass: 'bg-amber-50   border-amber-500   text-amber-900',   chipClass: 'border-amber-200   text-amber-700'   },
  { role: 'manager',       tierLevel: 3,  activeClass: 'bg-blue-50    border-blue-500    text-blue-900',    chipClass: 'border-blue-200    text-blue-700'    },
  { role: 'secretariat',   tierLevel: 4,  activeClass: 'bg-cyan-50    border-cyan-500    text-cyan-900',    chipClass: 'border-cyan-200    text-cyan-700'    },
  { role: 'dept_manager',  tierLevel: 5,  activeClass: 'bg-teal-50    border-teal-500    text-teal-900',    chipClass: 'border-teal-200    text-teal-700'    },
  { role: 'admin_general', tierLevel: 6,  activeClass: 'bg-emerald-50 border-emerald-500 text-emerald-900', chipClass: 'border-emerald-200 text-emerald-700' },
  { role: 'supervisor',    tierLevel: 7,  activeClass: 'bg-orange-50  border-orange-500  text-orange-900',  chipClass: 'border-orange-200  text-orange-700'  },
  { role: 'maintenance',   tierLevel: 8,  activeClass: 'bg-red-50     border-red-500     text-red-900',     chipClass: 'border-red-200     text-red-700'     },
  { role: 'worker',        tierLevel: 9,  activeClass: 'bg-slate-100  border-slate-500   text-slate-900',   chipClass: 'border-slate-300   text-slate-700'   },
  { role: 'security',      tierLevel: 10, activeClass: 'bg-gray-100   border-gray-500    text-gray-900',    chipClass: 'border-gray-300    text-gray-700'    },
] as const;

const ALL_PERMS_LIST = [
  'property:add', 'property:edit', 'property:delete', 'property:publish',
  'marketing:campaigns', 'marketing:listings',
  'support:inquiries', 'support:messages',
] as const;

const PERM_GROUPS: Array<{ key: string; icon: React.ElementType; perms: string[] }> = [
  { key: 'property',  icon: Building,     perms: ['property:add', 'property:edit', 'property:delete', 'property:publish'] },
  { key: 'marketing', icon: TrendingUp,   perms: ['marketing:campaigns', 'marketing:listings'] },
  { key: 'support',   icon: MessageSquare,perms: ['support:inquiries', 'support:messages'] },
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

function memberInitials(name: string): string {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

// ── OpsControlPanel ───────────────────────────────────────────────────────────
interface OpsControlPanelProps { user: unknown; t: (k: string) => string; isRtl: boolean; }

const OpsControlPanel: React.FC<OpsControlPanelProps> = ({ user, t, isRtl }) => {
  const queryClient     = useQueryClient();
  const callerRole      = ((user as unknown) as Record<string, string>)?.role ?? '';
  const callerTierLevel = getPortalTierLevel(callerRole);

  // Role-level permissions
  const { data: rolePermsRes, isLoading: isLoadingRolePerms } = useGetPortalRolePermissions(
    { query: { enabled: true } } as any,
  );
  const updateRolePermsMut = useUpdatePortalRolePermissions();

  // Team members
  const { data: teamRes, isLoading: isLoadingTeam } = useGetPortalTeam(
    { query: { enabled: true } } as any,
  );
  const updateUserPermsMut = useUpdatePortalTeamPermissions();

  const [localRolePerms, setLocalRolePerms] = useState<Record<string, string[]>>({});
  const [selectedRole,   setSelectedRole]   = useState<string>('company');
  const [isSavingRole,   setIsSavingRole]   = useState(false);
  const [savedRoleName,  setSavedRoleName]  = useState<string | null>(null);

  const [localUserPerms,  setLocalUserPerms]  = useState<Record<number, string[]>>({});
  const [savingUsers,     setSavingUsers]     = useState<Set<number>>(new Set());
  const [savedUsers,      setSavedUsers]      = useState<Set<number>>(new Set());

  // Sync role perms from API
  useEffect(() => {
    const map = (rolePermsRes as any)?.data ?? {};
    setLocalRolePerms({ ...map, owner: [...ALL_PERMS_LIST] });
  }, [rolePermsRes]);

  // Sync user perms from API
  const teamMembers: PortalTeamMember[] = (teamRes as any)?.data ?? [];
  useEffect(() => {
    if (!teamMembers.length) return;
    const map: Record<number, string[]> = {};
    for (const m of teamMembers) map[m.id] = [...m.permissions];
    setLocalUserPerms(map);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamRes]);

  // Derived: which chain entries can this caller edit role-level permissions for?
  const canEditRoleLevel = (tierLevel: number, role: string) =>
    role !== 'owner' && callerTierLevel <= 3 && tierLevel > callerTierLevel;

  const selectedChain     = DELEGATION_CHAIN.find((c) => c.role === selectedRole)!;
  const isOwnerSelected   = selectedRole === 'owner';
  const canEditSelected   = canEditRoleLevel(selectedChain?.tierLevel ?? 99, selectedRole);
  const selectedRolePerms = localRolePerms[selectedRole] ?? (isOwnerSelected ? [...ALL_PERMS_LIST] : []);

  // Members whose role matches the selected chain role (by tier level)
  const membersForRole = teamMembers.filter(
    (m) => getPortalTierLevel(m.role) === (selectedChain?.tierLevel ?? -1),
  );

  // Toggle a perm in the role-level config (local only until Save is clicked)
  const toggleRolePerm = (perm: string) => {
    if (!canEditSelected) return;
    const has     = selectedRolePerms.includes(perm);
    const updated = has ? selectedRolePerms.filter((p) => p !== perm) : [...selectedRolePerms, perm];
    setLocalRolePerms((prev) => ({ ...prev, [selectedRole]: updated }));
  };

  const saveRolePerms = () => {
    if (!canEditSelected || isSavingRole) return;
    setIsSavingRole(true);
    updateRolePermsMut.mutate(
      { data: { role: selectedRole, permissions: localRolePerms[selectedRole] ?? [] } } as any,
      {
        onSuccess: (res) => {
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
      },
    );
  };

  // Toggle a perm on an individual user (immediate save)
  const toggleUserPerm = (userId: number, perm: string) => {
    const current = localUserPerms[userId] ?? [];
    const has     = current.includes(perm);
    const updated = has ? current.filter((p) => p !== perm) : [...current, perm];
    setLocalUserPerms((prev) => ({ ...prev, [userId]: updated }));
    setSavingUsers((prev) => new Set([...prev, userId]));
    updateUserPermsMut.mutate(
      { userId, data: { permissions: updated } },
      {
        onSuccess: (res) => {
          const serverPerms: string[] = (res as any)?.data?.permissions ?? updated;
          setLocalUserPerms((prev) => ({ ...prev, [userId]: serverPerms }));
          setSavingUsers((prev) => { const n = new Set(prev); n.delete(userId); return n; });
          setSavedUsers((prev) => {
            const n = new Set([...prev, userId]);
            setTimeout(() => setSavedUsers((p) => { const m = new Set(p); m.delete(userId); return m; }), 2000);
            return n;
          });
          queryClient.invalidateQueries({ queryKey: getGetPortalTeamQueryKey() as any });
        },
        onError: () => {
          setLocalUserPerms((prev) => ({ ...prev, [userId]: current }));
          setSavingUsers((prev) => { const n = new Set(prev); n.delete(userId); return n; });
        },
      },
    );
  };

  if (isLoadingRolePerms || isLoadingTeam) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-56 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Owner Administrator — Supreme Authority banner */}
      {callerTierLevel <= 1 && (
        <Card className="p-4 border-amber-400 bg-amber-50 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-amber-900">{t('ops.ownerSupremeTitle')}</p>
            <p className="text-xs text-amber-800 mt-1 leading-relaxed">{t('ops.ownerSupremeDesc')}</p>
            <p className="text-[11px] text-amber-600 mt-1.5 font-medium">{t('ops.directControl')}</p>
          </div>
        </Card>
      )}

      {/* Manager — Delegated Authority banner */}
      {callerTierLevel === 3 && (
        <Card className="p-4 border-blue-300 bg-blue-50 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-sm text-blue-900">{t('ops.managerDelegationTitle')}</p>
            <p className="text-xs text-blue-800 mt-1 leading-relaxed">{t('ops.managerDelegationDesc')}</p>
          </div>
        </Card>
      )}

      {/* ── Delegation Chain ─────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-extrabold tracking-[0.18em] text-muted-foreground uppercase mb-3">
          {t('ops.chainTitle')}
        </p>
        <div className={`flex items-center gap-0 overflow-x-auto pb-2 ${isRtl ? 'flex-row-reverse' : ''}`}>
          {DELEGATION_CHAIN.map((entry, idx) => {
            const perms      = entry.role === 'owner' ? ALL_PERMS_LIST : (localRolePerms[entry.role] ?? []);
            const count      = perms.length;
            const isSelected = selectedRole === entry.role;
            const isAbove    = entry.tierLevel <= callerTierLevel && entry.role !== 'owner' && callerTierLevel > 0;

            return (
              <React.Fragment key={entry.role}>
                <button
                  onClick={() => setSelectedRole(entry.role)}
                  className={[
                    'flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-lg border-2 transition-all min-w-[80px]',
                    isSelected
                      ? entry.activeClass
                      : `bg-background border-border text-muted-foreground hover:border-primary/40 hover:text-foreground`,
                    isAbove ? 'opacity-50 cursor-default' : '',
                  ].join(' ')}
                >
                  <span className="text-[11px] font-bold whitespace-nowrap leading-tight">
                    {t(`ops.role.${entry.role}`)}
                  </span>
                  <span className="text-[10px] mt-0.5 opacity-70 font-medium">
                    {entry.role === 'owner'
                      ? '∞'
                      : `${count}/${ALL_PERMS_LIST.length}`}
                  </span>
                </button>
                {idx < DELEGATION_CHAIN.length - 1 && (
                  <ChevronRight className={`h-3 w-3 text-muted-foreground/30 flex-shrink-0 ${isRtl ? 'rotate-180' : ''}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Role-Level Permissions section header ────────────────────── */}
      {callerTierLevel <= 3 && (
        <div className="flex items-center gap-2 pt-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[10px] font-extrabold tracking-[0.15em] text-muted-foreground uppercase px-2">
            {t('ops.sectionRolePerms')}
          </span>
          <div className="h-px flex-1 bg-border" />
        </div>
      )}

      {/* ── Selected Role Permissions Panel ──────────────────────────── */}
      <Card className="p-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold px-2.5 py-0.5 rounded-full border-2 ${selectedChain?.activeClass ?? ''}`}>
              {t(`ops.role.${selectedRole}`)}
            </span>
            {isOwnerSelected && (
              <span className="text-xs text-muted-foreground italic">{t('ops.ownerAllPerms')}</span>
            )}
            {!isOwnerSelected && !canEditSelected && (
              <span className="text-xs text-muted-foreground italic flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> {t('ops.readonlyForTier')}
              </span>
            )}
          </div>
          {canEditSelected && (
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="outline" className="h-7 text-xs px-2.5"
                onClick={() => setLocalRolePerms((prev) => ({ ...prev, [selectedRole]: [...ALL_PERMS_LIST] }))}
                disabled={isSavingRole}
              >
                {t('ops.grantAll')}
              </Button>
              <Button
                size="sm" variant="outline" className="h-7 text-xs px-2.5"
                onClick={() => setLocalRolePerms((prev) => ({ ...prev, [selectedRole]: [] }))}
                disabled={isSavingRole}
              >
                {t('ops.clearAll')}
              </Button>
              <Button
                size="sm" className="h-7 text-xs px-3"
                onClick={saveRolePerms}
                disabled={isSavingRole}
              >
                {isSavingRole
                  ? t('ops.rolePermsSaving')
                  : savedRoleName === selectedRole
                    ? <><CheckCircle className="h-3.5 w-3.5 me-1" />{t('ops.rolePermsSaved')}</>
                    : t('ops.saveRolePerms')}
              </Button>
            </div>
          )}
        </div>

        {/* Permission checkboxes */}
        <div className="space-y-4">
          {PERM_GROUPS.map((group) => (
            <div key={group.key}>
              <div className="flex items-center gap-1.5 mb-2.5 pb-1.5 border-b border-border/50">
                <group.icon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {t(`ops.group.${group.key}`)}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {group.perms.map((perm) => {
                  const isOn = isOwnerSelected || selectedRolePerms.includes(perm);
                  return (
                    <label
                      key={perm}
                      className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors select-none ${
                        isOn
                          ? 'border-primary/40 bg-primary/5'
                          : 'border-border bg-background'
                      } ${(!canEditSelected || isOwnerSelected) ? 'cursor-default opacity-75' : 'hover:border-primary/60'}`}
                    >
                      <input
                        type="checkbox"
                        className="accent-primary h-3.5 w-3.5 shrink-0"
                        checked={isOn}
                        onChange={() => toggleRolePerm(perm)}
                        disabled={!canEditSelected || isOwnerSelected || isSavingRole}
                      />
                      <span className="text-xs leading-tight text-foreground/80">
                        {t(PERM_LABEL_KEY[perm] ?? perm)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* ── My Team section ──────────────────────────────────────────── */}
      {!isOwnerSelected && (
        <div>
          <div className="flex items-center gap-2 mb-1 pt-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] font-extrabold tracking-[0.15em] text-muted-foreground uppercase px-2">
              {t('ops.sectionMyTeam')}
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <div className="flex items-center gap-2 mt-3 mb-3">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h4 className="text-sm font-semibold text-foreground">{t('ops.teamForRole')}</h4>
            <Badge variant="secondary" className="text-xs h-5 px-2">{membersForRole.length}</Badge>
          </div>
          {membersForRole.length === 0 ? (
            <p className="text-sm text-muted-foreground italic py-2">{t('ops.noTeamForRole')}</p>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {membersForRole.map((member) => {
                const perms     = localUserPerms[member.id] ?? member.permissions;
                const isSaving  = savingUsers.has(member.id);
                const wasSaved  = savedUsers.has(member.id);
                return (
                  <Card
                    key={member.id}
                    className={`p-4 border-border ${!member.isActive ? 'opacity-60' : ''}`}
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-xs shrink-0 select-none">
                        {memberInitials(member.displayName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-sm leading-tight truncate">{member.displayName}</p>
                          {wasSaved && (
                            <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="h-3 w-3" />{t('ops.saved')}
                            </span>
                          )}
                          {isSaving && <span className="text-xs text-muted-foreground italic">{t('ops.saving')}</span>}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-muted-foreground">{member.role}</span>
                          {!member.isActive && (
                            <span className="text-xs text-destructive font-medium">{t('ops.inactiveLabel')}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {ALL_PERMS_LIST.map((perm) => {
                        const isOn = perms.includes(perm);
                        return (
                          <div key={perm} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-foreground/75 leading-tight truncate">
                              {t(PERM_LABEL_KEY[perm] ?? perm)}
                            </span>
                            <Switch
                              checked={isOn}
                              onCheckedChange={() => toggleUserPerm(member.id, perm)}
                              disabled={isSaving}
                              className="shrink-0 scale-[0.8]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PROPERTY_TYPES = ['hotel', 'compound', 'apartment', 'villa', 'office', 'commercial', 'warehouse'];
const PROPERTY_STATUSES = ['active', 'inactive'];
const UNIT_TYPES = ['studio', '1br', '2br', '3br', '4br', 'penthouse', 'duplex', 'apartment', 'villa', 'office', 'commercial'];
const UNIT_STATUSES = ['available', 'occupied', 'maintenance'];

// ── Property Form ──────────────────────────────────────────────────────────────
interface PropFormState {
  name: string;
  type: string;
  address: string;
  city: string;
  country: string;
  description: string;
  status: string;
}

const emptyPropForm = (): PropFormState => ({
  name: '', type: 'apartment', address: '', city: '', country: 'SA',
  description: '', status: 'active',
});

// ── Unit Form ──────────────────────────────────────────────────────────────────
interface UnitFormState {
  unitNumber: string;
  floor: string;
  type: string;
  area: string;
  bedroomCount: string;
  bathroomCount: string;
  status: string;
  monthlyRent: string;
  notes: string;
}

const emptyUnitForm = (): UnitFormState => ({
  unitNumber: '', floor: '', type: 'apartment', area: '',
  bedroomCount: '0', bathroomCount: '1', status: 'available',
  monthlyRent: '', notes: '',
});

// ── Units sub-panel ────────────────────────────────────────────────────────────
interface UnitsPanelProps {
  property: PortalProperty;
  onBack: () => void;
  t: (k: string) => string;
  isRtl: boolean;
}

const UnitsPanel: React.FC<UnitsPanelProps> = ({ property, onBack, t, isRtl }) => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm]       = useState(false);
  const [editUnit, setEditUnit]       = useState<PortalUnit | null>(null);
  const [deleteId, setDeleteId]       = useState<number | null>(null);
  const [form, setForm]               = useState<UnitFormState>(emptyUnitForm());

  const { data: unitsRes, isLoading } = useGetPortalPropertyUnits(
    property.id,
    { page: 1, limit: 100 },
    { query: { enabled: true } } as any,
  );
  const units = (unitsRes as any)?.data ?? [];

  const createMut = useCreatePortalUnit();
  const updateMut = useUpdatePortalUnit();
  const deleteMut = useDeletePortalUnit();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertyUnitsQueryKey(property.id) as any });
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });
  };

  const openAdd = () => { setForm(emptyUnitForm()); setEditUnit(null); setShowForm(true); };
  const openEdit = (u: PortalUnit) => {
    setForm({
      unitNumber:   u.unitNumber,
      floor:        u.floor != null ? String(u.floor) : '',
      type:         u.type,
      area:         u.area != null ? String(u.area) : '',
      bedroomCount: String(u.bedroomCount ?? 0),
      bathroomCount:String(u.bathroomCount ?? 1),
      status:       u.status,
      monthlyRent:  u.monthlyRent != null ? String(u.monthlyRent) : '',
      notes:        u.notes ?? '',
    });
    setEditUnit(u);
    setShowForm(true);
  };

  const buildPayload = (): PortalUnitInput => ({
    portalPropertyId: property.id,
    unitNumber:   form.unitNumber.trim(),
    floor:        form.floor ? parseInt(form.floor) : undefined,
    type:         form.type,
    area:         form.area ? parseFloat(form.area) : undefined,
    bedroomCount: parseInt(form.bedroomCount) || 0,
    bathroomCount:parseInt(form.bathroomCount) || 1,
    status:       form.status,
    monthlyRent:  form.monthlyRent ? parseFloat(form.monthlyRent) : undefined,
    notes:        form.notes.trim() || undefined,
    tenantId:     1,
  } as any);

  const handleSave = () => {
    if (!form.unitNumber.trim()) return;
    const payload = buildPayload();
    if (editUnit) {
      updateMut.mutate({ id: editUnit.id, data: payload } as any, {
        onSuccess: () => { invalidate(); setShowForm(false); },
      });
    } else {
      createMut.mutate({ data: payload }, {
        onSuccess: () => { invalidate(); setShowForm(false); },
      });
    }
  };

  const handleDelete = () => {
    if (deleteId == null) return;
    deleteMut.mutate({ id: deleteId } as any, {
      onSuccess: () => { invalidate(); setDeleteId(null); },
    });
  };

  const isBusy = createMut.isPending || updateMut.isPending;

  const statusColor = (s: string) =>
    s === 'available' ? 'default' : s === 'occupied' ? 'secondary' : 'outline';

  const unitTypeLabel = (type: string) => {
    const key = `portal.type.${type}`;
    const tr = t(key);
    return tr !== key ? tr : type;
  };

  return (
    <div className="space-y-6">
      {/* Sub-header */}
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
        <Button onClick={openAdd} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('portal.addUnit')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
        </div>
      ) : units.length === 0 ? (
        <Card className="p-12 text-center text-muted-foreground border-dashed border-2">
          <Layers className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>{t('portal.noUnits')}</p>
          <Button onClick={openAdd} variant="outline" className="mt-4">
            <Plus className="h-4 w-4 mr-2" />
            {t('portal.addUnit')}
          </Button>
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
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.area != null ? `${u.area} م²` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center">{u.bedroomCount ?? 0}</td>
                    <td className="px-4 py-3 text-center">{u.bathroomCount ?? 1}</td>
                    <td className="px-4 py-3">
                      <Badge variant={statusColor(u.status)}>
                        {t(`portal.status.${u.status}`) !== `portal.status.${u.status}` ? t(`portal.status.${u.status}`) : u.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.monthlyRent != null ? fmtSAR(u.monthlyRent) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className={`flex items-center gap-2 justify-end`}>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0" onClick={() => openEdit(u)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive" onClick={() => setDeleteId(u.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Add/Edit Unit Dialog */}
      <Dialog open={showForm} onOpenChange={(v) => { if (!v) setShowForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editUnit ? t('portal.editUnit') : t('portal.addUnit')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitNumber')} *</Label>
              <Input value={form.unitNumber} onChange={(e) => setForm({ ...form, unitNumber: e.target.value })} placeholder="A-101" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitType')}</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {t(`portal.type.${tp}`) !== `portal.type.${tp}` ? t(`portal.type.${tp}`) : tp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitStatus')}</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {UNIT_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {t(`portal.status.${s}`) !== `portal.status.${s}` ? t(`portal.status.${s}`) : s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitFloor')}</Label>
              <Input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })} placeholder="1" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitArea')}</Label>
              <Input type="number" value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })} placeholder="75" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitBedrooms')}</Label>
              <Input type="number" min="0" value={form.bedroomCount} onChange={(e) => setForm({ ...form, bedroomCount: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.unitBathrooms')}</Label>
              <Input type="number" min="1" value={form.bathroomCount} onChange={(e) => setForm({ ...form, bathroomCount: e.target.value })} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitRent')}</Label>
              <Input type="number" value={form.monthlyRent} onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })} placeholder="3500" />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.unitNotes')}</Label>
              <Textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>{t('portal.cancel')}</Button>
            <Button onClick={handleSave} disabled={!form.unitNumber.trim() || isBusy}>
              {isBusy ? t('portal.saving') : t('portal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Unit Confirm */}
      <Dialog open={deleteId !== null} onOpenChange={(v) => { if (!v) setDeleteId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.deleteUnit')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDeleteUnit')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMut.isPending}>
              {deleteMut.isPending ? t('portal.deleting') : t('portal.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Main Dashboard ─────────────────────────────────────────────────────────────
// ── MasterCommandCenter ───────────────────────────────────────────────────────
interface MasterCommandCenterProps {
  properties: PortalProperty[];
  bookings:   unknown[];
  financials: unknown;
  t:          (k: string) => string;
  isRtl:      boolean;
  onNavigate: (tab: string) => void;
}

const MasterCommandCenter: React.FC<MasterCommandCenterProps> = ({
  properties, bookings, financials, t, onNavigate,
}) => {
  const { data: teamRes } = useGetPortalTeam({ query: { enabled: true } } as any);
  const teamMembers: PortalTeamMember[] = (teamRes as any)?.data ?? [];

  const monthlyData = (financials as any)?.monthly ?? [];
  const lastMonth   = monthlyData[monthlyData.length - 1];
  const monthRevenue = lastMonth?.revenue ?? 0;

  const activeBookings = (bookings as any[]).filter(
    (b) => ['confirmed', 'checked_in'].includes((b as any).status ?? ''),
  ).length;

  const kpis = [
    { label: t('mcc.kpi.properties'), value: String(properties.length),  icon: Building,   bg: 'bg-blue-100',   fg: 'text-blue-600'   },
    { label: t('mcc.kpi.bookings'),   value: String(activeBookings),      icon: Calendar,   bg: 'bg-green-100',  fg: 'text-green-600'  },
    { label: t('mcc.kpi.revenue'),    value: fmtSAR(monthRevenue),        icon: DollarSign, bg: 'bg-amber-100',  fg: 'text-amber-600'  },
    { label: t('mcc.kpi.team'),       value: String(teamMembers.length),  icon: Users,      bg: 'bg-purple-100', fg: 'text-purple-600' },
  ];

  const quickActions = [
    { label: t('mcc.goManage'),     tab: 'manage',      icon: Building,   color: 'bg-blue-500'    },
    { label: t('mcc.goFinancials'), tab: 'financials',  icon: BarChart2,  color: 'bg-emerald-500' },
    { label: t('mcc.goSettings'),   tab: 'ops-control', icon: Settings2,  color: 'bg-amber-500'   },
    { label: t('mcc.goOverview'),   tab: 'overview',    icon: Layers,     color: 'bg-violet-500'  },
  ];

  return (
    <div className="space-y-6">
      {/* Authority banner */}
      <div className="rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white shadow-md">
        <div className="flex items-center gap-3 mb-1">
          <ShieldCheck className="h-5 w-5 opacity-90" />
          <span className="text-xs font-semibold tracking-wider uppercase opacity-80">{t('mcc.badge')}</span>
        </div>
        <h2 className="text-2xl font-serif font-bold">{t('mcc.title')}</h2>
        <p className="text-amber-100 text-sm mt-1">{t('mcc.subtitle')}</p>
        <p className="text-amber-200 text-xs mt-3 flex items-center gap-1.5">
          <CheckCircle className="h-3.5 w-3.5 shrink-0" />
          {t('mcc.authorityNote')}
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="p-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${kpi.bg} flex items-center justify-center shrink-0`}>
                <kpi.icon className={`h-5 w-5 ${kpi.fg}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-primary leading-none">{kpi.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{kpi.label}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick actions + Content control */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-5">
          <h3 className="text-sm font-semibold text-primary mb-4">{t('mcc.quickActions')}</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((a) => (
              <button
                key={a.tab}
                onClick={() => onNavigate(a.tab)}
                className="flex items-center gap-2.5 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-start"
              >
                <div className={`w-8 h-8 rounded-lg ${a.color} flex items-center justify-center shrink-0`}>
                  <a.icon className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-medium text-primary">{a.label}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-sm font-semibold text-primary mb-1">{t('mcc.contentTitle')}</h3>
          <p className="text-xs text-muted-foreground mb-4 leading-relaxed">{t('mcc.contentDesc')}</p>
          <div className="space-y-2.5">
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => onNavigate('manage')}>
              <Building className="h-4 w-4 text-blue-500" />
              {t('mcc.goManage')}
              <ArrowRight className="h-3.5 w-3.5 ms-auto text-muted-foreground" />
            </Button>
            <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => onNavigate('ops-control')}>
              <Settings2 className="h-4 w-4 text-amber-500" />
              {t('mcc.delegateBtn')}
              <ArrowRight className="h-3.5 w-3.5 ms-auto text-muted-foreground" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Team roster */}
      <Card className="p-5">
        <h3 className="text-sm font-semibold text-primary mb-4">{t('mcc.teamTitle')}</h3>
        {teamMembers.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">{t('mcc.teamEmpty')}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {teamMembers.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1.5 p-3 rounded-lg border border-border bg-muted/30">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                  {memberInitials((m as any).displayName ?? m.username ?? '?')}
                </div>
                <p className="text-xs font-medium text-primary text-center leading-tight truncate w-full">
                  {(m as any).displayName ?? m.username}
                </p>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 h-4 max-w-full truncate">
                  {m.role}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* System status */}
      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-primary">{t('mcc.systemTitle')}</h3>
          <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            {t('mcc.systemOk')}
          </div>
        </div>
      </Card>
    </div>
  );
};

// ── PortalDashboard ───────────────────────────────────────────────────────────
export const PortalDashboard: React.FC = () => {
  const { user, isAuthenticated, isLoading, logout } = usePortalAuth();
  const [, setLocation] = useLocation();
  const { t, isRtl, language } = useLanguage();
  const queryClient = useQueryClient();

  const [propertyIdFilter, setPropertyIdFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter]         = useState<string>('all');
  const [months, setMonths]                     = useState<string>('6');

  // Active tab (controlled — Owner defaults to command-center, others to manage)
  const [currentTab, setCurrentTab] = useState('manage');

  // Property management state
  const [selectedProp, setSelectedProp]   = useState<PortalProperty | null>(null);
  const [showPropForm, setShowPropForm]   = useState(false);
  const [editProp, setEditProp]           = useState<PortalProperty | null>(null);
  const [deletePropId, setDeletePropId]   = useState<number | null>(null);
  const [propForm, setPropForm]           = useState<PropFormState>(emptyPropForm());

  // Contact/Support form state (Investor Portfolio tab)
  const [contactSubject, setContactSubject] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSending, setContactSending] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError,   setContactError]   = useState('');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) setLocation('/portal');
  }, [isLoading, isAuthenticated, setLocation]);

  // Smart default tab: Owner → command-center, Investor/Client → portfolio, others → manage
  useEffect(() => {
    if (user) {
      const role = ((user as unknown) as Record<string, string>)?.role ?? '';
      const tier = getPortalTierLevel(role);
      if (tier <= 1) setCurrentTab('command-center');
      else if (tier > 7) setCurrentTab('portfolio');
    }
  }, [user]);

  const { data: propertiesRes, isLoading: isLoadingProps } = useGetPortalProperties(
    { page: 1, limit: 50 },
    { query: { enabled: isAuthenticated } } as any,
  );

  const { data: bookingsRes, isLoading: isLoadingBookings } = useGetPortalBookings(
    {
      page: 1,
      limit: 20,
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
      ...(statusFilter !== 'all'     ? { status: statusFilter }                  : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  const { data: financialsRes, isLoading: isLoadingFin } = useGetPortalFinancials(
    {
      months:     parseInt(months),
      ...(propertyIdFilter !== 'all' ? { propertyId: parseInt(propertyIdFilter) } : {}),
    },
    { query: { enabled: isAuthenticated } } as any,
  );

  const createPropMut = useCreatePortalProperty();
  const updatePropMut = useUpdatePortalProperty();
  const deletePropMut = useDeletePortalProperty();

  const invalidateProps = () =>
    queryClient.invalidateQueries({ queryKey: getGetPortalPropertiesQueryKey() as any });

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <Skeleton className="h-32 w-32 rounded-full" />
      </div>
    );
  }

  const properties  = (propertiesRes as any)?.data  ?? [];
  const bookings    = (bookingsRes as any)?.data     ?? [];
  const financials  = (financialsRes as any)?.data;

  const totalProperties = properties.length;
  const totalUnits      = properties.reduce((s: number, p: PortalProperty) => s + ((p as any).unitCount ?? 0), 0);
  const userTier        = roleTier(((user as unknown) as Record<string, string>)?.role ?? '');
  // Numeric tier for fine-grained tab visibility (Admin Settings hidden from tiers 8-10)
  const dashTierLevel   = getPortalTierLevel(((user as unknown) as Record<string, string>)?.role ?? '');

  const handleLogout = async () => { await logout(); setLocation('/portal'); };

  const propTypeLabel = (type: string | undefined): string => {
    if (!type) return '';
    const key = `portal.type.${type.toLowerCase()}`;
    const tr = t(key);
    return tr !== key ? tr : type;
  };

  const statusLabel = (status: string): string => {
    const statusMap: Record<string, string> = {
      active:      t('portal.status.active'),
      inactive:    t('portal.status.inactive'),
      confirmed:   t('portal.status.confirmed'),
      checked_in:  t('portal.status.checkedIn'),
      checked_out: t('portal.status.checkedOut'),
      cancelled:   t('portal.status.cancelled'),
      pending:     t('portal.status.pending'),
    };
    return statusMap[status] ?? status.replace(/_/g, ' ');
  };

  const lastMonths = (n: string) =>
    isRtl ? `آخر ${n} أشهر` : `Last ${n} months`;

  const fmtMonth = (v: string) => {
    const [y, m] = v.split('-');
    return new Date(parseInt(y), parseInt(m) - 1).toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'short' });
  };

  const fmtMonthFull = (v: string) =>
    new Date(v + '-01T00:00:00').toLocaleString(language === 'ar' ? 'ar-SA' : 'en-US', { month: 'long', year: 'numeric' });

  // ── Property form helpers ──────────────────────────────────────────────────
  const openAddProp = () => {
    setPropForm(emptyPropForm());
    setEditProp(null);
    setShowPropForm(true);
  };

  const openEditProp = (p: PortalProperty) => {
    setPropForm({
      name:        p.name,
      type:        p.type,
      address:     p.address,
      city:        p.city,
      country:     p.country,
      description: (p as any).description ?? '',
      status:      p.status,
    });
    setEditProp(p);
    setShowPropForm(true);
  };

  const handleSaveProp = () => {
    if (!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim()) return;
    const payload: PortalPropertyInput = {
      name:        propForm.name.trim(),
      type:        propForm.type,
      address:     propForm.address.trim(),
      city:        propForm.city.trim(),
      country:     propForm.country.trim() || 'SA',
      description: propForm.description.trim() || undefined,
      status:      propForm.status,
    } as any;

    if (editProp) {
      updatePropMut.mutate({ id: editProp.id, data: payload } as any, {
        onSuccess: () => { invalidateProps(); setShowPropForm(false); },
      });
    } else {
      createPropMut.mutate({ data: payload }, {
        onSuccess: () => { invalidateProps(); setShowPropForm(false); },
      });
    }
  };

  const handleDeleteProp = () => {
    if (deletePropId == null) return;
    deletePropMut.mutate({ id: deletePropId } as any, {
      onSuccess: () => { invalidateProps(); setDeletePropId(null); },
    });
  };

  const isPropBusy = createPropMut.isPending || updatePropMut.isPending;

  async function sendContactMessage() {
    if (!contactSubject.trim() || !contactMessage.trim()) return;
    setContactSending(true);
    setContactError('');
    try {
      const res = await fetch('/api/portal/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ subject: contactSubject.trim(), message: contactMessage.trim() }),
      });
      if (!res.ok) throw new Error('Failed');
      setContactSuccess(true);
      setContactSubject('');
      setContactMessage('');
    } catch {
      setContactError(t('portal.contact.error'));
    } finally {
      setContactSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-muted pb-12">
      <Helmet>
        <title>
          {(userTier === 'admin' || userTier === 'supervisor')
            ? (isRtl ? 'لوحة التحكم الإدارية' : 'Admin Dashboard')
            : (isRtl ? 'بوابة المستثمر' : 'Investor Portal')} | ركز للحلول الذكية
        </title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Header */}
      <header className="bg-primary text-primary-foreground py-6 shadow-md">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {t((userTier === 'admin' || userTier === 'supervisor') ? 'portal.managementPortal' : 'portal.myPortfolio')}
            </h1>
            <p className="text-primary-foreground/70">
              {t('portal.welcome')} {((user as unknown as Record<string,unknown>)?.displayName as string) || ((user as unknown as Record<string,unknown>)?.username as string)}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm hover:underline flex items-center gap-1">
              {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
              {t('portal.backToWebsite')}
            </Link>
            <Button variant="secondary" onClick={handleLogout} className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t('portal.logout')}
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 mt-8 space-y-8">

        {/* Top KPI row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-primary/10 p-4 rounded-full">
              <Building className="h-8 w-8 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalProperties')}</p>
              <p className="text-3xl font-bold text-primary">{totalProperties}</p>
            </div>
          </Card>
          <Card className="p-6 flex items-center gap-4 border-border">
            <div className="bg-secondary/20 p-4 rounded-full">
              <Layers className="h-8 w-8 text-secondary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{t('portal.totalUnits')}</p>
              <p className="text-3xl font-bold text-primary">{totalUnits}</p>
            </div>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
          <TabsList className="h-10 mb-6 flex-wrap">
            {/* Command Center: Owner only (tier ≤ 1) */}
            {dashTierLevel <= 1 && (
              <TabsTrigger value="command-center" className="px-5 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t('mcc.tab')}
              </TabsTrigger>
            )}
            <TabsTrigger value="manage"      className="px-5">{t('portal.manage')}</TabsTrigger>
            <TabsTrigger value="overview"    className="px-5">{t('portal.overview')}</TabsTrigger>
            <TabsTrigger value="financials"  className="px-5">{t('portal.financials')}</TabsTrigger>
            {/* Admin Settings: shown only to tiers 1-7 (Owner through Supervisor).
                Maintenance (8), Workers (9), Security (10) and unauthenticated users are excluded. */}
            {dashTierLevel <= 7 && (
              <TabsTrigger value="ops-control" className="px-5 flex items-center gap-1.5">
                <Settings2 className="h-3.5 w-3.5" />
                {t('ops.tab')}
              </TabsTrigger>
            )}
            {/* Investor Portfolio: shown only to client/investor tier (tier > 7) */}
            {dashTierLevel > 7 && (
              <TabsTrigger value="portfolio" className="px-5 flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                {t('portal.investorPortfolio')}
              </TabsTrigger>
            )}
          </TabsList>

          {/* ── My Properties (CRUD) tab ── */}
          <TabsContent value="manage" className="mt-0">
            {selectedProp ? (
              <UnitsPanel
                property={selectedProp}
                onBack={() => setSelectedProp(null)}
                t={t}
                isRtl={isRtl}
              />
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <h2 className="text-xl font-bold text-primary">{t('portal.manage')}</h2>
                  <Button onClick={openAddProp} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    {t('portal.addProperty')}
                  </Button>
                </div>

                {isLoadingProps ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 w-full rounded-xl" />)}
                  </div>
                ) : properties.length === 0 ? (
                  <Card className="p-16 text-center text-muted-foreground border-dashed border-2">
                    <Home className="h-14 w-14 mx-auto mb-4 opacity-30" />
                    <p className="mb-4">{t('portal.noProperties')}</p>
                    <Button onClick={openAddProp} variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('portal.addProperty')}
                    </Button>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop: PortalProperty) => (
                      <Card key={prop.id} className="p-5 border-border flex flex-col h-full">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-bold text-base text-primary leading-tight">{prop.name}</h3>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                            {statusLabel(prop.status ?? '')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">
                          {propTypeLabel(prop.type)}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1 truncate">{prop.address}</p>
                        <p className="text-xs text-muted-foreground mb-3">{prop.city}{prop.country ? `, ${prop.country}` : ''}</p>

                        <div className="mt-auto pt-3 border-t border-border">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm text-muted-foreground">{t('portal.units')}</span>
                            <span className="font-bold text-primary">
                              {(prop as any).unitCount ?? 0} {t('portal.unitsCount')}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="col-span-1 flex items-center gap-1.5"
                              onClick={() => setSelectedProp(prop)}
                            >
                              <Layers className="h-3.5 w-3.5" />
                              {t('portal.units')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5"
                              onClick={() => openEditProp(prop)}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              {t('portal.editProperty')}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex items-center gap-1.5 text-destructive hover:text-destructive"
                              onClick={() => setDeletePropId(prop.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('portal.delete')}
                            </Button>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Overview tab ── */}
          <TabsContent value="overview" className="space-y-8 mt-0">
            {/* Shared property filter */}
            <div className="flex gap-2 flex-wrap">
              <Select value={propertyIdFilter} onValueChange={setPropertyIdFilter}>
                <SelectTrigger className="w-[180px] bg-card">
                  <SelectValue placeholder={t('portal.allProperties')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('portal.allProperties')}</SelectItem>
                  {properties.map((p: PortalProperty) => (
                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Properties overview grid */}
            <section>
              <h2 className="text-xl font-bold text-primary mb-4">{t('portal.managedProperties')}</h2>
              {isLoadingProps ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}
                </div>
              ) : properties.length === 0 ? (
                <Card className="p-8 text-center text-muted-foreground border-dashed">
                  <p>{t('portal.noProperties')}</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((prop: PortalProperty) => (
                    <Card key={prop.id} className="p-5 border-border flex flex-col">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="font-bold text-base text-primary">{prop.name}</h3>
                        <Badge variant={prop.status === 'active' ? 'default' : 'secondary'}>
                          {statusLabel(prop.status ?? '')}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-1">
                        {propTypeLabel(prop.type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{prop.address}, {prop.city}</p>
                      <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">{t('portal.units')}</span>
                        <span className="font-bold text-primary">{(prop as any).unitCount ?? 0}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>

            {/* Bookings table */}
            <section>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <h2 className="text-xl font-bold text-primary">{t('portal.recentBookings')}</h2>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px] bg-card">
                    <SelectValue placeholder={t('portal.allStatuses')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('portal.allStatuses')}</SelectItem>
                    <SelectItem value="confirmed">{t('portal.status.confirmed')}</SelectItem>
                    <SelectItem value="checked_in">{t('portal.status.checkedIn')}</SelectItem>
                    <SelectItem value="checked_out">{t('portal.status.checkedOut')}</SelectItem>
                    <SelectItem value="cancelled">{t('portal.status.cancelled')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card className="border-border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-muted text-muted-foreground">
                      <tr>
                        <th className="px-6 py-3 font-medium">{t('portal.col.guest')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.property')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.room')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkIn')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.checkOut')}</th>
                        <th className="px-6 py-3 font-medium">{t('portal.col.status')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {isLoadingBookings ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center">
                            <Skeleton className="h-8 w-1/2 mx-auto" />
                          </td>
                        </tr>
                      ) : bookings.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                            {t('portal.noBookings')}
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b: any) => (
                          <tr key={b.id} className="hover:bg-muted/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-primary">{b.guestName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.propertyName}</td>
                            <td className="px-6 py-4 text-muted-foreground">{b.roomNumber}</td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkIn + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4 text-muted-foreground">
                              {new Date(b.checkOut + 'T00:00:00').toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-GB')}
                            </td>
                            <td className="px-6 py-4">
                              <Badge
                                variant={
                                  b.status === 'checked_in'  ? 'default'   :
                                  b.status === 'confirmed'   ? 'secondary' : 'outline'
                                }
                              >
                                {statusLabel(b.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </section>
          </TabsContent>

          {/* ── Financials tab ── */}
          <TabsContent value="financials" className="space-y-8 mt-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{t('portal.period')}:</span>
              {['3', '6', '12'].map((m) => (
                <button
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    months === m
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-card border border-border hover:border-primary text-muted-foreground'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>

            {isLoadingFin ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-green-100 p-2.5 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.revenue')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalRevenue ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-red-100 p-2.5 rounded-full">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.expenses')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalExpenses ?? 0)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{lastMonths(months)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-secondary/20 p-2.5 rounded-full">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.netProfit')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.netProfit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmtSAR(financials?.netProfit ?? 0)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.revenueMinusExpenses')}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <BarChart2 className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.margin')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.profitMargin ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {financials?.profitMargin ?? 0}%
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('portal.profitMargin')}</p>
                </Card>
              </div>
            )}

            <Card className="p-6 border-border">
              <h3 className="text-lg font-bold text-primary mb-6">{t('portal.monthlyCashFlow')}</h3>
              {isLoadingFin ? (
                <Skeleton className="h-64 w-full rounded-lg" />
              ) : (financials?.monthly ?? []).length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                  {t('portal.noFinancialData')}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={financials?.monthly ?? []} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickFormatter={fmtMonth} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                    <Tooltip formatter={(value: number, name: string) => [fmtSAR(value), name]} />
                    <Legend />
                    <Bar dataKey="revenue"  name={t('portal.revenue')}  fill="hsl(var(--secondary))"       radius={[3, 3, 0, 0]} />
                    <Bar dataKey="expenses" name={t('portal.expenses')} fill="hsl(var(--destructive)/0.6)" radius={[3, 3, 0, 0]} />
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
                          <td className={`px-6 py-3 text-right font-semibold ${row.netIncome >= 0 ? 'text-primary' : 'text-destructive'}`}>
                            {fmtSAR(row.netIncome)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ── Master Command Center tab (Owner only — tier ≤ 1) ── */}
          {dashTierLevel <= 1 && (
            <TabsContent value="command-center" className="mt-0">
              <MasterCommandCenter
                properties={properties}
                bookings={bookings}
                financials={financials}
                t={t}
                isRtl={isRtl}
                onNavigate={setCurrentTab}
              />
            </TabsContent>
          )}

          {/* ── Admin Settings tab (Owner through Supervisor only — tiers 1-7) ── */}
          {dashTierLevel <= 7 && (
            <TabsContent value="ops-control" className="mt-0">
              <div className="space-y-6">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-xl font-bold text-primary font-serif">{t('ops.title')}</h2>
                    <p className="text-sm text-muted-foreground mt-1">{t('ops.subtitle')}</p>
                  </div>
                  {/* Security note — visible confirmation the section is auth-gated */}
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border shrink-0">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Restricted — authorized users only</span>
                  </div>
                </div>
                <OpsControlPanel user={user} t={t} isRtl={isRtl} />
              </div>
            </TabsContent>
          )}

          {/* ── Investor Portfolio tab (client/partner tier > 7 only) ─────────── */}
          {dashTierLevel > 7 && (
            <TabsContent value="portfolio" className="mt-0 space-y-8">
              {/* Section header */}
              <div>
                <h2 className="text-xl font-bold text-primary font-serif">{t('portal.portfolio.title')}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{t('portal.portfolio.subtitle')}</p>
              </div>

              {/* Financial KPI row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-green-100 p-2.5 rounded-full">
                      <DollarSign className="h-5 w-5 text-green-600" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.portfolio.monthlyIncome')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{fmtSAR(financials?.totalRevenue ?? 0)}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <Building className="h-5 w-5 text-primary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.portfolio.totalInvestment')}
                    </span>
                  </div>
                  <p className="text-2xl font-bold text-primary">{totalProperties}</p>
                </Card>
                <Card className="p-5 border-border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="bg-secondary/20 p-2.5 rounded-full">
                      <TrendingUp className="h-5 w-5 text-secondary" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {t('portal.portfolio.netReturn')}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${(financials?.netProfit ?? 0) >= 0 ? 'text-primary' : 'text-destructive'}`}>
                    {fmtSAR(financials?.netProfit ?? 0)}
                  </p>
                </Card>
              </div>

              {/* Properties in portfolio */}
              {properties.length > 0 && (
                <section>
                  <h3 className="text-base font-semibold text-primary mb-3">{t('portal.managedProperties')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {properties.map((prop: PortalProperty) => (
                      <Card key={prop.id} className="p-4 border-border">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-sm text-primary leading-tight">{prop.name}</h4>
                          <Badge variant={prop.status === 'active' ? 'default' : 'secondary'} className="text-xs shrink-0 ms-2">
                            {statusLabel(prop.status ?? '')}
                          </Badge>
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
              <section>
                <Card className="p-6 border-border">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="bg-primary/10 p-2.5 rounded-full">
                      <MessageSquare className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-primary">{t('portal.contact.title')}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{t('portal.contact.subtitle')}</p>
                    </div>
                  </div>
                  {contactSuccess ? (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                      <CheckCircle className="h-5 w-5 shrink-0" />
                      <p className="text-sm">{t('portal.contact.success')}</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label className="text-sm">{t('portal.contact.subject')}</Label>
                        <Input
                          className="mt-1.5"
                          placeholder={t('portal.contact.subjectPlaceholder')}
                          value={contactSubject}
                          onChange={e => setContactSubject(e.target.value)}
                          disabled={contactSending}
                          dir={isRtl ? 'rtl' : 'ltr'}
                        />
                      </div>
                      <div>
                        <Label className="text-sm">{t('portal.contact.message')}</Label>
                        <Textarea
                          className="mt-1.5 min-h-[100px]"
                          placeholder={t('portal.contact.messagePlaceholder')}
                          value={contactMessage}
                          onChange={e => setContactMessage(e.target.value)}
                          disabled={contactSending}
                          dir={isRtl ? 'rtl' : 'ltr'}
                        />
                      </div>
                      {contactError && (
                        <p className="text-sm text-destructive">{contactError}</p>
                      )}
                      <Button
                        onClick={sendContactMessage}
                        disabled={!contactSubject.trim() || !contactMessage.trim() || contactSending}
                        className="w-full sm:w-auto"
                      >
                        {contactSending ? t('portal.contact.sending') : t('portal.contact.send')}
                      </Button>
                    </div>
                  )}
                </Card>
              </section>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* ── Add/Edit Property Dialog ───────────────────────────────────────────── */}
      <Dialog open={showPropForm} onOpenChange={(v) => { if (!v) setShowPropForm(false); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editProp ? t('portal.editProperty') : t('portal.addProperty')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyName')} *</Label>
              <Input
                value={propForm.name}
                onChange={(e) => setPropForm({ ...propForm, name: e.target.value })}
                placeholder={isRtl ? 'برج الرياض' : 'Riyadh Tower'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyType')}</Label>
              <Select value={propForm.type} onValueChange={(v) => setPropForm({ ...propForm, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((tp) => (
                    <SelectItem key={tp} value={tp}>
                      {propTypeLabel(tp)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyStatus')}</Label>
              <Select value={propForm.status} onValueChange={(v) => setPropForm({ ...propForm, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROPERTY_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyAddress')} *</Label>
              <Input
                value={propForm.address}
                onChange={(e) => setPropForm({ ...propForm, address: e.target.value })}
                placeholder={isRtl ? 'شارع الملك فهد' : 'King Fahd Road'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyCity')} *</Label>
              <Input
                value={propForm.city}
                onChange={(e) => setPropForm({ ...propForm, city: e.target.value })}
                placeholder={isRtl ? 'الرياض' : 'Riyadh'}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('portal.propertyCountry')}</Label>
              <Input
                value={propForm.country}
                onChange={(e) => setPropForm({ ...propForm, country: e.target.value })}
                placeholder="SA"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>{t('portal.propertyDescription')}</Label>
              <Textarea
                rows={3}
                value={propForm.description}
                onChange={(e) => setPropForm({ ...propForm, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPropForm(false)}>{t('portal.cancel')}</Button>
            <Button
              onClick={handleSaveProp}
              disabled={!propForm.name.trim() || !propForm.address.trim() || !propForm.city.trim() || isPropBusy}
            >
              {isPropBusy ? t('portal.saving') : t('portal.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Property Confirm ────────────────────────────────────────────── */}
      <Dialog open={deletePropId !== null} onOpenChange={(v) => { if (!v) setDeletePropId(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('portal.deleteProperty')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-2">{t('portal.confirmDelete')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeletePropId(null)}>{t('portal.cancel')}</Button>
            <Button variant="destructive" onClick={handleDeleteProp} disabled={deletePropMut.isPending}>
              {deletePropMut.isPending ? t('portal.deleting') : t('portal.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Assistant */}
      <PortalAIAgent />
    </div>
  );
};
