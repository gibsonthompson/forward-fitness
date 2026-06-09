import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

const USER_ID = "gibson";
const BODY_WEIGHT = 180;

const EXERCISES = [
  { id: "incline-bench", name: "Incline Bench", group: "Chest", type: "compound", area: "upper" },
  { id: "db-bench", name: "DB Bench Press", group: "Chest", type: "compound", area: "upper" },
  { id: "bench", name: "Flat Bench Press", group: "Chest", type: "compound", area: "upper" },
  { id: "cable-fly", name: "Cable Fly", group: "Chest", type: "isolation", area: "upper" },
  { id: "db-fly", name: "DB Fly", group: "Chest", type: "isolation", area: "upper" },
  { id: "db-shoulder-press", name: "DB Shoulder Press", group: "Shoulders", type: "compound", area: "upper" },
  { id: "ohp", name: "Barbell OHP", group: "Shoulders", type: "compound", area: "upper" },
  { id: "lateral-raise", name: "Lateral Raise", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "lateral-cable-raise", name: "Lateral Cable Raise", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "rear-delt-cable", name: "Rear Delt Cable", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "face-pull", name: "Face Pull", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "barbell-row", name: "Barbell Row", group: "Back", type: "compound", area: "upper" },
  { id: "pullup", name: "Pull-Up", group: "Back", type: "compound", area: "upper" },
  { id: "lat-pulldown", name: "Lat Pulldown", group: "Back", type: "compound", area: "upper" },
  { id: "cable-row", name: "Cable Row", group: "Back", type: "compound", area: "upper" },
  { id: "db-row", name: "DB Row", group: "Back", type: "compound", area: "upper" },
  { id: "deadlift", name: "Deadlift", group: "Back", type: "compound", area: "lower" },
  { id: "squat", name: "Squat", group: "Quads", type: "compound", area: "lower" },
  { id: "leg-press", name: "Leg Press", group: "Quads", type: "compound", area: "lower" },
  { id: "leg-ext", name: "Leg Extension", group: "Quads", type: "isolation", area: "lower" },
  { id: "rdl", name: "Romanian Deadlift", group: "Hamstrings", type: "compound", area: "lower" },
  { id: "leg-curl", name: "Leg Curl", group: "Hamstrings", type: "isolation", area: "lower" },
  { id: "hip-thrust", name: "Hip Thrust", group: "Glutes", type: "compound", area: "lower" },
  { id: "calf-raise", name: "Calf Raise", group: "Calves", type: "isolation", area: "lower" },
  { id: "barbell-curl", name: "Barbell Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "rope-curl", name: "Rope Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "db-curl", name: "DB Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "hammer-curl", name: "Hammer Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "tricep-bar-pushdown", name: "Tricep Bar Pushdown", group: "Triceps", type: "isolation", area: "upper" },
  { id: "rope-pushdown", name: "Rope Pushdown", group: "Triceps", type: "isolation", area: "upper" },
  { id: "skull-crusher", name: "Skull Crusher", group: "Triceps", type: "isolation", area: "upper" },
  { id: "overhead-ext", name: "Overhead Extension", group: "Triceps", type: "isolation", area: "upper" },
  { id: "crunch", name: "Cable Crunch", group: "Abs", type: "isolation", area: "upper" },
  { id: "hanging-raise", name: "Hanging Leg Raise", group: "Abs", type: "isolation", area: "upper" },
  { id: "shrug", name: "Barbell Shrug", group: "Traps", type: "isolation", area: "upper" },
];

const MY_SPLIT = [
  { name: "Chest / Back", exercises: ["incline-bench", "db-bench", "cable-fly"] },
  { name: "Arms", exercises: ["tricep-bar-pushdown", "barbell-curl", "rope-pushdown", "rope-curl"] },
  { name: "Shoulders / Legs", exercises: ["db-shoulder-press", "leg-ext", "lateral-cable-raise", "leg-curl", "rear-delt-fly", "calf-raise"] },
];

