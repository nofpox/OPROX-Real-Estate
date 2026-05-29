import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { useGetSettings, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";
import {
  Hotel, Building2, Sparkles, CheckCircle2, ArrowLeft,
  ShieldAlert, LayoutDashboard, Calendar, DoorOpen, Users,
  BarChart3, Wrench, UserCog, ClipboardList, MapPin,
  InboxIcon, History, Settings,
} from "lucide-react";
import { type BusinessMode, MODE_DEFAULTS } from "@/hooks/use-settings";

const FEATURE_DEFS: { key: string; label: string; desc: string; icon: React.ElementType }[] = [
  { key: "properties",     label: "Properties",          desc: "Multi-property management",          icon: Building2 },
  { key: "rooms",          label: "Rooms & Units",        desc: "Room inventory and status",           icon: DoorOpen },
  { key: "guests",         label: "Guests",               desc: "Guest directory and profiles",        icon: Users },
  { key: "bookings",       label: "Bookings",             desc: "Reservation lifecycle management",    icon: Calendar },
  { key: "unitMap",        label: "Unit Map",             desc: "Visual unit layout overview",         icon: MapPin },
  { key: "finance",        label: "Finance & Reporting",  desc: "Revenue, expenses, and P&L",          icon: BarChart3 },
  { key: "maintenance",    label: "Maintenance",          desc: "Work orders and maintenance",         icon: Wrench },
  { key: "staff",          label: "Staff Management",     desc: "Staff directory and scheduling",      icon: UserCog },
  { key: "tasks",          label: "Tasks & Housekeeping", desc: "Task board and cleaning assignments", icon: ClipboardList },
  { key: "guestRequests",  label: "Guest Requests",       desc: "In-stay service requests",            icon: InboxIcon },
  { key: "activityLog",    label: "Activity Log",         desc: "System audit trail",                  icon: History },
  { key: "userManagement", label: "User Management",      desc: "Staff accounts and permissions",      icon: Settings },
];

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
    label: "Hotel Mode",
    icon: Hotel,
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-200 dark:border-blue-800",
    description: "Full-service hotel operations",
    highlights: ["Bookings & check-in", "Finance & revenue", "Guest management"],
  },
  {
    id: "compound",
    label: "Compound Mode",
    icon: Building2,
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    description: "Unit & compound management",
    highlights: ["Unit map & inventory", "Maintenance focus", "No bookings/finance"],
  },
  {
    id: "serviced-apartments",
    label: "Serviced Apartments",
    icon: Sparkles,
    color: "text-violet-700 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    border: "border-violet-200 dark:border-violet-800",
    description: "Housekeeping & cleaning focus",
    highlights: ["Tasks & housekeeping", "Guest requests", "Laundry & cleaning"],
  },
];

export default function SuperAdmin() {
  const { data, isLoading } = useGetSettings();
  const { mutateAsync: saveSettings, isPending: saving } = useUpdateSettings();
  const { toast } = useToast();

  const [propertyName, setPropertyName] = useState("");
  const [logoText, setLogoText] = useState("");
  const [logoSub, setLogoSub] = useState("");
  const [businessMode, setBusinessMode] = useState<BusinessMode>("hotel");
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(MODE_DEFAULTS.hotel);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!data) return;
    setPropertyName(data.propertyName || "");
    setLogoText(data.logoText || "");
    setLogoSub(data.logoSub || "");
    const mode = (data.businessMode as BusinessMode) || "hotel";
    setBusinessMode(mode);
    setEnabledFeatures(data.enabledFeatures?.length ? data.enabledFeatures : MODE_DEFAULTS[mode]);
    setDirty(false);
  }, [data]);

  function applyModePreset(mode: BusinessMode) {
    setBusinessMode(mode);
    setEnabledFeatures([...MODE_DEFAULTS[mode]]);
    setDirty(true);
  }

  function toggleFeature(key: string) {
    setEnabledFeatures((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
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
          enabledFeatures,
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
              Select a mode to apply the recommended feature set. You can fine-tune individual features below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      <Icon className="h-5 w-5" />
                      <span className="font-semibold text-sm">{mode.label}</span>
                      {isActive && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">{mode.description}</p>
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

        {/* Feature Flags */}
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings className="h-4 w-4 text-muted-foreground" />
                  Feature Flags
                </CardTitle>
                <CardDescription className="mt-1">
                  Fine-tune which modules are visible for this client
                </CardDescription>
              </div>
              <Badge variant="secondary" className="mt-1">
                {enabledFeatures.length} / {FEATURE_DEFS.length} enabled
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {FEATURE_DEFS.map((feat) => {
                const Icon = feat.icon;
                const enabled = enabledFeatures.includes(feat.key);
                return (
                  <div
                    key={feat.key}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors ${
                      enabled ? "bg-card border-border" : "bg-muted/30 border-border/50 opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-tight">{feat.label}</p>
                        <p className="text-xs text-muted-foreground truncate">{feat.desc}</p>
                      </div>
                    </div>
                    <Switch
                      checked={enabled}
                      onCheckedChange={() => toggleFeature(feat.key)}
                      aria-label={`Toggle ${feat.label}`}
                    />
                  </div>
                );
              })}
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
