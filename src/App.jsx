import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";

// ─── Config ───
const DEFAULT_WEIGHT = 180;
const BAR_WEIGHT = 45;
const PLATES = [45, 35, 25, 10, 5, 2.5];

const EXERCISES = [
  { id: "incline-bench", name: "Incline Bench", group: "Chest", area: "upper" },
  { id: "db-bench", name: "DB Bench Press", group: "Chest", area: "upper" },
  { id: "bench", name: "Flat Bench Press", group: "Chest", area: "upper" },
  { id: "cable-fly", name: "Cable Fly", group: "Chest", area: "upper" },
  { id: "db-fly", name: "DB Fly", group: "Chest", area: "upper" },
  { id: "db-shoulder-press", name: "DB Shoulder Press", group: "Shoulders", area: "upper" },
  { id: "ohp", name: "Barbell OHP", group: "Shoulders", area: "upper" },
  { id: "lateral-raise", name: "Lateral Raise", group: "Shoulders", area: "upper" },
  { id: "lateral-cable-raise", name: "Lateral Cable Raise", group: "Shoulders", area: "upper" },
  { id: "rear-delt-fly", name: "Rear Delt Fly", group: "Shoulders", area: "upper" },
  { id: "face-pull", name: "Face Pull", group: "Shoulders", area: "upper" },
  { id: "barbell-row", name: "Barbell Row", group: "Back", area: "upper" },
  { id: "pullup", name: "Pull-Up", group: "Back", area: "upper" },
  { id: "lat-pulldown", name: "Lat Pulldown", group: "Back", area: "upper" },
  { id: "cable-row", name: "Cable Row", group: "Back", area: "upper" },
  { id: "db-row", name: "DB Row", group: "Back", area: "upper" },
  { id: "deadlift", name: "Deadlift", group: "Back", area: "lower" },
  { id: "squat", name: "Squat", group: "Quads", area: "lower" },
  { id: "leg-press", name: "Leg Press", group: "Quads", area: "lower" },
  { id: "leg-ext", name: "Leg Extension", group: "Quads", area: "lower" },
  { id: "rdl", name: "Romanian Deadlift", group: "Hamstrings", area: "lower" },
  { id: "leg-curl", name: "Leg Curl", group: "Hamstrings", area: "lower" },
  { id: "hip-thrust", name: "Hip Thrust", group: "Glutes", area: "lower" },
  { id: "calf-raise", name: "Calf Raise", group: "Calves", area: "lower" },
  { id: "barbell-curl", name: "Barbell Curl", group: "Biceps", area: "upper" },
  { id: "rope-curl", name: "Rope Curl", group: "Biceps", area: "upper" },
  { id: "db-curl", name: "DB Curl", group: "Biceps", area: "upper" },
  { id: "hammer-curl", name: "Hammer Curl", group: "Biceps", area: "upper" },
  { id: "tricep-bar-pushdown", name: "Tricep Bar Pushdown", group: "Triceps", area: "upper" },
  { id: "rope-pushdown", name: "Rope Pushdown", group: "Triceps", area: "upper" },
  { id: "skull-crusher", name: "Skull Crusher", group: "Triceps", area: "upper" },
  { id: "overhead-ext", name: "Overhead Extension", group: "Triceps", area: "upper" },
  { id: "crunch", name: "Cable Crunch", group: "Abs", area: "upper" },
  { id: "hanging-raise", name: "Hanging Leg Raise", group: "Abs", area: "upper" },
  { id: "shrug", name: "Barbell Shrug", group: "Traps", area: "upper" },
];

const MY_SPLIT = [
  { name: "Chest / Back", exercises: ["incline-bench", "db-bench", "cable-fly"] },
  { name: "Arms", exercises: ["tricep-bar-pushdown", "barbell-curl", "rope-pushdown", "rope-curl"] },
  { name: "Shoulders / Legs", exercises: ["db-shoulder-press", "leg-ext", "lateral-cable-raise", "leg-curl", "rear-delt-fly", "calf-raise"] },
];

// Preset programs. Selecting one loads its days onto the home screen.
const PLANS = [
  {
    id: "plan-classic", name: "3-Day Classic", days_per_week: "3 days",
    desc: "The original Forward Fitness split. Balanced, simple, beginner-friendly.",
    days: [
      { name: "Chest / Back", exercises: ["incline-bench", "db-bench", "cable-fly"] },
      { name: "Arms", exercises: ["tricep-bar-pushdown", "barbell-curl", "rope-pushdown", "rope-curl"] },
      { name: "Shoulders / Legs", exercises: ["db-shoulder-press", "leg-ext", "lateral-cable-raise", "leg-curl", "rear-delt-fly", "calf-raise"] },
    ],
  },
  {
    id: "plan-ppl", name: "Push / Pull / Legs", days_per_week: "3 or 6 days",
    desc: "Group movements by pattern. Scales from 3 to 6 days a week. The go-to for intermediate lifters.",
    days: [
      { name: "Push", exercises: ["bench", "incline-bench", "db-shoulder-press", "lateral-raise", "tricep-bar-pushdown", "rope-pushdown"] },
      { name: "Pull", exercises: ["barbell-row", "lat-pulldown", "cable-row", "rear-delt-fly", "barbell-curl", "hammer-curl"] },
      { name: "Legs", exercises: ["squat", "leg-press", "rdl", "leg-curl", "leg-ext", "calf-raise"] },
    ],
  },
  {
    id: "plan-ul", name: "Upper / Lower", days_per_week: "4 days",
    desc: "Hit each muscle twice a week across four sessions. Great strength-to-recovery balance.",
    days: [
      { name: "Upper A", exercises: ["bench", "barbell-row", "db-shoulder-press", "lat-pulldown", "barbell-curl", "tricep-bar-pushdown"] },
      { name: "Lower A", exercises: ["squat", "rdl", "leg-press", "leg-curl", "calf-raise"] },
      { name: "Upper B", exercises: ["incline-bench", "cable-row", "lateral-raise", "pullup", "hammer-curl", "rope-pushdown"] },
      { name: "Lower B", exercises: ["deadlift", "leg-press", "leg-ext", "hip-thrust", "calf-raise"] },
    ],
  },
  {
    id: "plan-fb", name: "Full Body", days_per_week: "3 days",
    desc: "Three full-body sessions a week. Maximum frequency, ideal for busy schedules.",
    days: [
      { name: "Full Body A", exercises: ["squat", "bench", "cable-row", "lateral-raise", "hammer-curl"] },
      { name: "Full Body B", exercises: ["deadlift", "ohp", "lat-pulldown", "leg-ext", "rope-pushdown"] },
      { name: "Full Body C", exercises: ["leg-press", "incline-bench", "barbell-row", "rear-delt-fly", "barbell-curl"] },
    ],
  },
  {
    id: "plan-bro", name: "Bro Split", days_per_week: "5 days",
    desc: "One muscle group per day, five days a week. High volume per session for advanced lifters.",
    days: [
      { name: "Chest", exercises: ["bench", "incline-bench", "db-bench", "cable-fly"] },
      { name: "Back", exercises: ["barbell-row", "lat-pulldown", "cable-row", "db-row"] },
      { name: "Shoulders", exercises: ["db-shoulder-press", "lateral-raise", "rear-delt-fly", "face-pull"] },
      { name: "Arms", exercises: ["barbell-curl", "hammer-curl", "tricep-bar-pushdown", "rope-pushdown"] },
      { name: "Legs", exercises: ["squat", "leg-press", "rdl", "leg-curl", "calf-raise"] },
    ],
  },
  {
    id: "plan-arnold", name: "Arnold Split", days_per_week: "6 days",
    desc: "Chest/back, shoulders/arms, and legs, each twice a week. High frequency and volume.",
    days: [
      { name: "Chest & Back", exercises: ["bench", "incline-bench", "barbell-row", "lat-pulldown", "cable-fly"] },
      { name: "Shoulders & Arms", exercises: ["db-shoulder-press", "lateral-raise", "barbell-curl", "tricep-bar-pushdown", "hammer-curl", "rope-pushdown"] },
      { name: "Legs", exercises: ["squat", "leg-press", "rdl", "leg-curl", "calf-raise"] },
    ],
  },
];

let SPLIT_SEQ = 0;
function newSplitId() { SPLIT_SEQ += 1; return "split-" + Date.now() + "-" + SPLIT_SEQ; }
function withSplitIds(splits) { return (splits || []).map((s) => ({ id: s.id || newSplitId(), name: s.name, exercises: s.exercises || [] })); }

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

