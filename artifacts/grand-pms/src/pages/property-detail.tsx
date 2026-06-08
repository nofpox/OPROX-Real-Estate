import React, { useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetProperty, getGetPropertyQueryKey,
  useGetPropertyStats, getGetPropertyStatsQueryKey,
  useListRooms, getListRoomsQueryKey,
  useListWorkOrders,
  useCreateRoom,
  useCreateRoomsBulk,
  useUpdateRoom,
  useDeleteRoom,
} from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowLeft, MapPin, Building2, Wrench, AlertCircle,
  Plus, Layers, QrCode, Pencil, Trash2, Download, Copy, Check,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Room } from "@/lib/local-hooks";

type RoomForm = { name: string; type: string; status: string; capacity: string; pricePerNight: string };
const DEFAULT_FORM: RoomForm = { name: "", type: "Standard", status: "available", capacity: "2", pricePerNight: "0" };

const ROOM_TYPES = ["Standard", "Deluxe", "Suite", "Presidential", "Studio", "Penthouse"];
const ROOM_STATUSES = ["available", "occupied", "maintenance", "cleaning"];

export default function PropertyDetail() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [, params] = useRoute("/properties/:id");
  const propertyId = params?.id ? parseInt(params.id) : 0;

  const [tab, setTab] = useState<"units" | "workorders">("units");

  const [addOpen, setAddOpen] = useState(false);
  const [editRoom, setEditRoom] = useState<Room | null>(null);
  const [deleteRoom, setDeleteRoom] = useState<Room | null>(null);
  const [qrRoom, setQrRoom] = useState<Room | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const [form, setForm] = useState<RoomForm>(DEFAULT_FORM);
  const [bulkForm, setBulkForm] = useState({ prefix: "Unit ", start: "1", end: "10", type: "Standard", status: "available", capacity: "2", pricePerNight: "0" });

  const qrRef = useRef<HTMLCanvasElement>(null);

  const { data: property, isLoading: isPropertyLoading } = useGetProperty(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyQueryKey(propertyId) },
  });
  const { data: stats, isLoading: isStatsLoading } = useGetPropertyStats(propertyId, {
    query: { enabled: !!propertyId, queryKey: getGetPropertyStatsQueryKey(propertyId) },
  });
  const { data: allRooms, isLoading: isRoomsLoading } = useListRooms();
  const rooms = allRooms?.filter((r) => r.propertyId === propertyId) || [];
  const { data: workOrders, isLoading: isWorkOrdersLoading } = useListWorkOrders({ propertyId });

  const invalidateRooms = () => { qc.invalidateQueries({ queryKey: getListRoomsQueryKey() }); qc.invalidateQueries({ queryKey: getGetPropertyStatsQueryKey(propertyId) }); qc.invalidateQueries({ queryKey: getGetPropertyQueryKey(propertyId) }); };

  const createMutation = useCreateRoom({ mutation: { onSuccess: () => { invalidateRooms(); setAddOpen(false); setForm(DEFAULT_FORM); toast({ title: t("rooms.createSuccess") }); }, onError: () => toast({ title: t("rooms.createFailed"), variant: "destructive" }) } });
  const updateMutation = useUpdateRoom({ mutation: { onSuccess: () => { invalidateRooms(); setEditRoom(null); toast({ title: t("rooms.updateSuccess") }); }, onError: () => toast({ title: t("rooms.updateFailed"), variant: "destructive" }) } });
  const deleteMutation = useDeleteRoom({ mutation: { onSuccess: () => { invalidateRooms(); setDeleteRoom(null); toast({ title: t("rooms.deleteSuccess") }); }, onError: () => toast({ title: t("rooms.deleteFailed"), variant: "destructive" }) } });
  const bulkMutation = useCreateRoomsBulk({ mutation: { onSuccess: (rooms: any[]) => { invalidateRooms(); setBulkOpen(false); toast({ title: t("properties.detail.bulkAdded", { count: rooms.length }) }); }, onError: () => toast({ title: t("properties.detail.bulkAddFailed"), variant: "destructive" }) } });

  function openEdit(room: Room) {
    setForm({ name: room.name, type: room.type, status: room.status, capacity: String(room.capacity ?? 2), pricePerNight: String(room.pricePerNight ?? 0) });
    setEditRoom(room);
  }

  function submitAdd() {
    createMutation.mutate({ data: { propertyId, name: form.name, type: form.type, status: form.status, capacity: parseInt(form.capacity) || 2, pricePerNight: parseFloat(form.pricePerNight) || 0 } });
  }

  function submitEdit() {
    if (!editRoom) return;
    updateMutation.mutate({ id: editRoom.id, data: { name: form.name, type: form.type, status: form.status, capacity: parseInt(form.capacity) || 2, pricePerNight: parseFloat(form.pricePerNight) || 0 } });
  }

  const bulkStart = parseInt(bulkForm.start) || 1;
  const bulkEnd = parseInt(bulkForm.end) || 1;
  const bulkCount = Math.max(0, Math.min(100, bulkEnd - bulkStart + 1));

  function submitBulk() {
    bulkMutation.mutate({ data: { propertyId, prefix: bulkForm.prefix, start: bulkStart, end: bulkEnd, type: bulkForm.type, status: bulkForm.status, capacity: parseInt(bulkForm.capacity) || 2, pricePerNight: parseFloat(bulkForm.pricePerNight) || 0 } });
  }

  function downloadQR() {
    const canvas = document.getElementById("unit-qr-canvas") as HTMLCanvasElement | null;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `QR-${qrRoom?.name || "unit"}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function copyQRLink() {
    if (!qrRoom) return;
    const url = `${window.location.origin}/rooms/${qrRoom.id}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (isPropertyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-24" />
        <div><Skeleton className="h-10 w-1/3 mb-2" /><Skeleton className="h-5 w-1/4" /></div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-semibold mb-2">{t("properties.detail.notFound", "Property not found")}</h2>
        <Link href="/properties"><Button variant="outline">{t("properties.detail.backToProperties")}</Button></Link>
      </div>
    );
  }

  const qrUrl = qrRoom ? `${window.location.origin}/rooms/${qrRoom.id}` : "";

  return (
    <div className="space-y-6">
      <Link href="/properties">
        <Button variant="ghost" className="px-0 hover:bg-transparent -ms-2 text-muted-foreground">
          <ArrowLeft className="me-2 h-4 w-4" />
          {t("properties.detail.backToProperties")}
        </Button>
      </Link>

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{property.name}</h1>
          {property.status === "inactive" && (
            <Badge variant="outline" className="text-gray-500">{t("status.inactive")}</Badge>
          )}
        </div>
        <div className="flex items-center text-muted-foreground">
          <MapPin className="me-1.5 h-4 w-4" />
          <span>{property.address}, {property.city}, {property.country}</span>
        </div>
        {property.description && <p className="text-muted-foreground mt-2 max-w-3xl">{property.description}</p>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {[
          { icon: Building2, label: t("properties.detail.totalRooms"), value: stats?.totalRooms || 0, color: "" },
          { icon: AlertCircle, label: t("properties.detail.openWorkOrders", "Open Work Orders"), value: stats?.openWorkOrders || 0, color: "text-amber-600 dark:text-amber-500" },
        ].map(({ icon: Icon, label, value, color }) => (
          <Card key={label} className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-muted-foreground mb-2">
                <Icon className="h-4 w-4" />
                <p className="text-sm font-medium">{label}</p>
              </div>
              {isStatsLoading ? <Skeleton className="h-9 w-16" /> : (
                <h2 className={`text-3xl font-bold ${color}`}>{value}</h2>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex gap-1 border-b">
        {(["units", "workorders"] as const).map((t2) => (
          <button
            key={t2}
            onClick={() => setTab(t2)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${tab === t2 ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t2 === "units" ? t("properties.detail.rooms") : t("properties.detail.workOrders")}
          </button>
        ))}
      </div>

      {tab === "units" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-serif font-semibold">{t("properties.detail.rooms")} ({rooms.length})</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
                <Layers className="me-2 h-4 w-4" />
                {t("properties.detail.bulkAdd")}
              </Button>
              <Button size="sm" onClick={() => { setForm(DEFAULT_FORM); setAddOpen(true); }}>
                <Plus className="me-2 h-4 w-4" />
                {t("properties.detail.addUnit")}
              </Button>
            </div>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent bg-muted/20">
                    <TableHead>{t("rooms.columns.room")}</TableHead>
                    <TableHead>{t("rooms.columns.type")}</TableHead>
                    <TableHead>{t("rooms.columns.status")}</TableHead>
                    <TableHead>{t("rooms.columns.capacity")}</TableHead>
                    <TableHead>{t("rooms.columns.rate")}</TableHead>
                    <TableHead className="text-end">{t("common.actions", "Actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isRoomsLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 6 }).map((__, j) => <TableCell key={j}><Skeleton className="h-4 w-16" /></TableCell>)}
                      </TableRow>
                    ))
                  ) : rooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-32 text-center">
                        <div className="flex flex-col items-center gap-3 text-muted-foreground">
                          <Building2 className="h-10 w-10 opacity-20" />
                          <p>{t("properties.detail.noRooms")}</p>
                          <Button size="sm" onClick={() => { setForm(DEFAULT_FORM); setAddOpen(true); }}>
                            <Plus className="me-1 h-3.5 w-3.5" />{t("properties.detail.addUnit")}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-medium">{room.name}</TableCell>
                        <TableCell>{t(`rooms.types.${room.type}`, room.type)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            room.status === "available" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300" :
                            room.status === "occupied" ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300" :
                            "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300"
                          }>
                            {t(`status.${room.status}`, room.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>{room.capacity} {t("rooms.guests")}</TableCell>
                        <TableCell>{Number(room.pricePerNight).toFixed(0)}{t("rooms.perNight")}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t("rooms.viewQR")} onClick={() => { setQrRoom(room); setCopied(false); }}>
                              <QrCode className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8" title={t("rooms.editRoom")} onClick={() => openEdit(room)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title={t("common.delete", "Delete")} onClick={() => setDeleteRoom(room)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "workorders" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-serif font-semibold">{t("properties.detail.workOrders")}</h2>
            <Link href={`/maintenance?propertyId=${propertyId}`}>
              <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80">{t("common.viewDetails")}</Button>
            </Link>
          </div>
          <Card className="shadow-sm border-border/50">
            <CardContent className="p-0 divide-y">
              {isWorkOrdersLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="p-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))
              ) : !workOrders || workOrders.filter((w) => w.status !== "completed").length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center">
                  <Wrench className="h-8 w-8 mb-2 opacity-20" />
                  <p>{t("properties.detail.noWorkOrders")}</p>
                </div>
              ) : (
                workOrders.filter((w) => w.status !== "completed").map((wo) => (
                  <div key={wo.id} className="p-4">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-medium text-sm line-clamp-1" title={wo.title}>{wo.title}</h4>
                      <Badge variant="outline" className={`text-[10px] px-1.5 py-0 h-4 border-0 ${
                        wo.priority === "urgent" ? "bg-red-100 text-red-800" :
                        wo.priority === "high" ? "bg-orange-100 text-orange-800" :
                        wo.priority === "medium" ? "bg-amber-100 text-amber-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {t(`priority.${wo.priority}`).toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center text-xs text-muted-foreground">
                      <span>{wo.unitName ? `${t("common.unit")}: ${wo.unitName}` : t("maintenance.fields.propertyWide")}</span>
                      {wo.dueDate && (
                        <span className={new Date(wo.dueDate + "T00:00:00") < new Date() ? "text-red-500 font-medium" : ""}>
                          {new Date(wo.dueDate + "T00:00:00").toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setForm(DEFAULT_FORM); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("rooms.addNewRoom")}</DialogTitle></DialogHeader>
          <UnitForm form={form} setForm={setForm} propertyName={property.name} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submitAdd} disabled={createMutation.isPending || !form.name}>{createMutation.isPending ? t("common.saving") : t("rooms.saveRoom")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editRoom} onOpenChange={(o) => { if (!o) setEditRoom(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{t("rooms.editRoom")}</DialogTitle></DialogHeader>
          <UnitForm form={form} setForm={setForm} propertyName={property.name} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRoom(null)}>{t("common.cancel")}</Button>
            <Button onClick={submitEdit} disabled={updateMutation.isPending || !form.name}>{updateMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => setBulkOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("properties.detail.bulkAddTitle")}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("properties.detail.bulkAddDesc")}</p>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>{t("properties.detail.bulkPrefix")}</Label>
              <Input placeholder={t("properties.detail.bulkPrefixPlaceholder")} value={bulkForm.prefix} onChange={e => setBulkForm(f => ({ ...f, prefix: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("properties.detail.bulkStart")}</Label>
                <Input type="number" min={1} value={bulkForm.start} onChange={e => setBulkForm(f => ({ ...f, start: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("properties.detail.bulkEnd")}</Label>
                <Input type="number" min={1} value={bulkForm.end} onChange={e => setBulkForm(f => ({ ...f, end: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("rooms.fields.type")}</Label>
                <Select value={bulkForm.type} onValueChange={v => setBulkForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROOM_TYPES.map(rt => <SelectItem key={rt} value={rt}>{t(`rooms.types.${rt}`, rt)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("rooms.fields.status")}</Label>
                <Select value={bulkForm.status} onValueChange={v => setBulkForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ROOM_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`status.${s}`, s)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("rooms.fields.capacity")}</Label>
                <Input type="number" min={1} value={bulkForm.capacity} onChange={e => setBulkForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("rooms.fields.price")}</Label>
                <Input type="number" min={0} step={0.01} value={bulkForm.pricePerNight} onChange={e => setBulkForm(f => ({ ...f, pricePerNight: e.target.value }))} />
              </div>
            </div>
            {bulkCount > 0 && bulkCount <= 100 && (
              <p className="text-sm bg-muted rounded-md px-3 py-2">
                {t("properties.detail.bulkPreview", {
                  first: `${bulkForm.prefix}${bulkStart}`,
                  last: `${bulkForm.prefix}${bulkEnd}`,
                  count: bulkCount,
                })}
              </p>
            )}
            {bulkCount > 100 && (
              <p className="text-sm text-destructive">{t("properties.detail.bulkMaxError", "Max 100 units per operation.")}</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>{t("common.cancel")}</Button>
            <Button onClick={submitBulk} disabled={bulkMutation.isPending || bulkCount <= 0 || bulkCount > 100 || !bulkForm.prefix}>
              {bulkMutation.isPending ? t("common.saving") : t("properties.detail.bulkGenerate", { count: bulkCount })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!qrRoom} onOpenChange={(o) => { if (!o) setQrRoom(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("properties.detail.qrCode")} — {qrRoom?.name}</DialogTitle>
            <p className="text-sm text-muted-foreground">{t("rooms.qrScanHint")}</p>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrRoom && (
              <div className="p-4 bg-white rounded-xl shadow-sm border">
                <QRCodeCanvas id="unit-qr-canvas" value={qrUrl} size={200} level="M" />
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center break-all max-w-xs">{qrUrl}</p>
          </div>
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={copyQRLink} className="flex-1">
              {copied ? <><Check className="me-2 h-4 w-4 text-green-600" />{t("properties.detail.linkCopied")}</> : <><Copy className="me-2 h-4 w-4" />{t("properties.detail.copyLink")}</>}
            </Button>
            <Button onClick={downloadQR} className="flex-1">
              <Download className="me-2 h-4 w-4" />
              {t("properties.detail.downloadQR")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteRoom} onOpenChange={(o) => { if (!o) setDeleteRoom(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("rooms.deleteConfirm")}</AlertDialogTitle>
            <AlertDialogDescription>{t("properties.detail.deleteUnitConfirm")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteRoom && deleteMutation.mutate({ id: deleteRoom.id })}>
              {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UnitForm({ form, setForm, propertyName }: { form: RoomForm; setForm: React.Dispatch<React.SetStateAction<RoomForm>>; propertyName: string }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label>{t("rooms.fields.name")}</Label>
        <Input placeholder={t("rooms.fields.namePlaceholder")} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
        <p className="text-xs text-muted-foreground">{propertyName}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("rooms.fields.type")}</Label>
          <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROOM_TYPES.map(rt => <SelectItem key={rt} value={rt}>{t(`rooms.types.${rt}`, rt)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("rooms.fields.status")}</Label>
          <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{ROOM_STATUSES.map(s => <SelectItem key={s} value={s}>{t(`status.${s}`, s)}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>{t("rooms.fields.capacity")}</Label>
          <Input type="number" min={1} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
        </div>
        <div className="space-y-1.5">
          <Label>{t("rooms.fields.price")}</Label>
          <Input type="number" min={0} step={0.01} value={form.pricePerNight} onChange={e => setForm(f => ({ ...f, pricePerNight: e.target.value }))} />
        </div>
      </div>
    </div>
  );
}
