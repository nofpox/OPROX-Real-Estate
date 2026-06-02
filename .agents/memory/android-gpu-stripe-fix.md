---
name: Android Chrome GPU stripe fix
description: Complete fix for horizontal-stripe GPU tile corruption on Android Chrome in dashboard/portal layouts
---

## The Problem

Android Chrome renders scrollable content via GPU tile composition. When multiple compositor layers interact — especially `position: fixed` elements alongside an `overflow: auto` scroll container — the GPU fails to invalidate and repaint tiles correctly after scroll/resize/keyboard events. The result is horizontal black stripes with corrupted/duplicated content visible in the upper portion of the page.

## Triggers (all must be eliminated)

1. **`position: fixed` elements** — each creates a compositor layer. Mobile overlays, sidebars, and headers with `fixed` are the most common culprit.
2. **`backdrop-filter: blur()`** — `backdrop-blur` and `supports-[backdrop-filter]:...` on sticky/fixed headers. Forces compositor layer promotion on the backdrop target.
3. **RGBA / opacity-suffixed backgrounds on sticky/fixed elements** — `bg-background/95`, `border-border/40`, etc. On sticky/fixed elements these create new stacking contexts + compositor layers.
4. **`isolation: isolate` on the scroll container's child** — creates a conflicting compositor context inside the already-composited `overflow-auto` container.
5. **Unconstrained `min-h-screen` outer + `overflow-auto` inner** — without a height constraint on the outer div, the scroll container height is unbounded and can cause recomposition on every resize.

## Complete Fix Pattern

### Layout shell (hotel-dashboard pattern — applies to all dashboard apps)

```jsx
// Outer wrapper: height-constrained (h-dvh) + relative (so absolute children are contained)
// NO: min-h-screen, overflow:visible, position:fixed children
<div className="relative flex h-dvh w-full overflow-hidden ...">

  // Mobile overlay: absolute (not fixed) — contained in h-dvh parent
  <div className="absolute inset-0 z-40" />          // backdrop
  <aside className="absolute inset-y-0 z-50 ..." />  // drawer

  // Desktop sidebar: normal flex child (not fixed)
  // Self-stretches to full h-dvh height via flexbox
  <aside className="hidden lg:flex flex-shrink-0 ..." />

  // Main content: the ONLY scroll container
  // min-h-0 lets flex-1 shrink below intrinsic height so overflow-auto has a bounded container
  <div className="flex flex-1 flex-col min-h-0 overflow-auto">
    <header className="sticky top-0 ..." />  // sticks within overflow-auto, not document
    <main className="flex-1 ..." />          // NO isolation:isolate here
  </div>
</div>
```

### Public website / portal (single-column layout)

```jsx
// Single-column with sticky header — same principle: h-dvh overflow-auto on outer
<div className="h-dvh overflow-auto flex flex-col ...">
  <header className="sticky top-0 bg-background border-b border-border">
    // NO backdrop-blur, NO bg-background/95, NO border-border/40
  </header>
  <main className="flex-1" />
  <footer />
</div>
```

### Page-level RGBA backgrounds

Replace any `/opacity` modifier on non-interactive backgrounds:
- `bg-muted/50` → `bg-muted`
- `bg-primary/10` → `bg-primary` (with matching text color)
- `bg-secondary/10` → `bg-secondary/10` (OK on non-sticky, non-fixed elements)
- `bg-background/95` on sticky header → `bg-background` (solid)

## Why `absolute` instead of `fixed` for the mobile drawer

`position: fixed` is always relative to the viewport and ALWAYS creates a compositor layer regardless of background color. By making the outer wrapper `h-dvh relative`, an `absolute inset-0` or `absolute inset-y-0` element covers exactly the same visual area as `fixed` would — but stays within the same stacking context as the `overflow-auto` scroll container. No compositor layer conflict.

## Key rules for new layouts

- Never use `position: fixed` unless absolutely unavoidable (e.g., toast notifications rendered via portal to document.body)
- Always use `h-dvh` (not `min-h-screen`) on the outermost shell so `overflow-auto` scroll containers have a bounded height
- Sticky headers that should stick within a scroll container must be inside the `overflow-auto` div, not outside it
- No `backdrop-blur` anywhere on sticky or fixed elements
- No inline `rgba()` box-shadows on overlays — use Tailwind `shadow-*` classes