// High-protein recipe library. Macros are per single serving.
const MEAL_CATS = ["Breakfast", "Lunch", "Dinner", "Snack"];
const RECIPES = [
  {
    id: "greek-bowl", name: "Greek Yogurt Power Bowl", cat: "Breakfast", time: 5,
    p: 42, c: 48, f: 11, cals: 450,
    blurb: "Five-minute high-protein bowl to start the day strong.",
    ingredients: ["1.5 cups nonfat Greek yogurt", "1 scoop vanilla whey", "1/2 cup mixed berries", "1/4 cup low-sugar granola", "1 tbsp honey", "1 tbsp chia seeds"],
    steps: ["Stir the whey into the Greek yogurt until smooth.", "Top with berries, granola, and chia seeds.", "Drizzle honey over the top and eat."],
  },
  {
    id: "egg-scramble", name: "Spinach Feta Egg Scramble", cat: "Breakfast", time: 10,
    p: 34, c: 6, f: 18, cals: 330,
    blurb: "Savory, low-carb, and ready before your coffee cools.",
    ingredients: ["3 whole eggs", "4 egg whites", "2 cups fresh spinach", "1 oz feta cheese", "1 tsp olive oil", "Salt and pepper"],
    steps: ["Heat olive oil in a nonstick pan over medium.", "Add spinach and cook until wilted, about 1 minute.", "Whisk eggs and whites, pour in, and stir gently.", "When almost set, fold in feta, season, and serve."],
  },
  {
    id: "protein-oats", name: "Peanut Butter Protein Oats", cat: "Breakfast", time: 5,
    p: 38, c: 56, f: 14, cals: 510,
    blurb: "Make it the night before and grab it on the way out.",
    ingredients: ["1/2 cup rolled oats", "1 scoop whey", "1 cup milk", "1 tbsp peanut butter", "1/2 banana, sliced", "Cinnamon to taste"],
    steps: ["Combine oats, whey, and milk in a jar and stir.", "Swirl in peanut butter and add banana and cinnamon.", "Refrigerate overnight, or microwave 90 seconds to eat hot."],
  },
  {
    id: "chicken-rice", name: "Grilled Chicken Rice Bowl", cat: "Lunch", time: 25,
    p: 52, c: 58, f: 12, cals: 560,
    blurb: "The classic muscle-building meal prep staple.",
    ingredients: ["8 oz chicken breast", "1 cup cooked rice", "1.5 cups broccoli", "1 tbsp olive oil", "1 tbsp soy sauce", "Juice of half a lemon"],
    steps: ["Season chicken and grill or pan-sear 6 to 7 minutes per side.", "Steam or microwave the broccoli until tender.", "Slice chicken and plate over rice with broccoli.", "Drizzle olive oil, soy sauce, and lemon over the top."],
  },
  {
    id: "turkey-taco", name: "Turkey Taco Bowl", cat: "Lunch", time: 20,
    p: 44, c: 42, f: 16, cals: 500,
    blurb: "All the taco flavor, built into a high-protein bowl.",
    ingredients: ["6 oz lean ground turkey (93%)", "1/2 cup black beans", "1/2 cup cooked rice", "1/4 cup salsa", "1 oz shredded cheese", "Taco seasoning"],
    steps: ["Brown the turkey with taco seasoning over medium heat.", "Warm the black beans and rice.", "Layer rice, beans, and turkey in a bowl.", "Top with salsa and cheese."],
  },
  {
    id: "tuna-bean", name: "Tuna White Bean Salad", cat: "Lunch", time: 10,
    p: 40, c: 28, f: 15, cals: 410,
    blurb: "No cooking, all protein. Great desk lunch.",
    ingredients: ["2 cans tuna in water, drained", "1 cup cannellini beans", "2 cups arugula", "1 tbsp olive oil", "Juice of half a lemon", "Salt and pepper"],
    steps: ["Flake the tuna into a bowl.", "Add beans and arugula.", "Dress with olive oil, lemon, salt, and pepper and toss."],
  },
  {
    id: "salmon-sweet", name: "Salmon, Sweet Potato & Asparagus", cat: "Dinner", time: 30,
    p: 40, c: 34, f: 22, cals: 520,
    blurb: "A complete sheet-pan dinner with healthy fats.",
    ingredients: ["6 oz salmon fillet", "1 medium sweet potato, cubed", "1 bunch asparagus", "1 tbsp olive oil", "Garlic powder, salt, pepper"],
    steps: ["Heat oven to 425F.", "Toss sweet potato in half the oil and roast 15 minutes.", "Add salmon and asparagus, drizzle remaining oil, season.", "Roast 12 to 15 more minutes until salmon flakes."],
  },
  {
    id: "beef-stir", name: "Lean Beef Stir-Fry", cat: "Dinner", time: 25,
    p: 46, c: 46, f: 17, cals: 550,
    blurb: "Fast, savory, and loaded with protein and veggies.",
    ingredients: ["6 oz sirloin, thinly sliced", "2 cups mixed stir-fry vegetables", "1 cup cooked rice", "2 tbsp soy sauce", "1 tsp sesame oil", "1 clove garlic, minced", "1 tsp grated ginger"],
    steps: ["Sear sliced sirloin in a hot pan 2 minutes, then set aside.", "Stir-fry vegetables with garlic and ginger until crisp-tender.", "Return beef, add soy sauce and sesame oil, toss 1 minute.", "Serve over rice."],
  },
  {
    id: "chicken-fajita", name: "Chicken Fajita Skillet", cat: "Dinner", time: 25,
    p: 48, c: 28, f: 14, cals: 430,
    blurb: "One pan, big flavor, low effort cleanup.",
    ingredients: ["8 oz chicken breast, sliced", "1 bell pepper, sliced", "1/2 onion, sliced", "1 tbsp olive oil", "Fajita seasoning", "Lime wedge"],
    steps: ["Heat oil in a skillet over medium-high.", "Cook chicken with fajita seasoning 5 to 6 minutes.", "Add peppers and onion, cook until softened.", "Finish with a squeeze of lime."],
  },
  {
    id: "baked-cod", name: "Baked Cod with Quinoa", cat: "Dinner", time: 30,
    p: 42, c: 40, f: 9, cals: 400,
    blurb: "Light, lean, and high in protein per calorie.",
    ingredients: ["7 oz cod fillet", "3/4 cup cooked quinoa", "1 zucchini, sliced", "1 tsp olive oil", "Lemon, garlic, salt, pepper"],
    steps: ["Heat oven to 400F.", "Place cod and zucchini on a lined tray, drizzle oil.", "Season with garlic, salt, pepper, and lemon.", "Bake 15 to 18 minutes and serve over quinoa."],
  },
  {
    id: "pb-shake", name: "Banana PB Protein Shake", cat: "Snack", time: 3,
    p: 36, c: 32, f: 10, cals: 360,
    blurb: "Blend-and-go shake for post-workout or busy days.",
    ingredients: ["1 scoop whey", "1 banana", "1 tbsp peanut butter", "1 cup milk", "Handful of ice"],
    steps: ["Add everything to a blender.", "Blend until smooth and drink."],
  },
  {
    id: "cottage-pineapple", name: "Cottage Cheese & Pineapple", cat: "Snack", time: 2,
    p: 28, c: 22, f: 6, cals: 260,
    blurb: "A two-minute casein-rich snack.",
    ingredients: ["1 cup low-fat cottage cheese", "1/2 cup pineapple chunks", "1 tbsp sliced almonds"],
    steps: ["Spoon cottage cheese into a bowl.", "Top with pineapple and almonds."],
  },
  {
    id: "egg-hummus", name: "Eggs & Hummus Plate", cat: "Snack", time: 12,
    p: 22, c: 18, f: 18, cals: 320,
    blurb: "A balanced grazing plate that keeps you full.",
    ingredients: ["3 hard-boiled eggs", "1/4 cup hummus", "1 cup carrot and cucumber sticks", "Pinch of paprika"],
    steps: ["Halve the eggs and arrange on a plate.", "Add hummus and veggie sticks.", "Dust with paprika."],
  },
  {
    id: "casein-pudding", name: "Chocolate PB Casein Pudding", cat: "Snack", time: 5,
    p: 32, c: 14, f: 7, cals: 250,
    blurb: "Slow-digesting protein for before bed.",
    ingredients: ["1 scoop chocolate casein", "1/2 cup milk", "1 tsp cocoa powder", "1 tsp peanut butter"],
    steps: ["Whisk casein, cocoa, and milk, adding milk slowly.", "Stir until it thickens into a pudding.", "Swirl in peanut butter and chill 5 minutes."],
  },
];

const GROUPS = ["Chest", "Back", "Shoulders", "Quads", "Hamstrings", "Glutes", "Biceps", "Triceps", "Calves", "Abs", "Traps"];

// ─── Helpers ───
// Local date as YYYY-MM-DD. Never use toISOString (UTC) for the day key.
function today() {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
function shiftDay(dateStr, delta) {
  const parts = dateStr.split("-");
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  d.setDate(d.getDate() + delta);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
// Custom exercises live in iron_profiles.settings and are merged in at runtime.
let CUSTOM_EXERCISES = [];
function registerCustomExercises(list) { CUSTOM_EXERCISES = Array.isArray(list) ? list : []; }
function allExercises() { return EXERCISES.concat(CUSTOM_EXERCISES); }
function areaForGroup(g) { return ["Quads", "Hamstrings", "Glutes", "Calves"].includes(g) ? "lower" : "upper"; }
function findEx(id) { return allExercises().find((e) => e.id === id); }

function e1rm(weight, reps) {
  const w = Number(weight) || 0;
  const r = Number(reps) || 0;
  if (w <= 0 || r <= 0) return 0;
  return Math.round(w * (1 + r / 30));
}

// Working sets only (warmups excluded from logic)
function workSets(sets) {
  return (sets || []).filter((s) => !s.warmup);
}

// Most recent session for an exercise across all workouts (newest first scan)
function getLast(workouts, exId) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const exList = workouts[i].exercises || [];
    for (let j = 0; j < exList.length; j++) {
      if (exList[j].exerciseId === exId) return { date: workouts[i].date, sets: exList[j].sets };
    }
  }
  return null;
}

// Up to `limit` most recent sessions for an exercise, newest first
function getRecentSessions(workouts, exId, limit) {
  const out = [];
  for (let i = workouts.length - 1; i >= 0 && out.length < limit; i--) {
    const exList = workouts[i].exercises || [];
    for (let j = 0; j < exList.length; j++) {
      if (exList[j].exerciseId === exId) { out.push({ date: workouts[i].date, sets: exList[j].sets }); break; }
    }
  }
  return out;
}

// Plate breakdown per side (assumes a standard 45lb bar)
function platesPerSide(weight) {
  let perSide = (Number(weight) || 0) - BAR_WEIGHT;
  perSide = perSide / 2;
  if (perSide <= 0) return [];
  const out = [];
  for (const p of PLATES) {
    while (perSide >= p - 0.001) { out.push(p); perSide = Math.round((perSide - p) * 100) / 100; }
  }
  return out;
}

// Progressive-overload recommendation based on the LAST session.
// Fixed: blank RIR is treated as unknown (null), a real 0 is respected.
function getRec(workouts, exId) {
  const last = getLast(workouts, exId);
  if (!last) return null;
  const ws = workSets(last.sets);
  if (!ws.length) return null;

  let totalReps = 0;
  let ririSum = 0;
  let ririCount = 0;
  let topWeight = 0;
  for (const s of ws) {
    totalReps += Number(s.reps) || 0;
    if (s.rir !== null && s.rir !== undefined && s.rir !== "") { ririSum += Number(s.rir); ririCount += 1; }
    if ((Number(s.weight) || 0) > topWeight) topWeight = Number(s.weight) || 0;
  }
  const avgReps = totalReps / ws.length;
  const avgRir = ririCount > 0 ? ririSum / ririCount : null; // null = not recorded
  const ex = findEx(exId);
  const inc = ex && ex.area === "lower" ? 10 : 5;

  // Plateau check: top-set e1RM not improving across the last 3 sessions
  const recent = getRecentSessions(workouts, exId, 3);
  let stalled = false;
  if (recent.length >= 3) {
    const tops = recent.map((sess) => {
      let best = 0;
      for (const s of workSets(sess.sets)) best = Math.max(best, e1rm(s.weight, s.reps));
      return best;
    });
    // recent[0] is newest. Stalled if newest is not above the oldest of the three.
    if (tops[0] > 0 && tops[2] > 0 && tops[0] <= tops[2]) stalled = true;
  }

  let rec;
  if (avgReps >= 12 && (avgRir === null || avgRir <= 1)) {
    rec = { w: topWeight + inc, r: 8, msg: "Move up to " + (topWeight + inc) + " lbs", color: "#22c55e" };
  } else if (avgReps >= 12) {
    rec = { w: topWeight, r: 12, msg: "Hit 12. Push closer to failure", color: "#1a73e8" };
  } else if (avgReps < 8) {
    rec = { w: topWeight, r: 8, msg: "Hold weight, build to 8 reps", color: "#f59e0b" };
  } else {
    rec = { w: topWeight, r: Math.min(Math.round(avgReps) + 1, 12), msg: "Add a rep this session", color: "#1a73e8" };
  }
  rec.stalled = stalled;
  return rec;
}

// ─── AUTH GATE ───
export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) setSession(data.session); });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => setSession(s));
    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  if (session === undefined) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7fa" }}>
        <style>{"@keyframes spin{to{transform:rotate(360deg)}}body{margin:0;background:#f5f7fa}"}</style>
        <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
      </div>
    );
  }
  if (!session) return <AuthScreen />;
  return <Main userId={session.user.id} onSignOut={() => supabase.auth.signOut()} />;
}

// ─── AUTH SCREEN (username + password) ───
// Supabase auth keys on email, so each username maps to an internal synthetic
// address. The user never sees it and no email is ever sent.
const USERNAME_DOMAIN = "callbirdai.com";
function cleanUsername(u) { return (u || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, ""); }
function emailForUsername(u) { return cleanUsername(u) + "@" + USERNAME_DOMAIN; }

