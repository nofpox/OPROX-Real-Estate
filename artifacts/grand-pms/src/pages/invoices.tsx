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
import { Plus, Trash2, Receipt, CheckCircle2, Clock, AlertCircle, DollarSign, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${BASE}/api${path}`, { credentials: "include", ...opts, headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) } });
  if (!res.ok) throw new Error(await res.text());
  if (res.status === 204) return null;
  return res.json();
}

const invoiceSchema = z.object({
  propertyId: z.coerce.number().min(1, "اختر العقار"),
  roomId: z.coerce.number().min(1, "اختر الوحدة"),
  contractId: z.coerce.number().optional(),
  invoiceNumber: z.string().min(1, "رقم الفاتورة مطلوب"),
  tenantName: z.string().min(1, "اسم المستأجر مطلوب"),
  amount: z.string().min(1, "المبلغ مطلوب"),
  issuedDate: z.string().min(1, "تاريخ الإصدار مطلوب"),
  dueDate: z.string().min(1, "تاريخ الاستحقاق مطلوب"),
  status: z.enum(["pending", "paid", "overdue", "cancelled"]).default("pending"),
  notes: z.string().optional(),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "paid":      return <Badge className="bg-green-100 text-green-800 border-0">مدفوعة</Badge>;
    case "pending":   return <Badge className="bg-amber-100 text-amber-800 border-0">معلقة</Badge>;
    case "overdue":   return <Badge className="bg-red-100 text-red-800 border-0">متأخرة</Badge>;
    case "cancelled": return <Badge className="bg-slate-100 text-slate-700 border-0">ملغاة</Badge>;
    default:          return <Badge variant="outline">{status}</Badge>;
  }
}

export default function Invoices() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [filterStatus, setFilterStatus] = useState("all");

  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["invoices", filterStatus],
    queryFn: () => apiFetch(`/invoices${filterStatus !== "all" ? `?status=${filterStatus}` : ""}`),
  });

  const { data: properties = [] } = useQuery({ queryKey: ["properties-list"], queryFn: () => apiFetch("/properties") });
  const { data: rooms = [] } = useQuery({ queryKey: ["rooms-list"], queryFn: () => apiFetch("/rooms") });
  const { data: contracts = [] } = useQuery({ queryKey: ["contracts"], queryFn: () => apiFetch("/contracts") });

  const form = useForm<InvoiceFormValues>({ resolver: zodResolver(invoiceSchema), defaultValues: { status: "pending" } });

  const saveMutation = useMutation({
    mutationFn: (data: InvoiceFormValues) =>
      editing ? apiFetch(`/invoices/${editing.id}`, { method: "PATCH", body: JSON.stringify(data) })
               : apiFetch("/invoices", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); setIsOpen(false); setEditing(null); form.reset(); toast({ title: editing ? "تم التحديث" : "تم الإنشاء", description: "تم حفظ الفاتورة بنجاح" }); },
    onError: () => toast({ title: "خطأ", description: "فشل الحفظ", variant: "destructive" }),
  });

  const payMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/invoices/${id}/pay`, { method: "PATCH" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم الدفع", description: "تم تحديث حالة الفاتورة إلى مدفوعة" }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiFetch(`/invoices/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["invoices"] }); toast({ title: "تم الحذف" }); },
  });

  function openNew() { setEditing(null); form.reset({ status: "pending", issuedDate: new Date().toISOString().slice(0, 10) }); setIsOpen(true); }
  function openEdit(inv: any) { setEditing(inv); form.reset({ ...inv }); setIsOpen(true); }

  const filteredRooms = form.watch("propertyId") ? rooms.filter((r: any) => r.propertyId === Number(form.watch("propertyId"))) : rooms;

  const totalPaid    = invoices.filter((i: any) => i.status === "paid").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalPending = invoices.filter((i: any) => i.status === "pending").reduce((s: number, i: any) => s + Number(i.amount), 0);
  const totalOverdue = invoices.filter((i: any) => i.status === "overdue").reduce((s: number, i: any) => s + Number(i.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold text-foreground">الفواتير</h1>
          <p className="text-sm text-muted-foreground mt-1">إصدار وتتبع فواتير الإيجار</p>
        </div>
        <Button onClick={openNew} className="gap-2"><Plus className="h-4 w-4" />فاتورة جديدة</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "إجمالي المحصّل", value: totalPaid, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50" },
          { label: "في الانتظار", value: totalPending, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "متأخرة", value: totalOverdue, icon: AlertCircle, color: "text-red-600", bg: "bg-red-50" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className={`p-4 flex items-center gap-3 ${s.bg} rounded-lg`}>
              <s.icon className={`h-8 w-8 ${s.color}`} />
              <div>
                <div className="text-2xl font-bold">{s.value.toLocaleString()} ريال</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base">قائمة الفواتير</CardTitle>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="pending">معلقة</SelectItem>
                <SelectItem value="paid">مدفوعة</SelectItem>
                <SelectItem value="overdue">متأخرة</SelectItem>
                <SelectItem value="cancelled">ملغاة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">جارٍ التحميل...</div>
          ) : invoices.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>لا توجد فواتير بعد</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الفاتورة</TableHead>
                  <TableHead>المستأجر</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead>تاريخ الإصدار</TableHead>
                  <TableHead>الاستحقاق</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm cursor-pointer" onClick={() => openEdit(inv)}>{inv.invoiceNumber}</TableCell>
                    <TableCell className="cursor-pointer" onClick={() => openEdit(inv)}>{inv.tenantName}</TableCell>
                    <TableCell className="font-medium cursor-pointer" onClick={() => openEdit(inv)}>{Number(inv.amount).toLocaleString()} ريال</TableCell>
                    <TableCell className="text-sm cursor-pointer" onClick={() => openEdit(inv)}>{inv.issuedDate}</TableCell>
                    <TableCell className="text-sm cursor-pointer" onClick={() => openEdit(inv)}>{inv.dueDate}</TableCell>
                    <TableCell><StatusBadge status={inv.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {inv.status === "pending" || inv.status === "overdue" ? (
                          <Button variant="outline" size="sm" className="h-7 text-xs text-green-700 border-green-200 hover:bg-green-50"
                            onClick={() => payMutation.mutate(inv.id)}>تحصيل</Button>
                        ) : null}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { if (confirm("حذف هذه الفاتورة؟")) deleteMutation.mutate(inv.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
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
            <DialogTitle>{editing ? "تعديل الفاتورة" : "فاتورة إيجار جديدة"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="invoiceNumber" render={({ field }) => (
                  <FormItem><FormLabel>رقم الفاتورة</FormLabel><FormControl><Input placeholder="INV-2025-001" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="pending">معلقة</SelectItem>
                        <SelectItem value="paid">مدفوعة</SelectItem>
                        <SelectItem value="overdue">متأخرة</SelectItem>
                        <SelectItem value="cancelled">ملغاة</SelectItem>
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
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem><FormLabel>المبلغ (ريال)</FormLabel><FormControl><Input type="number" placeholder="3500" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contractId" render={({ field }) => (
                  <FormItem><FormLabel>العقد المرتبط (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value?.toString()}>
                      <FormControl><SelectTrigger><SelectValue placeholder="اختر العقد" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="">بدون عقد</SelectItem>
                        {contracts.map((c: any) => <SelectItem key={c.id} value={c.id.toString()}>{c.contractNumber} — {c.tenantName}</SelectItem>)}
                      </SelectContent>
                    </Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="issuedDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ الإصدار</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="dueDate" render={({ field }) => (
                  <FormItem><FormLabel>تاريخ الاستحقاق</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem className="col-span-2"><FormLabel>ملاحظات</FormLabel><FormControl><Textarea rows={2} {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>إلغاء</Button>
                <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? "جارٍ الحفظ..." : "حفظ الفاتورة"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
