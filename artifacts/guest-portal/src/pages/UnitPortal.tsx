import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Zap, Droplets, Wind, Brush, Wrench, Volume2, DoorOpen,
  CheckCircle2, Loader2, Building2, AlertCircle,
} from "lucide-react";

const REQUEST_ICONS: Record<string, { icon: typeof Zap; color: string }> = {
  electrical:  { icon: Zap,      color: "text-yellow-500" },
  plumbing:    { icon: Droplets, color: "text-blue-500"   },
  ac:          { icon: Wind,     color: "text-cyan-500"   },
  cleaning:    { icon: Brush,    color: "text-green-500"  },
  maintenance: { icon: Wrench,   color: "text-orange-500" },
  noise:       { icon: Volume2,  color: "text-red-500"    },
  other:       { icon: DoorOpen, color: "text-slate-400"  },
};

const REQUEST_TYPE_KEYS = ["electrical", "plumbing", "ac", "cleaning", "maintenance", "noise", "other"] as const;

type UnitInfo = { id: number; name: string; propertyName: string | null };
type Result   = { refCode: string; workOrderId: number; message: string };

export default function UnitPortal() {
  const params = useParams<{ id: string }>();
  const unitId = Number(params.id);
  const { t } = useTranslation();

  const [selected,    setSelected]    = useState("");
  const [description, setDescription] = useState("");
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [result,      setResult]      = useState<Result | null>(null);

  const { data: unit, isLoading: unitLoading } = useQuery<UnitInfo>({
    queryKey: ["unit-info", unitId],
    queryFn: () =>
      fetch(`/api/unit-info/${unitId}`).then(r => {
        if (!r.ok) throw new Error("Unit not found");
        return r.json();
      }),
    enabled: !!unitId,
    retry: false,
  });

  async function handleSubmit() {
    if (!selected || !description.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/unit-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitId, type: selected, description: description.trim() }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || t("request.errorGeneric"));
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || t("request.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setSelected("");
    setDescription("");
    setResult(null);
    setError(null);
  }

  /* ── Success screen ───────────────────────────────────────────────────── */
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
          <CheckCircle2 size={40} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">{t("request.success.title")}</h1>
        <p className="text-slate-500 text-sm mb-6">{t("request.success.subtitle")}</p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-6 w-full max-w-xs mb-6">
          <p className="text-xs text-slate-400 mb-1">{t("request.success.refCode")}</p>
          <p className="text-3xl font-bold tracking-widest text-slate-800">{result.refCode}</p>
        </div>

        <p className="text-sm text-slate-600 max-w-xs leading-relaxed mb-2">
          {result.message}
        </p>
        <p className="text-slate-400 text-xs mb-8">{t("request.success.keepCode")}</p>

        <Button variant="outline" onClick={reset} className="w-full max-w-xs">
          {t("request.success.newRequest")}
        </Button>
      </div>
    );
  }

  /* ── Main form ────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-5">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-2">
            {unitLoading ? (
              <Skeleton className="h-6 w-40" />
            ) : unit ? (
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Building2 size={15} className="text-amber-500" />
                  <p className="text-xs text-slate-400">{unit.propertyName}</p>
                </div>
                <h1 className="text-xl font-bold text-slate-800">{unit.name}</h1>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-500">
                <AlertCircle size={16} />
                <p className="text-sm">{t("request.unitNotFound")}</p>
              </div>
            )}
            <LanguageSwitcher />
          </div>
          <p className="text-xs text-slate-400">{t("request.serviceRequest")}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* Type selector */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            {t("request.requestType")} <span className="text-red-400">*</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {REQUEST_TYPE_KEYS.map(key => {
              const { icon: Icon, color } = REQUEST_ICONS[key];
              const isSelected = selected === key;
              return (
                <button
                  key={key}
                  onClick={() => setSelected(key)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? "border-amber-400 bg-amber-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Icon size={22} className={isSelected ? "text-amber-500" : color} />
                  <span className="text-xs font-semibold text-slate-700 leading-tight text-center">
                    {t(`request.types.${key}`)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            {t("request.description")} <span className="text-red-400">*</span>
          </p>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t("request.descPlaceholder")}
            className="min-h-[120px] bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={!selected || !description.trim() || submitting || !unit}
          className="w-full h-14 text-base font-bold bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-40"
        >
          {submitting
            ? <Loader2 size={18} className="animate-spin" />
            : t("request.submit")
          }
        </Button>
      </div>
    </div>
  );
}
