import { useState, useEffect, useCallback } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Zap, Droplets, Wind, Brush, Wrench, Volume2, DoorOpen,
  CheckCircle2, Loader2, Building2, AlertCircle, Clock,
  Key, Wifi, Car, Thermometer, Trash2, Shield, Coffee, Package,
  Phone, Camera, Utensils, Trees, Star, RefreshCw,
} from "lucide-react";

type IconComponent = React.ComponentType<{ size?: number; className?: string }>;

const ICON_MAP: Record<string, IconComponent> = {
  zap:         Zap,
  droplets:    Droplets,
  wind:        Wind,
  brush:       Brush,
  wrench:      Wrench,
  "volume-2":  Volume2,
  "door-open": DoorOpen,
  key:         Key,
  wifi:        Wifi,
  car:         Car,
  thermometer: Thermometer,
  "trash-2":   Trash2,
  shield:      Shield,
  coffee:      Coffee,
  package:     Package,
  phone:       Phone,
  camera:      Camera,
  utensils:    Utensils,
  trees:       Trees,
};

const COLOR_CLASS: Record<string, string> = {
  yellow: "text-yellow-500",
  blue:   "text-blue-500",
  cyan:   "text-cyan-500",
  green:  "text-green-500",
  orange: "text-orange-500",
  red:    "text-red-500",
  purple: "text-purple-500",
  indigo: "text-indigo-500",
  slate:  "text-slate-400",
  amber:  "text-amber-500",
  pink:   "text-pink-500",
  teal:   "text-teal-500",
};

const TIME_SLOTS = [
  "08:00 – 10:00",
  "10:00 – 12:00",
  "12:00 – 14:00",
  "14:00 – 16:00",
  "16:00 – 18:00",
  "18:00 – 20:00",
];

const RESIDENTIAL_TYPES = ["compound", "tower"];

type UnitInfo = {
  id: number;
  name: string;
  propertyName: string | null;
  propertyType: string | null;
};

type ServiceCategory = {
  id: number;
  name: string;
  icon: string;
  color: string;
  propertyTypes: string;
  isActive: boolean;
  sortOrder: number;
  priority: string;
  requiresTimeSlot: boolean;
};

type Result = { refCode: string; workOrderId: number; message: string };
type RequestStatus = { id: number; status: string; title: string; unitId: number; refCode: string };

