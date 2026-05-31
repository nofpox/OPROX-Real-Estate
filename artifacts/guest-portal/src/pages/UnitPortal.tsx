import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap, Droplets, Wind, Brush, Wrench, Volume2, DoorOpen,
  CheckCircle2, Loader2, Building2, AlertCircle,
} from "lucide-react";

const REQUEST_TYPES = [
  { value: "electrical",  labelAr: "كهرباء",       labelEn: "Electrical",   icon: Zap,      color: "text-yellow-500" },
  { value: "plumbing",    labelAr: "سباكة",         labelEn: "Plumbing",     icon: Droplets, color: "text-blue-500"   },
  { value: "ac",          labelAr: "تكييف / تدفئة", labelEn: "AC / Heating", icon: Wind,     color: "text-cyan-500"   },
  { value: "cleaning",    labelAr: "تنظيف",         labelEn: "Cleaning",     icon: Brush,    color: "text-green-500"  },
  { value: "maintenance", labelAr: "صيانة عامة",    labelEn: "Maintenance",  icon: Wrench,   color: "text-orange-500" },
  { value: "noise",       labelAr: "ضوضاء",         labelEn: "Noise",        icon: Volume2,  color: "text-red-500"    },
  { value: "other",       labelAr: "أخرى",          labelEn: "Other",        icon: DoorOpen, color: "text-slate-400"  },
];

type UnitInfo = { id: number; name: string; propertyName: string | null };
type Result   = { refCode: string; workOrderId: number; message: string };

export default function UnitPortal() {
  const params = useParams<{ id: string }>();
  const unitId = Number(params.id);

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
        throw new Error(body.error || "Failed to submit");
      }
      setResult(await res.json());
    } catch (err: any) {
      setError(err.message || "حدث خطأ. يرجى المحاولة مرة أخرى.");
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
        <h1 className="text-2xl font-bold text-slate-800 mb-1">تم الاستلام</h1>
        <p className="text-slate-500 text-sm mb-6">Request Received</p>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-6 w-full max-w-xs mb-6">
          <p className="text-xs text-slate-400 mb-1">رمز الطلب · Reference Code</p>
          <p className="text-3xl font-bold tracking-widest text-slate-800">{result.refCode}</p>
        </div>

        <p className="text-sm text-slate-600 max-w-xs leading-relaxed mb-8">
          {result.message}
          <br />
          <span className="text-slate-400 text-xs mt-1 block">احتفظ برمز الطلب للمتابعة · Keep your reference code</span>
        </p>

        <Button variant="outline" onClick={reset} className="w-full max-w-xs">
          تقديم طلب آخر · New Request
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
          {unitLoading ? (
            <Skeleton className="h-6 w-40 mb-1" />
          ) : unit ? (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <Building2 size={15} className="text-amber-500" />
                <p className="text-xs text-slate-400">{unit.propertyName}</p>
              </div>
              <h1 className="text-xl font-bold text-slate-800">{unit.name}</h1>
            </>
          ) : (
            <div className="flex items-center gap-2 text-red-500">
              <AlertCircle size={16} />
              <p className="text-sm">الوحدة غير موجودة · Unit not found</p>
            </div>
          )}
          <p className="text-xs text-slate-400 mt-1">طلب خدمة · Service Request</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6 space-y-6">
        {/* Type selector */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            نوع الطلب <span className="text-slate-400 font-normal">· Request Type</span>
          </p>
          <div className="grid grid-cols-3 gap-3">
            {REQUEST_TYPES.map(rt => {
              const Icon = rt.icon;
              const isSelected = selected === rt.value;
              return (
                <button
                  key={rt.value}
                  onClick={() => setSelected(rt.value)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all ${
                    isSelected
                      ? "border-amber-400 bg-amber-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <Icon size={22} className={isSelected ? "text-amber-500" : rt.color} />
                  <span className="text-xs font-semibold text-slate-700 leading-tight text-center">
                    {rt.labelAr}
                  </span>
                  <span className="text-[10px] text-slate-400 leading-none">{rt.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-2">
            وصف المشكلة <span className="text-slate-400 font-normal">· Description</span>
            <span className="text-red-400 ms-1">*</span>
          </p>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="اكتب وصفاً مختصراً للمشكلة… · Briefly describe the issue…"
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
            : "إرسال الطلب · Submit Request"
          }
        </Button>
      </div>
    </div>
  );
}
