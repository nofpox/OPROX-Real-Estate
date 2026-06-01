import { useState } from "react";
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
  Phone, Camera, Utensils, Trees,
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

  function reset() {
    setSelectedId(null);
    setDescription("");
    setTimeSlot("");
    setResult(null);
    setError(null);
  }

  const isFormValid = selectedCat && description.trim() && (!isResidential || timeSlot);

  /* ── Success screen ────────────────────────────────────────────────────── */
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

        <p className="text-sm text-slate-600 max-w-xs leading-relaxed mb-2">{result.message}</p>
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
