import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Trash2, Package, AlertTriangle, MinusCircle, PlusCircle, Boxes } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const CATEGORIES = [
  { value: "electrical", label: "كهرباء" },
  { value: "plumbing", label: "سباكة" },
  { value: "hvac", label: "تكييف" },
  { value: "cleaning", label: "نظافة" },
  { value: "tools", label: "أدوات" },
  { value: "general", label: "عام" },
];

const UNITS = [
  { value: "piece", label: "قطعة" },
  { value: "liter", label: "لتر" },
  { value: "meter", label: "متر" },
  { value: "kg", label: "كيلو" },
  { value: "box", label: "علبة" },
  { value: "roll", label: "رول" },
];

const itemSchema = z.object({
  name: z.string().min(1, "اسم المادة مطلوب"),
  category: z.string().default("general"),
  quantity: z.string().default("0"),
  minQuantity: z.string().default("5"),
  unit: z.string().default("piece"),
  location: z.string().optional(),
  description: z.string().optional(),
});

type ItemFormValues = z.infer<typeof itemSchema>;

function CategoryBadge({ category }: { category: string }) {
  const cat = CATEGORIES.find(c => c.value === category);
  const colors: Record<string, string> = {
    electrical: "bg-yellow-100 text-yellow-800",
    plumbing:   "bg-blue-100 text-blue-800",
    hvac:       "bg-cyan-100 text-cyan-800",
    cleaning:   "bg-green-100 text-green-800",
    tools:      "bg-orange-100 text-orange-800",
    general:    "bg-slate-100 text-slate-700",
  };
  return <Badge className={`${colors[category] ?? colors.general} border-0`}>{cat?.label ?? category}</Badge>;
}

