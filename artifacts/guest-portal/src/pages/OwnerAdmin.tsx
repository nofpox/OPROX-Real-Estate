import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Monitor, Upload, Loader2, Save, Pencil, X, Plus, Trash2,
  Check, LogOut, Globe, Phone, Mail, MapPin, Image as ImageIcon,
  Building, ChevronRight, Settings2, Zap, Droplets, Wind, Brush,
  Wrench, Volume2, DoorOpen, Key, Wifi, Car, Thermometer, Shield,
  Coffee, Package, Camera, Utensils, Trees, Bell, User, Lock,
  Bot, Send, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────

interface SessionUser {
  id: number;
  username: string;
  role: string;
  displayName: string;
  tenantId: number | null;
}

interface BrandingContent {
  companyNameEn: string; companyNameAr: string;
  taglineEn: string;    taglineAr: string;
  logoUrl: string;
}
interface HeroContent {
  titleEn: string;     titleAr: string;
  subtitleEn: string;  subtitleAr: string;
  ctaButtonEn: string; ctaButtonAr: string;
  imageUrl: string;
}
interface ContactContent {
  email: string;       salesEmail: string;
  supportEmail: string; phone: string;
  whatsapp: string;    addressEn: string;
  addressAr: string;
}
interface Announcement { id: string; text: string; isActive: boolean; }
interface SiteContent {
  branding: BrandingContent;
  hero: HeroContent;
  contact: ContactContent;
  announcements: Announcement[];
}
interface ServiceCategory {
  id: number; slug: string; labelEn: string;
  labelAr: string | null; icon: string; color: string;
  isActive: boolean; sortOrder: number;
}

// ── API helpers ────────────────────────────────────────────────────────────────

const apiFetch = async <T,>(url: string, opts?: RequestInit): Promise<T> => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText })) as { error?: string };
    throw new Error(body.error ?? res.statusText);
  }
  return res.json() as Promise<T>;
};

async function uploadImageFile(file: File): Promise<string> {
  const { uploadURL, objectPath } = await apiFetch<{ uploadURL: string; objectPath: string }>(
    "/api/storage/uploads/request-url",
    { method: "POST", body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) }
  );
  const r = await fetch(uploadURL, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
  if (!r.ok) throw new Error("Upload to storage failed");
  return `/api/storage${objectPath}`;
}

function isOwnerRole(role: string) {
  return role === "owner" || role === "super_admin" || role === "admin";
}

// ── Shared components ──────────────────────────────────────────────────────────

function ImageUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleFile = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(files[0]);
      onChange(url);
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally { setUploading(false); }
  };

  return (
    <div>
      <Label className="text-xs mb-1.5 block">{label}</Label>
      <div className="flex items-center gap-3">
        {value ? (
          <div className="relative group h-16 w-24 rounded-md overflow-hidden border shrink-0">
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button onClick={() => onChange("")}
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        ) : (
          <div className="h-16 w-24 rounded-md border-2 border-dashed flex items-center justify-center shrink-0 bg-slate-50">
            <ImageIcon className="h-5 w-5 text-slate-300" />
          </div>
        )}
        <div className="space-y-1.5">
          <Button size="sm" variant="outline" onClick={() => ref.current?.click()} disabled={uploading} className="h-8">
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
            {value ? "Replace" : "Upload Image"}
          </Button>
          {value && <p className="text-[10px] text-slate-400 truncate max-w-[160px]">{value.split("/").pop()}</p>}
        </div>
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => handleFile(e.target.files)} />
      </div>
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function SectionHeader({ icon, title, saved, saving, onSave }: {
  icon: React.ReactNode; title: string; saved?: boolean; saving: boolean; onSave: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2 text-slate-700">
        {icon}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      <Button size="sm" onClick={onSave} disabled={saving} className="h-8 bg-amber-500 hover:bg-amber-600 text-white">
        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5 me-1" /> : <Save className="h-3.5 w-3.5 me-1" />}
        {saved ? "Saved!" : "Save"}
      </Button>
    </div>
  );
}