function AuthScreen() {
  const [mode, setMode] = useState("signin");
  const [username, setUsername] = useState("");
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  async function submit() {
    setMsg(null);
    const u = cleanUsername(username);
    if (!u || !pw) { setMsg({ type: "err", text: "Enter a username and password" }); return; }
    if (u.length < 3) { setMsg({ type: "err", text: "Username must be at least 3 characters" }); return; }
    if (mode === "signup" && pw.length < 6) { setMsg({ type: "err", text: "Password must be at least 6 characters" }); return; }
    const email = emailForUsername(u);
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password: pw, options: { data: { username: u } } });
        if (error) throw error;
        if (!data.session) {
          // Only happens if email confirmation is still enabled on the project.
          setMsg({ type: "err", text: "Signups are blocked by an email-confirmation setting. Turn off Confirm Email in Supabase Auth settings." });
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
      }
    } catch (err) {
      const raw = (err && err.message) || "";
      let text = raw;
      if (/already registered/i.test(raw)) text = "That username is taken";
      else if (/invalid login credentials/i.test(raw)) text = "Wrong username or password";
      setMsg({ type: "err", text: text || "Something went wrong" });
    }
    setBusy(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f5f7fa", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a2332" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#f5f7fa}input{font-family:inherit;font-size:16px!important}button{font-family:inherit;-webkit-appearance:none;cursor:pointer}"}</style>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, textAlign: "center", marginBottom: 4 }}>Forward<span style={{ color: "#1a73e8" }}>Fitness</span></h1>
        <p style={{ textAlign: "center", color: "#9ca3af", fontSize: 14, marginBottom: 28 }}>{mode === "signup" ? "Create your account" : "Sign in to your training log"}</p>

        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: 20 }}>
          <div style={labelStyle}>Username</div>
          <input style={fieldStyle} type="text" autoCapitalize="none" autoCorrect="off" autoComplete="username" value={username} onChange={(ev) => setUsername(ev.target.value)} placeholder="yourname" />
          <div style={Object.assign({}, labelStyle, { marginTop: 14 })}>Password</div>
          <input style={fieldStyle} type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={pw} onChange={(ev) => setPw(ev.target.value)} placeholder="At least 6 characters" onKeyDown={(ev) => { if (ev.key === "Enter") submit(); }} />

          {msg && <div style={{ marginTop: 14, fontSize: 13, fontWeight: 600, color: msg.type === "err" ? "#dc2626" : "#16a34a" }}>{msg.text}</div>}

          <button onClick={submit} disabled={busy} style={{ width: "100%", background: busy ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 18, opacity: busy ? 0.8 : 1 }}>
            {busy ? "..." : mode === "signup" ? "Create Account" : "Sign In"}
          </button>
        </div>

        <button onClick={() => { setMode(mode === "signup" ? "signin" : "signup"); setMsg(null); }} style={{ width: "100%", background: "none", border: "none", color: "#1a73e8", fontSize: 14, fontWeight: 600, marginTop: 18, padding: 8 }}>
          {mode === "signup" ? "Already have an account? Sign in" : "Need an account? Sign up"}
        </button>
      </div>
    </div>
  );
}