export default function Inventory() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [adjustItem, setAdjustItem] = useState<any>(null);
  const [adjustDelta, setAdjustDelta] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showLowOnly, setShowLowOnly] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["inventory", filterCategory, showLowOnly],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (showLowOnly) params.set("lowStock", "true");
      return apiFetch(`/inventory${params.toString() ? "?" + params : ""}`);
    },
  });

  const form = useForm<ItemFormValues>({ resolver: zodResolver(itemSchema), defaultValues: { category: "general", quantity: "0", minQuantity: "5", unit: "piece" } });

  const saveMutation = useMutation({
    mutationFn: (data: ItemFormValues) =>
      editing ? apiFetch(`/inventory/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/inventory", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setIsOpen(false); setEditing(null); form.reset(); toast({ title: editing ? "تم التحديث" : "تمت الإضافة" }); },
    onError: () => toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" }),
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta }: { id: number; delta: number }) =>
      apiFetch(`/inventory/${id}/adjust`, { method: "PATCH", body: JSON.stringify({ delta }) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setAdjustItem(null); setAdjustDelta(""); toast({ title: "تم تحديث الكمية" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/inventory/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); toast({ title: "تم الحذف" }); },
  });

  function openNew() { setEditing(null); form.reset({ category: "general", quantity: "0", minQuantity: "5", unit: "piece" }); setIsOpen(true); }
  function openEdit(item: any) { setEditing(item); form.reset({ ...item }); setIsOpen(true); }

  const lowStockCount = items.filter((i: any) => parseFloat(i.quantity) <= parseFloat(i.minQuantity)).length;
  const totalItems = items.length;
  const totalValue = items.reduce((s: number, i: any) => s + parseFloat(i.quantity), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">مخزون المستودع</h1>
          <p className="text-sm text-muted-foreground mt-1">قطع الغيار والمواد والأدوات</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />إضافة صنف</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Boxes className="h-8 w-8 text-primary" />
            <div><div className="text-2xl font-bold">{totalItems}</div><div className="text-xs text-muted-foreground">إجمالي الأصناف</div></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className={`h-8 w-8 ${lowStockCount > 0 ? "text-red-500" : "text-slate-400"}`} />
            <div>
              <div className={`text-2xl font-bold ${lowStockCount > 0 ? "text-red-600" : ""}`}>{lowStockCount}</div>
              <div className="text-xs text-muted-foreground">أصناف منخفضة المخزون</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <Package className="h-8 w-8 text-blue-500" />
            <div><div className="text-2xl font-bold">{totalValue.toFixed(0)}</div><div className="text-xs text-muted-foreground">إجمالي الكميات</div></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">قائمة المخزون</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant={showLowOnly ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1"
                onClick={() => setShowLowOnly(!showLowOnly)}>
                <AlertTriangle className="h-3 w-3" />منخفضة فقط
              </Button>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-32 h-8 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>المستودع فارغ — أضف أول صنف</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم الصنف</TableHead>
                  <TableHead>الفئة</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item: any) => {
                  const qty = parseFloat(item.quantity);
                  const min = parseFloat(item.minQuantity);
                  const isLow = qty <= min;
                  const unitLabel = UNITS.find(u => u.value === item.unit)?.label ?? item.unit;
                  return (
                    <TableRow key={item.id} className={isLow ? "bg-red-50/40" : ""}>
                      <TableCell className="cursor-pointer font-medium" onClick={() => openEdit(item)}>{item.name}</TableCell>
                      <TableCell><CategoryBadge category={item.category} /></TableCell>
                      <TableCell className={`font-bold ${isLow ? "text-red-600" : "text-foreground"}`}>
                        {qty} {unitLabel}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{min} {unitLabel}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.location ?? "—"}</TableCell>
                      <TableCell>
                        {isLow ? (
                          <Badge className="bg-red-100 text-red-800 border-0 gap-1"><AlertTriangle className="h-3 w-3" />منخفض</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-0">متوفر</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="outline" size="icon" className="h-7 w-7 text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => { setAdjustItem(item); setAdjustDelta(""); }} title="تعديل الكمية">
                            <PlusCircle className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm("حذف هذا الصنف؟")) deleteMutation.mutate(item.id); }}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل الصنف" : "إضافة صنف جديد"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>اسم الصنف</FormLabel><FormControl><Input placeholder="مثال: مصباح LED 12W" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="category" render={({ field }) => (
                  <FormItem><FormLabel>الفئة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="unit" render={({ field }) => (
                  <FormItem><FormLabel>الوحدة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{UNITS.map(u => <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem><FormLabel>الكمية الحالية</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="minQuantity" render={({ field }) => (
                  <FormItem><FormLabel>الحد الأدنى للتنبيه</FormLabel><FormControl><Input type="number" min="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem><FormLabel>موقع التخزين</FormLabel><FormControl><Input placeholder="مثال: رف A3" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>وصف (اختياري)</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Adjust Quantity Dialog */}
      <Dialog open={!!adjustItem} onOpenChange={(o) => { if (!o) { setAdjustItem(null); setAdjustDelta(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>تعديل كمية: {adjustItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-center">
              <div className="text-3xl font-bold">{adjustItem ? parseFloat(adjustItem.quantity) : 0}</div>
              <div className="text-sm text-muted-foreground">الكمية الحالية</div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">التغيير (+ إضافة / - سحب)</label>
              <Input type="number" placeholder="مثال: 10 أو -3" value={adjustDelta} onChange={(e) => setAdjustDelta(e.target.value)} />
              {adjustDelta && adjustItem && (
                <p className="text-xs text-muted-foreground">
                  الكمية الجديدة: <span className="font-bold">{Math.max(0, parseFloat(adjustItem.quantity) + parseFloat(adjustDelta || "0")).toFixed(2)}</span>
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAdjustItem(null); setAdjustDelta(""); }}>إلغاء</Button>
            <Button
              disabled={!adjustDelta || isNaN(parseFloat(adjustDelta)) || adjustMutation.isPending}
              onClick={() => adjustMutation.mutate({ id: adjustItem.id, delta: parseFloat(adjustDelta) })}>
              {adjustMutation.isPending ? "جارٍ التحديث..." : "تأكيد"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
