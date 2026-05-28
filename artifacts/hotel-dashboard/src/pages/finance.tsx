import React, { useState } from "react";
import { 
  useGetFinanceSummary,
  useGetFinanceMonthly,
  useListExpenses,
  getListExpensesQueryKey,
  useCreateExpense,
  useDeleteExpense,
  useListProperties,
  useListRooms
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
} from "@/components/ui/card";
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
  SelectValue 
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
  DialogFooter
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
import { Trash2, Plus, ArrowUpRight, ArrowDownRight, DollarSign, Receipt } from "lucide-react";
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
  Line
} from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const expenseCategories = [
  "Maintenance", "Payroll", "Utilities", "Insurance", "Renovation", 
  "Supplies", "Management", "Security", "Other"
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
  const { data: monthlyData, isLoading: isMonthlyLoading } = useGetFinanceMonthly(propertyId ? { propertyId } : {});
  
  const expenseParams = {
    ...(propertyId ? { propertyId } : {}),
    ...(categoryFilter !== "all" ? { category: categoryFilter } : {})
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
  const availableRooms = rooms?.filter(r => !selectedFormPropertyId || r.propertyId === selectedFormPropertyId) || [];

  const handleDeleteExpense = (id: number) => {
    if (confirm("Are you sure you want to delete this expense?")) {
      deleteExpense.mutate({ id }, {
        onSuccess: () => {
          toast({ title: "Expense deleted successfully" });
          queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(expenseParams) });
          // Note: In a real app we'd invalidate summaries and monthly too
        },
        onError: () => {
          toast({ title: "Failed to delete expense", variant: "destructive" });
        }
      });
    }
  };

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    const payload = {
      ...data,
      unitId: data.unitId ? Number(data.unitId) : undefined,
    };
    
    createExpense.mutate({ data: payload }, {
      onSuccess: () => {
        toast({ title: "Expense recorded successfully" });
        queryClient.invalidateQueries({ queryKey: getListExpensesQueryKey(expenseParams) });
        setIsDialogOpen(false);
        form.reset();
      },
      onError: () => {
        toast({ title: "Failed to record expense", variant: "destructive" });
      }
    });
  };

  // Calculate totals from summaries
  const filteredSummaries = propertyId 
    ? financeSummaries?.filter(s => s.propertyId === propertyId) 
    : financeSummaries;
    
  const totalRevenue = filteredSummaries?.reduce((sum, s) => sum + s.totalRevenue, 0) || 0;
  const totalExpenses = filteredSummaries?.reduce((sum, s) => sum + s.totalExpenses, 0) || 0;
  const totalNetIncome = filteredSummaries?.reduce((sum, s) => sum + s.netIncome, 0) || 0;
  const totalExpenseCount = filteredSummaries?.reduce((sum, s) => sum + s.expenseCount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">Finance</h1>
          <p className="text-muted-foreground mt-1">Revenue, expenses, and net income across your portfolio.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map(p => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
              <div className="rounded-full p-2 bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold">{isSummaryLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(totalRevenue)}</h2>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <div className="rounded-full p-2 bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <ArrowDownRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold">{isSummaryLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(totalExpenses)}</h2>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Net Income</p>
              <div className="rounded-full p-2 bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <DollarSign className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className={`text-3xl font-bold ${totalNetIncome >= 0 ? '' : 'text-red-600'}`}>
                {isSummaryLoading ? <Skeleton className="h-9 w-24" /> : formatCurrency(totalNetIncome)}
              </h2>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">Recorded Expenses</p>
              <div className="rounded-full p-2 bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Receipt className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <h2 className="text-3xl font-bold">{isSummaryLoading ? <Skeleton className="h-9 w-12" /> : totalExpenseCount}</h2>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Cash Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[350px] w-full">
            {isMonthlyLoading ? (
              <div className="h-full w-full flex items-center justify-center">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={monthlyData || []} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#888888" opacity={0.2} />
                  <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                  <YAxis 
                    yAxisId="left" 
                    tickFormatter={(val) => `$${val / 1000}k`} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar yAxisId="left" dataKey="expenses" name="Expenses" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Line yAxisId="left" type="monotone" dataKey="netIncome" name="Net Income" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProperty === "all" && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Property Performance</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20">
                  <TableHead>Property</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Expenses</TableHead>
                  <TableHead className="text-right">Net Income</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isSummaryLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8"><Skeleton className="h-4 w-32 mx-auto" /></TableCell></TableRow>
                ) : financeSummaries?.map(summary => (
                  <TableRow key={summary.propertyId}>
                    <TableCell className="font-medium">{summary.propertyName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">{summary.propertyType}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(summary.totalRevenue)}</TableCell>
                    <TableCell className="text-right text-destructive">{formatCurrency(summary.totalExpenses)}</TableCell>
                    <TableCell className={`text-right font-medium ${summary.netIncome >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
                      {formatCurrency(summary.netIncome)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-border/50">
        <CardHeader className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg">Recent Expenses</CardTitle>
          <div className="flex items-center gap-3">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {expenseCategories.map(c => (
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
                          <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString() || ""}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select property" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {properties?.map(p => (
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
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select unit (optional)" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="none">Property-wide (No unit)</SelectItem>
                                {availableRooms.map(r => (
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
                          <FormLabel>Title / Description *</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Plumbing repair, Electricity bill" {...field} />
                          </FormControl>
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
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {expenseCategories.map(c => (
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
                            <FormControl>
                              <Input type="number" step="0.01" min="0.01" {...field} />
                            </FormControl>
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
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
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
                          <FormControl>
                            <Textarea placeholder="Additional details..." className="resize-none" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="pt-4">
                      <Button type="submit" disabled={createExpense.isPending}>
                        Save Expense
                      </Button>
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
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                  </TableRow>
                ))
              ) : expenses?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                    No expenses found.
                  </TableCell>
                </TableRow>
              ) : (
                expenses?.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell>{new Date(expense.expenseDate + 'T00:00:00').toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{expense.propertyName}</span>
                        {expense.unitName && <span className="text-xs text-muted-foreground">Unit: {expense.unitName}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal text-xs">{expense.category}</Badge>
                    </TableCell>
                    <TableCell>{expense.title}</TableCell>
                    <TableCell className="text-right font-medium text-destructive">
                      -{formatCurrency(expense.amount)}
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteExpense(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
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