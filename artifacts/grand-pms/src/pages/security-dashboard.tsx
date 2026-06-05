import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useListActiveSessions, useListUsers } from "@/lib/local-hooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Shield, Users, Wifi, AlertTriangle, Activity, UserCheck, Eye, Lock } from "lucide-react";

const MOCK_SECURITY_LOG = [
  { id:1, event:"login_success", user:"admin", ip:"192.168.1.1", at: new Date(Date.now()-3600000).toISOString() },
  { id:2, event:"login_success", user:"manager", ip:"192.168.1.2", at: new Date(Date.now()-7200000).toISOString() },
  { id:3, event:"login_failed", user:"unknown", ip:"10.0.0.5", at: new Date(Date.now()-10800000).toISOString() },
  { id:4, event:"password_changed", user:"admin", ip:"192.168.1.1", at: new Date(Date.now()-86400000).toISOString() },
  { id:5, event:"logout", user:"manager", ip:"192.168.1.2", at: new Date(Date.now()-5400000).toISOString() },
];

function TierBadge({ role }: { role: string }) {
  const tier = ["manager","admin","owner","admin_manager"].includes(role) ? "admin" : ["supervisor","front-desk"].includes(role) ? "supervisor" : "worker";
  const cls = tier==="admin" ? "bg-red-100 text-red-800" : tier==="supervisor" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800";
  return <Badge variant="secondary" className={`text-[10px] ${cls}`}>{tier}</Badge>;
}

export default function SecurityDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: sessionsData, isLoading: sessionsLoading } = useListActiveSessions();
  const { data: users } = useListUsers();
  const [killedIds, setKilledIds] = useState<number[]>([]);

  function handleKill(userId: number, name: string) {
    if (!confirm(`Force-logout ${name}?`)) return;
    setKilledIds(prev => [...prev, userId]);
    toast({ title: `Session terminated for ${name}` });
  }

  const activeSessions = (sessionsData ?? []).filter(s => !killedIds.includes(s.userId));

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-serif font-bold">{t("nav.securityDashboard","Security Dashboard")}</h1><p className="text-muted-foreground mt-1">Monitor active sessions and security events</p></div>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { icon:Users, label:"Total Users", value: users?.length ?? 0, color:"" },
          { icon:Wifi, label:"Active Sessions", value: activeSessions.length, color:"text-green-600" },
          { icon:AlertTriangle, label:"Failed Logins (24h)", value: MOCK_SECURITY_LOG.filter(e=>e.event==="login_failed").length, color:"text-red-600" },
          { icon:Activity, label:"Security Events", value: MOCK_SECURITY_LOG.length, color:"" },
        ].map(({icon:Icon,label,value,color})=>(
          <Card key={label}><CardContent className="p-5"><div className="flex items-center gap-2 text-muted-foreground mb-1"><Icon className="h-4 w-4"/><p className="text-sm">{label}</p></div><p className={`text-2xl font-bold ${color}`}>{value}</p></CardContent></Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Wifi className="h-4 w-4"/>Active Sessions</CardTitle></CardHeader>
        <CardContent>
          {sessionsLoading ? <Skeleton className="h-16 w-full"/> : activeSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground"><UserCheck className="mx-auto h-8 w-8 mb-2 opacity-40"/>No active sessions</div>
          ) : (
            <div className="space-y-3">
              {activeSessions.map(s=>(
                <div key={s.id} className="flex items-center justify-between border rounded-lg p-3">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold">{s.displayName.charAt(0)}</div>
                    <div><p className="text-sm font-medium">{s.displayName}</p><p className="text-xs text-muted-foreground">{s.ip} · {s.role}</p></div>
                    <TierBadge role={s.role}/>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{new Date(s.lastSeen).toLocaleTimeString()}</span>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={()=>handleKill(s.userId, s.displayName)}><Lock className="h-3 w-3 me-1"/>Force Logout</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4"/>Security Event Log</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {MOCK_SECURITY_LOG.map(entry=>(
              <div key={entry.id} className="flex items-center gap-3 text-sm border-b last:border-0 pb-2 last:pb-0 pt-2">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${entry.event==="login_failed"?"bg-red-100 text-red-700":entry.event==="login_success"?"bg-green-100 text-green-700":"bg-slate-100 text-slate-700"}`}>{entry.event.replace(/_/g," ")}</span>
                <span className="font-medium">{entry.user}</span>
                <span className="text-muted-foreground">{entry.ip}</span>
                <span className="text-muted-foreground ms-auto text-xs">{new Date(entry.at).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
