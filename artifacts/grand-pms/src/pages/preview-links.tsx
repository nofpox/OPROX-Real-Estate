import React, { useState, useEffect, useCallback } from "react";
import { Copy, Link2, Trash2, RefreshCw, CheckCircle2, Clock, Globe, LayoutDashboard, Smartphone, Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/language-context";
import { useToast } from "@/hooks/use-toast";

const API = "/realestate-api";

const PORTAL_INFO: Record<string, { labelAr: string; labelEn: string; icon: React.ElementType; color: string }> = {
  "rkz":       { labelAr: "بوابة HousIn العقارية",  labelEn: "HousIn Portal",     icon: Globe,            color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  "grand-pms": { labelAr: "لوحة تحكم HousIn",        labelEn: "HousIn PMS",        icon: LayoutDashboard,  color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  "rkz-app":   { labelAr: "تطبيق HousIn للجوال",    labelEn: "HousIn Mobile App", icon: Smartphone,       color: "bg-emerald-500/10 text-emerald-600 border-emerald-200" },
};

interface PreviewLink {
  id: number;
  token: string;
  portal: string;
  label: string;
  created_by: string;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
}

function formatTimeLeft(iso: string): { text: string; urgent: boolean } {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return { text: "منتهي", urgent: true };
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h > 0) return { text: `${h}س ${m}د`, urgent: h < 2 };
  return { text: `${m} دقيقة`, urgent: true };
}

function buildShareUrl(token: string): string {
  const base = window.location.origin;
  return `${base}/realestate/preview/${token}`;
}

export default function PreviewLinks() {
  const { isRTL } = useLanguage();
  const { toast } = useToast();
  const isAr = isRTL;

  const [links, setLinks] = useState<PreviewLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [hours, setHours] = useState<number>(24);
  const [label, setLabel] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [newLinks, setNewLinks] = useState<PreviewLink[]>([]);

  const fetchLinks = useCallback(async () => {
    try {
      const r = await fetch(`${API}/cms/preview-links`, { credentials: "include" });
      if (!r.ok) return;
      const data = await r.json();
      setLinks((data.links ?? []).filter((l: PreviewLink) => !l.revoked_at && new Date(l.expires_at) > new Date()));
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);

  useEffect(() => {
    const id = setInterval(fetchLinks, 30_000);
    return () => clearInterval(id);
  }, [fetchLinks]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      const r = await fetch(`${API}/cms/preview-links/batch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ label: label.trim() || undefined, hours }),
      });
      if (!r.ok) throw new Error("Failed");
      const data = await r.json();
      setNewLinks(data.links ?? []);
      await fetchLinks();
      toast({ title: isAr ? "تم توليد الروابط ✓" : "Links generated ✓" });
    } catch {
      toast({ title: isAr ? "فشل توليد الروابط" : "Failed to generate links", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      await fetch(`${API}/cms/preview-links/${id}`, { method: "DELETE", credentials: "include" });
      setLinks(prev => prev.filter(l => l.id !== id));
      setNewLinks(prev => prev.filter(l => l.id !== id));
      toast({ title: isAr ? "تم إلغاء الرابط" : "Link revoked" });
    } catch {
      toast({ title: isAr ? "فشل الإلغاء" : "Revoke failed", variant: "destructive" });
    }
  }

  function handleCopy(token: string) {
    const url = buildShareUrl(token);
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function LinkCard({ link, highlight = false }: { link: PreviewLink; highlight?: boolean }) {
    const info = PORTAL_INFO[link.portal] ?? { labelAr: link.portal, labelEn: link.portal, icon: Link2, color: "bg-gray-100 text-gray-600 border-gray-200" };
    const Icon = info.icon;
    const { text: timeLeft, urgent } = formatTimeLeft(link.expires_at);
    const url = buildShareUrl(link.token);

    return (
      <div className={`rounded-xl border p-4 space-y-3 transition-all ${highlight ? "border-amber-300 bg-amber-50/50 dark:bg-amber-900/10" : "border-border bg-card"}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${info.color}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-semibold">{isAr ? info.labelAr : info.labelEn}</p>
              {link.label && <p className="text-xs text-muted-foreground">"{link.label}"</p>}
            </div>
          </div>
          <Badge variant="outline" className={`text-xs font-mono ${urgent ? "border-red-300 text-red-600 bg-red-50" : "border-green-300 text-green-700 bg-green-50"}`}>
            <Clock className="w-3 h-3 mr-1" />
            {timeLeft}
          </Badge>
        </div>

        <div className="flex gap-2">
          <input
            readOnly
            value={url}
            className="flex-1 text-xs bg-muted/50 rounded-lg px-3 py-2 border border-border font-mono truncate"
          />
          <Button size="sm" variant="outline" className="shrink-0 gap-1.5" onClick={() => handleCopy(link.token)}>
            {copied === link.token
              ? <CheckCircle2 className="w-4 h-4 text-green-500" />
              : <Copy className="w-4 h-4" />}
            {isAr ? "نسخ" : "Copy"}
          </Button>
          <Button size="sm" variant="outline" className="shrink-0 text-destructive hover:text-destructive" onClick={() => handleRevoke(link.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">
          {isAr ? "روابط المعاينة المؤقتة" : "Temporary Preview Links"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isAr
            ? "ولّد روابط آمنة تنتهي تلقائياً — شاركها مع العملاء لعرض المنصة"
            : "Generate secure links that expire automatically — share with clients to demo the platform"}
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {isAr ? "توليد روابط جديدة" : "Generate New Links"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isAr ? "مدة الصلاحية" : "Expiry Duration"}
              </label>
              <Select value={String(hours)} onValueChange={v => setHours(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{isAr ? "ساعة واحدة" : "1 hour"}</SelectItem>
                  <SelectItem value="6">{isAr ? "6 ساعات" : "6 hours"}</SelectItem>
                  <SelectItem value="12">{isAr ? "12 ساعة" : "12 hours"}</SelectItem>
                  <SelectItem value="24">{isAr ? "24 ساعة (يوم)" : "24 hours (1 day)"}</SelectItem>
                  <SelectItem value="48">{isAr ? "48 ساعة (يومان)" : "48 hours (2 days)"}</SelectItem>
                  <SelectItem value="72">{isAr ? "72 ساعة (3 أيام)" : "72 hours (3 days)"}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground">
                {isAr ? "ملاحظة (اختياري)" : "Label (optional)"}
              </label>
              <input
                value={label}
                onChange={e => setLabel(e.target.value)}
                placeholder={isAr ? "مثال: عرض العميل — محمد" : "e.g. Client demo — Mohammed"}
                className="w-full h-9 text-sm bg-background rounded-md border border-input px-3 py-2 placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="bg-muted/40 rounded-lg p-3 flex gap-2 text-xs text-muted-foreground">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {isAr
                ? "يتم توليد 3 روابط دفعة واحدة — رابط لكل تطبيق. كل رابط صالح للاستخدام مرة واحدة فقط."
                : "3 links are generated at once — one per app. Each link is single-use only."}
            </span>
          </div>

          <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2">
            {generating
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <Link2 className="w-4 h-4" />}
            {generating
              ? (isAr ? "جارٍ التوليد…" : "Generating…")
              : (isAr ? "ولّد 3 روابط مؤقتة" : "Generate 3 Preview Links")}
          </Button>
        </CardContent>
      </Card>

      {newLinks.length > 0 && (
        <Card className="border-amber-300 bg-amber-50/30 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
              {isAr ? "الروابط الجديدة — شاركها الآن" : "New Links — Share Now"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {newLinks.map(link => (
              <LinkCard key={link.id} link={link} highlight />
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {isAr ? "الروابط النشطة" : "Active Links"}
            {!loading && links.length > 0 && (
              <Badge variant="secondary" className="ml-auto">{links.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
            </div>
          ) : links.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Link2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">{isAr ? "لا توجد روابط نشطة" : "No active links"}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {links.map(link => (
                <LinkCard key={link.id} link={link} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
