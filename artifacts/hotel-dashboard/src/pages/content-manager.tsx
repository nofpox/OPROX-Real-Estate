import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutTemplate, Plus, Pencil, Trash2, Save, X, Upload, ImageOff,
  Building2, Home, Warehouse, Store, Briefcase, Landmark, Loader2,
  Globe, Phone, Mail, MessageCircle, MapPin, Megaphone, RefreshCw, Check,
  BarChart2, Layers, Palette,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PropertyCategory {
  id: number;
  slug: string;
  labelEn: string;
  labelAr: string | null;
  icon: string;
  color: string;
  isActive: boolean;
  sortOrder: number;
}

interface MediaItem { url: string; caption: string; }
interface AdminListing {
  id: number;
  title: string;
  description: string | null;
  propertyType: string | null;
  listingType: string;
  status: string;
  price: number | null;
  currency: string | null;
  areaSqm: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  amenities: string[];
  media: MediaItem[];
  updatedAt: string;
}

interface HeroContent     { titleEn: string; titleAr: string; subtitleEn: string; subtitleAr: string; imageUrl: string; }
interface ContactContent  { email: string; phone: string; whatsapp: string; address: string; }
interface Announcement   { id: string; text: string; isActive: boolean; }
interface BrandingContent    { companyNameEn: string; companyNameAr: string; taglineEn: string; taglineAr: string; logoUrl: string; }
interface StatItem           { value: string; labelEn: string; labelAr: string; liveKey: string | null; }
interface ServiceItem        { titleEn: string; titleAr: string; descEn: string; descAr: string; imageUrl: string; }
interface LeadEmailTemplate  { subject: string; intro: string; mapsUrl: string; bccEmail: string; }
interface SiteContent {
  hero: HeroContent;
  contact: ContactContent;
  announcements: Announcement[];
  about: { titleEn: string; titleAr: string; body: string; imageUrl: string };
  branding: BrandingContent;
  stats: StatItem[];
  services: ServiceItem[];
  leadEmail: LeadEmailTemplate;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const apiFetch = async <T,>(url: string, opts?: RequestInit): Promise<T> => {
  const res = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
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

const ICON_OPTIONS = [
  { value: "building-2", label: "Building", Icon: Building2 },
  { value: "home",       label: "Home",     Icon: Home },
  { value: "warehouse",  label: "Warehouse",Icon: Warehouse },
  { value: "store",      label: "Store",    Icon: Store },
  { value: "briefcase",  label: "Office",   Icon: Briefcase },
  { value: "landmark",   label: "Villa",    Icon: Landmark },
];

const COLOR_OPTIONS = [
  { value: "blue",   cls: "bg-blue-500" },
  { value: "green",  cls: "bg-green-500" },
  { value: "orange", cls: "bg-orange-500" },
  { value: "purple", cls: "bg-purple-500" },
  { value: "red",    cls: "bg-red-500" },
  { value: "amber",  cls: "bg-amber-500" },
  { value: "slate",  cls: "bg-slate-500" },
  { value: "pink",   cls: "bg-pink-500" },
];

function colorClass(c: string) {
  return COLOR_OPTIONS.find(o => o.value === c)?.cls ?? "bg-slate-400";
}

function IconComp({ name, className }: { name: string; className?: string }) {
  const opt = ICON_OPTIONS.find(o => o.value === name);
  if (!opt) return <Building2 className={className} />;
  return <opt.Icon className={className} />;
}

// ─── TAB 1: Property Types ────────────────────────────────────────────────────

function PropertyTypesTab() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [dialog, setDialog] = useState<"add" | "edit" | "delete" | null>(null);
  const [selected, setSelected] = useState<PropertyCategory | null>(null);
  const [form, setForm] = useState({ slug: "", labelEn: "", labelAr: "", icon: "building-2", color: "blue" });

  const q = useQuery<{ categories: PropertyCategory[] }>({
    queryKey: ["cms-property-types"],
    queryFn: () => apiFetch("/realestate-api/cms/property-types"),
  });

  const saveMutation = useMutation({
    mutationFn: (data: typeof form & { id?: number }) =>
      data.id
        ? apiFetch(`/realestate-api/cms/property-types/${data.id}`, { method: "PUT", body: JSON.stringify(data) })
        : apiFetch("/realestate-api/cms/property-types", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { toast({ title: "Saved" }); qc.invalidateQueries({ queryKey: ["cms-property-types"] }); setDialog(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/realestate-api/cms/property-types/${id}`, { method: "DELETE" }),
    onSuccess: () => { toast({ title: "Deleted" }); qc.invalidateQueries({ queryKey: ["cms-property-types"] }); setDialog(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openAdd = () => { setForm({ slug: "", labelEn: "", labelAr: "", icon: "building-2", color: "blue" }); setSelected(null); setDialog("add"); };
  const openEdit = (cat: PropertyCategory) => {
    setSelected(cat);
    setForm({ slug: cat.slug, labelEn: cat.labelEn, labelAr: cat.labelAr ?? "", icon: cat.icon, color: cat.color });
    setDialog("edit");
  };

  const categories = q.data?.categories ?? [];

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Define the property types available across your platform. These labels appear throughout the dashboard and guest portal.
        </p>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 me-1.5" /> Add Type
        </Button>
      </div>

      {q.isLoading && (
        <div className="flex items-center justify-center h-32 text-muted-foreground gap-2">
          <Loader2 className="h-5 w-5 animate-spin" /> Loading…
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map(cat => (
          <Card key={cat.id} className="group relative">
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center shrink-0", colorClass(cat.color))}>
                <IconComp name={cat.icon} className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{cat.labelEn}</p>
                {cat.labelAr && <p className="text-xs text-muted-foreground" dir="rtl">{cat.labelAr}</p>}
                <p className="text-xs text-muted-foreground/60">{cat.slug}</p>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => { setSelected(cat); setDialog("delete"); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialog === "add" || dialog === "edit"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === "add" ? "Add Property Type" : "Edit Property Type"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Name (English)</Label>
                <Input value={form.labelEn} onChange={e => setForm(f => ({ ...f, labelEn: e.target.value }))} placeholder="Hotel" /></div>
              <div><Label className="text-xs mb-1 block">الاسم (Arabic)</Label>
                <Input dir="rtl" value={form.labelAr} onChange={e => setForm(f => ({ ...f, labelAr: e.target.value }))} placeholder="فندق" /></div>
            </div>
            <div><Label className="text-xs mb-1 block">Slug (lowercase, no spaces)</Label>
              <Input value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} placeholder="hotel" /></div>
            <div>
              <Label className="text-xs mb-2 block">Icon</Label>
              <div className="flex gap-2 flex-wrap">
                {ICON_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, icon: o.value }))}
                    className={cn("h-9 w-9 rounded-md border flex items-center justify-center transition-colors", form.icon === o.value ? "border-primary bg-primary/10" : "border-border hover:bg-muted")}>
                    <o.Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label className="text-xs mb-2 block">Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(o => (
                  <button key={o.value} onClick={() => setForm(f => ({ ...f, color: o.value }))}
                    className={cn("h-7 w-7 rounded-full border-2 transition-all", o.cls, form.color === o.value ? "border-primary scale-110 ring-2 ring-primary/30" : "border-transparent")}>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button onClick={() => saveMutation.mutate({ ...form, ...(selected ? { id: selected.id } : {}) })} disabled={!form.labelEn || !form.slug || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
              {dialog === "add" ? "Create" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <Dialog open={dialog === "delete"} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{selected?.labelEn}"?</DialogTitle>
            <DialogDescription>This will remove the property type. Existing listings using this type will not be affected.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => selected && deleteMutation.mutate(selected.id)} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 me-1.5" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── TAB 2: Listings Editor ───────────────────────────────────────────────────

function ListingsEditorTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [editListing, setEditListing] = useState<AdminListing | null>(null);
  const [edited, setEdited] = useState<Partial<AdminListing>>({});
  const [uploading, setUploading] = useState(false);
  const [amenityInput, setAmenityInput] = useState("");

  const q = useQuery<{ listings: AdminListing[] }>({
    queryKey: ["cms-listings-admin"],
    queryFn: () => apiFetch("/realestate-api/cms/listings-admin"),
  });

  const patchMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<AdminListing> }) => {
      const payload = {
        ...data,
        amenities: JSON.stringify(data.amenities ?? []),
        media: JSON.stringify(data.media ?? []),
      };
      return apiFetch(`/realestate-api/listings/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      toast({ title: "Listing updated" });
      qc.invalidateQueries({ queryKey: ["cms-listings-admin"] });
      setEditListing(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (listing: AdminListing) => {
    setEditListing(listing);
    setEdited({ ...listing });
    setAmenityInput("");
  };

  const handleImageUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const newMedia = [...(edited.media ?? [])];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImageFile(files[i]);
        newMedia.push({ url, caption: "" });
      }
      setEdited(e => ({ ...e, media: newMedia }));
      toast({ title: `${files.length} image(s) uploaded` });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const addAmenity = () => {
    const v = amenityInput.trim();
    if (!v) return;
    setEdited(e => ({ ...e, amenities: [...(e.amenities ?? []), v] }));
    setAmenityInput("");
  };

  const removeAmenity = (idx: number) =>
    setEdited(e => ({ ...e, amenities: (e.amenities ?? []).filter((_, i) => i !== idx) }));

  const removeImage = (idx: number) =>
    setEdited(e => ({ ...e, media: (e.media ?? []).filter((_, i) => i !== idx) }));

  const listings = q.data?.listings ?? [];
  const filtered = listings.filter(l => {
    const matchSearch = !search || l.title.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || l.propertyType === filterType;
    return matchSearch && matchType;
  });

  const types = [...new Set(listings.map(l => l.propertyType).filter(Boolean))] as string[];

  const statusColor = (s: string) => ({
    active: "bg-emerald-100 text-emerald-700",
    draft: "bg-slate-100 text-slate-700",
    sold: "bg-blue-100 text-blue-700",
    rented: "bg-purple-100 text-purple-700",
    suspended: "bg-red-100 text-red-700",
  }[s] ?? "bg-muted text-muted-foreground");

  return (
    <div className="space-y-4 mt-4">
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Globe className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search listings…" className="ps-9 h-9" />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {types.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => qc.invalidateQueries({ queryKey: ["cms-listings-admin"] })}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {q.isLoading && <div className="flex items-center justify-center h-32 text-muted-foreground gap-2"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>}

      {filtered.length === 0 && !q.isLoading && (
        <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
          <Globe className="h-8 w-8 opacity-30 mb-2" />
          <p className="text-sm">No listings found</p>
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map(listing => (
              <div key={listing.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group">
                <div className="w-12 h-12 rounded-md bg-muted overflow-hidden shrink-0">
                  {listing.media[0]
                    ? <img src={listing.media[0].url} alt="" className="w-full h-full object-cover" />
                    : <ImageOff className="h-5 w-5 m-3.5 text-muted-foreground/40" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{listing.title}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {listing.propertyType && <span className="text-xs text-muted-foreground">{listing.propertyType}</span>}
                    <Badge className={cn("text-xs", statusColor(listing.status))}>{listing.status}</Badge>
                    {listing.price && <span className="text-xs font-medium">{listing.price.toLocaleString()} {listing.currency}</span>}
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={() => openEdit(listing)} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <Pencil className="h-3.5 w-3.5 me-1.5" /> Edit
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Listing Editor Sheet */}
      <Sheet open={!!editListing} onOpenChange={(o) => !o && setEditListing(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Listing</SheetTitle>
            <SheetDescription>{editListing?.title}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-4">
            {/* Images */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Images</Label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {(edited.media ?? []).map((m, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden border group">
                    <img src={m.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(idx)}
                      className="absolute top-1 end-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <button onClick={() => fileRef.current?.click()}
                  className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition-colors">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  <span className="text-xs">Upload</span>
                </button>
              </div>
              <input ref={fileRef} type="file" accept="image/*" multiple className="hidden"
                onChange={e => handleImageUpload(e.target.files)} />
            </div>

            <Separator />

            {/* Core fields */}
            <div>
              <Label className="text-xs mb-1.5 block">Title</Label>
              <Input value={edited.title ?? ""} onChange={e => setEdited(ed => ({ ...ed, title: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs mb-1.5 block">Description</Label>
              <Textarea rows={4} value={edited.description ?? ""} onChange={e => setEdited(ed => ({ ...ed, description: e.target.value }))} />
            </div>

            {/* Type + Status */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Property Type</Label>
                <Select value={edited.propertyType ?? ""} onValueChange={v => setEdited(e => ({ ...e, propertyType: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                  <SelectContent>
                    {["hotel", "apartment", "compound", "villa", "commercial", "office", "warehouse"].map(t => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Status</Label>
                <Select value={edited.status ?? "active"} onValueChange={v => setEdited(e => ({ ...e, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["active", "draft", "sold", "rented", "suspended"].map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Price + area */}
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <Label className="text-xs mb-1.5 block">Price</Label>
                <Input type="number" value={edited.price ?? ""} onChange={e => setEdited(ed => ({ ...ed, price: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Area (m²)</Label>
                <Input type="number" value={edited.areaSqm ?? ""} onChange={e => setEdited(ed => ({ ...ed, areaSqm: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs mb-1.5 block">Bedrooms</Label>
                <Input type="number" min={0} value={edited.bedrooms ?? ""} onChange={e => setEdited(ed => ({ ...ed, bedrooms: Number(e.target.value) }))} />
              </div>
              <div>
                <Label className="text-xs mb-1.5 block">Bathrooms</Label>
                <Input type="number" min={0} value={edited.bathrooms ?? ""} onChange={e => setEdited(ed => ({ ...ed, bathrooms: Number(e.target.value) }))} />
              </div>
            </div>

            <Separator />

            {/* Amenities */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Amenities</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(edited.amenities ?? []).map((a, idx) => (
                  <span key={idx} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary text-xs px-2.5 py-1">
                    {a}
                    <button onClick={() => removeAmenity(idx)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <Input value={amenityInput} onChange={e => setAmenityInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && (e.preventDefault(), addAmenity())}
                  placeholder="Add amenity (e.g. Swimming Pool)…" className="h-8 text-sm" />
                <Button size="sm" variant="outline" onClick={addAmenity} className="h-8">
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2 mt-6 justify-end">
            <Button variant="outline" onClick={() => setEditListing(null)}>Cancel</Button>
            <Button
              onClick={() => editListing && patchMutation.mutate({ id: editListing.id, data: edited })}
              disabled={patchMutation.isPending}
            >
              {patchMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin me-1.5" /> : <Save className="h-4 w-4 me-1.5" />}
              Save Changes
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ─── TAB 3: Site Content ──────────────────────────────────────────────────────

function SiteContentTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const heroImgRef = useRef<HTMLInputElement>(null);
  const aboutImgRef = useRef<HTMLInputElement>(null);

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [heroLocal, setHeroLocal] = useState<HeroContent | null>(null);
  const [contactLocal, setContactLocal] = useState<ContactContent | null>(null);
  const [announcementsLocal, setAnnouncementsLocal] = useState<Announcement[] | null>(null);
  const [newAnnouncement, setNewAnnouncement] = useState("");
  const [aboutLocal, setAboutLocal] = useState<SiteContent["about"] | null>(null);
  const [brandingLocal, setBrandingLocal] = useState<BrandingContent | null>(null);
  const [statsLocal, setStatsLocal] = useState<StatItem[] | null>(null);
  const [servicesLocal, setServicesLocal] = useState<ServiceItem[] | null>(null);
  const [leadEmailLocal, setLeadEmailLocal] = useState<LeadEmailTemplate | null>(null);
  const [uploading, setUploading] = useState(false);
  const svcImgRefs = useRef<(HTMLInputElement | null)[]>([]);

  const q = useQuery<{ content: SiteContent }>({
    queryKey: ["cms-site-content"],
    queryFn: () => apiFetch("/realestate-api/cms/site-content"),
  });

  const content = q.data?.content;

  const saveMutation = useMutation({
    mutationFn: ({ section, data }: { section: string; data: unknown }) =>
      apiFetch(`/realestate-api/cms/site-content/${section}`, { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (_, { section }) => {
      toast({ title: "Section saved", description: `${section} content updated.` });
      qc.invalidateQueries({ queryKey: ["cms-site-content"] });
      setEditingSection(null);
    },
    onError: (e: Error) => toast({ title: "Save failed", description: e.message, variant: "destructive" }),
  });

  const handleImageUploadFor = async (section: "hero" | "about" | "branding", files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(files[0]);
      if (section === "hero")     setHeroLocal(h => h ? { ...h, imageUrl: url } : null);
      if (section === "about")    setAboutLocal(a => a ? { ...a, imageUrl: url } : null);
      if (section === "branding") setBrandingLocal(b => b ? { ...b, logoUrl: url } : null);
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleServiceImageUpload = async (idx: number, files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      const url = await uploadImageFile(files[0]);
      setServicesLocal(s => s ? s.map((svc, i) => i === idx ? { ...svc, imageUrl: url } : svc) : null);
      toast({ title: "Image uploaded" });
    } catch (err) {
      toast({ title: "Upload failed", description: (err as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const startEdit = (section: string) => {
    setEditingSection(section);
    if (section === "hero"          && content?.hero)          setHeroLocal({ ...content.hero });
    if (section === "contact"       && content?.contact)       setContactLocal({ ...content.contact });
    if (section === "announcements" && content?.announcements) setAnnouncementsLocal([...content.announcements]);
    if (section === "about"         && content?.about)         setAboutLocal({ ...content.about });
    if (section === "branding"      && content?.branding)      setBrandingLocal({ ...content.branding });
    if (section === "stats"         && content?.stats)         setStatsLocal(content.stats.map(s => ({ ...s })));
    if (section === "services"      && content?.services)      setServicesLocal(content.services.map(s => ({ ...s })));
    if (section === "leadEmail"     && content?.leadEmail)     setLeadEmailLocal({ ...content.leadEmail });
  };

  if (q.isLoading) return (
    <div className="flex items-center justify-center h-32 text-muted-foreground gap-2 mt-4">
      <Loader2 className="h-5 w-5 animate-spin" />Loading…
    </div>
  );

  return (
    <div className="space-y-4 mt-4">
      {/* Hero Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4" /> Hero Banner</CardTitle>
              <CardDescription className="text-xs">Main banner shown at the top of the guest portal</CardDescription>
            </div>
            {editingSection === "hero"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "hero", data: heroLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("hero")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {editingSection !== "hero" ? (
            <div className="space-y-1">
              {content?.hero?.imageUrl && <img src={content.hero.imageUrl} alt="Hero" className="h-32 w-full object-cover rounded-md" />}
              <p className="font-medium">{content?.hero?.titleEn} · <span dir="rtl">{content?.hero?.titleAr}</span></p>
              <p className="text-sm text-muted-foreground">{content?.hero?.subtitleEn}</p>
            </div>
          ) : heroLocal && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Banner Image</p>
                <div className="flex gap-2 items-center">
                  {heroLocal.imageUrl && <img src={heroLocal.imageUrl} alt="" className="h-16 w-24 object-cover rounded-md" />}
                  <Button size="sm" variant="outline" onClick={() => heroImgRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {heroLocal.imageUrl ? "Replace Image" : "Upload Image"}
                  </Button>
                  <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUploadFor("hero", e.target.files)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Title (English)</Label>
                  <Input value={heroLocal.titleEn} onChange={e => setHeroLocal(h => h ? { ...h, titleEn: e.target.value } : h)} /></div>
                <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
                  <Input dir="rtl" value={heroLocal.titleAr} onChange={e => setHeroLocal(h => h ? { ...h, titleAr: e.target.value } : h)} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Subtitle (English)</Label>
                  <Input value={heroLocal.subtitleEn} onChange={e => setHeroLocal(h => h ? { ...h, subtitleEn: e.target.value } : h)} /></div>
                <div><Label className="text-xs mb-1 block">العنوان الفرعي (Arabic)</Label>
                  <Input dir="rtl" value={heroLocal.subtitleAr} onChange={e => setHeroLocal(h => h ? { ...h, subtitleAr: e.target.value } : h)} /></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Announcements */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Megaphone className="h-4 w-4" /> Announcements</CardTitle>
              <CardDescription className="text-xs">Notices displayed to guests on the portal</CardDescription>
            </div>
            {editingSection === "announcements"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "announcements", data: announcementsLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("announcements")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "announcements" ? (
            <div className="space-y-1">
              {(content?.announcements ?? []).length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}
              {(content?.announcements ?? []).map(a => (
                <div key={a.id} className="flex items-center gap-2 py-1">
                  <span className={cn("h-2 w-2 rounded-full shrink-0", a.isActive ? "bg-emerald-500" : "bg-muted-foreground/30")} />
                  <span className={cn("text-sm", !a.isActive && "line-through text-muted-foreground")}>{a.text}</span>
                </div>
              ))}
            </div>
          ) : announcementsLocal && (
            <div className="space-y-2">
              {announcementsLocal.map((a, idx) => (
                <div key={a.id} className="flex items-center gap-2 rounded-md border px-3 py-2">
                  <Switch checked={a.isActive} onCheckedChange={v => setAnnouncementsLocal(prev => prev!.map((x, i) => i === idx ? { ...x, isActive: v } : x))} />
                  <span className="text-sm flex-1">{a.text}</span>
                  <button onClick={() => setAnnouncementsLocal(prev => prev!.filter((_, i) => i !== idx))}>
                    <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 mt-2">
                <Input value={newAnnouncement} onChange={e => setNewAnnouncement(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && newAnnouncement.trim()) { setAnnouncementsLocal(p => [...(p ?? []), { id: Date.now().toString(), text: newAnnouncement.trim(), isActive: true }]); setNewAnnouncement(""); } }}
                  placeholder="New announcement…" className="h-8 text-sm" />
                <Button size="sm" variant="outline" className="h-8" onClick={() => { if (newAnnouncement.trim()) { setAnnouncementsLocal(p => [...(p ?? []), { id: Date.now().toString(), text: newAnnouncement.trim(), isActive: true }]); setNewAnnouncement(""); } }}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Phone className="h-4 w-4" /> Contact Information</CardTitle>
              <CardDescription className="text-xs">Shown in the portal footer and contact page</CardDescription>
            </div>
            {editingSection === "contact"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "contact", data: contactLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("contact")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "contact" ? (
            <div className="space-y-1 text-sm">
              {[
                { icon: Mail,       label: content?.contact?.email },
                { icon: Phone,      label: content?.contact?.phone },
                { icon: MessageCircle, label: content?.contact?.whatsapp },
                { icon: MapPin,     label: content?.contact?.address },
              ].map(({ icon: Icon, label }, i) => label ? (
                <div key={i} className="flex items-center gap-2 text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 shrink-0" /><span>{label}</span>
                </div>
              ) : null)}
              {!content?.contact?.email && !content?.contact?.phone && <p className="text-sm text-muted-foreground">No contact info yet.</p>}
            </div>
          ) : contactLocal && (
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "email" as const,    label: "Email",    placeholder: "info@company.com" },
                { key: "phone" as const,    label: "Phone",    placeholder: "+966 50 000 0000" },
                { key: "whatsapp" as const, label: "WhatsApp", placeholder: "+966 50 000 0000" },
                { key: "address" as const,  label: "Address",  placeholder: "123 Main St, City" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} className={key === "address" ? "col-span-2" : ""}>
                  <Label className="text-xs mb-1 block">{label}</Label>
                  <Input value={contactLocal[key]} onChange={e => setContactLocal(c => c ? { ...c, [key]: e.target.value } : c)} placeholder={placeholder} />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Landmark className="h-4 w-4" /> About Section</CardTitle>
              <CardDescription className="text-xs">Company description displayed on the portal</CardDescription>
            </div>
            {editingSection === "about"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "about", data: aboutLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("about")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "about" ? (
            <div className="space-y-1">
              {content?.about?.imageUrl && <img src={content.about.imageUrl} alt="" className="h-24 w-full object-cover rounded-md" />}
              {content?.about?.titleEn && <p className="font-medium">{content.about.titleEn}</p>}
              {content?.about?.body && <p className="text-sm text-muted-foreground line-clamp-3">{content.about.body}</p>}
              {!content?.about?.body && <p className="text-sm text-muted-foreground">No about text yet.</p>}
            </div>
          ) : aboutLocal && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Section Image</p>
                <div className="flex gap-2 items-center">
                  {aboutLocal.imageUrl && <img src={aboutLocal.imageUrl} alt="" className="h-16 w-24 object-cover rounded-md" />}
                  <Button size="sm" variant="outline" onClick={() => aboutImgRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {aboutLocal.imageUrl ? "Replace" : "Upload Image"}
                  </Button>
                  <input ref={aboutImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUploadFor("about", e.target.files)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Title (English)</Label>
                  <Input value={aboutLocal.titleEn} onChange={e => setAboutLocal(a => a ? { ...a, titleEn: e.target.value } : a)} /></div>
                <div><Label className="text-xs mb-1 block">العنوان (Arabic)</Label>
                  <Input dir="rtl" value={aboutLocal.titleAr} onChange={e => setAboutLocal(a => a ? { ...a, titleAr: e.target.value } : a)} /></div>
              </div>
              <div><Label className="text-xs mb-1 block">Body Text</Label>
                <Textarea rows={5} value={aboutLocal.body} onChange={e => setAboutLocal(a => a ? { ...a, body: e.target.value } : a)} placeholder="Tell visitors about your company…" /></div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Branding ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Palette className="h-4 w-4" /> Branding</CardTitle>
              <CardDescription className="text-xs">Company name, tagline, and logo — appears everywhere on the portal</CardDescription>
            </div>
            {editingSection === "branding"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "branding", data: brandingLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("branding")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "branding" ? (
            <div className="flex items-center gap-3">
              {content?.branding?.logoUrl
                ? <img src={content.branding.logoUrl} alt="Logo" className="h-10 w-10 object-contain rounded-md border" />
                : <div className="h-10 w-10 rounded-md border bg-muted flex items-center justify-center"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>}
              <div>
                <p className="font-semibold text-sm">{content?.branding?.companyNameEn || "—"} · <span dir="rtl">{content?.branding?.companyNameAr}</span></p>
                <p className="text-xs text-muted-foreground">{content?.branding?.taglineEn}</p>
              </div>
            </div>
          ) : brandingLocal && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Logo</p>
                <div className="flex gap-2 items-center">
                  {brandingLocal.logoUrl && <img src={brandingLocal.logoUrl} alt="" className="h-12 w-12 object-contain rounded-md border" />}
                  <Button size="sm" variant="outline" onClick={() => heroImgRef.current?.click()} disabled={uploading}>
                    {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                    {brandingLocal.logoUrl ? "Replace Logo" : "Upload Logo"}
                  </Button>
                  <input ref={heroImgRef} type="file" accept="image/*" className="hidden" onChange={e => handleImageUploadFor("branding", e.target.files)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">Company Name (EN)</Label>
                  <Input value={brandingLocal.companyNameEn} onChange={e => setBrandingLocal(b => b ? { ...b, companyNameEn: e.target.value } : b)} /></div>
                <div><Label className="text-xs mb-1 block">اسم الشركة (AR)</Label>
                  <Input dir="rtl" value={brandingLocal.companyNameAr} onChange={e => setBrandingLocal(b => b ? { ...b, companyNameAr: e.target.value } : b)} /></div>
                <div><Label className="text-xs mb-1 block">Tagline (EN)</Label>
                  <Input value={brandingLocal.taglineEn} onChange={e => setBrandingLocal(b => b ? { ...b, taglineEn: e.target.value } : b)} /></div>
                <div><Label className="text-xs mb-1 block">الشعار (AR)</Label>
                  <Input dir="rtl" value={brandingLocal.taglineAr} onChange={e => setBrandingLocal(b => b ? { ...b, taglineAr: e.target.value } : b)} /></div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Stats Strip ───────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><BarChart2 className="h-4 w-4" /> Homepage Statistics</CardTitle>
              <CardDescription className="text-xs">
                Edit the static stat values (e.g. "₂B SAR", "10+"). Live counts (properties, tenants) are auto-calculated from the database.
              </CardDescription>
            </div>
            {editingSection === "stats"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "stats", data: statsLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("stats")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "stats" ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(content?.stats ?? []).map((s, i) => (
                <div key={i} className="rounded-lg border bg-muted/40 p-3 text-center">
                  <p className="text-lg font-bold tabular-nums">{s.liveKey ? <span className="text-xs text-muted-foreground italic">auto</span> : s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.labelEn}</p>
                </div>
              ))}
            </div>
          ) : statsLocal && (
            <div className="space-y-3">
              {statsLocal.map((s, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center rounded-lg border p-3">
                  <div className="col-span-2">
                    <Label className="text-xs mb-1 block">Value</Label>
                    {s.liveKey
                      ? <p className="text-xs text-muted-foreground italic pt-2">Auto-calculated</p>
                      : <Input value={s.value} onChange={e => setStatsLocal(st => st ? st.map((x, j) => j === i ? { ...x, value: e.target.value } : x) : st)} className="h-8 text-sm" />}
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs mb-1 block">Label (EN)</Label>
                    <Input value={s.labelEn} onChange={e => setStatsLocal(st => st ? st.map((x, j) => j === i ? { ...x, labelEn: e.target.value } : x) : st)} className="h-8 text-sm" />
                  </div>
                  <div className="col-span-5">
                    <Label className="text-xs mb-1 block">التسمية (AR)</Label>
                    <Input dir="rtl" value={s.labelAr} onChange={e => setStatsLocal(st => st ? st.map((x, j) => j === i ? { ...x, labelAr: e.target.value } : x) : st)} className="h-8 text-sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Services ──────────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Layers className="h-4 w-4" /> Services Cards</CardTitle>
              <CardDescription className="text-xs">The service cards shown on the homepage and Services page</CardDescription>
            </div>
            {editingSection === "services"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "services", data: servicesLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("services")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "services" ? (
            <div className="space-y-2">
              {(content?.services ?? []).map((svc, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border p-3">
                  {svc.imageUrl
                    ? <img src={svc.imageUrl} alt="" className="h-10 w-14 object-cover rounded-md shrink-0" />
                    : <div className="h-10 w-14 rounded-md bg-muted flex items-center justify-center shrink-0"><ImageOff className="h-4 w-4 text-muted-foreground" /></div>}
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{svc.titleEn} · <span dir="rtl" className="text-muted-foreground">{svc.titleAr}</span></p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{svc.descEn}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : servicesLocal && (
            <div className="space-y-4">
              {servicesLocal.map((svc, i) => (
                <div key={i} className="rounded-xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Service {i + 1}</p>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive"
                      onClick={() => setServicesLocal(s => s ? s.filter((_, j) => j !== i) : s)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Image</p>
                    <div className="flex gap-2 items-center">
                      {svc.imageUrl && <img src={svc.imageUrl} alt="" className="h-12 w-20 object-cover rounded-md" />}
                      <Button size="sm" variant="outline" onClick={() => svcImgRefs.current[i]?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin me-1.5" /> : <Upload className="h-3.5 w-3.5 me-1.5" />}
                        {svc.imageUrl ? "Replace" : "Upload"}
                      </Button>
                      <input ref={el => { svcImgRefs.current[i] = el; }} type="file" accept="image/*" className="hidden"
                        onChange={e => handleServiceImageUpload(i, e.target.files)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs mb-1 block">Title (EN)</Label>
                      <Input value={svc.titleEn} onChange={e => setServicesLocal(s => s ? s.map((x, j) => j === i ? { ...x, titleEn: e.target.value } : x) : s)} className="h-8 text-sm" /></div>
                    <div><Label className="text-xs mb-1 block">العنوان (AR)</Label>
                      <Input dir="rtl" value={svc.titleAr} onChange={e => setServicesLocal(s => s ? s.map((x, j) => j === i ? { ...x, titleAr: e.target.value } : x) : s)} className="h-8 text-sm" /></div>
                    <div className="col-span-2"><Label className="text-xs mb-1 block">Description (EN)</Label>
                      <Textarea rows={2} value={svc.descEn} onChange={e => setServicesLocal(s => s ? s.map((x, j) => j === i ? { ...x, descEn: e.target.value } : x) : s)} className="text-sm resize-none" /></div>
                    <div className="col-span-2"><Label className="text-xs mb-1 block">الوصف (AR)</Label>
                      <Textarea rows={2} dir="rtl" value={svc.descAr} onChange={e => setServicesLocal(s => s ? s.map((x, j) => j === i ? { ...x, descAr: e.target.value } : x) : s)} className="text-sm resize-none" /></div>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full" onClick={() => setServicesLocal(s => [...(s ?? []), { titleEn: "", titleAr: "", descEn: "", descAr: "", imageUrl: "" }])}>
                <Plus className="h-3.5 w-3.5 me-1.5" /> Add Service
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Lead Email Template ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Mail className="h-4 w-4" /> Lead Welcome Email</CardTitle>
              <CardDescription className="text-xs">
                Sent automatically when someone submits the "Join Us" / "Visit Request" form. Use <code className="bg-muted px-1 rounded text-[11px]">{"{{name}}"}</code> to insert the client's name.
              </CardDescription>
            </div>
            {editingSection === "leadEmail"
              ? <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditingSection(null)}>Cancel</Button>
                  <Button size="sm" onClick={() => saveMutation.mutate({ section: "leadEmail", data: leadEmailLocal })} disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 me-1" />}Save
                  </Button>
                </div>
              : <Button size="sm" variant="outline" onClick={() => startEdit("leadEmail")}><Pencil className="h-3.5 w-3.5 me-1.5" />Edit</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {editingSection !== "leadEmail" ? (
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Subject</span>
                <span className="text-sm font-medium">{content?.leadEmail?.subject || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Body</span>
                <span className="text-sm text-muted-foreground line-clamp-2">{content?.leadEmail?.intro || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Maps URL</span>
                <span className="text-xs text-muted-foreground truncate max-w-xs">{content?.leadEmail?.mapsUrl || "—"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-20 shrink-0 pt-0.5">Admin BCC</span>
                <span className="text-sm">{content?.leadEmail?.bccEmail || <span className="text-muted-foreground italic text-xs">Not set — admin will not receive copies</span>}</span>
              </div>
            </div>
          ) : leadEmailLocal && (
            <div className="space-y-4">
              <div>
                <Label className="text-xs mb-1 block">Subject Line</Label>
                <Input
                  value={leadEmailLocal.subject}
                  onChange={e => setLeadEmailLocal(t => t ? { ...t, subject: e.target.value } : t)}
                  placeholder="Welcome to Rkaz – Your Visit Confirmation"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block">Email Body</Label>
                <Textarea
                  rows={6}
                  value={leadEmailLocal.intro}
                  onChange={e => setLeadEmailLocal(t => t ? { ...t, intro: e.target.value } : t)}
                  placeholder="Thank you for your interest in Rkaz…"
                  className="resize-none text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">Separate paragraphs with a blank line. <code className="bg-muted px-1 rounded">{"{{name}}"}</code> will be replaced with the client's name.</p>
              </div>
              <div>
                <Label className="text-xs mb-1 block">Google Maps URL (Location Link)</Label>
                <Input
                  value={leadEmailLocal.mapsUrl}
                  onChange={e => setLeadEmailLocal(t => t ? { ...t, mapsUrl: e.target.value } : t)}
                  placeholder="https://www.google.com/maps/…"
                />
              </div>
              <div>
                <Label className="text-xs mb-1 block flex items-center gap-1.5">
                  Admin BCC Email
                  <span className="font-normal text-muted-foreground">(receives a silent copy of every lead confirmation)</span>
                </Label>
                <Input
                  type="email"
                  value={leadEmailLocal.bccEmail}
                  onChange={e => setLeadEmailLocal(t => t ? { ...t, bccEmail: e.target.value } : t)}
                  placeholder="management@company.com"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ContentManager() {
  const qc = useQueryClient();
  return (
    <div className="p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-serif font-bold flex items-center gap-2">
            <LayoutTemplate className="h-6 w-6 text-primary" />
            Content Manager
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Your remote control — any change here goes live immediately across the platform
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => {
          qc.invalidateQueries({ queryKey: ["cms-property-types"] });
          qc.invalidateQueries({ queryKey: ["cms-site-content"] });
          qc.invalidateQueries({ queryKey: ["cms-listings-admin"] });
        }}>
          <RefreshCw className="h-3.5 w-3.5 me-1.5" /> Refresh All
        </Button>
      </div>

      <Tabs defaultValue="types">
        <TabsList className="grid grid-cols-3 w-full sm:w-auto">
          <TabsTrigger value="types" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Property Types
          </TabsTrigger>
          <TabsTrigger value="listings" className="gap-1.5">
            <Globe className="h-4 w-4" />
            Listings Editor
          </TabsTrigger>
          <TabsTrigger value="site" className="gap-1.5">
            <Megaphone className="h-4 w-4" />
            Site Content
          </TabsTrigger>
        </TabsList>

        <TabsContent value="types"><PropertyTypesTab /></TabsContent>
        <TabsContent value="listings"><ListingsEditorTab /></TabsContent>
        <TabsContent value="site"><SiteContentTab /></TabsContent>
      </Tabs>
    </div>
  );
}
