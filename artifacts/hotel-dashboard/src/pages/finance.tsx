import React, { useState } from "react";
import {
  useGetFinanceSummary,
  useGetFinanceMonthly,
  useListExpenses,
  getListExpensesQueryKey,
  useCreateExpense,
  useDeleteExpense,
  useListProperties,
  useListRooms,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Trash2,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);

const formatPct = (value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;

const expenseCategories = [
  "Maintenance", "Payroll", "Utilities", "Insurance", "Renovation",
  "Supplies", "Management", "Security", "Other",
];

const EXPENSE_COLORS = [
  "#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6","#f97316",
];

const expenseSchema = z.object({
  propertyId: z.coerce.number().min(1, "Property is required"),
  unitId: z.coerce.number().optional().or(z.literal("")),
  title: z.string().min(1, "Title is required"),
  category: z.string().min(1, "Category is required"),
  amount: z.coerce.number().min(0.01, "Amount must be positive"),
  expenseDate: z.string().min(1, "Date is required"),
  notes: z.string().optional(),
});

export default function Finance() {
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const propertyId = selectedProperty !== "all" ? parseInt(selectedProperty) : undefined;

  const { data: properties } = useListProperties();
  const { data: rooms } = useListRooms();
  const { data: financeSummaries, isLoading: isSummaryLoading } = useGetFinanceSummary();
  const { data: monthlyData, isLoading: isMonthlyLoading } = useGetFinanceMonthly(
    propertyId ? { propertyId } : {}
  );

  const expenseParams = {
    ...(propertyId ? { propertyId } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
  };

  const { data: expenses, isLoading: isExpensesLoading } = useListExpenses(expenseParams);
  const createExpense = useCreateExpense();
  const deleteExpense = useDeleteExpense();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof expenseSchema>>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      propertyId: undefined,
      unitId: "",
      title: "",
      category: "Maintenance",
      amount: 0,
      expenseDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  const selectedFormPropertyId = form.watch("propertyId");
  const availableRooms =
    rooms?.filter((r) => !selectedFormPropertyId || r.propertyId === selectedFormPropertyId) || [];

  const handleDeleteExpense = (id: number) => {
    if (confirm("Delete this expense?")) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Expense deleted" });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(expenseParams) });
        },
        onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
      });
    }
  };

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    createExpense.mutate(
      { data: { ...data, unitId: data.unitId ? Number(data.unitId) : undefined } },
      {
        onSuccess: () => {
          toast({ title: "Expense recorded" });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(expenseParams) });
          setIsDialogOpen(false);
          form.reset();
        },
        onError: () => toast({ title: "Failed to record expense", variant: "destructive" }),
      }
    );
  };

  const filteredSummaries = propertyId
    ? financeSummaries?.filter((s) => s.propertyId === propertyId)
    : financeSummaries;

  const totalRevenue = filteredSummaries?.reduce((s, r) => s + r.totalRevenue, 0) || 0;
  const totalExpenses = filteredSummaries?.reduce((s, r) => s + r.totalExpenses, 0) || 0;
  const totalNetIncome = filteredSummaries?.reduce((s, r) => s + r.netIncome, 0) || 0;
  const totalExpenseCount = filteredSummaries?.reduce((s, r) => s + r.expenseCount, 0) || 0;
  const profitMargin = totalRevenue > 0 ? (totalNetIncome / totalRevenue) * 100 : 0;

  // Expense breakdown by category from expense list
  const expenseByCategoryMap = expenses?.reduce<Record<string, number>>((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {}) || {};

  const expensePieData = Object.entries(expenseByCategoryMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1">Revenue, expenses, and net profit across your portfolio.</p>
        </div>
        <Select value={selectedProperty} onValueChange={setSelectedProperty}>
          <SelectTrigger className="w-[210px] bg-background">
            <SelectValue placeholder="All Properties" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Properties</SelectItem>
            {properties?.map((p) => (
              <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <div className="rounded-full p-1.5 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </div>
            {isSummaryLoading ? <Skeleton className="h-9 w-24" /> : (
              <h2 className="text-2xl font-bold">{formatCurrency(totalRevenue)}</h2>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Expenses</p>
              <div className="rounded-full p-1.5 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <ArrowDownRight className="h-3.5 w-3.5" />
              </div>
            </div>
            {isSummaryLoading ? <Skeleton className="h-9 w-24" /> : (
              <h2 className="text-2xl font-bold">{formatCurrency(totalExpenses)}</h2>
            )}
          </CardContent>
        </Card>
        <Card className={`shadow-sm lg:col-span-1 ${totalNetIncome < 0 ? "border-destructive/40" : ""}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Net Profit</p>
              <div className={`rounded-full p-1.5 ${totalNetIncome >= 0 ? "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" : "bg-red-100 text-red-600"}`}>
                <DollarSign className="h-3.5 w-3.5" />
              </div>
            </div>
            {isSummaryLoading ? <Skeleton className="h-9 w-24" /> : (
              <h2 className={`text-2xl font-bold ${totalNetIncome < 0 ? "text-destructive" : ""}`}>
                {formatCurrency(totalNetIncome)}
              </h2>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
              <div className={`rounded-full p-1.5 ${profitMargin >= 0 ? "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400" : "bg-red-100 text-red-600"}`}>
                {profitMargin >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
              </div>
            </div>
            {isSummaryLoading ? <Skeleton className="h-9 w-16" /> : (
              <h2 className={`text-2xl font-bold ${profitMargin < 0 ? "text-destructive" : "text-teal-600 dark:text-teal-400"}`}>
                {formatPct(profitMargin)}
              </h2>
            )}
          </CardContent>
        </Card>
        <Card className="shadow-sm lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">Expenses Logged</p>
              <div className="rounded-full p-1.5 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Receipt className="h-3.5 w-3.5" />
              </div>
            </div>
            {isSummaryLoading ? <Skeleton className="h-9 w-12" /> : (
              <h2 className="text-2xl font-bold">{totalExpenseCount}</h2>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Cash Flow Chart */}
        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Monthly Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              {isMonthlyLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={monthlyData || []} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.15} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} dy={8} />
                    <YAxis
                      tickFormatter={(v) => `$${v / 1000}k`}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11 }}
                      width={48}
                    />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 16, fontSize: 12 }} />
                    <Bar dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4,4,0,0]} maxBarSize={32} />
                    <Bar dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4,4,0,0]} maxBarSize={32} />
                    <Line dataKey="netIncome" name="Net Profit" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Breakdown Donut */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expenses by Category</CardTitle>
          </CardHeader>
          <CardContent>
            {isExpensesLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : expensePieData.length === 0 ? (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground text-sm">No expense data</div>
            ) : (
              <div className="h-[280px] flex flex-col">
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={expensePieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {expensePieData.map((_, i) => (
                        <Cell key={i} fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ borderRadius: "8px", border: "none" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 overflow-auto">
                  {expensePieData.slice(0, 5).map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: EXPENSE_COLORS[i % EXPENSE_COLORS.length] }}
                        />
                        <span className="text-muted-foreground">{item.name}</span>
                      </div>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-Property Breakdown */}
      {selectedProperty === "all" && (
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Property Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Profit</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">Revenue Share</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSummaryLoading ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
                ) : financeSummaries?.map((s) => {
                  const margin = s.totalRevenue > 0 ? (s.netIncome / s.totalRevenue) * 100 : 0;
                  const revenueShare = totalRevenue > 0 ? (s.totalRevenue / totalRevenue) * 100 : 0;
                  return (
                    <TableRow key={s.propertyId}>
                      <TableCell className="font-medium">{s.propertyName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal text-xs">{s.propertyType}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(s.totalRevenue)}</TableCell>
                      <TableCell className="text-right text-destructive">{formatCurrency(s.totalExpenses)}</TableCell>
                      <TableCell className={`text-right font-semibold ${s.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                        {formatCurrency(s.netIncome)}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                          margin >= 40 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                          : margin >= 20 ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                        }`}>
                          {margin >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {formatPct(margin)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${Math.min(revenueShare, 100)}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8 text-right">{revenueShare.toFixed(0)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Expenses Table */}
      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base">Expense Records</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Record New Expense</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="propertyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property *</FormLabel>
                          <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                            <FormControl><SelectTrigger><SelectValue placeholder="Select property" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {properties?.map((p) => (
                                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {selectedFormPropertyId && availableRooms.length > 0 && (
                      <FormField
                        control={form.control}
                        name="unitId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit / Room (Optional)</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value?.toString() || ""}>
                              <FormControl><SelectTrigger><SelectValue placeholder="Property-wide" /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="none">Property-wide</SelectItem>
                                {availableRooms.map((r) => (
                                  <SelectItem key={r.id} value={r.id.toString()}>{r.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title *</FormLabel>
                          <FormControl><Input placeholder="e.g. Plumbing repair, Electricity bill" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category *</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                {expenseCategories.map((c) => (
                                  <SelectItem key={c} value={c}>{c}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Amount ($) *</FormLabel>
                            <FormControl><Input type="number" step="0.01" min="0.01" {...field} /></FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date *</FormLabel>
                          <FormControl><Input type="date" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl><Textarea placeholder="Additional details..." className="resize-none" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <DialogFooter>
                      <Button type="submit" disabled={createExpense.isPending}>Save Expense</Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Property</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Title</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isExpensesLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : expenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No expenses found.</TableCell>
                </TableRow>
              ) : (
                expenses?.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-sm">
                      {new Date(expense.expenseDate + "T00:00:00").toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{expense.propertyName}</span>
                        {expense.unitName && (
                          <span className="text-xs text-muted-foreground">{expense.unitName}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">{expense.category}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{expense.title}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(Number(expense.amount))}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
