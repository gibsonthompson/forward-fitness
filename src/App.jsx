import { useState, useEffect } from "react";

// ─── Exercise Database ───
const EXERCISE_DB = [
  { id: "incline-bench", name: "Incline Barbell Press", group: "Chest", type: "compound", area: "upper" },
  { id: "db-bench", name: "Dumbbell Bench Press", group: "Chest", type: "compound", area: "upper" },
  { id: "bench", name: "Flat Bench Press", group: "Chest", type: "compound", area: "upper" },
  { id: "cable-fly", name: "Cable Fly", group: "Chest", type: "isolation", area: "upper" },
  { id: "db-fly", name: "Dumbbell Fly", group: "Chest", type: "isolation", area: "upper" },
  { id: "db-shoulder-press", name: "DB Shoulder Press", group: "Shoulders", type: "compound", area: "upper" },
  { id: "ohp", name: "Barbell OHP", group: "Shoulders", type: "compound", area: "upper" },
  { id: "lateral-raise", name: "Lateral Raise", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "lateral-cable-raise", name: "Lateral Cable Raise", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "rear-delt-cable", name: "Rear Delt Cable Fly", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "face-pull", name: "Face Pull", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "rear-delt-fly", name: "Rear Delt Fly (DB)", group: "Shoulders", type: "isolation", area: "upper" },
  { id: "barbell-row", name: "Barbell Row", group: "Back", type: "compound", area: "upper" },
  { id: "pullup", name: "Pull-Up", group: "Back", type: "compound", area: "upper" },
  { id: "lat-pulldown", name: "Lat Pulldown", group: "Back", type: "compound", area: "upper" },
  { id: "cable-row", name: "Cable Row", group: "Back", type: "compound", area: "upper" },
  { id: "db-row", name: "Dumbbell Row", group: "Back", type: "compound", area: "upper" },
  { id: "squat", name: "Squat", group: "Quads", type: "compound", area: "lower" },
  { id: "leg-press", name: "Leg Press", group: "Quads", type: "compound", area: "lower" },
  { id: "leg-ext", name: "Leg Extension", group: "Quads", type: "isolation", area: "lower" },
  { id: "rdl", name: "Romanian Deadlift", group: "Hamstrings", type: "compound", area: "lower" },
  { id: "leg-curl", name: "Leg Curl", group: "Hamstrings", type: "isolation", area: "lower" },
  { id: "deadlift", name: "Deadlift", group: "Back", type: "compound", area: "lower" },
  { id: "hip-thrust", name: "Hip Thrust", group: "Glutes", type: "compound", area: "lower" },
  { id: "calf-raise", name: "Calf Raise", group: "Calves", type: "isolation", area: "lower" },
  { id: "barbell-curl", name: "Barbell Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "rope-curl", name: "Rope Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "db-curl", name: "Dumbbell Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "hammer-curl", name: "Hammer Curl", group: "Biceps", type: "isolation", area: "upper" },
  { id: "tricep-bar-pushdown", name: "Tricep Bar Pushdown", group: "Triceps", type: "isolation", area: "upper" },
  { id: "rope-pushdown", name: "Rope Pushdown", group: "Triceps", type: "isolation", area: "upper" },
  { id: "tricep-pushdown", name: "Tricep Pushdown", group: "Triceps", type: "isolation", area: "upper" },
  { id: "tricep-ext", name: "Tricep Extension", group: "Triceps", type: "isolation", area: "upper" },
  { id: "skull-crusher", name: "Skull Crusher", group: "Triceps", type: "isolation", area: "upper" },
  { id: "overhead-ext", name: "Overhead Extension", group: "Triceps", type: "isolation", area: "upper" },
  { id: "crunch", name: "Cable Crunch", group: "Abs", type: "isolation", area: "upper" },
  { id: "hanging-raise", name: "Hanging Leg Raise", group: "Abs", type: "isolation", area: "upper" },
  { id: "shrug", name: "Barbell Shrug", group: "Traps", type: "isolation", area: "upper" },
];

// ─── Gibson's Split ───
const MY_SPLIT = [
  { name: "CHEST / BACK", exercises: ["incline-bench", "db-bench", "cable-fly"] },
  { name: "ARMS", exercises: ["tricep-bar-pushdown", "barbell-curl", "rope-pushdown", "rope-curl"] },
  { name: "SHOULDERS / LEGS", exercises: ["db-shoulder-press", "leg-ext", "lateral-cable-raise", "leg-curl", "rear-delt-fly", "calf-raise"] },
];

const PROTEIN_PRESETS = [
  { name: "Chicken Breast (4oz)", protein: 31, cals: 130 },
  { name: "Chicken Thigh (4oz)", protein: 26, cals: 165 },
  { name: "Ground Beef 90% (4oz)", protein: 22, cals: 196 },
  { name: "Salmon (4oz)", protein: 25, cals: 206 },
  { name: "Steak Sirloin (6oz)", protein: 42, cals: 312 },
  { name: "Turkey Breast (4oz)", protein: 28, cals: 120 },
  { name: "Tuna Can (5oz)", protein: 30, cals: 120 },
  { name: "Shrimp (4oz)", protein: 24, cals: 120 },
  { name: "Eggs (1 large)", protein: 6, cals: 72 },
  { name: "Egg Whites (3 large)", protein: 11, cals: 51 },
  { name: "Whey Protein (1 scoop)", protein: 25, cals: 120 },
  { name: "Casein Protein (1 scoop)", protein: 24, cals: 110 },
  { name: "Greek Yogurt (1 cup)", protein: 17, cals: 130 },
  { name: "Cottage Cheese (1 cup)", protein: 28, cals: 220 },
  { name: "Milk (1 cup)", protein: 8, cals: 150 },
  { name: "Protein Bar", protein: 20, cals: 200 },
  { name: "Rice (1 cup cooked)", protein: 4, cals: 206 },
  { name: "Pasta (1 cup cooked)", protein: 7, cals: 220 },
  { name: "Black Beans (1 cup)", protein: 15, cals: 227 },
  { name: "Tofu Firm (4oz)", protein: 10, cals: 80 },
];

const MUSCLE_GROUPS = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Calves", "Abs", "Traps"];
const today = () => new Date().toISOString().split("T")[0];

// ─── Progressive Overload Engine ───
function computeRec(history, exId) {
  const ex = EXERCISE_DB.find(e => e.id === exId);
  if (!history || !history.length) return null;
  const last = history[history.length - 1];
  const sets = last.sets;
  if (!sets?.length) return null;

  const avgReps = sets.reduce((a, s) => a + s.reps, 0) / sets.length;
  const avgRir = sets.reduce((a, s) => a + s.rir, 0) / sets.length;
  const w = sets[0].weight;
  const inc = ex?.area === "lower" ? 10 : 5;

  let stall = 0;
  for (let i = history.length - 1; i >= Math.max(0, history.length - 3); i--) {
    if (history[i].sets?.[0]?.weight === w) stall++;
  }
  if (stall >= 3) return { weight: Math.round(w * 0.6), reps: 12, note: "DELOAD — 3+ sessions stalled. Drop to 60%, recover, come back stronger.", type: "deload" };
  if (avgReps >= 12 && avgRir <= 1) return { weight: w + inc, reps: 8, note: `Crushed 12 reps at RIR ≤1. Move up ${inc}lbs, reset to 8 reps.`, type: "increase" };
  if (avgReps >= 12 && avgRir > 1) return { weight: w, reps: 12, note: `Hit 12 reps but RIR ${avgRir.toFixed(0)}. Same weight — push closer to failure.`, type: "push" };
  if (avgReps < 8 && avgRir === 0) return { weight: w, reps: 8, note: "Missed target at failure. Hold this weight and build up.", type: "hold" };
  return { weight: w, reps: Math.min(Math.round(avgReps) + 1, 12), note: `Add a rep. Target ${Math.min(Math.round(avgReps) + 1, 12)} reps at RIR 1-2.`, type: "progress" };
}

// ─── Storage (Supabase, no auth) ───
import { supabase } from './supabaseClient';
const USER_ID = 'gibson';

async function loadProfile() {
  const { data } = await supabase.from('iron_profiles').select('*').eq('user_id', USER_ID).single();
  return data ? { weight: Number(data.weight), age: data.age } : null;
}
async function saveProfile(p) {
  await supabase.from('iron_profiles').upsert({ user_id: USER_ID, weight: p.weight, age: p.age }, { onConflict: 'user_id' });
}
async function loadWorkouts() {
  const { data } = await supabase.from('iron_workouts').select('*').eq('user_id', USER_ID).order('date', { ascending: false }).limit(200);
  return (data || []).map(r => ({ date: r.date, exercises: r.exercises, id: r.id })).reverse();
}
async function saveWorkout(workout) {
  await supabase.from('iron_workouts').insert({ user_id: USER_ID, date: workout.date, exercises: workout.exercises });
}
async function loadMeals() {
  const { data } = await supabase.from('iron_meals').select('*').eq('user_id', USER_ID).order('date', { ascending: false }).limit(60);
  const obj = {};
  (data || []).forEach(r => { obj[r.date] = r.entries || []; });
  return obj;
}
async function saveMealsForDate(date, entries) {
  await supabase.from('iron_meals').upsert({ user_id: USER_ID, date, entries }, { onConflict: 'user_id,date' });
}
async function loadMeasurements() {
  const { data } = await supabase.from('iron_measurements').select('*').eq('user_id', USER_ID).order('date', { ascending: false }).limit(50);
  return (data || []).map(r => ({ date: r.date, weight: r.weight, chest: r.chest, waist: r.waist, arms: r.arms, shoulders: r.shoulders, quads: r.quads, id: r.id }));
}
async function saveMeasurement(m) {
  await supabase.from('iron_measurements').insert({ user_id: USER_ID, date: m.date, weight: m.weight || null, chest: m.chest || null, waist: m.waist || null, arms: m.arms || null, shoulders: m.shoulders || null, quads: m.quads || null });
}

// ─── Main App ───
export default function App() {
  const [tab, setTab] = useState("workout");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({ weight: 180, age: 28 });
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState({});
  const [measurements, setMeasurements] = useState([]);
  const [showSetup, setShowSetup] = useState(false);

  useEffect(() => {
    (async () => {
      const [p, w, m, ms] = await Promise.all([
        loadProfile(), loadWorkouts(), loadMeals(), loadMeasurements(),
      ]);
      if (p) setProfile(p); else setShowSetup(true);
      setWorkouts(w); setMeals(m); setMeasurements(ms);
      setLoading(false);
    })();
  }, []);

  const handleSaveProfile = async (p) => {
    setProfile(p); setShowSetup(false);
    await saveProfile(p);
  };
  const handleFinishWorkout = async (workout) => {
    setWorkouts(prev => [...prev, workout]);
    await saveWorkout(workout);
  };
  const handleSetMeals = async (date, entries, fullMeals) => {
    setMeals(fullMeals);
    await saveMealsForDate(date, entries);
  };
  const handleAddMeasurement = async (m) => {
    setMeasurements(prev => [m, ...prev]);
    await saveMeasurement(m);
  };

  const proteinTarget = Math.round(profile.weight * 1);
  const calTarget = Math.round(profile.weight * 16 + 300);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const wv = {};
  MUSCLE_GROUPS.forEach(g => wv[g] = 0);
  workouts.filter(w => new Date(w.date) >= weekAgo).forEach(w =>
    (w.exercises || []).forEach(ex => {
      const db = EXERCISE_DB.find(e => e.id === ex.exerciseId);
      if (db) wv[db.group] = (wv[db.group] || 0) + (ex.sets?.length || 0);
    })
  );

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "#000" }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} body{margin:0;background:#000}`}</style>
      <div style={{ width: 24, height: 24, border: "2px solid #222", borderTopColor: "#fff", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ background: "#000", color: "#fff", fontFamily: "'DM Sans', sans-serif", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: 90, WebkitFontSmoothing: "antialiased" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet" />
      <style>{`
        *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
        input[type="number"]{-moz-appearance:textfield}
        input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        body{margin:0;background:#000;overscroll-behavior:none}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:#000}::-webkit-scrollbar-thumb{background:#222;border-radius:2px}
      `}</style>

      {showSetup && <Setup profile={profile} onSave={handleSaveProfile} />}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #111" }}>
        <div>
          <h1 style={{ fontSize: 18, fontFamily: "'Space Mono', monospace", fontWeight: 400, letterSpacing: 2, margin: 0, color: "#666" }}>IRON<span style={{ color: "#fff", fontWeight: 700 }}>PROTOCOL</span></h1>
          <span style={{ fontSize: 7, letterSpacing: 4, color: "#333", fontFamily: "'Space Mono', monospace" }}>PROGRESSIVE OVERLOAD ENGINE</span>
        </div>
        <button onClick={() => setShowSetup(true)} style={S.iconBtn} aria-label="Settings">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </header>

      <div style={{ padding: "20px 16px" }}>
        {tab === "workout" && <WorkoutTab workouts={workouts} onFinish={handleFinishWorkout} wv={wv} />}
        {tab === "nutrition" && <NutritionTab meals={meals} onMealChange={handleSetMeals} pt={proteinTarget} ct={calTarget} />}
        {tab === "progress" && <ProgressTab workouts={workouts} measurements={measurements} onAddMeasurement={handleAddMeasurement} wv={wv} />}
        {tab === "reference" && <ReferenceTab />}
      </div>

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, display: "flex", background: "#000", borderTop: "1px solid #111", padding: "6px 0 max(8px, env(safe-area-inset-bottom))", zIndex: 100 }}>
        {[
          { id: "workout", label: "TRAIN", d: "M6.5 6.5h11M6.5 17.5h11M4 12h16M2 6.5h2M2 17.5h2M20 6.5h2M20 17.5h2" },
          { id: "nutrition", label: "FUEL", d: "M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 14a4 4 0 1 1 4-4 4 4 0 0 1-4 4z" },
          { id: "progress", label: "STATS", d: "M3 20h18M5 16l4-4 4 4 6-8" },
          { id: "reference", label: "INTEL", d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, background: "none", border: "none", cursor: "pointer", padding: "8px 0", color: tab === t.id ? "#fff" : "#444", transition: "color .15s" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? "2" : "1.5"}><path d={t.d}/></svg>
            <span style={{ fontSize: 9, letterSpacing: 2, fontFamily: "'Space Mono', monospace", marginTop: 2 }}>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

// ─── Setup ───
function Setup({ profile, onSave }) {
  const [p, setP] = useState({ ...profile });
  return (
    <div style={S.overlay}>
      <div style={S.sheet}>
        <h2 style={S.sheetTitle}>PROFILE</h2>
        <p style={{ color: "#666", fontSize: 14, margin: "4px 0 24px" }}>Used for protein & calorie targets</p>
        <label style={S.fLabel}>Body Weight (lbs)
          <input style={S.input} type="number" inputMode="numeric" value={p.weight} onChange={e => setP({...p, weight: +e.target.value})} />
        </label>
        <div style={{ height: 12 }} />
        <label style={S.fLabel}>Age
          <input style={S.input} type="number" inputMode="numeric" value={p.age} onChange={e => setP({...p, age: +e.target.value})} />
        </label>
        <div style={{ height: 20 }} />
        <button style={S.btnW} onClick={() => onSave(p)}>SAVE</button>
      </div>
    </div>
  );
}

// ─── Workout Tab ───
function WorkoutTab({ workouts, onFinish, wv }) {
  const [activeSplit, setActiveSplit] = useState(null);
  const [workout, setWorkout] = useState({ date: today(), exercises: [] });
  const [showPicker, setShowPicker] = useState(false);
  const [filterGroup, setFilterGroup] = useState("All");

  const getHist = (exId) => {
    const h = [];
    workouts.forEach(w => (w.exercises || []).forEach(e => { if (e.exerciseId === exId) h.push({ date: w.date, sets: e.sets }); }));
    return h;
  };

  const loadSplit = (idx) => {
    setActiveSplit(idx);
    const split = MY_SPLIT[idx];
    const exercises = split.exercises.map(exId => {
      const rec = computeRec(getHist(exId), exId);
      const w = rec?.weight || 0;
      const r = rec?.reps || 10;
      return { exerciseId: exId, sets: [{ weight: w, reps: r, rir: 2 }, { weight: w, reps: r, rir: 2 }, { weight: w, reps: r, rir: 1 }], recommendation: rec };
    });
    setWorkout({ date: today(), exercises });
  };

  const addEx = (exId) => {
    const rec = computeRec(getHist(exId), exId);
    setWorkout(w => ({ ...w, exercises: [...w.exercises, { exerciseId: exId, sets: [{ weight: rec?.weight || 0, reps: rec?.reps || 10, rir: 2 }], recommendation: rec }] }));
    setShowPicker(false);
  };

  const updateSet = (ei, si, f, v) => {
    setWorkout(w => {
      const ex = [...w.exercises]; const sets = [...ex[ei].sets];
      sets[si] = { ...sets[si], [f]: +v }; ex[ei] = { ...ex[ei], sets };
      return { ...w, exercises: ex };
    });
  };

  const addSet = (ei) => {
    setWorkout(w => {
      const ex = [...w.exercises]; const l = ex[ei].sets[ex[ei].sets.length - 1];
      ex[ei] = { ...ex[ei], sets: [...ex[ei].sets, { ...l }] };
      return { ...w, exercises: ex };
    });
  };

  const rmSet = (ei, si) => {
    setWorkout(w => {
      const ex = [...w.exercises]; const sets = ex[ei].sets.filter((_, i) => i !== si);
      if (!sets.length) ex.splice(ei, 1); else ex[ei] = { ...ex[ei], sets };
      return { ...w, exercises: ex };
    });
  };

  const rmEx = (ei) => setWorkout(w => ({ ...w, exercises: w.exercises.filter((_, i) => i !== ei) }));

  const finish = () => {
    if (!workout.exercises.length) return;
    onFinish(workout);
    setWorkout({ date: today(), exercises: [] });
    setActiveSplit(null);
  };

  const filtered = filterGroup === "All" ? EXERCISE_DB : EXERCISE_DB.filter(e => e.group === filterGroup);

  return (
    <div>
      {/* Split Selector */}
      <div style={{ marginBottom: 20 }}>
        <div style={S.secLabel}>MY SPLIT</div>
        <div style={{ display: "flex", gap: 8 }}>
          {MY_SPLIT.map((s, i) => (
            <button key={i} onClick={() => loadSplit(i)} style={{ flex: 1, background: activeSplit === i ? "#fff" : "#0a0a0a", color: activeSplit === i ? "#000" : "#888", border: "1px solid #1a1a1a", borderRadius: 8, padding: "14px 4px", cursor: "pointer", fontSize: 10, letterSpacing: 1, fontFamily: "'Space Mono', monospace", fontWeight: 600, minHeight: 50, transition: "all .15s" }}>
              {s.name}
            </button>
          ))}
        </div>
      </div>

      {/* Volume */}
      <div style={{ marginBottom: 20 }}>
        <div style={S.secLabel}>WEEKLY VOLUME</div>
        <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
          {MUSCLE_GROUPS.map(g => {
            const v = wv[g] || 0;
            const c = v < 10 ? "#555" : v <= 20 ? "#fff" : "#f33";
            return (
              <div key={g} style={{ flex: "1 0 45px", textAlign: "center" }}>
                <div style={{ fontSize: 7, color: c, fontFamily: "'Space Mono', monospace", letterSpacing: 1, marginBottom: 2 }}>{g.slice(0,3).toUpperCase()}</div>
                <div style={{ height: 3, background: "#111", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${Math.min(v/20*100, 100)}%`, background: c, borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 9, color: c, fontFamily: "'Space Mono', monospace", marginTop: 2 }}>{v}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Exercises */}
      {workout.exercises.map((ex, ei) => {
        const db = EXERCISE_DB.find(e => e.id === ex.exerciseId);
        const recColor = ex.recommendation?.type === "increase" ? "#0f0" : ex.recommendation?.type === "deload" ? "#f33" : "#444";
        return (
          <div key={ei} style={S.card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.3 }}>{db?.name || ex.exerciseId}</div>
                <div style={{ fontSize: 11, color: "#555", fontFamily: "'Space Mono', monospace" }}>{db?.group} • {db?.type}</div>
              </div>
              <button style={S.xBtn} onClick={() => rmEx(ei)}>✕</button>
            </div>

            {ex.recommendation && (
              <div style={{ background: "#080808", borderLeft: `3px solid ${recColor}`, padding: "10px 12px", borderRadius: "0 6px 6px 0", margin: "10px 0 14px" }}>
                <div style={{ fontSize: 8, letterSpacing: 2, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 4 }}>RECOMMENDATION</div>
                <div style={{ fontSize: 13, color: "#ccc", lineHeight: 1.5, marginBottom: 6 }}>{ex.recommendation.note}</div>
                <div style={{ fontSize: 15, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>→ {ex.recommendation.weight} lbs × {ex.recommendation.reps}</div>
              </div>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 2px", marginBottom: 6 }}>
              <span style={{ ...S.colHead, width: 28 }}>SET</span>
              <span style={{ ...S.colHead, flex: 1 }}>LBS</span>
              <span style={{ ...S.colHead, flex: 1 }}>REPS</span>
              <span style={{ ...S.colHead, width: 52 }}>RIR</span>
              <span style={{ width: 36 }} />
            </div>

            {ex.sets.map((s, si) => (
              <div key={si} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ width: 28, textAlign: "center", color: "#444", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>{si+1}</span>
                <input style={S.sInput} type="number" inputMode="decimal" value={s.weight} onChange={e => updateSet(ei, si, "weight", e.target.value)} />
                <input style={S.sInput} type="number" inputMode="numeric" value={s.reps} onChange={e => updateSet(ei, si, "reps", e.target.value)} />
                <input style={{ ...S.sInput, width: 52, flex: "none" }} type="number" inputMode="numeric" min="0" max="5" value={s.rir} onChange={e => updateSet(ei, si, "rir", e.target.value)} />
                <button style={{ ...S.xBtn, width: 36, fontSize: 16 }} onClick={() => rmSet(ei, si)}>−</button>
              </div>
            ))}

            <button onClick={() => addSet(ei)} style={{ background: "none", border: "1px dashed #222", borderRadius: 6, color: "#444", padding: "10px 0", width: "100%", cursor: "pointer", fontSize: 11, letterSpacing: 2, fontFamily: "'Space Mono', monospace", marginTop: 4, minHeight: 44 }}>+ SET</button>
          </div>
        );
      })}

      <button onClick={() => setShowPicker(true)} style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, color: "#888", padding: "16px 0", width: "100%", cursor: "pointer", fontSize: 12, letterSpacing: 3, fontFamily: "'Space Mono', monospace", fontWeight: 600, marginBottom: 10, minHeight: 52 }}>+ ADD EXERCISE</button>

      {workout.exercises.length > 0 && <button style={S.btnW} onClick={finish}>FINISH WORKOUT</button>}

      {/* History */}
      {workouts.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div style={S.secLabel}>RECENT</div>
          {[...workouts].reverse().slice(0, 5).map((w, i) => (
            <div key={i} style={{ ...S.card, padding: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, color: "#888" }}>{w.date}</span>
                <span style={{ fontSize: 11, color: "#444" }}>{w.exercises.length} ex • {w.exercises.reduce((a, e) => a + e.sets.length, 0)} sets</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {w.exercises.map((e, j) => {
                  const d = EXERCISE_DB.find(x => x.id === e.exerciseId);
                  const top = e.sets.reduce((b, s) => s.weight > b.weight ? s : b, e.sets[0]);
                  return <span key={j} style={{ fontSize: 11, background: "#111", padding: "5px 8px", borderRadius: 4, color: "#999", fontFamily: "'Space Mono', monospace" }}>{d?.name?.split(" ").slice(0,2).join(" ") || "?"} {top.weight}×{top.reps}</span>;
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Picker */}
      {showPicker && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={S.sheetTitle}>ADD EXERCISE</h2>
              <button style={S.xBtn} onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
              {["All", ...MUSCLE_GROUPS].map(g => (
                <button key={g} onClick={() => setFilterGroup(g)} style={{ background: filterGroup === g ? "#fff" : "#111", color: filterGroup === g ? "#000" : "#666", border: "1px solid #1a1a1a", borderRadius: 20, padding: "7px 14px", fontSize: 11, cursor: "pointer", fontFamily: "'Space Mono', monospace", minHeight: 34 }}>{g}</button>
              ))}
            </div>
            <div style={{ maxHeight: "50vh", overflow: "auto" }}>
              {filtered.map(e => (
                <button key={e.id} onClick={() => addEx(e.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", borderBottom: "1px solid #111", color: "#fff", padding: "14px 4px", width: "100%", cursor: "pointer", textAlign: "left", minHeight: 50 }}>
                  <span style={{ fontSize: 15 }}>{e.name}</span>
                  <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{e.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Nutrition ───
function NutritionTab({ meals, onMealChange, pt, ct }) {
  const [date, setDate] = useState(today());
  const [showP, setShowP] = useState(false);
  const [custom, setCustom] = useState({ name: "", protein: "", cals: "" });

  const dm = meals[date] || [];
  const tp = dm.reduce((a, m) => a + m.protein, 0);
  const tc = dm.reduce((a, m) => a + m.cals, 0);

  const add = (p) => {
    const m = { name: p.name, protein: p.protein, cals: p.cals, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    const newEntries = [...(meals[date] || []), m];
    const fullMeals = { ...meals, [date]: newEntries };
    onMealChange(date, newEntries, fullMeals);
    setShowP(false);
  };

  const addC = () => { if (!custom.name) return; add({ name: custom.name, protein: +custom.protein || 0, cals: +custom.cals || 0 }); setCustom({ name: "", protein: "", cals: "" }); };
  const rm = (i) => {
    const newEntries = (meals[date] || []).filter((_, j) => j !== i);
    const fullMeals = { ...meals, [date]: newEntries };
    onMealChange(date, newEntries, fullMeals);
  };

  const prev = () => { const d = new Date(date); d.setDate(d.getDate()-1); setDate(d.toISOString().split("T")[0]); };
  const next = () => { const d = new Date(date); d.setDate(d.getDate()+1); setDate(d.toISOString().split("T")[0]); };

  const week = [];
  for (let i = 6; i >= 0; i--) { const d = new Date(); d.setDate(d.getDate()-i); const ds = d.toISOString().split("T")[0]; week.push({ d: d.toLocaleDateString("en",{weekday:"narrow"}), p: (meals[ds]||[]).reduce((a,m)=>a+m.protein,0) }); }

  const ppct = Math.min(tp/pt*100, 100);
  const cpct = Math.min(tc/ct*100, 100);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 24 }}>
        <button style={S.iconBtn} onClick={prev}>←</button>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 13, letterSpacing: 2, color: date === today() ? "#fff" : "#888" }}>{date === today() ? "TODAY" : date}</span>
        <button style={S.iconBtn} onClick={next}>→</button>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 28 }}>
        <Ring label="PROTEIN" val={tp} tgt={pt} unit="g" pct={ppct} />
        <Ring label="CALORIES" val={tc} tgt={ct} unit="" pct={cpct} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 8, letterSpacing: 2, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>MEALS</div>
          <div style={{ width: 76, height: 76, border: `2px solid ${dm.length >= 3 ? "#0f0" : "#f33"}`, borderRadius: "50%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 26, fontWeight: 700, fontFamily: "'Space Mono', monospace", color: dm.length >= 3 ? "#0f0" : "#f33" }}>{dm.length}</span>
            <span style={{ fontSize: 7, color: "#555", fontFamily: "'Space Mono', monospace" }}>{dm.length >= 3 ? "ON TRACK" : "EAT 3+"}</span>
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 24 }}>
        <div style={S.secLabel}>7-DAY PROTEIN</div>
        <div style={{ display: "flex", gap: 4, alignItems: "flex-end", height: 56 }}>
          {week.map((w, i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, height: "100%" }}>
              <div style={{ flex: 1, width: "100%", background: "#111", borderRadius: 2, display: "flex", alignItems: "flex-end" }}>
                <div style={{ width: "100%", height: `${Math.min(w.p/pt*100, 100)}%`, background: w.p >= pt ? "#0f0" : "#444", borderRadius: 2, minHeight: 2 }} />
              </div>
              <span style={{ fontSize: 9, color: "#444", fontFamily: "'Space Mono', monospace" }}>{w.d}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={S.secLabel}>MEALS</div>
          <button onClick={() => setShowP(true)} style={{ background: "#1a1a1a", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12, fontFamily: "'Space Mono', monospace", cursor: "pointer", minHeight: 36 }}>+ ADD</button>
        </div>
        {!dm.length && <p style={{ color: "#333", fontSize: 13, textAlign: "center", padding: 20 }}>No meals logged</p>}
        {dm.map((m, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #111" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>{m.protein}g P • {m.cals} cal{m.time ? ` • ${m.time}` : ""}</div>
            </div>
            <button style={S.xBtn} onClick={() => rm(i)}>✕</button>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={S.secLabel}>QUICK ADD</div>
        <input style={{ ...S.input, marginBottom: 8 }} placeholder="Food name" value={custom.name} onChange={e => setCustom({...custom, name: e.target.value})} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input style={S.input} placeholder="Protein (g)" type="number" inputMode="numeric" value={custom.protein} onChange={e => setCustom({...custom, protein: e.target.value})} />
          <input style={S.input} placeholder="Calories" type="number" inputMode="numeric" value={custom.cals} onChange={e => setCustom({...custom, cals: e.target.value})} />
        </div>
        <button style={{ ...S.btnW, marginTop: 10 }} onClick={addC}>LOG IT</button>
      </div>

      {showP && (
        <div style={S.overlay}>
          <div style={S.sheet}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h2 style={S.sheetTitle}>FOOD PRESETS</h2>
              <button style={S.xBtn} onClick={() => setShowP(false)}>✕</button>
            </div>
            <div style={{ maxHeight: "60vh", overflow: "auto" }}>
              {PROTEIN_PRESETS.map((p, i) => (
                <button key={i} onClick={() => add(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", borderBottom: "1px solid #111", color: "#fff", padding: "14px 4px", width: "100%", cursor: "pointer", textAlign: "left", minHeight: 50 }}>
                  <span style={{ fontSize: 14 }}>{p.name}</span>
                  <span style={{ fontSize: 11, color: "#888", fontFamily: "'Space Mono', monospace" }}>{p.protein}g • {p.cals}cal</span>
                </button>
              ))}
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
      <div style={{ fontSize: 8, letterSpacing: 2, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 8 }}>{label}</div>
      <div style={{ position: "relative", width: 76, height: 76 }}>
        <svg width="76" height="76" viewBox="0 0 76 76">
          <circle cx="38" cy="38" r="32" fill="none" stroke="#111" strokeWidth="5" />
          <circle cx="38" cy="38" r="32" fill="none" stroke={pct >= 100 ? "#0f0" : "#fff"} strokeWidth="5" strokeDasharray={`${pct * 2.01} 201`} strokeLinecap="round" transform="rotate(-90 38 38)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{val}{unit}</span>
          <span style={{ fontSize: 8, color: "#444", fontFamily: "'Space Mono', monospace" }}>/{tgt}{unit}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Progress ───
function ProgressTab({ workouts, measurements, onAddMeasurement, wv }) {
  const [nm, setNm] = useState({ date: today(), weight: "", chest: "", waist: "", arms: "", shoulders: "", quads: "" });
  const addM = () => { onAddMeasurement({ ...nm }); setNm({ date: today(), weight: "", chest: "", waist: "", arms: "", shoulders: "", quads: "" }); };

  const prs = {};
  workouts.forEach(w => (w.exercises||[]).forEach(ex => {
    const db = EXERCISE_DB.find(e => e.id === ex.exerciseId);
    if (!db) return;
    ex.sets.forEach(s => {
      const e1 = Math.round(s.weight * (1 + s.reps/30));
      if (!prs[db.name] || e1 > prs[db.name].e1rm) prs[db.name] = { e1rm: e1, w: s.weight, r: s.reps, d: w.date };
    });
  }));

  const ts = workouts.length;
  const tsets = workouts.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0);
  const tvol = workouts.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.reduce((c, s) => c + s.weight * s.reps, 0), 0), 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
        {[{ v: ts, l: "SESSIONS" }, { v: tsets, l: "SETS" }, { v: `${(tvol/1000).toFixed(0)}k`, l: "LBS MOVED" }].map((s, i) => (
          <div key={i} style={{ ...S.card, textAlign: "center", padding: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Space Mono', monospace" }}>{s.v}</div>
            <div style={{ fontSize: 8, letterSpacing: 2, color: "#555", fontFamily: "'Space Mono', monospace" }}>{s.l}</div>
          </div>
        ))}
      </div>

      {Object.keys(prs).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={S.secLabel}>ESTIMATED 1RM PRs</div>
          {Object.entries(prs).sort((a,b) => b[1].e1rm - a[1].e1rm).map(([n, pr]) => (
            <div key={n} style={{ display: "flex", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #111" }}>
              <span style={{ flex: 1, fontSize: 13 }}>{n}</span>
              <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'Space Mono', monospace", marginRight: 12 }}>{pr.e1rm}</span>
              <span style={{ fontSize: 10, color: "#555", fontFamily: "'Space Mono', monospace" }}>{pr.w}×{pr.r}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 24 }}>
        <div style={S.secLabel}>VOLUME HEATMAP</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(70px, 1fr))", gap: 6 }}>
          {MUSCLE_GROUPS.map(g => {
            const v = wv[g]||0;
            const bg = v === 0 ? "#0a0a0a" : v < 10 ? "#141414" : v <= 20 ? "rgba(0,255,0,.12)" : "rgba(255,50,50,.15)";
            return <div key={g} style={{ background: bg, borderRadius: 6, padding: "10px 6px", textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600 }}>{g}</div>
              <div style={{ fontSize: 10, color: "#888", fontFamily: "'Space Mono', monospace" }}>{v} sets</div>
            </div>;
          })}
        </div>
      </div>

      <div>
        <div style={S.secLabel}>BODY MEASUREMENTS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          {["weight","chest","waist","arms","shoulders","quads"].map(k => (
            <label key={k} style={S.fLabel}>{k.charAt(0).toUpperCase()+k.slice(1)}
              <input style={S.input} type="number" inputMode="decimal" value={nm[k]} onChange={e => setNm({...nm, [k]: e.target.value})} />
            </label>
          ))}
        </div>
        <button style={S.btnW} onClick={addM}>LOG</button>
        {measurements.length > 0 && (
          <div style={{ marginTop: 16 }}>
            {[...measurements].reverse().slice(0,5).map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, padding: "8px 0", borderBottom: "1px solid #111", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11, color: "#555", minWidth: 80 }}>{m.date}</span>
                {m.weight && <span style={{ fontSize: 12, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>W:{m.weight}</span>}
                {m.chest && <span style={{ fontSize: 12, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>Ch:{m.chest}"</span>}
                {m.waist && <span style={{ fontSize: 12, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>Wa:{m.waist}"</span>}
                {m.arms && <span style={{ fontSize: 12, color: "#aaa", fontFamily: "'Space Mono', monospace" }}>Ar:{m.arms}"</span>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Reference ───
function ReferenceTab() {
  const [open, setOpen] = useState(null);
  const secs = [
    { id: "overload", t: "PROGRESSIVE OVERLOAD", c: `The engine of all muscle growth.\n\nDOUBLE PROGRESSION (this app's method):\n• Pick rep range 8-12 for hypertrophy\n• Start at 8 reps with challenging weight\n• Add reps each session until you hit 12 at RIR 0-1\n• Increase weight 5lbs (upper) / 10lbs (lower)\n• Reset to 8 reps. Repeat.\n\nRIR (REPS IN RESERVE):\n• RIR 3 = 3 more in the tank (warm-up zone)\n• RIR 2 = effective stimulus begins\n• RIR 1 = sweet spot for most working sets\n• RIR 0 = failure (last set only)\n\nResearch: RIR 1-3 = same hypertrophy as failure, way less fatigue.\n\nPLATEAU (3+ stalled sessions):\nDeload to 60% for one week → come back and push.` },
    { id: "volume", t: "VOLUME & FREQUENCY", c: `Volume = total sets per muscle per week. #1 hypertrophy driver.\n\nOPTIMAL: 10-20 sets/muscle/week\n• Under 10 = leaving gains\n• Over 20 = diminishing returns\n\nFREQUENCY:\n• Hit each muscle 2-3x/week\n• MPS elevated only 24-48hrs\n• More frequent = more growth spikes\n\nSPLITS:\n• 3 days: Full Body ×3\n• 4 days: Upper/Lower ×2\n• 5 days: Push/Pull/Legs + Upper/Lower\n• 6 days: PPL ×2` },
    { id: "aesthetics", t: "AESTHETICS TRAINING", c: `Visual balance > raw size.\n\nPRIORITY ORDER:\n1. Shoulders (width = aesthetics)\n2. Back (V-taper)\n3. Upper Chest (fullness)\n4. Arms (proportional)\n5. Legs (sweep & shape)\n6. Core (low BF% + direct work)\n\nEXERCISE SELECTION:\n• Compounds first → isolation after\n• Stretched-position exercises superior\n  (incline curls, RDLs, overhead extensions)\n\nREP RANGES:\n• 6-12 compounds\n• 10-20 isolation\n• Rest: 2-3 min compounds, 60-90s isolation` },
    { id: "nutrition", t: "NUTRITION", c: `Training = stimulus. Nutrition = raw materials.\n\nPROTEIN:\n• 1g per lb bodyweight daily\n• Split across 3-5 meals (20-40g each)\n• Each meal needs ~2.5g leucine\n• Post-workout within 2 hours\n• 30-40g casein before bed\n\nCALORIES:\n• Bulk: maintenance + 200-400 cal\n• Maintenance ≈ bodyweight × 14-16\n• Cut: maintenance - 500 (keep protein 1g/lb)\n\nDISTRIBUTION:\n• Don't dump all protein in one meal\n• Even distribution = 25% more MPS\n• Front-load breakfast` },
    { id: "recovery", t: "RECOVERY", c: `Growth happens during recovery.\n\nSLEEP: 7-9 hours. Non-negotiable.\n\nDELOAD EVERY 4-6 WEEKS:\n• Drop volume 40-60% OR intensity to 60%\n• Signs: persistent soreness, strength drops, bad sleep\n\nRECOVERY BY GROUP:\n• Small (bi/tri/delts): 24-36 hrs\n• Medium (chest/back): 36-48 hrs\n• Large (quads/glutes): 48-72 hrs\n\nBOOSTERS:\n• 7-9 hrs sleep\n• 1g/lb protein\n• 0.5g/lb carbs post-workout\n• 1oz water per lb bodyweight` },
  ];

  return (
    <div>
      <h2 style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, letterSpacing: 4, marginBottom: 4, marginTop: 0 }}>TRAINING INTEL</h2>
      <p style={{ color: "#444", fontSize: 13, marginBottom: 20, marginTop: 4 }}>Evidence-based. Tap to expand.</p>
      {secs.map(s => (
        <div key={s.id} style={{ border: "1px solid #151515", borderRadius: 8, marginBottom: 8, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === s.id ? null : s.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#0a0a0a", border: "none", color: "#fff", padding: "16px", width: "100%", cursor: "pointer", fontSize: 12, fontFamily: "'Space Mono', monospace", letterSpacing: 2, minHeight: 52 }}>
            <span>{s.t}</span>
            <span style={{ transform: open === s.id ? "rotate(180deg)" : "none", transition: "transform .2s", fontSize: 14 }}>▾</span>
          </button>
          {open === s.id && <pre style={{ padding: "0 16px 16px", fontSize: 13, color: "#bbb", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "'DM Sans', sans-serif", margin: 0 }}>{s.c}</pre>}
        </div>
      ))}
    </div>
  );
}

// ─── Shared Styles ───
const S = {
  card: { background: "#0a0a0a", border: "1px solid #151515", borderRadius: 10, padding: 16, marginBottom: 10 },
  secLabel: { fontSize: 10, letterSpacing: 3, color: "#555", fontFamily: "'Space Mono', monospace", marginBottom: 10, fontWeight: 700 },
  colHead: { fontSize: 9, letterSpacing: 1, color: "#333", fontFamily: "'Space Mono', monospace", textAlign: "center" },
  sInput: { flex: 1, background: "#111", border: "1px solid #1a1a1a", borderRadius: 6, color: "#fff", padding: "10px 4px", fontSize: 16, textAlign: "center", fontFamily: "'Space Mono', monospace", outline: "none" },
  input: { background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, color: "#fff", padding: "12px 14px", fontSize: 16, fontFamily: "'DM Sans', sans-serif", outline: "none", width: "100%" },
  fLabel: { display: "flex", flexDirection: "column", fontSize: 10, color: "#555", letterSpacing: 1, fontFamily: "'Space Mono', monospace", gap: 6 },
  btnW: { background: "#fff", color: "#000", border: "none", borderRadius: 10, padding: "14px 24px", fontSize: 13, letterSpacing: 3, fontFamily: "'Space Mono', monospace", fontWeight: 700, cursor: "pointer", width: "100%", minHeight: 50 },
  iconBtn: { background: "none", border: "none", color: "#555", cursor: "pointer", padding: 10, minWidth: 44, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center" },
  xBtn: { background: "none", border: "none", color: "#444", fontSize: 18, cursor: "pointer", padding: 8, minWidth: 36, minHeight: 36, display: "flex", alignItems: "center", justifyContent: "center" },
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" },
  sheet: { background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: "16px 16px 0 0", padding: "24px 20px max(20px, env(safe-area-inset-bottom))", width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "auto" },
  sheetTitle: { fontSize: 15, fontFamily: "'Space Mono', monospace", letterSpacing: 3, margin: 0 },
};