// ── Login Screen ───────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (user: SessionUser) => void }) {
  const [form, setForm] = useState({ username: "", password: "", tenantSlug: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const body: Record<string, string> = { username: form.username, password: form.password };
      if (form.tenantSlug.trim()) body.tenantSlug = form.tenantSlug.trim();
      const data = await apiFetch<{ user: SessionUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!isOwnerRole(data.user.role)) {
        await apiFetch("/api/auth/logout", { method: "POST" });
        setError("Access denied. This control panel is restricted to Owner accounts.");
        setLoading(false);
        return;
      }
      toast({ title: `Welcome, ${data.user.displayName}` });
      onLogin(data.user);
    } catch (err) {
      setError((err as Error).message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-0 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex flex-col items-center gap-3 mb-1">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <Monitor className="text-white" size={22} />
            </div>
            <div className="text-center">
              <CardTitle className="text-xl">Website Control Panel</CardTitle>
              <p className="text-xs text-slate-500 mt-0.5">Owner access only</p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-3">
            <FieldRow label="Username">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  className="pl-9" placeholder="Enter username" value={form.username}
                  onChange={(e) => setForm(f => ({ ...f, username: e.target.value }))} required
                />
              </div>
            </FieldRow>
            <FieldRow label="Password">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  type="password" className="pl-9" placeholder="Enter password" value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} required
                />
              </div>
            </FieldRow>
            <FieldRow label="Tenant slug (optional)">
              <Input
                placeholder="e.g. grand-hotel" value={form.tenantSlug}
                onChange={(e) => setForm(f => ({ ...f, tenantSlug: e.target.value }))}
              />
            </FieldRow>
            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
            <Button type="submit" className="w-full bg-amber-500 hover:bg-amber-600 text-white h-11" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin me-2" /> : null}
              Sign in as Owner
            </Button>
          </form>
          <p className="text-center text-xs text-slate-400 mt-4">
            <a href="/" className="hover:text-slate-600 underline-offset-2 hover:underline">
              ← Back to website
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Brand Tab ──────────────────────────────────────────────────────────────────

function BrandTab({ initial }: { initial: BrandingContent }) {
  const [data, setData] = useState<BrandingContent>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const set = (k: keyof BrandingContent) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/cms/site-content/branding", { method: "PUT", body: JSON.stringify(data) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast({ title: "Branding saved" });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader icon={<Building size={16} />} title="Brand Identity" saved={saved} saving={saving} onSave={handleSave} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Company Name (English)">
          <Input value={data.companyNameEn} onChange={set("companyNameEn")} />
        </FieldRow>
        <FieldRow label="Company Name (Arabic)">
          <Input dir="rtl" value={data.companyNameAr} onChange={set("companyNameAr")} />
        </FieldRow>
        <FieldRow label="Tagline (English)">
          <Input value={data.taglineEn} onChange={set("taglineEn")} />
        </FieldRow>
        <FieldRow label="Tagline (Arabic)">
          <Input dir="rtl" value={data.taglineAr} onChange={set("taglineAr")} />
        </FieldRow>
      </div>
      <div className="mt-4">
        <ImageUploadField label="Company Logo" value={data.logoUrl} onChange={(url) => setData(d => ({ ...d, logoUrl: url }))} />
      </div>
    </div>
  );
}

// ── Hero Tab ───────────────────────────────────────────────────────────────────

function HeroTab({ initial }: { initial: HeroContent }) {
  const [data, setData] = useState<HeroContent>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const set = (k: keyof HeroContent) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/cms/site-content/hero", { method: "PUT", body: JSON.stringify(data) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast({ title: "Hero section saved" });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader icon={<Globe size={16} />} title="Hero Section" saved={saved} saving={saving} onSave={handleSave} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Title (English)">
          <Input value={data.titleEn} onChange={set("titleEn")} />
        </FieldRow>
        <FieldRow label="Title (Arabic)">
          <Input dir="rtl" value={data.titleAr} onChange={set("titleAr")} />
        </FieldRow>
        <FieldRow label="Subtitle (English)">
          <Input value={data.subtitleEn} onChange={set("subtitleEn")} />
        </FieldRow>
        <FieldRow label="Subtitle (Arabic)">
          <Input dir="rtl" value={data.subtitleAr} onChange={set("subtitleAr")} />
        </FieldRow>
        <FieldRow label="CTA Button (English)">
          <Input value={data.ctaButtonEn} onChange={set("ctaButtonEn")} />
        </FieldRow>
        <FieldRow label="CTA Button (Arabic)">
          <Input dir="rtl" value={data.ctaButtonAr} onChange={set("ctaButtonAr")} />
        </FieldRow>
      </div>
      <div className="mt-4">
        <ImageUploadField label="Hero Banner Image" value={data.imageUrl} onChange={(url) => setData(d => ({ ...d, imageUrl: url }))} />
      </div>
    </div>
  );
}