const RESOLVED_STATUSES = ["completed", "resolved", "closed", "done"];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1 justify-center">
      {[1, 2, 3, 4, 5].map(star => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star
            size={36}
            className={`transition-colors ${
              star <= (hovered || value)
                ? "text-amber-400 fill-amber-400"
                : "text-slate-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function UnitPortal() {
  const params = useParams<{ id: string }>();
  const unitId = Number(params.id);
  const { t } = useTranslation();

  const [selectedId,   setSelectedId]   = useState<number | null>(null);
  const [description,  setDescription]  = useState("");
  const [timeSlot,     setTimeSlot]     = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [result,       setResult]       = useState<Result | null>(null);

  // Rating state
  const [reqStatus,      setReqStatus]      = useState<RequestStatus | null>(null);
  const [statusChecking, setStatusChecking] = useState(false);
  const [rating,         setRating]         = useState(0);
  const [comment,        setComment]        = useState("");
  const [ratingDone,     setRatingDone]     = useState(false);
  const [ratingSubmitting, setRatingSubmitting] = useState(false);

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

  const isResidential = RESIDENTIAL_TYPES.includes(unit?.propertyType ?? "");

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<ServiceCategory[]>({
    queryKey: ["service-categories", unit?.propertyType],
    queryFn: () => {
      const qs = unit?.propertyType ? `?propertyType=${unit.propertyType}` : "";
      return fetch(`/api/service-categories${qs}`).then(r => r.json());
    },
    enabled: !!unit,
  });

  const selectedCat = categories.find(c => c.id === selectedId) ?? null;

  // Poll for status change every 30 seconds after submission
  const checkStatus = useCallback(async (refCode: string) => {
    setStatusChecking(true);
    try {
      const res = await fetch(`/api/unit-requests/by-ref/${refCode}`);
      if (res.ok) {
        const data = await res.json();
        setReqStatus(data);
      }
    } finally {
      setStatusChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!result) return;
    checkStatus(result.refCode);
    const interval = setInterval(() => checkStatus(result.refCode), 30_000);
    return () => clearInterval(interval);
  }, [result, checkStatus]);

  const isResolved = reqStatus ? RESOLVED_STATUSES.includes(reqStatus.status) : false;

  async function handleSubmit() {
    if (!selectedCat || !description.trim()) return;
    if (isResidential && !timeSlot) return;

    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        unitId,
        type:        selectedCat.name,
        description: description.trim(),
      };
      if (timeSlot) body.preferredTimeSlot = timeSlot;

      const res = await fetch("/api/unit-requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) {
        const b = await res.json();
        throw new Error(b.error || t("request.errorGeneric"));
      }
      setResult(await res.json());
    } catch (err: unknown) {
      setError((err as Error).message || t("request.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRatingSubmit() {
    if (!rating || !unitId) return;
    setRatingSubmitting(true);
    try {
      await fetch("/api/guest/feedback", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ roomId: unitId, rating: String(rating), comment: comment.trim() || undefined }),
      });
      setRatingDone(true);
    } finally {
      setRatingSubmitting(false);
    }
  }

  function reset() {
    setSelectedId(null);
    setDescription("");
    setTimeSlot("");
    setResult(null);
    setError(null);
    setReqStatus(null);
    setRating(0);
    setComment("");
    setRatingDone(false);
  }

  const isFormValid = selectedCat && description.trim() && (!isResidential || timeSlot);

  /* ── Success screen ────────────────────────────────────────────────────── */
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-start px-6 py-12">

        {/* Confirmation card */}
        <div className="w-full max-w-xs">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-6 mx-auto">
            <CheckCircle2 size={40} className="text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1 text-center">{t("request.success.title")}</h1>
          <p className="text-slate-500 text-sm mb-6 text-center">{t("request.success.subtitle")}</p>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-8 py-6 w-full mb-6">
            <p className="text-xs text-slate-400 mb-1 text-center">{t("request.success.refCode")}</p>
            <p className="text-3xl font-bold tracking-widest text-slate-800 text-center">{result.refCode}</p>
          </div>

          <p className="text-sm text-slate-600 max-w-xs leading-relaxed mb-2 text-center">{result.message}</p>
          <p className="text-slate-400 text-xs mb-8 text-center">{t("request.success.keepCode")}</p>
        </div>

        {/* ── Status tracker ──────────────────────────────────────────────── */}
        <div className="w-full max-w-xs mb-6">
          <div className={`rounded-2xl border px-5 py-4 ${
            isResolved
              ? "bg-emerald-50 border-emerald-200"
              : "bg-white border-slate-200"
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                {t("request.status.label")}
              </p>
              <button
                onClick={() => checkStatus(result.refCode)}
                disabled={statusChecking}
                className="text-slate-400 hover:text-amber-500 transition-colors"
              >
                <RefreshCw size={14} className={statusChecking ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                isResolved               ? "bg-emerald-500" :
                reqStatus?.status === "in-progress" ? "bg-amber-400 animate-pulse" :
                "bg-slate-300"
              }`} />
              <span className={`text-sm font-semibold capitalize ${
                isResolved ? "text-emerald-700" : "text-slate-700"
              }`}>
                {reqStatus?.status
                  ? reqStatus.status.replace(/-/g, " ")
                  : t("request.status.pending")}
              </span>
            </div>
            {!isResolved && (
              <p className="text-[11px] text-slate-400 mt-2">{t("request.status.hint")}</p>
            )}
          </div>
        </div>

        {/* ── Rating section — appears once resolved ──────────────────────── */}
        {isResolved && !ratingDone && (
          <div className="w-full max-w-xs mb-6">
            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm px-6 py-6">
              <h2 className="text-base font-bold text-slate-800 mb-1 text-center">
                {t("request.rating.title")}
              </h2>
              <p className="text-xs text-slate-400 mb-5 text-center">
                {t("request.rating.subtitle")}
              </p>

              <StarRating value={rating} onChange={setRating} />

              <Textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder={t("request.rating.commentPlaceholder")}
                className="mt-4 min-h-[80px] bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400 resize-none text-sm"
              />

              <Button
                onClick={handleRatingSubmit}
                disabled={!rating || ratingSubmitting}
                className="mt-4 w-full bg-amber-500 hover:bg-amber-600 text-black font-bold"
              >
                {ratingSubmitting
                  ? <Loader2 size={16} className="animate-spin" />
                  : t("request.rating.submit")}
              </Button>
            </div>
          </div>
        )}

        {ratingDone && (
          <div className="w-full max-w-xs mb-6">
            <div className="bg-emerald-50 rounded-2xl border border-emerald-200 px-6 py-5 text-center">
              <CheckCircle2 size={28} className="text-emerald-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-emerald-800">{t("request.rating.thankyou")}</p>
            </div>
          </div>
        )}

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
        <div className="max-md mx-auto" style={{ maxWidth: 448 }}>
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

      <div className="max-md mx-auto px-6 py-6 space-y-6" style={{ maxWidth: 448 }}>
        {/* Service type selector — dynamically loaded from DB */}
        <div>
          <p className="text-sm font-semibold text-slate-700 mb-3">
            {t("request.requestType")} <span className="text-red-400">*</span>
          </p>
          {categoriesLoading ? (
            <div className="grid grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-2xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {categories.map(cat => {
                const Icon = ICON_MAP[cat.icon] ?? Wrench;
                const colorCls = COLOR_CLASS[cat.color] ?? "text-slate-400";
                const isSelected = selectedId === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedId(cat.id)}
                    className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 transition-all ${
                      isSelected
                        ? "border-amber-400 bg-amber-50 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                  >
                    <Icon size={22} className={isSelected ? "text-amber-500" : colorCls} />
                    <span className="text-xs font-semibold text-slate-700 leading-tight text-center">
                      {cat.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
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

        {/* Preferred Time Slot — mandatory for residential (compound / tower) */}
        {isResidential && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Clock size={14} className="text-amber-500" />
              {t("request.timeSlot")} <span className="text-red-400">*</span>
            </p>
            <Select value={timeSlot} onValueChange={setTimeSlot}>
              <SelectTrigger className="bg-white border-slate-200 text-slate-800 h-12">
                <SelectValue placeholder={t("request.timeSlotPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {TIME_SLOTS.map(slot => (
                  <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-slate-400 mt-1.5">{t("request.timeSlotHint")}</p>
          </div>
        )}

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
          disabled={!isFormValid || submitting || !unit}
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