// ─── App ───
function Main(props) {
  const USER_ID = props.userId;
  const onSignOut = props.onSignOut;
  const [tab, setTab] = useState("workout");
  const [loading, setLoading] = useState(true);
  const [workouts, setWorkouts] = useState([]);
  const [meals, setMeals] = useState({});
  const [profile, setProfile] = useState({ weight: DEFAULT_WEIGHT, proteinTarget: null, calorieTarget: null, restSeconds: 120, customExercises: [], customRecipes: [], activeSplits: [] });
  const [toast, setToast] = useState(null);
  const [dbOk, setDbOk] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [rest, setRest] = useState({ running: false, secondsLeft: 0, total: 0 });

  const mealsRef = useRef(meals);
  useEffect(() => { mealsRef.current = meals; }, [meals]);

  function flash(msg, type) {
    setToast({ msg, type: type || "ok" });
    setTimeout(() => setToast(null), 2500);
  }

  // Rest timer ticking
  useEffect(() => {
    if (!rest.running) return;
    const id = setInterval(() => {
      setRest((r) => {
        if (!r.running) return r;
        if (r.secondsLeft <= 1) {
          if (navigator.vibrate) navigator.vibrate([200, 80, 200]);
          return { running: false, secondsLeft: 0, total: r.total };
        }
        return { running: true, secondsLeft: r.secondsLeft - 1, total: r.total };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [rest.running]);

  function startRest(seconds) { setRest({ running: true, secondsLeft: seconds, total: seconds }); }
  function adjustRest(delta) {
    setRest((r) => {
      if (!r.running) return r;
      const next = Math.max(0, r.secondsLeft + delta);
      return { running: next > 0, secondsLeft: next, total: Math.max(r.total, next) };
    });
  }
  function skipRest() { setRest({ running: false, secondsLeft: 0, total: 0 }); }

  // Load everything on mount
  useEffect(() => {
    (async () => {
      try {
        const r1 = await supabase.from("iron_workouts").select("*").eq("user_id", USER_ID).order("date", { ascending: false }).limit(200);
        const r2 = await supabase.from("iron_meals").select("*").eq("user_id", USER_ID).order("date", { ascending: false }).limit(60);
        if (r1.error) throw r1.error;
        if (r2.error) throw r2.error;
        const w = (r1.data || []).map((r) => ({ id: r.id, date: r.date, exercises: r.exercises }));
        w.reverse();
        setWorkouts(w);
        const mObj = {};
        (r2.data || []).forEach((r) => { mObj[r.date] = r.entries || []; });
        setMeals(mObj);
        // profile is optional; failure here should not break the app
        try {
          const r3 = await supabase.from("iron_profiles").select("*").eq("user_id", USER_ID).limit(1);
          if (!r3.error && r3.data && r3.data[0]) {
            const row = r3.data[0];
            const s = row.settings || {};
            const customExercises = Array.isArray(s.customExercises) ? s.customExercises : [];
            const customRecipes = Array.isArray(s.customRecipes) ? s.customRecipes : [];
            const activeSplits = Array.isArray(s.activeSplits) ? s.activeSplits : [];
            registerCustomExercises(customExercises);
            setProfile({
              id: row.id,
              weight: Number(s.weight) || Number(row.weight) || DEFAULT_WEIGHT,
              proteinTarget: s.proteinTarget != null ? Number(s.proteinTarget) : null,
              calorieTarget: s.calorieTarget != null ? Number(s.calorieTarget) : null,
              restSeconds: Number(s.restSeconds) || 120,
              customExercises,
              customRecipes,
              activeSplits,
            });
          }
        } catch (e) { /* profile table/column may not exist yet; use defaults */ }
        setDbOk(true);
      } catch (e) {
        console.error("DB:", e);
        flash("Database connection failed", "err");
        setDbOk(false);
      }
      setLoading(false);
    })();
  }, [USER_ID]);

  async function saveWorkout(workout) {
    try {
      const res = await supabase.from("iron_workouts").insert({ user_id: USER_ID, date: workout.date, exercises: workout.exercises }).select().single();
      if (res.error) throw res.error;
      setWorkouts((prev) => prev.concat([{ id: res.data.id, date: res.data.date, exercises: res.data.exercises }]));
      localStorage.removeItem("ff-draft");
      flash("Workout saved!");
      return true;
    } catch (e) {
      flash("Save failed: " + e.message, "err");
      return false;
    }
  }

  async function updateWorkout(id, patch) {
    try {
      const res = await supabase.from("iron_workouts").update({ date: patch.date, exercises: patch.exercises }).eq("id", id);
      if (res.error) throw res.error;
      setWorkouts((prev) => prev.map((w) => (w.id === id ? { id, date: patch.date, exercises: patch.exercises } : w)).sort((a, b) => a.date.localeCompare(b.date)));
      flash("Workout updated");
      return true;
    } catch (e) {
      flash("Update failed: " + e.message, "err");
      return false;
    }
  }

  async function deleteWorkout(id) {
    try {
      const res = await supabase.from("iron_workouts").delete().eq("id", id);
      if (res.error) throw res.error;
      setWorkouts((prev) => prev.filter((w) => w.id !== id));
      flash("Workout deleted");
    } catch (e) { flash("Delete failed", "err"); }
  }

  // Meal mutations are computed from authoritative state to avoid lost-update races
  async function persistMeal(date, entries) {
    const res = await supabase.from("iron_meals").upsert({ user_id: USER_ID, date, entries }, { onConflict: "user_id,date" });
    if (res.error) throw res.error;
  }
  async function addMealEntry(date, entry) {
    const next = (mealsRef.current[date] || []).concat([entry]);
    setMeals((prev) => Object.assign({}, prev, { [date]: next }));
    try { await persistMeal(date, next); flash("Meal logged!"); }
    catch (e) { flash("Save failed", "err"); }
  }
  async function removeMealEntry(date, idx) {
    const next = (mealsRef.current[date] || []).filter((_, i) => i !== idx);
    setMeals((prev) => Object.assign({}, prev, { [date]: next }));
    try { await persistMeal(date, next); }
    catch (e) { flash("Save failed", "err"); }
  }

  // Single source of truth: write the whole settings object so nothing is dropped.
  async function persistProfile(next) {
    const settings = {
      weight: next.weight,
      proteinTarget: next.proteinTarget,
      calorieTarget: next.calorieTarget,
      restSeconds: next.restSeconds,
      customExercises: next.customExercises || [],
      customRecipes: next.customRecipes || [],
      activeSplits: next.activeSplits || [],
    };
    let id = profile.id;
    if (id) {
      const res = await supabase.from("iron_profiles").update({ weight: next.weight, settings }).eq("id", id);
      if (res.error) throw res.error;
    } else {
      const res = await supabase.from("iron_profiles").insert({ user_id: USER_ID, weight: next.weight, settings }).select().single();
      if (res.error) throw res.error;
      id = res.data.id;
    }
    setProfile(Object.assign({}, next, { id }));
    return true;
  }

  async function saveProfile(p) {
    const next = Object.assign({}, profile, p); // keep custom arrays intact
    try {
      await persistProfile(next);
      setShowSettings(false);
      flash("Settings saved");
    } catch (e) {
      flash("Could not save settings: " + e.message, "err");
    }
  }

  async function addCustomExercise(ex) {
    const next = Object.assign({}, profile, { customExercises: (profile.customExercises || []).concat([ex]) });
    registerCustomExercises(next.customExercises);
    try { await persistProfile(next); flash("Exercise added"); return true; }
    catch (e) { flash("Could not save exercise: " + e.message, "err"); return false; }
  }

  async function addCustomRecipe(r) {
    const next = Object.assign({}, profile, { customRecipes: (profile.customRecipes || []).concat([r]) });
    try { await persistProfile(next); flash("Recipe added"); return true; }
    catch (e) { flash("Could not save recipe: " + e.message, "err"); return false; }
  }

  // The home screen shows activeSplits, falling back to the default until the user changes it.
  const currentSplits = (profile.activeSplits && profile.activeSplits.length) ? profile.activeSplits : withSplitIds(MY_SPLIT);

  async function saveSplits(nextSplits) {
    const next = Object.assign({}, profile, { activeSplits: nextSplits });
    try { await persistProfile(next); return true; }
    catch (e) { flash("Could not save splits: " + e.message, "err"); return false; }
  }
  async function addSplit(split) {
    const ok = await saveSplits(currentSplits.concat([Object.assign({ id: newSplitId() }, split)]));
    if (ok) flash("Split added");
    return ok;
  }
  async function removeSplit(id) {
    await saveSplits(currentSplits.filter((s) => s.id !== id));
    flash("Split removed");
  }
  async function applyPlan(plan) {
    const ok = await saveSplits(withSplitIds(plan.days));
    if (ok) flash(plan.name + " loaded");
    return ok;
  }

  const proteinTarget = profile.proteinTarget != null ? profile.proteinTarget : profile.weight;
  const calorieTarget = profile.calorieTarget != null ? profile.calorieTarget : Math.round(profile.weight * 16 + 300);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7fa" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}body{margin:0;background:#f5f7fa}"}</style>
      <div style={{ width: 28, height: 28, border: "3px solid #e5e7eb", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: rest.running ? 150 : 90, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a2332" }}>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}body{margin:0;background:#f5f7fa;font-family:Inter,-apple-system,sans-serif}input,textarea{font-family:inherit;font-size:16px!important}input[type=number]{-moz-appearance:textfield}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}button{font-family:inherit;-webkit-appearance:none;cursor:pointer}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}"}</style>

      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.type === "err" ? "#fef2f2" : "#f0fdf4", color: toast.type === "err" ? "#dc2626" : "#16a34a", border: "1px solid " + (toast.type === "err" ? "#fecaca" : "#bbf7d0"), borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, animation: "fadeIn .2s ease", boxShadow: "0 4px 12px rgba(0,0,0,.1)", maxWidth: "90%", textAlign: "center" }}>{toast.msg}</div>}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderBottom: "1px solid #edf0f3" }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Forward<span style={{ color: "#1a73e8" }}>Fitness</span></h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!dbOk && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Offline</span>}
          <button onClick={() => setShowSettings(true)} aria-label="Settings" style={{ background: "none", border: "none", padding: 4, color: "#9ca3af", display: "flex" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      <div style={{ padding: "16px 20px" }}>
        {tab === "workout" && <WorkoutTab workouts={workouts} onSave={saveWorkout} onUpdate={updateWorkout} onDelete={deleteWorkout} flash={flash} startRest={startRest} restSeconds={profile.restSeconds} onCreateExercise={addCustomExercise} splits={currentSplits} onAddSplit={addSplit} onRemoveSplit={removeSplit} onApplyPlan={applyPlan} />}
        {tab === "nutrition" && <FoodTab meals={meals} onAdd={addMealEntry} onRemove={removeMealEntry} pt={proteinTarget} ct={calorieTarget} customRecipes={profile.customRecipes || []} onAddRecipe={addCustomRecipe} />}
        {tab === "progress" && <ProgressTab workouts={workouts} />}
        {tab === "learn" && <LearnTab />}
      </div>

      {rest.running && <RestBar rest={rest} onAdjust={adjustRest} onSkip={skipRest} />}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, display: "flex", background: "#fff", borderTop: "1px solid #edf0f3", padding: "6px 0 max(8px,env(safe-area-inset-bottom))", zIndex: 100 }}>
        {[
          { id: "workout", label: "Train", d: "M3 12h4l3-9 4 18 3-9h4" },
          { id: "nutrition", label: "Food", d: "M3 2v7c0 1.1.9 2 2 2h0a2 2 0 0 0 2-2V2 M7 2v20 M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" },
          { id: "progress", label: "Progress", d: "M3 20h18M5 16l4-4 4 4 6-8" },
          { id: "learn", label: "Learn", d: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: "8px 0", color: tab === t.id ? "#1a73e8" : "#9ca3af" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {showSettings && <SettingsSheet profile={profile} derivedP={proteinTarget} derivedC={calorieTarget} onSave={saveProfile} onClose={() => setShowSettings(false)} onSignOut={onSignOut} />}
    </div>
  );
}

// ─── REST TIMER BAR ───
function RestBar(props) {
  const r = props.rest;
  const mm = String(Math.floor(r.secondsLeft / 60));
  const ss = String(r.secondsLeft % 60).padStart(2, "0");
  const pct = r.total > 0 ? (r.secondsLeft / r.total) * 100 : 0;
  return (
    <div style={{ position: "fixed", bottom: "calc(58px + env(safe-area-inset-bottom))", left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, zIndex: 120, padding: "0 12px" }}>
      <div style={{ background: "#1a2332", borderRadius: 14, padding: "12px 14px", boxShadow: "0 6px 20px rgba(0,0,0,.25)", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ color: "#9ca3af", fontSize: 11, fontWeight: 600, letterSpacing: ".04em" }}>REST</span>
            <span style={{ color: "#fff", fontSize: 22, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{mm}:{ss}</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,255,255,.15)", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: pct + "%", background: "#1a73e8", borderRadius: 4, transition: "width 1s linear" }} />
          </div>
        </div>
        <button onClick={() => props.onAdjust(-15)} style={restBtn}>-15</button>
        <button onClick={() => props.onAdjust(15)} style={restBtn}>+15</button>
        <button onClick={props.onSkip} style={Object.assign({}, restBtn, { background: "#1a73e8", color: "#fff", borderColor: "#1a73e8" })}>Skip</button>
      </div>
    </div>
  );
}
const restBtn = { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#e5e7eb", borderRadius: 10, padding: "10px 10px", fontSize: 13, fontWeight: 700, minWidth: 44, minHeight: 44 };

// ─── WORKOUT TAB ───
function WorkoutTab(props) {
  const { workouts, onSave, onUpdate, onDelete, flash, startRest, restSeconds, onCreateExercise, splits, onAddSplit, onRemoveSplit, onApplyPlan } = props;

  const [workout, setWorkout] = useState(() => {
    try { const d = localStorage.getItem("ff-draft"); return d ? JSON.parse(d) : { date: today(), exercises: [] }; }
    catch (e) { return { date: today(), exercises: [] }; }
  });
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plates, setPlates] = useState(null); // weight number for plate modal
  const [editing, setEditing] = useState(null); // workout object being edited
  const [building, setBuilding] = useState(false); // split builder open
  const [planLib, setPlanLib] = useState(false); // plan library open
  const [manage, setManage] = useState(false); // manage (remove) splits mode

  useEffect(() => {
    if (workout.exercises.length > 0) localStorage.setItem("ff-draft", JSON.stringify(workout));
  }, [workout]);

  function prefillSets(exId) {
    const last = getLast(workouts, exId);
    if (last && last.sets && last.sets.length > 0) {
      return last.sets.map((s) => ({ weight: String(s.weight || ""), reps: String(s.reps || ""), rir: "", warmup: !!s.warmup, done: false }));
    }
    return [{ weight: "", reps: "", rir: "", warmup: false, done: false }];
  }

  function loadSplit(split) {
    const list = (split.exercises || []).map((exId) => ({ exerciseId: exId, sets: prefillSets(exId) }));
    setWorkout({ date: today(), exercises: list });
  }

  function addExercise(exId) {
    setWorkout((w) => ({ date: w.date, exercises: w.exercises.concat([{ exerciseId: exId, sets: prefillSets(exId) }]) }));
    setPicker(false);
  }

  function mutateExercise(exIdx, fn) {
    setWorkout((w) => ({
      date: w.date,
      exercises: w.exercises.map((ex, ei) => (ei === exIdx ? fn(ex) : ex)),
    }));
  }

  function updateSet(exIdx, setIdx, field, val) {
    mutateExercise(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, si) => (si === setIdx ? Object.assign({}, s, { [field]: val }) : s)) }));
  }
  function toggleWarmup(exIdx, setIdx) {
    mutateExercise(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, si) => (si === setIdx ? Object.assign({}, s, { warmup: !s.warmup }) : s)) }));
  }
  function toggleDone(exIdx, setIdx) {
    let becameDone = false;
    setWorkout((w) => ({
      date: w.date,
      exercises: w.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        return { exerciseId: ex.exerciseId, sets: ex.sets.map((s, si) => {
          if (si !== setIdx) return s;
          becameDone = !s.done;
          return Object.assign({}, s, { done: !s.done });
        }) };
      }),
    }));
    if (becameDone && restSeconds > 0) startRest(restSeconds);
  }
  function addSet(exIdx) {
    mutateExercise(exIdx, (ex) => {
      const lastSet = ex.sets[ex.sets.length - 1] || { weight: "", reps: "", warmup: false };
      return { exerciseId: ex.exerciseId, sets: ex.sets.concat([{ weight: lastSet.weight, reps: lastSet.reps, rir: "", warmup: false, done: false }]) };
    });
  }
  function removeSet(exIdx, setIdx) {
    setWorkout((w) => ({
      date: w.date,
      exercises: w.exercises.map((ex, ei) => (ei === exIdx ? { exerciseId: ex.exerciseId, sets: ex.sets.filter((_, si) => si !== setIdx) } : ex)).filter((ex) => ex.sets.length > 0),
    }));
  }
  function removeExercise(exIdx) {
    setWorkout((w) => {
      const exercises = w.exercises.filter((_, i) => i !== exIdx);
      if (exercises.length === 0) localStorage.removeItem("ff-draft");
      return { date: w.date, exercises };
    });
  }
  function applyRec(exIdx, rec) {
    mutateExercise(exIdx, (ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => (s.warmup ? s : Object.assign({}, s, { weight: String(rec.w), reps: String(rec.r) }))),
    }));
  }

  function cleanExercises(exercises) {
    return exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({
        weight: Number(s.weight) || 0,
        reps: Number(s.reps) || 0,
        rir: s.rir === "" || s.rir === null || s.rir === undefined ? null : Number(s.rir),
        warmup: !!s.warmup,
      })),
    }));
  }
  function hasRealData(exercises) {
    for (const ex of exercises) for (const s of ex.sets) if ((Number(s.reps) || 0) > 0) return true;
    return false;
  }

  async function finishWorkout() {
    if (saving) return;
    if (workout.exercises.length === 0) return;
    if (!hasRealData(workout.exercises)) { flash("Log some reps first", "err"); return; }
    setSaving(true);
    const cleaned = { date: workout.date, exercises: cleanExercises(workout.exercises) };
    const ok = await onSave(cleaned);
    setSaving(false);
    if (ok) setWorkout({ date: today(), exercises: [] });
  }

  const inWorkoutIds = workout.exercises.map((e) => e.exerciseId);

  return (
    <div>
      {workout.exercises.length === 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={Object.assign({}, labelStyle, { marginBottom: 0 })}>Start a Workout</div>
            {splits.length > 0 && (
              <button onClick={() => setManage(!manage)} style={{ background: "none", border: "none", color: manage ? "#dc2626" : "#1a73e8", fontSize: 13, fontWeight: 600, padding: 4 }}>{manage ? "Done" : "Manage"}</button>
            )}
          </div>

          {splits.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14, padding: "8px 0 12px" }}>No splits yet. Create one or pick a plan below.</p>}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {splits.map((s) => (
              <div key={s.id || s.name} style={{ position: "relative" }}>
                <button onClick={() => { if (!manage) loadSplit(s); }} style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "16px 10px", fontSize: 13, fontWeight: 600, color: "#374151", minHeight: 64, textAlign: "left", opacity: manage ? 0.7 : 1 }}>
                  <div>{s.name}</div>
                  <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 4 }}>{(s.exercises || []).length} exercises</div>
                </button>
                {manage && onRemoveSplit && s.id && (
                  <button onClick={() => onRemoveSplit(s.id)} aria-label="remove split" style={{ position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: "50%", background: "#dc2626", color: "#fff", border: "2px solid #fff", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>✕</button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button onClick={() => setBuilding(true)} style={{ flex: 1, background: "#f0f5ff", border: "1px dashed #1a73e8", borderRadius: 12, padding: "12px", color: "#1a73e8", fontSize: 13, fontWeight: 700, minHeight: 48 }}>+ New Split</button>
            <button onClick={() => setPlanLib(true)} style={{ flex: 1, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "12px", color: "#374151", fontSize: 13, fontWeight: 700, minHeight: 48 }}>Browse Plans</button>
          </div>

          <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 12, lineHeight: 1.5 }}>Your last numbers load automatically. Beat them, check off each set, and save.</p>
        </div>
      )}

      {workout.exercises.map((ex, exIdx) => (
        <ExerciseCard
          key={exIdx}
          exercise={ex}
          dbEx={findEx(ex.exerciseId)}
          last={getLast(workouts, ex.exerciseId)}
          rec={getRec(workouts, ex.exerciseId)}
          live
          onUpdateSet={(si, f, v) => updateSet(exIdx, si, f, v)}
          onToggleDone={(si) => toggleDone(exIdx, si)}
          onToggleWarmup={(si) => toggleWarmup(exIdx, si)}
          onAddSet={() => addSet(exIdx)}
          onRemoveSet={(si) => removeSet(exIdx, si)}
          onRemove={() => removeExercise(exIdx)}
          onApplyRec={(rec) => applyRec(exIdx, rec)}
          onPlates={(wt) => setPlates(wt)}
        />
      ))}

      {workout.exercises.length > 0 && (
        <button onClick={() => setPicker(true)} style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "16px", color: "#1a73e8", fontSize: 15, fontWeight: 600, marginBottom: 12, minHeight: 52 }}>+ Add Exercise</button>
      )}

      {workout.exercises.length > 0 && (
        <button onClick={finishWorkout} disabled={saving} style={{ width: "100%", background: saving ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 14, padding: "18px", fontSize: 16, fontWeight: 700, minHeight: 56, marginBottom: 24, opacity: saving ? 0.8 : 1 }}>{saving ? "Saving..." : "Save Workout"}</button>
      )}

      {workouts.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={labelStyle}>Recent Workouts</div>
          {workouts.slice().reverse().slice(0, 10).map((w, i) => (
            <button key={w.id || i} onClick={() => setEditing(w)} style={Object.assign({}, cardStyle, { padding: 14, width: "100%", textAlign: "left", display: "block" })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#6b7280" }}>{w.date}</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{(w.exercises || []).length} exercises · tap to edit</span>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {(w.exercises || []).map((e, j) => {
                  const d = findEx(e.exerciseId);
                  const ws = workSets(e.sets);
                  let best = ws[0] || { weight: 0, reps: 0 };
                  for (const s of ws) if ((Number(s.weight) || 0) > (Number(best.weight) || 0)) best = s;
                  return <span key={j} style={{ fontSize: 12, background: "#f3f4f6", padding: "4px 10px", borderRadius: 6, color: "#6b7280", fontWeight: 500 }}>{d ? d.name : "?"} {best.weight}×{best.reps}</span>;
                })}
              </div>
            </button>
          ))}
        </div>
      )}

      {picker && <Picker inWorkoutIds={inWorkoutIds} onSelect={addExercise} onCreate={onCreateExercise} onClose={() => setPicker(false)} />}
      {plates !== null && <PlateModal weight={plates} onClose={() => setPlates(null)} />}
      {editing && <EditWorkoutModal workout={editing} onSave={onUpdate} onDelete={onDelete} onCreateExercise={onCreateExercise} onClose={() => setEditing(null)} />}
      {building && <SplitBuilder onSave={onAddSplit} onCreateExercise={onCreateExercise} onClose={() => setBuilding(false)} />}
      {planLib && <PlanLibrary onApply={onApplyPlan} onClose={() => setPlanLib(false)} />}
    </div>
  );
}

