import React, { useEffect, useState, useCallback } from "react";
import ReactDOM from "react-dom";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTour } from "./tour-context";

const SPOT_PADDING = 10;
const TOOLTIP_WIDTH = 340;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function findTargetRect(tourId: string): Rect | null {
  const el = document.querySelector(`[data-tour="${tourId}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top:    r.top    - SPOT_PADDING,
    left:   r.left   - SPOT_PADDING,
    width:  r.width  + SPOT_PADDING * 2,
    height: r.height + SPOT_PADDING * 2,
  };
}

function tooltipStyle(
  spotRect: Rect | null,
  position: string,
): React.CSSProperties {
  if (!spotRect || position === "center") {
    return {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: TOOLTIP_WIDTH,
      zIndex: 10001,
    };
  }

  const gap = 18;
  const approxH = 260;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top: number;
  let left: number;

  switch (position) {
    case "right":
      top  = spotRect.top + spotRect.height / 2 - approxH / 2;
      left = spotRect.left + spotRect.width + gap;
      if (left + TOOLTIP_WIDTH > vw - gap) {
        left = spotRect.left - TOOLTIP_WIDTH - gap;
      }
      break;
    case "left":
      top  = spotRect.top + spotRect.height / 2 - approxH / 2;
      left = spotRect.left - TOOLTIP_WIDTH - gap;
      break;
    case "top":
      top  = spotRect.top - approxH - gap;
      left = spotRect.left + spotRect.width / 2 - TOOLTIP_WIDTH / 2;
      break;
    default: // bottom
      top  = spotRect.top + spotRect.height + gap;
      left = spotRect.left + spotRect.width / 2 - TOOLTIP_WIDTH / 2;
  }

  top  = Math.max(gap, Math.min(top,  vh - approxH - gap));
  left = Math.max(gap, Math.min(left, vw - TOOLTIP_WIDTH - gap));

  return {
    position: "fixed",
    top,
    left,
    width: TOOLTIP_WIDTH,
    zIndex: 10001,
  };
}

export function TourOverlay() {
  const {
    isActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    nextStep,
    prevStep,
    skipTour,
    finishTour,
  } = useTour();

  const [spotRect, setSpotRect] = useState<Rect | null>(null);

  const updateRect = useCallback(() => {
    if (!currentStep.target) { setSpotRect(null); return; }
    setSpotRect(findTargetRect(currentStep.target));
  }, [currentStep.target]);

  useEffect(() => {
    if (!isActive) return;
    // Allow DOM to settle before measuring
    const t = setTimeout(() => {
      updateRect();
      if (currentStep.target) {
        const el = document.querySelector(`[data-tour="${currentStep.target}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }, 80);
    return () => clearTimeout(t);
  }, [isActive, currentStep, updateRect]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [isActive, updateRect]);

  // Keyboard navigation
  useEffect(() => {
    if (!isActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape")       { skipTour(); return; }
      if (e.key === "ArrowRight")   nextStep();
      if (e.key === "ArrowLeft")    prevStep();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, nextStep, prevStep, skipTour]);

  if (!isActive) return null;

  const isFirst = currentStepIndex === 0;
  const isLast  = currentStepIndex === totalSteps - 1;
  const isCentered = !currentStep.target || !spotRect;

  const content = (
    <>
      {/* ── Backdrop / spotlight ──────────────────────────────────────────────── */}
      {spotRect ? (
        <>
          {/* Transparent click-dismiss layer */}
          <div
            style={{ position: "fixed", inset: 0, zIndex: 9997, cursor: "default" }}
            onClick={skipTour}
            aria-hidden="true"
          />
          {/* Spotlight box — box-shadow acts as the full-page dark overlay */}
          <div
            style={{
              position: "fixed",
              top:    spotRect.top,
              left:   spotRect.left,
              width:  spotRect.width,
              height: spotRect.height,
              borderRadius: 12,
              boxShadow: "0 0 0 100vmax rgba(0,0,0,0.72)",
              outline: "2.5px solid hsl(var(--primary))",
              outlineOffset: 2,
              zIndex: 9998,
              pointerEvents: "none",
              transition: "top 0.22s ease, left 0.22s ease, width 0.22s ease, height 0.22s ease",
            }}
          />
        </>
      ) : (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", zIndex: 9997 }}
          onClick={skipTour}
          aria-hidden="true"
        />
      )}

      {/* ── Tooltip card ──────────────────────────────────────────────────────── */}
      <div
        style={tooltipStyle(isCentered ? null : spotRect, currentStep.position)}
        className="rounded-2xl border border-border/60 bg-card shadow-[0_24px_60px_rgba(0,0,0,0.35)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Coloured top strip */}
        <div className="h-1.5 bg-gradient-to-r from-primary via-primary/80 to-primary/40" />

        {/* Header row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-0">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center shrink-0">
              <span className="text-[10px] font-bold text-primary-foreground">
                {currentStepIndex + 1}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              Step {currentStepIndex + 1} of {totalSteps}
            </span>
          </div>
          <button
            onClick={skipTour}
            className="text-muted-foreground hover:text-foreground transition-colors rounded p-1"
            aria-label="Close tour"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="mx-5 mt-3 h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-2 space-y-2">
          <p className="font-semibold text-[15px] text-foreground leading-snug">
            {currentStepIndex === 0 && (
              <Sparkles className="h-4 w-4 text-primary inline-block me-1.5 -mt-0.5" />
            )}
            {currentStep.title}
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {currentStep.description}
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pt-2 pb-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-200 ${
                i === currentStepIndex
                  ? "w-5 h-2 bg-primary"
                  : i < currentStepIndex
                    ? "w-2 h-2 bg-primary/40"
                    : "w-2 h-2 bg-muted-foreground/25"
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-3 flex items-center justify-between gap-3">
          <button
            onClick={skipTour}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                size="sm"
                variant="outline"
                onClick={prevStep}
                className="gap-1 h-8 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
            )}
            <Button
              size="sm"
              onClick={isLast ? finishTour : nextStep}
              className="gap-1 h-8 text-xs min-w-[88px]"
            >
              {isLast ? (
                "Finish ✓"
              ) : (
                <>Next <ChevronRight className="h-3.5 w-3.5" /></>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );

  return ReactDOM.createPortal(content, document.body);
}
