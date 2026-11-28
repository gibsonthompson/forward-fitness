import { useState, useEffect, useRef } from "react";
import { shadowSm, shadowMd, BORDER } from "./theme";

export function Segmented(props) {
  return (
    <div style={{ display: "flex", background: "#eef1f5", borderRadius: 14, padding: 4, marginBottom: 16 }}>
      {props.options.map((o) => {
        const on = props.value === o.id;
        return (
          <button key={o.id} onClick={() => props.onChange(o.id)} style={{ flex: 1, border: "none", borderRadius: 11, padding: "10px 8px", minHeight: 42, background: on ? "#fff" : "transparent", color: on ? "#1a2332" : "#6b7280", fontSize: 14, fontWeight: 700, boxShadow: on ? shadowSm : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
            {o.label}
            {o.badge > 0 && <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px" }}>{o.badge}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Themed dropdown (no native select).
export function Dropdown(props) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    function off(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  const cur = props.options.find((o) => o.value === props.value);
  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(!open)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: "#f7f9fc", border: "1px solid " + (open ? "#1a73e8" : "#e3e8ef"), borderRadius: 12, padding: "11px 14px", minHeight: 46, fontSize: 15, fontWeight: 700, color: "#1a2332", textAlign: "left" }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cur ? cur.label : "Choose"}</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, transform: open ? "rotate(180deg)" : "none", transition: "transform .15s" }}><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid " + BORDER, borderRadius: 14, boxShadow: shadowMd, maxHeight: 280, overflowY: "auto", padding: 4 }}>
          {props.options.map((o) => {
            const on = o.value === props.value;
            return (
              <button key={o.value} onClick={() => { props.onChange(o.value); setOpen(false); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, background: on ? "#f0f5ff" : "transparent", border: "none", borderRadius: 10, padding: "11px 12px", fontSize: 14.5, fontWeight: on ? 700 : 500, color: on ? "#1a73e8" : "#1a2332", textAlign: "left" }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
                {o.meta && <span style={{ flexShrink: 0, fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{o.meta}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function LineChart(props) {
  const pts = props.points || [];
  const W = 320, H = 130, PL = 6, PR = 6, PT = 14, PB = 8;
  if (pts.length < 2) {
    return <div style={{ height: H, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#9ca3af", textAlign: "center", padding: "0 20px", textWrap: "pretty" }}>{pts.length === 1 ? (props.oneText || "One session so far. Log it again to see a trend.") : (props.emptyText || "No sessions yet.")}</div>;
  }
  const ys = pts.map((p) => p.y);
  let lo = Math.min.apply(null, ys), hi = Math.max.apply(null, ys);
  if (hi === lo) { hi += 5; lo -= 5; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const x = (i) => PL + (i * (W - PL - PR)) / (pts.length - 1);
  const y = (v) => PT + (1 - (v - lo) / (hi - lo)) * (H - PT - PB);
  const line = pts.map((p, i) => (i ? "L" : "M") + x(i).toFixed(1) + " " + y(p.y).toFixed(1)).join(" ");
  const area = line + " L" + x(pts.length - 1).toFixed(1) + " " + (H - PB) + " L" + x(0).toFixed(1) + " " + (H - PB) + " Z";
  const bestI = ys.indexOf(Math.max.apply(null, ys));
  return (
    <div>
      <svg viewBox={"0 0 " + W + " " + H} style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <linearGradient id="lcfill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a73e8" stopOpacity=".22" /><stop offset="100%" stopColor="#1a73e8" stopOpacity="0" /></linearGradient>
        </defs>
        <path d={area} fill="url(#lcfill)" />
        <path d={line} fill="none" stroke="#1a73e8" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={x(i)} cy={y(p.y)} r={i === bestI ? 4.5 : 2.6} fill={i === bestI ? "#f59e0b" : "#1a73e8"} stroke="#fff" strokeWidth={i === bestI ? 2 : 1} />)}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#9ca3af", fontWeight: 600, marginTop: 4 }}>
        <span>{pts[0].label}</span><span>{pts[pts.length - 1].label}</span>
      </div>
    </div>
  );
}

export function BarChart(props) {
  const bars = props.bars || [];
  const max = Math.max(1, Math.max.apply(null, bars.map((b) => b.value)));
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 120 }}>
      {bars.map((b, i) => {
        const last = i === bars.length - 1;
        const h = b.value > 0 ? Math.max(6, (b.value / max) * 96) : 3;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", gap: 5, minWidth: 0 }}>
            {(last || b.value === max) && b.value > 0 && <span style={{ fontSize: 10, fontWeight: 700, color: last ? "#1a73e8" : "#6b7280" }}>{props.format ? props.format(b.value) : b.value}</span>}
            <div style={{ width: "100%", maxWidth: 30, height: h, borderRadius: 6, background: last ? "linear-gradient(180deg,#2b7cf0,#1a73e8)" : b.value > 0 ? "#c9dbf8" : "#eef1f5" }} />
            <span style={{ fontSize: 10, color: last ? "#1a2332" : "#9ca3af", fontWeight: 600 }}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

