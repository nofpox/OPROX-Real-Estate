import React, { useState } from "react";
import {
  useListShifts,
  getListShiftsQueryKey,
  useCreateShift,
  useDeleteShift,
  useListStaff,
  useListProperties,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronRight, Plus, Trash2, Clock, Sun, Sunset, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SHIFT_TYPES = [
  { id: "morning", label: "Morning", time: "07:00 – 15:00", start: "07:00", end: "15:00", icon: Sun },
  { id: "afternoon", label: "Afternoon", time: "12:00 – 20:00", start: "12:00", end: "20:00", icon: Sunset },
  { id: "evening", label: "Evening", time: "15:00 – 23:00", start: "15:00", end: "23:00", icon: Sunset },
  { id: "night", label: "Night", time: "23:00 – 07:00", start: "23:00", end: "07:00", icon: Moon },
];

const SHIFT_COLORS: Record<string, string> = {
  morning: "bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-300",
  afternoon: "bg-blue-100 border-blue-300 text-blue-900 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-300",
  evening: "bg-purple-100 border-purple-300 text-purple-900 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300",
  night: "bg-slate-100 border-slate-300 text-slate-700 dark:bg-slate-900/40 dark:border-slate-700 dark:text-slate-400",
};

const shiftSchema = z.object({
  staffId: z.coerce.number().min(1, "Staff member required"),
  propertyId: z.coerce.number().min(1, "Property required"),
  date: z.string().min(1, "Date required"),
  shiftType: z.enum(["morning", "afternoon", "evening", "night"]),
  startTime: z.string().min(1, "Start time required"),
  endTime: z.string().min(1, "End time required"),
  notes: z.string().optional().or(z.literal("")),
});

function getWeekDates(anchor: Date): Date[] {
  const d = new Date(anchor);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((day + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + i);
    return date;
  });
}

