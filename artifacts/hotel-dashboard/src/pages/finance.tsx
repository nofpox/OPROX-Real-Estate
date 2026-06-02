import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, Trash2, TrendingUp, TrendingDown, DollarSign, BarChart3, Receipt,
} from "lucide-react";
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

interface PropertySummary {
  propertyId: number;
  propertyName: string;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  bookingCount: number;
  expenseCount: number;
}
interface MonthlyData { month: string; revenue: number; expenses: number; netIncome: number; }
interface Expense {
  id: number; propertyId: number; propertyName: string; unitName: string | null;
  title: string; category: string; amount: number; expenseDate: string; notes: string | null;
}
interface Property { id: number; name: string; }

const CATEGORY_COLORS: Record<string, string> = {
  maintenance: "#f59e0b", utilities: "#3b82f6", payroll: "#8b5cf6",
  insurance: "#10b981", renovation: "#ef4444", supplies: "#06b6d4",
  management: "#6366f1", security: "#64748b", other: "#94a3b8",
};

const fmtMoney = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const BLANK_FORM = {
  propertyId: "", title: "", category: "other", amount: "",
  expenseDate: new Date().toISOString().slice(0, 10), notes: "",
};

export default function Finance() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [catFilter, setCatFilter] = useState("all");
  const [form, setForm] = useState(BLANK_FORM);

  const { data: summary = [] } = useQuery<PropertySummary[]>({
    queryKey: ["finance-summary"],
    queryFn: () => fetch("/api/finance/summary", { credentials: "include" }).then(r => r.json()),
  });
  const { data: monthly = [] } = useQuery<MonthlyData[]>({
    queryKey: ["finance-monthly"],
    queryFn: () => fetch("/api/finance/monthly?months=6", { credentials: "include" }).then(r => r.json()),
  });
  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: () => fetch("/api/expenses", { credentials: "include" }).then(r => r.json()),
  });
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["properties"],
    queryFn: () => fetch("/api/properties", { credentials: "include" }).then(r => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/expenses/${id}`, { method: "DELETE", credentials: "include" }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: t("finance.toast.deleted") });
    },
    onError: () => toast({ title: t("finance.toast.deleteFailed"), variant: "destructive" }),
  });

  const addMutation = useMutation({
    mutationFn: (data: typeof form) =>
      fetch("/api/expenses", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          propertyId: Number(data.propertyId),
          amount: data.amount,
        }),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      qc.invalidateQueries({ queryKey: ["finance-summary"] });
      toast({ title: t("finance.toast.recorded") });
      setAddOpen(false);
      setForm(BLANK_FORM);
    },
    onError: () => toast({ title: t("finance.toast.recordFailed"), variant: "destructive" }),
  });

  const totalRevenue = summary.reduce((s, p) => s + p.totalRevenue, 0);
  const totalExpenses = summary.reduce((s, p) => s + p.totalExpenses, 0);
  const netProfit = totalRevenue - totalExpenses;
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
  const expCount = summary.reduce((s, p) => s + p.expenseCount, 0);

  const catMap: Record<string, number> = {};
  for (const e of expenses) catMap[e.category] = (catMap[e.category] ?? 0) + e.amount;
  const pieData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const categories = [...new Set(expenses.map(e => e.category))];
  const filtered = catFilter === "all" ? expenses : expenses.filter(e => e.category === catFilter);

  const kpis = [
    { label: t("finance.kpi.revenue"),        value: fmtMoney(totalRevenue),   icon: TrendingUp,   color: "text-green-600" },
    { label: t("finance.kpi.expenses"),       value: fmtMoney(totalExpenses),  icon: TrendingDown, color: "text-red-500"   },
    { label: t("finance.kpi.netProfit"),      value: fmtMoney(netProfit),      icon: DollarSign,   color: netProfit >= 0 ? "text-green-600" : "text-red-500" },
    { label: t("finance.kpi.profitMargin"),   value: `${margin.toFixed(1)}%`,  icon: BarChart3,    color: "text-blue-600"  },
    { label: t("finance.kpi.expensesLogged"), value: String(expCount),         icon: Receipt,      color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("finance.title")}</h1>
          <p className="text-muted-foreground mt-1">{t("finance.subtitle")}</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4 me-2" />{t("finance.addExpense")}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {kpis.map(({ label, value, icon: Icon, color }) => (
          <Card key={label}>
            <CardContent className="pt-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className={`text-xl font-bold mt-0.5 ${color}`}>{value}</p>
                </div>
                <Icon className={`h-5 w-5 ${color} opacity-60 shrink-0`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("finance.monthlyCashFlow")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthly} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtMoney(v)} />
                <Legend />
                <Bar dataKey="revenue"  name={t("finance.kpi.revenue")}   fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="expenses" name={t("finance.kpi.expenses")}  fill="#ef4444" radius={[3,3,0,0]} />
                <Line dataKey="netIncome" name={t("finance.kpi.netProfit")} stroke="#6366f1" strokeWidth={2} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("finance.expensesByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="flex items-center justify-center h-[220px] text-muted-foreground text-sm">
                {t("finance.noExpenseData")}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                    {pieData.map(entry => (
                      <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name.toLowerCase()] ?? "#94a3b8"} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtMoney(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Property performance */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("finance.propertyPerformance")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.columns.property")}</TableHead>
                <TableHead className="text-right">{t("finance.columns.revenue")}</TableHead>
                <TableHead className="text-right">{t("finance.columns.expenses")}</TableHead>
                <TableHead className="text-right">{t("finance.columns.netProfit")}</TableHead>
                <TableHead className="text-right">{t("finance.columns.margin")}</TableHead>
                <TableHead>{t("finance.columns.revenueShare")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.map(p => {
                const m = p.totalRevenue > 0 ? ((p.totalRevenue - p.totalExpenses) / p.totalRevenue * 100) : 0;
                const share = totalRevenue > 0 ? (p.totalRevenue / totalRevenue) * 100 : 0;
                return (
                  <TableRow key={p.propertyId}>
                    <TableCell className="font-medium">{p.propertyName}</TableCell>
                    <TableCell className="text-right text-green-600">{fmtMoney(p.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-red-500">{fmtMoney(p.totalExpenses)}</TableCell>
                    <TableCell className={`text-right font-medium ${p.netIncome >= 0 ? "text-green-600" : "text-red-500"}`}>{fmtMoney(p.netIncome)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{m.toFixed(1)}%</TableCell>
                    <TableCell className="w-36">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full overflow-hidden h-1.5">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${share}%` }} />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{share.toFixed(0)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Expense ledger */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{t("finance.expenseRecords")}</CardTitle>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("finance.allCategories")}</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("finance.table.date")}</TableHead>
                <TableHead>{t("finance.table.property")}</TableHead>
                <TableHead>{t("finance.table.category")}</TableHead>
                <TableHead>{t("finance.table.title")}</TableHead>
                <TableHead className="text-right">{t("finance.table.amount")}</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    {t("finance.noExpenses")}
                  </TableCell>
                </TableRow>
              ) : filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(e.expenseDate + "T00:00:00").toLocaleDateString()}
                  </TableCell>
                  <TableCell>{e.propertyName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">{e.category}</Badge>
                  </TableCell>
                  <TableCell>{e.title}</TableCell>
                  <TableCell className="text-right font-medium text-red-500">{fmtMoney(e.amount)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost" size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (window.confirm(t("finance.deleteConfirm"))) deleteMutation.mutate(e.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add Expense Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("finance.recordExpense")}</DialogTitle>
          </DialogHeader>
          <form className="space-y-3" onSubmit={e => { e.preventDefault(); addMutation.mutate(form); }}>
            <div className="space-y-1.5">
              <Label>{t("finance.fields.property")}</Label>
              <Select value={form.propertyId} onValueChange={v => setForm(f => ({ ...f, propertyId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder={t("finance.fields.selectProperty")} />
                </SelectTrigger>
                <SelectContent>
                  {(properties as Property[]).map(p => (
                    <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>{t("finance.fields.title")}</Label>
              <Input
                placeholder={t("finance.fields.titlePlaceholder")}
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("finance.fields.category")}</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["maintenance","payroll","utilities","insurance","renovation","supplies","management","security","other"].map(c => (
                      <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("finance.fields.amount")}</Label>
                <Input
                  type="number" min="0" step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>{t("finance.fields.date")}</Label>
              <Input
                type="date" value={form.expenseDate}
                onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>{t("finance.fields.notes")}</Label>
              <Input
                placeholder={t("finance.fields.notesPlaceholder")}
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" className="flex-1" disabled={addMutation.isPending}>
                {addMutation.isPending ? "Saving…" : t("finance.saveExpense")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