// ── Announcements Tab ──────────────────────────────────────────────────────────

function AnnouncementsTab({ initial }: { initial: Announcement[] }) {
  const [items, setItems] = useState<Announcement[]>(initial);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const add = () => {
    if (!newText.trim()) return;
    setItems(a => [...a, { id: `ann-${Date.now()}`, text: newText.trim(), isActive: true }]);
    setNewText("");
  };

  const toggle = (id: string) => setItems(a => a.map(x => x.id === id ? { ...x, isActive: !x.isActive } : x));
  const remove = (id: string) => setItems(a => a.filter(x => x.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/cms/site-content/announcements", { method: "PUT", body: JSON.stringify(items) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast({ title: "Announcements saved" });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader icon={<Bell size={16} />} title="Announcements" saved={saved} saving={saving} onSave={handleSave} />

      <div className="flex gap-2 mb-4">
        <Input
          placeholder="New announcement text…" value={newText}
          onChange={(e) => setNewText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button variant="outline" size="sm" onClick={add} className="shrink-0 h-10">
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No announcements yet</p>
      ) : (
        <div className="space-y-2">
          {items.map((ann) => (
            <div key={ann.id} className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5", !ann.isActive && "opacity-50")}>
              <Switch checked={ann.isActive} onCheckedChange={() => toggle(ann.id)} className="mt-0.5 shrink-0" />
              <span className="flex-1 text-sm leading-snug">{ann.text}</span>
              <button onClick={() => remove(ann.id)} className="text-slate-400 hover:text-red-500 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Contact Tab ────────────────────────────────────────────────────────────────

function ContactTab({ initial }: { initial: ContactContent }) {
  const [data, setData] = useState<ContactContent>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { toast } = useToast();

  const set = (k: keyof ContactContent) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setData(d => ({ ...d, [k]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiFetch("/api/cms/site-content/contact", { method: "PUT", body: JSON.stringify(data) });
      setSaved(true); setTimeout(() => setSaved(false), 2000);
      toast({ title: "Contact info saved" });
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div>
      <SectionHeader icon={<Phone size={16} />} title="Contact Information" saved={saved} saving={saving} onSave={handleSave} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FieldRow label="Main Email">
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" type="email" value={data.email} onChange={set("email")} /></div>
        </FieldRow>
        <FieldRow label="Sales Email">
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" type="email" value={data.salesEmail} onChange={set("salesEmail")} /></div>
        </FieldRow>
        <FieldRow label="Support Email">
          <div className="relative"><Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" type="email" value={data.supportEmail} onChange={set("supportEmail")} /></div>
        </FieldRow>
        <FieldRow label="Main Phone">
          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" value={data.phone} onChange={set("phone")} /></div>
        </FieldRow>
        <FieldRow label="WhatsApp">
          <div className="relative"><Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" value={data.whatsapp} onChange={set("whatsapp")} /></div>
        </FieldRow>
        <FieldRow label="Address (English)">
          <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" value={data.addressEn} onChange={set("addressEn")} /></div>
        </FieldRow>
        <FieldRow label="Address (Arabic)" >
          <div className="relative"><MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input className="pl-8" dir="rtl" value={data.addressAr} onChange={set("addressAr")} /></div>
        </FieldRow>
      </div>
    </div>
  );
}

// ── Services Tab ───────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  zap: Zap, droplets: Droplets, wind: Wind, brush: Brush, wrench: Wrench,
  "volume-2": Volume2, "door-open": DoorOpen, key: Key, wifi: Wifi, car: Car,
  thermometer: Thermometer, "trash-2": Trash2, shield: Shield, coffee: Coffee,
  package: Package, phone: Phone, camera: Camera, utensils: Utensils, trees: Trees,
};

const ICON_OPTIONS = Object.keys(ICON_MAP).map(slug => ({ slug, label: slug.replace(/-/g, " ") }));
const COLOR_OPTIONS = [
  { slug: "yellow", cls: "bg-yellow-500" }, { slug: "blue", cls: "bg-blue-500" },
  { slug: "green", cls: "bg-green-500" },   { slug: "red", cls: "bg-red-500" },
  { slug: "purple", cls: "bg-purple-500" }, { slug: "orange", cls: "bg-orange-500" },
  { slug: "pink", cls: "bg-pink-500" },     { slug: "indigo", cls: "bg-indigo-500" },
  { slug: "teal", cls: "bg-teal-500" },     { slug: "cyan", cls: "bg-cyan-500" },
];

function CategoryIcon({ icon, color }: { icon: string; color: string }) {
  const Icon = ICON_MAP[icon] ?? Wrench;
  const col = COLOR_OPTIONS.find(c => c.slug === color);
  return (
    <div className={cn("w-8 h-8 rounded-md flex items-center justify-center shrink-0", col?.cls ?? "bg-slate-400")}>
      <Icon size={14} className="text-white" />
    </div>
  );
}

function ServicesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [form, setForm] = useState({ labelEn: "", labelAr: "", icon: "wrench", color: "blue", isActive: true });
  const [isNew, setIsNew] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const { data: categories = [], isLoading } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories"],
    queryFn: () => apiFetch("/api/service-categories"),
  });

  const openNew = () => {
    setForm({ labelEn: "", labelAr: "", icon: "wrench", color: "blue", isActive: true });
    setEditing(null); setIsNew(true);
  };

  const openEdit = (cat: ServiceCategory) => {
    setForm({ labelEn: cat.labelEn, labelAr: cat.labelAr ?? "", icon: cat.icon, color: cat.color, isActive: cat.isActive });
    setEditing(cat); setIsNew(false);
  };

  const closeForm = () => { setEditing(null); setIsNew(false); };

  const handleSave = async () => {
    if (!form.labelEn.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isNew) {
        await apiFetch("/api/service-categories", {
          method: "POST",
          body: JSON.stringify({ ...form, slug: form.labelEn.toLowerCase().replace(/\s+/g, "-") }),
        });
      } else if (editing) {
        await apiFetch(`/api/service-categories/${editing.id}`, { method: "PATCH", body: JSON.stringify(form) });
      }
      await qc.invalidateQueries({ queryKey: ["service-categories"] });
      toast({ title: isNew ? "Service category created" : "Service category updated" });
      closeForm();
    } catch (err) {
      toast({ title: "Save failed", description: (err as Error).message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    setDeleting(id);
    try {
      await apiFetch(`/api/service-categories/${id}`, { method: "DELETE" });
      await qc.invalidateQueries({ queryKey: ["service-categories"] });
      toast({ title: "Category deleted" });
    } catch (err) {
      toast({ title: "Delete failed", description: (err as Error).message, variant: "destructive" });
    } finally { setDeleting(null); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Settings2 size={16} />
          <span className="font-semibold text-sm">Service Categories</span>
        </div>
        <Button size="sm" variant="outline" onClick={openNew} className="h-8">
          <Plus className="h-3.5 w-3.5 me-1" /> Add Category
        </Button>
      </div>

      {(isNew || editing) && (
        <Card className="mb-4 border-amber-200 bg-amber-50/40">
          <CardContent className="pt-4 pb-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Name (English)">
                <Input value={form.labelEn} onChange={(e) => setForm(f => ({ ...f, labelEn: e.target.value }))} />
              </FieldRow>
              <FieldRow label="Name (Arabic)">
                <Input dir="rtl" value={form.labelAr} onChange={(e) => setForm(f => ({ ...f, labelAr: e.target.value }))} />
              </FieldRow>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Icon">
                <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(o => {
                      const Icon = ICON_MAP[o.slug] ?? Wrench;
                      return (
                        <SelectItem key={o.slug} value={o.slug}>
                          <span className="flex items-center gap-2"><Icon size={13} /> {o.label}</span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </FieldRow>
              <FieldRow label="Color">
                <Select value={form.color} onValueChange={(v) => setForm(f => ({ ...f, color: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(c => (
                      <SelectItem key={c.slug} value={c.slug}>
                        <span className="flex items-center gap-2">
                          <span className={cn("w-3 h-3 rounded-full inline-block", c.cls)} /> {c.slug}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldRow>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm(f => ({ ...f, isActive: v }))} />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white h-8" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}
                {isNew ? "Create" : "Update"}
              </Button>
              <Button size="sm" variant="ghost" className="h-8" onClick={closeForm}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
      ) : categories.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-6">No service categories yet</p>
      ) : (
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5 bg-white">
              <CategoryIcon icon={cat.icon} color={cat.color} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-none">{cat.labelEn}</p>
                {cat.labelAr && <p className="text-xs text-slate-400 mt-0.5" dir="rtl">{cat.labelAr}</p>}
              </div>
              {!cat.isActive && <Badge variant="outline" className="text-xs shrink-0">Inactive</Badge>}
              <div className="flex gap-1 shrink-0">
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
                  <Pencil size={13} />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(cat.id)} disabled={deleting === cat.id}>
                  {deleting === cat.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Platform AI Tab ────────────────────────────────────────────────────────────

interface ChatMessage { role: "user" | "assistant"; content: string; }

function PlatformAITab() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [convId, setConvId] = useState<number | null>(null);
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
    queryKey: ["platform-ai-stats"],
    queryFn: async () => {
      const [props, staff, wos, bookings] = await Promise.all([
        fetch("/api/properties").then(r => r.json()),
        fetch("/api/staff").then(r => r.json()),
        fetch("/api/work-orders?status=open").then(r => r.json()),
        fetch("/api/bookings?status=checked-in").then(r => r.json()),
      ]);
      return {
        propertyCount: Array.isArray(props) ? props.length : 0,
        staffCount: Array.isArray(staff) ? staff.length : 0,
        openWorkOrders: Array.isArray(wos) ? wos.length : 0,
        bookingCount: Array.isArray(bookings) ? bookings.length : 0,
      };
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streaming]);

  async function ensureConversation(): Promise<number> {
    if (convId) return convId;
    const res = await fetch("/api/openai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Platform Admin Chat", agentType: "platform" }),
    });
    const conv = await res.json() as { id: number };
    setConvId(conv.id);
    return conv.id;
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: text }]);
    setStreaming(true);

    const id = await ensureConversation();
    const context = {
      propertyCount: stats?.propertyCount,
      staffCount: stats?.staffCount,
      openWorkOrders: stats?.openWorkOrders,
      bookingCount: stats?.bookingCount,
    };

    let draft = "";
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);

    const res = await fetch(`/api/openai/conversations/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: text, context }),
    });

    if (!res.body) { setStreaming(false); return; }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split("\n").filter(l => l.startsWith("data:"));
      for (const line of lines) {
        try {
          const parsed = JSON.parse(line.slice(5)) as { content?: string; done?: boolean; error?: string };
          if (parsed.content) {
            draft += parsed.content;
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = { role: "assistant", content: draft };
              return next;
            });
          }
        } catch { /* skip */ }
      }
    }
    setStreaming(false);
  }

  const SUGGESTED = [
    "Summarise today's occupancy across all properties",
    "Which open work orders are overdue?",
    "How is staff workload distributed this week?",
    "Give me a revenue snapshot for this month",
  ];

  return (
    <Card className="border-slate-200">
      <CardHeader className="pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-slate-900">
            <Bot size={16} className="text-white" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold text-slate-800">Platform AI Assistant</CardTitle>
            <p className="text-xs text-slate-500 mt-0.5">
              Full-platform diagnostics · {stats ? `${stats.propertyCount} properties · ${stats.staffCount} staff · ${stats.openWorkOrders} open work orders` : "Loading snapshot…"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Message area */}
        <div className="h-80 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="p-3 rounded-2xl bg-slate-100">
                <Sparkles size={20} className="text-slate-500" />
              </div>
              <p className="text-xs text-slate-500 text-center max-w-48">
                Ask anything about your platform — operations, staff, finances, or system health.
              </p>
              <div className="grid grid-cols-1 gap-1.5 w-full">
                {SUGGESTED.map(s => (
                  <button
                    key={s}
                    onClick={() => { setInput(s); }}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2", m.role === "user" ? "justify-end" : "justify-start")}>
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded-full bg-slate-900 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-white" />
                  </div>
                )}
                <div className={cn(
                  "max-w-[80%] text-xs px-3 py-2 rounded-2xl whitespace-pre-wrap leading-relaxed",
                  m.role === "user"
                    ? "bg-slate-900 text-white rounded-br-sm"
                    : "bg-slate-100 text-slate-800 rounded-bl-sm"
                )}>
                  {m.content || (streaming && i === messages.length - 1 ? (
                    <span className="inline-flex gap-0.5">
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </span>
                  ) : "")}
                </div>
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t border-slate-100 px-3 py-2 flex gap-2 items-end">
          <textarea
            className="flex-1 resize-none text-xs bg-transparent outline-none placeholder:text-slate-400 py-1.5 max-h-24 min-h-[32px]"
            rows={1}
            placeholder="Ask the platform agent…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            disabled={streaming}
          />
          <button
            onClick={send}
            disabled={!input.trim() || streaming}
            className="p-1.5 rounded-lg bg-slate-900 text-white disabled:opacity-40 hover:bg-slate-700 transition-colors flex-shrink-0"
          >
            <Send size={13} />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main OwnerAdmin Component ──────────────────────────────────────────────────

export default function OwnerAdmin() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const { toast } = useToast();

  const { data: siteContent, isLoading: contentLoading } = useQuery<SiteContent>({
    queryKey: ["owner-site-content"],
    queryFn: () => apiFetch("/api/cms/site-content"),
    enabled: !!sessionUser,
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { user?: SessionUser } | null) => {
        const u = d?.user ?? null;
        if (u && isOwnerRole(u.role)) setSessionUser(u);
      })
      .catch(() => {})
      .finally(() => setSessionLoading(false));
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch {}
    setSessionUser(null);
    toast({ title: "Signed out" });
  }, [toast]);

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!sessionUser) {
    return <LoginScreen onLogin={setSessionUser} />;
  }

  const defaultBranding: BrandingContent = { companyNameEn: "", companyNameAr: "", taglineEn: "", taglineAr: "", logoUrl: "" };
  const defaultHero: HeroContent = { titleEn: "", titleAr: "", subtitleEn: "", subtitleAr: "", ctaButtonEn: "", ctaButtonAr: "", imageUrl: "" };
  const defaultContact: ContactContent = { email: "", salesEmail: "", supportEmail: "", phone: "", whatsapp: "", addressEn: "", addressAr: "" };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between sticky top-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center shrink-0">
            <Monitor size={15} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Website Control Panel</p>
            <p className="text-xs text-slate-400 mt-0.5">Owner · {sessionUser.displayName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href="/" target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white h-8 text-xs">
              <Globe size={13} className="me-1" /> View Site
            </Button>
          </a>
          <Button size="sm" variant="ghost" className="text-slate-300 hover:text-red-400 h-8 text-xs" onClick={handleLogout}>
            <LogOut size={13} className="me-1" /> Sign Out
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-6">
        {contentLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
          </div>
        ) : (
          <Tabs defaultValue="brand">
            <TabsList className="w-full grid grid-cols-6 mb-6 h-10">
              <TabsTrigger value="brand" className="text-xs">Brand</TabsTrigger>
              <TabsTrigger value="hero" className="text-xs">Hero</TabsTrigger>
              <TabsTrigger value="announce" className="text-xs">Announce</TabsTrigger>
              <TabsTrigger value="contact" className="text-xs">Contact</TabsTrigger>
              <TabsTrigger value="services" className="text-xs">Services</TabsTrigger>
              <TabsTrigger value="ai" className="text-xs flex items-center gap-1">
                <Sparkles size={11} />AI
              </TabsTrigger>
            </TabsList>

            <TabsContent value="brand">
              <Card><CardContent className="pt-5">
                <BrandTab initial={siteContent?.branding ?? defaultBranding} />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="hero">
              <Card><CardContent className="pt-5">
                <HeroTab initial={siteContent?.hero ?? defaultHero} />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="announce">
              <Card><CardContent className="pt-5">
                <AnnouncementsTab initial={siteContent?.announcements ?? []} />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="contact">
              <Card><CardContent className="pt-5">
                <ContactTab initial={siteContent?.contact ?? defaultContact} />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="services">
              <Card><CardContent className="pt-5">
                <ServicesTab />
              </CardContent></Card>
            </TabsContent>

            <TabsContent value="ai">
              <PlatformAITab />
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
