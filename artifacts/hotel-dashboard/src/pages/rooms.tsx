import React, { useState } from "react";
  import {
    useListRooms, getListRoomsQueryKey, useCreateRoom, useUpdateRoom, useDeleteRoom
  } from "@workspace/api-client-react";
  import { useQueryClient } from "@tanstack/react-query";
  import { Card, CardContent } from "@/components/ui/card";
  import { Button } from "@/components/ui/button";
  import { Badge } from "@/components/ui/badge";
  import { Skeleton } from "@/components/ui/skeleton";
  import { Input } from "@/components/ui/input";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
  import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
  import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
  import { useForm } from "react-hook-form";
  import { zodResolver } from "@hookform/resolvers/zod";
  import * as z from "zod";
  import { Search, Plus, MoreHorizontal, Pencil, Trash2, QrCode } from "lucide-react";
  import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
  import { useToast } from "@/hooks/use-toast";
  import { type Room } from "@workspace/api-client-react";
  import { useTranslation } from "react-i18next";
  import QRCodeSVG from "react-qr-code";

  const RoomStatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    switch (status.toLowerCase()) {
      case "available":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0 dark:bg-green-900/30 dark:text-green-400">{t("status.available")}</Badge>;
      case "occupied":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-0 dark:bg-blue-900/30 dark:text-blue-400">{t("status.occupied")}</Badge>;
      case "maintenance":
        return <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 border-0 dark:bg-orange-900/30 dark:text-orange-400">{t("status.maintenance")}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const roomSchema = z.object({
    name: z.string().min(1),
    type: z.string().min(1),
    status: z.string().min(1),
    capacity: z.coerce.number().min(1),
  });

  export default function Rooms() {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRoom, setEditingRoom] = useState<Room | null>(null);
    const [qrRoom, setQrRoom] = useState<Room | null>(null);

    const { data: rooms, isLoading } = useListRooms();
    const createRoom = useCreateRoom();
    const updateRoom = useUpdateRoom();
    const deleteRoom = useDeleteRoom();
    const queryClient = useQueryClient();
    const { toast } = useToast();

    const form = useForm<z.infer<typeof roomSchema>>({
      resolver: zodResolver(roomSchema),
      defaultValues: { name: "", type: "Standard", status: "available", capacity: 2 },
    });

    const handleEdit = (room: Room) => {
      setEditingRoom(room);
      form.reset({ name: room.name, type: room.type, status: room.status, capacity: room.capacity || 2 });
      setIsDialogOpen(true);
    };

    const handleDelete = (id: number) => {
      if (confirm(t("rooms.deleteConfirm"))) {
        deleteRoom.mutate({ id }, {
          onSuccess: () => { toast({ title: t("rooms.deleteSuccess") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); },
          onError: () => { toast({ title: t("rooms.deleteFailed"), variant: "destructive" }); },
        });
      }
    };

    const onSubmit = (data: z.infer<typeof roomSchema>) => {
      const payload = { ...data, pricePerNight: editingRoom?.pricePerNight ?? 0 };
      if (editingRoom) {
        updateRoom.mutate({ id: editingRoom.id, data: payload }, {
          onSuccess: () => { toast({ title: t("rooms.updateSuccess") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); setIsDialogOpen(false); },
          onError: () => { toast({ title: t("rooms.updateFailed"), variant: "destructive" }); },
        });
      } else {
        createRoom.mutate({ data: payload }, {
          onSuccess: () => { toast({ title: t("rooms.createSuccess") }); queryClient.invalidateQueries({ queryKey: getListRoomsQueryKey() }); setIsDialogOpen(false); },
          onError: () => { toast({ title: t("rooms.createFailed"), variant: "destructive" }); },
        });
      }
    };

    const onOpenChange = (open: boolean) => {
      setIsDialogOpen(open);
      if (!open) { setEditingRoom(null); form.reset({ name: "", type: "Standard", status: "available", capacity: 2 }); }
    };

    const filteredRooms = rooms?.filter(
      (r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()) || r.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Guest portal URL for QR code
    const guestPortalUrl = (roomId: number) => {
      const base = typeof window !== "undefined" ? window.location.origin : "";
      return `${base}/guest-portal/unit/${roomId}`;
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{t("rooms.title")}</h1>
            <p className="text-muted-foreground mt-1">{t("rooms.subtitle")}</p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
              <Button className="font-semibold shadow-sm">
                <Plus className="me-2 h-4 w-4" />
                {t("rooms.addRoom")}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingRoom ? t("rooms.editRoom") : t("rooms.addNewRoom")}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rooms.fields.name")}</FormLabel>
                      <FormControl><Input placeholder={t("rooms.fields.namePlaceholder")} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="type" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("rooms.fields.type")}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder={t("rooms.fields.selectType")} /></SelectTrigger></FormControl>
                          <SelectContent>
                            {(["Standard", "Deluxe", "Suite", "Presidential"] as const).map((type) => (
                              <SelectItem key={type} value={type}>{t(`rooms.types.${type}`)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="capacity" render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("rooms.fields.capacity")}</FormLabel>
                        <FormControl><Input type="number" min="1" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("rooms.fields.status")}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder={t("rooms.fields.selectStatus")} /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="available">{t("status.available")}</SelectItem>
                          <SelectItem value="occupied">{t("status.occupied")}</SelectItem>
                          <SelectItem value="maintenance">{t("status.maintenance")}</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <DialogFooter className="pt-4">
                    <Button type="submit" disabled={createRoom.isPending || updateRoom.isPending}>
                      {t("rooms.saveRoom")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-sm border-border/50">
          <div className="p-4 border-b border-border/50 bg-muted/20">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t("rooms.searchPlaceholder")}
                className="w-full ps-8 bg-background"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>{t("rooms.columns.room")}</TableHead>
                  <TableHead>{t("rooms.columns.type")}</TableHead>
                  <TableHead>{t("rooms.columns.capacity")}</TableHead>
                  <TableHead>{t("rooms.columns.status")}</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {[100, 80, 40, 80].map((w, j) => (
                        <TableCell key={j}><Skeleton className={`h-4 w-[${w}px]`} /></TableCell>
                      ))}
                      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
                    </TableRow>
                  ))
                ) : filteredRooms?.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                      {t("rooms.noRooms")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRooms?.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell className="font-medium">{room.name}</TableCell>
                      <TableCell>{room.type}</TableCell>
                      <TableCell>{room.capacity} {t("rooms.guests")}</TableCell>
                      <TableCell><RoomStatusBadge status={room.status} /></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">{t("common.actions")}</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setQrRoom(room)}>
                              <QrCode className="me-2 h-4 w-4" /> {t("rooms.viewQR")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer" onClick={() => handleEdit(room)}>
                              <Pencil className="me-2 h-4 w-4" /> {t("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer" onClick={() => handleDelete(room.id)}>
                              <Trash2 className="me-2 h-4 w-4" /> {t("common.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* QR Code Dialog */}
        <Dialog open={!!qrRoom} onOpenChange={(open) => !open && setQrRoom(null)}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="font-serif">{t("rooms.qrCodeFor")} {qrRoom?.name}</DialogTitle>
            </DialogHeader>
            {qrRoom && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border">
                  <QRCodeSVG value={guestPortalUrl(qrRoom.id)} size={200} />
                </div>
                <p className="text-xs text-center text-muted-foreground break-all">{guestPortalUrl(qrRoom.id)}</p>
                <p className="text-xs text-center text-muted-foreground">{t("rooms.qrScanHint")}</p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setQrRoom(null)}>{t("common.close")}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  