function dateKey(d: Date) {
  return d.toISOString().split("T")[0];
}

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function StaffShifts() {
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [selectedProperty, setSelectedProperty] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [preselectedDate, setPreselectedDate] = useState<string>("");

  const weekDates = getWeekDates(weekAnchor);
  const startDate = dateKey(weekDates[0]);
  const endDate = dateKey(weekDates[6]);

  const queryParams: any = { startDate, endDate };
  if (selectedProperty !== "all") queryParams.propertyId = parseInt(selectedProperty);

  const { data: shifts, isLoading } = useListShifts(queryParams);
  const { data: staff } = useListStaff({});
  const { data: properties } = useListProperties();

  const createShift = useCreateShift();
  const deleteShift = useDeleteShift();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof shiftSchema>>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      staffId: undefined,
      propertyId: selectedProperty !== "all" ? parseInt(selectedProperty) : undefined,
      date: preselectedDate || dateKey(new Date()),
      shiftType: "morning",
      startTime: "07:00",
      endTime: "15:00",
      notes: "",
    },
  });

  const watchedShiftType = form.watch("shiftType");

  const shiftsByDate = weekDates.reduce<Record<string, typeof shifts>>((acc, d) => {
    const key = dateKey(d);
    acc[key] = shifts?.filter((s) => s.date === key) || [];
    return acc;
  }, {});

  const handleOpenDialog = (date?: string) => {
    const d = date || dateKey(new Date());
    setPreselectedDate(d);
    form.reset({
      staffId: undefined,
      propertyId: selectedProperty !== "all" ? parseInt(selectedProperty) : undefined,
      date: d,
      shiftType: "morning",
      startTime: "07:00",
      endTime: "15:00",
      notes: "",
    });
    setIsDialogOpen(true);
  };

  const handleShiftTypeChange = (type: string) => {
    form.setValue("shiftType", type as any);
    const preset = SHIFT_TYPES.find((t) => t.id === type);
    if (preset) {
      form.setValue("startTime", preset.start);
      form.setValue("endTime", preset.end);
    }
  };

  const handleDelete = (id: number) => {
    deleteShift.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Shift removed" });
        queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey(queryParams) });
      },
      onError: () => toast({ title: "Failed to remove shift", variant: "destructive" }),
    });
  };

  const onSubmit = (data: z.infer<typeof shiftSchema>) => {
    createShift.mutate({ data: { ...data, notes: data.notes || undefined } }, {
      onSuccess: () => {
        toast({ title: "Shift scheduled" });
        queryClient.invalidateQueries({ queryKey: getListShiftsQueryKey(queryParams) });
        setIsDialogOpen(false);
      },
      onError: () => toast({ title: "Failed to schedule shift", variant: "destructive" }),
    });
  };

  const prevWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() - 7);
    setWeekAnchor(d);
  };
  const nextWeek = () => {
    const d = new Date(weekAnchor);
    d.setDate(d.getDate() + 7);
    setWeekAnchor(d);
  };
  const goToday = () => setWeekAnchor(new Date());

  const today = dateKey(new Date());
  const weekLabel = (() => {
    const s = weekDates[0];
    const e = weekDates[6];
    if (s.getMonth() === e.getMonth()) {
      return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`;
    }
    return `${MONTH_NAMES[s.getMonth()]} ${s.getDate()} – ${MONTH_NAMES[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`;
  })();

  const totalShiftsThisWeek = shifts?.length || 0;
  const uniqueStaffThisWeek = new Set(shifts?.map((s) => s.staffId)).size;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold tracking-tight">Shift Schedule</h2>
          <p className="text-muted-foreground text-sm mt-0.5">Weekly staff shift assignments across all properties.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px] bg-background">
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => handleOpenDialog()} className="font-semibold shadow-sm">
            <Plus className="mr-2 h-4 w-4" />
            Add Shift
          </Button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span><span className="font-semibold">{totalShiftsThisWeek}</span> shifts this week</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="text-muted-foreground"><span className="font-semibold text-foreground">{uniqueStaffThisWeek}</span> staff scheduled</div>
        {SHIFT_TYPES.map((t) => (
          <div key={t.id} className="hidden lg:flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded border ${SHIFT_COLORS[t.id]}`} />
            <span className="text-muted-foreground">{t.label}</span>
          </div>
        ))}
      </div>

      {/* Week Navigator */}
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={prevWeek}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" onClick={goToday} className="h-9">
          Today
        </Button>
        <Button variant="outline" size="icon" className="h-9 w-9" onClick={nextWeek}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="font-semibold text-sm ml-1">{weekLabel}</span>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">
        {weekDates.map((d, idx) => {
          const key = dateKey(d);
          const isToday = key === today;
          const dayShifts = shiftsByDate[key] || [];
          return (
            <div key={key} className="min-w-0">
              {/* Day Header */}
              <div className={`mb-2 rounded-lg px-2 py-2 text-center ${isToday ? "bg-primary text-primary-foreground" : "bg-muted/50"}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">{DAY_LABELS[idx]}</p>
                <p className={`text-lg font-bold leading-none mt-0.5 ${isToday ? "" : "text-foreground"}`}>{d.getDate()}</p>
              </div>

              {/* Shifts for this day */}
              <div className="space-y-1.5 min-h-[80px]">
                {isLoading ? (
                  <Skeleton className="h-14 w-full rounded-md" />
                ) : dayShifts.length === 0 ? null : (
                  dayShifts.map((shift) => (
                    <div
                      key={shift.id}
                      className={`relative rounded-md border px-2 py-1.5 text-xs ${SHIFT_COLORS[shift.shiftType] || SHIFT_COLORS.morning} group`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0.5 top-0.5 h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleDelete(shift.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                      <div className="flex items-center gap-1 mb-1">
                        <Avatar className="h-4 w-4">
                          <AvatarFallback className="text-[8px] font-bold bg-current/20">
                            {getInitials(shift.staffName || "?")}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-semibold truncate">{shift.staffName?.split(" ")[0]}</span>
                      </div>
                      <p className="opacity-75 capitalize">{shift.shiftType}</p>
                      <p className="opacity-60 text-[10px]">{shift.startTime}–{shift.endTime}</p>
                    </div>
                  ))
                )}
                {/* Add shift button per day */}
                <button
                  onClick={() => handleOpenDialog(key)}
                  className="w-full rounded-md border border-dashed border-border/60 py-1.5 text-[11px] text-muted-foreground hover:bg-muted/50 hover:border-primary/40 hover:text-primary transition-colors"
                >
                  + Add
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Shift Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Schedule Shift</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="staffId"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Staff Member *</FormLabel>
                      <Select onValueChange={(v) => field.onChange(Number(v))} value={field.value?.toString() || ""}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select staff" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {staff?.filter((s) => s.status === "active").map((s) => (
                            <SelectItem key={s.id} value={s.id.toString()}>{s.name} — {s.role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date *</FormLabel>
                      <FormControl><Input type="date" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Shift type selector */}
              <FormField
                control={form.control}
                name="shiftType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Shift Type</FormLabel>
                    <div className="grid grid-cols-4 gap-2">
                      {SHIFT_TYPES.map((t) => {
                        const Icon = t.icon;
                        const isSelected = field.value === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleShiftTypeChange(t.id)}
                            className={`flex flex-col items-center gap-1 rounded-lg border-2 p-2.5 text-xs font-medium transition-all ${
                              isSelected
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:border-primary/50"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                            <span>{t.label}</span>
                            <span className="text-[10px] opacity-70">{t.time}</span>
                          </button>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input type="time" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Optional notes or instructions..." className="resize-none h-16" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={createShift.isPending}>Schedule Shift</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
