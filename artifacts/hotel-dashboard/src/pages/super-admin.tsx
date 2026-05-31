import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import {
  useGetSettings, useUpdateSettings,
  useListTenants, useCreateTenant, useUpdateTenant, useDeleteTenant,
  useGetTenantSettings, useUpdateTenantSettings,
  getGetTenantSettingsQueryKey,
} from "@workspace/api-client-react";
import type { Tenant, CreateTenantInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTenantsQueryKey } from "@workspace/api-client-react";
import { applyPrimaryColor, applySidebarColor, HEX_RE } from "@/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  ArrowLeft, ShieldAlert, LayoutDashboard, CheckCircle2,
  Lock, Unlock, ShieldOff, Layers, Building, Building2, Globe, Plus, Pencil,
  Trash2, Users, RefreshCw, X,
  ArrowUp, ArrowDown, Eye, EyeOff, Navigation2, ShieldCheck, ImageIcon,
  DoorOpen, MapPin, Wrench, Dumbbell, UserCog, ClipboardList, InboxIcon,
  History, SlidersHorizontal, BarChart2, Ticket, Shield, Palette, Upload, Settings2,
} from "lucide-react";
import type { NavConfigItem, PermissionMatrix } from "@workspace/api-client-react";
import {
  MODULE_REGISTRY,
  type BusinessMode,
} from "@/config/modules";
import { isSuperAdmin, isOwnerTier, useRole } from "@/contexts/role-context";

// ─── Business mode options ────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: BusinessMode; label: string; icon: React.ElementType }[] = [
  { value: "hotel",                label: "Standard (Rooms)",    icon: Building    },
  { value: "compound",             label: "Mixed (Units)",       icon: Building2   },
  { value: "tower",                label: "Tower (Floors)",      icon: Building    },
  { value: "serviced-apartments",  label: "Serviced (Units)",    icon: Building2   },
];

const CORE_ITEMS = ["Dashboard", "Properties", "Unit Status", "Staff"];

// ─── Nav Controller definitions ───────────────────────────────────────────────

const NAV_DEFINITIONS = [
  { id: "dashboard",          label: "Dashboard",          section: "main",       icon: LayoutDashboard },
  { id: "properties",         label: "Properties",         section: "main",       icon: Building2 },
  { id: "rooms",              label: "Rooms / Units",      section: "main",       icon: DoorOpen },
  { id: "unit-map",           label: "Unit Map",           section: "main",       icon: MapPin },
  { id: "maintenance",        label: "Maintenance",        section: "operations", icon: Wrench },
  { id: "facilities",         label: "Facilities",         section: "operations", icon: Dumbbell },
  { id: "staff",              label: "Staff",              section: "operations", icon: UserCog },
  { id: "tasks",              label: "Tasks",              section: "operations", icon: ClipboardList },
  { id: "guest-requests",     label: "Guest Requests",     section: "operations", icon: InboxIcon },
  { id: "activity-log",       label: "Activity Log",       section: "operations", icon: History },
  { id: "user-management",    label: "User Management",    section: "operations", icon: UserCog },
  { id: "admin-settings",     label: "Admin Settings",     section: "operations", icon: SlidersHorizontal },
  { id: "security-dashboard", label: "Security Dashboard", section: "operations", icon: ShieldAlert },
  { id: "analytics",          label: "Analytics",          section: "operations", icon: BarChart2 },
  { id: "support-tickets",    label: "Support Tickets",    section: "operations", icon: Ticket },
] as const;

// ─── Permission Matrix definitions ────────────────────────────────────────────

const PERMISSION_ROUTES = [
  { href: "/",                   label: "Dashboard",          i18nKey: "nav.dashboard"         },
  { href: "/properties",         label: "Properties",         i18nKey: "nav.properties"        },
  { href: "/rooms",              label: "Rooms / Units",      i18nKey: "nav.rooms"             },
  { href: "/unit-map",           label: "Unit Map",           i18nKey: "nav.unitMap"           },
  { href: "/maintenance",        label: "Maintenance",        i18nKey: "nav.maintenance"       },
  { href: "/facilities",         label: "Facilities",         i18nKey: "nav.facilities"        },
  { href: "/staff",              label: "Staff",              i18nKey: "nav.staff"             },
  { href: "/tasks",              label: "Tasks",              i18nKey: "nav.tasks"             },
  { href: "/guest-requests",     label: "Guest Requests",     i18nKey: "nav.guestRequests"     },
  { href: "/activity-log",       label: "Activity Log",       i18nKey: "nav.activityLog"       },
  { href: "/user-management",    label: "User Management",    i18nKey: "nav.userManagement"    },
  { href: "/admin-settings",     label: "Admin Settings",     i18nKey: "nav.adminSettings"     },
  { href: "/security-dashboard", label: "Security Dashboard", i18nKey: "nav.securityDashboard" },
  { href: "/analytics",          label: "Analytics",          i18nKey: "nav.analytics"         },
  { href: "/support-tickets",    label: "Support Tickets",    i18nKey: "nav.supportTickets"    },
];

const CONFIGURABLE_ROLES = [
  { id: "manager",     label: "Manager",     color: "bg-purple-100 text-purple-700" },
  { id: "supervisor",  label: "Supervisor",  color: "bg-amber-100 text-amber-700" },
  { id: "maintenance", label: "Maintenance", color: "bg-orange-100 text-orange-700" },
  { id: "cleaning",    label: "Cleaning",    color: "bg-green-100 text-green-700" },
  { id: "security",    label: "Security",    color: "bg-blue-100 text-blue-700" },
];

const DEFAULT_NAV_CONFIG_SA: NavConfigItem[] = NAV_DEFINITIONS.map((d, i) => ({
  id: d.id, order: i, visible: true,
}));

const DEFAULT_PERMISSION_MATRIX_SA: PermissionMatrix = {
  manager:     ["/", "/tasks", "/activity-log", "/user-management", "/analytics", "/support-tickets"],
  supervisor:  ["/", "/tasks"],
  maintenance: ["/", "/tasks"],
  cleaning:    ["/", "/tasks"],
  security:    ["/", "/tasks"],
};

