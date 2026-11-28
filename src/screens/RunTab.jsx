import { useState, useEffect, useMemo, useRef } from "react";
import { cardStyle, fieldStyle, labelStyle, overlay, sheet, sheetHead, xBtn, primaryBtn, shadowSm, shadowPrimary, BORDER } from "../ui/theme";
import { appConfirm } from "../ui/confirm";
import { LineChart, BarChart } from "../ui/components";
import {
  assessGoal, predictRace, trainingPaces, formatClock, formatPace, KM_PER_MI, weeklyLoads, QUALITY_TYPES,
  addDays, daysBetween, weekdayIndex, parseDate, daysSinceLastRun, MARATHON_M, HALF_M, racePace,
} from "../lib/running";
import { loadRunning, createGoalAndPlan, logRun, deleteRun, endGoal, adjustAfterGap, vdotFromAssessment, todayStr, planningLevel, personalizePlan } from "../services/running";

const ACCENT = "#1a73e8";
const INK = "#1a2332";
const MUTED = "#6b7280";
const FAINT = "#9ca3af";
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DISTANCES = [
  { id: 5000, label: "5K" },
  { id: 10000, label: "10K" },
  { id: HALF_M, label: "Half Marathon" },
  { id: MARATHON_M, label: "Marathon" },
];
const TYPE_LABEL = {
  easy: "Easy Run", long: "Long Run", strides: "Easy Run + Strides", threshold: "Threshold", interval: "Intervals",
  repetition: "Fast Reps", "race-pace": "Race Pace", race: "Race Day", "time-trial": "Time Trial", strength: "Strength", rest: "Rest",
};
const PACE_LABEL = { easy: "Easy", marathon: "Marathon", threshold: "Threshold", interval: "Interval", repetition: "Repetition" };
const PACE_NOTE = {
  easy: "Most of your running. Conversational.",
  marathon: "Steady and controlled.",
  threshold: "Comfortably hard. About an hour's race effort.",
  interval: "Hard. 3 to 5 minute efforts.",
  repetition: "Fast and relaxed. Short reps.",
};
const EFFORT = ["Rest", "Very Easy", "Easy", "Moderate", "Somewhat Hard", "Hard", "Hard", "Very Hard", "Very Hard", "Near Max", "Max"];

// ─── Formatting helpers (engine values are meters and seconds) ───
const dist = (m, u) => {
  const v = u === "mi" ? m / 1000 / KM_PER_MI : m / 1000;
  return v.toFixed(1).replace(/\.0$/, "") + " " + u;
};
const paceStr = (sPerKm, u) => formatPace(sPerKm, u);
const paceRange = (r, u) => {
  if (!r) return "";
  const f = u === "mi" ? KM_PER_MI : 1;
  return formatClock(r.fast * f) + " to " + formatClock(r.slow * f) + " /" + u;
};
const raceLabel = (m) => (DISTANCES.find((d) => Math.abs(d.id - m) < 1) || { label: dist(m, "km") }).label;
function prettyDate(s, withDay) {
  const d = parseDate(s);
  return (withDay ? DAY_ABBR[weekdayIndex(s)] + ", " : "") + MONTHS[d.getMonth()] + " " + d.getDate();
}
const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "");
const toMeters = (v, u) => (u === "mi" ? Number(v) * KM_PER_MI * 1000 : Number(v) * 1000);
const hms = (h, m, s) => (Number(h) || 0) * 3600 + (Number(m) || 0) * 60 + (Number(s) || 0);

// ─── Small UI pieces ───
const h2 = { fontSize: 17, fontWeight: 700, margin: 0, color: INK, textWrap: "balance" };
const body = { fontSize: 14, color: MUTED, lineHeight: 1.5, margin: 0, textWrap: "pretty" };
const ghostBtn = { width: "100%", background: "#fff", color: "#374151", border: "1px solid " + BORDER, borderRadius: 14, padding: "14px", fontSize: 15, fontWeight: 700, minHeight: 50 };

function Spinner() {
  return <div style={{ width: 26, height: 26, border: "3px solid #eaeef3", borderTopColor: ACCENT, borderRadius: "50%", animation: "spin .7s linear infinite", margin: "0 auto" }} />;
}

function Choice(props) {
  const on = props.selected;
  return (
    <button type="button" onClick={props.onClick} style={{ width: "100%", textAlign: props.center ? "center" : "left", background: on ? "#f0f5ff" : "#fff", border: "1.5px solid " + (on ? ACCENT : BORDER), borderRadius: 14, padding: props.compact ? "12px 10px" : "14px 16px", minHeight: props.compact ? 46 : 56, boxShadow: on ? "0 0 0 3px rgba(26,115,232,.12)" : shadowSm, color: INK }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: on ? ACCENT : INK }}>{props.label}</div>
      {props.sub && <div style={{ fontSize: 13, color: MUTED, marginTop: 3, lineHeight: 1.4, textWrap: "pretty" }}>{props.sub}</div>}
    </button>
  );
}

function Grid(props) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(" + (props.cols || 2) + ",minmax(0,1fr))", gap: props.gap || 10 }}>{props.children}</div>;
}

