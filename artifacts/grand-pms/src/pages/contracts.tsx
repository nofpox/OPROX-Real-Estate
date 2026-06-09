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
import { Plus, Trash2, FileText, Calendar, User, Phone, Mail, AlertCircle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const contractSchema = z.object({
  propertyId: z.coerce.number().min(1, "اختر العقار"),
  roomId: z.coerce.number().min(1, "اختر الوحدة"),
  contractNumber: z.string().min(1, "رقم العقد مطلوب"),
  tenantName: z.string().min(1, "اسم المستأجر مطلوب"),
  tenantPhone: z.string().optional(),
  tenantEmail: z.string().optional(),
  startDate: z.string().min(1, "تاريخ البداية مطلوب"),
  endDate: z.string().min(1, "تاريخ الانتهاء مطلوب"),
  monthlyRent: z.string().min(1, "الإيجار الشهري مطلوب"),
  depositAmount: z.string().optional(),
  status: z.enum(["active", "expired", "terminated", "draft"]).default("active"),
  notes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractSchema>;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":     return <Badge className="bg-green-100 text-green-800 border-0">نشط</Badge>;
    case "expired":    return <Badge className="bg-slate-100 text-slate-700 border-0">منتهي</Badge>;
    case "terminated": return <Badge className="bg-red-100 text-red-800 border-0">مُنهى</Badge>;
    case "draft":      return <Badge className="bg-amber-100 text-amber-800 border-0">مسودة</Badge>;
    default:           return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Contracts() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: contracts = [], isLoading } = useQuery({
    queryKey: ["contracts", filterStatus],
    queryFn: () => apiFetch(`/contracts${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`),
  });

  const { data: properties = [] } = useQuery({ queryKey: ["properties-list"], queryFn: () => apiFetch("/properties") });
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms-list"], queryFn: () => apiFetch("/rooms") });

  const form = useForm<ContractFormValues>({ resolver: zodResolver(contractSchema), defaultValues: { status: "active" } });

  const saveMutation = useMutation({
    mutationFn: (data: ContractFormValues) =>
      editing ? apiFetch(`/contracts/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/contracts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); setIsOpen(false); setEditing(null); form.reset(); toast({ title: editing ? "تم التحديث" : "تم الإضافة", description: "تم حفظ العقد بنجاح" }); },
    onError: () => toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/contracts/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["contracts"] }); toast({ title: "تم الحذف" }); },
  });

  function openNew() { setEditing(null); form.reset({ status: "active" }); setIsOpen(true); }
  function openEdit(c: any) { setEditing(c); form.reset({ ...c, propertyId: c.propertyId?.toString(), roomId: c.roomId?.toString() }); setIsOpen(true); }

  const filteredRooms = form.watch("propertyId") ? rooms.filter((r: any) => r.propertyId === Number(form.watch("propertyId"))) : rooms;

  const stats = {
    active:     contracts.filter((c: any) => c.status === "active").length,
    expiringSoon: contracts.filter((c: any) => { if (c.status !== "active") return false; const d = new Date(c.endDate + "T00:00:00"); const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24); return diff >= 0 && diff <= 30; }).length,
    expired:    contracts.filter((c: any) => c.status === "expired").length,
    total:      contracts.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">إدارة العقود</h1>
          <p className="text-sm text-muted-foreground mt-1">عقود الإيجار وتتبع حالتها</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />عقد جديد</Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "العقود النشطة", value: stats.active, icon: CheckCircle2, color: "text-green-600" },
          { label: "تنتهي قريباً (30 يوم)", value: stats.expiringSoon, icon: AlertCircle, color: "text-amber-600" },
          { label: "منتهية الصلاحية", value: stats.expired, icon: Clock, color: "text-slate-500" },
          { label: "إجمالي العقود", value: stats.total, icon: FileText, color: "text-primary" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold">{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">قائمة العقود</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="active">نشط</SelectItem>
                <SelectItem value="expired">منتهي</SelectItem>
                <SelectItem value="terminated">مُنهى</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : contracts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد عقود بعد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم العقد</TableHead>
                  <TableHead>المستأجر</TableHead>
                  <TableHead>الوحدة</TableHead>
                  <TableHead>الإيجار الشهري</TableHead>
                  <TableHead>البداية</TableHead>
                  <TableHead>الانتهاء</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contracts.map((c: any) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openEdit(c)}>
                    <TableCell className="font-mono text-sm">{c.contractNumber}</TableCell>
                    <TableCell>
                      <div className="font-medium">{c.tenantName}</div>
                      {c.tenantPhone && <div className="text-xs text-muted-foreground">{c.tenantPhone}</div>}
                    </TableCell>
                    <TableCell>وحدة #{c.roomId}</TableCell>
                    <TableCell className="font-medium">{Number(c.monthlyRent).toLocaleString()} ريال</TableCell>
                    <TableCell className="text-sm">{c.startDate}</TableCell>
                    <TableCell className="text-sm">{c.endDate}</TableCell>
                    <TableCell><StatusBadge status={c.status} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); if (confirm("حذف هذا العقد؟")) deleteMutation.mutate(c.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={(o) => { setIsOpen(o); if (!o) { setEditing(null); form.reset(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "تعديل العقد" : "عقد إيجار جديد"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="contractNumber" render={({ field }) => (
                  <FormItem><FormLabel>رقم العقد</FormLabel><FormControl><Input placeholder="CNT-2025-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="active">نشط</SelectItem>
                        <SelectItem value="draft">مسودة</SelectItem>
                        <SelectItem value="expired">منتهي</SelectItem>
                        <SelectItem value="terminated">مُنهى</SelectItem>
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="propertyId" render={({ field }) => (
                  <FormItem><FormLabel>العقار</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر العقار" /></SelectTrigger></FormControl>
                      <SelectContent>{properties.map((p: any) => <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem><FormLabel>الوحدة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر الوحدة" /></SelectTrigger></FormControl>
                      <SelectContent>{filteredRooms.map((r: any) => <SelectItem key={r.id} value={r.id.toString()}>{r.type} #{r.id}</SelectItem>)}</SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tenantName" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>اسم المستأجر</FormLabel><FormControl><Input placeholder="الاسم الكامل" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tenantPhone" render={({ field }) => (
                  <FormItem><FormLabel>رقم الجوال</FormLabel><FormControl><Input placeholder="05xxxxxxxx" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="tenantEmail" render={({ field }) => (
                  <FormItem><FormLabel>البريد الإلكتروني</FormLabel><FormControl><Input type="email" placeholder="name@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ البداية</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="endDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ الانتهاء</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="monthlyRent" render={({ field }) => (
                  <FormItem><FormLabel>الإيجار الشهري (ريال)</FormLabel><FormControl><Input type="number" placeholder="3500" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="depositAmount" render={({ field }) => (
                  <FormItem><FormLabel>مبلغ التأمين (ريال)</FormLabel><FormControl><Input type="number" placeholder="7000" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ملاحظات</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ العقد"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
