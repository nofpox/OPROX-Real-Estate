import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { Inbox, Search, Zap, Droplets, Wind, Brush, Volume2, Users, DoorOpen, Clock, CheckCircle2, Play, Mail } from "lucide-react";

type GuestRequest = { id: number; roomId: number|null; type: string; description: string; status: "new"|"in_progress"|"resolved"; refCode: string; createdAt: string; unitName: string|null; propertyName: string|null; visitorName: string|null; };
const TYPE_ICONS: Record<string,any> = { electrical:Zap, plumbing:Droplets, ac:Wind, cleaning:Brush, noise:Volume2, visitor:Users, contact:Mail, other:DoorOpen };
const TYPE_COLOR: Record<string,string> = { electrical:"text-yellow-500", plumbing:"text-blue-500", ac:"text-cyan-500", cleaning:"text-green-500", noise:"text-orange-500", visitor:"text-purple-500", contact:"text-indigo-500", other:"text-slate-500" };
const STATUS_BADGE: Record<string,string> = { new:"bg-red-100 text-red-700 border-red-200", in_progress:"bg-amber-100 text-amber-700 border-amber-200", resolved:"bg-green-100 text-green-700 border-green-200" };

const SEED: GuestRequest[] = [
  { id:1, roomId:2, type:"electrical", description:"Power outlet not working in room", status:"new", refCode:"REQ-001", createdAt:new Date(Date.now()-3600000).toISOString(), unitName:"Room 102", propertyName:"Grand Hotel Downtown", visitorName:null },
  { id:2, roomId:7, type:"cleaning", description:"Need extra towels and toiletries", status:"in_progress", refCode:"REQ-002", createdAt:new Date(Date.now()-7200000).toISOString(), unitName:"Unit A2", propertyName:"Sunset Apartments", visitorName:null },
  { id:3, roomId:1, type:"ac", description:"AC making loud noise at night", status:"resolved", refCode:"REQ-003", createdAt:new Date(Date.now()-86400000).toISOString(), unitName:"Room 101", propertyName:"Grand Hotel Downtown", visitorName:null },
  { id:4, roomId:10, type:"plumbing", description:"Slow drain in bathroom sink", status:"new", refCode:"REQ-004", createdAt:new Date(Date.now()-1800000).toISOString(), unitName:"Villa 1", propertyName:"Oakwood Compound", visitorName:null },
];

export default function GuestRequests() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [requests, setRequests] = useState<GuestRequest[]>(SEED);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  function updateStatus(id: number, status: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: status as any } : r));
    toast({ title: "Status updated" });
  }

  const filtered = requests.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (search && !r.description.toLowerCase().includes(search.toLowerCase()) && !(r.unitName??'').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = { new: requests.filter(r=>r.status==="new").length, in_progress: requests.filter(r=>r.status==="in_progress").length, resolved: requests.filter(r=>r.status==="resolved").length };

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-serif font-bold">{t("nav.guestRequests","Guest Requests")}</h1><p className="text-muted-foreground mt-1">Incoming service requests from guests and residents</p></div>
      <div className="grid grid-cols-3 gap-4">
        {([["new","New",counts.new,"text-red-600"],["in_progress","In Progress",counts.in_progress,"text-amber-600"],["resolved","Resolved",counts.resolved,"text-green-600"]] as any[]).map(([k,l,v,c])=>(
          <Card key={k}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{l}</p><p className={`text-2xl font-bold ${c}`}>{v}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex gap-3 flex-wrap">
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input className="pl-9 w-56" placeholder="Search…" value={search} onChange={e=>setSearch(e.target.value)}/></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-40"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="new">New</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="resolved">Resolved</SelectItem></SelectContent></Select>
      </div>
      {filtered.length === 0 ? (
        <div className="py-12 text-center border rounded-lg border-dashed"><Inbox className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3"/><p className="text-muted-foreground">No requests found</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(req => {
            const Icon = TYPE_ICONS[req.type] ?? DoorOpen;
            return (
              <Card key={req.id}>
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`mt-1 ${TYPE_COLOR[req.type]??'text-slate-500'}`}><Icon className="h-5 w-5"/></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-xs font-mono text-muted-foreground">{req.refCode}</span>
                      <Badge variant="outline" className={`text-xs ${STATUS_BADGE[req.status]}`}>{req.status.replace("_"," ")}</Badge>
                      {req.unitName && <span className="text-xs text-muted-foreground">{req.unitName} · {req.propertyName}</span>}
                    </div>
                    <p className="text-sm font-medium">{req.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{new Date(req.createdAt).toLocaleString()}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {req.status==="new" && <Button size="sm" variant="outline" onClick={()=>updateStatus(req.id,"in_progress")}><Play className="h-3 w-3 me-1"/>Start</Button>}
                    {req.status==="in_progress" && <Button size="sm" variant="outline" onClick={()=>updateStatus(req.id,"resolved")}><CheckCircle2 className="h-3 w-3 me-1"/>Resolve</Button>}
                    {req.status==="resolved" && <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3"/>Done</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