function NumField(props) {
  return (
    <label style={{ display: "block", minWidth: 0 }}>
      {props.label && <div style={{ fontSize: 12, fontWeight: 600, color: FAINT, marginBottom: 6 }}>{props.label}</div>}
      <div style={{ position: "relative" }}>
        <input type="number" inputMode={props.decimal ? "decimal" : "numeric"} min="0" step={props.decimal ? "0.01" : "1"} value={props.value} placeholder={props.placeholder} onChange={(e) => props.onChange(e.target.value)} style={Object.assign({}, fieldStyle, { padding: props.suffix ? "14px 44px 14px 14px" : "14px", fontWeight: 600, fontVariantNumeric: "tabular-nums" })} />
        {props.suffix && <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", color: FAINT, fontSize: 14, fontWeight: 600, pointerEvents: "none" }}>{props.suffix}</span>}
      </div>
    </label>
  );
}

function TimeFields(props) {
  const v = props.value;
  const set = (k) => (x) => props.onChange(Object.assign({}, v, { [k]: x }));
  return (
    <Grid cols={props.hours ? 3 : 2} gap={8}>
      {props.hours && <NumField label="Hours" value={v.h} onChange={set("h")} placeholder="0" />}
      <NumField label="Minutes" value={v.m} onChange={set("m")} placeholder="0" />
      <NumField label="Seconds" value={v.s} onChange={set("s")} placeholder="00" />
    </Grid>
  );
}

function Sheet(props) {
  const bodyRef = useRef(null);
  useEffect(() => { if (bodyRef.current) bodyRef.current.scrollTop = 0; }, [props.scrollKey]);
  return (
    <div style={Object.assign({}, overlay, { alignItems: "flex-end", padding: 0 })} onClick={props.onClose}>
      <div onClick={(e) => e.stopPropagation()} style={Object.assign({}, sheet, { borderRadius: "22px 22px 0 0", maxWidth: 520, maxHeight: "92vh", paddingBottom: "max(20px, env(safe-area-inset-bottom))", animation: "slideUp .28s cubic-bezier(.22,1,.36,1)" })}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{props.title}</h2>
          <button onClick={props.onClose} style={xBtn} aria-label="Close">✕</button>
        </div>
        <div ref={bodyRef} style={{ flex: 1, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>{props.children}</div>
        {props.footer && <div style={{ paddingTop: 12 }}>{props.footer}</div>}
      </div>
    </div>
  );
}

// ─── Main tab ───
export default function RunTab(props) {
  const [state, setState] = useState(null);
  const [error, setError] = useState(false);
  const [setup, setSetup] = useState(false);
  const [openSession, setOpenSession] = useState(null);
  const [logFor, setLogFor] = useState(undefined); // undefined = closed, null = unplanned run, object = session
  const [result, setResult] = useState(null);
  const [showPlan, setShowPlan] = useState(false);
  const [busy, setBusy] = useState(false);
  const [personalizing, setPersonalizing] = useState(false);

  // After setup, the AI coach personalizes the code-built plan in the background.
  async function personalize() {
    setPersonalizing(true);
    try {
      const note = await personalizePlan();
      if (note) { await refresh(); props.flash("Your coach personalized your plan"); }
    } catch (e) { console.warn("personalize", e); }
    setPersonalizing(false);
  }

  async function refresh() {
    try { setError(false); setState(await loadRunning()); }
    catch (e) { console.error("running", e); setError(true); }
  }
  useEffect(() => { refresh(); }, []);

  if (error && !state) {
    return (
      <div style={Object.assign({}, cardStyle, { padding: 28, textAlign: "center" })}>
        <div style={h2}>Your Running Plan Didn't Load</div>
        <p style={Object.assign({}, body, { margin: "8px 0 18px" })}>Check your connection and try again. Nothing you logged is lost.</p>
        <button onClick={refresh} style={primaryBtn}>Try Again</button>
      </div>
    );
  }
  if (!state) return <div style={Object.assign({}, cardStyle, { padding: 40 })}><Spinner /></div>;

  const setupView = setup && <RunSetup previous={state.goal} onClose={() => setSetup(false)} onDone={async () => { setSetup(false); await refresh(); window.scrollTo({ top: 0, behavior: "smooth" }); props.flash("Your plan is ready"); personalize(); }} />;

  if (!state.goal || !state.plan) {
    return (
      <div>
        <RunEmpty onStart={() => setSetup(true)} runs={state.runs} />
        {state.runs.length > 0 && <RecentRuns runs={state.runs} units="km" onDelete={async (r) => { await deleteRun(r.id); refresh(); }} />}
        {setupView}
      </div>
    );
  }

  const { goal, plan, sessions, runs, estimates, changes } = state;
  const units = (goal.setup && goal.setup.units) || "km";
  const vdot = Number(plan.current_vdot);
  const paces = plan.paces && plan.paces.easy ? plan.paces : trainingPaces(vdot);
  const today = todayStr();
  const goalM = Number(goal.distance_m);
  const raceDone = goal.goal_date < today;

  const gap = daysSinceLastRun(runs, today);
  const planStart = (goal.setup && goal.setup.planStart) || (plan.phases && plan.phases.start) || today;
  const showGap = gap != null && gap >= 7 && daysBetween(planStart, today) >= 7 && !raceDone;

  async function onAdjustGap() {
    setBusy(true);
    try { const m = await adjustAfterGap(state, gap); await refresh(); props.flash(m.action === "reassess" ? "Plan rebuilt. Start easy." : "Plan adjusted"); }
    catch (e) { props.flash("Could not adjust your plan: " + e.message, "err"); }
    setBusy(false);
  }

  async function onEndGoal() {
    const yes = await appConfirm({ title: "End This Goal?", message: "Your plan stops here. Your runs and fitness history stay in your log.", confirmLabel: "End Goal", danger: true });
    if (!yes) return;
    try { await endGoal(goal.id, raceDone ? "completed" : "abandoned"); await refresh(); }
    catch (e) { props.flash("Could not end goal", "err"); }
  }

  return (
    <div>
      {personalizing && (
        <div style={Object.assign({}, cardStyle, { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px" })}>
          <div style={{ width: 16, height: 16, border: "2px solid #eaeef3", borderTopColor: ACCENT, borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
          <span style={{ fontSize: 14, color: MUTED }}>Your coach is personalizing your plan. You can start using it now.</span>
        </div>
      )}
      <GoalHero goal={goal} vdot={vdot} today={today} planStart={planStart} measured={estimates.some((e) => e.source !== "setup" && e.created_at >= goal.created_at) || !(goal.setup && goal.setup.assessment && goal.setup.assessment.kind === "new")} />
      {showGap && (
        <div style={Object.assign({}, cardStyle, { borderColor: "#fde68a", background: "#fffbeb" })}>
          <div style={h2}>Welcome Back</div>
          <p style={Object.assign({}, body, { margin: "6px 0 14px" })}>It's been {gap} days since your last run. Missed runs are gone, not owed. Let your plan restart from where you are now.</p>
          <button disabled={busy} onClick={onAdjustGap} style={Object.assign({}, primaryBtn, { minHeight: 50, padding: 14, opacity: busy ? 0.6 : 1 })}>{busy ? "Adjusting..." : "Adjust My Plan"}</button>
        </div>
      )}
      {raceDone ? (
        <div style={cardStyle}>
          <div style={h2}>Race Day Has Passed</div>
          <p style={Object.assign({}, body, { margin: "6px 0 14px" })}>Log your race if you haven't, then set your next goal. Take a few easy days first.</p>
          <Grid><button onClick={() => setLogFor(null)} style={ghostBtn}>Log Race</button><button onClick={() => setSetup(true)} style={Object.assign({}, primaryBtn, { minHeight: 50, padding: 14 })}>Set Next Goal</button></Grid>
        </div>
      ) : (
        <TodayCard sessions={sessions} today={today} units={units} onOpen={setOpenSession} onLog={(s) => setLogFor(s)} onLogOther={() => setLogFor(null)} />
      )}
      <WeekCard sessions={sessions} runs={runs} today={today} units={units} planStart={planStart} goalDate={goal.goal_date} onOpen={setOpenSession} onShowPlan={() => setShowPlan(true)} />
      <PacesCard paces={paces} units={units} vdot={vdot} goalM={goalM} />
      <TrendsCard estimates={estimates} runs={runs} units={units} />
      <RecentRuns runs={runs} units={units} onDelete={async (r) => {
        const yes = await appConfirm({ title: "Delete Run?", message: "It's removed from your log. Plan changes it caused stay in place.", confirmLabel: "Delete", danger: true });
        if (!yes) return;
        try { await deleteRun(r.id); await refresh(); } catch (e) { props.flash("Could not delete run", "err"); }
      }} />
      <ChangesCard changes={changes} />
      <Grid>
        <button onClick={() => setSetup(true)} style={ghostBtn}>Change Goal</button>
        <button onClick={onEndGoal} style={Object.assign({}, ghostBtn, { color: "#dc2626", borderColor: "#fecaca" })}>End Goal</button>
      </Grid>
      <p style={Object.assign({}, body, { fontSize: 12, color: FAINT, textAlign: "center", margin: "16px 8px 4px" })}>Your coach isn't a doctor. Chest pain, fainting, unusual breathlessness or pain that changes how you run means stop and get checked.</p>

      {openSession && <SessionSheet session={openSession} units={units} paces={paces} vdot={vdot} goal={goal} today={today} onClose={() => setOpenSession(null)} onLog={() => { const s = openSession; setOpenSession(null); setLogFor(s); }} />}
      {logFor !== undefined && <LogRunSheet session={logFor} sessions={sessions} units={units} today={today} onClose={() => setLogFor(undefined)} onSave={async (run, sessionId) => {
        const out = await logRun(state, run, sessionId);
        setLogFor(undefined);
        setResult(Object.assign({ units, distanceM: run.distanceM, durationS: run.durationS }, out));
        refresh();
      }} />}
      {result && <ResultSheet result={result} onClose={() => setResult(null)} />}
      {showPlan && <PlanSheet sessions={sessions} units={units} today={today} planStart={planStart} goalDate={goal.goal_date} onClose={() => setShowPlan(false)} onOpen={(s) => { setShowPlan(false); setOpenSession(s); }} />}
      {setupView}
    </div>
  );
}

// ─── Empty state ───
function RunEmpty(props) {
  return (
    <div style={Object.assign({}, cardStyle, { padding: "32px 24px", textAlign: "center" })}>
      <div style={{ width: 60, height: 60, borderRadius: "50%", background: "#f0f5ff", margin: "0 auto 16px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <RunIcon size={28} color={ACCENT} />
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.01em", textWrap: "balance" }}>Train for a Race, With a Real Plan</div>
      <p style={Object.assign({}, body, { margin: "10px auto 22px", maxWidth: 340 })}>Tell your coach your goal and where you are today. You get exact paces for every run, and the plan adjusts after each one you log.</p>
      <button onClick={props.onStart} style={primaryBtn}>Set a Running Goal</button>
      <p style={Object.assign({}, body, { fontSize: 12.5, color: FAINT, marginTop: 14 })}>Built on Daniels' VDOT training paces and conservative mileage rules.</p>
    </div>
  );
}

export function RunIcon(props) {
  return <svg width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke={props.color || "currentColor"} strokeWidth={props.stroke || 2} strokeLinecap="round" strokeLinejoin="round"><circle cx="14.5" cy="4" r="2" /><path d="M8 21l3-6 3 3v4M6 12l3-3 4 1 3 4 3 1" /></svg>;
}

// ─── Goal hero ───
function GoalHero(props) {
  const { goal, vdot, today, planStart } = props;
  const m = Number(goal.distance_m);
  const pred = predictRace(vdot, m, { weeklyKm: (goal.setup && goal.setup.weeklyM ? goal.setup.weeklyM / 1000 : undefined) });
  const daysLeft = daysBetween(today, goal.goal_date);
  const weeksLeft = Math.max(0, Math.ceil(daysLeft / 7));
  const totalWeeks = Math.floor(daysBetween(planStart, goal.goal_date) / 7) + 1;
  const week = Math.min(totalWeeks, Math.max(1, Math.floor(daysBetween(planStart, today) / 7) + 1));
  const onTrack = pred.mid <= Number(goal.target_time_s);
  return (
    <div style={{ background: "linear-gradient(150deg,#1a73e8,#0c47b7)", borderRadius: 22, padding: "20px 20px 18px", color: "#fff", marginBottom: 12, boxShadow: shadowPrimary }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{raceLabel(m)} Goal</span>
        <span style={{ fontSize: 13, fontWeight: 600, opacity: 0.85 }}>{daysLeft < 0 ? "Race done" : daysLeft === 0 ? "Race day" : "Week " + week + " of " + totalWeeks}</span>
      </div>
      <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: "-.03em", lineHeight: 1.05, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>{formatClock(Number(goal.target_time_s))}</div>
      <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>{prettyDate(goal.goal_date, true)}{daysLeft > 0 ? " · " + (weeksLeft <= 1 ? daysLeft + (daysLeft === 1 ? " day" : " days") : weeksLeft + " weeks") + " to go" : ""}</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <div style={{ background: "rgba(255,255,255,.13)", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Predicted Today</div>
          {props.measured
            ? <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{formatClock(pred.low)} to {formatClock(pred.high)}</div>
            : <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>After Your First Test</div>}
        </div>
        <div style={{ background: "rgba(255,255,255,.13)", borderRadius: 14, padding: "12px 14px" }}>
          <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 600 }}>Fitness (VDOT)</div>
          {props.measured
            ? <div style={{ fontSize: 19, fontWeight: 800, marginTop: 3 }}>{vdot.toFixed(1)} <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.8 }}>{onTrack ? "On pace" : "Building"}</span></div>
            : <div style={{ fontSize: 15, fontWeight: 700, marginTop: 5 }}>Measured in Week 4</div>}
        </div>
      </div>
    </div>
  );
}

// ─── Today ───
function TodayCard(props) {
  const { sessions, today, units } = props;
  const runs = sessions.filter((s) => s.type !== "strength");
  const todays = runs.filter((s) => s.date === today && s.status !== "skipped");
  const next = runs.find((s) => s.date > today && s.status === "planned");
  const lift = sessions.find((s) => s.date === today && s.type === "strength");
  const s = todays.find((x) => x.status === "planned") || todays[0];
  return (
    <div style={cardStyle}>
      <div style={{ fontSize: 13, fontWeight: 600, color: FAINT }}>Today</div>
      {s ? (
        <div>
          <button onClick={() => props.onOpen(s)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, color: INK }}>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginTop: 4 }}>
              <span style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.01em" }}>{TYPE_LABEL[s.type]}</span>
              {s.distance_m ? <span style={{ fontSize: 24, fontWeight: 800, color: ACCENT, fontVariantNumeric: "tabular-nums" }}>{dist(Number(s.distance_m), units)}</span> : null}
            </div>
            <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{sessionSummary(s, units)}</div>
          </button>
          {s.status === "done" ? (
            <div style={{ marginTop: 14, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, color: "#16a34a", fontWeight: 700, fontSize: 15 }}><Check /> Done. Nice work.</span>
              <button onClick={props.onLogOther} style={{ background: "none", border: "none", color: ACCENT, fontSize: 14.5, fontWeight: 700, padding: "8px 0", minHeight: 40 }}>Log Another Run</button>
            </div>
          ) : (
            <Grid>
              <button onClick={() => props.onOpen(s)} style={Object.assign({}, ghostBtn, { marginTop: 14 })}>Details</button>
              <button onClick={() => props.onLog(s)} style={Object.assign({}, primaryBtn, { marginTop: 14, minHeight: 50, padding: 14 })}>Log Run</button>
            </Grid>
          )}
        </div>
      ) : (
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4 }}>{lift ? "Strength Day" : "Rest Day"}</div>
          <p style={Object.assign({}, body, { marginTop: 4 })}>{lift ? "No run today. Heavy lower body on the Train tab keeps your stride strong." : "Recovery is where the fitness happens."}{next ? " Next up: " + TYPE_LABEL[next.type] + " on " + DAY_FULL[weekdayIndex(next.date)] + "." : ""}</p>
          <button onClick={props.onLogOther} style={Object.assign({}, ghostBtn, { marginTop: 14 })}>Log a Run Anyway</button>
        </div>
      )}
    </div>
  );
}

function sessionSummary(s, units) {
  const st = s.structure || {};
  if (s.type === "race") return "Goal pace " + (s.target_pace ? paceRange(s.target_pace, units) : "");
  if (s.type === "time-trial") return "All-out " + dist(st.testM || 3000, units) + " test after an easy warm-up";
  if (st.reps && st.work && s.type !== "strides") return st.reps + " × " + (st.repM >= 1000 ? (st.repM / 1000) + " km" : st.repM + " m") + " at " + (PACE_LABEL[st.work.pace] || "race").toLowerCase() + " pace" + (s.target_pace ? ", " + paceRange(s.target_pace, units) : "");
  if (st.runWalk) return "Run-walk at an easy effort";
  if (s.type === "strength") return "Heavy lower body plus a little jumping";
  return (s.type === "strides" ? "Easy, then " + (st.reps || 6) + " short strides. " : "Easy pace ") + (s.target_pace ? paceRange(s.target_pace, units) : "");
}

function Check(props) {
  return <svg width={props.size || 18} height={props.size || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}

// ─── This week ───
function weekOf(planStart, date) { return Math.floor(daysBetween(planStart, date) / 7); }

function WeekCard(props) {
  const { sessions, today, units, planStart } = props;
  const cw = Math.max(0, weekOf(planStart, today));
  // When nothing is left in the current plan week (a plan that starts mid-week), show the next one.
  const left = sessions.some((s) => s.date >= today && weekOf(planStart, s.date) === cw);
  const w = left ? cw : cw + 1;
  const from = addDays(planStart, w * 7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const inWeek = sessions.filter((s) => s.date >= from && s.date <= days[6]);
  const phase = (inWeek.find((s) => s.structure && s.structure.phase) || {}).structure;
  const plannedM = inWeek.filter((s) => s.type !== "strength" && s.status !== "skipped").reduce((t, s) => t + Number(s.distance_m || 0), 0);
  // What was actually run this week, from logged runs, not the planned distances.
  const doneM = (props.runs || []).filter((r) => r.date >= from && r.date <= days[6]).reduce((t, r) => t + Number(r.distance_m || 0), 0);
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div>
          <div style={h2}>{w === cw ? "This Week" : from === addDays(today, 1) ? "Your Plan Starts Tomorrow" : "Next Week"}</div>
          {phase && <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{cap(phase.phase)} phase{phase.recovery ? ", recovery week" : ""}</div>}
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 17, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dist(doneM, units).split(" ")[0]} <span style={{ color: FAINT, fontWeight: 600 }}>/ {dist(plannedM, units)}</span></div>
        </div>
      </div>
      <div style={{ height: 6, background: "#eef1f5", borderRadius: 6, overflow: "hidden", marginBottom: 6 }}>
        <div style={{ width: (plannedM ? Math.min(100, (doneM / plannedM) * 100) : 0) + "%", height: "100%", background: ACCENT, borderRadius: 6, transition: "width .5s cubic-bezier(.22,1,.36,1)" }} />
      </div>
      {days.map((d) => {
        const list = inWeek.filter((s) => s.date === d);
        return <DayRow key={d} date={d} list={list} today={today} units={units} onOpen={props.onOpen} />;
      })}
      <button onClick={props.onShowPlan} style={{ width: "100%", background: "none", border: "none", color: ACCENT, fontSize: 14.5, fontWeight: 700, padding: "14px 0 2px", minHeight: 44 }}>See Full Plan</button>
    </div>
  );
}

function DayRow(props) {
  const { date, list, today, units } = props;
  const run = list.find((s) => s.type !== "strength");
  const lift = list.find((s) => s.type === "strength");
  const isToday = date === today;
  const missed = run && run.status === "planned" && date < today;
  const status = !run ? null : run.status === "done" ? "done" : run.status === "skipped" ? "skipped" : missed ? "missed" : "planned";
  const target = run || lift;
  return (
    <button disabled={!target} onClick={() => target && props.onOpen(target)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, background: isToday ? "#f5f8ff" : "none", border: "none", borderRadius: 12, padding: "11px 10px", margin: "0 -10px", boxSizing: "content-box", minHeight: 30, color: INK, textAlign: "left", cursor: target ? "pointer" : "default" }}>
      <div style={{ width: 38, flexShrink: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: isToday ? ACCENT : INK }}>{DAY_ABBR[weekdayIndex(date)]}</div>
        <div style={{ fontSize: 11.5, color: FAINT, fontWeight: 600 }}>{parseDate(date).getDate()}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: run ? (status === "skipped" ? FAINT : INK) : FAINT, textDecoration: status === "skipped" ? "line-through" : "none" }}>{run ? TYPE_LABEL[run.type] : lift ? "Strength" : "Rest"}</div>
        {run && lift && <div style={{ fontSize: 12, color: FAINT, marginTop: 1 }}>Plus strength</div>}
        {status === "missed" && <div style={{ fontSize: 12, color: "#b45309", marginTop: 1 }}>Missed. No need to make it up.</div>}
      </div>
      {run && run.distance_m ? <span style={{ fontSize: 15, fontWeight: 700, color: status === "skipped" ? FAINT : INK, fontVariantNumeric: "tabular-nums" }}>{dist(Number(run.distance_m), units)}</span> : null}
      <span style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: status === "done" ? "#16a34a" : "transparent", border: status === "done" ? "none" : "2px solid " + (run ? "#e3e8ef" : "transparent"), color: "#fff" }}>{status === "done" && <Check size={13} />}</span>
    </button>
  );
}

