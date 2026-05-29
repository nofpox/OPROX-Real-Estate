import React from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateBooking, getListBookingsQueryKey, useListRooms } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";

const bookingSchema = z.object({
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  roomId: z.coerce.number().min(1),
  checkIn: z.string().min(1),
  checkOut: z.string().min(1),
  totalAmount: z.coerce.number().min(0),
  notes: z.string().optional(),
});

type BookingFormValues = z.infer<typeof bookingSchema>;

export default function NewBooking() {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createBooking = useCreateBooking();
  const { data: rooms } = useListRooms();

  const form = useForm<BookingFormValues>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      guestName: "", guestEmail: "", guestPhone: "",
      checkIn: new Date().toISOString().split("T")[0],
      checkOut: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      totalAmount: 0, notes: "",
    },
  });

  const availableRooms = rooms?.filter((r) => r.status === "available") || [];

  const watchRoomId = form.watch("roomId");
  const watchCheckIn = form.watch("checkIn");
  const watchCheckOut = form.watch("checkOut");

  React.useEffect(() => {
    if (watchRoomId && watchCheckIn && watchCheckOut) {
      const room = rooms?.find((r) => r.id === watchRoomId);
      if (room) {
        const start = new Date(watchCheckIn + "T00:00:00");
        const end = new Date(watchCheckOut + "T00:00:00");
        const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays > 0) form.setValue("totalAmount", room.pricePerNight * diffDays);
      }
    }
  }, [watchRoomId, watchCheckIn, watchCheckOut, rooms, form]);

  const onSubmit = (data: BookingFormValues) => {
    createBooking.mutate({ data }, {
      onSuccess: () => {
        toast({ title: t("bookings.createSuccess") });
        queryClient.invalidateQueries({ queryKey: getListBookingsQueryKey() });
        setLocation("/bookings");
      },
      onError: () => { toast({ title: t("bookings.createFailed"), variant: "destructive" }); },
    });
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/bookings")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-serif font-bold tracking-tight">{t("bookings.new_form.title")}</h1>
      </div>

      <Card className="shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>{t("bookings.new_form.cardTitle")}</CardTitle>
          <CardDescription>{t("bookings.new_form.cardDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="guestName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.guestName")}</FormLabel>
                    <FormControl><Input placeholder={t("bookings.new_form.guestNamePlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="guestEmail" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.email")}</FormLabel>
                    <FormControl><Input type="email" placeholder={t("bookings.new_form.emailPlaceholder")} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="guestPhone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.phone")}</FormLabel>
                    <FormControl><Input placeholder={t("bookings.new_form.phonePlaceholder")} {...field} value={field.value || ""} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="roomId" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.room")}</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val, 10))} value={field.value ? String(field.value) : ""}>
                      <FormControl><SelectTrigger><SelectValue placeholder={t("bookings.new_form.selectRoom")} /></SelectTrigger></FormControl>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.id} value={String(room.id)}>
                            {room.name} — {room.type} (${room.pricePerNight}{t("bookings.new_form.perNight")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="checkIn" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.checkIn")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="checkOut" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("bookings.new_form.checkOut")}</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="totalAmount" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bookings.new_form.totalAmount")}</FormLabel>
                  <FormControl><Input type="number" min="0" step="0.01" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("bookings.new_form.notes")}</FormLabel>
                  <FormControl><Textarea placeholder={t("bookings.new_form.notesPlaceholder")} {...field} value={field.value || ""} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" type="button" onClick={() => setLocation("/bookings")}>
                  {t("common.cancel")}
                </Button>
                <Button type="submit" disabled={createBooking.isPending}>
                  {createBooking.isPending && <Loader2 className="me-2 h-4 w-4 animate-spin" />}
                  {t("bookings.new_form.create")}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
