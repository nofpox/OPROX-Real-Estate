import { useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Building2, QrCode } from "lucide-react";
import { useListRooms, useUpdateRoom, getListRoomsQueryKey } from "@/lib/local-hooks";
import { useQueryClient } from "@tanstack/react-query";

const STATUS_BADGE: Record<string,string> = {
  available:"bg-emerald-500/20 text-emerald-300 border-emerald-500/30", occupied:"bg-blue-500/20 text-blue-300 border-blue-500/30",
  maintenance:"bg-amber-500/20 text-amber-300 border-amber-500/30", cleaning:"bg-purple-500/20 text-purple-300 border-purple-500/30",
};
const STATUS_OPTIONS = ["available","occupied","maintenance","cleaning"];

export default function WorkerUnitDetail({ id }: { id: number }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useListRooms();
  const updateRoom = useUpdateRoom();
  const [saving, setSaving] = useState(false);

  const room = rooms?.find(r => r.id === id);

  async function handleStatusChange(newStatus: string) {
    if (!room) return;
    setSaving(true);
    await updateRoom.mutateAsync({ id, data: { status: newStatus } });
    qc.invalidateQueries({ queryKey: getListRoomsQueryKey() });
    toast({ title: `Status updated to ${newStatus}` });
    setSaving(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/10 px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/70 hover:text-white" onClick={()=>navigate("/")}>
          <ArrowLeft className="h-4 w-4"/>
        </Button>
        <h1 className="font-semibold">{room?.name ?? "Unit Detail"}</h1>
      </div>
      <div className="flex-1 p-4 space-y-4">
        {isLoading ? <Skeleton className="h-32 rounded-xl bg-white/10"/> : !room ? (
          <div className="text-center py-12 text-white/40"><Building2 className="mx-auto h-10 w-10 mb-2"/>Unit not found</div>
        ) : (
          <>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader><CardTitle className="text-base flex items-center justify-between">
                <span>{room.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${STATUS_BADGE[room.status]}`}>{room.status}</span>
              </CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-white/50 text-xs">Type</p><p>{room.type}</p></div>
                  <div><p className="text-white/50 text-xs">Capacity</p><p>{room.capacity} guests</p></div>
                  <div><p className="text-white/50 text-xs">Price/Night</p><p>SAR {room.pricePerNight}</p></div>
                  <div><p className="text-white/50 text-xs">Property</p><p className="truncate">{room.propertyName}</p></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader><CardTitle className="text-base">Update Status</CardTitle></CardHeader>
              <CardContent>
                <Select value={room.status} onValueChange={handleStatusChange} disabled={saving}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue/>
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s=><SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><QrCode className="h-4 w-4"/>QR Code</CardTitle></CardHeader>
              <CardContent>
                <div className="bg-white p-4 rounded-lg inline-block">
                  <div className="h-24 w-24 bg-slate-200 flex items-center justify-center text-slate-500 text-xs text-center">
                    QR: Unit {room.id}
                  </div>
                </div>
                <p className="text-xs text-white/50 mt-2">Scan to access unit details</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