const FOOD_PRESETS = [
  { name: "Chicken Breast (4oz)", p: 31, c: 130 },
  { name: "Chicken Thigh (4oz)", p: 26, c: 165 },
  { name: "Ground Beef 90% (4oz)", p: 22, c: 196 },
  { name: "Salmon (4oz)", p: 25, c: 206 },
  { name: "Steak Sirloin (6oz)", p: 42, c: 312 },
  { name: "Turkey Breast (4oz)", p: 28, c: 120 },
  { name: "Tuna Can (5oz)", p: 30, c: 120 },
  { name: "Shrimp (4oz)", p: 24, c: 120 },
  { name: "Eggs (1 large)", p: 6, c: 72 },
  { name: "Egg Whites (3 large)", p: 11, c: 51 },
  { name: "Whey Protein Scoop", p: 25, c: 120 },
  { name: "Casein Protein Scoop", p: 24, c: 110 },
  { name: "Greek Yogurt (1 cup)", p: 17, c: 130 },
  { name: "Cottage Cheese (1 cup)", p: 28, c: 220 },
  { name: "Milk (1 cup)", p: 8, c: 150 },
  { name: "Protein Bar", p: 20, c: 200 },
  { name: "Rice (1 cup cooked)", p: 4, c: 206 },
  { name: "Black Beans (1 cup)", p: 15, c: 227 },
];

const GROUPS = ["Chest","Back","Shoulders","Quads","Hamstrings","Glutes","Biceps","Triceps","Calves","Abs","Traps"];
const today = () => new Date().toISOString().split("T")[0];
const findEx = (id) => EXERCISES.find(e => e.id === id);

function getRec(history, exId) {
  if (!history?.length) return null;
  const last = history[history.length - 1];
  if (!last.sets?.length) return null;
  const ex = findEx(exId);
  const avgR = last.sets.reduce((a, s) => a + s.reps, 0) / last.sets.length;
  const avgRir = last.sets.reduce((a, s) => a + (s.rir ?? 2), 0) / last.sets.length;
  const w = last.sets[0].weight;
  const inc = ex?.area === "lower" ? 10 : 5;
  let stall = 0;
  for (let i = history.length - 1; i >= Math.max(0, history.length - 3); i--) {
    if (history[i].sets?.[0]?.weight === w) stall++;
  }
  if (stall >= 3) return { w: Math.round(w * 0.6), r: 12, msg: "Deload week", color: "#e53935" };
  if (avgR >= 12 && avgRir <= 1) return { w: w + inc, r: 8, msg: `Move up to ${w + inc}lbs`, color: "#22c55e" };
  if (avgR >= 12) return { w, r: 12, msg: "Push closer to failure", color: "#1a73e8" };
  if (avgR < 8) return { w, r: 8, msg: "Hold weight, build reps", color: "#f59e0b" };
  return { w, r: Math.min(Math.round(avgR) + 1, 12), msg: "Add a rep", color: "#1a73e8" };
}

function getLast(workouts, exId) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const m = workouts[i].exercises?.find(e => e.exerciseId === exId);
    if (m) return { date: workouts[i].date, sets: m.sets };
  }
  return null;
}

function getHist(workouts, exId) {
  const h = [];
  workouts.forEach(w => { const m = w.exercises?.find(e => e.exerciseId === exId); if (m) h.push({ date: w.date, sets: m.sets }); });
  return h;
}

