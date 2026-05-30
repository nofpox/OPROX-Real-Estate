import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
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
  Lock, Layers, Building, Building2,
} from "lucide-react";
import {
  MODULE_REGISTRY,
  type BusinessMode,
} from "@/config/modules";

// ─── Business mode options ────────────────────────────────────────────────────

const PROPERTY_TYPES: { value: BusinessMode; label: string; icon: React.ElementType }[] = [
  { value: "hotel",                label: "Standard (Rooms)",    icon: Building    },
  { value: "compound",             label: "Mixed (Units)",       icon: Building2   },
  { value: "tower",                label: "Tower (Floors)",      icon: Building    },
  { value: "serviced-apartments",  label: "Serviced (Units)",    icon: Building2   },
];

// ─── Core (always-on) nav items ───────────────────────────────────────────────

const CORE_ITEMS = [
  "Dashboard",
  "Properties",
  "Unit Status",
  "Staff",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SuperAdmin() {
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
      toast({ title: "Configuration saved", description: "Settings applied to the dashboard immediately." });
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

  const enabledCount = enabledModules.length;

  return (
    <div className="min-h-screen bg-muted/30">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b bg-card shadow-sm">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
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

      <main className="max-w-3xl mx-auto px-6 py-8 space-y-6">

        {/* ── Client Identity ──────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              Client Identity
            </CardTitle>
            <CardDescription>
              Branding and property label displayed across the dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input
                id="propertyName"
                value={propertyName}
                onChange={(e) => { setPropertyName(e.target.value); setDirty(true); }}
                placeholder="Grand Hotel Downtown"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="businessMode">Business Mode</Label>
              <p className="text-xs text-muted-foreground">
                Controls unit labels and available features for this portfolio.
              </p>
              <Select
                value={businessMode}
                onValueChange={(v) => { setBusinessMode(v as BusinessMode); setDirty(true); }}
              >
                <SelectTrigger id="businessMode" className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((pt) => {
                    const Icon = pt.icon;
                    return (
                      <SelectItem key={pt.value} value={pt.value}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          {pt.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── Feature Checklist ────────────────────────────────────────────── */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="h-4 w-4 text-muted-foreground" />
                  Feature Checklist
                </CardTitle>
                <CardDescription className="mt-1">
                  Toggle features ON or OFF. Each toggle instantly shows or hides
                  the corresponding navigation tabs for all users. No restart needed.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="mt-1 shrink-0 tabular-nums">
                {enabledCount} / {MODULE_REGISTRY.length} on
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-4 space-y-4">

            {/* Always-on core items */}
            <div className="rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2 mb-2.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  Always Available
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {CORE_ITEMS.map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Optional module toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MODULE_REGISTRY.map((mod) => {
                const Icon = mod.icon;
                const isOn = enabledModules.includes(mod.id);
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => toggleModule(mod.id)}
                    className={`group text-left rounded-xl border-2 p-4 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isOn
                        ? "bg-card border-border shadow-sm"
                        : "bg-muted border-border/50 hover:border-border hover:bg-muted/80"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${isOn ? mod.iconBg : "bg-muted"}`}>
                          <Icon className={`h-4 w-4 ${isOn ? mod.color : "text-muted-foreground"}`} />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-semibold leading-tight ${isOn ? "text-foreground" : "text-muted-foreground"}`}>
                            {mod.label}
                          </p>
                          <p className="text-xs text-muted-foreground leading-snug mt-0.5 line-clamp-2">
                            {mod.description}
                          </p>
                        </div>
                      </div>
                      {/* Switch — click is captured by the parent button */}
                      <div className="shrink-0 mt-0.5 pointer-events-none">
                        <div
                          className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                            isOn ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              isOn ? "translate-x-[18px]" : "translate-x-0.5"
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Unlocks tags */}
                    {isOn && (
                      <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/50">
                        {mod.navUnlocks.map((label) => (
                          <span
                            key={label}
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${mod.iconBg} ${mod.color}`}
                          >
                            <CheckCircle2 className="h-2.5 w-2.5" />
                            {label}
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

        {/* ── Save bar ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pb-8">
          <p className="text-sm text-muted-foreground">
            {dirty
              ? "You have unsaved changes — click Save to apply."
              : "All changes saved."}
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
