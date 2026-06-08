import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCreateServiceCategory,
  useUpdateServiceCategory,
  useDeleteServiceCategory,
} from "@/lib/local-hooks";
import type { ServiceCategory } from "@/lib/local-hooks";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Zap, Droplets, Wind, Brush, Wrench, Volume2, DoorOpen,
  Key, Wifi, Car, Thermometer, Trash2, Shield, Coffee, Package,
  Phone, Camera, Utensils, Trees,
  Plus, Pencil, Trash2 as TrashIcon, Clock, Building2,
  Settings2,
} from "lucide-react";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICON_OPTIONS: { slug: string; Icon: IconComponent; label: string }[] = [
  { slug: "zap",         Icon: Zap,         label: "Electrical"   },
  { slug: "droplets",    Icon: Droplets,    label: "Plumbing"     },
  { slug: "wind",        Icon: Wind,        label: "AC / Heating" },
  { slug: "brush",       Icon: Brush,       label: "Cleaning"     },
  { slug: "wrench",      Icon: Wrench,      label: "Maintenance"  },
  { slug: "volume-2",    Icon: Volume2,     label: "Noise"        },
  { slug: "key",         Icon: Key,         label: "Access / Keys"},
  { slug: "wifi",        Icon: Wifi,        label: "Internet"     },
  { slug: "car",         Icon: Car,         label: "Parking"      },
  { slug: "thermometer", Icon: Thermometer, label: "Temperature"  },
  { slug: "trash-2",     Icon: Trash2,      label: "Waste"        },
  { slug: "shield",      Icon: Shield,      label: "Security"     },
  { slug: "coffee",      Icon: Coffee,      label: "Hospitality"  },
  { slug: "package",     Icon: Package,     label: "Delivery"     },
  { slug: "phone",       Icon: Phone,       label: "Phone"        },
  { slug: "camera",      Icon: Camera,      label: "CCTV"         },
  { slug: "utensils",    Icon: Utensils,    label: "F&B"          },
  { slug: "trees",       Icon: Trees,       label: "Landscaping"  },
  { slug: "door-open",   Icon: DoorOpen,    label: "General"      },
];

const COLOR_OPTIONS = [
  { slug: "yellow",  cls: "bg-yellow-500"  },
  { slug: "blue",    cls: "bg-blue-500"    },
  { slug: "cyan",    cls: "bg-cyan-500"    },
  { slug: "green",   cls: "bg-green-500"   },
  { slug: "orange",  cls: "bg-orange-500"  },
  { slug: "red",     cls: "bg-red-500"     },
  { slug: "purple",  cls: "bg-purple-500"  },
  { slug: "indigo",  cls: "bg-indigo-500"  },
  { slug: "amber",   cls: "bg-amber-500"   },
  { slug: "slate",   cls: "bg-slate-400"   },
];

const ICON_MAP: Record<string, IconComponent> = Object.fromEntries(
  ICON_OPTIONS.map(o => [o.slug, o.Icon])
);

const COLOR_CLASS: Record<string, string> = {
  yellow: "text-yellow-500", blue:   "text-blue-500",   cyan:   "text-cyan-500",
  green:  "text-green-500",  orange: "text-orange-500", red:    "text-red-500",
  purple: "text-purple-500", indigo: "text-indigo-500", amber:  "text-amber-500",
  slate:  "text-slate-400",
};

const PRIORITY_LABELS: Record<string, string> = { high: "High", medium: "Medium", low: "Low" };
const PRIORITY_COLORS: Record<string, string>  = { high: "bg-red-100 text-red-700", medium: "bg-amber-100 text-amber-700", low: "bg-slate-100 text-slate-600" };

const PROP_TYPE_TABS = [
  { key: "all",      label: "All"      },
  { key: "hotel",    label: "Hotel"    },
  { key: "compound", label: "Compound" },
  { key: "tower",    label: "Tower"    },
];

const PROP_TYPE_OPTIONS = ["hotel", "compound", "tower"];

type FormState = {
  name:             string;
  icon:             string;
  color:            string;
  propertyTypes:    string[];
  applyAll:         boolean;
  priority:         string;
  requiresTimeSlot: boolean;
  sortOrder:        number;
};

const DEFAULT_FORM: FormState = {
  name: "", icon: "wrench", color: "amber", propertyTypes: [], applyAll: true,
  priority: "medium", requiresTimeSlot: false, sortOrder: 0,
};

const SERVICE_CATEGORIES_QUERY_KEY = ["service-categories-admin"];