// ─── Paces ───
function PacesCard(props) {
  const { paces, units, vdot, goalM } = props;
  const rp = racePace(vdot, goalM);
  const rows = ["easy", "threshold", "interval", "repetition"].map((k) => ({ k, label: PACE_LABEL[k], note: PACE_NOTE[k], r: paces[k] }));
  rows.splice(1, 0, { k: "race", label: raceLabel(goalM) + " Race", note: "Your race pace at today's fitness.", r: rp });
  return (
    <div style={cardStyle}>
      <div style={Object.assign({}, h2, { marginBottom: 4 })}>Your Paces</div>
      <p style={Object.assign({}, body, { fontSize: 13, marginBottom: 8 })}>From your current fitness. They update as you get faster.</p>
      {rows.map((r, i) => (
        <div key={r.k} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid #f3f4f6" : "none" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{r.label}</div>
            <div style={{ fontSize: 12.5, color: FAINT, marginTop: 1 }}>{r.note}</div>
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{paceRange(r.r, units)}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Trends ───
function TrendsCard(props) {
  const { estimates, runs, units } = props;
  const short = (d) => { const p = d.split("-").map(Number); return p[1] + "/" + p[2]; };
  // The setup guess for brand-new runners isn't a measurement, so it stays off the chart.
  const measured = estimates.filter((e) => e.vdot != null && e.source !== "setup");
  const pts = measured.map((e) => ({ y: Math.round(Number(e.vdot) * 10) / 10, label: short(e.date) }));
  const loads = weeklyLoads(runs);
  const t = todayStr();
  const mon = addDays(t, -weekdayIndex(t));
  const bars = Array.from({ length: 8 }, (_, i) => {
    const key = addDays(mon, -7 * (7 - i));
    const v = loads.get(key);
    const m = v ? v.distanceM : 0;
    return { value: units === "mi" ? m / 1000 / KM_PER_MI : m / 1000, label: short(key) };
  });
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
      <div style={cardStyle}>
        <div style={h2}>Fitness</div>
        <p style={Object.assign({}, body, { fontSize: 13, marginBottom: 10 })}>Rises when races, time trials or strong sessions show you're faster.</p>
        <LineChart points={pts} oneText="Your starting point. Log a race or time trial, or nail your quality sessions, to see it climb." emptyText="No fitness readings yet." />
      </div>
      <div style={cardStyle}>
        <div style={h2}>Weekly Distance</div>
        <p style={Object.assign({}, body, { fontSize: 13, marginBottom: 14 })}>Last 8 weeks, in {units === "mi" ? "miles" : "kilometers"}.</p>
        {runs.length ? <BarChart bars={bars} format={(v) => (v >= 10 ? Math.round(v) : v.toFixed(1))} /> : <div style={{ height: 120, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: FAINT }}>Log a run to start your chart.</div>}
      </div>
    </div>
  );
}

// ─── Recent runs ───
function RecentRuns(props) {
  const { runs, units } = props;
  const [all, setAll] = useState(false);
  if (!runs.length) return null;
  const list = all ? runs.slice(0, 40) : runs.slice(0, 5);
  return (
    <div style={cardStyle}>
      <div style={Object.assign({}, h2, { marginBottom: 6 })}>Recent Runs</div>
      {list.map((r, i) => {
        const pace = Number(r.duration_s) / (Number(r.distance_m) / 1000);
        return (
          <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 0", borderTop: i ? "1px solid #f3f4f6" : "none" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{dist(Number(r.distance_m), units)} <span style={{ color: FAINT, fontWeight: 600 }}>in {formatClock(Number(r.duration_s))}</span></div>
              <div style={{ fontSize: 12.5, color: FAINT, marginTop: 1 }}>{prettyDate(r.date, true)} · {paceStr(pace, units)}{r.rpe != null ? " · Effort " + Number(r.rpe) : ""}{r.pain && r.pain !== "none" ? " · Pain noted" : ""}</div>
            </div>
            <button onClick={() => props.onDelete(r)} aria-label="Delete run" style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 18, padding: 8, minHeight: 40 }}>✕</button>
          </div>
        );
      })}
      {runs.length > 5 && <button onClick={() => setAll(!all)} style={{ width: "100%", background: "none", border: "none", color: ACCENT, fontSize: 14, fontWeight: 700, padding: "12px 0 2px" }}>{all ? "Show Less" : "Show All Runs"}</button>}
    </div>
  );
}

// ─── Plan history ───
function ChangesCard(props) {
  const list = props.changes.slice(0, 8);
  if (!list.length) return null;
  return (
    <div style={cardStyle}>
      <div style={Object.assign({}, h2, { marginBottom: 4 })}>Why Your Plan Changed</div>
      {list.map((c, i) => (
        <div key={c.id} style={{ padding: "11px 0", borderTop: i ? "1px solid #f3f4f6" : "none" }}>
          <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>{prettyDate(c.created_at.slice(0, 10), true)}</div>
          <div style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, marginTop: 2, textWrap: "pretty" }}>{c.reason}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Session detail ───
function SessionSheet(props) {
  const { session: s, units, goal, today } = props;
  const st = s.structure || {};
  const easy = props.paces.easy;
  const steps = [];
  if (st.warmupM) steps.push({ t: "Warm Up", d: dist(st.warmupM, units) + " easy", p: paceRange(easy, units) });
  if (st.reps && st.work && s.type !== "strides") steps.push({ t: "Main Set", d: st.reps + " × " + (st.repM >= 1000 ? st.repM / 1000 + " km" : st.repM + " m") + " at " + (PACE_LABEL[st.work.pace] || "race").toLowerCase() + " pace", p: (s.target_pace ? paceRange(s.target_pace, units) : "") + (st.recoveryS ? ", " + (st.recoveryS >= 60 ? Math.round(st.recoveryS / 60) + " min" : st.recoveryS + " s") + " easy jog between" : "") });
  if (st.cooldownM) steps.push({ t: "Cool Down", d: dist(st.cooldownM, units) + " easy", p: paceRange(easy, units) });
  if (s.type === "time-trial" && st.testM) steps.splice(st.warmupM ? 1 : 0, 0, { t: "Time Trial", d: dist(st.testM, units) + " as fast as you can hold evenly", p: "Expect around " + paceRange(s.target_pace, units) + ". Start controlled, finish hard." });
  if (s.type === "strides") steps.push({ t: "Easy Run", d: dist(Number(s.distance_m), units), p: paceRange(easy, units) }, { t: "Then Strides", d: (st.reps || 6) + " × 20 seconds, fast but relaxed", p: "Walk back to recover between each" });
  const swapped = st.swappedFrom;
  return (
    <Sheet title={TYPE_LABEL[s.type]} onClose={props.onClose} footer={s.type !== "strength" && s.status !== "done" && s.date <= addDays(today, 1) && <button onClick={props.onLog} style={primaryBtn}>Log This Run</button>}>
      <div style={{ fontSize: 14, color: MUTED, marginBottom: 14 }}>{prettyDate(s.date, true)}{st.week ? " · Week " + st.week : ""}{st.phase ? ", " + st.phase + " phase" : ""}</div>
      {s.type !== "strength" && (
        <Grid>
          <div style={{ background: "#f7f9fc", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Distance</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{s.distance_m ? dist(Number(s.distance_m), units) : "Rest"}</div>
          </div>
          <div style={{ background: "#f7f9fc", borderRadius: 14, padding: "14px 16px" }}>
            <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>{s.type === "race" ? "Goal Time" : "Target Pace"}</div>
            <div style={{ fontSize: s.type === "race" ? 24 : 15, fontWeight: 800, marginTop: s.type === "race" ? 2 : 7, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>{s.type === "race" ? formatClock(Number(goal.target_time_s)) : s.target_pace ? paceRange(s.target_pace, units) : "Easy effort"}</div>
          </div>
        </Grid>
      )}
      {steps.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {steps.map((x, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0" }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#f0f5ff", color: ACCENT, fontSize: 13, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{x.t}</div>
                <div style={{ fontSize: 14, color: "#374151", marginTop: 1 }}>{x.d}</div>
                {x.p && <div style={{ fontSize: 13, color: FAINT, marginTop: 1 }}>{x.p}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 14, background: "#f7f9fc", borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ fontSize: 12, color: FAINT, fontWeight: 600, marginBottom: 4 }}>Why This Run</div>
        <p style={Object.assign({}, body, { color: "#374151" })}>{s.purpose || "Part of your plan."}</p>
        {swapped && <p style={Object.assign({}, body, { marginTop: 8, color: "#b45309" })}>This replaced a {TYPE_LABEL[swapped] ? TYPE_LABEL[swapped].toLowerCase() : "hard"} session so you can recover.</p>}
        {s.type === "strength" && <p style={Object.assign({}, body, { marginTop: 8 })}>Log it on the Train tab: squats or deadlifts, lunges, calf raises and a few box jumps.</p>}
      </div>
    </Sheet>
  );
}

// ─── Log a run ───
function LogRunSheet(props) {
  const { units, today, sessions } = props;
  const planned = props.session;
  const [date, setDate] = useState(planned && planned.date <= today ? planned.date : today);
  const [distance, setDistance] = useState(planned && planned.distance_m && planned.type !== "race" ? String(Math.round((units === "mi" ? planned.distance_m / 1000 / KM_PER_MI : planned.distance_m / 1000) * 100) / 100) : planned && planned.type === "race" ? String(Math.round((units === "mi" ? planned.distance_m / 1000 / KM_PER_MI : planned.distance_m / 1000) * 100) / 100) : "");
  const [time, setTime] = useState({ h: "", m: "", s: "" });
  const [rpe, setRpe] = useState(null);
  const [pain, setPain] = useState("none");
  const [notes, setNotes] = useState("");
  const [workPace, setWorkPace] = useState({ m: "", s: "" });
  const [isRace, setIsRace] = useState(!!(planned && (planned.type === "race" || planned.type === "time-trial")));
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  // Match the run to a planned session on that day, unless one was chosen.
  const match = planned && planned.date === date ? planned : sessions.find((s) => s.date === date && s.type !== "strength" && s.status !== "done");
  const quality = match && QUALITY_TYPES.has(match.type) && match.type !== "race" && match.structure && match.structure.work;
  const isTest = match && match.type === "time-trial";
  // A time trial is logged as just the all-out part, so prefill the test distance.
  useEffect(() => {
    if (isTest && match.structure && match.structure.testM) setDistance(String(Math.round((units === "mi" ? match.structure.testM / 1000 / KM_PER_MI : match.structure.testM / 1000) * 100) / 100));
    if (isTest) setIsRace(true);
  }, [isTest]);
  const distanceM = toMeters(distance, units);
  const durationS = hms(time.h, time.m, time.s);
  const pace = distanceM > 0 && durationS > 0 ? durationS / (distanceM / 1000) : null;

  async function save() {
    setErr("");
    if (!(distanceM >= 100)) return setErr("Enter how far you ran.");
    if (!(durationS >= 60)) return setErr("Enter how long it took.");
    if (pace && pace < 150) return setErr("That's faster than a world record pace. Check the distance and time.");
    if (pace && pace > 1200) return setErr("That's slower than walking pace. Check the distance and time.");
    if (rpe == null) return setErr("Pick how hard it felt.");
    if (date > today) return setErr("You can't log a run in the future.");
    const wp = hms(0, workPace.m, workPace.s);
    setSaving(true);
    try {
      await props.onSave({
        date, distanceM: Math.round(distanceM), durationS, rpe, pain, notes: notes.trim(), isRace,
        workPaceSPerKm: quality && wp > 0 ? (units === "mi" ? wp / KM_PER_MI : wp) : null,
      }, match ? match.id : null);
    } catch (e) {
      setErr("Couldn't save your run: " + (e.message || "try again"));
      setSaving(false);
    }
  }

  return (
    <Sheet title="Log Run" onClose={props.onClose} footer={<button disabled={saving} onClick={save} style={Object.assign({}, primaryBtn, { opacity: saving ? 0.6 : 1 })}>{saving ? "Saving..." : "Save Run"}</button>}>
      {match && <div style={{ background: "#f0f5ff", color: ACCENT, borderRadius: 12, padding: "10px 14px", fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Counts as {DAY_FULL[weekdayIndex(match.date)]}'s {TYPE_LABEL[match.type].toLowerCase()}</div>}
      <Grid>
        <NumField label={(isRace ? "Race or Test Distance (" : "Distance (") + units + ")"} decimal value={distance} onChange={setDistance} placeholder="5" />
        <label style={{ display: "block", minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: FAINT, marginBottom: 6 }}>Date</div>
          <input type="date" value={date} max={today} onChange={(e) => setDate(e.target.value || today)} style={Object.assign({}, fieldStyle, { padding: "13px 12px", fontWeight: 600, minHeight: 52 })} />
        </label>
      </Grid>
      <div style={{ marginTop: 14 }}>
        {isRace && <div style={{ fontSize: 13, color: MUTED, marginBottom: 8 }}>Enter only the all-out part, not your warm-up or cool-down.</div>}
        <TimeFields hours value={time} onChange={setTime} />
        {pace && <div style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>Average pace {paceStr(pace, units)}</div>}
      </div>

      <div style={Object.assign({}, labelStyle, { marginTop: 20, marginBottom: 8 })}>How Hard Did It Feel?</div>
      <Grid cols={5} gap={6}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
          <button key={n} onClick={() => setRpe(n)} style={{ minHeight: 46, borderRadius: 12, border: "1.5px solid " + (rpe === n ? ACCENT : BORDER), background: rpe === n ? ACCENT : "#fff", color: rpe === n ? "#fff" : INK, fontSize: 16, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{n}</button>
        ))}
      </Grid>
      <div style={{ fontSize: 13, color: MUTED, marginTop: 8, minHeight: 18 }}>{rpe != null ? rpe + " out of 10: " + EFFORT[rpe] : "1 is barely trying. 10 is everything you had."}</div>

      <div style={Object.assign({}, labelStyle, { marginTop: 18, marginBottom: 8 })}>Any Pain?</div>
      <Grid cols={3} gap={8}>
        <Choice compact center label="No Pain" selected={pain === "none"} onClick={() => setPain("none")} />
        <Choice compact center label="Mild Pain" selected={pain === "mild"} onClick={() => setPain("mild")} />
        <Choice compact center label="Changed My Stride" selected={pain === "affected"} onClick={() => setPain("affected")} />
      </Grid>
      {pain === "affected" && <p style={Object.assign({}, body, { marginTop: 8, color: "#b45309", fontSize: 13 })}>Your coach will pause increases and give you rest days. If it doesn't settle, see a professional.</p>}

      {quality && (
        <div style={{ marginTop: 18 }}>
          <div style={Object.assign({}, labelStyle, { marginBottom: 4 })}>Average Pace on Your Reps</div>
          <p style={Object.assign({}, body, { fontSize: 13, marginBottom: 8 })}>Optional. Target {paceRange(match.target_pace, units)}. Strong sessions raise your paces.</p>
          <TimeFields value={workPace} onChange={setWorkPace} />
        </div>
      )}

      <button onClick={() => setIsRace(!isRace)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, background: "none", border: "none", borderTop: "1px solid #f3f4f6", marginTop: 18, padding: "16px 0", textAlign: "left", color: INK }}>
        <span><span style={{ display: "block", fontSize: 15, fontWeight: 700 }}>This Was a Race or Time Trial</span><span style={{ display: "block", fontSize: 13, color: MUTED, marginTop: 2 }}>An all-out effort resets your fitness and paces.</span></span>
        <span style={{ width: 50, height: 30, borderRadius: 15, background: isRace ? ACCENT : "#e3e8ef", position: "relative", flexShrink: 0, transition: "background .2s" }}><span style={{ position: "absolute", top: 3, left: isRace ? 23 : 3, width: 24, height: 24, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.2)", transition: "left .25s cubic-bezier(.22,1,.36,1)" }} /></span>
      </button>

      <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional): sleep, weather, how your legs felt" rows={2} style={Object.assign({}, fieldStyle, { resize: "none", marginTop: 4 })} />
      {err && <div style={{ color: "#dc2626", fontSize: 14, fontWeight: 600, marginTop: 12 }}>{err}</div>}
    </Sheet>
  );
}

// ─── After logging ───
function ResultSheet(props) {
  const r = props.result;
  const pace = r.durationS / (r.distanceM / 1000);
  const items = (r.actions || []).map((a) => a.reason);
  const notes = Array.from(new Set((r.adjustments || []).map((a) => a.note)));
  return (
    <Sheet title="Run Saved" onClose={props.onClose} footer={<button onClick={props.onClose} style={primaryBtn}>Done</button>}>
      <Grid>
        <div style={{ background: "#f7f9fc", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Distance</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{dist(r.distanceM, r.units)}</div>
        </div>
        <div style={{ background: "#f7f9fc", borderRadius: 14, padding: "14px 16px" }}>
          <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Pace</div>
          <div style={{ fontSize: 26, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{paceStr(pace, r.units)}</div>
        </div>
      </Grid>
      {r.newVdot && <div style={{ marginTop: 14, background: "#f0fdf4", color: "#15803d", borderRadius: 14, padding: "14px 16px", fontSize: 15, fontWeight: 700 }}>New fitness: {r.newVdot.toFixed(1)}. Your paces are updated.</div>}
      <div style={{ marginTop: 16 }}>
        <div style={Object.assign({}, labelStyle, { marginBottom: 6 })}>From Your Coach</div>
        {items.length ? items.map((t, i) => <p key={i} style={Object.assign({}, body, { color: "#374151", padding: "8px 0", borderTop: i ? "1px solid #f3f4f6" : "none" })}>{t}</p>) : <p style={Object.assign({}, body, { color: "#374151" })}>Right on plan. Keep stacking runs like this.</p>}
        {notes.length > 0 && <p style={Object.assign({}, body, { marginTop: 8 })}>Plan updated: {notes.join(". ")}.</p>}
      </div>
    </Sheet>
  );
}

// ─── Full plan ───
function PlanSheet(props) {
  const { sessions, units, planStart, today } = props;
  const weeks = useMemo(() => {
    const map = new Map();
    for (const s of sessions) {
      const w = weekOf(planStart, s.date);
      if (!map.has(w)) map.set(w, []);
      map.get(w).push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [sessions, planStart]);
  const total = Math.floor(daysBetween(planStart, props.goalDate) / 7) + 1;
  const cur = weekOf(planStart, today);
  return (
    <Sheet title="Your Plan" onClose={props.onClose}>
      {weeks.map(([w, list]) => {
        const runs = list.filter((s) => s.type !== "strength");
        const vol = runs.filter((s) => s.status !== "skipped" && s.type !== "race").reduce((t, s) => t + Number(s.distance_m || 0), 0);
        const st = (list.find((s) => s.structure && s.structure.phase) || {}).structure || {};
        return (
          <div key={w} style={{ marginBottom: 18, opacity: w < cur ? 0.55 : 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 800 }}>Week {w + 1} of {total}{w === cur ? <span style={{ color: ACCENT }}> · This Week</span> : ""}</div>
              <div style={{ fontSize: 13, color: MUTED, fontWeight: 600 }}>{cap(st.phase)}{st.recovery ? ", Recovery" : ""} · {dist(vol, units)}</div>
            </div>
            {runs.map((s) => (
              <button key={s.id} onClick={() => props.onOpen(s)} style={{ width: "100%", display: "flex", gap: 10, alignItems: "center", background: "#f7f9fc", border: "none", borderRadius: 10, padding: "10px 12px", marginBottom: 6, textAlign: "left", color: INK }}>
                <span style={{ width: 34, fontSize: 13, fontWeight: 700, color: FAINT }}>{DAY_ABBR[weekdayIndex(s.date)]}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 600, textDecoration: s.status === "skipped" ? "line-through" : "none" }}>{TYPE_LABEL[s.type]}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{s.distance_m ? dist(Number(s.distance_m), units) : ""}</span>
                {s.status === "done" && <span style={{ color: "#16a34a" }}><Check size={15} /></span>}
              </button>
            ))}
          </div>
        );
      })}
    </Sheet>
  );
}

// ─── Setup ───
const PARQ = [
  { id: "heart", label: "A doctor has said I have a heart condition", cardiac: true },
  { id: "chest", label: "I get chest pain when I'm active, or have in the last month at rest", cardiac: true },
  { id: "dizzy", label: "I lose balance from dizziness, or have lost consciousness", cardiac: true },
  { id: "bp", label: "I take medication for blood pressure or a heart condition", cardiac: true },
  { id: "joint", label: "I have a bone or joint problem that activity could make worse" },
  { id: "other", label: "I know another reason I shouldn't exercise" },
];

function RunSetup(props) {
  const [step, setStep] = useState(0);
  const [distanceM, setDistanceM] = useState(null);
  const [target, setTarget] = useState({ h: "", m: "", s: "" });
  const [goalDate, setGoalDate] = useState(addDays(todayStr(), 7 * 12));
  const [units, setUnits] = useState("km");
  const [kind, setKind] = useState(null);
  const [aDist, setADist] = useState(5000);
  const [aDistFree, setADistFree] = useState("");
  const [aTime, setATime] = useState({ h: "", m: "", s: "" });
  const [weekly, setWeekly] = useState("");
  const [longest, setLongest] = useState("");
  const [days, setDays] = useState("4");
  const [longDay, setLongDay] = useState(6);
  const [level, setLevel] = useState(null);
  const [injury, setInjury] = useState(null);
  const [age, setAge] = useState("");
  const [parq, setParq] = useState([]);
  const [parqNone, setParqNone] = useState(false);
  const [cleared, setCleared] = useState(false);
  const [choice, setChoice] = useState("keep");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const today = todayStr();
  const targetS = hms(target.h, target.m, target.s);
  const aDistM = kind === "easy" ? toMeters(aDistFree, units) : aDist;
  const aTimeS = hms(aTime.h, aTime.m, aTime.s);
  const weeks = Math.floor(Math.max(0, daysBetween(today, goalDate)) / 7) + 1;
  const cardiac = parq.some((id) => PARQ.find((p) => p.id === id).cardiac);

  const assessment = useMemo(() => {
    if (kind === "new") return vdotFromAssessment({ kind: "new" });
    if (kind && aDistM > 0 && aTimeS > 0) return vdotFromAssessment({ kind, distanceM: aDistM, timeS: aTimeS });
    return null;
  }, [kind, aDistM, aTimeS]);
  const lvl = level === "beginner" || kind === "new" ? "beginner" : level || "intermediate";
  const feas = assessment && distanceM && targetS > 0 ? assessGoal({ currentVdot: assessment.vdot, goalDistanceM: distanceM, goalTimeS: targetS, weeks, level: planningLevel({ level: lvl, injury }), weeklyKm: Number(weekly) ? toMeters(weekly, units) / 1000 : undefined }) : null;

  const steps = ["goal", "fitness", "schedule", "safety", "review"];
  const key = steps[step];

  function next() {
    setErr("");
    if (key === "goal") {
      if (!distanceM) return setErr("Pick a race distance.");
      if (!(targetS > 0)) return setErr("Enter your goal time.");
      if (daysBetween(today, goalDate) < 14) return setErr("Pick a race date at least two weeks away.");
      if (daysBetween(today, goalDate) > 7 * 52) return setErr("Pick a race date within the next year.");
      if (vdotOk(distanceM, targetS)) return setErr(vdotOk(distanceM, targetS));
    }
    if (key === "fitness") {
      if (!kind) return setErr("Pick the option that fits you best.");
      if (kind !== "new") {
        if (!(aDistM > 0) || !(aTimeS > 0)) return setErr(kind === "race" ? "Enter your race distance and time." : "Enter the distance and time of a recent comfortable run.");
        const p = aTimeS / (aDistM / 1000);
        if (p < 150 || p > 1200) return setErr("That pace doesn't look right. Check the distance and time.");
        if (!(Number(weekly) >= 0) || weekly === "") return setErr("Enter roughly how far you run in a week.");
      }
    }
    if (key === "schedule") {
      const d = Number(days);
      if (!(d >= 2 && d <= 7)) return setErr("Run days per week should be between 2 and 7.");
      if (!level && kind !== "new") return setErr("Pick your running experience.");
      if (!injury) return setErr("Tell your coach about injuries.");
      if (injury === "now") return setErr("Get that injury looked at first. Come back when you can run without it changing your stride.");
    }
    if (key === "safety") {
      if (!parq.length && !parqNone) return setErr("Tap any that apply, or confirm none do.");
      if (cardiac && !cleared) return setErr("Get medical clearance before starting a running plan.");
      // Recommend the stepping stone when the goal is out of reach in time.
      setChoice(feas && feas.status === "unrealistic" && feas.steppingStone ? "stone" : "keep");
    }
    setStep(step + 1);
  }

  async function build() {
    setErr("");
    setSaving(true);
    try {
      let finalTarget = targetS;
      if (choice === "stone" && feas && feas.steppingStone) finalTarget = feas.steppingStone.timeS;
      const setupData = {
        units, days: Number(days), longWeekday: longDay, level: lvl, injury, age: Number(age) || null,
        weeklyM: kind === "new" ? 0 : Math.round(toMeters(weekly || 0, units)), longestM: Number(longest) ? Math.round(toMeters(longest, units)) : null,
        assessment: { kind, distanceM: kind === "new" ? null : aDistM, timeS: kind === "new" ? null : aTimeS },
        parq, cleared: cardiac ? cleared : null, originalTargetS: targetS, planStart: null, strength: true,
      };
      // Plan weeks are anchored to the race day, so the first plan day is fixed by the goal date.
      setupData.planStart = addDays(goalDate, -6 - 7 * (weeks - 1));
      await createGoalAndPlan({ distanceM, targetTimeS: finalTarget, goalDate, vdot: assessment.vdot, vdotSource: assessment.source, setup: setupData });
      props.onDone();
    } catch (e) {
      setErr("Couldn't build your plan: " + (e.message || "try again"));
      setSaving(false);
    }
  }

  const footer = (
    <div>
      {err && <div style={{ color: "#dc2626", fontSize: 14, fontWeight: 600, marginBottom: 10, textWrap: "pretty" }}>{err}</div>}
      <div style={{ display: "flex", gap: 10 }}>
        {step > 0 && <button onClick={() => { setErr(""); setStep(step - 1); }} style={Object.assign({}, ghostBtn, { width: "auto", flex: "0 0 96px" })}>Back</button>}
        {key === "review"
          ? <button disabled={saving} onClick={build} style={Object.assign({}, primaryBtn, { flex: 1, opacity: saving ? 0.6 : 1 })}>{saving ? "Building Your Plan..." : "Build My Plan"}</button>
          : <button onClick={next} style={Object.assign({}, primaryBtn, { flex: 1 })}>Continue</button>}
      </div>
    </div>
  );

  return (
    <Sheet title={props.previous ? "New Running Goal" : "Set a Running Goal"} onClose={props.onClose} footer={footer} scrollKey={step}>
      <div style={{ height: 5, background: "#eef1f5", borderRadius: 5, overflow: "hidden", marginBottom: 18 }}>
        <div style={{ width: ((step + 1) / steps.length) * 100 + "%", height: "100%", background: ACCENT, borderRadius: 5, transition: "width .4s cubic-bezier(.22,1,.36,1)" }} />
      </div>

      {key === "goal" && (
        <div>
          <Q title="What Are You Training For?" sub="Pick the race and the time you want to run." />
          <Grid>{DISTANCES.map((d) => <Choice key={d.id} center label={d.label} selected={distanceM === d.id} onClick={() => setDistanceM(d.id)} />)}</Grid>
          <div style={Object.assign({}, labelStyle, { marginTop: 20, marginBottom: 8 })}>Goal Time</div>
          <TimeFields hours={distanceM && distanceM > 10000} value={target} onChange={setTarget} />
          <Grid>
            <label style={{ display: "block", marginTop: 16, minWidth: 0 }}>
              <div style={Object.assign({}, labelStyle, { marginBottom: 8 })}>Race Date</div>
              <input type="date" value={goalDate} min={addDays(today, 14)} onChange={(e) => setGoalDate(e.target.value || goalDate)} style={Object.assign({}, fieldStyle, { padding: "13px 12px", fontWeight: 600, minHeight: 52 })} />
            </label>
            <div style={{ marginTop: 16, minWidth: 0 }}>
              <div style={Object.assign({}, labelStyle, { marginBottom: 8 })}>Units</div>
              <Grid gap={6}><Choice compact center label="Km" selected={units === "km"} onClick={() => setUnits("km")} /><Choice compact center label="Miles" selected={units === "mi"} onClick={() => setUnits("mi")} /></Grid>
            </div>
          </Grid>
          <p style={Object.assign({}, body, { fontSize: 13, marginTop: 10 })}>{weeks} weeks from today.</p>
        </div>
      )}

      {key === "fitness" && (
        <div>
          <Q title="Where Are You Today?" sub="Your current fitness sets every pace in your plan." />
          <div style={{ display: "grid", gap: 10 }}>
            <Choice label="I Have a Recent Race or Time Trial" sub="An all-out effort in the last 2 months. The most accurate start." selected={kind === "race"} onClick={() => setKind("race")} />
            <Choice label="I Run, but Haven't Raced Lately" sub="Your coach estimates from a comfortable run, on the cautious side." selected={kind === "easy"} onClick={() => setKind("easy")} />
            <Choice label="I'm New to Running" sub="You'll start with run-walk and build from there." selected={kind === "new"} onClick={() => setKind("new")} />
          </div>
          {kind === "race" && (
            <div style={{ marginTop: 18 }}>
              <div style={Object.assign({}, labelStyle, { marginBottom: 8 })}>Race Distance</div>
              <Grid>{DISTANCES.map((d) => <Choice key={d.id} compact center label={d.label} selected={aDist === d.id} onClick={() => setADist(d.id)} />)}</Grid>
              <div style={Object.assign({}, labelStyle, { marginTop: 16, marginBottom: 8 })}>Your Time</div>
              <TimeFields hours={aDist > 10000} value={aTime} onChange={setATime} />
            </div>
          )}
          {kind === "easy" && (
            <div style={{ marginTop: 18 }}>
              <div style={Object.assign({}, labelStyle, { marginBottom: 8 })}>A Recent Comfortable Run</div>
              <NumField label={"Distance (" + units + ")"} decimal value={aDistFree} onChange={setADistFree} placeholder="5" />
              <div style={{ marginTop: 12 }}><TimeFields hours value={aTime} onChange={setATime} /></div>
            </div>
          )}
          {kind && kind !== "new" && (
            <div style={{ marginTop: 18 }}>
              <Grid>
                <NumField label={"Weekly Distance (" + units + ")"} decimal value={weekly} onChange={setWeekly} placeholder="20" />
                <NumField label={"Longest Recent Run (" + units + ")"} decimal value={longest} onChange={setLongest} placeholder="8" />
              </Grid>
            </div>
          )}
          {assessment && kind !== "new" && <p style={Object.assign({}, body, { fontSize: 13, marginTop: 12 })}>Starting fitness: <b style={{ color: INK }}>{assessment.vdot.toFixed(1)}</b>. Your first time trial will sharpen it.</p>}
        </div>
      )}

      {key === "schedule" && (
        <div>
          <Q title="How Does Running Fit Your Week?" sub="Your plan never schedules more days than you give it." />
          <Grid>
            <NumField label="Run Days per Week" value={days} onChange={setDays} placeholder="4" />
            <NumField label="Age (Optional)" value={age} onChange={setAge} placeholder="35" />
          </Grid>
          <div style={Object.assign({}, labelStyle, { marginTop: 18, marginBottom: 8 })}>Long Run Day</div>
          <Grid cols={7} gap={5}>{DAY_ABBR.map((d, i) => <button key={d} onClick={() => setLongDay(i)} style={{ minHeight: 44, borderRadius: 11, border: "1.5px solid " + (longDay === i ? ACCENT : BORDER), background: longDay === i ? ACCENT : "#fff", color: longDay === i ? "#fff" : INK, fontSize: 13, fontWeight: 700, padding: 0 }}>{d}</button>)}</Grid>
          {kind !== "new" && (
            <div>
              <div style={Object.assign({}, labelStyle, { marginTop: 18, marginBottom: 8 })}>Running Experience</div>
              <div style={{ display: "grid", gap: 8 }}>
                <Choice label="Under a Year" sub="Newer to regular running." selected={level === "beginner"} onClick={() => setLevel("beginner")} />
                <Choice label="One to Three Years" sub="You run most weeks and have done a race or two." selected={level === "intermediate"} onClick={() => setLevel("intermediate")} />
                <Choice label="Three Years or More" sub="Consistent training and racing." selected={level === "experienced"} onClick={() => setLevel("experienced")} />
              </div>
            </div>
          )}
          <div style={Object.assign({}, labelStyle, { marginTop: 18, marginBottom: 8 })}>Injuries</div>
          <div style={{ display: "grid", gap: 8 }}>
            <Choice label="No Recent Injuries" selected={injury === "none"} onClick={() => setInjury("none")} />
            <Choice label="Coming Back From an Injury" sub="Your plan builds more gradually." selected={injury === "recent"} onClick={() => setInjury("recent")} />
            <Choice label="Injured Right Now" sub="Pain that changes how you run." selected={injury === "now"} onClick={() => setInjury("now")} />
          </div>
        </div>
      )}

      {key === "safety" && (
        <div>
          <Q title="A Quick Safety Check" sub="Tap any that apply to you. Your answers stay private." />
          <div style={{ display: "grid", gap: 8 }}>
            {PARQ.map((p) => {
              const on = parq.includes(p.id);
              return <Choice key={p.id} label={p.label} selected={on} onClick={() => { setParqNone(false); setParq(on ? parq.filter((x) => x !== p.id) : parq.concat([p.id])); }} />;
            })}
            <Choice label="None of These Apply to Me" selected={parqNone} onClick={() => { setParq([]); setParqNone(true); setCleared(false); }} />
          </div>
          {cardiac && (
            <div style={{ marginTop: 14, background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 14, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>Check With Your Doctor First</div>
              <p style={Object.assign({}, body, { marginTop: 4, color: "#92400e" })}>Before starting a running plan, get medical clearance. Your coach can't assess heart or circulation symptoms.</p>
              <button onClick={() => setCleared(!cleared)} style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, background: "none", border: "none", padding: 0, fontSize: 14.5, fontWeight: 700, color: INK, textAlign: "left" }}>
                <span style={{ width: 24, height: 24, borderRadius: 7, border: "2px solid " + (cleared ? ACCENT : "#d1d5db"), background: cleared ? ACCENT : "#fff", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{cleared && <Check size={14} />}</span>
                My Doctor Has Cleared Me to Run
              </button>
            </div>
          )}
          {!cardiac && parq.length > 0 && <p style={Object.assign({}, body, { marginTop: 12, fontSize: 13 })}>Your plan starts conservatively. If anything gets worse with running, stop and get it checked.</p>}
        </div>
      )}

      {key === "review" && kind === "new" && (
        <div>
          <Q title="We'll Measure, Not Guess" sub={"You'll start with run-walk to build the habit safely. In week 4 you'll run a short time trial, and every pace in your plan comes from that result."} />
          <div style={{ background: "#f7f9fc", borderRadius: 16, padding: 16 }}>
            <div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Your Goal</div>
            <div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatClock(targetS)} {raceLabel(distanceM)}</div>
            <p style={Object.assign({}, body, { fontSize: 12.5, marginTop: 8 })}>Your coach will tell you honestly how it looks once you have a real result.</p>
          </div>
          <p style={Object.assign({}, body, { fontSize: 13, marginTop: 14 })}>{weeks} weeks · {days} run days · long run on {DAY_FULL[longDay]}. Two short strength sessions a week are included.</p>
        </div>
      )}

      {key === "review" && kind !== "new" && feas && (
        <div>
          <Q title={REVIEW_TITLE[feas.status]} sub={reviewText(feas, distanceM, targetS, weeks)} />
          <div style={{ background: "#f7f9fc", borderRadius: 16, padding: 16 }}>
            <Grid>
              <div><div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Your Goal</div><div style={{ fontSize: 24, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{formatClock(targetS)}</div></div>
              <div><div style={{ fontSize: 12, color: FAINT, fontWeight: 600 }}>Likely on Race Day</div><div style={{ fontSize: 17, fontWeight: 800, marginTop: 5, fontVariantNumeric: "tabular-nums" }}>{formatClock(feas.predictedAtGoal.low)} to {formatClock(feas.predictedAtGoal.high)}</div></div>
            </Grid>
            <p style={Object.assign({}, body, { fontSize: 12.5, marginTop: 10 })}>An estimate from your current fitness and the time you have, not a promise.</p>
          </div>
          {feas.status === "unrealistic" && feas.steppingStone && (
            <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
              <Choice label={"Aim for " + formatClock(feas.steppingStone.timeS) + " First (Recommended)"} sub={"A big step you can reach by " + prettyDate(goalDate) + ". Then build toward " + formatClock(targetS) + "."} selected={choice === "stone"} onClick={() => setChoice("stone")} />
              <Choice label={"Keep " + formatClock(targetS) + " as My Goal"} sub="Same plan. Your paces still come from your real fitness, so nothing gets unsafe." selected={choice === "keep"} onClick={() => setChoice("keep")} />
            </div>
          )}
          <p style={Object.assign({}, body, { fontSize: 13, marginTop: 14 })}>{weeks} weeks · {days} run days · long run on {DAY_FULL[longDay]}{injury === "recent" ? " · extra gradual build" : ""}. Two short strength sessions a week are included.</p>
        </div>
      )}
    </Sheet>
  );
}

const REVIEW_TITLE = {
  achieved: "You're Already There",
  realistic: "This Goal Fits Your Timeline",
  stretch: "This Is a Stretch, and Possible",
  unrealistic: "Here's the Honest Picture",
};
function reviewText(f, distanceM, targetS, weeks) {
  if (f.status === "achieved") return "Your current fitness already predicts " + formatClock(targetS) + " or faster. Your plan will keep you sharp, and you can set a faster goal any time.";
  if (f.status === "realistic") return "With consistent training over " + weeks + " weeks, " + formatClock(targetS) + " is within reach.";
  if (f.status === "stretch") return "It will take nearly every week going well. Your plan stays the same either way: paces come from your real fitness.";
  const span = f.weeksNeeded <= 26 ? "about " + f.weeksNeeded + " weeks" : "about " + Math.round(f.weeksNeeded / 4.3) + " months";
  return formatClock(targetS) + " is a big jump from where you are. It's realistic over " + span + " of steady training, and you have " + weeks + ".";
}
function vdotOk(distanceM, timeS) {
  const pace = timeS / (distanceM / 1000);
  if (pace < 160) return "That's faster than world record pace. Check your goal time.";
  if (pace > 900) return "That goal is slower than walking pace. Check your goal time.";
  return "";
}

function Q(props) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-.015em", lineHeight: 1.15, textWrap: "balance" }}>{props.title}</div>
      {props.sub && <p style={Object.assign({}, body, { marginTop: 6 })}>{props.sub}</p>}
    </div>
  );
}
