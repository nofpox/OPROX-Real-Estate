import { useState, useRef, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Monitor, Upload, Loader2, Save, Pencil, X, Plus, Trash2,
  Check, RefreshCw, Globe, Phone, Mail, MapPin, Image as ImageIcon,
  Building, BarChart3, Layers, Navigation, AlignLeft, Megaphone,
  MessageCircle, ExternalLink, ChevronDown, ChevronUp, Database, List,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

interface BrandingContent {
  companyNameEn: string; companyNameAr: string;
  taglineEn: string; taglineAr: string;
  logoUrl: string;
}
interface HeroContent {
  titleEn: string; titleAr: string;
  subtitleEn: string; subtitleAr: string;
  ctaButtonEn: string; ctaButtonAr: string;
  imageUrl: string;
}
type StatLiveKey = "properties_count" | "guests_count" | "bookings_count" | "rooms_count" | null;
interface Stat { value: string; labelEn: string; labelAr: string; liveKey?: StatLiveKey; }
interface ServiceItem {
  titleEn: string; titleAr: string;
  descEn: string; descAr: string;
  itemsEn: string[]; itemsAr: string[];
  imageUrl: string;
}
interface NavItem { href: string; labelEn: string; labelAr: string; }
interface ContactContent {
  email: string; salesEmail: string; supportEmail: string;
  phone: string; fax: string; supportPhone: string; whatsapp: string;
  addressEn: string; addressAr: string;
}
interface FooterContent { descriptionEn: string; descriptionAr: string; }
interface CtaContent {
  headlineEn: string; headlineAr: string;
  subtitleEn: string; subtitleAr: string;
  buttonEn: string; buttonAr: string;
}
interface AboutContent { titleEn: string; titleAr: string; body: string; imageUrl: string; }
interface Announcement { id: string; text: string; isActive: boolean; }
interface ListingsPageContent {
  pageTitleEn: string; pageTitleAr: string;
  subtitleEn: string; subtitleAr: string;
  metaDescription: string;
}

interface SiteContent {
  branding: BrandingContent;
  hero: HeroContent;
  stats: Stat[];
  services: ServiceItem[];
  nav: NavItem[];
  contact: ContactContent;
  footer: FooterContent;
  cta: CtaContent;
  about: AboutContent;
  announcements: Announcement[];
  listingsPage: ListingsPageContent;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const apiFetch = async <T,>(url: string, opts?: RequestInit): Promise<T> => {
  // Standalone: simulate API call
  const res = new Response(JSON.stringify({}), { status: 200, headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
};

async function uploadImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Shared: Section Card wrapper ──────────────────────────────────────────────

interface SectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isEditing: boolean;
  isSaving: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  preview: React.ReactNode;
}

function SectionCard({ icon, title, description, isEditing, isSaving, onEdit, onSave, onCancel, children, preview }: SectionCardProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">{icon}{title}</CardTitle>
            <CardDescription className="text-xs mt-0.5">{description}</CardDescription>
          </div>
          {isEditing ? (
            <div className="flex gap-2 shrink-0">
              <Button size="sm" variant="outline" onClick={onCancel}>Cancel</Button>
              <Button size="sm" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}
                Save
              </Button>
            </div>
          ) : (
            <Button size="sm" variant="outline" onClick={onEdit} className="shrink-0">
              <Pencil className="h-3.5 w-3.5 me-1.5" />Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isEditing ? children : preview}
      </CardContent>
    </Card>
  );
}

// ── Image Upload Button ────────────────────────────────────────────────────────

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const url = await uploadImage(files[0]);
      onChange(url);
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group h-16 w-24 rounded-md overflow-hidden border shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              onClick={() => onChange("")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-24 rounded-md border-2 border-dashed flex items-center justify-center shrink-0 bg-muted/30">
            <ImageIcon className="h-5 w-5 text-muted-foreground/40" />
          </div>
        )}
        <div className="space-y-1.5">
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={uploading} className="h-8">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
            {value ? "Replace" : "Upload Image"}
          </Button>
          {!value && (
            <div className="flex gap-1.5 items-center">
              <Input
                value=""
                onChange={() => {}}
                placeholder="Or paste URL…"
                className="h-7 text-xs w-48"
                onBlur={e => { if (e.target.value.trim()) onChange(e.target.value.trim()); }}
              />
            </div>
          )}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={e => handleFile(e.target.files)} />
      </div>
    </div>
  );
}

// ── Tab: Brand & Identity ─────────────────────────────────────────────────────

function BrandTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [local, setLocal] = useState<BrandingContent>(content.branding);

  const startEdit = () => { setLocal({ ...content.branding }); setEditing(true); };
  const cancel = () => setEditing(false);
  const save = async () => {
    setSaving(true);
    try { await onSave("branding", local); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 mt-4">
      <SectionCard
        icon={<Building className="h-4 w-4" />}
        title="Company Identity"
        description="Company name, tagline, and logo shown across the website"
        isEditing={editing} isSaving={saving}
        onEdit={startEdit} onSave={save} onCancel={cancel}
        preview={
          <div className="flex items-center gap-4">
            {content.branding.logoUrl
              ? <img src={content.branding.logoUrl} alt="Logo" className="h-12 w-12 rounded-lg object-contain border" />
              : <div className="h-12 w-12 rounded-lg border-2 border-dashed flex items-center justify-center bg-muted/30"><Building className="h-5 w-5 text-muted-foreground/40" /></div>
            }
            <div>
              <p className="font-semibold">{content.branding.companyNameEn}</p>
              <p className="text-sm text-muted-foreground" dir="rtl">{content.branding.companyNameAr}</p>
              <p className="text-xs text-muted-foreground/60 mt-0.5">{content.branding.taglineEn}</p>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Company Name (English)</Label>
              <Input value={local.companyNameEn} onChange={e => setLocal(l => ({ ...l, companyNameEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">اسم الشركة (Arabic)</Label>
              <Input dir="rtl" value={local.companyNameAr} onChange={e => setLocal(l => ({ ...l, companyNameAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Tagline (English)</Label>
              <Input value={local.taglineEn} onChange={e => setLocal(l => ({ ...l, taglineEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">الشعار (Arabic)</Label>
              <Input dir="rtl" value={local.taglineAr} onChange={e => setLocal(l => ({ ...l, taglineAr: e.target.value }))} /></div>
          </div>
          <ImageUploadField label="Logo" value={local.logoUrl} onChange={url => setLocal(l => ({ ...l, logoUrl: url }))} />
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Home Page ────────────────────────────────────────────────────────────

function HomeTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const [heroEditing, setHeroEditing] = useState(false);
  const [heroSaving, setHeroSaving]   = useState(false);
  const [heroLocal, setHeroLocal]     = useState<HeroContent>(content.hero);

  const [statsEditing, setStatsEditing] = useState(false);
  const [statsSaving, setStatsSaving]   = useState(false);
  const [statsLocal, setStatsLocal]     = useState<Stat[]>(content.stats);

  const [ctaEditing, setCtaEditing] = useState(false);
  const [ctaSaving, setCtaSaving]   = useState(false);
  const [ctaLocal, setCtaLocal]     = useState<CtaContent>(content.cta);

  const { data: _liveStats } = useQuery<Record<string, number>>({
    queryKey: ["cms-live-stats"],
    queryFn: () => apiFetch<Record<string, number>>("/realestate-api/cms/live-stats"),
    staleTime: 30_000,
  });
  const liveStats = _liveStats ?? {};

  const saveSection = async (section: string, data: unknown, setSaving: (v: boolean) => void, setEditing: (v: boolean) => void) => {
    setSaving(true);
    try { await onSave(section, data); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 mt-4">
      {/* Hero */}
      <SectionCard
        icon={<ImageIcon className="h-4 w-4" />}
        title="Hero Banner"
        description="The large banner at the top of the homepage"
        isEditing={heroEditing} isSaving={heroSaving}
        onEdit={() => { setHeroLocal({ ...content.hero }); setHeroEditing(true); }}
        onSave={() => saveSection("hero", heroLocal, setHeroSaving, setHeroEditing)}
        onCancel={() => setHeroEditing(false)}
        preview={
          <div className="space-y-2">
            {content.hero.imageUrl && <img src={content.hero.imageUrl} alt="Hero" className="h-28 w-full object-cover rounded-md" />}
            <p className="font-medium">{content.hero.titleEn}</p>
            <p className="text-sm text-muted-foreground" dir="rtl">{content.hero.titleAr}</p>
            <p className="text-xs text-muted-foreground/60">{content.hero.subtitleEn}</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-xs">{content.hero.ctaButtonEn}</Badge>
              <Badge variant="outline" className="text-xs" dir="rtl">{content.hero.ctaButtonAr}</Badge>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          <ImageUploadField label="Background Image" value={heroLocal.imageUrl} onChange={url => setHeroLocal(h => ({ ...h, imageUrl: url }))} />
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Headline (English)</Label>
              <Textarea rows={2} value={heroLocal.titleEn} onChange={e => setHeroLocal(h => ({ ...h, titleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
              <Textarea dir="rtl" rows={2} value={heroLocal.titleAr} onChange={e => setHeroLocal(h => ({ ...h, titleAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Subtitle (English)</Label>
              <Textarea rows={3} value={heroLocal.subtitleEn} onChange={e => setHeroLocal(h => ({ ...h, subtitleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">العنوان الفرعي (Arabic)</Label>
              <Textarea dir="rtl" rows={3} value={heroLocal.subtitleAr} onChange={e => setHeroLocal(h => ({ ...h, subtitleAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">CTA Button (English)</Label>
              <Input value={heroLocal.ctaButtonEn} onChange={e => setHeroLocal(h => ({ ...h, ctaButtonEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">زر الدعوة للعمل (Arabic)</Label>
              <Input dir="rtl" value={heroLocal.ctaButtonAr} onChange={e => setHeroLocal(h => ({ ...h, ctaButtonAr: e.target.value }))} /></div>
          </div>
        </div>
      </SectionCard>

      {/* Stats */}
      <SectionCard
        icon={<BarChart3 className="h-4 w-4" />}
        title="Statistics Bar"
        description="4 key numbers shown below the hero banner"
        isEditing={statsEditing} isSaving={statsSaving}
        onEdit={() => { setStatsLocal(content.stats.map(s => ({ ...s }))); setStatsEditing(true); }}
        onSave={() => saveSection("stats", statsLocal, setStatsSaving, setStatsEditing)}
        onCancel={() => setStatsEditing(false)}
        preview={
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {content.stats.map((s, i) => {
              const live = s.liveKey ? liveStats[s.liveKey] : undefined;
              const display = live !== undefined ? live.toLocaleString() : s.value;
              return (
                <div key={i} className="text-center p-3 bg-muted/40 rounded-lg relative">
                  {s.liveKey && <Database className="h-3 w-3 text-primary/40 absolute top-1.5 end-1.5" />}
                  <p className="text-xl font-bold text-primary">{display}</p>
                  <p className="text-xs text-muted-foreground">{s.labelEn}</p>
                  <p className="text-xs text-muted-foreground/60" dir="rtl">{s.labelAr}</p>
                </div>
              );
            })}
          </div>
        }
      >
        <div className="space-y-3">
          {statsLocal.map((stat, i) => (
            <div key={i} className="p-3 border rounded-lg bg-muted/20 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Stat {i + 1}</span>
                <div className="flex items-center gap-2">
                  <Database className="h-3.5 w-3.5 text-muted-foreground" />
                  <Label className="text-xs text-muted-foreground">Auto from database</Label>
                  <Switch
                    checked={!!stat.liveKey}
                    onCheckedChange={checked =>
                      setStatsLocal(s => s.map((x, j) => j === i
                        ? { ...x, liveKey: checked ? "properties_count" : null }
                        : x))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stat.liveKey ? (
                  <div>
                    <Label className="text-xs mb-1 block">Database Field</Label>
                    <select
                      value={stat.liveKey}
                      onChange={e => setStatsLocal(s => s.map((x, j) => j === i ? { ...x, liveKey: e.target.value as StatLiveKey } : x))}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    >
                      <option value="properties_count">Properties count</option>
                      <option value="guests_count">Guests / Tenants</option>
                      <option value="bookings_count">Bookings count</option>
                      <option value="rooms_count">Rooms count</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <Label className="text-xs mb-1 block">Value</Label>
                    <Input value={stat.value} onChange={e => setStatsLocal(s => s.map((x, j) => j === i ? { ...x, value: e.target.value } : x))} className="h-8 text-sm" />
                  </div>
                )}
                <div><Label className="text-xs mb-1 block">Label (EN)</Label>
                  <Input value={stat.labelEn} onChange={e => setStatsLocal(s => s.map((x, j) => j === i ? { ...x, labelEn: e.target.value } : x))} className="h-8 text-sm" /></div>
                <div><Label className="text-xs mb-1 block">التسمية (AR)</Label>
                  <Input dir="rtl" value={stat.labelAr} onChange={e => setStatsLocal(s => s.map((x, j) => j === i ? { ...x, labelAr: e.target.value } : x))} className="h-8 text-sm" /></div>
              </div>
              {stat.liveKey && liveStats[stat.liveKey] !== undefined && (
                <p className="text-xs text-primary/70 flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  Current live value: <strong>{liveStats[stat.liveKey].toLocaleString()}</strong>
                </p>
              )}
            </div>
          ))}
        </div>
      </SectionCard>

      {/* CTA */}
      <SectionCard
        icon={<Megaphone className="h-4 w-4" />}
        title="Call-to-Action Section"
        description="The bottom banner urging visitors to get in touch"
        isEditing={ctaEditing} isSaving={ctaSaving}
        onEdit={() => { setCtaLocal({ ...content.cta }); setCtaEditing(true); }}
        onSave={() => saveSection("cta", ctaLocal, setCtaSaving, setCtaEditing)}
        onCancel={() => setCtaEditing(false)}
        preview={
          <div className="p-4 bg-muted/30 rounded-lg space-y-1 text-center">
            <p className="font-semibold">{content.cta.headlineEn}</p>
            <p className="text-sm text-muted-foreground" dir="rtl">{content.cta.headlineAr}</p>
            <p className="text-xs text-muted-foreground/60 mt-1">{content.cta.subtitleEn}</p>
            <Badge variant="outline" className="mt-2">{content.cta.buttonEn}</Badge>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Headline (English)</Label>
              <Textarea rows={2} value={ctaLocal.headlineEn} onChange={e => setCtaLocal(c => ({ ...c, headlineEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
              <Textarea dir="rtl" rows={2} value={ctaLocal.headlineAr} onChange={e => setCtaLocal(c => ({ ...c, headlineAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Subtitle (English)</Label>
              <Textarea rows={3} value={ctaLocal.subtitleEn} onChange={e => setCtaLocal(c => ({ ...c, subtitleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">النص الفرعي (Arabic)</Label>
              <Textarea dir="rtl" rows={3} value={ctaLocal.subtitleAr} onChange={e => setCtaLocal(c => ({ ...c, subtitleAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Button Text (English)</Label>
              <Input value={ctaLocal.buttonEn} onChange={e => setCtaLocal(c => ({ ...c, buttonEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">نص الزر (Arabic)</Label>
              <Input dir="rtl" value={ctaLocal.buttonAr} onChange={e => setCtaLocal(c => ({ ...c, buttonAr: e.target.value }))} /></div>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Services ─────────────────────────────────────────────────────────────

function ServicesTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [local, setLocal]     = useState<ServiceItem[]>(content.services);
  const [open, setOpen]       = useState<number | null>(0);

  const updateService = (idx: number, patch: Partial<ServiceItem>) =>
    setLocal(s => s.map((x, i) => i === idx ? { ...x, ...patch } : x));

  const updateItem = (svcIdx: number, itemIdx: number, val: string, lang: "en" | "ar") =>
    setLocal(s => s.map((x, i) => {
      if (i !== svcIdx) return x;
      const key = lang === "en" ? "itemsEn" : "itemsAr";
      const arr = [...x[key]];
      arr[itemIdx] = val;
      return { ...x, [key]: arr };
    }));

  const addItem = (svcIdx: number) =>
    setLocal(s => s.map((x, i) => i === svcIdx ? { ...x, itemsEn: [...x.itemsEn, ""], itemsAr: [...x.itemsAr, ""] } : x));

  const removeItem = (svcIdx: number, itemIdx: number) =>
    setLocal(s => s.map((x, i) => i === svcIdx ? {
      ...x,
      itemsEn: x.itemsEn.filter((_, j) => j !== itemIdx),
      itemsAr: x.itemsAr.filter((_, j) => j !== itemIdx),
    } : x));

  const addService = () =>
    setLocal(s => [...s, { titleEn: "New Service", titleAr: "خدمة جديدة", descEn: "", descAr: "", itemsEn: [], itemsAr: [], imageUrl: "" }]);

  const removeService = (idx: number) =>
    setLocal(s => s.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try { await onSave("services", local); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          {editing ? local.length : content.services.length} service{content.services.length !== 1 ? "s" : ""} — shown on the Services page and homepage.
        </p>
        {editing ? (
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={addService}>
              <Plus className="h-3.5 w-3.5 me-1.5" />Add Service
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}
              Save All Services
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="outline" onClick={() => { setLocal(content.services.map(s => ({ ...s, itemsEn: [...s.itemsEn], itemsAr: [...s.itemsAr] }))); setEditing(true); }}>
            <Pencil className="h-3.5 w-3.5 me-1.5" />Edit Services
          </Button>
        )}
      </div>

      {(editing ? local : content.services).map((svc, i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(open === i ? null : i)}>
                {svc.imageUrl && <img src={svc.imageUrl} alt="" className="h-10 w-14 object-cover rounded-md shrink-0" />}
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{svc.titleEn}</p>
                  <p className="text-xs text-muted-foreground truncate" dir="rtl">{svc.titleAr}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editing && (
                  <button
                    type="button"
                    onClick={() => removeService(i)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                    title="Remove this service"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button type="button" onClick={() => setOpen(open === i ? null : i)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {open === i ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </CardHeader>

          {open === i && (
            <CardContent className="space-y-4 pt-0">
              <Separator />
              {editing && (
                <ImageUploadField
                  label="Service Image"
                  value={svc.imageUrl}
                  onChange={url => updateService(i, { imageUrl: url })}
                />
              )}
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Title (English)</Label>
                  {editing
                    ? <Input value={svc.titleEn} onChange={e => updateService(i, { titleEn: e.target.value })} />
                    : <p className="text-sm">{svc.titleEn}</p>}</div>
                <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
                  {editing
                    ? <Input dir="rtl" value={svc.titleAr} onChange={e => updateService(i, { titleAr: e.target.value })} />
                    : <p className="text-sm" dir="rtl">{svc.titleAr}</p>}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Description (English)</Label>
                  {editing
                    ? <Textarea rows={3} value={svc.descEn} onChange={e => updateService(i, { descEn: e.target.value })} />
                    : <p className="text-sm text-muted-foreground">{svc.descEn}</p>}</div>
                <div><Label className="text-xs mb-1 block">الوصف (Arabic)</Label>
                  {editing
                    ? <Textarea dir="rtl" rows={3} value={svc.descAr} onChange={e => updateService(i, { descAr: e.target.value })} />
                    : <p className="text-sm text-muted-foreground" dir="rtl">{svc.descAr}</p>}</div>
              </div>

              <div>
                <Label className="text-xs mb-2 block">Feature Items (English / Arabic)</Label>
                <div className="space-y-2">
                  {svc.itemsEn.map((item, j) => (
                    <div key={j} className="flex gap-2 items-center">
                      {editing ? (
                        <>
                          <Input value={item} onChange={e => updateItem(i, j, e.target.value, "en")} placeholder="EN" className="h-8 text-sm flex-1" />
                          <Input dir="rtl" value={svc.itemsAr[j] ?? ""} onChange={e => updateItem(i, j, e.target.value, "ar")} placeholder="AR" className="h-8 text-sm flex-1" />
                          <button onClick={() => removeItem(i, j)} className="shrink-0 text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                        </>
                      ) : (
                        <div className="flex gap-3 text-sm">
                          <span className="text-muted-foreground">•</span>
                          <span>{item}</span>
                          <span className="text-muted-foreground/50">·</span>
                          <span className="text-muted-foreground/60" dir="rtl">{svc.itemsAr[j] ?? ""}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  {editing && (
                    <Button size="sm" variant="ghost" onClick={() => addItem(i)} className="h-7 text-xs">
                      <Plus className="h-3 w-3 me-1" />Add item
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

// ── Tab: Navigation & Footer ──────────────────────────────────────────────────

function NavigationTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const [navEditing, setNavEditing] = useState(false);
  const [navSaving, setNavSaving]   = useState(false);
  const [navLocal, setNavLocal]     = useState<NavItem[]>(content.nav);

  const [footerEditing, setFooterEditing] = useState(false);
  const [footerSaving, setFooterSaving]   = useState(false);
  const [footerLocal, setFooterLocal]     = useState<FooterContent>(content.footer);

  const saveNav = async () => {
    setNavSaving(true);
    try { await onSave("nav", navLocal); setNavEditing(false); }
    finally { setNavSaving(false); }
  };

  const saveFooter = async () => {
    setFooterSaving(true);
    try { await onSave("footer", footerLocal); setFooterEditing(false); }
    finally { setFooterSaving(false); }
  };

  return (
    <div className="space-y-4 mt-4">
      <SectionCard
        icon={<Navigation className="h-4 w-4" />}
        title="Navigation Menu Labels"
        description="Rename the top navigation items in English and Arabic"
        isEditing={navEditing} isSaving={navSaving}
        onEdit={() => { setNavLocal(content.nav.map(n => ({ ...n }))); setNavEditing(true); }}
        onSave={saveNav}
        onCancel={() => setNavEditing(false)}
        preview={
          <div className="flex flex-wrap gap-2">
            {content.nav.map(n => (
              <div key={n.href} className="flex items-center gap-1.5 px-3 py-1.5 bg-muted rounded-full">
                <span className="text-xs font-medium">{n.labelEn}</span>
                <span className="text-xs text-muted-foreground/40">·</span>
                <span className="text-xs text-muted-foreground" dir="rtl">{n.labelAr}</span>
              </div>
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {navLocal.map((item, i) => (
            <div key={item.href} className="grid grid-cols-3 gap-2 items-center p-2.5 border rounded-lg bg-muted/20">
              <div className="text-xs text-muted-foreground font-mono">{item.href}</div>
              <Input value={item.labelEn} onChange={e => setNavLocal(n => n.map((x, j) => j === i ? { ...x, labelEn: e.target.value } : x))} className="h-8 text-sm" placeholder="English label" />
              <Input dir="rtl" value={item.labelAr} onChange={e => setNavLocal(n => n.map((x, j) => j === i ? { ...x, labelAr: e.target.value } : x))} className="h-8 text-sm" placeholder="التسمية العربية" />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        icon={<AlignLeft className="h-4 w-4" />}
        title="Footer Description"
        description="Company description shown in the website footer"
        isEditing={footerEditing} isSaving={footerSaving}
        onEdit={() => { setFooterLocal({ ...content.footer }); setFooterEditing(true); }}
        onSave={saveFooter}
        onCancel={() => setFooterEditing(false)}
        preview={
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{content.footer.descriptionEn}</p>
            <p className="text-sm text-muted-foreground/60" dir="rtl">{content.footer.descriptionAr}</p>
          </div>
        }
      >
        <div className="space-y-3">
          <div><Label className="text-xs mb-1 block">Description (English)</Label>
            <Textarea rows={3} value={footerLocal.descriptionEn} onChange={e => setFooterLocal(f => ({ ...f, descriptionEn: e.target.value }))} /></div>
          <div><Label className="text-xs mb-1 block">الوصف (Arabic)</Label>
            <Textarea dir="rtl" rows={3} value={footerLocal.descriptionAr} onChange={e => setFooterLocal(f => ({ ...f, descriptionAr: e.target.value }))} /></div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Contact ──────────────────────────────────────────────────────────────

function ContactTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [local, setLocal]     = useState<ContactContent>(content.contact);

  const save = async () => {
    setSaving(true);
    try { await onSave("contact", local); setEditing(false); }
    finally { setSaving(false); }
  };

  const fields: { key: keyof ContactContent; label: string; placeholder: string; dir?: "rtl"; multiline?: boolean }[] = [
    { key: "phone",        label: "Main Phone",          placeholder: "+966 11 000 0000" },
    { key: "fax",          label: "Fax",                  placeholder: "+966 11 000 0001" },
    { key: "supportPhone", label: "Support Number",       placeholder: "9200 00000" },
    { key: "whatsapp",     label: "WhatsApp",             placeholder: "+966 50 000 0000" },
    { key: "email",        label: "General Email",        placeholder: "info@company.com" },
    { key: "salesEmail",   label: "Sales Email",          placeholder: "sales@company.com" },
    { key: "supportEmail", label: "Support Email",        placeholder: "support@company.com" },
    { key: "addressEn",    label: "Address (English)",    placeholder: "123 Street, City, Country", multiline: true },
    { key: "addressAr",    label: "Address (Arabic)",     placeholder: "الشارع، المدينة", dir: "rtl", multiline: true },
  ];

  return (
    <div className="space-y-4 mt-4">
      <SectionCard
        icon={<Phone className="h-4 w-4" />}
        title="Contact Information"
        description="Phone, email, and address shown on the contact page and footer"
        isEditing={editing} isSaving={saving}
        onEdit={() => { setLocal({ ...content.contact }); setEditing(true); }}
        onSave={save}
        onCancel={() => setEditing(false)}
        preview={
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              {[
                { icon: Phone, values: [content.contact.phone, content.contact.fax, content.contact.supportPhone].filter(Boolean) },
                { icon: MessageCircle, values: [content.contact.whatsapp].filter(Boolean) },
              ].map(({ icon: Icon, values }) => values.map((v, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0" /><span dir="ltr">{v}</span>
                </div>
              )))}
            </div>
            <div className="space-y-1.5">
              {[content.contact.email, content.contact.salesEmail, content.contact.supportEmail].filter(Boolean).map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3.5 w-3.5 shrink-0" /><span dir="ltr">{e}</span>
                </div>
              ))}
              {content.contact.addressEn && (
                <div className="flex items-start gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="whitespace-pre-line">{content.contact.addressEn}</span>
                </div>
              )}
            </div>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {fields.map(({ key, label, placeholder, dir, multiline }) => (
            <div key={key} className={multiline ? "md:col-span-2" : ""}>
              <Label className="text-xs mb-1 block">{label}</Label>
              {multiline
                ? <Textarea dir={dir} rows={3} value={local[key]} onChange={e => setLocal(c => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} />
                : <Input dir={dir} value={local[key]} onChange={e => setLocal(c => ({ ...c, [key]: e.target.value }))} placeholder={placeholder} />
              }
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: Listings Page ────────────────────────────────────────────────────────

function ListingsPageTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const defaultListings: ListingsPageContent = {
    pageTitleEn: "Property Listings", pageTitleAr: "العقارات",
    subtitleEn: "Discover our curated selection of properties.", subtitleAr: "اكتشف مجموعة عقاراتنا المختارة.",
    metaDescription: "Browse properties for sale, rent, and under professional management.",
  };
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [local, setLocal]     = useState<ListingsPageContent>(content.listingsPage ?? defaultListings);

  const startEdit = () => { setLocal({ ...(content.listingsPage ?? defaultListings) }); setEditing(true); };
  const cancel    = () => setEditing(false);
  const save      = async () => {
    setSaving(true);
    try { await onSave("listingsPage", local); setEditing(false); }
    finally { setSaving(false); }
  };

  const lp = content.listingsPage ?? defaultListings;

  return (
    <div className="space-y-4 mt-4">
      <SectionCard
        icon={<List className="h-4 w-4" />}
        title="Listings Page Header"
        description="Title, subtitle and SEO meta description shown on the /listings page"
        isEditing={editing} isSaving={saving}
        onEdit={startEdit} onSave={save} onCancel={cancel}
        preview={
          <div className="space-y-1.5">
            <p className="font-semibold">{lp.pageTitleEn}</p>
            <p className="text-sm text-muted-foreground" dir="rtl">{lp.pageTitleAr}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{lp.subtitleEn}</p>
            <p className="text-xs text-muted-foreground/50 mt-0.5" dir="rtl">{lp.subtitleAr}</p>
            <Badge variant="outline" className="text-xs mt-1">SEO: {lp.metaDescription.slice(0, 50)}…</Badge>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Page Title (English)</Label>
              <Input value={local.pageTitleEn} onChange={e => setLocal(l => ({ ...l, pageTitleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">عنوان الصفحة (Arabic)</Label>
              <Input dir="rtl" value={local.pageTitleAr} onChange={e => setLocal(l => ({ ...l, pageTitleAr: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Subtitle (English)</Label>
              <Textarea rows={2} value={local.subtitleEn} onChange={e => setLocal(l => ({ ...l, subtitleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">العنوان الفرعي (Arabic)</Label>
              <Textarea dir="rtl" rows={2} value={local.subtitleAr} onChange={e => setLocal(l => ({ ...l, subtitleAr: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs mb-1 block">SEO Meta Description (English)</Label>
            <Textarea rows={2} value={local.metaDescription} onChange={e => setLocal(l => ({ ...l, metaDescription: e.target.value }))} placeholder="Short description for search engines (150–160 chars recommended)" />
            <p className="text-xs text-muted-foreground mt-1">{local.metaDescription.length} / 160 chars</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Tab: More (About + Announcements) ────────────────────────────────────────

function MiscTab({ content, onSave }: { content: SiteContent; onSave: (s: string, d: unknown) => Promise<void> }) {
  const imgRef = useRef<HTMLInputElement>(null);

  const [aboutEditing, setAboutEditing] = useState(false);
  const [aboutSaving, setAboutSaving]   = useState(false);
  const [aboutLocal, setAboutLocal]     = useState<AboutContent>(content.about);
  const [imgUploading, setImgUploading] = useState(false);

  const [annEditing, setAnnEditing] = useState(false);
  const [annSaving, setAnnSaving]   = useState(false);
  const [annLocal, setAnnLocal]     = useState<Announcement[]>(content.announcements);
  const [newAnn, setNewAnn]         = useState("");
  const { toast } = useToast();

  const saveAbout = async () => {
    setAboutSaving(true);
    try { await onSave("about", aboutLocal); setAboutEditing(false); }
    finally { setAboutSaving(false); }
  };

  const saveAnn = async () => {
    setAnnSaving(true);
    try { await onSave("announcements", annLocal); setAnnEditing(false); }
    finally { setAnnSaving(false); }
  };

  const handleImgUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setImgUploading(true);
    try {
      const url = await uploadImage(files[0]);
      setAboutLocal(a => ({ ...a, imageUrl: url }));
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setImgUploading(false);
    }
  };

  return (
    <div className="space-y-4 mt-4">
      <SectionCard
        icon={<Layers className="h-4 w-4" />}
        title="About Us Section"
        description="Company description used in various portal sections"
        isEditing={aboutEditing} isSaving={aboutSaving}
        onEdit={() => { setAboutLocal({ ...content.about }); setAboutEditing(true); }}
        onSave={saveAbout}
        onCancel={() => setAboutEditing(false)}
        preview={
          <div className="space-y-2">
            {content.about.imageUrl && <img src={content.about.imageUrl} alt="" className="h-20 w-full object-cover rounded-md" />}
            <p className="font-medium text-sm">{content.about.titleEn}</p>
            {content.about.body && <p className="text-sm text-muted-foreground line-clamp-3">{content.about.body}</p>}
            {!content.about.body && <p className="text-sm text-muted-foreground italic">No description yet.</p>}
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <Label className="text-xs mb-1.5 block">Section Image</Label>
            <div className="flex gap-2 items-center">
              {aboutLocal.imageUrl && <img src={aboutLocal.imageUrl} alt="" className="h-14 w-20 object-cover rounded-md" />}
              <Button size="sm" variant="outline" onClick={() => imgRef.current?.click()} disabled={imgUploading}>
                {imgUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                {aboutLocal.imageUrl ? "Replace" : "Upload Image"}
              </Button>
              <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={e => handleImgUpload(e.target.files)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label className="text-xs mb-1 block">Title (English)</Label>
              <Input value={aboutLocal.titleEn} onChange={e => setAboutLocal(a => ({ ...a, titleEn: e.target.value }))} /></div>
            <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
              <Input dir="rtl" value={aboutLocal.titleAr} onChange={e => setAboutLocal(a => ({ ...a, titleAr: e.target.value }))} /></div>
          </div>
          <div><Label className="text-xs mb-1 block">Body Text (English)</Label>
            <Textarea rows={5} value={aboutLocal.body} onChange={e => setAboutLocal(a => ({ ...a, body: e.target.value }))} placeholder="Describe your company…" /></div>
        </div>
      </SectionCard>

      <SectionCard
        icon={<Megaphone className="h-4 w-4" />}
        title="Announcements"
        description="Notices shown to visitors on the portal"
        isEditing={annEditing} isSaving={annSaving}
        onEdit={() => { setAnnLocal(content.announcements.map(a => ({ ...a }))); setAnnEditing(true); }}
        onSave={saveAnn}
        onCancel={() => setAnnEditing(false)}
        preview={
          <div className="space-y-1">
            {content.announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
            {content.announcements.map(a => (
              <div key={a.id} className="flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", a.isActive ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                <span className={cn("text-sm", !a.isActive && "line-through text-muted-foreground")}>{a.text}</span>
              </div>
            ))}
          </div>
        }
      >
        <div className="space-y-2">
          {annLocal.map((a, i) => (
            <div key={a.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Switch checked={a.isActive} onCheckedChange={v => setAnnLocal(p => p.map((x, j) => j === i ? { ...x, isActive: v } : x))} />
              <span className="text-sm flex-1">{a.text}</span>
              <button onClick={() => setAnnLocal(p => p.filter((_, j) => j !== i))}>
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <Input value={newAnn} onChange={e => setNewAnn(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && newAnn.trim()) { setAnnLocal(p => [...p, { id: Date.now().toString(), text: newAnn.trim(), isActive: true }]); setNewAnn(""); } }}
              placeholder="New announcement…" className="h-8 text-sm" />
            <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newAnn.trim()) { setAnnLocal(p => [...p, { id: Date.now().toString(), text: newAnn.trim(), isActive: true }]); setNewAnn(""); } }}>
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function WebsiteSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const q = useQuery<{ content: SiteContent }>({
    queryKey: ["cms-site-content-ws"],
    queryFn: () => apiFetch("/realestate-api/cms/site-content"),
  });

  const saveMutation = useMutation({
    mutationFn: ({ section, data }: { section: string; data: unknown }) =>
      apiFetch(`/realestate-api/cms/site-content/${section}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, { section }) => {
      toast({ title: "Saved!", description: `${section} updated and live on the website.` });
      qc.invalidateQueries({ queryKey: ["cms-site-content-ws"] });
      qc.invalidateQueries({ queryKey: ["cms-site-content"] });
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const handleSave = useCallback(async (section: string, data: unknown) => {
    await saveMutation.mutateAsync({ section, data });
  }, [saveMutation]);

  if (q.isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading website content…
      </div>
    );
  }

  const content = q.data?.content;
  if (!content) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground">
        <p>Failed to load content. <Button variant="link" onClick={() => qc.invalidateQueries({ queryKey: ["cms-site-content-ws"] })}>Retry</Button></p>
      </div>
    );
  }

  const portalDomain = window.location.origin;
  const basePath = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <Monitor className="h-6 w-6 text-primary" />
            Website Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Every change goes live instantly on the public website — no code needed.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline" size="sm"
            onClick={() => qc.invalidateQueries({ queryKey: ["cms-site-content-ws"] })}
          >
            <RefreshCw className="h-3.5 w-3.5 me-1.5" />Refresh
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="brand">
        <TabsList className="flex flex-wrap h-auto gap-1 w-full sm:w-auto">
          <TabsTrigger value="brand" className="gap-1.5">
            <Building className="h-3.5 w-3.5" />Brand
          </TabsTrigger>
          <TabsTrigger value="home" className="gap-1.5">
            <ImageIcon className="h-3.5 w-3.5" />Home Page
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />Services
          </TabsTrigger>
          <TabsTrigger value="nav" className="gap-1.5">
            <Navigation className="h-3.5 w-3.5" />Navigation
          </TabsTrigger>
          <TabsTrigger value="contact" className="gap-1.5">
            <Phone className="h-3.5 w-3.5" />Contact
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5">
            <List className="h-3.5 w-3.5" />Listings
          </TabsTrigger>
          <TabsTrigger value="misc" className="gap-1.5">
            <AlignLeft className="h-3.5 w-3.5" />More
          </TabsTrigger>
        </TabsList>

        <TabsContent value="brand">
          <BrandTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="home">
          <HomeTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="services">
          <ServicesTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="nav">
          <NavigationTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="contact">
          <ContactTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="listings">
          <ListingsPageTab content={content} onSave={handleSave} />
        </TabsContent>
        <TabsContent value="misc">
          <MiscTab content={content} onSave={handleSave} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