// ─── EXERCISE CARD (shared by live session + edit) ───
function ExerciseCard(props) {
  const { exercise: ex, dbEx, last, rec, live, onUpdateSet, onToggleDone, onToggleWarmup, onAddSet, onRemoveSet, onRemove, onApplyRec, onPlates } = props;
  const cols = live ? "26px 1fr 1fr 44px 40px" : "26px 1fr 1fr 44px 36px";
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{dbEx ? dbEx.name : ex.exerciseId}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{dbEx ? dbEx.group : ""}</div>
        </div>
        <button onClick={onRemove} style={closeBtn}>✕</button>
      </div>

      {live && last && (
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "#6b7280" }}>
          <b style={{ color: "#9ca3af", fontWeight: 600, fontSize: 11 }}>LAST: </b>
          {workSets(last.sets).map((s, i) => <span key={i}>{i > 0 ? " → " : ""}{s.weight}×{s.reps}</span>)}
        </div>
      )}

      {live && rec && (
        <div style={{ marginBottom: 10 }}>
          <div onClick={() => onApplyRec(rec)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: rec.color + "10", borderRadius: 8, borderLeft: "3px solid " + rec.color, cursor: "pointer" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: rec.color, flex: 1 }}>{rec.msg}</span>
            <span style={{ fontWeight: 700, color: rec.color }}>{rec.w}×{rec.r}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: rec.color, border: "1px solid " + rec.color, borderRadius: 6, padding: "3px 8px" }}>Apply</span>
          </div>
          {rec.stalled && <div style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600, marginTop: 6, paddingLeft: 4 }}>Stalled 3 sessions. Consider a deload week at 60%.</div>}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, marginBottom: 6 }}>
        <span style={colStyle}>Set</span>
        <span style={colStyle}>Lbs</span>
        <span style={colStyle}>Reps</span>
        <span style={colStyle}>RIR</span>
        <span></span>
      </div>

      {ex.sets.map((s, si) => (
        <div key={si} style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center", marginBottom: 6 }}>
          <button onClick={() => onToggleWarmup(si)} title="Tap to toggle warm-up" style={{ background: s.warmup ? "#fef3c7" : "none", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, color: s.warmup ? "#d97706" : "#9ca3af", padding: 0, minHeight: 40 }}>{s.warmup ? "W" : si + 1}</button>
          <div style={{ position: "relative" }}>
            <input type="number" inputMode="decimal" value={s.weight} onChange={(e) => onUpdateSet(si, "weight", e.target.value)} style={Object.assign({}, inputStyle, s.done ? doneInput : null)} placeholder="lbs" />
            {live && Number(s.weight) > BAR_WEIGHT && <button onClick={() => onPlates(Number(s.weight))} aria-label="plates" style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#c7ccd4", fontSize: 11, padding: 4 }}>▦</button>}
          </div>
          <input type="number" inputMode="numeric" value={s.reps} onChange={(e) => onUpdateSet(si, "reps", e.target.value)} style={Object.assign({}, inputStyle, s.done ? doneInput : null)} placeholder="reps" />
          <input type="number" inputMode="numeric" value={s.rir} onChange={(e) => onUpdateSet(si, "rir", e.target.value)} style={Object.assign({}, inputStyle, { color: "#9ca3af" }, s.done ? doneInput : null)} placeholder="—" />
          {live ? (
            <button onClick={() => onToggleDone(si)} aria-label="complete set" style={{ background: s.done ? "#22c55e" : "#fff", border: "2px solid " + (s.done ? "#22c55e" : "#d1d5db"), borderRadius: 8, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.done ? "#fff" : "#d1d5db"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            </button>
          ) : (
            <button onClick={() => onRemoveSet(si)} style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 18, padding: 0, minHeight: 40 }}>−</button>
          )}
        </div>
      ))}

      <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
        <button onClick={onAddSet} style={{ flex: 1, background: "none", border: "1px dashed #d1d5db", borderRadius: 8, padding: "10px", color: "#9ca3af", fontSize: 13, fontWeight: 500, minHeight: 44 }}>+ Add Set</button>
        {live && ex.sets.length > 1 && <button onClick={() => onRemoveSet(ex.sets.length - 1)} style={{ background: "none", border: "1px dashed #e5e7eb", borderRadius: 8, padding: "10px 16px", color: "#c7ccd4", fontSize: 13, fontWeight: 500, minHeight: 44 }}>− Set</button>}
      </div>
    </div>
  );
}
const doneInput = { background: "#f0fdf4", borderColor: "#bbf7d0" };

