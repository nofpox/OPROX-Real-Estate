import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Hotel, Building2, Building, Sparkles, CheckCircle2, ArrowLeft,
  ShieldAlert, LayoutDashboard, Settings, Info,
} from "lucide-react";
import {
  MODULE_REGISTRY,
  MODE_MODULE_DEFAULTS,
  type BusinessMode,
  type ModuleDef,
} from "@/config/modules";

// ─── Business mode preset cards ──────────────────────────────────────────────

const MODE_CARDS: {
  id: BusinessMode;
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  description: string;
  highlights: string[];
}[] = [
  {
    id: "hotel",
    label: "Hotel",
    icon: Hotel,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    description: "Full-service hotel operations",
    highlights: ["Bookings & check-in", "Maintenance", "Housekeeping", "Service requests"],
  },
  {
    id: "compound",
    label: "Compound",
    icon: Building2,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    description: "Villa & compound management",
    highlights: ["Unit map & inventory", "Maintenance focus", "Housekeeping", "Service requests"],
  },
  {
    id: "tower",
    label: "Residential Tower",
    icon: Building,
    color: "text-teal-700 dark:text-teal-400",
    bg: "bg-teal-50 dark:bg-teal-900/20",
    border: "border-teal-200 dark:border-teal-800",
    description: "Mixed-use tower with shared amenities",
    highlights: ["Facility booking", "Maintenance", "Housekeeping", "Service requests"],
  },
  {
    id: "serviced-apartments",
    label: "Serviced Apartments",
    icon: Sparkles,
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    description: "Housekeeping & cleaning focus",
    highlights: ["Bookings & tenants", "Housekeeping", "Service requests"],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SuperAdmin() {
  const { data, isLoading } = useGetSettings();
  const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();
  const { toast } = useToast();

  const [propertyName, setPropertyName] = useState("");
  const [logoText, setLogoText] = useState("");
  const [logoSub, setLogoSub] = useState("");
  const [businessMode, setBusinessMode] = useState<BusinessMode>("hotel");
  const [enabledModules, setEnabledModules] = useState<string[]>(MODE_MODULE_DEFAULTS.hotel);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPropertyName(data.propertyName || "");
    setLogoText(data.logoText || "");
    setLogoSub(data.logoSub || "");
    const mode = (data.businessMode as BusinessMode) || "hotel";
    setBusinessMode(mode);
    setEnabledModules(
      data.enabledModules?.length ? data.enabledModules : MODE_MODULE_DEFAULTS[mode]
    );
    setDirty(false);
  }, [data]);

  function applyModePreset(mode: BusinessMode) {
    setBusinessMode(mode);
    setEnabledModules([...MODE_MODULE_DEFAULTS[mode]]);
    setDirty(true);
  }

  function toggleModule(id: string) {
    setEnabledModules((prev) =>
      prev.includes(id) ? prev.filter((k) => k !== id) : [...prev, id]
    );
    setDirty(true);
  }

  async function handleSave() {
    try {
      await saveSettings({
        data: {
          propertyName: propertyName.trim(),
          logoText: logoText.trim(),
          logoSub: logoSub.trim(),
          businessMode,
          enabledModules,
        },
      });
      setDirty(false);
      toast({ title: "Configuration saved", description: "Client settings updated successfully." });
    } catch {
      toast({ title: "Save failed", description: "Could not save settings.", variant: "destructive" });
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const operationalModules = MODULE_REGISTRY.filter((m) => m.group === "operational");
  const functionalModules = MODULE_REGISTRY.filter((m) => m.group === "functional");
  const totalActive = enabledModules.length;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
              <ShieldAlert className="h-3 w-3" />
              Super Admin
            </span>
            <span className="font-serif text-lg font-bold text-foreground">
              {logoText || "Grand"}&nbsp;
              <span className="font-sans font-medium text-muted-foreground">{logoSub || "PMS"}</span>
            </span>
          </div>
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">

        {/* Client Identity */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Client Identity
            </CardTitle>
            <CardDescription>Branding displayed across the dashboard and login screen</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-3 space-y-1.5">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input
                id="propertyName"
                value={propertyName}
                onChange={(e) => { setPropertyName(e.target.value); setDirty(true); }}
                placeholder="Grand Hotel Downtown"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoText">Logo — Main Word</Label>
              <Input
                id="logoText"
                value={logoText}
                onChange={(e) => { setLogoText(e.target.value); setDirty(true); }}
                placeholder="Grand"
                className="font-serif"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="logoSub">Logo — Sub Word</Label>
              <Input
                id="logoSub"
                value={logoSub}
                onChange={(e) => { setLogoSub(e.target.value); setDirty(true); }}
                placeholder="PMS"
              />
            </div>
            <div className="flex items-end pb-0.5">
              <div className="text-sm text-muted-foreground border rounded-md px-3 py-2 w-full bg-muted/40">
                Preview:{" "}
                <span className="font-serif font-bold text-foreground">{logoText || "Grand"}</span>{" "}
                <span className="font-medium text-muted-foreground">{logoSub || "PMS"}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Mode */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <Hotel className="h-4 w-4 text-muted-foreground" />
              Business Mode
            </CardTitle>
            <CardDescription>
              Pick a preset to auto-select the recommended modules for your property type.
              You can then fine-tune individual modules below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {MODE_CARDS.map((mode) => {
                const Icon = mode.icon;
                const isActive = businessMode === mode.id;
                return (
                  <button
                    key={mode.id}
                    onClick={() => applyModePreset(mode.id)}
                    className={`text-left rounded-lg border-2 p-4 transition-all ${
                      isActive
                        ? `${mode.border} ${mode.bg} ring-2 ring-offset-1 ring-current ${mode.color}`
                        : "border-border hover:border-muted-foreground/30 hover:bg-muted/40"
                    }`}
                  >
                    <div className={`flex items-center gap-2 mb-2 ${isActive ? mode.color : "text-foreground"}`}>
                      <Icon className="h-5 w-5 shrink-0" />
                      <span className="font-semibold text-sm leading-tight">{mode.label}</span>
                      {isActive && <CheckCircle2 className="h-4 w-4 ml-auto shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3 leading-snug">{mode.description}</p>
                    <div className="space-y-1">
                      {mode.highlights.map((h) => (
                        <div key={h} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${isActive ? mode.color.replace("text-", "bg-") : "bg-muted-foreground/40"}`} />
                          {h}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Functional Modules */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Independent Functional Modules
                </CardTitle>
                <CardDescription className="mt-1">
                  Each module runs the same workflow regardless of property type — toggle them
                  independently of the business mode preset.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="mt-1 shrink-0">
                {totalActive} / {MODULE_REGISTRY.length} active
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Architecture note */}
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 px-4 py-3">
              <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                Modules are the primary unit of configuration. Business mode presets above just apply
                a recommended combination — you can always override them here. The same{" "}
                <span className="font-semibold">Housekeeping</span> workflow works whether it's a
                hotel room, a villa, or an apartment unit.
              </p>
            </div>

            {/* Operational modules */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Operational Modules
                </h3>
                <Separator className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Data-centric pages — bookings calendar, financial reporting, and visual unit maps.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {operationalModules.map((mod) => (
                  <ModuleToggleRow
                    key={mod.id}
                    mod={mod}
                    enabled={enabledModules.includes(mod.id)}
                    onToggle={() => toggleModule(mod.id)}
                  />
                ))}
              </div>
            </div>

            {/* Functional modules */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Functional Modules
                </h3>
                <Separator className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Property-type-agnostic workflows — the same logic applies across hotels, compounds, and towers.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {functionalModules.map((mod) => (
                  <ModuleToggleRow
                    key={mod.id}
                    mod={mod}
                    enabled={enabledModules.includes(mod.id)}
                    onToggle={() => toggleModule(mod.id)}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save */}
        <div className="flex items-center justify-between pb-8">
          <p className="text-sm text-muted-foreground">
            {dirty ? "You have unsaved changes." : "All changes saved."}
          </p>
          <Button
            onClick={handleSave}
            disabled={saving || !dirty}
            className="min-w-36"
          >
            {saving ? "Saving…" : "Save Configuration"}
          </Button>
        </div>
      </main>

      <Toaster />
    </div>
  );
}

// ─── Module toggle row ────────────────────────────────────────────────────────

function ModuleToggleRow({
  mod,
  enabled,
  onToggle,
}: {
  mod: ModuleDef;
  enabled: boolean;
  onToggle: () => void;
}) {
  const Icon = mod.icon;
  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
        enabled ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{mod.label}</p>
          <p className="text-xs text-muted-foreground leading-snug line-clamp-1">{mod.description}</p>
        </div>
      </div>
      <Switch
        checked={enabled}
        onCheckedChange={onToggle}
        aria-label={`Toggle ${mod.label}`}
      />
    </div>
  );
}