export default function ServiceConfig() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [tab,         setTab]         = useState("all");
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editTarget,  setEditTarget]  = useState<ServiceCategory | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<ServiceCategory | null>(null);
  const [form,        setForm]        = useState<FormState>(DEFAULT_FORM);

  const LOCAL_CATS: ServiceCategory[] = [
    { id:1, slug:"electrical", label:"Electrical", icon:"zap", color:"yellow", isActive:true, responseTimeMin:60, sortOrder:1 },
    { id:2, slug:"plumbing", label:"Plumbing", icon:"droplets", color:"blue", isActive:true, responseTimeMin:60, sortOrder:2 },
    { id:3, slug:"cleaning", label:"Cleaning", icon:"brush", color:"green", isActive:true, responseTimeMin:30, sortOrder:3 },
    { id:4, slug:"ac", label:"AC / Heating", icon:"wind", color:"blue", isActive:true, responseTimeMin:90, sortOrder:4 },
    { id:5, slug:"security", label:"Security", icon:"shield", color:"gray", isActive:true, responseTimeMin:15, sortOrder:5 },
  ];
  const [localCats, setLocalCats] = React.useState<ServiceCategory[]>(LOCAL_CATS);
  const categories = localCats;
  const isLoading = false;

  const invalidate = () => {};

  const createMutation = useCreateServiceCategory({
    mutation: {
      onSuccess: () => { invalidate(); setModalOpen(false); toast({ title: "Category created" }); },
      onError:   () => toast({ title: "Failed to create", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateServiceCategory({
    mutation: {
      onSuccess: () => { invalidate(); setModalOpen(false); toast({ title: "Category updated" }); },
      onError:   () => toast({ title: "Failed to update", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteServiceCategory({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "Category deleted" }); },
      onError:   () => toast({ title: "Failed to delete", variant: "destructive" }),
    },
  });

  function buildPropertyTypesString(form: FormState): string {
    if (form.applyAll) return "all";
    return form.propertyTypes.join(",") || "all";
  }

  function openCreate() {
    setEditTarget(null);
    setForm(DEFAULT_FORM);
    setModalOpen(true);
  }

  function openEdit(cat: ServiceCategory) {
    setEditTarget(cat);
    const pt = cat.propertyTypes ?? "all";
    const isAll = pt === "all" || pt === "";
    setForm({
      name:             cat.name ?? "",
      icon:             cat.icon,
      color:            cat.color,
      propertyTypes:    isAll ? [] : pt.split(",").map((t: string) => t.trim()),
      applyAll:         isAll,
      priority:         cat.priority ?? "medium",
      requiresTimeSlot: cat.requiresTimeSlot ?? false,
      sortOrder:        cat.sortOrder,
    });
    setModalOpen(true);
  }

  function handleSave() {
    const payload = {
      name:             form.name.trim(),
      icon:             form.icon,
      color:            form.color,
      propertyTypes:    buildPropertyTypesString(form),
      isActive:         true,
      sortOrder:        form.sortOrder,
      priority:         form.priority,
      requiresTimeSlot: form.requiresTimeSlot,
    };
    if (!payload.name) return;
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  }

  function toggleActive(cat: ServiceCategory) {
    updateMutation.mutate({ id: cat.id, data: { isActive: !cat.isActive } });
  }

  const filtered = tab === "all"
    ? categories
    : categories.filter(c => {
        const types = (c.propertyTypes ?? "all").split(",").map((t: string) => t.trim());
        return types.includes("all") || types.includes(tab);
      });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 size={20} className="text-amber-500" />
            <h1 className="text-2xl font-serif font-bold text-slate-800">Service Configuration</h1>
          </div>
          <p className="text-sm text-slate-500">
            Manage service request categories shown to residents and hotel guests.
          </p>
        </div>
        <Button onClick={openCreate} className="bg-amber-500 hover:bg-amber-600 text-black font-semibold gap-1.5">
          <Plus size={16} /> Add Category
        </Button>
      </div>

      {/* Property type tabs */}
      <div className="flex gap-2 flex-wrap">
        {PROP_TYPE_TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
              tab === t.key
                ? "bg-amber-500 border-amber-500 text-black"
                : "bg-white border-slate-200 text-slate-600 hover:border-amber-300"
            }`}
          >
            {t.label}
            {t.key !== "all" && (
              <span className="ml-1.5 text-xs opacity-70">
                ({categories.filter(c => {
                  const types = (c.propertyTypes ?? "all").split(",").map((s: string) => s.trim());
                  return types.includes("all") || types.includes(t.key);
                }).length})
              </span>
            )}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-400 self-center">{filtered.length} categor{filtered.length === 1 ? "y" : "ies"}</span>
      </div>

      {/* Category grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-28 animate-pulse bg-slate-100" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Settings2 size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No categories for this property type</p>
          <p className="text-sm mt-1">Click "Add Category" to create one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(cat => {
            const Icon = ICON_MAP[cat.icon] ?? Wrench;
            const colorCls = COLOR_CLASS[cat.color] ?? "text-slate-400";
            return (
              <Card key={cat.id} className={`border transition-all ${cat.isActive ? "" : "opacity-50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                        <Icon size={20} className={colorCls} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800 leading-tight">{cat.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${PRIORITY_COLORS[cat.priority ?? ""] ?? "bg-slate-100 text-slate-600"}`}>
                            {PRIORITY_LABELS[cat.priority ?? ""] ?? cat.priority}
                          </span>
                          {cat.requiresTimeSlot && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600">
                              <Clock size={9} /> Time Slot
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={cat.isActive}
                      onCheckedChange={() => toggleActive(cat)}
                      className="scale-75"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Building2 size={11} className="text-slate-400" />
                      <span className="text-[11px] text-slate-400">
                        {(!cat.propertyTypes || cat.propertyTypes === "all") ? "All types" : cat.propertyTypes.replace(/,/g, " · ")}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(cat)}>
                        <Pencil size={13} />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget(cat)}>
                        <TrashIcon size={13} />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Category" : "New Service Category"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* Name */}
            <div className="space-y-1.5">
              <Label>Name <span className="text-red-400">*</span></Label>
              <Input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Electrical, Plumbing…"
              />
            </div>

            {/* Icon picker */}
            <div className="space-y-1.5">
              <Label>Icon</Label>
              <div className="grid grid-cols-5 gap-2">
                {ICON_OPTIONS.map(({ slug, Icon, label }) => (
                  <button
                    key={slug}
                    type="button"
                    title={label}
                    onClick={() => setForm(f => ({ ...f, icon: slug }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                      form.icon === slug
                        ? "border-amber-400 bg-amber-50 text-amber-700 font-semibold"
                        : "border-slate-200 hover:border-slate-300 text-slate-600"
                    }`}
                  >
                    <Icon size={16} />
                    <span className="leading-none text-[9px] truncate w-full text-center">{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Color picker */}
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {COLOR_OPTIONS.map(({ slug, cls }) => (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: slug }))}
                    className={`w-7 h-7 rounded-full ${cls} transition-all ${
                      form.color === slug ? "ring-2 ring-offset-2 ring-amber-500 scale-110" : "opacity-70 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Applies to */}
            <div className="space-y-2">
              <Label>Applies to</Label>
              <div className="flex items-center gap-2 mb-2">
                <Switch
                  checked={form.applyAll}
                  onCheckedChange={v => setForm(f => ({ ...f, applyAll: v, propertyTypes: v ? [] : f.propertyTypes }))}
                  id="apply-all"
                />
                <label htmlFor="apply-all" className="text-sm text-slate-700 cursor-pointer">All property types</label>
              </div>
              {!form.applyAll && (
                <div className="flex gap-3">
                  {PROP_TYPE_OPTIONS.map(pt => (
                    <label key={pt} className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={form.propertyTypes.includes(pt)}
                        onChange={e => setForm(f => ({
                          ...f,
                          propertyTypes: e.target.checked
                            ? [...f.propertyTypes, pt]
                            : f.propertyTypes.filter(x => x !== pt),
                        }))}
                        className="rounded"
                      />
                      <span className="text-sm capitalize text-slate-700">{pt}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Priority */}
            <div className="space-y-1.5">
              <Label>Work Order Priority</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Requires Time Slot */}
            <div className="flex items-center gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Clock size={16} className="text-blue-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-800">Requires Time Slot</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Force a mandatory preferred time slot for this category (auto-enabled for compound / tower).
                </p>
              </div>
              <Switch
                checked={form.requiresTimeSlot}
                onCheckedChange={v => setForm(f => ({ ...f, requiresTimeSlot: v }))}
              />
            </div>

            {/* Sort Order */}
            <div className="space-y-1.5">
              <Label>Sort Order</Label>
              <Input
                type="number"
                min={0}
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                className="w-28"
              />
              <p className="text-xs text-slate-400">Lower numbers appear first in the guest portal.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSave}
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Saving…" : (editTarget ? "Save Changes" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the category permanently. Existing work orders won't be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate({ id: deleteTarget.id })}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