// ─── PLATE MODAL ───
function PlateModal(props) {
  const plates = platesPerSide(props.weight);
  const colorOf = (p) => ({ 45: "#1a73e8", 35: "#f59e0b", 25: "#22c55e", 10: "#6b7280", 5: "#dc2626", 2.5: "#9ca3af" }[p] || "#6b7280");
  return (
    <div onClick={props.onClose} style={overlay}>
      <div onClick={(e) => e.stopPropagation()} style={sheet}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{props.weight} lbs</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 0, marginBottom: 16 }}>Per side, with a 45 lb bar</p>
        {plates.length === 0 ? (
          <p style={{ color: "#6b7280", fontSize: 14 }}>Just the bar (or below 45 lb).</p>
        ) : (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {plates.map((p, i) => (
              <span key={i} style={{ background: colorOf(p), color: "#fff", borderRadius: 10, padding: "10px 16px", fontSize: 15, fontWeight: 700 }}>{p}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EXERCISE PICKER (search + create, single or multi select) ───
function Picker(props) {
  const multi = !!props.multi;
  const selected = new Set(props.selectedIds || []);
  const [filter, setFilter] = useState("All");
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newGroup, setNewGroup] = useState(GROUPS[0]);
  const [busy, setBusy] = useState(false);
  const inSet = new Set(props.inWorkoutIds || []);

  const source = allExercises();
  let list = filter === "All" ? source : source.filter((e) => e.group === filter);
  if (q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter((e) => e.name.toLowerCase().includes(term) || e.group.toLowerCase().includes(term));
  }

  function pick(id) {
    if (multi) { if (props.onToggle) props.onToggle(id); }
    else if (props.onSelect) props.onSelect(id);
  }

  async function createExercise() {
    const name = newName.trim();
    if (!name) return;
    const ex = { id: "custom-ex-" + Date.now(), name, group: newGroup, area: areaForGroup(newGroup), custom: true };
    setBusy(true);
    let ok = true;
    if (props.onCreate) ok = await props.onCreate(ex);
    setBusy(false);
    if (ok !== false) {
      setNewName("");
      setCreating(false);
      pick(ex.id); // add or select the new exercise immediately
    }
  }

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "85vh" })}>
        <div style={Object.assign({}, sheetHead, { flexShrink: 0 })}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{creating ? "New Exercise" : multi ? "Choose Exercises" : "Add Exercise"}</h2>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {multi && !creating && <button onClick={props.onDone} style={{ background: "#1a73e8", color: "#fff", border: "none", borderRadius: 20, padding: "8px 16px", fontSize: 14, fontWeight: 700, minHeight: 40 }}>Done{selected.size ? " (" + selected.size + ")" : ""}</button>}
            <button onClick={props.onClose} style={xBtn}>✕</button>
          </div>
        </div>

        {creating ? (
          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={labelStyle}>Exercise Name</div>
            <input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Incline DB Curl" style={Object.assign({}, fieldStyle, { marginBottom: 16 })} onKeyDown={(e) => { if (e.key === "Enter") createExercise(); }} />
            <div style={labelStyle}>Muscle Group</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
              {GROUPS.map((g) => (
                <button key={g} onClick={() => setNewGroup(g)} style={{ background: newGroup === g ? "#1a73e8" : "#fff", color: newGroup === g ? "#fff" : "#374151", border: newGroup === g ? "2px solid #1a73e8" : "2px solid #e5e7eb", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 600, minHeight: 40 }}>{g}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>{areaForGroup(newGroup) === "lower" ? "Lower body: weight jumps of 10 lbs when you progress." : "Upper body: weight jumps of 5 lbs when you progress."}</p>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button onClick={() => setCreating(false)} style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 700, minHeight: 48 }}>Back</button>
              <button onClick={createExercise} disabled={busy || !newName.trim()} style={{ flex: 1, background: busy || !newName.trim() ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, minHeight: 48 }}>{busy ? "Saving..." : multi ? "Create & Select" : "Create & Add"}</button>
            </div>
          </div>
        ) : (
          <>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search exercises" style={Object.assign({}, fieldStyle, { marginBottom: 12, flexShrink: 0 })} />
            <div style={{ display: "flex", gap: 8, overflowX: "auto", overflowY: "hidden", paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f3f4f6", WebkitOverflowScrolling: "touch", flexShrink: 0 }}>
              {["All"].concat(GROUPS).map((g) => (
                <button key={g} onClick={() => setFilter(g)} style={{ background: filter === g ? "#1a73e8" : "#fff", color: filter === g ? "#fff" : "#374151", border: filter === g ? "2px solid #1a73e8" : "2px solid #e5e7eb", borderRadius: 24, padding: "10px 20px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>{g}</button>
              ))}
            </div>
            {props.onCreate && (
              <button onClick={() => setCreating(true)} style={{ width: "100%", background: "#f0f5ff", border: "1px dashed #1a73e8", borderRadius: 12, padding: "14px", color: "#1a73e8", fontSize: 14, fontWeight: 700, marginBottom: 12, minHeight: 48, flexShrink: 0 }}>+ Create New Exercise</button>
            )}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {list.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20, fontSize: 14 }}>No matches</p>}
              {list.map((e) => {
                const sel = selected.has(e.id);
                return (
                  <button key={e.id} onClick={() => pick(e.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", color: "#1a2332", padding: "16px 4px", width: "100%", textAlign: "left", minHeight: 52 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                      {multi && (
                        <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 6, border: "2px solid " + (sel ? "#1a73e8" : "#d1d5db"), background: sel ? "#1a73e8" : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          {sel && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                        </span>
                      )}
                      <span style={{ fontSize: 16, fontWeight: 500 }}>{e.name}{e.custom && <span style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600, marginLeft: 8 }}>custom</span>}{!multi && inSet.has(e.id) && <span style={{ fontSize: 11, color: "#1a73e8", fontWeight: 600, marginLeft: 8 }}>added</span>}</span>
                    </span>
                    <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, flexShrink: 0 }}>{e.group}</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── SPLIT BUILDER (create a custom split) ───
function SplitBuilder(props) {
  const [name, setName] = useState("");
  const [ids, setIds] = useState([]);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  function toggle(id) { setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : prev.concat([id]))); }
  function remove(id) { setIds((prev) => prev.filter((x) => x !== id)); }
  function move(idx, dir) {
    setIds((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      const t = next[idx]; next[idx] = next[j]; next[j] = t;
      return next;
    });
  }

  async function save() {
    setErr("");
    if (!name.trim()) { setErr("Name your split"); return; }
    if (ids.length === 0) { setErr("Add at least one exercise"); return; }
    setBusy(true);
    let ok = true;
    if (props.onSave) ok = await props.onSave({ name: name.trim(), exercises: ids });
    setBusy(false);
    if (ok !== false) props.onClose();
  }

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={Object.assign({}, sheetHead, { flexShrink: 0 })}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Split</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={labelStyle}>Split Name</div>
          <input style={Object.assign({}, fieldStyle, { marginBottom: 16 })} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Push Day" />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={Object.assign({}, labelStyle, { marginBottom: 0 })}>Exercises ({ids.length})</div>
            <button onClick={() => setPicking(true)} style={{ background: "#1a73e8", color: "#fff", border: "none", borderRadius: 10, padding: "8px 16px", fontSize: 14, fontWeight: 600 }}>+ Add</button>
          </div>

          {ids.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14, padding: "8px 0 16px" }}>No exercises yet. Tap Add to choose some.</p>}
          {ids.map((id, i) => {
            const ex = findEx(id);
            return (
              <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #f3f4f6" }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "#9ca3af", width: 20, textAlign: "center" }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: 15, fontWeight: 500, minWidth: 0 }}>{ex ? ex.name : id}</span>
                <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="up" style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, color: i === 0 ? "#d1d5db" : "#6b7280" }}>↑</button>
                <button onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label="down" style={{ background: "#f3f4f6", border: "none", borderRadius: 8, width: 34, height: 34, fontSize: 16, color: i === ids.length - 1 ? "#d1d5db" : "#6b7280" }}>↓</button>
                <button onClick={() => remove(id)} aria-label="remove" style={{ background: "none", border: "none", color: "#d1d5db", fontSize: 18, width: 30 }}>✕</button>
              </div>
            );
          })}
          {err && <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", marginTop: 12 }}>{err}</div>}
        </div>
        <button onClick={save} disabled={busy} style={{ width: "100%", background: busy ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>{busy ? "Saving..." : "Save Split"}</button>
      </div>
      {picking && <Picker multi selectedIds={ids} onToggle={toggle} onCreate={props.onCreateExercise} onDone={() => setPicking(false)} onClose={() => setPicking(false)} />}
    </div>
  );
}

// ─── PLAN LIBRARY (preset programs) ───
function PlanLibrary(props) {
  const [busyId, setBusyId] = useState(null);
  async function apply(plan) {
    if (!confirm('Replace your home screen splits with "' + plan.name + '"? You can still add or remove splits after.')) return;
    setBusyId(plan.id);
    let ok = true;
    if (props.onApply) ok = await props.onApply(plan);
    setBusyId(null);
    if (ok !== false) props.onClose();
  }
  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={Object.assign({}, sheetHead, { flexShrink: 0 })}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Workout Plans</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 0, marginBottom: 16, flexShrink: 0 }}>Pick a program. Its sessions load onto your home screen.</p>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {PLANS.map((plan) => (
            <div key={plan.id} style={Object.assign({}, cardStyle, { marginBottom: 12 })}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{plan.name}</div>
              <div style={{ fontSize: 12, color: "#1a73e8", fontWeight: 600, marginTop: 2 }}>{plan.days_per_week} · {plan.days.length} sessions</div>
              <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, marginBottom: 10, lineHeight: 1.45 }}>{plan.desc}</p>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {plan.days.map((d, i) => (
                  <span key={i} style={{ fontSize: 12, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: 8, padding: "5px 10px" }}>{d.name}</span>
                ))}
              </div>
              <button onClick={() => apply(plan)} disabled={busyId === plan.id} style={{ width: "100%", background: busyId === plan.id ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14, fontWeight: 700, minHeight: 48 }}>{busyId === plan.id ? "Loading..." : "Use This Plan"}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── EDIT WORKOUT MODAL ───
function EditWorkoutModal(props) {
  const w = props.workout;
  const [date, setDate] = useState(w.date);
  const [exercises, setExercises] = useState(() =>
    (w.exercises || []).map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: (ex.sets || []).map((s) => ({ weight: String(s.weight ?? ""), reps: String(s.reps ?? ""), rir: s.rir === null || s.rir === undefined ? "" : String(s.rir), warmup: !!s.warmup })),
    }))
  );
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function mutate(exIdx, fn) { setExercises((list) => list.map((ex, i) => (i === exIdx ? fn(ex) : ex))); }
  function updateSet(exIdx, si, f, v) { mutate(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, j) => (j === si ? Object.assign({}, s, { [f]: v }) : s)) })); }
  function toggleWarmup(exIdx, si) { mutate(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, j) => (j === si ? Object.assign({}, s, { warmup: !s.warmup }) : s)) })); }
  function addSet(exIdx) { mutate(exIdx, (ex) => { const l = ex.sets[ex.sets.length - 1] || { weight: "", reps: "" }; return { exerciseId: ex.exerciseId, sets: ex.sets.concat([{ weight: l.weight, reps: l.reps, rir: "", warmup: false }]) }; }); }
  function removeSet(exIdx, si) { setExercises((list) => list.map((ex, i) => (i === exIdx ? { exerciseId: ex.exerciseId, sets: ex.sets.filter((_, j) => j !== si) } : ex)).filter((ex) => ex.sets.length > 0)); }
  function removeExercise(exIdx) { setExercises((list) => list.filter((_, i) => i !== exIdx)); }
  function addExercise(exId) { setExercises((list) => list.concat([{ exerciseId: exId, sets: [{ weight: "", reps: "", rir: "", warmup: false }] }])); setPicker(false); }

  async function save() {
    if (saving) return;
    setSaving(true);
    const cleaned = exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => ({ weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, rir: s.rir === "" ? null : Number(s.rir), warmup: !!s.warmup })),
    }));
    const ok = await props.onSave(w.id, { date, exercises: cleaned });
    setSaving(false);
    if (ok) props.onClose();
  }
  function del() {
    if (confirm("Delete this workout permanently?")) { props.onDelete(w.id); props.onClose(); }
  }

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Edit Workout</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={labelStyle}>Date</div>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={fieldStyle} />
          </div>
          {exercises.map((ex, exIdx) => (
            <ExerciseCard
              key={exIdx}
              exercise={ex}
              dbEx={findEx(ex.exerciseId)}
              live={false}
              onUpdateSet={(si, f, v) => updateSet(exIdx, si, f, v)}
              onToggleWarmup={(si) => toggleWarmup(exIdx, si)}
              onAddSet={() => addSet(exIdx)}
              onRemoveSet={(si) => removeSet(exIdx, si)}
              onRemove={() => removeExercise(exIdx)}
            />
          ))}
          <button onClick={() => setPicker(true)} style={{ width: "100%", background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: "14px", color: "#1a73e8", fontSize: 14, fontWeight: 600, marginBottom: 12, minHeight: 48 }}>+ Add Exercise</button>
        </div>
        <div style={{ display: "flex", gap: 8, paddingTop: 12 }}>
          <button onClick={del} style={{ background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "14px 18px", fontSize: 14, fontWeight: 700, minHeight: 48 }}>Delete</button>
          <button onClick={save} disabled={saving} style={{ flex: 1, background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, minHeight: 48, opacity: saving ? 0.8 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
        </div>
      </div>
      {picker && <Picker inWorkoutIds={exercises.map((e) => e.exerciseId)} onSelect={addExercise} onCreate={props.onCreateExercise} onClose={() => setPicker(false)} />}
    </div>
  );
}

