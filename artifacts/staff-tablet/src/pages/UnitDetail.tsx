import { useState } from "react";
  import { useLocation } from "wouter";
  import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
  import { useOnlineStatus } from "@/hooks/use-online-status";
  import { enqueue } from "@/lib/offline-queue";
  import { Button } from "@/components/ui/button";
  import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
  import { Badge } from "@/components/ui/badge";
  import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
  import { Input } from "@/components/ui/input";
  import { Label } from "@/components/ui/label";
  import { Skeleton } from "@/components/ui/skeleton";
  import { Separator } from "@/components/ui/separator";
  import { useToast } from "@/hooks/use-toast";
  import {
    ArrowLeft, Building2, Wrench, CheckCircle2, Clock, AlertCircle,
    DollarSign, Calendar, Loader2, RefreshCw, QrCode,
  } from "lucide-react";
  import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

  type Room = { id: number; name: string; type: string; status: string; capacity: number; pricePerNight: number };
  type Financial = { roomId: number; status: string; dueDate: string | null; amountDue: number | null; checkIn: string | null; checkOut: string | null };
  type GuestRequest = { id: number; roomId: number; type: string; description: string; status: string; refCode: string; createdAt: string };

  const STATUS_OPTIONS = ["available", "occupied", "maintenance", "cleaning"] as const;
  const STATUS_BADGE: Record<string, string> = {
    available: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
    occupied: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    maintenance: "bg-amber-500/20 text-amber-300 border-amber-500/30",
    cleaning: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  };
  const REQ_STATUS_BADGE: Record<string, string> = {
    new: "bg-red-500/20 text-red-400",
    in_progress: "bg-amber-500/20 text-amber-400",
    resolved: "bg-emerald-500/20 text-emerald-400",
  };

  export default function UnitDetail({ id }: { id: number }) {
    const [, navigate] = useLocation();
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { isOnline } = useOnlineStatus();
    const [qrOpen, setQrOpen] = useState(false);
    const [financialForm, setFinancialForm] = useState<Partial<Financial>>({});
    const [editFinancial, setEditFinancial] = useState(false);

    const { data: room, isLoading: roomLoading } = useQuery<Room>({
      queryKey: ["room", id],
      queryFn: () => fetch(`/api/rooms/${id}`).then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); }),
      enabled: !!id,
    });

    const { data: financial, isLoading: finLoading } = useQuery<Financial>({
      queryKey: ["financial", id],
      queryFn: () => fetch(`/api/unit-financials/${id}`, { credentials: "include" }).then(r => r.ok ? r.json() : null),
      enabled: !!id,
      select: (data) => { if (data) setFinancialForm(data); return data; },
    });

    const { data: requests, refetch: refetchRequests } = useQuery<GuestRequest[]>({
      queryKey: ["guest-requests", id],
      queryFn: () => fetch(`/api/guest/requests?roomId=${id}`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      enabled: !!id,
    });

    const updateStatus = useMutation({
      mutationFn: (status: string) => fetch(`/api/rooms/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }).then(r => r.json()),
      onSuccess: () => { toast({ title: "Status updated" }); queryClient.invalidateQueries({ queryKey: ["room", id] }); queryClient.invalidateQueries({ queryKey: ["rooms"] }); },
      onError: () => toast({ title: "Failed to update status", variant: "destructive" }),
    });

    const updateFinancial = useMutation({
      mutationFn: () => fetch(`/api/unit-financials/${id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...financialForm, roomId: id }),
      }).then(r => r.json()),
      onSuccess: () => { toast({ title: "Financial data saved" }); queryClient.invalidateQueries({ queryKey: ["financial", id] }); setEditFinancial(false); },
      onError: () => toast({ title: "Failed to save", variant: "destructive" }),
    });

    const resolveRequest = useMutation({
      mutationFn: (reqId: number) => fetch(`/api/guest/requests/${reqId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "resolved" }),
      }).then(r => r.json()),
      onSuccess: () => { toast({ title: "Request resolved" }); refetchRequests(); },
    });

    const guestPortalUrl = `${window.location.origin}/guest-portal/unit/${id}`;

    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-card border-b border-border/50 px-6 py-4 flex items-center gap-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Building2 size={17} className="text-amber-500" />
            <span className="font-serif font-bold text-foreground">
              {roomLoading ? "Loading…" : room?.name}
            </span>
          </div>
          {room && (
            <Badge className={`ml-auto border ${STATUS_BADGE[room.status] || "bg-muted text-muted-foreground border-border"} text-xs capitalize`}>
              {room.status}
            </Badge>
          )}
        </header>

        <div className="px-6 py-6 max-w-2xl mx-auto space-y-5">
          {/* Status update */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 size={15} className="text-amber-500" /> Unit Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              {roomLoading ? <Skeleton className="h-10 w-full" /> : (
                <div className="flex gap-2">
                  <Select value={room?.status} onValueChange={(v) => {
                    if (!isOnline) {
                      enqueue({ type: "updateStatus", roomId: id, status: v });
                      toast({ title: "Offline — status change queued, will sync when reconnected." });
                      return;
                    }
                    updateStatus.mutate(v);
                  }}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Set status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon" onClick={() => setQrOpen(true)} title="Show Guest QR Code">
                    <QrCode size={16} />
                  </Button>
                </div>
              )}
              {room && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                  <span>Type: <strong className="text-foreground">{room.type}</strong></span>
                  <span>Capacity: <strong className="text-foreground">{room.capacity} guests</strong></span>
                  <span>Rate: <strong className="text-foreground">${room.pricePerNight}/nt</strong></span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Financial data */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <DollarSign size={15} className="text-amber-500" /> Financial Data
                </CardTitle>
                <Button size="sm" variant="ghost" onClick={() => setEditFinancial(!editFinancial)} className="h-7 text-xs text-muted-foreground">
                  {editFinancial ? "Cancel" : "Edit"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {finLoading ? (
                <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
              ) : editFinancial ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Status</Label>
                      <Select value={financialForm.status || ""} onValueChange={v => setFinancialForm(f => ({ ...f, status: v }))}>
                        <SelectTrigger className="mt-1 h-9 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>
                          {["available", "occupied", "overdue", "pending"].map(s => <SelectItem key={s} value={s} className="text-xs capitalize">{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Amount Due</Label>
                      <Input type="number" value={financialForm.amountDue ?? ""} onChange={e => setFinancialForm(f => ({ ...f, amountDue: Number(e.target.value) }))} className="mt-1 h-9 text-xs" placeholder="0.00" />
                    </div>
                    <div>
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={financialForm.dueDate || ""} onChange={e => setFinancialForm(f => ({ ...f, dueDate: e.target.value }))} className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Check-In</Label>
                      <Input type="date" value={financialForm.checkIn || ""} onChange={e => setFinancialForm(f => ({ ...f, checkIn: e.target.value }))} className="mt-1 h-9 text-xs" />
                    </div>
                    <div>
                      <Label className="text-xs">Check-Out</Label>
                      <Input type="date" value={financialForm.checkOut || ""} onChange={e => setFinancialForm(f => ({ ...f, checkOut: e.target.value }))} className="mt-1 h-9 text-xs" />
                    </div>
                  </div>
                  <Button onClick={() => updateFinancial.mutate()} disabled={updateFinancial.isPending} className="w-full h-9 bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    {updateFinancial.isPending ? <Loader2 className="animate-spin" size={15} /> : "Save Changes"}
                  </Button>
                </div>
              ) : financial ? (
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  {[
                    ["Status", <span className="capitalize">{financial.status}</span>],
                    ["Amount Due", financial.amountDue != null ? `$${financial.amountDue}` : "—"],
                    ["Due Date", financial.dueDate || "—"],
                    ["Check-In", financial.checkIn || "—"],
                    ["Check-Out", financial.checkOut || "—"],
                  ].map(([label, val]) => (
                    <div key={String(label)}>
                      <p className="text-muted-foreground">{label}</p>
                      <p className="font-semibold text-foreground mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">No financial data</p>
                  <Button size="sm" variant="outline" className="mt-2 text-xs" onClick={() => setEditFinancial(true)}>Add Financial Data</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pending requests */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle size={15} className="text-amber-500" /> Service Requests
                  {requests && requests.filter(r => r.status === "new").length > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] ml-1">
                      {requests.filter(r => r.status === "new").length} new
                    </Badge>
                  )}
                </CardTitle>
                <button onClick={() => refetchRequests()} className="text-muted-foreground hover:text-foreground">
                  <RefreshCw size={13} />
                </button>
              </div>
            </CardHeader>
            <CardContent>
              {!requests || requests.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No requests for this unit</p>
              ) : (
                <div className="space-y-2">
                  {requests.map(req => (
                    <div key={req.id} className="flex items-start gap-3 p-3 rounded-lg bg-background border border-border/30">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-foreground capitalize">{req.type}</span>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${REQ_STATUS_BADGE[req.status] || "bg-muted text-muted-foreground"}`}>
                            {req.status === "in_progress" ? "In Progress" : req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{req.description}</p>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">Ref: {req.refCode}</p>
                      </div>
                      {req.status !== "resolved" && (
                        <Button size="sm" variant="ghost" onClick={() => {
                          if (!isOnline) {
                            enqueue({ type: "resolveRequest", requestId: req.id });
                            toast({ title: "Offline — resolve queued, will sync when reconnected." });
                            return;
                          }
                          resolveRequest.mutate(req.id);
                        }} className="h-7 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 shrink-0">
                          <CheckCircle2 size={13} className="mr-1" /> Resolve
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* QR Dialog */}
        <Dialog open={qrOpen} onOpenChange={setQrOpen}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="font-serif">Guest Portal QR — {room?.name}</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="bg-white p-4 rounded-xl">
                {/* Simple QR placeholder — react-qr-code install pending */}
                <div className="w-48 h-48 bg-slate-100 rounded-lg flex items-center justify-center">
                  <div className="text-center">
                    <QrCode size={48} className="text-slate-400 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">QR Code</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center break-all">{guestPortalUrl}</p>
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(guestPortalUrl); toast({ title: "Link copied!" }); }}>
                Copy Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  