import { useState, useEffect } from "react";
import { BORDER, shadowPrimary } from "../ui/theme";
import { loadRunning, checkProposal, applyProposal } from "../services/running";
import { weekdayIndex, parseDate } from "../lib/running";

const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const TYPE = {
  easy: "Easy Run", long: "Long Run", strides: "Easy Run + Strides", threshold: "Threshold", interval: "Intervals",
  repetition: "Fast Reps", "race-pace": "Race Pace", "time-trial": "Time Trial", strength: "Strength",
};
const when = (d) => DAY[weekdayIndex(d)] + ", " + MONTHS[parseDate(d).getMonth()] + " " + parseDate(d).getDate();

// A plan change the coach proposed in chat. The running engine checks it before Apply is offered,
// and again when it's applied.
export default function ProposalCard(props) {
  const [status, setStatus] = useState("checking"); // checking | ready | blocked | applying | applied | error
  const [check, setCheck] = useState(null);

  async function evaluate() {
    try {
      const state = await loadRunning();
      const r = checkProposal(state, props.proposal);
      const already = r.moves.length > 0 && r.moves.every((m) => { const s = state.sessions.find((x) => x.id === m.id); return s && s.date === m.toDate; });
      setCheck(r);
      setStatus(already ? "applied" : r.ok ? "ready" : "blocked");
    } catch (e) {
      setStatus("error");
    }
  }
  useEffect(() => { evaluate(); }, []);

  async function apply() {
    setStatus("applying");
    try {
      const r = await applyProposal(props.proposal);
      setCheck(r);
      setStatus(r.ok ? "applied" : "blocked");
      if (r.ok && props.onApplied) props.onApplied();
    } catch (e) {
      setStatus("error");
    }
  }

  const box = { marginTop: 10, background: "#f7f9fc", border: "1px solid " + BORDER, borderRadius: 14, padding: 12 };
  if (status === "checking") return <div style={Object.assign({}, box, { fontSize: 13, color: "#6b7280" })}>Checking this against your plan...</div>;
  if (status === "error") return <div style={Object.assign({}, box, { fontSize: 13, color: "#b91c1c" })}>Couldn't check this change. Try again in a moment.</div>;

  return (
    <div style={box}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Plan Change</div>
      {(check && check.preview.length ? check.preview : []).map((p) => (
        <div key={p.id} style={{ fontSize: 14, color: "#1a2332", padding: "3px 0" }}>
          <b>{TYPE[p.type] || "Run"}</b>: {when(p.from)} <span style={{ color: "#9ca3af" }}>to</span> {when(p.to)}
        </div>
      ))}
      {status === "blocked" && (
        <div style={{ fontSize: 13.5, color: "#b45309", marginTop: 6, lineHeight: 1.45 }}>
          {check && check.errors.length ? check.errors[0] : "This change doesn't fit your plan."} Ask your coach for another option.
        </div>
      )}
      {status === "applied" && <div style={{ fontSize: 14, color: "#16a34a", fontWeight: 700, marginTop: 6 }}>Done. Your plan is updated.</div>}
      {(status === "ready" || status === "applying") && (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <button disabled={status === "applying"} onClick={apply} style={{ flex: 1, background: "#1a73e8", color: "#fff", border: "none", borderRadius: 11, padding: "10px 14px", fontSize: 14, fontWeight: 700, minHeight: 42, boxShadow: shadowPrimary, opacity: status === "applying" ? 0.7 : 1 }}>{status === "applying" ? "Applying..." : "Apply"}</button>
          <button disabled={status === "applying"} onClick={() => setStatus("dismissed")} style={{ flex: 1, background: "#fff", color: "#374151", border: "1px solid " + BORDER, borderRadius: 11, padding: "10px 14px", fontSize: 14, fontWeight: 700, minHeight: 42 }}>Not Now</button>
        </div>
      )}
      {status === "dismissed" && <div style={{ fontSize: 13, color: "#6b7280", marginTop: 6 }}>No change made.</div>}
    </div>
  );
}
