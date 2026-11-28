import { useState, useEffect } from "react";
import { overlay, shadowLg, shadowPrimary } from "./theme";

// ─── CUSTOM CONFIRM DIALOG (replaces native confirm) ───
let _confirm = null;
export function appConfirm(opts) {
  if (_confirm) return _confirm(opts || {});
  return Promise.resolve(typeof window !== "undefined" ? window.confirm((opts && opts.message) || "") : false);
}
// Disable pinch / double-tap zoom while a modal editor is open (native-app feel).
// iOS Safari ignores viewport user-scalable=no, so we also block the gesture events directly.
export function useNoZoom() {
  useEffect(() => {
    const vp = document.querySelector('meta[name="viewport"]');
    const prev = vp ? vp.getAttribute("content") : null;
    if (vp) vp.setAttribute("content", "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no");

    const stop = (e) => { e.preventDefault(); };
    const onTouchMove = (e) => { if (e.touches && e.touches.length > 1) e.preventDefault(); };

    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    document.addEventListener("gestureend", stop, { passive: false });
    document.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      if (vp && prev != null) vp.setAttribute("content", prev);
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("gestureend", stop);
      document.removeEventListener("touchmove", onTouchMove);
    };
  }, []);
}

export function ConfirmHost() {
  const [state, setState] = useState(null);
  useEffect(() => {
    _confirm = (opts) => new Promise((resolve) => setState(Object.assign({}, opts, { resolve })));
    return () => { _confirm = null; };
  }, []);
  if (!state) return null;
  function close(val) { const r = state.resolve; setState(null); if (r) r(val); }
  return (
    <div style={Object.assign({}, overlay, { alignItems: "center", padding: 24, zIndex: 300 })} onClick={() => close(false)}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 20, padding: 24, width: "100%", maxWidth: 360, boxShadow: shadowLg, animation: "popIn .2s cubic-bezier(.22,1,.36,1)" }}>
        {state.title && <div style={{ fontSize: 18, fontWeight: 700, color: "#1a2332", marginBottom: 8 }}>{state.title}</div>}
        {state.message && <div style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5, marginBottom: 22 }}>{state.message}</div>}
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => close(false)} style={{ flex: 1, background: "#f3f4f6", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 600, color: "#374151", minHeight: 48 }}>{state.cancelLabel || "Cancel"}</button>
          <button onClick={() => close(true)} style={{ flex: 1, background: state.danger ? "#dc2626" : "linear-gradient(180deg,#2b7cf0,#1a73e8)", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 15, fontWeight: 700, minHeight: 48, boxShadow: state.danger ? "none" : shadowPrimary }}>{state.confirmLabel || "Confirm"}</button>
        </div>
      </div>
    </div>
  );
}

