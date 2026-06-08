import { useEffect } from "react";

const BLOCKED_KEYS = new Set(["PrintScreen", "F12"]);
const BLOCKED_META = new Set(["3", "4", "5", "s", "S", "p", "P"]);

export function ScreenGuard() {
  useEffect(() => {
    // 1. Disable right-click context menu
    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    // 2. Block screenshot keyboard shortcuts
    const onKeyDown = (e: KeyboardEvent) => {
      if (BLOCKED_KEYS.has(e.key)) {
        e.preventDefault();
        // Clear clipboard just in case
        navigator.clipboard.writeText("").catch(() => {});
        flashOverlay();
        return;
      }
      // Cmd+Shift+3/4/5 (macOS), Ctrl+Shift+S, Ctrl+P (print)
      if ((e.metaKey || e.ctrlKey) && (e.shiftKey || !e.shiftKey)) {
        if (BLOCKED_META.has(e.key)) {
          e.preventDefault();
          flashOverlay();
          return;
        }
      }
      // Windows Snipping Tool shortcut: Win+Shift+S is OS-level (can't block)
      // But block Ctrl+Shift+I (DevTools)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") {
        e.preventDefault();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        navigator.clipboard.writeText("").catch(() => {});
        flashOverlay();
      }
    };

    // 3. Prevent drag (prevents partial screenshot via drag-select)
    const onDragStart = (e: DragEvent) => e.preventDefault();

    // 4. Prevent copy
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData("text/plain", "");
    };

    // 5. Prevent print (Ctrl+P)
    const onBeforePrint = () => {
      document.body.style.visibility = "hidden";
    };
    const onAfterPrint = () => {
      document.body.style.visibility = "";
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown",     onKeyDown);
    document.addEventListener("keyup",       onKeyUp);
    document.addEventListener("dragstart",   onDragStart);
    document.addEventListener("copy",        onCopy);
    window.addEventListener("beforeprint",   onBeforePrint);
    window.addEventListener("afterprint",    onAfterPrint);

    // 6. Global CSS
    const style = document.createElement("style");
    style.id = "screen-guard-css";
    style.textContent = `
      * {
        -webkit-user-select: none !important;
        user-select: none !important;
        -webkit-touch-callout: none !important;
      }
      @media print {
        * { display: none !important; }
        body::after {
          content: "طباعة هذه الصفحة غير مسموحة" !important;
          display: block !important;
          font-size: 2rem;
          text-align: center;
          padding: 4rem;
        }
      }
    `;
    document.head.appendChild(style);

    // 7. Overlay on visibility change (tab switch / screen recorder detection)
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") flashOverlay(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      document.removeEventListener("contextmenu",     onContextMenu);
      document.removeEventListener("keydown",         onKeyDown);
      document.removeEventListener("keyup",           onKeyUp);
      document.removeEventListener("dragstart",       onDragStart);
      document.removeEventListener("copy",            onCopy);
      document.removeEventListener("visibilitychange",onVisibilityChange);
      window.removeEventListener("beforeprint",       onBeforePrint);
      window.removeEventListener("afterprint",        onAfterPrint);
      document.getElementById("screen-guard-css")?.remove();
    };
  }, []);

  return null;
}

// Flash a black full-screen overlay briefly to interrupt screenshot capture
function flashOverlay(hold = false) {
  const existing = document.getElementById("screen-guard-overlay");
  if (existing) return;
  const el = document.createElement("div");
  el.id = "screen-guard-overlay";
  Object.assign(el.style, {
    position: "fixed",
    inset: "0",
    zIndex: "999999",
    background: "#000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    gap: "12px",
  });
  const icon = document.createElement("div");
  icon.textContent = "🔒";
  icon.style.fontSize = "48px";
  const msg = document.createElement("p");
  msg.textContent = "تصوير الشاشة غير مسموح";
  msg.style.cssText = "color:#fff;font-size:18px;font-family:sans-serif;margin:0;";
  el.appendChild(icon);
  el.appendChild(msg);
  document.body.appendChild(el);
  if (!hold) {
    setTimeout(() => el.remove(), 800);
  }
}
