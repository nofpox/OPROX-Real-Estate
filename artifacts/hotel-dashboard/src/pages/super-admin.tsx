import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import {
  useGetSettings, useUpdateSettings,
  useListTenants, useCreateTenant, useUpdateTenant, useDeleteTenant,
} from "@workspace/api-client-react";
import type { Tenant, CreateTenantInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { getListTenantsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  ArrowLeft, ShieldAlert, LayoutDashboard, CheckCircle2,
  Lock, Layers, Building, Building2, Globe, Plus, Pencil,
  Trash2, Users, DoorClosed, RefreshCw, X, ChevronDown,
} from "lucide-react";
import {
  MODULE_REGISTRY,
  type BusinessMode,
} from "@/config/modules";
import { isSuperAdmin, useRole } from "@/contexts/role-context";

// ─── Business mode options ────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: BusinessMode; label: string; icon: React.ElementType }[] = [
  { value: "hotel",                label: "Standard (Rooms)",    icon: Building    },
  { value: "compound",             label: "Mixed (Units)",       icon: Building2   },
  { value: "tower",                label: "Tower (Floors)",      icon: Building    },
  { value: "serviced-apartments",  label: "Serviced (Units)",    icon: Building2   },
];

const CORE_ITEMS = ["Dashboard", "Properties", "Unit Status", "Staff"];

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
  tenant, onEdit, onDelete, onToggle,
}: {
  tenant: Tenant;
  onEdit: (t: Tenant) => void;
  onDelete: (t: Tenant) => void;
  onToggle: (t: Tenant, active: boolean) => void;
}) {
  const planColor = PLAN_COLORS[tenant.plan] ?? "bg-gray-100 text-gray-700";
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${tenant.isActive ? "bg-card" : "bg-muted/40 opacity-60"}`}>
      <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <span className="font-serif font-bold text-sm text-primary">
          {(tenant.logoText ?? tenant.name).slice(0, 2).toUpperCase()}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{tenant.name}</span>
          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${planColor}`}>
            {tenant.plan}
          </span>
          {!tenant.isActive && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-100 text-red-700">
              inactive
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-xs text-muted-foreground font-mono">{tenant.slug}</span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Building className="h-3 w-3" />{tenant.propertyCount ?? 0}
          </span>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" />{tenant.userCount ?? 0}
          </span>
          {tenant.contactEmail && (
            <span className="text-xs text-muted-foreground truncate max-w-36">{tenant.contactEmail}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Switch
          checked={tenant.isActive}
          onCheckedChange={(v) => onToggle(tenant, v)}
          className="scale-75"
        />
        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => onEdit(tenant)}>
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        {tenant.id !== 1 && (
          <Button size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => onDelete(tenant)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdminPage() {
  const { actualDbRole } = useRole();
  const showTenants = isSuperAdmin(actualDbRole);

  // Settings tab state
  const { data, isLoading } = useGetSettings();
  const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();
  const { toast } = useToast();
  const [propertyName,   setPropertyName]   = useState("");
  const [logoText,       setLogoText]       = useState("");
  const [logoSub,        setLogoSub]        = useState("");
  const [businessMode,   setBusinessMode]   = useState<BusinessMode>("hotel");
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [dirty,          setDirty]          = useState(false);

  useEffect(() => {
    if (!data) return;
    setPropertyName(data.propertyName || "");
    setLogoText(data.logoText || "");
    setLogoSub(data.logoSub || "");
    setBusinessMode((data.businessMode as BusinessMode) || "hotel");
    setEnabledModules(data.enabledModules?.length ? data.enabledModules : []);
    setDirty(false);
  }, [data]);

  function toggleModule(id: string) {
    setEnabledModules((prev) => prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]);
    setDirty(true);
  }

  async function handleSave() {
    try {
      await saveSettings({ data: { propertyName: propertyName.trim(), logoText: logoText.trim(), logoSub: logoSub.trim(), businessMode, enabledModules } });
      setDirty(false);
      toast({ title: "Configuration saved" });
    } catch {
      toast({ title: "Save failed", variant: "destructive" });
    }
  }

  // Tenant tab state
  const [activeTab, setActiveTab] = useState<"settings" | "tenants">(showTenants ? "tenants" : "settings");
  const { data: tenants, isLoading: tenantsLoading, refetch } = useListTenants({ query: { enabled: showTenants, queryKey: getListTenantsQueryKey() } });
  const { mutateAsync: updateTenant } = useUpdateTenant();
  const { mutateAsync: deleteTenant } = useDeleteTenant();
  const qc = useQueryClient();
  const [formOpen,   setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState<Tenant | null>(null);
  const [deleteConf, setDeleteConf] = useState<Tenant | null>(null);

  async function handleToggle(tenant: Tenant, active: boolean) {
    try {
      await updateTenant({ id: tenant.id, data: { isActive: active } });
      qc.invalidateQueries({ queryKey: getListTenantsQueryKey() });
      toast({ title: active ? "Tenant activated" : "Tenant suspended" });
    } catch {
      toast({ title: "Update failed", variant: "destructive" });
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

        {/* ── Tabs (only if super admin) ─── */}
        {showTenants && (
          <div className="max-w-4xl mx-auto px-6 flex gap-1 pb-0 border-t border-border/50">
            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "tenants"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Globe className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              Tenants
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "settings"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <LayoutDashboard className="h-3.5 w-3.5 inline-block mr-1.5 -mt-0.5" />
              Settings
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
                    onToggle={handleToggle}
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
                        onChange={(e) => { setPropertyName(e.target.value); setDirty(true); }} placeholder="Grand PMS" />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Logo — Main Word</Label>
                        <Input value={logoText} onChange={(e) => { setLogoText(e.target.value); setDirty(true); }} placeholder="Grand" className="font-serif" />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Logo — Sub Word</Label>
                        <Input value={logoSub} onChange={(e) => { setLogoSub(e.target.value); setDirty(true); }} placeholder="PMS" />
                      </div>
                      <div className="flex items-end pb-0.5">
                        <div className="text-sm text-muted-foreground border rounded-md px-3 py-2 w-full bg-muted/40">
                          Preview: <span className="font-serif font-bold text-foreground">{logoText || "Grand"}</span>{" "}
                          <span className="font-medium text-muted-foreground">{logoSub || "PMS"}</span>
                        </div>
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
      </main>

      {/* ── Tenant form dialog ─────────────────────────────────────────────── */}
      <TenantFormDialog
        open={formOpen} onClose={() => setFormOpen(false)}
        editing={editTarget} onDone={() => qc.invalidateQueries({ queryKey: getListTenantsQueryKey() })}
      />

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

      <Toaster />
    </div>
  );
}