// ─── App ───
export default function App() {
  const [tab, setTab] = useState("workout");
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState({});
  const [toast, setToast] = useState(null);
  const [dbOk, setDbOk] = useState(true);

  const flash = (msg, type = "ok") => { setToast({ msg, type }); setTimeout(() => setToast(null), 2500); };

  useEffect(() => {
    (async () => {
      try {
        let q1 = supabase.from("iron_workouts").select("*").eq("user_id", USER_ID).order("date", { ascending: false }).limit(200);
        let q2 = supabase.from("iron_meals").select("*").eq("user_id", USER_ID).order("date", { ascending: false }).limit(60);
        const [r1, r2] = await Promise.all([q1, q2]);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        setWorkouts((r1.data || []).map(r => ({ id: r.id, date: r.date, exercises: r.exercises })).reverse());
        const mObj = {};
        (r2.data || []).forEach(r => { mObj[r.date] = r.entries || []; });
        setMeals(mObj);
        setDbOk(true);
      } catch (e) {
        console.error("DB:", e);
        flash("Database connection failed", "err");
        setDbOk(false);
      }
      setLoading(false);
    })();
  }, []);

  const saveWorkout = async (workout) => {
    try {
      const { error } = await supabase.from("iron_workouts").insert({ user_id: USER_ID, date: workout.date, exercises: workout.exercises });
      if (error) throw error;
      setWorkouts(prev => [...prev, workout]);
      localStorage.removeItem("ff-draft");
      flash("Workout saved!");
      return true;
    } catch (e) {
      flash("Save failed: " + e.message, "err");
      return false;
    }
  };

  const saveMeal = async (date, entries) => {
    try {
      const { error } = await supabase.from("iron_meals").upsert({ user_id: USER_ID, date, entries }, { onConflict: "user_id,date" });
      if (error) throw error;
      setMeals(prev => ({ ...prev, [date]: entries }));
      flash("Meal logged!");
    } catch (e) { flash("Save failed", "err"); }
  };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7fa" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}body{margin:0;background:#f5f7fa}`}</style>
      <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: 88, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a2332" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#f5f7fa;font-family:Inter,-apple-system,sans-serif}input{font-family:inherit;font-size:16px!important}input[type=number]{-moz-appearance:textfield}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}button{font-family:inherit;-webkit-appearance:none;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}`}</style>

      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.type === "err" ? "#fef2f2" : "#f0fdf4", color: toast.type === "err" ? "#dc2626" : "#16a34a", border: `1px solid ${toast.type === "err" ? "#fecaca" : "#bbf7d0"}`, borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, animation: "fadeIn .2s ease", boxShadow: "0 4px 12px rgba(0,0,0,.1)", maxWidth: "90%", textAlign: "center" }}>{toast.msg}</div>}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderBottom: "1px solid #edf0f3" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Forward<span style={{ color: "#1a73e8" }}>Fitness</span></h1>
        {!dbOk && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>● Offline</span>}
      </header>

      <div style={{ padding: "16px 20px" }}>
        {tab === "workout" && <WorkoutTab workouts={workouts} onSave={saveWorkout} flash={flash} />}
        {tab === "nutrition" && <NutritionTab meals={meals} onSave={saveMeal} pt={BODY_WEIGHT} ct={Math.round(BODY_WEIGHT * 16 + 300)} />}
        {tab === "progress" && <ProgressTab workouts={workouts} />}
      </div>

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, display: "flex", background: "#fff", borderTop: "1px solid #edf0f3", padding: "6px 0 max(8px,env(safe-area-inset-bottom))", zIndex: 100 }}>
        {[{ id: "workout", label: "Train", d: "M3 12h4l3-9 4 18 3-9h4" },{ id: "nutrition", label: "Fuel", d: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" },{ id: "progress", label: "Progress", d: "M3 20h18M5 16l4-4 4 4 6-8" }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: "8px 0", color: tab === t.id ? "#1a73e8" : "#9ca3af" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d={t.d}/></svg>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Workout ───
function WorkoutTab({ workouts, onSave, flash }) {
  const [workout, setWorkout] = useState(() => {
    try { const d = localStorage.getItem("ff-draft"); return d ? JSON.parse(d) : { date: today(), exercises: [] }; }
    catch { return { date: today(), exercises: [] }; }
  });
  const [picker, setPicker] = useState(false);
  const [rest, setRest] = useState(0);
  const [resting, setResting] = useState(false);
  const ref = useRef(null);

  useEffect(() => { if (workout.exercises.length) localStorage.setItem("ff-draft", JSON.stringify(workout)); }, [workout]);
  useEffect(() => { if (resting) { ref.current = setInterval(() => setRest(t => t+1), 1000); } else { clearInterval(ref.current); } return () => clearInterval(ref.current); }, [resting]);

  const stopRest = () => { setResting(false); setRest(0); };
  const fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,"0")}`;

  const loadSplit = (i) => {
    const exs = MY_SPLIT[i].exercises.map(id => {
      const rec = getRec(getHist(workouts, id), id);
      const last = getLast(workouts, id);
      return { exerciseId: id, sets: [{ weight: rec?.w || last?.sets?.[0]?.weight || "", reps: rec?.r || last?.sets?.[0]?.reps || "", rir: "" }] };
    });
    setWorkout({ date: today(), exercises: exs });
  };

  const addEx = (id) => {
    const rec = getRec(getHist(workouts, id), id);
    const last = getLast(workouts, id);
    setWorkout(w => ({ ...w, exercises: [...w.exercises, { exerciseId: id, sets: [{ weight: rec?.w || last?.sets?.[0]?.weight || "", reps: rec?.r || last?.sets?.[0]?.reps || "", rir: "" }] }] }));
    setPicker(false);
  };

  const setVal = (ei, si, f, v) => {
    setWorkout(w => { const e = [...w.exercises]; const s = [...e[ei].sets]; s[si] = { ...s[si], [f]: v === "" ? "" : +v }; e[ei] = { ...e[ei], sets: s }; return { ...w, exercises: e }; });
  };

  const addSet = (ei) => {
    setWorkout(w => { const e = [...w.exercises]; e[ei] = { ...e[ei], sets: [...e[ei].sets, { ...e[ei].sets[e[ei].sets.length-1] }] }; return { ...w, exercises: e }; });
    setRest(0); setResting(true);
  };

  const rmSet = (ei, si) => {
    setWorkout(w => { const e = [...w.exercises]; e[ei] = { ...e[ei], sets: e[ei].sets.filter((_,i) => i !== si) }; if (!e[ei].sets.length) e.splice(ei, 1); return { ...w, exercises: e }; });
  };

  const finish = async () => {
    if (!workout.exercises.length) return;
    if (!workout.exercises.some(e => e.sets.some(s => s.weight > 0 && s.reps > 0))) { flash("Enter weight and reps", "err"); return; }
    if (await onSave(workout)) { setWorkout({ date: today(), exercises: [] }); stopRest(); }
  };

  return (
    <div>
      {resting && (
        <div style={{ background: "#1a73e8", color: "#fff", borderRadius: 14, padding: "14px 20px", marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 12, opacity: .8 }}>Rest Timer</div><div style={{ fontSize: 28, fontWeight: 700 }}>{fmt(rest)}</div></div>
          <button onClick={stopRest} style={{ background: "rgba(255,255,255,.2)", border: "none", color: "#fff", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600 }}>Done</button>
        </div>
      )}

      {!workout.exercises.length && (
        <div style={{ marginBottom: 20 }}>
          <Lbl>Select Workout</Lbl>
          <div style={{ display: "flex", gap: 8 }}>
            {MY_SPLIT.map((s, i) => <button key={i} onClick={() => loadSplit(i)} style={{ flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 8px", fontSize: 13, fontWeight: 600, color: "#374151" }}>{s.name}</button>)}
          </div>
        </div>
      )}

      {workout.exercises.map((ex, ei) => {
        const db = findEx(ex.exerciseId);
        const last = getLast(workouts, ex.exerciseId);
        const rec = getRec(getHist(workouts, ex.exerciseId), ex.exerciseId);
        return (
          <div key={ei} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div><div style={{ fontSize: 16, fontWeight: 600 }}>{db?.name}</div><div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{db?.group}</div></div>
              <button onClick={() => { const e = [...workout.exercises]; e.splice(ei, 1); setWorkout({...workout, exercises: e}); }} style={xStyle}>✕</button>
            </div>
            {last && <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "#6b7280" }}><b style={{ color: "#9ca3af", fontWeight: 600, fontSize: 11 }}>LAST: </b>{last.sets.map((s,i) => <span key={i}>{i>0&&" → "}{s.weight}×{s.reps}</span>)}</div>}
            {rec && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, padding: "8px 12px", background: rec.color+"10", borderRadius: 8, borderLeft: `3px solid ${rec.color}` }}><span style={{ fontSize: 13, fontWeight: 600, color: rec.color, flex: 1 }}>{rec.msg}</span><span style={{ fontWeight: 700, color: rec.color }}>{rec.w}×{rec.r}</span></div>}
            <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px 36px", gap: 6, marginBottom: 6 }}>
              <span style={col}>Set</span><span style={col}>Lbs</span><span style={col}>Reps</span><span style={col}>RIR</span><span/>
            </div>
            {ex.sets.map((s, si) => (
              <div key={si} style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px 36px", gap: 6, alignItems: "center", marginBottom: 6 }}>
                <span style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>{si+1}</span>
                <input type="number" inputMode="decimal" value={s.weight} onChange={e => setVal(ei,si,"weight",e.target.value)} style={inp} placeholder="0" />
                <input type="number" inputMode="numeric" value={s.reps} onChange={e => setVal(ei,si,"reps",e.target.value)} style={inp} placeholder="0" />
                <input type="number" inputMode="numeric" value={s.rir} onChange={e => setVal(ei,si,"rir",e.target.value)} style={{ ...inp, color: "#9ca3af" }} placeholder="—" />
                <button onClick={() => rmSet(ei,si)} style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 18, padding: 0, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
              </div>
            ))}
            <button onClick={() => addSet(ei)} style={{ width: "100%", background: "none", border: "1px dashed #d1d5db", borderRadius: 8, padding: "10px", color: "#9ca3af", fontSize: 13, fontWeight: 500, marginTop: 4, minHeight: 44 }}>+ Add Set</button>
          </div>
        );
      })}

      <button onClick={() => setPicker(true)} style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px", color: "#1a73e8", fontSize: 15, fontWeight: 600, marginBottom: 12, minHeight: 52 }}>+ Add Exercise</button>
      {workout.exercises.length > 0 && <button onClick={finish} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 14, padding: "18px", fontSize: 16, fontWeight: 700, minHeight: 56 }}>Save Workout</button>}

      {workouts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <Lbl>Recent Workouts</Lbl>
          {[...workouts].reverse().slice(0, 5).map((w, i) => (
            <div key={i} style={{ ...card, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}><span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{w.date}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{w.exercises?.length} exercises</span></div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(w.exercises||[]).map((e,j) => { const d = findEx(e.exerciseId); const t = e.sets?.reduce((b,s) => s.weight > b.weight ? s : b, e.sets[0]); return <span key={j} style={{ fontSize: 12, background: "#f3f4f6", padding: "4px 10px", borderRadius: 6, color: "#6b7280", fontWeight: 500 }}>{d?.name} {t?.weight}×{t?.reps}</span>; })}</div>
            </div>
          ))}
        </div>
      )}

      {picker && <Picker onSelect={addEx} onClose={() => setPicker(false)} />}
    </div>
  );
}

function Picker({ onSelect, onClose }) {
  const [f, setF] = useState("All");
  const list = f === "All" ? EXERCISES : EXERCISES.filter(e => e.group === f);
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px,env(safe-area-inset-bottom))", width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .25s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Add Exercise</h2>
          <button onClick={onClose} style={{ background: "#f3f4f6", border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 8, marginBottom: 8 }}>
          {["All",...GROUPS].map(g => <button key={g} onClick={() => setF(g)} style={{ background: f===g?"#1a73e8":"#f3f4f6", color: f===g?"#fff":"#6b7280", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", flexShrink: 0 }}>{g}</button>)}
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {list.map(e => <button key={e.id} onClick={() => onSelect(e.id)} style={{ display: "flex", justifyContent: "space-between", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", color: "#1a2332", padding: "14px 4px", width: "100%", textAlign: "left", minHeight: 48 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{e.name}</span><span style={{ fontSize: 12, color: "#9ca3af" }}>{e.group}</span></button>)}
        </div>
      </div>
    </div>
  );
}

// ─── Nutrition ───
function NutritionTab({ meals, onSave, pt, ct }) {
  const [date, setDate] = useState(today());
  const [showP, setShowP] = useState(false);
  const [cust, setCust] = useState({ name: "", p: "", c: "" });
  const dm = meals[date] || [];
  const tp = dm.reduce((a,m) => a + m.protein, 0);
  const tc = dm.reduce((a,m) => a + m.cals, 0);
  const add = (item) => { onSave(date, [...dm, { name: item.name, protein: item.p, cals: item.c, time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) }]); setShowP(false); };
  const addC = () => { if (!cust.name) return; add({ name: cust.name, p: +cust.p||0, c: +cust.c||0 }); setCust({ name: "", p: "", c: "" }); };
  const rm = (i) => onSave(date, dm.filter((_,j) => j !== i));
  const prev = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().split("T")[0]); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().split("T")[0]); };
  const week = []; for (let i=6;i>=0;i--) { const d=new Date();d.setDate(d.getDate()-i);const ds=d.toISOString().split("T")[0]; week.push({day:d.toLocaleDateString("en",{weekday:"narrow"}),p:(meals[ds]||[]).reduce((a,m)=>a+m.protein,0)}); }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 24 }}>
        <button onClick={prev} style={navBtn}>‹</button>
        <span style={{ fontSize: 15, fontWeight: 600, color: date===today()?"#1a73e8":"#6b7280" }}>{date===today()?"Today":date}</span>
        <button onClick={next} style={navBtn}>›</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 28, marginBottom: 28 }}>
        <Ring label="Protein" val={tp} tgt={pt} unit="g" pct={Math.min(tp/pt*100,100)} />
        <Ring label="Calories" val={tc} tgt={ct} unit="" pct={Math.min(tc/ct*100,100)} />
        <div style={{ textAlign: "center" }}><div style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af", marginBottom: 10 }}>Meals</div><div style={{ width: 80, height: 80, border: `3px solid ${dm.length>=3?"#22c55e":"#f59e0b"}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 28, fontWeight: 700, color: dm.length>=3?"#22c55e":"#f59e0b" }}>{dm.length}</span></div></div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <Lbl>7-Day Protein</Lbl>
        <div style={{ display: "flex", gap: 4, height: 48 }}>
          {week.map((w,i) => <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}><div style={{ width: "100%", flex: 1, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "flex-end" }}><div style={{ width: "100%", height: `${Math.min(w.p/pt*100,100)}%`, background: w.p>=pt?"#22c55e":"#1a73e8", borderRadius: 4, minHeight: 2 }} /></div><span style={{ fontSize: 10, color: "#9ca3af" }}>{w.day}</span></div>)}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <Lbl style={{ marginBottom: 0 }}>Meals</Lbl>
          <button onClick={() => setShowP(true)} style={{ background: "#1a73e8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600 }}>+ Add</button>
        </div>
        {!dm.length && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20, fontSize: 14 }}>No meals logged yet</p>}
        {dm.map((m,i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
              <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{m.protein}g · {m.cals} cal{m.time ? ` · ${m.time}` : ""}</div>
            </div>
            <button onClick={() => rm(i)} style={xStyle}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ ...card, marginBottom: 16 }}>
        <Lbl>Quick Add</Lbl>
        <input style={field} placeholder="Food name" value={cust.name} onChange={e => setCust({...cust,name:e.target.value})} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <input style={field} placeholder="Protein (g)" type="number" inputMode="numeric" value={cust.p} onChange={e => setCust({...cust,p:e.target.value})} />
          <input style={field} placeholder="Calories" type="number" inputMode="numeric" value={cust.c} onChange={e => setCust({...cust,c:e.target.value})} />
        </div>
        <button onClick={addC} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, marginTop: 10, minHeight: 48 }}>Log It</button>
      </div>

      {showP && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px,env(safe-area-inset-bottom))", width: "100%", maxWidth: 520, maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .25s ease" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Food Presets</h2>
              <button onClick={() => setShowP(false)} style={{ background: "#f3f4f6", border: "none", borderRadius: 50, width: 32, height: 32, fontSize: 16, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {FOOD_PRESETS.map((p,i) => <button key={i} onClick={() => add(p)} style={{ display: "flex", justifyContent: "space-between", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", color: "#1a2332", padding: "14px 4px", width: "100%", textAlign: "left", minHeight: 48 }}><span style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</span><span style={{ fontSize: 13, color: "#9ca3af" }}>{p.p}g · {p.c}cal</span></button>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Ring({ label, val, tgt, unit, pct }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af", marginBottom: 10 }}>{label}</div>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="5"/><circle cx="40" cy="40" r="34" fill="none" stroke={pct>=100?"#22c55e":"#1a73e8"} strokeWidth="5" strokeDasharray={`${pct*2.14} 214`} strokeLinecap="round" transform="rotate(-90 40 40)"/></svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{val}{unit}</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>/{tgt}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Progress ───
function ProgressTab({ workouts }) {
  const ts = workouts.length;
  const tsets = workouts.reduce((a,w) => a + (w.exercises||[]).reduce((b,e) => b + (e.sets?.length||0), 0), 0);
  const tvol = workouts.reduce((a,w) => a + (w.exercises||[]).reduce((b,e) => b + (e.sets||[]).reduce((c,s) => c + (s.weight||0)*(s.reps||0), 0), 0), 0);
  const prs = {};
  workouts.forEach(w => (w.exercises||[]).forEach(ex => { const db = findEx(ex.exerciseId); if (!db) return; (ex.sets||[]).forEach(s => { if (!s.weight||!s.reps) return; const e1 = Math.round(s.weight*(1+s.reps/30)); if (!prs[db.name]||e1>prs[db.name].e1rm) prs[db.name] = { e1rm: e1, w: s.weight, r: s.reps, d: w.date }; }); }));

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 28 }}>
        {[{v:ts,l:"Workouts"},{v:tsets,l:"Total Sets"},{v:`${(tvol/1000).toFixed(0)}k`,l:"Lbs Moved"}].map((s,i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "18px 12px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1a73e8" }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>
      {Object.keys(prs).length > 0 && (
        <div><Lbl>Personal Records (Est. 1RM)</Lbl>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {Object.entries(prs).sort((a,b) => b[1].e1rm-a[1].e1rm).map(([n,pr],i,arr) => (
              <div key={n} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i<arr.length-1?"1px solid #f3f4f6":"none" }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{n}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1a73e8", marginRight: 12 }}>{pr.e1rm} lbs</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{pr.w}×{pr.r}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {ts === 0 && <p style={{ color: "#9ca3af", fontSize: 15, textAlign: "center", padding: 40 }}>Complete your first workout to see stats</p>}
    </div>
  );
}

// ─── Shared ───
function Lbl({ children, style: s }) { return <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 12, ...s }}>{children}</div>; }
const card = { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #e5e7eb", overflow: "hidden" };
const inp = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, color: "#1a2332", padding: "10px 4px", fontSize: 16, fontWeight: 600, textAlign: "center", outline: "none", width: "100%", minWidth: 0, minHeight: 44 };
const field = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, color: "#1a2332", padding: "14px 16px", fontSize: 16, outline: "none", width: "100%" };
const col = { fontSize: 11, fontWeight: 500, color: "#9ca3af", textAlign: "center" };
const navBtn = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, width: 40, height: 40, fontSize: 20, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" };
const xStyle = { background: "none", border: "none", color: "#d1d5db", fontSize: 20, padding: "8px", minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" };