const PLAN_COLORS: Record<string, string> = {
  starter:    "bg-slate-100 text-slate-700",
  growth:     "bg-blue-100 text-blue-700",
  pro:        "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
};

// ─── Tenant Form Dialog ───────────────────────────────────────────────────────

function TenantFormDialog({
  open, onClose, editing, onDone,
}: {
  open: boolean;
  onClose: () => void;
  editing: Tenant | null;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const { mutateAsync: create, isPending: creating } = useCreateTenant();
  const { mutateAsync: update, isPending: updating } = useUpdateTenant();
  const qc = useQueryClient();

  const [name,         setName]         = useState("");
  const [slug,         setSlug]         = useState("");
  const [plan,         setPlan]         = useState("starter");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [logoText,     setLogoText]     = useState("");
  const [logoSub,      setLogoSub]      = useState("");
  const [adminUser,    setAdminUser]    = useState("");
  const [adminPass,    setAdminPass]    = useState("");

  useEffect(() => {
    if (editing) {
      setName(editing.name); setSlug(editing.slug); setPlan(editing.plan);
      setContactEmail(editing.contactEmail ?? ""); setContactPhone(editing.contactPhone ?? "");
      setLogoText(editing.logoText ?? ""); setLogoSub(editing.logoSub ?? "");
      setAdminUser(""); setAdminPass("");
    } else {
      setName(""); setSlug(""); setPlan("starter"); setContactEmail("");
      setContactPhone(""); setLogoText(""); setLogoSub(""); setAdminUser(""); setAdminPass("");
    }
  }, [editing, open]);

  function autoSlug(n: string) {
    return n.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editing) {
        await update({ id: editing.id, data: { name, plan, contactEmail, contactPhone, logoText, logoSub } });
        toast({ title: "Tenant updated" });
      } else {
        const body: CreateTenantInput = { name, slug, plan, contactEmail, contactPhone, logoText, logoSub };
        if (adminUser && adminPass) {
          (body as any).adminUsername = adminUser;
          (body as any).adminPassword = adminPass;
        }
        await create({ data: body });
        toast({ title: "Tenant created", description: `Slug: ${slug}` });
      }
      qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      onDone();
      onClose();
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {editing ? "Edit Tenant" : "New Tenant"}
            </CardTitle>
            <button onClick={onClose} className="rounded-sm p-1 hover:bg-muted">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1.5">
                <Label>Tenant Name</Label>
                <Input
                  required value={name} placeholder="Acme Hotels"
                  onChange={(e) => { setName(e.target.value); if (!editing) setSlug(autoSlug(e.target.value)); }}
                />
              </div>
              {!editing && (
                <div className="col-span-2 space-y-1.5">
                  <Label>Slug (URL identifier)</Label>
                  <Input required value={slug} placeholder="acme-hotels"
                    onChange={(e) => setSlug(autoSlug(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Login URL: /login?tenant={slug || "..."}</p>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Plan</Label>
                <Select value={plan} onValueChange={setPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["starter", "growth", "pro", "enterprise"].map((p) => (
                      <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Contact Email</Label>
                <Input type="email" value={contactEmail} placeholder="admin@tenant.com"
                  onChange={(e) => setContactEmail(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Logo Main Word</Label>
                <Input value={logoText} placeholder="Grand" className="font-serif"
                  onChange={(e) => setLogoText(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Logo Sub Word</Label>
                <Input value={logoSub} placeholder="PMS"
                  onChange={(e) => setLogoSub(e.target.value)} />
              </div>
              {!editing && (
                <>
                  <div className="space-y-1.5">
                    <Label>Admin Username (optional)</Label>
                    <Input value={adminUser} placeholder="admin"
                      onChange={(e) => setAdminUser(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Admin Password</Label>
                    <Input type="password" value={adminPass} placeholder="••••••••"
                      onChange={(e) => setAdminPass(e.target.value)} />
                  </div>
                </>
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              <Button type="submit" disabled={creating || updating}>
                {creating || updating ? "Saving…" : editing ? "Update" : "Create Tenant"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Tenant Row ───────────────────────────────────────────────────────────────

function TenantRow({
  tenant, onEdit, onDelete, onFreeze, onActivate, onConfigure,
}: {
  tenant: Tenant;
  onEdit:      (t: Tenant) => void;
  onDelete:    (t: Tenant) => void;
  onFreeze:    (t: Tenant) => void;
  onActivate:  (t: Tenant) => void;
  onConfigure: (t: Tenant) => void;
}) {
  const planColor  = PLAN_COLORS[tenant.plan] ?? "bg-gray-100 text-gray-700";
  const suspended  = (tenant as any).status === "suspended" || !tenant.isActive;

  return (
    <div className={[
      "flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors",
      suspended
        ? "bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/40 opacity-80"
        : "bg-card",
    ].join(" ")}>

      {/* Avatar */}
      <div className={[
        "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
        suspended ? "bg-red-100 dark:bg-red-900/30" : "bg-primary/10",
      ].join(" ")}>
        {suspended
          ? <ShieldOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          : <span className="font-serif font-bold text-sm text-primary">
              {(tenant.logoText ?? tenant.name).slice(0, 2).toUpperCase()}
            </span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm truncate">{tenant.name}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planColor}`}>
            {tenant.plan}
          </span>
          {suspended && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400 flex items-center gap-1">
              <Lock className="h-2.5 w-2.5" />SUSPENDED
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground font-mono">{tenant.slug}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Building className="h-3 w-3" />{(tenant as any).propertyCount ?? 0}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />{(tenant as any).userCount ?? 0}
          </span>
          {tenant.contactEmail && (
            <span className="text-xs text-muted-foreground truncate max-w-36">{tenant.contactEmail}</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {suspended ? (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400 dark:hover:bg-green-950/30"
            onClick={() => onActivate(tenant)}
          >
            <Unlock className="h-3 w-3" />Activate
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
            onClick={() => onFreeze(tenant)}
            disabled={tenant.id === 1}
            title={tenant.id === 1 ? "Cannot suspend the default tenant" : "Suspend this tenant"}
          >
            <Lock className="h-3 w-3" />Freeze
          </Button>
        )}
        <Button
          size="sm" variant="outline"
          className="h-7 text-xs gap-1 text-blue-600 border-blue-300 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950/30"
          onClick={() => onConfigure(tenant)}
          title="Configure branding & navigation"
        >
          <Settings2 className="h-3 w-3" />Configure
        </Button>
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(tenant)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {tenant.id !== 1 && (
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(tenant)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Tenant Config Panel ──────────────────────────────────────────────────────

function TenantConfigPanel({ tenant, onClose }: { tenant: Tenant; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useGetTenantSettings(tenant.id);
  const { mutateAsync: save, isPending: saving } = useUpdateTenantSettings();
  const fileRef = useRef<HTMLInputElement>(null);

  const [tab, setTab]                   = useState<"branding" | "navigation">("branding");
  const [companyName,    setCompanyName]    = useState("");
  const [propertyName,   setPropertyName]   = useState("");
  const [logoText,       setLogoText]       = useState("");
  const [logoSub,        setLogoSub]        = useState("");
  const [logoUrl,        setLogoUrl]        = useState("");
  const [primaryColor,   setPrimaryColor]   = useState("#f59e0b");
  const [secondaryColor, setSecondaryColor] = useState("#1e293b");
  const [navConfig,      setNavConfig]      = useState<NavConfigItem[]>(DEFAULT_NAV_CONFIG_SA);
  const [uploading,      setUploading]      = useState(false);
  const [dirty,          setDirty]          = useState(false);

  useEffect(() => {
    if (!data) return;
    setCompanyName(data.companyName ?? "");
    setPropertyName(data.propertyName ?? "");
    setLogoText(data.logoText ?? "");
    setLogoSub(data.logoSub ?? "");
    setLogoUrl(data.logoUrl ?? "");
    setPrimaryColor(data.primaryColor || "#f59e0b");
    setSecondaryColor(data.secondaryColor || "#1e293b");
    setNavConfig(data.navConfig?.length ? [...data.navConfig] : DEFAULT_NAV_CONFIG_SA);
    setDirty(false);
  }, [data]);

  async function handleLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json() as { uploadURL: string; objectPath: string };
      const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setLogoUrl(`/api/storage/${objectPath}`);
      setDirty(true);
      toast({ title: "Logo uploaded", description: "Click Save to apply." });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function moveCfgItem(sortedIdx: number, dir: "up" | "down") {
    const sorted = [...navConfig].sort((a, b) => a.order - b.order);
    const swapIdx = dir === "up" ? sortedIdx - 1 : sortedIdx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newCfg = navConfig.map((c) => {
      if (c.id === sorted[sortedIdx].id) return { ...c, order: sorted[swapIdx].order };
      if (c.id === sorted[swapIdx].id)   return { ...c, order: sorted[sortedIdx].order };
      return c;
    });
    setNavConfig(newCfg);
    setDirty(true);
  }

  function toggleCfgItem(id: string) {
    setNavConfig((prev) => prev.map((c) => c.id === id ? { ...c, visible: !c.visible } : c));
    setDirty(true);
  }

  function setCfgLabel(id: string, label: string) {
    setNavConfig((prev) => prev.map((c) => c.id === id ? { ...c, label: label || undefined } : c));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await save({ id: tenant.id, data: {
        propertyName: propertyName.trim(),
        logoText: logoText.trim(),
        logoSub: logoSub.trim(),
        logoUrl: logoUrl.trim(),
        navConfig,
        companyName:   companyName.trim()    || undefined,
        primaryColor:  primaryColor.trim()   || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
      }});
      qc.invalidateQueries({ queryKey: getGetTenantSettingsQueryKey(tenant.id) });
      setDirty(false);
      toast({ title: "Configuration saved", description: `${tenant.name} branding applied.` });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-xl bg-card shadow-2xl flex flex-col overflow-hidden border-l">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-serif text-lg font-bold">Configure: {tenant.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Per-tenant branding &amp; navigation</p>
          </div>
          <button onClick={onClose} className="rounded-sm p-1 hover:bg-muted">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6">
          <button onClick={() => setTab("branding")} className={`px-0 py-2.5 mr-6 text-sm font-medium border-b-2 transition-colors ${tab === "branding" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Palette className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />Branding
          </button>
          <button onClick={() => setTab("navigation")} className={`px-0 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === "navigation" ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            <Navigation2 className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />Navigation
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : tab === "branding" ? (
            <div className="space-y-6">
              {/* Identity */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Company Identity</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Company Name</Label>
                    <Input value={companyName} onChange={(e) => { setCompanyName(e.target.value); setDirty(true); }} placeholder="Acme Hotels" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Dashboard Name</Label>
                    <Input value={propertyName} onChange={(e) => { setPropertyName(e.target.value); setDirty(true); }} placeholder="Acme HQ" />
                  </div>
                </div>
              </section>

              {/* Logo */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Logo</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Main Word</Label>
                    <Input value={logoText} onChange={(e) => { setLogoText(e.target.value); setDirty(true); }} placeholder="Rakz" className="font-serif" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Sub Word</Label>
                    <Input value={logoSub} onChange={(e) => { setLogoSub(e.target.value); setDirty(true); }} placeholder="PMS" />
                  </div>
                </div>
                <div className="rounded-lg border border-dashed p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-36 rounded border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                      {logoUrl ? (
                        <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <span className="text-xs">
                          <span className="font-serif font-bold text-foreground">{logoText || "Logo"}</span>
                          {logoSub && <span className="text-muted-foreground ml-1">{logoSub}</span>}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <input ref={fileRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }} />
                      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading} className="w-36">
                        <Upload className="h-3.5 w-3.5 mr-1.5" />
                        {uploading ? "Uploading…" : "Upload Logo"}
                      </Button>
                      {logoUrl && (
                        <Button variant="ghost" size="sm" onClick={() => { setLogoUrl(""); setDirty(true); }} className="w-36 text-muted-foreground">
                          Clear logo
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Or paste image URL</Label>
                    <Input value={logoUrl} onChange={(e) => { setLogoUrl(e.target.value); setDirty(true); }} placeholder="https://example.com/logo.png" className="text-xs h-8" />
                  </div>
                </div>
              </section>

              {/* Colors */}
              <section className="space-y-3">
                <h3 className="text-sm font-semibold">Brand Colors</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Primary Color</Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">Buttons, active states</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={HEX_RE.test(primaryColor) ? primaryColor : "#f59e0b"}
                        onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); applyPrimaryColor(e.target.value); }}
                        className="h-9 w-12 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                      <Input value={primaryColor} onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); if (HEX_RE.test(e.target.value)) applyPrimaryColor(e.target.value); }}
                        placeholder="#f59e0b" className="font-mono text-xs h-9 flex-1" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Sidebar Color</Label>
                    <p className="text-[11px] text-muted-foreground -mt-1">Sidebar background</p>
                    <div className="flex items-center gap-2">
                      <input type="color" value={HEX_RE.test(secondaryColor) ? secondaryColor : "#1e293b"}
                        onChange={(e) => { setSecondaryColor(e.target.value); setDirty(true); applySidebarColor(e.target.value); }}
                        className="h-9 w-12 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                      <Input value={secondaryColor} onChange={(e) => { setSecondaryColor(e.target.value); setDirty(true); if (HEX_RE.test(e.target.value)) applySidebarColor(e.target.value); }}
                        placeholder="#1e293b" className="font-mono text-xs h-9 flex-1" />
                    </div>
                  </div>
                </div>
                <div className="flex gap-3 items-center rounded-lg border p-3">
                  <div className="h-8 w-8 rounded-full shrink-0" style={{ backgroundColor: HEX_RE.test(primaryColor) ? primaryColor : "#f59e0b" }} />
                  <div className="flex-1 h-8 rounded" style={{ backgroundColor: HEX_RE.test(secondaryColor) ? secondaryColor : "#1e293b" }} />
                  <span className="text-xs text-muted-foreground shrink-0">preview</span>
                </div>
              </section>
            </div>
          ) : (
            /* Navigation tab */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Reorder, show/hide, or rename sidebar items. Click a label to rename it.</p>
                <Badge variant="secondary" className="shrink-0">
                  {navConfig.filter((c) => c.visible).length} / {navConfig.length} visible
                </Badge>
              </div>
              <div className="space-y-1.5">
                {[...navConfig].sort((a, b) => a.order - b.order).map((item, idx, arr) => {
                  const def = NAV_DEFINITIONS.find((d) => d.id === item.id);
                  if (!def) return null;
                  const Icon = def.icon;
                  return (
                    <div key={item.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${item.visible ? "bg-card border-border" : "bg-muted/40 border-border/50 opacity-60"}`}>
                      <span className="text-[10px] font-mono text-muted-foreground w-4 text-center shrink-0">{idx + 1}</span>
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <input
                        type="text"
                        value={item.label ?? def.label}
                        onChange={(e) => setCfgLabel(item.id, e.target.value === def.label ? "" : e.target.value)}
                        placeholder={def.label}
                        className="flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none focus:bg-muted/50 rounded px-1 py-0.5"
                        title="Click to rename"
                      />
                      {item.label && item.label !== def.label && (
                        <button type="button" onClick={() => setCfgLabel(item.id, "")}
                          className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 underline" title="Reset">reset</button>
                      )}
                      <button type="button" onClick={() => toggleCfgItem(item.id)}
                        className={`relative inline-flex h-4 w-7 rounded-full shrink-0 transition-colors ${item.visible ? "bg-primary" : "bg-muted-foreground/30"}`}>
                        <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${item.visible ? "translate-x-[14px]" : "translate-x-0.5"}`} />
                      </button>
                      <div className="flex flex-col shrink-0">
                        <button type="button" onClick={() => moveCfgItem(idx, "up")} disabled={idx === 0}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button type="button" onClick={() => moveCfgItem(idx, "down")} disabled={idx === arr.length - 1}
                          className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed">
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={() => { setNavConfig(DEFAULT_NAV_CONFIG_SA); setDirty(true); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2">
                Reset to default order &amp; names
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{dirty ? "Unsaved changes" : "All changes saved"}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" onClick={handleSave} disabled={saving || !dirty} className="min-w-24">
              {saving ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { t } = useTranslation();
  const { actualDbRole } = useRole();
  const showTenants  = isSuperAdmin(actualDbRole);
  const isAdminUser  = isOwnerTier(actualDbRole);

  // Settings state
  const { data, isLoading } = useGetSettings();
  const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();
  const { toast } = useToast();
  const [propertyName,     setPropertyName]     = useState("");
  const [logoText,         setLogoText]         = useState("");
  const [logoSub,          setLogoSub]          = useState("");
  const [logoUrl,          setLogoUrl]          = useState("");
  const [businessMode,     setBusinessMode]     = useState<BusinessMode>("hotel");
  const [enabledModules,   setEnabledModules]   = useState<string[]>([]);
  const [navConfig,        setNavConfig]        = useState<NavConfigItem[]>(DEFAULT_NAV_CONFIG_SA);
  const [permissionMatrix, setPermissionMatrix] = useState<PermissionMatrix>(DEFAULT_PERMISSION_MATRIX_SA);
  const [dirty,            setDirty]            = useState(false);
  const [primaryColor,     setPrimaryColor]     = useState("#f59e0b");
  const [secondaryColor,   setSecondaryColor]   = useState("#1e293b");
  const [uploading,        setUploading]        = useState(false);
  const [configTenant,     setConfigTenant]     = useState<Tenant | null>(null);
  const ownFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!data) return;
    setPropertyName(data.propertyName || "");
    setLogoText(data.logoText || "");
    setLogoSub(data.logoSub || "");
    setLogoUrl(data.logoUrl ?? "");
    setBusinessMode((data.businessMode as BusinessMode) || "hotel");
    setEnabledModules(data.enabledModules?.length ? data.enabledModules : []);
    setNavConfig(data.navConfig?.length ? [...data.navConfig] : DEFAULT_NAV_CONFIG_SA);
    setPermissionMatrix(data.permissionMatrix ?? DEFAULT_PERMISSION_MATRIX_SA);
    setPrimaryColor(data.primaryColor || "#f59e0b");
    setSecondaryColor(data.secondaryColor || "#1e293b");
    setDirty(false);
  }, [data]);

  function toggleModule(id: string) {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
    setDirty(true);
  }

  function moveNavItem(sortedIdx: number, dir: "up" | "down") {
    const sorted = [...navConfig].sort((a, b) => a.order - b.order);
    const swapIdx = dir === "up" ? sortedIdx - 1 : sortedIdx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const newCfg = navConfig.map((c) => {
      if (c.id === sorted[sortedIdx].id) return { ...c, order: sorted[swapIdx].order };
      if (c.id === sorted[swapIdx].id)   return { ...c, order: sorted[sortedIdx].order };
      return c;
    });
    setNavConfig(newCfg);
    setDirty(true);
  }

  function toggleNavItem(id: string) {
    setNavConfig((prev) => prev.map((c) => c.id === id ? { ...c, visible: !c.visible } : c));
    setDirty(true);
  }

  function togglePermission(roleId: string, href: string) {
    setPermissionMatrix((prev) => {
      const current = prev[roleId] ?? [];
      const updated = current.includes(href)
        ? current.filter((h) => h !== href)
        : [...current, href];
      return { ...prev, [roleId]: updated };
    });
    setDirty(true);
  }

  function toggleRoleAll(roleId: string) {
    const current = permissionMatrix[roleId] ?? [];
    const all = PERMISSION_ROUTES.map((r) => r.href);
    setPermissionMatrix((prev) => ({
      ...prev,
      [roleId]: current.length === all.length ? ["/"] : all,
    }));
    setDirty(true);
  }

  async function handleOwnLogoUpload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" }); return;
    }
    setUploading(true);
    try {
      const res = await fetch("/api/storage/uploads/request-url", {
        method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }),
      });
      if (!res.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await res.json() as { uploadURL: string; objectPath: string };
      const uploadRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!uploadRes.ok) throw new Error("Upload failed");
      setLogoUrl(`/api/storage/${objectPath}`);
      setDirty(true);
      toast({ title: "Logo uploaded", description: "Click Save to apply." });
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }

  function setNavLabel(id: string, label: string) {
    setNavConfig((prev) => prev.map((c) => c.id === id ? { ...c, label: label || undefined } : c));
    setDirty(true);
  }

  async function handleSave() {
    try {
      await saveSettings({ data: {
        propertyName: propertyName.trim(),
        logoText: logoText.trim(),
        logoSub: logoSub.trim(),
        logoUrl: logoUrl.trim(),
        businessMode,
        enabledModules,
        navConfig,
        permissionMatrix,
        primaryColor: primaryColor.trim() || undefined,
        secondaryColor: secondaryColor.trim() || undefined,
      }});
      if (HEX_RE.test(primaryColor))   applyPrimaryColor(primaryColor);
      if (HEX_RE.test(secondaryColor)) applySidebarColor(secondaryColor);
      setDirty(false);
      toast({ title: "Configuration saved", description: "All changes applied instantly." });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  // Tenant tab state
  const [activeTab, setActiveTab] = useState<"tenants" | "settings" | "navigation" | "permissions">(
    showTenants ? "tenants" : "settings"
  );
  const { data: tenants, isLoading: tenantsLoading, refetch } = useListTenants({ query: { enabled: showTenants, queryKey: getListTenantsQueryKey() } });
  const { mutateAsync: updateTenant } = useUpdateTenant();
  const { mutateAsync: deleteTenant } = useDeleteTenant();
  const qc = useQueryClient();
  const [formOpen,   setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [deleteConf, setDeleteConf] = useState<Tenant | null>(null);
  const [freezeConf, setFreezeConf] = useState<Tenant | null>(null);
  const [freezing,   setFreezing]   = useState(false);

  async function handleFreeze(tenant: Tenant) {
    setFreezing(true);
    try {
      await updateTenant({ id: tenant.id, data: { isActive: false, status: "suspended" } as any });
      qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      setFreezeConf(null);
      toast({ title: `${tenant.name} has been suspended`, description: "All users are now blocked from accessing the system." });
    } catch {
      toast({ title: "Freeze failed", variant: "destructive" });
    } finally {
      setFreezing(false);
    }
  }

  async function handleActivate(tenant: Tenant) {
    try {
      await updateTenant({ id: tenant.id, data: { isActive: true, status: "active" } as any });
      qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      toast({ title: `${tenant.name} has been reactivated`, description: "Users can now sign in again." });
    } catch {
      toast({ title: "Activation failed", variant: "destructive" });
    }
  }

  async function handleDelete(tenant: Tenant) {
    try {
      await deleteTenant({ id: tenant.id });
      qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      setDeleteConf(null);
      toast({ title: "Tenant deleted" });
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    }
  }

  const logoDisplay = logoText || data?.logoText || "Grand";
  const logoSubDisplay = logoSub || data?.logoSub || "PMS";

  return (
    <div className="min-h-screen bg-muted/30">

      {/* ── Top bar ───────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <ShieldAlert className="h-3 w-3" />
              {showTenants ? "Super Admin" : "Admin Panel"}
            </span>
            <span className="font-serif text-lg font-bold text-foreground">
              {logoDisplay}&nbsp;
              <span className="font-sans font-medium text-muted-foreground">{logoSubDisplay}</span>
            </span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>

        {/* ── Tabs (visible to all admin-tier users) ─── */}
        {isAdminUser && (
          <div className="max-w-4xl mx-auto px-6 flex gap-1 pb-0 border-t border-border/50 overflow-x-auto">
            {showTenants && (
              <button
                onClick={() => setActiveTab("tenants")}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                  activeTab === "tenants"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
                Tenants
              </button>
            )}
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              Branding & Modules
            </button>
            <button
              onClick={() => setActiveTab("navigation")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === "navigation"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Navigation2 className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              Navigation
            </button>
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors shrink-0 ${
                activeTab === "permissions"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              Permissions
            </button>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">

        {/* ══ Tenants tab ══════════════════════════════════════════════════════ */}
        {activeTab === "tenants" && showTenants && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold">Tenants</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {tenants?.length ?? 0} tenant{tenants?.length !== 1 ? "s" : ""} registered
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
                <Button size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                  <Plus className="h-3.5 w-3.5 mr-1.5" />New Tenant
                </Button>
              </div>
            </div>

            {tenantsLoading ? (
              <div className="space-y-2">
                {[1,2,3].map((i) => (
                  <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
                ))}
              </div>
            ) : !tenants?.length ? (
              <Card>
                <CardContent className="py-12 flex flex-col items-center gap-3 text-center">
                  <Globe className="h-10 w-10 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No tenants yet. Create your first one.</p>
                  <Button onClick={() => { setEditTarget(null); setFormOpen(true); }}>
                    <Plus className="h-4 w-4 mr-1.5" />Create Tenant
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {tenants.map((t) => (
                  <TenantRow
                    key={t.id} tenant={t}
                    onEdit={(tenant) => { setEditTarget(tenant); setFormOpen(true); }}
                    onDelete={(tenant) => setDeleteConf(tenant)}
                    onFreeze={(tenant) => setFreezeConf(tenant)}
                    onActivate={handleActivate}
                    onConfigure={(tenant) => setConfigTenant(tenant)}
                  />
                ))}
              </div>
            )}

            {/* Plan legend */}
            <div className="flex flex-wrap gap-2 pt-2">
              {Object.entries(PLAN_COLORS).map(([plan, cls]) => (
                <span key={plan} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${cls}`}>
                  {plan}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ══ Settings tab ═════════════════════════════════════════════════════ */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <>
                {/* Client Identity */}
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
                      Client Identity
                    </CardTitle>
                    <CardDescription>Branding and property label displayed across the dashboard.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="propertyName">Property Name</Label>
                      <Input id="propertyName" value={propertyName}
                        onChange={(e) => { setPropertyName(e.target.value); setDirty(true); }} placeholder="Rakz" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Logo — Main Word</Label>
                        <Input value={logoText} onChange={(e) => { setLogoText(e.target.value); setDirty(true); }} placeholder="Rakz" className="font-serif" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Logo — Sub Word</Label>
                        <Input value={logoSub} onChange={(e) => { setLogoSub(e.target.value); setDirty(true); }} placeholder="OMS" />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <div className="text-sm text-muted-foreground border rounded-md px-3 py-2 w-full bg-muted/40 flex items-center gap-3">
                          {logoUrl ? (
                            <img src={logoUrl} alt="Logo preview" className="h-8 w-auto object-contain shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : (
                            <>
                              <span className="font-serif font-bold text-foreground">{logoText || "Grand"}</span>{" "}
                              <span className="font-medium text-muted-foreground">{logoSub || "PMS"}</span>
                            </>
                          )}
                          <span className="text-xs text-muted-foreground">preview</span>
                        </div>
                      </div>
                    </div>

                    {/* Logo Image Upload + URL */}
                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5">
                        <ImageIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        Logo Image
                        <span className="text-xs text-muted-foreground font-normal">(optional — overrides text logo)</span>
                      </Label>
                      <div className="rounded-lg border border-dashed p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-36 rounded border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
                            {logoUrl ? (
                              <img src={logoUrl} alt="Logo" className="h-10 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                            ) : (
                              <span className="text-xs">
                                <span className="font-serif font-bold text-foreground">{logoText || "Grand"}</span>
                                <span className="text-muted-foreground ml-1">{logoSub || "PMS"}</span>
                              </span>
                            )}
                          </div>
                          <div className="space-y-2">
                            <input ref={ownFileRef} type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleOwnLogoUpload(f); e.target.value = ""; }} />
                            <Button variant="outline" size="sm" onClick={() => ownFileRef.current?.click()} disabled={uploading} className="w-36">
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              {uploading ? "Uploading…" : "Upload Logo"}
                            </Button>
                            {logoUrl && (
                              <Button variant="ghost" size="sm" onClick={() => { setLogoUrl(""); setDirty(true); }} className="w-36 text-muted-foreground text-xs">
                                Clear logo
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">Or paste image URL</Label>
                          <div className="flex gap-2">
                            <Input
                              value={logoUrl}
                              onChange={(e) => { setLogoUrl(e.target.value); setDirty(true); }}
                              placeholder="https://your-domain.com/logo.png"
                              className="flex-1 text-xs h-8"
                            />
                            {logoUrl && (
                              <button type="button" onClick={() => { setLogoUrl(""); setDirty(true); }}
                                className="px-3 py-1.5 text-xs rounded-md border text-muted-foreground hover:bg-muted">
                                Clear
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Brand Colors */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1.5">
                        <Palette className="h-3.5 w-3.5 text-muted-foreground" />
                        Brand Colors
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Primary Color</Label>
                          <p className="text-[11px] text-muted-foreground">Buttons, active states</p>
                          <div className="flex items-center gap-2">
                            <input type="color" value={HEX_RE.test(primaryColor) ? primaryColor : "#f59e0b"}
                              onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); applyPrimaryColor(e.target.value); }}
                              className="h-9 w-12 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                            <Input value={primaryColor}
                              onChange={(e) => { setPrimaryColor(e.target.value); setDirty(true); if (HEX_RE.test(e.target.value)) applyPrimaryColor(e.target.value); }}
                              placeholder="#f59e0b" className="font-mono text-xs h-9" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-muted-foreground">Sidebar Color</Label>
                          <p className="text-[11px] text-muted-foreground">Sidebar background</p>
                          <div className="flex items-center gap-2">
                            <input type="color" value={HEX_RE.test(secondaryColor) ? secondaryColor : "#1e293b"}
                              onChange={(e) => { setSecondaryColor(e.target.value); setDirty(true); applySidebarColor(e.target.value); }}
                              className="h-9 w-12 rounded cursor-pointer border border-border p-0.5 bg-transparent" />
                            <Input value={secondaryColor}
                              onChange={(e) => { setSecondaryColor(e.target.value); setDirty(true); if (HEX_RE.test(e.target.value)) applySidebarColor(e.target.value); }}
                              placeholder="#1e293b" className="font-mono text-xs h-9" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3 items-center rounded-lg border p-2.5 mt-1">
                        <div className="h-7 w-7 rounded-full shrink-0" style={{ backgroundColor: HEX_RE.test(primaryColor) ? primaryColor : "#f59e0b" }} />
                        <div className="flex-1 h-7 rounded" style={{ backgroundColor: HEX_RE.test(secondaryColor) ? secondaryColor : "#1e293b" }} />
                        <span className="text-xs text-muted-foreground shrink-0">preview</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label>Business Mode</Label>
                      <p className="text-xs text-muted-foreground">Controls unit labels and available features.</p>
                      <Select value={businessMode} onValueChange={(v) => { setBusinessMode(v as BusinessMode); setDirty(true); }}>
                        <SelectTrigger className="w-full sm:w-64"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPES.map((pt) => {
                            const Icon = pt.icon;
                            return (
                              <SelectItem key={pt.value} value={pt.value}>
                                <div className="flex items-center gap-2"><Icon className="h-4 w-4 text-muted-foreground" />{pt.label}</div>
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>

                {/* Feature Checklist */}
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-base">
                          <Layers className="h-4 w-4 text-muted-foreground" />
                          Feature Checklist
                        </CardTitle>
                        <CardDescription className="mt-1">Toggle navigation tabs on/off for all users.</CardDescription>
                      </div>
                      <Badge variant="secondary" className="mt-1 shrink-0">
                        {enabledModules.length} / {MODULE_REGISTRY.length} on
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
                      <div className="flex items-center gap-2 mb-2.5">
                        <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Always Available</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {CORE_ITEMS.map((item) => (
                          <span key={item} className="inline-flex items-center gap-1.5 rounded-full bg-background border px-2.5 py-1 text-xs font-medium">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />{item}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {MODULE_REGISTRY.map((mod) => {
                        const Icon = mod.icon;
                        const isOn = enabledModules.includes(mod.id);
                        return (
                          <button key={mod.id} type="button" onClick={() => toggleModule(mod.id)}
                            className={`group text-left rounded-xl border-2 p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${isOn ? "bg-card border-border shadow-sm" : "bg-muted border-border/50 hover:border-border hover:bg-muted/80"}`}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isOn ? mod.iconBg : "bg-muted"}`}>
                                  <Icon className={`h-4 w-4 ${isOn ? mod.color : "text-muted-foreground"}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold leading-tight ${isOn ? "text-foreground" : "text-muted-foreground"}`}>{mod.label}</p>
                                  <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">{mod.description}</p>
                                </div>
                              </div>
                              <div className="shrink-0 mt-0.5 pointer-events-none">
                                <div className={`relative inline-flex h-5 w-9 rounded-full ${isOn ? "bg-primary" : "bg-muted-foreground/30"}`}>
                                  <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow ${isOn ? "translate-x-[18px]" : "translate-x-0.5"}`} />
                                </div>
                              </div>
                            </div>
                            {isOn && (
                              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                                {mod.navUnlocks.map((label) => (
                                  <span key={label} className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${mod.iconBg} ${mod.color}`}>
                                    <CheckCircle2 className="h-2.5 w-2.5" />{label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <div className="flex items-center justify-between pb-8">
                  <p className="text-sm text-muted-foreground">
                    {dirty ? "You have unsaved changes — click Save to apply." : "All changes saved."}
                  </p>
                  <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-36">
                    {saving ? "Saving…" : "Save Configuration"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ══ Navigation Controller tab ════════════════════════════════════════ */}
        {activeTab === "navigation" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold">Navigation Controller</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Reorder sidebar items using the arrows. Toggle items off to hide them from all non-owner users.
                Owner and Super Admin always see every item.
              </p>
            </div>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Navigation2 className="h-4 w-4 text-muted-foreground" />
                    Sidebar Items
                  </CardTitle>
                  <Badge variant="secondary">
                    {navConfig.filter((c) => c.visible).length} / {navConfig.length} visible
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-1.5 pb-4">
                {[...navConfig]
                  .sort((a, b) => a.order - b.order)
                  .map((item, idx, arr) => {
                    const def = NAV_DEFINITIONS.find((d) => d.id === item.id);
                    if (!def) return null;
                    const Icon = def.icon;
                    return (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors ${
                          item.visible
                            ? "bg-card border-border"
                            : "bg-muted/40 border-border/50 opacity-60"
                        }`}
                      >
                        {/* Order badge */}
                        <span className="text-[11px] font-mono text-muted-foreground w-5 text-center shrink-0">
                          {idx + 1}
                        </span>

                        {/* Icon */}
                        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />

                        {/* Editable label */}
                        <div className="flex-1 min-w-0 flex items-center gap-1">
                          <input
                            type="text"
                            value={item.label ?? def.label}
                            onChange={(e) => setNavLabel(item.id, e.target.value === def.label ? "" : e.target.value)}
                            placeholder={def.label}
                            className={`flex-1 min-w-0 text-sm font-medium bg-transparent border-none outline-none focus:bg-muted/50 rounded px-1 py-0.5 ${item.visible ? "text-foreground" : "text-muted-foreground"}`}
                            title="Click to rename"
                          />
                          {item.label && item.label !== def.label && (
                            <button type="button" onClick={() => setNavLabel(item.id, "")}
                              className="text-[10px] text-muted-foreground hover:text-foreground shrink-0 underline" title="Reset">reset</button>
                          )}
                        </div>

                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ${
                          def.section === "main"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"
                        }`}>
                          {def.section}
                        </span>

                        {/* Visibility toggle */}
                        <button
                          type="button"
                          onClick={() => toggleNavItem(item.id)}
                          title={item.visible ? "Hide from sidebar" : "Show in sidebar"}
                          className={`relative inline-flex h-5 w-9 rounded-full shrink-0 transition-colors ${
                            item.visible ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            item.visible ? "translate-x-[18px]" : "translate-x-0.5"
                          }`} />
                        </button>

                        {/* Up / Down */}
                        <div className="flex flex-col shrink-0">
                          <button
                            type="button"
                            onClick={() => moveNavItem(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <ArrowUp className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveNavItem(idx, "down")}
                            disabled={idx === arr.length - 1}
                            className="p-0.5 rounded text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:cursor-not-allowed"
                          >
                            <ArrowDown className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            <div className="flex items-center justify-between pb-8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setNavConfig(DEFAULT_NAV_CONFIG_SA); setDirty(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Reset to default order
                </button>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {dirty ? "Unsaved changes" : "Saved"}
                </p>
                <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-36">
                  {saving ? "Saving…" : "Save Navigation"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══ Permissions tab ══════════════════════════════════════════════════ */}
        {activeTab === "permissions" && (
          <div className="space-y-6">
            <div>
              <h2 className="font-serif text-xl font-bold">Permission Matrix</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Define which pages each role can access. <strong>Owner</strong> and <strong>Super Admin</strong> always
                have full access. Changes apply instantly after saving.
              </p>
            </div>

            {/* Always-full-access roles banner */}
            <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Full Access (cannot be restricted)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  { id: "super_admin", color: "bg-red-100 text-red-700" },
                  { id: "owner",       color: "bg-yellow-100 text-yellow-700" },
                ] as { id: string; color: string }[]).map((r) => (
                  <span key={r.id} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${r.color}`}>
                    <CheckCircle2 className="h-3 w-3" />{t(`roles.${r.id}` as any)}
                  </span>
                ))}
              </div>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                  Role Access Grid
                </CardTitle>
                <CardDescription>
                  Check a cell to grant that role access to the page. Uncheck to revoke it.
                  Click a role header to toggle all pages at once.
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr>
                        <th className="text-left font-medium py-2 pe-4 min-w-40 text-muted-foreground">Page</th>
                        {/* Company column — always full access, locked */}
                        <th className="text-center py-2 px-2 min-w-28">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 cursor-default" title="Always full access — cannot be restricted">
                            <Lock className="h-2.5 w-2.5" />{t("roles.owner")}
                          </span>
                        </th>
                        {CONFIGURABLE_ROLES.map((r) => {
                          const allowed = permissionMatrix[r.id] ?? [];
                          const all = allowed.length === PERMISSION_ROUTES.length;
                          return (
                            <th key={r.id} className="text-center py-2 px-2 min-w-28">
                              <button
                                type="button"
                                onClick={() => toggleRoleAll(r.id)}
                                title={all ? "Revoke all pages" : "Grant all pages"}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold transition-colors ${r.color} hover:opacity-80`}
                              >
                                {r.label}
                              </button>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {PERMISSION_ROUTES.map((page) => (
                        <tr key={page.href} className="border-t border-border/50 hover:bg-muted/20">
                          <td className="py-2 pe-4 font-medium text-sm text-foreground">{t(page.i18nKey, { defaultValue: page.label })}</td>
                          {/* Company always has access — locked checkbox */}
                          <td className="text-center py-2 px-2">
                            <input type="checkbox" checked readOnly disabled className="h-4 w-4 opacity-50 cursor-not-allowed" title="Company always has full access" />
                          </td>
                          {CONFIGURABLE_ROLES.map((r) => {
                            const allowed = (permissionMatrix[r.id] ?? []).includes(page.href);
                            return (
                              <td key={r.id} className="text-center py-2 px-2">
                                <input
                                  type="checkbox"
                                  checked={allowed}
                                  onChange={() => togglePermission(r.id, page.href)}
                                  className="h-4 w-4 accent-primary cursor-pointer"
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Owner sub-hierarchy note */}
            <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-start gap-2.5">
                <Shield className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium">Hierarchical Control</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    This matrix sets the maximum access for your entire platform. Company-level accounts can further restrict
                    access for their own managers and workers via <strong>Admin Settings → Role Permissions</strong>.
                    The effective permission is always the most restrictive setting in the chain.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pb-8">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setPermissionMatrix(DEFAULT_PERMISSION_MATRIX_SA); setDirty(true); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                >
                  Reset to defaults
                </button>
              </div>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {dirty ? "Unsaved changes" : "Saved"}
                </p>
                <Button onClick={handleSave} disabled={saving || !dirty} className="min-w-36">
                  {saving ? "Saving…" : "Save Permissions"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── Tenant form dialog ─────────────────────────────────────────────── */}
      <TenantFormDialog
        open={formOpen} onClose={() => setFormOpen(false)}
        editing={editTarget} onDone={() => qc.invalidateQueries({ queryKey: getListTenantsQueryKey() })}
      />

      {/* ── Freeze confirmation ────────────────────────────────────────────── */}
      {freezeConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm shadow-xl border-red-200 dark:border-red-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-red-600 flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Freeze Tenant?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 p-3 text-sm text-red-800 dark:text-red-300">
                <p className="font-medium">Immediate effect:</p>
                <ul className="mt-1.5 space-y-1 text-xs list-disc list-inside text-red-700 dark:text-red-400">
                  <li>All users under <strong>{freezeConf.name}</strong> will be blocked instantly</li>
                  <li>Active sessions will receive a 403 on their next API call</li>
                  <li>Login attempts will be rejected</li>
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                You can reactivate this tenant at any time to restore access.
              </p>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setFreezeConf(null)} disabled={freezing}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleFreeze(freezeConf)}
                  disabled={freezing}
                  className="gap-2"
                >
                  <Lock className="h-3.5 w-3.5" />
                  {freezing ? "Freezing…" : "Freeze Tenant"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      {deleteConf && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm shadow-xl">
            <CardHeader>
              <CardTitle className="text-base text-red-600">Delete Tenant?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                This will permanently delete <strong>{deleteConf.name}</strong> ({deleteConf.slug}) and cannot be undone.
              </p>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setDeleteConf(null)}>Cancel</Button>
                <Button variant="destructive" onClick={() => handleDelete(deleteConf)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Tenant Config Panel ────────────────────────────────────────────── */}
      {configTenant && (
        <TenantConfigPanel tenant={configTenant} onClose={() => setConfigTenant(null)} />
      )}

      <Toaster />
    </div>
  );
}