// ─── FOOD TAB (recipe library + daily log) ───
function FoodTab(props) {
  const { meals, onAdd, onRemove, pt, ct } = props;
  const [cat, setCat] = useState("All");
  const [q, setQ] = useState("");
  const [detail, setDetail] = useState(null); // recipe object
  const [showForm, setShowForm] = useState(false);
  const [date, setDate] = useState(today());
  const [showPresets, setShowPresets] = useState(false);
  const [cust, setCust] = useState({ name: "", p: "", c: "" });

  const library = RECIPES.concat(props.customRecipes || []);
  let list = cat === "All" ? library : library.filter((r) => r.cat === cat);
  if (q.trim()) {
    const term = q.trim().toLowerCase();
    list = list.filter((r) => r.name.toLowerCase().includes(term) || (r.ingredients || []).join(" ").toLowerCase().includes(term));
  }

  const dm = meals[date] || [];
  const tp = dm.reduce((a, m) => a + (Number(m.protein) || 0), 0);
  const tc = dm.reduce((a, m) => a + (Number(m.cals) || 0), 0);

  function logMeal(item) {
    const entry = { name: item.name, protein: item.p, cals: item.c, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) };
    onAdd(today(), entry);
    setShowPresets(false);
  }
  function logRecipe(r) {
    onAdd(today(), { name: r.name, protein: r.p, cals: r.cals, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    setDetail(null);
  }
  function addCustom() {
    if (!cust.name.trim()) return;
    logMeal({ name: cust.name.trim(), p: Number(cust.p) || 0, c: Number(cust.c) || 0 });
    setCust({ name: "", p: "", c: "" });
  }

  const week = [];
  for (let i = 6; i >= 0; i--) {
    const ds = shiftDay(today(), -i);
    const dd = new Date(Number(ds.split("-")[0]), Number(ds.split("-")[1]) - 1, Number(ds.split("-")[2]));
    week.push({ day: dd.toLocaleDateString("en", { weekday: "narrow" }), p: (meals[ds] || []).reduce((a, m) => a + (Number(m.protein) || 0), 0) });
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginTop: 0, marginBottom: 4 }}>Meal Library</h2>
      <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 4, marginBottom: 16 }}>High-protein meals built for muscle. Tap one to see how to make it.</p>

      {props.onAddRecipe && (
        <button onClick={() => setShowForm(true)} style={{ width: "100%", background: "#f0f5ff", border: "1px dashed #1a73e8", borderRadius: 12, padding: "14px", color: "#1a73e8", fontSize: 14, fontWeight: 700, marginBottom: 12, minHeight: 48 }}>+ Add Your Own Recipe</button>
      )}

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search meals or ingredients" style={Object.assign({}, fieldStyle, { marginBottom: 12 })} />

      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16, WebkitOverflowScrolling: "touch" }}>
        {["All"].concat(MEAL_CATS).map((g) => (
          <button key={g} onClick={() => setCat(g)} style={{ background: cat === g ? "#1a73e8" : "#fff", color: cat === g ? "#fff" : "#374151", border: cat === g ? "2px solid #1a73e8" : "2px solid #e5e7eb", borderRadius: 24, padding: "10px 18px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>{g}</button>
        ))}
      </div>

      {list.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20, fontSize: 14 }}>No meals match that search</p>}
      {list.map((r) => (
        <button key={r.id} onClick={() => setDetail(r)} style={Object.assign({}, cardStyle, { width: "100%", textAlign: "left", display: "block" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 600 }}>{r.name}</div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 3, lineHeight: 1.4 }}>{r.blurb}</div>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: 20, padding: "5px 10px", whiteSpace: "nowrap" }}>{r.time} min</span>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <MacroPill label="P" val={r.p + "g"} strong />
            <MacroPill label="C" val={r.c + "g"} />
            <MacroPill label="F" val={r.f + "g"} />
            <MacroPill label="" val={r.cals + " cal"} />
          </div>
        </button>
      ))}

      <div style={{ borderTop: "1px solid #e5e7eb", marginTop: 20, paddingTop: 20 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 24, marginBottom: 20 }}>
          <button onClick={() => setDate(shiftDay(date, -1))} style={navBtnStyle}>‹</button>
          <span style={{ fontSize: 15, fontWeight: 600, color: date === today() ? "#1a73e8" : "#6b7280" }}>{date === today() ? "Today" : date}</span>
          <button onClick={() => setDate(shiftDay(date, 1))} style={navBtnStyle}>›</button>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 36, marginBottom: 24 }}>
          <Ring label="Protein" val={tp} tgt={pt} unit="g" pct={Math.min((tp / pt) * 100, 100)} />
          <Ring label="Calories" val={tc} tgt={ct} unit="" pct={Math.min((tc / ct) * 100, 100)} />
        </div>

        <div style={{ marginBottom: 24 }}>
          <div style={labelStyle}>7-Day Protein</div>
          <div style={{ display: "flex", gap: 4, height: 48 }}>
            {week.map((wk, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <div style={{ width: "100%", flex: 1, background: "#f3f4f6", borderRadius: 4, display: "flex", alignItems: "flex-end" }}>
                  <div style={{ width: "100%", height: Math.min((wk.p / pt) * 100, 100) + "%", background: wk.p >= pt ? "#22c55e" : "#1a73e8", borderRadius: 4, minHeight: 2 }} />
                </div>
                <span style={{ fontSize: 10, color: "#9ca3af" }}>{wk.day}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={Object.assign({}, labelStyle, { marginBottom: 0 })}>Logged Meals</div>
            <button onClick={() => setShowPresets(true)} style={{ background: "#1a73e8", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 14, fontWeight: 600 }}>+ Quick Food</button>
          </div>
          {dm.length === 0 && <p style={{ color: "#9ca3af", textAlign: "center", padding: 20, fontSize: 14 }}>Nothing logged yet. Log a meal from the library above, or add one below.</p>}
          {dm.map((m, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", padding: "14px 0", borderBottom: "1px solid #f3f4f6" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name}</div>
                <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{m.protein}g · {m.cals} cal{m.time ? " · " + m.time : ""}</div>
              </div>
              <button onClick={() => onRemove(date, i)} style={closeBtn}>✕</button>
            </div>
          ))}
        </div>

        <div style={Object.assign({}, cardStyle, { marginBottom: 16 })}>
          <div style={labelStyle}>Custom Entry</div>
          <input style={fieldStyle} placeholder="Food name" value={cust.name} onChange={(e) => setCust(Object.assign({}, cust, { name: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
            <input style={fieldStyle} placeholder="Protein (g)" type="number" inputMode="numeric" value={cust.p} onChange={(e) => setCust(Object.assign({}, cust, { p: e.target.value }))} />
            <input style={fieldStyle} placeholder="Calories" type="number" inputMode="numeric" value={cust.c} onChange={(e) => setCust(Object.assign({}, cust, { c: e.target.value }))} />
          </div>
          <button onClick={addCustom} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 600, marginTop: 10, minHeight: 48 }}>Log It</button>
        </div>
      </div>

      {detail && <RecipeDetail recipe={detail} onLog={() => logRecipe(detail)} onClose={() => setDetail(null)} />}

      {showForm && <RecipeForm onSubmit={props.onAddRecipe} onClose={() => setShowForm(false)} />}

      {showPresets && (
        <div style={overlay}>
          <div style={Object.assign({}, sheet, { maxHeight: "80vh" })}>
            <div style={sheetHead}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Quick Foods</h2>
              <button onClick={() => setShowPresets(false)} style={xBtn}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {FOOD_PRESETS.map((p, i) => (
                <button key={i} onClick={() => logMeal(p)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", borderBottom: "1px solid #f3f4f6", color: "#1a2332", padding: "16px 4px", width: "100%", textAlign: "left", minHeight: 52 }}>
                  <span style={{ fontSize: 15, fontWeight: 500 }}>{p.name}</span>
                  <span style={{ fontSize: 13, color: "#9ca3af" }}>{p.p}g · {p.c}cal</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MacroPill(props) {
  return (
    <span style={{ fontSize: 12, fontWeight: 600, color: props.strong ? "#1a73e8" : "#6b7280", background: props.strong ? "#1a73e810" : "#f3f4f6", borderRadius: 8, padding: "5px 10px" }}>
      {props.label ? props.label + " " : ""}{props.val}
    </span>
  );
}

// ─── RECIPE DETAIL ───
function RecipeDetail(props) {
  const r = props.recipe;
  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={sheetHead}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>{r.name}</h2>
            <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>{r.cat} · {r.time} min</div>
          </div>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 20 }}>
            {[{ l: "Protein", v: r.p + "g", strong: true }, { l: "Carbs", v: r.c + "g" }, { l: "Fat", v: r.f + "g" }, { l: "Calories", v: r.cals }].map((m, i) => (
              <div key={i} style={{ background: m.strong ? "#1a73e810" : "#f9fafb", border: "1px solid " + (m.strong ? "#1a73e830" : "#e5e7eb"), borderRadius: 12, padding: "12px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: m.strong ? "#1a73e8" : "#1a2332" }}>{m.v}</div>
                <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500, marginTop: 2 }}>{m.l}</div>
              </div>
            ))}
          </div>

          <div style={labelStyle}>Ingredients</div>
          <div style={{ marginBottom: 20 }}>
            {r.ingredients.map((ing, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "8px 0", borderBottom: i < r.ingredients.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <span style={{ color: "#1a73e8", fontWeight: 700, lineHeight: 1.4 }}>·</span>
                <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.4 }}>{ing}</span>
              </div>
            ))}
          </div>

          <div style={labelStyle}>How to Make It</div>
          <div style={{ marginBottom: 8 }}>
            {r.steps.map((st, i) => (
              <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", marginBottom: 12 }}>
                <span style={{ flexShrink: 0, width: 24, height: 24, borderRadius: "50%", background: "#1a73e8", color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: "#374151", lineHeight: 1.5, paddingTop: 2 }}>{st}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={props.onLog} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>Log to Today ({r.p}g · {r.cals} cal)</button>
      </div>
    </div>
  );
}

// ─── RECIPE FORM (create your own) ───
function RecipeForm(props) {
  const [f, setF] = useState({ name: "", cat: "Lunch", time: "", p: "", c: "", fat: "", cals: "", blurb: "", ingredients: "", steps: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  function set(k, v) { setF(Object.assign({}, f, { [k]: v })); }

  async function submit() {
    setErr("");
    if (!f.name.trim()) { setErr("Give your recipe a name"); return; }
    const ingredients = f.ingredients.split("\n").map((s) => s.trim()).filter(Boolean);
    const steps = f.steps.split("\n").map((s) => s.trim()).filter(Boolean);
    if (ingredients.length === 0) { setErr("Add at least one ingredient"); return; }
    if (steps.length === 0) { setErr("Add at least one step"); return; }
    const recipe = {
      id: "custom-rec-" + Date.now(),
      name: f.name.trim(),
      cat: f.cat,
      time: Number(f.time) || 0,
      p: Number(f.p) || 0,
      c: Number(f.c) || 0,
      f: Number(f.fat) || 0,
      cals: Number(f.cals) || 0,
      blurb: f.blurb.trim() || "Your custom recipe.",
      ingredients,
      steps,
      custom: true,
    };
    setBusy(true);
    let ok = true;
    if (props.onSubmit) ok = await props.onSubmit(recipe);
    setBusy(false);
    if (ok !== false) props.onClose();
  }

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>New Recipe</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={labelStyle}>Name</div>
          <input style={Object.assign({}, fieldStyle, { marginBottom: 14 })} value={f.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Buffalo Chicken Wrap" />

          <div style={labelStyle}>Category</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            {MEAL_CATS.map((g) => (
              <button key={g} onClick={() => set("cat", g)} style={{ background: f.cat === g ? "#1a73e8" : "#fff", color: f.cat === g ? "#fff" : "#374151", border: f.cat === g ? "2px solid #1a73e8" : "2px solid #e5e7eb", borderRadius: 20, padding: "8px 16px", fontSize: 13, fontWeight: 600, minHeight: 40 }}>{g}</button>
            ))}
          </div>

          <div style={labelStyle}>Short Description</div>
          <input style={Object.assign({}, fieldStyle, { marginBottom: 14 })} value={f.blurb} onChange={(e) => set("blurb", e.target.value)} placeholder="One line about the meal (optional)" />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
            <div>
              <div style={labelStyle}>Protein (g)</div>
              <input style={fieldStyle} type="number" inputMode="numeric" value={f.p} onChange={(e) => set("p", e.target.value)} placeholder="0" />
            </div>
            <div>
              <div style={labelStyle}>Calories</div>
              <input style={fieldStyle} type="number" inputMode="numeric" value={f.cals} onChange={(e) => set("cals", e.target.value)} placeholder="0" />
            </div>
            <div>
              <div style={labelStyle}>Carbs (g)</div>
              <input style={fieldStyle} type="number" inputMode="numeric" value={f.c} onChange={(e) => set("c", e.target.value)} placeholder="0" />
            </div>
            <div>
              <div style={labelStyle}>Fat (g)</div>
              <input style={fieldStyle} type="number" inputMode="numeric" value={f.fat} onChange={(e) => set("fat", e.target.value)} placeholder="0" />
            </div>
          </div>

          <div style={labelStyle}>Prep Time (minutes)</div>
          <input style={Object.assign({}, fieldStyle, { marginBottom: 14 })} type="number" inputMode="numeric" value={f.time} onChange={(e) => set("time", e.target.value)} placeholder="0" />

          <div style={labelStyle}>Ingredients (one per line)</div>
          <textarea style={Object.assign({}, fieldStyle, { marginBottom: 14, minHeight: 100, resize: "vertical", lineHeight: 1.5 })} value={f.ingredients} onChange={(e) => set("ingredients", e.target.value)} placeholder={"8 oz chicken breast\n1 cup rice\n1 tbsp olive oil"} />

          <div style={labelStyle}>Steps (one per line)</div>
          <textarea style={Object.assign({}, fieldStyle, { marginBottom: 8, minHeight: 100, resize: "vertical", lineHeight: 1.5 })} value={f.steps} onChange={(e) => set("steps", e.target.value)} placeholder={"Season and grill the chicken\nCook the rice\nPlate and serve"} />

          {err && <div style={{ fontSize: 13, fontWeight: 600, color: "#dc2626", marginBottom: 8 }}>{err}</div>}
        </div>
        <button onClick={submit} disabled={busy} style={{ width: "100%", background: busy ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>{busy ? "Saving..." : "Save Recipe"}</button>
      </div>
    </div>
  );
}

function Ring(props) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ fontSize: 12, fontWeight: 500, color: "#9ca3af", marginBottom: 10 }}>{props.label}</div>
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="#f3f4f6" strokeWidth="5" />
          <circle cx="40" cy="40" r="34" fill="none" stroke={props.pct >= 100 ? "#22c55e" : "#1a73e8"} strokeWidth="5" strokeDasharray={props.pct * 2.14 + " 214"} strokeLinecap="round" transform="rotate(-90 40 40)" />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{props.val}{props.unit}</span>
          <span style={{ fontSize: 10, color: "#9ca3af" }}>/{props.tgt}</span>
        </div>
      </div>
    </div>
  );
}

// ─── PROGRESS TAB ───
function ProgressTab(props) {
  const workouts = props.workouts;
  const ts = workouts.length;
  let tsets = 0;
  const prs = {};
  for (const w of workouts) {
    for (const ex of w.exercises || []) {
      const ws = workSets(ex.sets);
      tsets += ws.length;
      const db = findEx(ex.exerciseId);
      for (const s of ws) {
        const wt = Number(s.weight) || 0;
        const rp = Number(s.reps) || 0;
        if (db && wt > 0 && rp > 0) {
          const est = e1rm(wt, rp);
          if (!prs[db.name] || est > prs[db.name].e1rm) prs[db.name] = { e1rm: est, w: wt, r: rp, d: w.date };
        }
      }
    }
  }
  const prList = Object.entries(prs).sort((a, b) => b[1].e1rm - a[1].e1rm);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 28 }}>
        {[{ v: ts, l: "Workouts" }, { v: tsets, l: "Work Sets" }].map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 14, padding: "18px 12px", textAlign: "center", border: "1px solid #e5e7eb" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1a73e8" }}>{s.v}</div>
            <div style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500, marginTop: 4 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {prList.length > 0 && (
        <div>
          <div style={labelStyle}>Personal Records (Est. 1RM)</div>
          <div style={{ background: "#fff", borderRadius: 14, border: "1px solid #e5e7eb", overflow: "hidden" }}>
            {prList.map((entry, i) => (
              <div key={entry[0]} style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: i < prList.length - 1 ? "1px solid #f3f4f6" : "none" }}>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{entry[0]}</span>
                <span style={{ fontSize: 16, fontWeight: 700, color: "#1a73e8", marginRight: 12 }}>{entry[1].e1rm} lbs</span>
                <span style={{ fontSize: 12, color: "#9ca3af" }}>{entry[1].w}×{entry[1].r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ts === 0 && <p style={{ color: "#9ca3af", fontSize: 15, textAlign: "center", padding: 40 }}>Complete your first workout to see stats</p>}
    </div>
  );
}

// ─── SETTINGS SHEET ───
function SettingsSheet(props) {
  const p = props.profile;
  const [weight, setWeight] = useState(String(p.weight || ""));
  const [protein, setProtein] = useState(p.proteinTarget != null ? String(p.proteinTarget) : "");
  const [calories, setCalories] = useState(p.calorieTarget != null ? String(p.calorieTarget) : "");
  const [rest, setRest] = useState(String(p.restSeconds || 120));

  function save() {
    props.onSave({
      weight: Number(weight) || DEFAULT_WEIGHT,
      proteinTarget: protein.trim() === "" ? null : Number(protein),
      calorieTarget: calories.trim() === "" ? null : Number(calories),
      restSeconds: Number(rest) || 0,
    });
  }

  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>Settings</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Body Weight (lbs)</div>
            <input style={fieldStyle} type="number" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={String(DEFAULT_WEIGHT)} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Protein Target (g)</div>
            <input style={fieldStyle} type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} placeholder={"Auto: " + props.derivedP + "g (1g/lb)"} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Calorie Target</div>
            <input style={fieldStyle} type="number" inputMode="numeric" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder={"Auto: " + props.derivedC + " (bw×16+300)"} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Default Rest Timer (seconds)</div>
            <input style={fieldStyle} type="number" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="120" />
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 6 }}>Set to 0 to turn the rest timer off.</p>
          </div>
        </div>
        <button onClick={save} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>Save</button>
        {props.onSignOut && <button onClick={props.onSignOut} style={{ width: "100%", background: "none", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, minHeight: 48, marginTop: 10 }}>Sign Out</button>}
      </div>
    </div>
  );
}

// ─── LEARN TAB ───
function LearnTab() {
  const [open, setOpen] = useState(null);
  function toggle(id) { setOpen(open === id ? null : id); }

  const sections = [
    { id: "overload", t: "Progressive Overload", c: "The engine of all muscle growth. Your body only adapts when forced to handle increasing demands.\n\nDOUBLE PROGRESSION (what this app uses):\n\u2022 Pick a rep range (8-12 for hypertrophy)\n\u2022 Start at 8 reps with a challenging weight\n\u2022 Add reps each session until you hit 12 at RIR 0-1\n\u2022 Increase weight 5lbs (upper) or 10lbs (lower)\n\u2022 Reset to 8 reps and repeat\n\nRIR (Reps in Reserve):\n\u2022 RIR 3 = could do 3 more (warm-up zone)\n\u2022 RIR 2 = could do 2 more (stimulus begins)\n\u2022 RIR 1 = could do 1 more (sweet spot)\n\u2022 RIR 0 = failure (last set only)\n\nResearch shows RIR 1-3 produces the same hypertrophy as failure with less fatigue.\n\nPLATEAU PROTOCOL:\n3+ sessions stalled \u2192 deload week at 60% \u2192 come back and push." },
    { id: "volume", t: "Training Volume", c: "Volume (sets per muscle per week) is the #1 driver of hypertrophy.\n\nOPTIMAL RANGES:\n\u2022 10-20 sets per muscle group per week\n\u2022 Under 10 = leaving gains on the table\n\u2022 Over 20 = diminishing returns\n\nFREQUENCY:\n\u2022 Hit each muscle 2-3x per week\n\u2022 MPS elevated only 24-48 hours post-training\n\nSPLIT OPTIONS:\n\u2022 3 days: Full Body x 3\n\u2022 4 days: Upper / Lower / Upper / Lower\n\u2022 5 days: Push / Pull / Legs / Upper / Lower\n\u2022 6 days: PPL / PPL" },
    { id: "aesthetics", t: "Training for Aesthetics", c: "Visual balance and proportion over raw size.\n\nPRIORITY ORDER:\n1. Shoulders (width = aesthetics)\n2. Back (V-taper)\n3. Upper Chest (fullness)\n4. Arms (proportional)\n5. Legs (sweep and shape)\n6. Core (low BF% + direct work)\n\nEXERCISE SELECTION:\n\u2022 Compounds first, isolation after\n\u2022 Stretched-position exercises are superior (incline curls, RDLs, overhead extensions)\n\u2022 Machines/cables often give better tension than free weights for isolation\n\nREP RANGES:\n\u2022 6-12 for compounds\n\u2022 10-20 for isolation\n\u2022 Rest: 2-3 min compounds, 60-90s isolation" },
    { id: "nutrition", t: "Nutrition for Muscle", c: "Training = stimulus. Nutrition = raw materials.\n\nPROTEIN:\n\u2022 1g per pound of bodyweight daily\n\u2022 Spread across 3-5 meals (20-40g each)\n\u2022 Post-workout within 2 hours\n\u2022 30-40g casein before bed\n\u2022 Total daily protein matters more than timing\n\nCALORIES:\n\u2022 Surplus: maintenance + 200-400 cal/day\n\u2022 Maintenance = bodyweight x 14-16\n\u2022 Faster gains = mostly fat, not muscle\n\u2022 Cutting: maintenance - 500 (keep protein at 1g/lb)\n\nTOP SOURCES (per 4oz):\n\u2022 Chicken breast: 31g\n\u2022 Steak sirloin: 28g\n\u2022 Salmon: 25g\n\u2022 Whey scoop: 25g\n\u2022 Greek yogurt (1 cup): 17g\n\u2022 Eggs (1 large): 6g" },
    { id: "recovery", t: "Recovery and Deloads", c: "You grow during recovery, not in the gym.\n\nSLEEP:\n\u2022 7-9 hours minimum (non-negotiable)\n\u2022 Growth hormone peaks during deep sleep\n\u2022 Poor sleep reduces MPS and increases cortisol\n\nDELOAD PROTOCOL:\n\u2022 Every 4-6 weeks of hard training\n\u2022 Reduce to 60% of working weight\n\u2022 Keep showing up (maintain frequency)\n\u2022 Signs you need one: persistent soreness, performance drops, poor sleep\n\nRECOVERY BY MUSCLE:\n\u2022 Small (biceps, triceps, delts): 24-36 hours\n\u2022 Medium (chest, back): 36-48 hours\n\u2022 Large (quads, glutes, hams): 48-72 hours" },
  ];

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, marginTop: 0 }}>Training Knowledge</h2>
      <p style={{ color: "#9ca3af", fontSize: 14, marginBottom: 20, marginTop: 4 }}>Evidence-based principles. Tap to expand.</p>
      {sections.map((s) => (
        <div key={s.id} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
          <button onClick={() => toggle(s.id)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "none", border: "none", padding: 16, width: "100%", textAlign: "left", fontSize: 15, fontWeight: 600, color: "#1a2332" }}>
            {s.t}
            <span style={{ transform: open === s.id ? "rotate(180deg)" : "none", transition: "transform .2s", color: "#9ca3af", fontSize: 18 }}>{"\u25BE"}</span>
          </button>
          {open === s.id && <pre style={{ padding: "0 16px 16px", fontSize: 13, color: "#6b7280", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "inherit", margin: 0 }}>{s.c}</pre>}
        </div>
      ))}
    </div>
  );
}

// ─── SHARED STYLES ───
const cardStyle = { background: "#fff", borderRadius: 14, padding: 16, marginBottom: 12, border: "1px solid #e5e7eb", overflow: "hidden" };
const inputStyle = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8, color: "#1a2332", padding: "10px 4px", fontSize: 16, fontWeight: 600, textAlign: "center", outline: "none", width: "100%", minWidth: 0, minHeight: 44 };
const fieldStyle = { background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10, color: "#1a2332", padding: "14px 16px", fontSize: 16, outline: "none", width: "100%", boxSizing: "border-box" };
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#9ca3af", marginBottom: 12 };
const colStyle = { fontSize: 11, fontWeight: 500, color: "#9ca3af", textAlign: "center" };
const navBtnStyle = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, width: 40, height: 40, fontSize: 20, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" };
const closeBtn = { background: "none", border: "none", color: "#d1d5db", fontSize: 20, padding: 8, minHeight: 40, display: "flex", alignItems: "center", justifyContent: "center" };
const overlay = { position: "fixed", inset: 0, background: "rgba(0,0,0,.35)", zIndex: 200, display: "flex", alignItems: "flex-end", justifyContent: "center" };
const sheet = { background: "#fff", borderRadius: "20px 20px 0 0", padding: "20px 20px max(20px,env(safe-area-inset-bottom))", width: "100%", maxWidth: 520, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", animation: "slideUp .25s ease" };
const sheetHead = { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 };
const xBtn = { background: "#f3f4f6", border: "none", borderRadius: 50, width: 36, height: 36, fontSize: 18, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center" };