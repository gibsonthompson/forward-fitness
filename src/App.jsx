import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabaseClient";
import { shadowSm, shadowPrimary, BORDER, cardStyle, inputStyle, fieldStyle, labelStyle, colStyle, closeBtn, overlay, sheet, sheetHead, xBtn, primaryBtn } from "./ui/theme";
import { appConfirm, useNoZoom, ConfirmHost } from "./ui/confirm";
import { Segmented, Dropdown, LineChart, BarChart } from "./ui/components";
import RunTab from "./screens/RunTab";
import { loadRunning, runningCoachContext } from "./services/running";

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
  { id: "default-chestback", name: "Chest / Back", exercises: ["incline-bench", "db-bench", "cable-fly"] },
  { id: "default-arms", name: "Arms", exercises: ["tricep-bar-pushdown", "barbell-curl", "rope-pushdown", "rope-curl"] },
  { id: "default-shoulderslegs", name: "Shoulders / Legs", exercises: ["db-shoulder-press", "leg-ext", "lateral-cable-raise", "leg-curl", "rear-delt-fly", "calf-raise"] },
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

// Weekly schedule (Monday-first). weekSchedule[i] holds a split id, "rest", or null.
const DAY_FULL = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_ABBR = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function todayIndex() { return (new Date().getDay() + 6) % 7; } // JS 0=Sun -> Mon-first index
function weekdayLabel(dateStr) {
  if (dateStr === today()) return "Today";
  const parts = dateStr.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  const t = new Date(); t.setDate(t.getDate() - 1);
  const y = t.getFullYear() + "-" + String(t.getMonth() + 1).padStart(2, "0") + "-" + String(t.getDate()).padStart(2, "0");
  if (dateStr === y) return "Yesterday";
  return dt.toLocaleDateString("en", { weekday: "long" });
}
function workoutGroups(w) {
  const seen = [];
  for (const ex of w.exercises || []) { const e = findEx(ex.exerciseId); if (e && seen.indexOf(e.group) === -1) seen.push(e.group); }
  return seen;
}
// Total working volume (weight × reps, warm-ups excluded)
function workoutVolume(w) {
  let v = 0;
  for (const ex of (w.exercises || [])) for (const s of workSets(ex.sets)) v += (Number(s.weight) || 0) * (Number(s.reps) || 0);
  return Math.round(v);
}
function workoutSetCount(w) {
  let n = 0;
  for (const ex of (w.exercises || [])) n += workSets(ex.sets).length;
  return n;
}
function groupSig(w) { return workoutGroups(w).slice().sort().join("|"); }
// % volume change vs the most recent EARLIER workout that hit the same muscle groups.
// `workouts` is oldest-first; returns a rounded integer or null when there's no comparable session.
function volumeDelta(workouts, index) {
  const cur = workouts[index];
  const sig = groupSig(cur);
  const curVol = workoutVolume(cur);
  if (!curVol || !sig) return null;
  for (let i = index - 1; i >= 0; i--) {
    if (groupSig(workouts[i]) === sig) {
      const prev = workoutVolume(workouts[i]);
      return prev > 0 ? Math.round(((curVol - prev) / prev) * 100) : null;
    }
  }
  return null;
}
// Build the recap object used by the post-workout share card.
// `workouts` is oldest-first and does NOT yet include the just-finished session.
function buildShareSummary(cleaned, workouts, splits, activeSplitId, durationSec) {
  const groups = workoutGroups(cleaned);
  const split = activeSplitId ? (splits || []).find((s) => s.id === activeSplitId) : null;
  const name = split ? split.name : (groups.length ? groups.join(" / ") : "Workout");
  const vol = workoutVolume(cleaned);
  const sets = workoutSetCount(cleaned);
  const sig = groupSig(cleaned);
  let pct = null;
  for (let i = (workouts || []).length - 1; i >= 0; i--) {
    if (groupSig(workouts[i]) === sig) { const prev = workoutVolume(workouts[i]); if (prev > 0 && vol > 0) pct = Math.round(((vol - prev) / prev) * 100); break; }
  }
  const topLifts = (cleaned.exercises || []).map((ex) => {
    const dbEx = findEx(ex.exerciseId);
    let best = 0, bestReps = 0;
    for (const s of workSets(ex.sets)) { const wv = Number(s.weight) || 0; if (wv >= best) { best = wv; bestReps = Number(s.reps) || 0; } }
    return { name: dbEx ? dbEx.name : ex.exerciseId, weight: best, reps: bestReps, sets: workSets(ex.sets).length };
  }).filter((l) => l.sets > 0).slice(0, 6);
  return { name, date: cleaned.date, groups, vol, sets, pct, topLifts, durationSec: durationSec || null };
}

// Booleans for Mon..Sun of the current week: did a workout get logged that day?
function weekDoneFlags(workouts) {
  const days = new Set((workouts || []).map((w) => w.date));
  const mon = mondayOf(today());
  const flags = [];
  for (let i = 0; i < 7; i++) flags.push(days.has(dateKey(addDaysDate(mon, i))));
  return flags;
}

// ─── Progress / gamification math ───
function dateKey(dt) { return dt.getFullYear() + "-" + String(dt.getMonth() + 1).padStart(2, "0") + "-" + String(dt.getDate()).padStart(2, "0"); }
function addDaysDate(dt, n) { const x = new Date(dt); x.setDate(x.getDate() + n); return x; }
function mondayOf(dateStr) {
  const parts = dateStr.split("-").map(Number);
  const dt = new Date(parts[0], parts[1] - 1, parts[2]);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return dt;
}

function computeGameStats(workouts, weekSchedule) {
  const workoutDays = new Set((workouts || []).map((w) => w.date));
  const total = (workouts || []).length;
  let sets = 0;
  for (const w of workouts || []) for (const ex of w.exercises || []) sets += workSets(ex.sets).length;

  const sched = weekSchedule || [];
  const scheduledDays = [];
  for (let i = 0; i < 7; i++) { const v = sched[i]; if (v && v !== "rest") scheduledDays.push(i); }

  const curMon = mondayOf(today());
  let startMon = curMon;
  if (workoutDays.size) startMon = mondayOf(Array.from(workoutDays).sort()[0]);

  const weeks = [];
  for (let m = new Date(startMon); m <= curMon; m = addDaysDate(m, 7)) weeks.push(new Date(m));

  const weekPerfect = weeks.map((mon) => {
    if (scheduledDays.length === 0) return false;
    for (const di of scheduledDays) { if (!workoutDays.has(dateKey(addDaysDate(mon, di)))) return false; }
    return true;
  });
  const perfectWeeks = weekPerfect.filter(Boolean).length;

  let streak = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (i === weeks.length - 1 && !weekPerfect[i]) continue; // current week still in progress
    if (weekPerfect[i]) streak++; else break;
  }

  let thisWeekDone = 0;
  for (const di of scheduledDays) { if (workoutDays.has(dateKey(addDaysDate(curMon, di)))) thisWeekDone++; }

  return { total, sets, perfectWeeks, streak, thisWeekScheduled: scheduledDays.length, thisWeekDone, level: Math.floor(total / 10) + 1, intoLevel: total % 10, workoutDays };
}

function buildHabitGrid(workoutDays, weeksBack) {
  const curMon = mondayOf(today());
  const todayStr = today();
  const rows = [];
  for (let wIdx = weeksBack - 1; wIdx >= 0; wIdx--) {
    const mon = addDaysDate(curMon, -7 * wIdx);
    const cells = [];
    for (let d = 0; d < 7; d++) {
      const k = dateKey(addDaysDate(mon, d));
      cells.push({ key: k, done: workoutDays.has(k), isToday: k === todayStr, future: k > todayStr });
    }
    rows.push(cells);
  }
  return rows;
}

function achievementsFor(stats) {
  return [
    { id: "first", label: "First Workout", req: "Log 1 workout", earned: stats.total >= 1 },
    { id: "five", label: "Getting Started", req: "5 workouts", earned: stats.total >= 5 },
    { id: "ten", label: "Committed", req: "10 workouts", earned: stats.total >= 10 },
    { id: "perfect1", label: "Perfect Week", req: "Hit every scheduled day", earned: stats.perfectWeeks >= 1 },
    { id: "streak4", label: "On Fire", req: "4-week streak", earned: stats.streak >= 4 },
    { id: "twentyfive", label: "Dedicated", req: "25 workouts", earned: stats.total >= 25 },
    { id: "sets500", label: "Volume King", req: "500 sets", earned: stats.sets >= 500 },
    { id: "fifty", label: "Beast Mode", req: "50 workouts", earned: stats.total >= 50 },
    { id: "hundred", label: "Centurion", req: "100 workouts", earned: stats.total >= 100 },
  ];
}

// ─── Analytics (Progress + Coach) ───
function exLabel(id) {
  const e = findEx(id);
  if (e) return e.name;
  return String(id || "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// One entry per session for an exercise, oldest first.
function exerciseHistory(workouts, exId) {
  const out = [];
  for (const w of workouts || []) {
    for (const ex of w.exercises || []) {
      if (ex.exerciseId !== exId) continue;
      let best = 0, top = null, vol = 0, maxReps = 0;
      for (const s of workSets(ex.sets)) {
        const wt = Number(s.weight) || 0, r = Number(s.reps) || 0;
        vol += wt * r;
        if (r > maxReps) maxReps = r;
        const est = e1rm(wt, r);
        if (est > best) { best = est; top = { weight: wt, reps: r }; }
      }
      if (best > 0) out.push({ date: w.date, best, top, volume: Math.round(vol), maxReps });
      break;
    }
  }
  return out;
}

// Exercises the user has logged with weight, most logged first.
function loggedExercises(workouts) {
  const count = {};
  for (const w of workouts || []) for (const ex of w.exercises || []) {
    if (workSets(ex.sets).some((s) => (Number(s.weight) || 0) > 0 && (Number(s.reps) || 0) > 0)) count[ex.exerciseId] = (count[ex.exerciseId] || 0) + 1;
  }
  return Object.keys(count).sort((a, b) => count[b] - count[a]).map((id) => ({ id, sessions: count[id] }));
}

// Best estimated 1RM per exercise, the date it was set, and the gain over the previous best.
function personalRecords(workouts) {
  const cutoff = shiftDay(today(), -14);
  const out = [];
  for (const { id } of loggedExercises(workouts)) {
    const h = exerciseHistory(workouts, id);
    if (!h.length) continue;
    let bi = 0;
    h.forEach((s, i) => { if (s.best > h[bi].best) bi = i; });
    let prev = 0;
    for (let i = 0; i < bi; i++) if (h[i].best > prev) prev = h[i].best;
    out.push({ id, name: exLabel(id), best: h[bi].best, top: h[bi].top, date: h[bi].date, gain: prev > 0 ? h[bi].best - prev : 0, fresh: h[bi].date >= cutoff && prev > 0, sessions: h.length });
  }
  return out.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.best - a.best);
}

// Lifts in this workout that beat the lifter's previous best estimated 1RM.
function prsInWorkout(workout, prior) {
  const prs = [];
  for (const ex of workout.exercises || []) {
    let best = 0, top = null;
    for (const s of workSets(ex.sets)) { const est = e1rm(s.weight, s.reps); if (est > best) { best = est; top = { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0 }; } }
    if (!best) continue;
    const h = exerciseHistory(prior, ex.exerciseId);
    const prevBest = h.reduce((m, s) => Math.max(m, s.best), 0);
    if (prevBest > 0 && best > prevBest) prs.push({ name: exLabel(ex.exerciseId), weight: top.weight, reps: top.reps, gain: best - prevBest });
  }
  return prs;
}

// Volume, sets and sessions per week for the last `n` weeks, oldest first.
function weeklyTotals(workouts, n) {
  const curMon = mondayOf(today());
  const weeks = [];
  for (let i = n - 1; i >= 0; i--) {
    const mon = addDaysDate(curMon, -7 * i);
    weeks.push({ start: dateKey(mon), end: dateKey(addDaysDate(mon, 6)), label: (mon.getMonth() + 1) + "/" + mon.getDate(), volume: 0, sets: 0, sessions: 0 });
  }
  for (const w of workouts || []) {
    const wk = weeks.find((x) => w.date >= x.start && w.date <= x.end);
    if (!wk) continue;
    wk.volume += workoutVolume(w);
    wk.sets += workoutSetCount(w);
    wk.sessions += 1;
  }
  return weeks;
}

// Totals for a date window [from, to].
function windowTotals(workouts, from, to) {
  const t = { sessions: 0, sets: 0, volume: 0 };
  for (const w of workouts || []) {
    if (w.date < from || w.date > to) continue;
    t.sessions += 1; t.sets += workoutSetCount(w); t.volume += workoutVolume(w);
  }
  return t;
}

// Working sets per muscle group since a date, biggest first.
function groupSets(workouts, from) {
  const g = {};
  for (const w of workouts || []) {
    if (w.date < from) continue;
    for (const ex of w.exercises || []) {
      const e = findEx(ex.exerciseId);
      const key = e ? e.group : "Other";
      g[key] = (g[key] || 0) + workSets(ex.sets).length;
    }
  }
  return Object.keys(g).map((k) => ({ group: k, sets: g[k] })).filter((x) => x.sets > 0).sort((a, b) => b.sets - a.sets);
}

function fmtVolume(v) {
  if (v >= 1000000) return (v / 1000000).toFixed(1) + "M";
  if (v >= 10000) return Math.round(v / 1000) + "k";
  if (v >= 1000) return (v / 1000).toFixed(1) + "k";
  return String(Math.round(v));
}

function relTime(iso) {
  const t = new Date(iso).getTime();
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return m + "m ago";
  const h = Math.round(m / 60); if (h < 24) return h + "h ago";
  const d = Math.round(h / 24); if (d < 7) return d + "d ago";
  return new Date(iso).toLocaleDateString("en", { month: "short", day: "numeric" });
}

// Compact text snapshot of the lifter's log for the coach.
function coachContext(workouts, profile, splits, weekSchedule) {
  const lines = [];
  const list = workouts || [];
  if (profile && profile.weight) lines.push("Bodyweight: " + profile.weight + " lb");
  if (splits && splits.length) lines.push("Their workouts: " + splits.map((s) => s.name + " (" + (s.exercises || []).map(exLabel).join(", ") + ")").join("; "));
  const sched = (weekSchedule || []).map((v, i) => {
    if (!v || v === "rest") return DAY_ABBR[i] + ": rest";
    const sp = (splits || []).find((s) => s.id === v);
    return DAY_ABBR[i] + ": " + (sp ? sp.name : "training");
  });
  if (sched.length) lines.push("Weekly schedule: " + sched.join(", "));
  const t = today();
  const last30 = windowTotals(list, shiftDay(t, -29), t);
  const prev30 = windowTotals(list, shiftDay(t, -59), shiftDay(t, -30));
  lines.push("Total workouts logged: " + list.length + ". Last 30 days: " + last30.sessions + " workouts, " + last30.sets + " working sets, " + Math.round(last30.volume) + " lb volume. Previous 30 days: " + prev30.sessions + " workouts, " + prev30.sets + " sets, " + Math.round(prev30.volume) + " lb.");
  const weeks = weeklyTotals(list, 8);
  lines.push("Weekly volume (oldest to newest): " + weeks.map((w) => w.label + " " + Math.round(w.volume) + "lb/" + w.sessions + "x").join(", "));
  const gs = groupSets(list, shiftDay(t, -29));
  if (gs.length) lines.push("Working sets per muscle, last 30 days: " + gs.map((g) => g.group + " " + g.sets).join(", "));
  const prs = personalRecords(list).slice(0, 15);
  if (prs.length) lines.push("Best estimated 1RMs: " + prs.map((p) => p.name + " " + p.best + " (" + p.top.weight + "x" + p.top.reps + " on " + p.date + ")").join("; "));
  const recent = list.slice(-14).reverse();
  if (recent.length) {
    lines.push("Recent workouts, newest first:");
    for (const w of recent) {
      const parts = (w.exercises || []).map((ex) => {
        const sets = workSets(ex.sets).filter((s) => (Number(s.reps) || 0) > 0).map((s) => ((Number(s.weight) || 0) > 0 ? s.weight + "x" + s.reps : s.reps + " reps"));
        return sets.length ? exLabel(ex.exerciseId) + " " + sets.join(", ") : "";
      }).filter(Boolean);
      lines.push("- " + w.date + " (" + weekdayLabel(w.date) + "): " + parts.join("; "));
    }
  }
  const byGroup = {};
  for (const e of allExercises()) { (byGroup[e.group] = byGroup[e.group] || []).push(e.name); }
  lines.push("APP EXERCISES: " + Object.keys(byGroup).map((g) => g + ": " + byGroup[g].join(", ")).join(" | "));
  return lines.join("\n").slice(0, 13500);
}

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
        <div style={{ width: 28, height: 28, border: "3px solid #eaeef3", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
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

        <div style={{ background: "#fff", border: "1px solid #eaeef3", borderRadius: 16, padding: 20 }}>
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
  const [profile, setProfile] = useState({ weight: DEFAULT_WEIGHT, proteinTarget: null, calorieTarget: null, restSeconds: 120, username: "", avatar: "", shareConfig: { duration: true, location: false, volume: true, topSets: true, weights: true }, customExercises: [], customRecipes: [], activeSplits: [], weekSchedule: [] });
  const [toast, setToast] = useState(null);
  const [dbOk, setDbOk] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [rest, setRest] = useState({ running: false, secondsLeft: 0, total: 0 });

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
        if (r1.error) throw r1.error;
        const w = (r1.data || []).map((r) => ({ id: r.id, date: r.date, exercises: r.exercises }));
        w.reverse();
        setWorkouts(w);
        // profile is optional; failure here should not break the app
        let loadedProfile = { username: "", avatar: "" };
        try {
          const r3 = await supabase.from("iron_profiles").select("*").eq("user_id", USER_ID).limit(1);
          if (!r3.error && r3.data && r3.data[0]) {
            const row = r3.data[0];
            const s = row.settings || {};
            const customExercises = Array.isArray(s.customExercises) ? s.customExercises : [];
            const customRecipes = Array.isArray(s.customRecipes) ? s.customRecipes : [];
            const activeSplits = Array.isArray(s.activeSplits) ? s.activeSplits : [];
            const weekSchedule = Array.isArray(s.weekSchedule) ? s.weekSchedule : [];
            registerCustomExercises(customExercises);
            loadedProfile = { username: typeof s.username === "string" ? s.username : "", avatar: typeof s.avatar === "string" ? s.avatar : "" };
            setProfile({
              id: row.id,
              weight: Number(s.weight) || Number(row.weight) || DEFAULT_WEIGHT,
              proteinTarget: s.proteinTarget != null ? Number(s.proteinTarget) : null,
              calorieTarget: s.calorieTarget != null ? Number(s.calorieTarget) : null,
              restSeconds: Number(s.restSeconds) || 120,
              username: typeof s.username === "string" ? s.username : "",
              avatar: typeof s.avatar === "string" ? s.avatar : "",
              shareConfig: (s.shareConfig && typeof s.shareConfig === "object") ? s.shareConfig : { duration: true, location: false, volume: true, topSets: true, weights: true },
              customExercises,
              customRecipes,
              activeSplits,
              weekSchedule,
            });
          }
        } catch (e) { /* profile table/column may not exist yet; use defaults */ }
        setDbOk(true);
        ensurePublicProfile(loadedProfile).then(loadSocial);
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
      return res.data.id || true;
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

  // Single source of truth: write the whole settings object so nothing is dropped.
  async function persistProfile(next) {
    const settings = {
      weight: next.weight,
      proteinTarget: next.proteinTarget,
      calorieTarget: next.calorieTarget,
      restSeconds: next.restSeconds,
      username: next.username || "",
      avatar: next.avatar || "",
      shareConfig: next.shareConfig || { duration: true, location: false, volume: true, topSets: true, weights: true },
      customExercises: next.customExercises || [],
      customRecipes: next.customRecipes || [],
      activeSplits: next.activeSplits || [],
      weekSchedule: next.weekSchedule || [],
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

  // Save profile fields (username, avatar, share prefs) without closing the settings sheet.
  async function updateProfile(patch, msg) {
    const next = Object.assign({}, profile, patch);
    try {
      await persistProfile(next);
      if (patch.avatar !== undefined) supabase.from("iron_public_profiles").update({ avatar: patch.avatar || null, updated_at: new Date().toISOString() }).eq("user_id", USER_ID).then(() => loadSocial());
      if (msg) flash(msg);
      return true;
    }
    catch (e) { flash("Could not save: " + e.message, "err"); return false; }
  }

  async function addCustomExercise(ex) {
    const next = Object.assign({}, profile, { customExercises: (profile.customExercises || []).concat([ex]) });
    registerCustomExercises(next.customExercises);
    try { await persistProfile(next); flash("Exercise added"); return true; }
    catch (e) { flash("Could not save exercise: " + e.message, "err"); return false; }
  }

  // The home screen shows activeSplits, falling back to the default until the user changes it.
  const currentSplits = (profile.activeSplits && profile.activeSplits.length) ? profile.activeSplits : MY_SPLIT;

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
  async function updateSplit(split) {
    if (!split || !split.id) return false;
    const updated = currentSplits.map((s) => (s.id === split.id ? { id: split.id, name: split.name, exercises: split.exercises } : s));
    const ok = await saveSplits(updated);
    if (ok) flash("Workout updated");
    return ok;
  }
  async function syncSplitFromWorkout(splitId, exIds) {
    if (!splitId || !exIds || !exIds.length) return;
    const target = currentSplits.find((s) => s.id === splitId);
    if (!target) return; // split was deleted; nothing to update
    const cur = target.exercises || [];
    const same = cur.length === exIds.length && cur.every((id, i) => id === exIds[i]);
    if (same) return; // structure unchanged, no write
    const updated = currentSplits.map((s) => (s.id === splitId ? Object.assign({}, s, { exercises: exIds }) : s));
    const ok = await saveSplits(updated);
    if (ok) flash((target.name || "Workout") + " updated");
  }
  async function applyPlan(plan) {
    const ok = await saveSplits(withSplitIds(plan.days));
    if (ok) flash(plan.name + " loaded");
    return ok;
  }
  async function saveSchedule(nextSchedule) {
    const next = Object.assign({}, profile, { weekSchedule: nextSchedule });
    try { await persistProfile(next); flash("Schedule saved"); return true; }
    catch (e) { flash("Could not save schedule: " + e.message, "err"); return false; }
  }

  // ─── Social: public handle, friends, feed ───
  const [socialState, setSocialState] = useState({ me: null, friends: [], incoming: [], outgoing: [], loaded: false });
  const [feed, setFeed] = useState({ posts: [], loaded: false, loading: false, error: false });
  const socialRef = useRef(socialState);
  useEffect(() => { socialRef.current = socialState; }, [socialState]);

  async function fetchPeople(ids) {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    if (!uniq.length) return {};
    const r = await supabase.from("iron_public_profiles").select("user_id,username,avatar").in("user_id", uniq);
    const map = {};
    (r.data || []).forEach((p) => { map[p.user_id] = p; });
    return map;
  }

  async function ensurePublicProfile(p) {
    try {
      const cur = await supabase.from("iron_public_profiles").select("user_id,username,avatar").eq("user_id", USER_ID).maybeSingle();
      if (cur.error) throw cur.error;
      if (cur.data) {
        if ((p.avatar || "") !== (cur.data.avatar || "")) await supabase.from("iron_public_profiles").update({ avatar: p.avatar || null, updated_at: new Date().toISOString() }).eq("user_id", USER_ID);
        return;
      }
      const u = await supabase.auth.getUser();
      const email = u && u.data && u.data.user ? u.data.user.email || "" : "";
      const login = cleanUsername(email.split("@")[0]);
      const wanted = cleanUsername(p.username) || login || ("lifter" + String(USER_ID).replace(/-/g, "").slice(0, 6));
      let ins = await supabase.from("iron_public_profiles").insert({ user_id: USER_ID, username: wanted, avatar: p.avatar || null });
      if (ins.error && login && wanted !== login) ins = await supabase.from("iron_public_profiles").insert({ user_id: USER_ID, username: login, avatar: p.avatar || null });
      if (ins.error) await supabase.from("iron_public_profiles").insert({ user_id: USER_ID, username: wanted + String(USER_ID).replace(/-/g, "").slice(0, 4), avatar: p.avatar || null });
    } catch (e) { console.warn("public profile", e); }
  }

  async function loadSocial() {
    try {
      const fr = await supabase.from("iron_friendships").select("id,requester,addressee,status,created_at");
      if (fr.error) throw fr.error;
      const rows = fr.data || [];
      const other = (r) => (r.requester === USER_ID ? r.addressee : r.requester);
      const people = await fetchPeople(rows.map(other).concat([USER_ID]));
      const person = (id) => people[id] || { user_id: id, username: "lifter", avatar: "" };
      setSocialState({
        me: people[USER_ID] || null,
        friends: rows.filter((r) => r.status === "accepted").map((r) => Object.assign({ id: r.id }, person(other(r)))).sort((a, b) => a.username.localeCompare(b.username)),
        incoming: rows.filter((r) => r.status === "pending" && r.addressee === USER_ID).map((r) => ({ id: r.id, person: person(r.requester) })),
        outgoing: rows.filter((r) => r.status === "pending" && r.requester === USER_ID).map((r) => ({ id: r.id, person: person(r.addressee) })),
        loaded: true,
      });
    } catch (e) { console.warn("social", e); }
  }

  async function searchUsers(h) {
    const pat = h.replace(/[\\%_]/g, (c) => "\\" + c) + "%";
    const r = await supabase.from("iron_public_profiles").select("user_id,username,avatar").ilike("username", pat).neq("user_id", USER_ID).order("username").limit(8);
    return r.error ? [] : (r.data || []);
  }

  async function sendFriendRequest(username) {
    const h = cleanUsername(username);
    if (!h) return false;
    const found = await supabase.from("iron_public_profiles").select("user_id,username").eq("username", h).maybeSingle();
    if (found.error || !found.data) { flash("No one found with that username", "err"); return false; }
    if (found.data.user_id === USER_ID) { flash("That's you", "err"); return false; }
    const theirs = socialRef.current.incoming.find((r) => r.person.user_id === found.data.user_id);
    if (theirs) return acceptRequest(theirs.id);
    const ins = await supabase.from("iron_friendships").insert({ requester: USER_ID, addressee: found.data.user_id });
    if (ins.error) { flash(ins.error.code === "23505" ? "You're already connected, or a request is pending" : "Could not send request", "err"); return false; }
    flash("Request sent to @" + found.data.username);
    await loadSocial();
    return true;
  }

  async function acceptRequest(id) {
    const r = await supabase.from("iron_friendships").update({ status: "accepted", accepted_at: new Date().toISOString() }).eq("id", id);
    if (r.error) { flash("Could not accept", "err"); return false; }
    flash("You're now friends");
    await loadSocial();
    loadFeed();
    return true;
  }

  async function removeFriendship(id, quiet) {
    const r = await supabase.from("iron_friendships").delete().eq("id", id);
    if (r.error) { flash("Could not update", "err"); return false; }
    if (!quiet) flash("Friend removed");
    await loadSocial();
    loadFeed();
    return true;
  }

  async function loadFeed() {
    setFeed((f) => Object.assign({}, f, { loading: true, error: false }));
    try {
      const r = await supabase.from("iron_posts").select("id,user_id,workout_id,summary,caption,created_at").order("created_at", { ascending: false }).limit(50);
      if (r.error) throw r.error;
      const posts = r.data || [];
      let likes = [];
      if (posts.length) {
        const l = await supabase.from("iron_post_likes").select("post_id,user_id").in("post_id", posts.map((p) => p.id));
        if (!l.error) likes = l.data || [];
      }
      const people = await fetchPeople(posts.map((p) => p.user_id).concat(likes.map((l) => l.user_id)));
      const name = (id) => (id === USER_ID ? "you" : people[id] ? "@" + people[id].username : "a friend");
      setFeed({
        loaded: true, loading: false, error: false,
        posts: posts.map((p) => {
          const pl = likes.filter((l) => l.post_id === p.id);
          return Object.assign({}, p, { author: people[p.user_id] || { username: "lifter" }, mine: p.user_id === USER_ID, likeCount: pl.length, liked: pl.some((l) => l.user_id === USER_ID), likers: pl.map((l) => name(l.user_id)) });
        }),
      });
    } catch (e) {
      console.warn("feed", e);
      setFeed((f) => Object.assign({}, f, { loading: false, loaded: true, error: true }));
    }
  }

  async function createPost(summary, caption, workoutId) {
    const r = await supabase.from("iron_posts").insert({ user_id: USER_ID, workout_id: workoutId || null, summary, caption: (caption || "").trim() || null });
    if (r.error) { flash("Could not post: " + r.error.message, "err"); return false; }
    flash(socialRef.current.friends.length ? "Posted to your friends" : "Posted. Add friends so they can see it.");
    loadFeed();
    return true;
  }

  async function toggleLike(post) {
    const liked = !post.liked;
    setFeed((f) => Object.assign({}, f, { posts: f.posts.map((p) => (p.id === post.id ? Object.assign({}, p, { liked, likeCount: p.likeCount + (liked ? 1 : -1), likers: liked ? ["you"].concat(p.likers.filter((x) => x !== "you")) : p.likers.filter((x) => x !== "you") }) : p)) }));
    const r = liked
      ? await supabase.from("iron_post_likes").insert({ post_id: post.id, user_id: USER_ID })
      : await supabase.from("iron_post_likes").delete().eq("post_id", post.id).eq("user_id", USER_ID);
    if (r.error && r.error.code !== "23505") loadFeed();
  }

  async function deletePost(post) {
    const yes = await appConfirm({ title: "Delete post?", message: "This removes it from your friends' feeds. Your workout stays in your log.", confirmLabel: "Delete", danger: true });
    if (!yes) return;
    const r = await supabase.from("iron_posts").delete().eq("id", post.id);
    if (r.error) { flash("Could not delete", "err"); return; }
    setFeed((f) => Object.assign({}, f, { posts: f.posts.filter((p) => p.id !== post.id) }));
  }

  async function setHandle(name) {
    const h = cleanUsername(name);
    if (h.length < 3) { flash("Usernames need at least 3 letters or numbers", "err"); return false; }
    const r = await supabase.from("iron_public_profiles").upsert({ user_id: USER_ID, username: h, avatar: profile.avatar || null, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    if (r.error) { flash(r.error.code === "23505" ? "@" + h + " is taken" : "Could not save username", "err"); return false; }
    const ok = await updateProfile({ username: h }, "Username saved");
    await loadSocial();
    return ok;
  }

  const social = { state: socialState, feed, loadSocial, loadFeed, searchUsers, sendFriendRequest, acceptRequest, removeFriendship, createPost, toggleLike, deletePost, setHandle };

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#f5f7fa" }}>
      <style>{"@keyframes spin{to{transform:rotate(360deg)}}body{margin:0;background:#f5f7fa}"}</style>
      <div style={{ width: 28, height: 28, border: "3px solid #eaeef3", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
    </div>
  );

  return (
    <div style={{ background: "#f5f7fa", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: rest.running ? 150 : 90, fontFamily: "Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif", color: "#1a2332" }}>
      <ConfirmHost />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      <style>{"*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}html{overscroll-behavior-y:none}body{margin:0;background:#f5f7fa;font-family:Inter,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility;overscroll-behavior-y:none}input,textarea{font-family:inherit;font-size:16px!important;transition:border-color .15s ease,box-shadow .15s ease}input:focus,textarea:focus{border-color:#1a73e8;box-shadow:0 0 0 3px rgba(26,115,232,.18)}input[type=number]{-moz-appearance:textfield}input::-webkit-outer-spin-button,input::-webkit-inner-spin-button{-webkit-appearance:none}button{font-family:inherit;-webkit-appearance:none;cursor:pointer;transition:transform .12s cubic-bezier(.22,1,.36,1),box-shadow .2s ease,opacity .2s ease,background .2s ease}button:active:not(:disabled){transform:scale(.97)}@keyframes spin{to{transform:rotate(360deg)}}@keyframes fadeIn{from{opacity:0;transform:translate(-50%,-8px)}to{opacity:1;transform:translate(-50%,0)}}@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes coachdot{0%,80%,100%{transform:translateY(0);opacity:.4}40%{transform:translateY(-4px);opacity:1}}@keyframes popIn{from{transform:scale(.96);opacity:0}to{transform:scale(1);opacity:1}}@media (prefers-reduced-motion:reduce){*{animation-duration:.001ms!important;transition-duration:.001ms!important}}"}</style>

      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: toast.type === "err" ? "#fef2f2" : "#f0fdf4", color: toast.type === "err" ? "#dc2626" : "#16a34a", border: "1px solid " + (toast.type === "err" ? "#fecaca" : "#bbf7d0"), borderRadius: 12, padding: "12px 24px", fontSize: 14, fontWeight: 600, animation: "fadeIn .2s ease", boxShadow: "0 4px 12px rgba(0,0,0,.1)", maxWidth: "90%", textAlign: "center" }}>{toast.msg}</div>}

      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderBottom: "1px solid " + BORDER, boxShadow: "0 1px 3px rgba(16,24,40,.04)", position: "sticky", top: 0, zIndex: 50 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Forward<span style={{ color: "#1a73e8" }}>Fitness</span></h1>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {!dbOk && <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>Offline</span>}
          <button onClick={() => setShowSettings(true)} aria-label="Settings" style={{ background: "none", border: "none", padding: 4, color: "#9ca3af", display: "flex" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          </button>
        </div>
      </header>

      <div style={{ padding: "16px 20px" }}>
        {tab === "workout" && <WorkoutTab workouts={workouts} onSave={saveWorkout} onUpdate={updateWorkout} onDelete={deleteWorkout} flash={flash} startRest={startRest} restSeconds={profile.restSeconds} onCreateExercise={addCustomExercise} splits={currentSplits} weekSchedule={profile.weekSchedule || []} onSaveSchedule={saveSchedule} onSyncSplit={syncSplitFromWorkout} profile={profile} onSaveProfile={updateProfile} onPost={createPost} />}
        {tab === "run" && <RunTab flash={flash} />}
        {tab === "progress" && <ProgressTab workouts={workouts} weekSchedule={profile.weekSchedule || []} social={social} />}
        {tab === "coach" && <CoachTab workouts={workouts} profile={profile} splits={currentSplits} weekSchedule={profile.weekSchedule || []} />}
        {tab === "profile" && <ProfileTab profile={profile} workouts={workouts} weekSchedule={profile.weekSchedule || []} onSave={updateProfile} onSignOut={onSignOut} social={social} />}
      </div>

      {rest.running && <RestBar rest={rest} onAdjust={adjustRest} onSkip={skipRest} />}

      <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 520, display: "flex", background: "rgba(255,255,255,.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderTop: "1px solid " + BORDER, boxShadow: "0 -2px 16px rgba(16,24,40,.06)", padding: "6px 0 max(8px,env(safe-area-inset-bottom))", zIndex: 100 }}>
        {[
          { id: "workout", label: "Train", d: "M3 12h4l3-9 4 18 3-9h4" },
          { id: "run", label: "Run", d: "M14.5 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM8 21l3-6 3 3v4M6 12l3-3 4 1 3 4 3 1" },
          { id: "progress", label: "Progress", d: "M3 20h18M5 16l4-4 4 4 6-8" },
          { id: "coach", label: "Coach", d: "M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" },
          { id: "profile", label: "Profile", d: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" },
        ].map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", padding: "8px 0", color: tab === t.id ? "#1a73e8" : "#9ca3af" }}>
            <span style={{ position: "relative", display: "flex" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tab === t.id ? 2.2 : 1.5} strokeLinecap="round" strokeLinejoin="round"><path d={t.d} /></svg>
              {t.id === "progress" && socialState.incoming.length > 0 && <span style={{ position: "absolute", top: -2, right: -6, width: 10, height: 10, borderRadius: "50%", background: "#ef4444", border: "2px solid #fff" }} />}
            </span>
            <span style={{ fontSize: 11, fontWeight: tab === t.id ? 600 : 400 }}>{t.label}</span>
          </button>
        ))}
      </nav>

      {showSettings && <SettingsSheet profile={profile} onSave={saveProfile} onClose={() => setShowSettings(false)} onSignOut={onSignOut} splits={currentSplits} onAddSplit={addSplit} onRemoveSplit={removeSplit} onUpdateSplit={updateSplit} onApplyPlan={applyPlan} onCreateExercise={addCustomExercise} />}
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
const restBtn = { background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", color: "#eaeef3", borderRadius: 10, padding: "10px 10px", fontSize: 13, fontWeight: 700, minWidth: 44, minHeight: 44 };

// ─── WORKOUT TAB ───
function WorkoutTab(props) {
  const { workouts, onSave, onUpdate, onDelete, flash, startRest, restSeconds, onCreateExercise, splits, weekSchedule, onSaveSchedule, onSyncSplit } = props;

  const [workout, setWorkout] = useState(() => {
    try { const d = localStorage.getItem("ff-draft"); return d ? JSON.parse(d) : { date: today(), exercises: [] }; }
    catch (e) { return { date: today(), exercises: [] }; }
  });
  const [activeSplitId, setActiveSplitId] = useState(() => {
    try { const d = JSON.parse(localStorage.getItem("ff-draft") || "null"); return d && d.splitId ? d.splitId : null; }
    catch (e) { return null; }
  });
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [plates, setPlates] = useState(null); // weight number for plate modal
  const [editing, setEditing] = useState(null); // workout object being edited
  const [splitsOpen, setSplitsOpen] = useState(false);
  const [shareData, setShareData] = useState(null); // finished-workout summary to share
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [startedAt, setStartedAt] = useState(() => { try { const d = JSON.parse(localStorage.getItem("ff-draft") || "null"); return d && d.startedAt ? d.startedAt : null; } catch (e) { return null; } });

  useEffect(() => {
    if (workout.exercises.length > 0) localStorage.setItem("ff-draft", JSON.stringify(Object.assign({}, workout, { splitId: activeSplitId, startedAt })));
  }, [workout, activeSplitId, startedAt]);

  function prefillSets(exId) {
    const last = getLast(workouts, exId);
    if (last && last.sets && last.sets.length > 0) {
      return last.sets.map((s) => ({ weight: String(s.weight || ""), reps: String(s.reps || ""), warmup: !!s.warmup, done: false, note: "" }));
    }
    return [{ weight: "", reps: "", warmup: false, done: false, note: "" }];
  }

  function loadSplit(split) {
    const list = (split.exercises || []).map((exId) => ({ exerciseId: exId, sets: prefillSets(exId) }));
    setActiveSplitId(split.id || null);
    setStartedAt(Date.now());
    setWorkout({ date: today(), exercises: list });
  }

  function addExercise(exId) {
    setStartedAt((prev) => prev || Date.now());
    setWorkout((w) => ({ date: w.date, startedAt: w.startedAt, exercises: w.exercises.concat([{ exerciseId: exId, sets: prefillSets(exId) }]) }));
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
      return { exerciseId: ex.exerciseId, sets: ex.sets.concat([{ weight: lastSet.weight, reps: lastSet.reps, warmup: false, done: false, note: "" }]) };
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
  function moveExercise(exIdx, dir) {
    setWorkout((w) => {
      const j = exIdx + dir;
      if (j < 0 || j >= w.exercises.length) return w;
      const exercises = w.exercises.slice();
      const t = exercises[exIdx]; exercises[exIdx] = exercises[j]; exercises[j] = t;
      return { date: w.date, exercises };
    });
  }

  function cleanExercises(exercises) {
    return exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => {
        const out = {
          weight: Number(s.weight) || 0,
          reps: Number(s.reps) || 0,
          warmup: !!s.warmup,
        };
        if (s.note && String(s.note).trim()) out.note = String(s.note).trim();
        return out;
      }),
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
    if (!ok) return;

    if (activeSplitId && onSyncSplit) {
      const split = splits.find((s) => s.id === activeSplitId);
      if (split) {
        const seen = [];
        for (const ex of cleaned.exercises) { if (seen.indexOf(ex.exerciseId) === -1) seen.push(ex.exerciseId); }
        const cur = split.exercises || [];
        const changed = cur.length !== seen.length || cur.some((id, i) => id !== seen[i]);
        if (changed) {
          const yes = await appConfirm({ title: "Save these changes?", message: 'You changed the exercises or their order. Update "' + split.name + '" so it loads this way next time?', confirmLabel: "Update it", cancelLabel: "Just this once" });
          if (yes) onSyncSplit(activeSplitId, seen);
        }
      }
    }
    const durationSec = startedAt ? Math.round((Date.now() - startedAt) / 1000) : null;
    const summary = buildShareSummary(cleaned, workouts, splits, activeSplitId, durationSec);
    summary.prs = prsInWorkout(cleaned, workouts);
    summary.workoutId = typeof ok === "string" ? ok : null;
    setActiveSplitId(null);
    setStartedAt(null);
    setWorkout({ date: today(), exercises: [] });
    setShareData(summary);
  }

  async function discardWorkout() {
    const touched = workout.exercises.some((ex) => ex.sets.some((s) => (Number(s.reps) || 0) > 0 || (Number(s.weight) || 0) > 0 || s.done));
    if (touched) {
      const yes = await appConfirm({ title: "Discard workout?", message: "Sets you entered won't be saved.", confirmLabel: "Discard", cancelLabel: "Keep going", danger: true });
      if (!yes) return;
    }
    localStorage.removeItem("ff-draft");
    setActiveSplitId(null);
    setStartedAt(null);
    setWorkout({ date: today(), exercises: [] });
  }

  const inWorkoutIds = workout.exercises.map((e) => e.exerciseId);
  function splitGroups(s) {
    const seen = [];
    for (const id of s.exercises || []) { const ex = findEx(id); if (ex && seen.indexOf(ex.group) === -1) seen.push(ex.group); }
    return seen;
  }

  return (
    <div>
      {workout.exercises.length === 0 && (() => {
        const tIdx = todayIndex();
        const todayVal = (weekSchedule || [])[tIdx];
        const todaySplit = todayVal && todayVal !== "rest" ? splits.find((s) => s.id === todayVal) : null;
        const isRest = todayVal === "rest";
        const todayName = DAY_FULL[tIdx];
        return (
          <>
            {/* Today hero */}
            <div style={{ marginBottom: 18 }}>
              {todaySplit ? (
                <button onClick={() => loadSplit(todaySplit)} style={{ width: "100%", textAlign: "left", border: "none", borderRadius: 20, padding: 22, color: "#fff", background: "linear-gradient(135deg,#1a73e8,#0c47b7)", boxShadow: shadowPrimary, display: "flex", alignItems: "center", gap: 16 }}>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", opacity: 0.85 }}>TODAY · {todayName.toUpperCase()}</span>
                    <span style={{ display: "block", fontSize: 26, fontWeight: 800, marginTop: 6 }}>{todaySplit.name}</span>
                    <span style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
                      {splitGroups(todaySplit).slice(0, 3).map((g) => <span key={g} style={{ fontSize: 11, fontWeight: 600, background: "rgba(255,255,255,.2)", borderRadius: 6, padding: "3px 9px" }}>{g}</span>)}
                      <span style={{ fontSize: 12, opacity: 0.85, fontWeight: 500 }}>{(todaySplit.exercises || []).length} exercises</span>
                    </span>
                  </span>
                  <span style={{ flexShrink: 0, width: 52, height: 52, borderRadius: "50%", background: "rgba(255,255,255,.22)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
                  </span>
                </button>
              ) : (
                <div style={{ borderRadius: 20, padding: 22, background: "#fff", border: "1px solid " + BORDER, boxShadow: shadowSm }}>
                  <span style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: ".06em", color: "#9ca3af" }}>TODAY · {todayName.toUpperCase()}</span>
                  <span style={{ display: "block", fontSize: 24, fontWeight: 800, marginTop: 6, color: "#1a2332" }}>{isRest ? "Rest Day" : "No Workout Scheduled"}</span>
                  <p style={{ fontSize: 13, color: "#6b7280", marginTop: 8, marginBottom: 14, lineHeight: 1.5 }}>{isRest ? "Recovery is where the growth happens. Take it easy today." : "Pick a split to train, or set up your week."}</p>
                  <button onClick={() => setSplitsOpen(true)} style={{ background: "#f0f5ff", border: "1px solid #dbe9fd", borderRadius: 12, padding: "11px 18px", color: "#1a73e8", fontSize: 14, fontWeight: 700, minHeight: 44 }}>{isRest ? "Train anyway" : "Choose a workout"}</button>
                </div>
              )}
            </div>

            {/* This Week (always open, drag a workout onto a day to schedule) */}
            {onSaveSchedule && (
              <WeekBoard schedule={weekSchedule} splits={splits} workouts={workouts} tIdx={tIdx} onSaveSchedule={onSaveSchedule} onLoadSplit={loadSplit} splitGroups={splitGroups} />
            )}

            {/* Other workouts (collapsible) */}
            {(() => {
              const otherSplits = todaySplit ? splits.filter((s) => s.id !== todaySplit.id) : splits;
              if (todaySplit && otherSplits.length === 0) return null; // today's split is the only one
              return (
                <div style={{ marginBottom: 20 }}>
                  <button onClick={() => setSplitsOpen(!splitsOpen)} style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", padding: "6px 0", color: "#6b7280", fontSize: 13, fontWeight: 700, letterSpacing: ".02em", textTransform: "uppercase" }}>
                    Other Workouts
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: splitsOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                  {splitsOpen && (
                    splits.length === 0 ? (
                      <p style={{ color: "#9ca3af", fontSize: 14, lineHeight: 1.5, marginTop: 8 }}>No workouts yet. Add one or pick a plan from Settings (the gear icon, top right).</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
                        {otherSplits.map((s) => (
                          <button key={s.id || s.name} onClick={() => loadSplit(s)} style={{ display: "flex", alignItems: "center", gap: 14, background: "#fff", border: "1px solid " + BORDER, borderRadius: 16, padding: 16, boxShadow: shadowSm, textAlign: "left", width: "100%" }}>
                            <span style={{ flexShrink: 0, width: 44, height: 44, borderRadius: 12, background: "linear-gradient(180deg,#eaf2fe,#dbe9fd)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l5 5M14 21l7-7" /></svg>
                            </span>
                            <span style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: "#1a2332" }}>{s.name}</span>
                              <span style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 5, alignItems: "center" }}>
                                {splitGroups(s).slice(0, 3).map((g) => <span key={g} style={{ fontSize: 11, fontWeight: 600, color: "#6b7280", background: "#f3f4f6", borderRadius: 6, padding: "3px 8px" }}>{g}</span>)}
                                <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 500 }}>{(s.exercises || []).length} exercises</span>
                              </span>
                            </span>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c7ccd4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                          </button>
                        ))}
                      </div>
                    )
                  )}
                </div>
              );
            })()}
          </>
        );
      })()}

      {workout.exercises.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <button onClick={discardWorkout} style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "#6b7280", fontSize: 14, fontWeight: 600, padding: "4px 0" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            Discard
          </button>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#1a2332", letterSpacing: ".02em", textTransform: "uppercase" }}>Active Workout</span>
          <span style={{ width: 64 }} />
        </div>
      )}

      {workout.exercises.map((ex, exIdx) => (
        <ExerciseCard
          key={exIdx}
          exercise={ex}
          dbEx={findEx(ex.exerciseId)}
          last={getLast(workouts, ex.exerciseId)}
          live
          onUpdateSet={(si, f, v) => updateSet(exIdx, si, f, v)}
          onToggleDone={(si) => toggleDone(exIdx, si)}
          onToggleWarmup={(si) => toggleWarmup(exIdx, si)}
          onAddSet={() => addSet(exIdx)}
          onRemoveSet={(si) => removeSet(exIdx, si)}
          onRemove={() => removeExercise(exIdx)}
          onPlates={(wt) => setPlates(wt)}
          onMove={(dir) => moveExercise(exIdx, dir)}
          canMoveUp={exIdx > 0}
          canMoveDown={exIdx < workout.exercises.length - 1}
        />
      ))}

      {workout.exercises.length > 0 && (
        <button onClick={() => setPicker(true)} style={{ width: "100%", background: "#fff", border: "1px solid " + BORDER, borderRadius: 14, padding: "16px", color: "#1a73e8", fontSize: 15, fontWeight: 700, marginBottom: 12, minHeight: 52, boxShadow: shadowSm }}>+ Add Exercise</button>
      )}

      {workout.exercises.length > 0 && (
        <button onClick={finishWorkout} disabled={saving} style={Object.assign({}, primaryBtn, { marginBottom: 24, opacity: saving ? 0.75 : 1 })}>{saving ? "Saving..." : "Save Workout"}</button>
      )}

      {workouts.length > 0 && (() => {
        const deltaById = {};
        workouts.forEach((w, i) => { deltaById[w.id != null ? w.id : "i" + i] = volumeDelta(workouts, i); });
        const recent = workouts.slice().reverse();
        const shown = showAllRecent ? recent : recent.slice(0, 5);
        return (
          <div style={{ marginTop: 12 }}>
            <div style={labelStyle}>Recent Workouts</div>
            {shown.map((w, i) => {
              const groups = workoutGroups(w);
              const parts = w.date.split("-");
              const setCount = workoutSetCount(w);
              const pct = deltaById[w.id != null ? w.id : null];
              return (
                <button key={w.id || i} onClick={() => setEditing(w)} style={Object.assign({}, cardStyle, { padding: 14, width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 14 })}>
                  <span style={{ flexShrink: 0, width: 48, height: 48, borderRadius: 12, background: "#f0f5ff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: "#1a73e8" }}>{Number(parts[2])}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: "#7aa7ee", textTransform: "uppercase", marginTop: 2 }}>{new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])).toLocaleDateString("en", { month: "short" })}</span>
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "#1a2332" }}>{weekdayLabel(w.date)}</span>
                      {pct != null && pct !== 0 && (
                        <span style={{ fontSize: 11, fontWeight: 700, color: pct > 0 ? "#16a34a" : "#9ca3af", background: pct > 0 ? "#f0fdf4" : "#f3f4f6", borderRadius: 6, padding: "2px 7px" }}>{pct > 0 ? "+" : ""}{pct}% vol</span>
                      )}
                    </span>
                    <span style={{ display: "block", fontSize: 13, color: "#6b7280", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{groups.length ? groups.join(" · ") : (w.exercises || []).length + " exercises"}</span>
                  </span>
                  <span style={{ flexShrink: 0, textAlign: "right" }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: 700, color: "#1a2332" }}>{setCount}</span>
                    <span style={{ display: "block", fontSize: 10, color: "#9ca3af", fontWeight: 600 }}>SETS</span>
                  </span>
                </button>
              );
            })}
            {recent.length > 5 && (
              <button onClick={() => setShowAllRecent(!showAllRecent)} style={{ width: "100%", background: "none", border: "none", color: "#1a73e8", fontSize: 14, fontWeight: 600, padding: "10px 0 4px" }}>
                {showAllRecent ? "Show less" : "Show " + (recent.length - 5) + " more"}
              </button>
            )}
          </div>
        );
      })()}

      {picker && <Picker inWorkoutIds={inWorkoutIds} onSelect={addExercise} onCreate={onCreateExercise} onClose={() => setPicker(false)} />}
      {plates !== null && <PlateModal weight={plates} onClose={() => setPlates(null)} />}
      {editing && <EditWorkoutModal workout={editing} onSave={onUpdate} onDelete={onDelete} onCreateExercise={onCreateExercise} onClose={() => setEditing(null)} />}
      {shareData && <WorkoutShareModal data={shareData} profile={props.profile || {}} onSaveProfile={props.onSaveProfile} onPost={props.onPost} flash={flash} onClose={() => setShareData(null)} />}
    </div>
  );
}

// ─── EXERCISE CARD (shared by live session + edit) ───
function ExerciseCard(props) {
  const { exercise: ex, dbEx, last, live, onUpdateSet, onToggleDone, onToggleWarmup, onAddSet, onRemoveSet, onRemove, onPlates, onMove, canMoveUp, canMoveDown } = props;
  const [noteOpen, setNoteOpen] = useState(null);
  const cols = live ? "28px 1fr 1fr 46px" : "28px 1fr 1fr";
  const moveBtn = { background: "#f3f4f6", border: "none", borderRadius: 8, width: 32, height: 32, fontSize: 15, color: "#6b7280", display: "flex", alignItems: "center", justifyContent: "center", padding: 0 };
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{dbEx ? dbEx.name : ex.exerciseId}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{dbEx ? dbEx.group : ""}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
          {live && onMove && (
            <>
              <button onClick={() => onMove(-1)} disabled={!canMoveUp} aria-label="move up" style={Object.assign({}, moveBtn, { color: canMoveUp ? "#6b7280" : "#d1d5db" })}>↑</button>
              <button onClick={() => onMove(1)} disabled={!canMoveDown} aria-label="move down" style={Object.assign({}, moveBtn, { color: canMoveDown ? "#6b7280" : "#d1d5db" })}>↓</button>
            </>
          )}
          <button onClick={onRemove} style={closeBtn}>✕</button>
        </div>
      </div>

      {live && last && (
        <div style={{ background: "#f9fafb", borderRadius: 8, padding: "8px 12px", marginBottom: 10, fontSize: 13, color: "#6b7280" }}>
          <b style={{ color: "#9ca3af", fontWeight: 600, fontSize: 11 }}>LAST: </b>
          {workSets(last.sets).map((s, i) => <span key={i}>{i > 0 ? " → " : ""}{s.weight}×{s.reps}</span>)}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, marginBottom: 6 }}>
        <span style={colStyle}>Set</span>
        <span style={colStyle}>Lbs</span>
        <span style={colStyle}>Reps</span>
        {live && <span></span>}
      </div>

      {ex.sets.map((s, si) => (
        <SwipeSetRow
          key={si}
          s={s} si={si} live={live} cols={cols}
          onUpdateSet={onUpdateSet}
          onToggleWarmup={onToggleWarmup}
          onToggleDone={onToggleDone}
          onPlates={onPlates}
          onRemoveSet={onRemoveSet}
          noteOpen={noteOpen === si}
          onOpenNote={() => setNoteOpen(si)}
          onCloseNote={() => setNoteOpen(null)}
        />
      ))}

      <button onClick={onAddSet} style={{ width: "100%", background: "none", border: "1px dashed #d1d5db", borderRadius: 8, padding: "10px", color: "#9ca3af", fontSize: 13, fontWeight: 500, minHeight: 44, marginTop: 4 }}>+ Add Set</button>
    </div>
  );
}

// One set row with swipe-left-to-reveal-delete (pointer events, works on touch + mouse)
function SwipeSetRow(props) {
  const { s, si, live, cols, onUpdateSet, onToggleWarmup, onToggleDone, onPlates, onRemoveSet, noteOpen, onOpenNote, onCloseNote } = props;
  const REVEAL = 76;
  const [open, setOpen] = useState(false);
  const frontRef = useRef(null);
  const drag = useRef(null);

  function setX(x, animate) {
    const el = frontRef.current; if (!el) return;
    el.style.transition = animate ? "transform .16s cubic-bezier(.22,1,.36,1)" : "none";
    el.style.transform = "translateX(" + x + "px)";
  }
  function down(e) { drag.current = { x: e.clientX, base: open ? -REVEAL : 0, moved: false, cur: open ? -REVEAL : 0 }; }
  function move(e) {
    const d = drag.current; if (!d) return;
    const delta = e.clientX - d.x;
    if (!d.moved && Math.abs(delta) < 6) return;
    d.moved = true;
    const nx = Math.max(-REVEAL, Math.min(0, d.base + delta));
    d.cur = nx;
    setX(nx, false); // drive the DOM directly, no re-render per move
  }
  function up() {
    const d = drag.current; drag.current = null;
    if (!d) return;
    if (!d.moved) { if (open) { setOpen(false); setX(0, true); } return; }
    if (d.cur < -REVEAL / 2) { setOpen(true); setX(-REVEAL, true); } else { setOpen(false); setX(0, true); }
  }
  function del() { setOpen(false); setX(0, false); onRemoveSet(si); }

  const inputExtras = Object.assign({}, s.warmup ? warmupInput : null, s.done ? doneInput : null);

  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden" }}>
        <button onClick={del} aria-label="delete set" style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: REVEAL, background: "#dc2626", color: "#fff", border: "none", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
          Delete
        </button>
        <div
          ref={frontRef}
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ transform: "translateX(" + (open ? -REVEAL : 0) + "px)", background: "#fff", position: "relative", touchAction: "pan-y" }}
        >
          <div style={{ display: "grid", gridTemplateColumns: cols, gap: 6, alignItems: "center" }}>
            <button onClick={() => onToggleWarmup(si)} title="Tap to toggle warm-up" style={{ background: s.warmup ? "#e8f0fe" : "none", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 700, color: s.warmup ? "#1a73e8" : "#9ca3af", padding: 0, minHeight: 44 }}>{s.warmup ? "W" : si + 1}</button>
            <div style={{ position: "relative" }}>
              <input type="number" inputMode="decimal" value={s.weight} onChange={(e) => onUpdateSet(si, "weight", e.target.value)} style={Object.assign({}, inputStyle, inputExtras)} placeholder="lbs" />
              {live && Number(s.weight) > BAR_WEIGHT && <button onClick={() => onPlates(Number(s.weight))} aria-label="plates" style={{ position: "absolute", right: 2, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#c7ccd4", fontSize: 11, padding: 4 }}>▦</button>}
            </div>
            <input type="number" inputMode="numeric" value={s.reps} onChange={(e) => onUpdateSet(si, "reps", e.target.value)} style={Object.assign({}, inputStyle, inputExtras)} placeholder="reps" />
            {live && (
              <button onClick={() => onToggleDone(si)} aria-label="complete set" style={{ background: s.done ? "#22c55e" : "#fff", border: "2px solid " + (s.done ? "#22c55e" : "#d1d5db"), borderRadius: 8, minHeight: 44, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={s.done ? "#fff" : "#d1d5db"} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
      {live && ((noteOpen || (s.note && s.note.length)) ? (
        <input value={s.note || ""} onChange={(e) => onUpdateSet(si, "note", e.target.value)} onBlur={() => { if (!s.note) onCloseNote(); }} autoFocus={noteOpen} placeholder="Add a note" style={noteInput} />
      ) : (
        <button onClick={onOpenNote} style={noteAddBtn}>+ note</button>
      ))}
    </div>
  );
}
const doneInput = { background: "#f0fdf4", borderColor: "#bbf7d0" };
const warmupInput = { background: "#eff5ff", borderColor: "#cfe0fb" };
const noteInput = { width: "100%", boxSizing: "border-box", marginTop: 6, background: "#f7f9fc", border: "1px solid #e3e8ef", borderRadius: 8, padding: "8px 10px", fontSize: 16, color: "#475467", outline: "none" };
const noteAddBtn = { background: "none", border: "none", color: "#c7ccd4", fontSize: 12, fontWeight: 500, padding: "4px 2px 0", marginTop: 2 };

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
                <button key={g} onClick={() => setNewGroup(g)} style={{ background: newGroup === g ? "#1a73e8" : "#fff", color: newGroup === g ? "#fff" : "#374151", border: newGroup === g ? "2px solid #1a73e8" : "2px solid #eaeef3", borderRadius: 20, padding: "8px 14px", fontSize: 13, fontWeight: 600, minHeight: 40 }}>{g}</button>
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
                <button key={g} onClick={() => setFilter(g)} style={{ background: filter === g ? "#1a73e8" : "#fff", color: filter === g ? "#fff" : "#374151", border: filter === g ? "2px solid #1a73e8" : "2px solid #eaeef3", borderRadius: 24, padding: "10px 20px", fontSize: 14, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, minHeight: 44 }}>{g}</button>
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
  useNoZoom();
  const editing = !!(props.initial && props.initial.id);
  const [name, setName] = useState(props.initial ? props.initial.name || "" : "");
  const [ids, setIds] = useState(props.initial && props.initial.exercises ? props.initial.exercises.slice() : []);
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
    const payload = { name: name.trim(), exercises: ids };
    if (editing) payload.id = props.initial.id;
    if (props.onSave) ok = await props.onSave(payload);
    setBusy(false);
    if (ok !== false) props.onClose();
  }

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxHeight: "92vh" })}>
        <div style={Object.assign({}, sheetHead, { flexShrink: 0 })}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{editing ? "Edit Workout" : "New Workout"}</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <div style={labelStyle}>Name</div>
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
        <button onClick={save} disabled={busy} style={{ width: "100%", background: busy ? "#9cb8e8" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>{busy ? "Saving..." : editing ? "Save Changes" : "Save Workout"}</button>
      </div>
      {picking && <Picker multi selectedIds={ids} onToggle={toggle} onCreate={props.onCreateExercise} onDone={() => setPicking(false)} onClose={() => setPicking(false)} />}
    </div>
  );
}

// ─── PLAN LIBRARY (preset programs) ───
function PlanLibrary(props) {
  const [busyId, setBusyId] = useState(null);
  async function apply(plan) {
    const yes = await appConfirm({ title: "Load this plan?", message: 'This replaces your home screen workouts with "' + plan.name + '". You can still add or remove workouts after.', confirmLabel: "Load plan", cancelLabel: "Cancel" });
    if (!yes) return;
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
  useNoZoom();
  const w = props.workout;
  const [date, setDate] = useState(w.date);
  const [exercises, setExercises] = useState(() =>
    (w.exercises || []).map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: (ex.sets || []).map((s) => ({ weight: String(s.weight ?? ""), reps: String(s.reps ?? ""), warmup: !!s.warmup, note: s.note || "" })),
    }))
  );
  const [picker, setPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  function mutate(exIdx, fn) { setExercises((list) => list.map((ex, i) => (i === exIdx ? fn(ex) : ex))); }
  function updateSet(exIdx, si, f, v) { mutate(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, j) => (j === si ? Object.assign({}, s, { [f]: v }) : s)) })); }
  function toggleWarmup(exIdx, si) { mutate(exIdx, (ex) => ({ exerciseId: ex.exerciseId, sets: ex.sets.map((s, j) => (j === si ? Object.assign({}, s, { warmup: !s.warmup }) : s)) })); }
  function addSet(exIdx) { mutate(exIdx, (ex) => { const l = ex.sets[ex.sets.length - 1] || { weight: "", reps: "" }; return { exerciseId: ex.exerciseId, sets: ex.sets.concat([{ weight: l.weight, reps: l.reps, warmup: false }]) }; }); }
  function removeSet(exIdx, si) { setExercises((list) => list.map((ex, i) => (i === exIdx ? { exerciseId: ex.exerciseId, sets: ex.sets.filter((_, j) => j !== si) } : ex)).filter((ex) => ex.sets.length > 0)); }
  function removeExercise(exIdx) { setExercises((list) => list.filter((_, i) => i !== exIdx)); }
  function addExercise(exId) { setExercises((list) => list.concat([{ exerciseId: exId, sets: [{ weight: "", reps: "", warmup: false }] }])); setPicker(false); }

  async function save() {
    if (saving) return;
    setSaving(true);
    const cleaned = exercises.map((ex) => ({
      exerciseId: ex.exerciseId,
      sets: ex.sets.map((s) => { const out = { weight: Number(s.weight) || 0, reps: Number(s.reps) || 0, warmup: !!s.warmup }; if (s.note && String(s.note).trim()) out.note = String(s.note).trim(); return out; }),
    }));
    const ok = await props.onSave(w.id, { date, exercises: cleaned });
    setSaving(false);
    if (ok) props.onClose();
  }
  async function del() {
    const yes = await appConfirm({ title: "Delete workout?", message: "This permanently removes this logged workout.", confirmLabel: "Delete", cancelLabel: "Cancel", danger: true });
    if (yes) { props.onDelete(w.id); props.onClose(); }
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
          <button onClick={() => setPicker(true)} style={{ width: "100%", background: "#fff", border: "1px solid #eaeef3", borderRadius: 14, padding: "14px", color: "#1a73e8", fontSize: 14, fontWeight: 600, marginBottom: 12, minHeight: 48 }}>+ Add Exercise</button>
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

// ─── PROGRESS TAB (You + Friends) ───
function Delta(props) {
  const d = props.value;
  if (d == null || !isFinite(d)) return <span style={{ fontSize: 11.5, fontWeight: 700, color: "#9ca3af" }}>vs prior 30d</span>;
  const up = d > 0, flat = d === 0;
  return <span style={{ fontSize: 11.5, fontWeight: 700, color: flat ? "#9ca3af" : up ? "#16a34a" : "#dc2626" }}>{flat ? "Same as prior 30d" : (up ? "+" : "") + d + "% vs prior 30d"}</span>;
}
function pctChange(cur, prev) { if (!prev) return cur ? null : 0; return Math.round(((cur - prev) / prev) * 100); }

function ProgressTab(props) {
  const { workouts, weekSchedule, social } = props;
  const [view, setView] = useState("you");
  const pending = social && social.state ? social.state.incoming.length : 0;
  return (
    <div>
      <Segmented value={view} onChange={setView} options={[{ id: "you", label: "You" }, { id: "friends", label: "Friends", badge: pending }]} />
      {view === "you" ? <YouProgress workouts={workouts} weekSchedule={weekSchedule} /> : <FriendsFeed social={social} />}
    </div>
  );
}

function YouProgress(props) {
  const { workouts, weekSchedule } = props;
  const stats = computeGameStats(workouts, weekSchedule);
  const grid = buildHabitGrid(stats.workoutDays, 10);
  const badges = achievementsFor(stats);
  const earnedCount = badges.filter((b) => b.earned).length;
  const t = today();
  const cur = windowTotals(workouts, shiftDay(t, -29), t);
  const prev = windowTotals(workouts, shiftDay(t, -59), shiftDay(t, -30));
  const prs = personalRecords(workouts);
  const freshPrs = prs.filter((p) => p.fresh).length;
  const weeks = weeklyTotals(workouts, 8);
  const groups = groupSets(workouts, shiftDay(t, -29));
  const groupMax = groups.length ? groups[0].sets : 1;
  const lifts = loggedExercises(workouts);
  const [exId, setExId] = useState(lifts.length ? lifts[0].id : null);
  const [showAllPrs, setShowAllPrs] = useState(false);
  const activeEx = exId && lifts.find((l) => l.id === exId) ? exId : (lifts.length ? lifts[0].id : null);
  const hist = activeEx ? exerciseHistory(workouts, activeEx) : [];
  const shortDate = (d) => { const p = d.split("-").map(Number); return p[1] + "/" + p[2]; };
  const histPts = hist.slice(-16).map((h) => ({ y: h.best, label: shortDate(h.date) }));
  const histBest = hist.reduce((m, h) => (h.best > m.best ? h : m), { best: 0 });
  const histFirst = hist.length ? hist[0].best : 0;
  const weekPct = stats.thisWeekScheduled > 0 ? Math.min(100, (stats.thisWeekDone / stats.thisWeekScheduled) * 100) : 0;

  if (stats.total === 0) {
    return (
      <div style={Object.assign({}, cardStyle, { padding: 28, textAlign: "center" })}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#f0f5ff", margin: "0 auto 14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20h18M5 16l4-4 4 4 6-8" /></svg>
        </div>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Your Progress Starts Here</div>
        <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5, margin: "8px 0 0" }}>Finish your first workout on the Train tab and your charts, records, and streaks show up here.</p>
      </div>
    );
  }

  const tiles = [
    { v: cur.sessions, l: "Workouts", d: pctChange(cur.sessions, prev.sessions) },
    { v: cur.sets, l: "Working Sets", d: pctChange(cur.sets, prev.sets) },
    { v: fmtVolume(cur.volume), l: "Volume (lb)", d: pctChange(cur.volume, prev.volume) },
    { v: freshPrs, l: "New PRs (14d)", d: undefined },
  ];

  return (
    <div>
      {/* Level + week */}
      <div style={{ background: "linear-gradient(135deg,#1a73e8,#0c47b7)", borderRadius: 20, padding: 18, color: "#fff", marginBottom: 12, boxShadow: shadowPrimary }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, opacity: 0.8, letterSpacing: ".06em" }}>LEVEL {stats.level}</div>
            <div style={{ fontSize: 13, fontWeight: 600, opacity: 0.9, marginTop: 3 }}>{10 - stats.intoLevel} to Level {stats.level + 1}</div>
          </div>
          <div style={{ display: "flex", gap: 18, textAlign: "center" }}>
            {[{ v: stats.streak, l: "Streak" }, { v: stats.perfectWeeks, l: "Perfect" }, { v: stats.total, l: "Total" }].map((s, i) => (
              <div key={i}><div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1 }}>{s.v}</div><div style={{ fontSize: 10.5, fontWeight: 600, opacity: 0.8, marginTop: 4 }}>{s.l}</div></div>
            ))}
          </div>
        </div>
        <div style={{ height: 8, background: "rgba(255,255,255,.22)", borderRadius: 5, marginTop: 14, overflow: "hidden" }}>
          <div style={{ height: "100%", width: (stats.intoLevel * 10) + "%", background: "#fff", borderRadius: 5 }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, fontSize: 12.5, fontWeight: 600 }}>
          <span style={{ opacity: 0.85 }}>This week</span>
          <span>{stats.thisWeekScheduled > 0 ? stats.thisWeekDone + " of " + stats.thisWeekScheduled + " scheduled days" : "No schedule set"}</span>
        </div>
        {stats.thisWeekScheduled > 0 && <div style={{ height: 5, background: "rgba(255,255,255,.22)", borderRadius: 3, marginTop: 6, overflow: "hidden" }}><div style={{ height: "100%", width: weekPct + "%", background: weekPct >= 100 ? "#4ade80" : "#fff", borderRadius: 3 }} /></div>}
      </div>

      {/* Last 30 days */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
        {tiles.map((s, i) => (
          <div key={i} style={{ background: "#fff", borderRadius: 16, padding: "14px 14px 12px", border: "1px solid " + BORDER, boxShadow: shadowSm }}>
            <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 700, letterSpacing: ".03em", textTransform: "uppercase" }}>{s.l}</div>
            <div style={{ fontSize: 26, fontWeight: 800, color: "#1a2332", margin: "4px 0 2px" }}>{s.v}</div>
            {s.d !== undefined ? <Delta value={s.d} /> : <span style={{ fontSize: 11.5, fontWeight: 700, color: freshPrs ? "#f59e0b" : "#9ca3af" }}>{freshPrs ? "Keep it rolling" : "Last 30 days"}</span>}
          </div>
        ))}
      </div>

      {/* Exercise progress */}
      {lifts.length > 0 && (
        <div style={Object.assign({}, cardStyle, { overflow: "visible" })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Strength Trend</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>Estimated 1-rep max</span>
          </div>
          <Dropdown value={activeEx} onChange={setExId} options={lifts.map((l) => ({ value: l.id, label: exLabel(l.id), meta: l.sessions + "x" }))} />
          <div style={{ marginTop: 12 }}><LineChart points={histPts} /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: 12 }}>
            {[
              { v: histBest.best ? histBest.best + " lb" : "-", l: "Best e1RM" },
              { v: histBest.top ? histBest.top.weight + " × " + histBest.top.reps : "-", l: "Best Set" },
              { v: histFirst && histBest.best ? (histBest.best - histFirst >= 0 ? "+" : "") + (histBest.best - histFirst) + " lb" : "-", l: "Since First" },
            ].map((s, i) => (
              <div key={i} style={{ background: "#f7f9fc", borderRadius: 12, padding: "10px 6px", textAlign: "center" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#1a2332" }}>{s.v}</div>
                <div style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 700, marginTop: 2 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly volume */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Weekly Volume</span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>lb lifted, last 8 weeks</span>
        </div>
        <BarChart bars={weeks.map((w) => ({ value: w.volume, label: w.label }))} format={fmtVolume} />
      </div>

      {/* Personal records */}
      {prs.length > 0 && (
        <div style={cardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Personal Records</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>{prs.length} lifts</span>
          </div>
          {(showAllPrs ? prs : prs.slice(0, 5)).map((p, i) => (
            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 0", borderTop: i === 0 ? "none" : "1px solid #f3f4f6" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
                  {p.fresh && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, color: "#b45309", background: "#fef3c7", borderRadius: 6, padding: "2px 6px", letterSpacing: ".04em" }}>NEW</span>}
                </div>
                <div style={{ fontSize: 12.5, color: "#9ca3af", marginTop: 2 }}>{p.top.weight} × {p.top.reps} on {prettyShort(p.date)}</div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{p.best} lb</div>
                {p.gain > 0 ? <div style={{ fontSize: 11.5, fontWeight: 700, color: "#16a34a" }}>+{p.gain} lb</div> : <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>e1RM</div>}
              </div>
            </div>
          ))}
          {prs.length > 5 && <button onClick={() => setShowAllPrs(!showAllPrs)} style={{ width: "100%", background: "none", border: "none", color: "#1a73e8", fontSize: 14, fontWeight: 700, padding: "10px 0 2px" }}>{showAllPrs ? "Show less" : "Show all " + prs.length}</button>}
        </div>
      )}

      {/* Muscle balance + consistency side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 12 }}>
        <div style={Object.assign({}, cardStyle, { marginBottom: 0 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Muscle Balance</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>sets, 30 days</span>
          </div>
          {groups.length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", margin: 0 }}>No sets in the last 30 days.</p>}
          {groups.map((g) => (
            <div key={g.group} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
              <span style={{ width: 82, flexShrink: 0, fontSize: 12.5, fontWeight: 600, color: "#374151" }}>{g.group}</span>
              <div style={{ flex: 1, height: 9, background: "#f1f3f6", borderRadius: 5, overflow: "hidden" }}>
                <div style={{ height: "100%", width: (g.sets / groupMax) * 100 + "%", background: "#1a73e8", borderRadius: 5 }} />
              </div>
              <span style={{ width: 26, flexShrink: 0, textAlign: "right", fontSize: 12.5, fontWeight: 700 }}>{g.sets}</span>
            </div>
          ))}
        </div>
        <div style={Object.assign({}, cardStyle, { marginBottom: 0 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Consistency</span>
            <span style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af" }}>last 10 weeks</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: 6 }}>
            {DAY_ABBR.map((d, i) => <span key={i} style={{ fontSize: 10, fontWeight: 600, color: "#c7ccd4", textAlign: "center" }}>{d[0]}</span>)}
          </div>
          {grid.map((row, ri) => (
            <div key={ri} style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 5, marginBottom: ri < grid.length - 1 ? 5 : 0 }}>
              {row.map((c, ci) => <div key={ci} style={{ height: 16, borderRadius: 4, background: c.done ? "#22c55e" : c.future ? "transparent" : "#f1f3f6", border: c.isToday ? "2px solid #1a73e8" : c.future ? "1px dashed #e3e8ef" : "none" }} />)}
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontSize: 15, fontWeight: 800 }}>Achievements</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#9ca3af" }}>{earnedCount} / {badges.length}</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {badges.map((b) => (
            <div key={b.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 6, background: b.earned ? "#fffbeb" : "#f7f9fc", borderRadius: 12, padding: "11px 6px", opacity: b.earned ? 1 : 0.6 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", background: b.earned ? "linear-gradient(135deg,#f6c453,#e69a17)" : "#e5e9ef" }}>
                {b.earned
                  ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" /></svg>
                  : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
              </div>
              <div style={{ fontSize: 11.5, fontWeight: 700, lineHeight: 1.15, textWrap: "balance" }}>{b.label}</div>
              <div style={{ fontSize: 10, color: "#9ca3af", lineHeight: 1.2, textWrap: "balance" }}>{b.req}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function prettyShort(dateStr) {
  const p = String(dateStr || "").split("-").map(Number);
  if (p.length < 3) return dateStr || "";
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function Avatar(props) {
  const size = props.size || 40;
  const p = props.person || {};
  const initial = (p.username || "?").charAt(0).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "#1a2332", flexShrink: 0, overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: props.ring ? "2px solid #fff" : "none" }}>
      {p.avatar ? <img src={p.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: size * 0.42, fontWeight: 800, color: "#fff" }}>{initial}</span>}
    </div>
  );
}

function FriendsFeed(props) {
  const social = props.social;
  const [manage, setManage] = useState(false);
  const st = social.state;
  const feed = social.feed;
  useEffect(() => { social.loadSocial(); social.loadFeed(); }, []);

  return (
    <div>
      {st.incoming.length > 0 && (
        <div style={Object.assign({}, cardStyle, { background: "#f0f5ff", borderColor: "#dbe9fd" })}>
          <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Friend Requests</div>
          {st.incoming.map((r) => <RequestRow key={r.id} req={r} social={social} />)}
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", flex: 1, minWidth: 0, alignItems: "center" }}>
          {st.friends.slice(0, 5).map((f, i) => <div key={f.id} style={{ marginLeft: i ? -10 : 0 }}><Avatar person={f} size={34} ring /></div>)}
          <span style={{ marginLeft: st.friends.length ? 10 : 0, fontSize: 14, fontWeight: 700, color: "#374151" }}>{st.friends.length ? st.friends.length + (st.friends.length === 1 ? " friend" : " friends") : "No friends yet"}</span>
        </div>
        <button onClick={() => setManage(true)} style={{ flexShrink: 0, background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "10px 14px", fontSize: 13.5, fontWeight: 700, minHeight: 42, display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM19 8v6M22 11h-6" /></svg>
          Add Friends
        </button>
      </div>

      {!feed.loaded && feed.loading && <div style={{ textAlign: "center", padding: 30, color: "#9ca3af", fontSize: 14 }}>Loading feed...</div>}
      {feed.error && <div style={Object.assign({}, cardStyle, { textAlign: "center", color: "#dc2626", fontSize: 14 })}>Could not load the feed. <button onClick={social.loadFeed} style={{ background: "none", border: "none", color: "#1a73e8", fontWeight: 700, fontSize: 14 }}>Retry</button></div>}
      {feed.loaded && feed.posts.length === 0 && (
        <div style={Object.assign({}, cardStyle, { padding: 26, textAlign: "center" })}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>Your Feed Is Quiet</div>
          <p style={{ fontSize: 14, color: "#6b7280", lineHeight: 1.5, margin: "8px 0 0" }}>{st.friends.length ? "When you or your friends post a finished workout, it shows up here." : "Add friends by username, then post your workouts from the finish screen to see each other's training here."}</p>
        </div>
      )}
      {feed.posts.map((p) => <PostCard key={p.id} post={p} social={social} />)}
      {feed.loaded && feed.posts.length > 0 && (
        <button onClick={social.loadFeed} style={{ width: "100%", background: "none", border: "none", color: "#1a73e8", fontSize: 14, fontWeight: 700, padding: "8px 0 4px" }}>{feed.loading ? "Refreshing..." : "Refresh"}</button>
      )}
      {manage && <FriendsSheet social={social} onClose={() => setManage(false)} />}
    </div>
  );
}

function RequestRow(props) {
  const { req, social } = props;
  const [busy, setBusy] = useState(false);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0" }}>
      <Avatar person={req.person} size={38} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{req.person.username}</span>
      <button disabled={busy} onClick={async () => { setBusy(true); await social.removeFriendship(req.id, true); setBusy(false); }} style={{ flexShrink: 0, background: "#fff", color: "#6b7280", border: "1px solid " + BORDER, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, minHeight: 38 }}>Decline</button>
      <button disabled={busy} onClick={async () => { setBusy(true); await social.acceptRequest(req.id); setBusy(false); }} style={{ flexShrink: 0, background: "#1a73e8", color: "#fff", border: "none", borderRadius: 10, padding: "8px 14px", fontSize: 13, fontWeight: 700, minHeight: 38 }}>Accept</button>
    </div>
  );
}

function PostCard(props) {
  const { post, social } = props;
  const s = post.summary || {};
  const a = post.author || {};
  const dur = s.durationSec ? fmtDur(s.durationSec) : "";
  const meta = [s.date ? prettyShort(s.date) : "", dur, s.location || ""].filter(Boolean).join("  ·  ");
  const stats = [{ v: s.sets || 0, l: "Sets" }];
  if (s.vol) stats.push({ v: fmtVolume(s.vol), l: "Volume" });
  if (s.pct != null && s.pct !== 0) stats.push({ v: (s.pct > 0 ? "+" : "") + s.pct + "%", l: "vs Last" });
  if (dur) stats.push({ v: dur, l: "Time" });
  const tiles = stats.slice(0, 4);
  return (
    <div style={Object.assign({}, cardStyle, { padding: 0 })}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px 0" }}>
        <Avatar person={a} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14.5, fontWeight: 800 }}>{post.mine ? "You" : "@" + (a.username || "lifter")}</div>
          <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 1 }}>{relTime(post.created_at)}</div>
        </div>
        {post.mine && <button onClick={() => social.deletePost(post)} aria-label="Delete post" style={closeBtn}>✕</button>}
      </div>
      <div style={{ padding: "10px 16px 0" }}>
        <div style={{ fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{s.name || "Workout"}</div>
        {meta && <div style={{ fontSize: 12.5, color: "#6b7280", marginTop: 3 }}>{meta}</div>}
        {post.caption && <p style={{ fontSize: 14.5, color: "#1a2332", lineHeight: 1.45, margin: "10px 0 0", whiteSpace: "pre-wrap" }}>{post.caption}</p>}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(" + tiles.length + ",1fr)", gap: 8, padding: "12px 16px 0" }}>
        {tiles.map((x, i) => (
          <div key={i} style={{ background: "#f7f9fc", borderRadius: 12, padding: "9px 6px", textAlign: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: x.l === "vs Last" ? (String(x.v).charAt(0) === "+" ? "#16a34a" : "#dc2626") : "#1a2332" }}>{x.v}</div>
            <div style={{ fontSize: 10.5, color: "#9ca3af", fontWeight: 700, marginTop: 1 }}>{x.l}</div>
          </div>
        ))}
      </div>
      {(s.prs || []).length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "10px 16px 0" }}>
          {s.prs.map((p, i) => <span key={i} style={{ fontSize: 12, fontWeight: 700, color: "#b45309", background: "#fef3c7", borderRadius: 8, padding: "4px 8px" }}>PR {p.name}{p.weight ? " " + p.weight + "×" + p.reps : ""}</span>)}
        </div>
      )}
      {(s.topLifts || []).length > 0 && (
        <div style={{ padding: "8px 16px 0" }}>
          {s.topLifts.slice(0, 4).map((l, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 13.5, padding: "6px 0", borderTop: i ? "1px solid #f3f4f6" : "none" }}>
              <span style={{ fontWeight: 600, color: "#374151", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</span>
              <span style={{ fontWeight: 700, flexShrink: 0 }}>{l.weight ? l.weight + " × " + l.reps : l.sets + " sets"}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px 12px", marginTop: 6, borderTop: "1px solid #f3f4f6" }}>
        <button onClick={() => social.toggleLike(post)} style={{ display: "flex", alignItems: "center", gap: 7, background: post.liked ? "#fff7ed" : "none", border: "none", borderRadius: 10, padding: "8px 10px", minHeight: 38, color: post.liked ? "#ea580c" : "#6b7280", fontSize: 13.5, fontWeight: 700 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={post.liked ? "#f97316" : "none"} stroke={post.liked ? "#f97316" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z" /></svg>
          {post.likeCount > 0 ? post.likeCount + " " : ""}Props
        </button>
        {post.likers && post.likers.length > 0 && <span style={{ fontSize: 12, color: "#9ca3af", minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>from {post.likers.slice(0, 3).join(", ")}{post.likers.length > 3 ? " +" + (post.likers.length - 3) : ""}</span>}
      </div>
    </div>
  );
}

function FriendsSheet(props) {
  const social = props.social;
  const st = social.state;
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    const h = cleanUsername(q);
    if (h.length < 2) { setResults([]); return; }
    let live = true;
    setSearching(true);
    const t = setTimeout(async () => {
      const r = await social.searchUsers(h);
      if (live) { setResults(r); setSearching(false); }
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  function relation(uid) {
    if (st.friends.some((f) => f.user_id === uid)) return "friend";
    if (st.outgoing.some((f) => f.person.user_id === uid)) return "sent";
    if (st.incoming.some((f) => f.person.user_id === uid)) return "incoming";
    return "none";
  }
  async function add(username, uid) { setBusyId(uid); await social.sendFriendRequest(username); setBusyId(null); }

  const smallBtn = { flexShrink: 0, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, minHeight: 38 };
  return (
    <div style={overlay}>
      <div style={sheet}>
        <div style={sheetHead}>
          <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>Friends</h2>
          <button onClick={props.onClose} style={xBtn}>✕</button>
        </div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 600, color: "#9ca3af" }}>@</span>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by username" autoCapitalize="none" autoCorrect="off" style={Object.assign({}, fieldStyle, { paddingLeft: 30 })} />
        </div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {cleanUsername(q).length >= 2 && (
            <div style={{ marginBottom: 16 }}>
              {searching && <div style={{ fontSize: 13, color: "#9ca3af", padding: "6px 2px" }}>Searching...</div>}
              {!searching && results.length === 0 && <div style={{ fontSize: 13, color: "#9ca3af", padding: "6px 2px" }}>No one found with that username.</div>}
              {results.map((u) => {
                const rel = relation(u.user_id);
                return (
                  <div key={u.user_id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                    <Avatar person={u} size={38} />
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{u.username}</span>
                    {rel === "friend" && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#16a34a" }}>Friends</span>}
                    {rel === "sent" && <span style={{ fontSize: 12.5, fontWeight: 700, color: "#9ca3af" }}>Requested</span>}
                    {rel === "incoming" && <button onClick={() => { const r = st.incoming.find((x) => x.person.user_id === u.user_id); if (r) social.acceptRequest(r.id); }} style={Object.assign({}, smallBtn, { background: "#1a73e8", color: "#fff", border: "none" })}>Accept</button>}
                    {rel === "none" && <button disabled={busyId === u.user_id} onClick={() => add(u.username, u.user_id)} style={Object.assign({}, smallBtn, { background: "#1a73e8", color: "#fff", border: "none" })}>{busyId === u.user_id ? "..." : "Add"}</button>}
                  </div>
                );
              })}
            </div>
          )}

          {st.incoming.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={labelStyle}>Requests</div>
              {st.incoming.map((r) => <RequestRow key={r.id} req={r} social={social} />)}
            </div>
          )}

          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Your Friends ({st.friends.length})</div>
            {st.friends.length === 0 && <p style={{ fontSize: 13.5, color: "#9ca3af", margin: 0 }}>Search a username above to send a request. Your username is @{st.me ? st.me.username : "..."}, share it so friends can find you.</p>}
            {st.friends.map((f) => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                <Avatar person={f} size={38} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{f.username}</span>
                <button onClick={async () => { const yes = await appConfirm({ title: "Remove friend?", message: "@" + f.username + " will no longer see your posts, and you won't see theirs.", confirmLabel: "Remove", danger: true }); if (yes) social.removeFriendship(f.id); }} style={Object.assign({}, smallBtn, { background: "#fff", color: "#6b7280", border: "1px solid " + BORDER })}>Remove</button>
              </div>
            ))}
          </div>

          {st.outgoing.length > 0 && (
            <div>
              <div style={labelStyle}>Sent</div>
              {st.outgoing.map((r) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <Avatar person={r.person} size={38} />
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14.5, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>@{r.person.username}</span>
                  <button onClick={() => social.removeFriendship(r.id, true)} style={Object.assign({}, smallBtn, { background: "#fff", color: "#6b7280", border: "1px solid " + BORDER })}>Cancel</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SETTINGS SHEET ───
function SettingsSheet(props) {
  const p = props.profile;
  const [weight, setWeight] = useState(String(p.weight || ""));
  const [rest, setRest] = useState(String(p.restSeconds || 120));
  const [building, setBuilding] = useState(false);
  const [planLib, setPlanLib] = useState(false);
  const [editingSplit, setEditingSplit] = useState(null);

  const splits = props.splits || [];

  async function confirmRemoveSplit(s) {
    const yes = await appConfirm({ title: "Delete workout?", message: '"' + s.name + '" will be removed from your splits. This cannot be undone.', confirmLabel: "Delete", danger: true });
    if (yes && props.onRemoveSplit) props.onRemoveSplit(s.id);
  }

  function save() {
    props.onSave({
      weight: Number(weight) || DEFAULT_WEIGHT,
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
            <div style={labelStyle}>Default Rest Timer (seconds)</div>
            <input style={fieldStyle} type="number" inputMode="numeric" value={rest} onChange={(e) => setRest(e.target.value)} placeholder="120" />
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              {[["Off", "0"], ["60s", "60"], ["90s", "90"], ["2m", "120"], ["3m", "180"]].map(([lbl, val]) => (
                <button key={val} onClick={() => setRest(val)} style={{ flex: 1, minWidth: 56, background: rest === val ? "#1a73e8" : "#fff", color: rest === val ? "#fff" : "#374151", border: rest === val ? "2px solid #1a73e8" : "2px solid #eaeef3", borderRadius: 12, padding: "10px 6px", fontSize: 13, fontWeight: 700, minHeight: 42 }}>{lbl}</button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: "#9ca3af", marginTop: 8 }}>The timer starts automatically when you check off a set. Set to 0 (Off) to disable it.</p>
          </div>

          {props.onAddSplit && (
            <div style={{ marginBottom: 16, borderTop: "1px solid #f3f4f6", paddingTop: 16 }}>
              <div style={labelStyle}>Your Workouts</div>
              {splits.length === 0 && <p style={{ color: "#9ca3af", fontSize: 14, marginTop: 0, marginBottom: 12 }}>No workouts yet.</p>}
              {splits.map((s) => (
                <div key={s.id || s.name} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 0", borderBottom: "1px solid #f3f4f6" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 500 }}>{s.name}</div>
                    <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{(s.exercises || []).length} exercises</div>
                  </div>
                  {props.onUpdateSplit && s.id && <button onClick={() => setEditingSplit(s)} style={{ background: "#f0f5ff", border: "none", borderRadius: 9, color: "#1a73e8", fontSize: 13, fontWeight: 700, padding: "8px 14px", minHeight: 38, flexShrink: 0 }}>Edit</button>}
                  {props.onRemoveSplit && s.id && <button onClick={() => confirmRemoveSplit(s)} aria-label="remove workout" style={closeBtn}>✕</button>}
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button onClick={() => setBuilding(true)} style={{ flex: 1, background: "#f0f5ff", border: "1px dashed #1a73e8", borderRadius: 12, padding: "12px", color: "#1a73e8", fontSize: 13, fontWeight: 700, minHeight: 48 }}>+ New Workout</button>
                <button onClick={() => setPlanLib(true)} style={{ flex: 1, background: "#fff", border: "1px solid #eaeef3", borderRadius: 12, padding: "12px", color: "#374151", fontSize: 13, fontWeight: 700, minHeight: 48 }}>Browse Plans</button>
              </div>
            </div>
          )}
        </div>
        <button onClick={save} style={{ width: "100%", background: "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "16px", fontSize: 15, fontWeight: 700, minHeight: 52, marginTop: 8 }}>Save</button>
        {props.onSignOut && <button onClick={props.onSignOut} style={{ width: "100%", background: "none", color: "#dc2626", border: "1px solid #fecaca", borderRadius: 12, padding: "14px", fontSize: 14, fontWeight: 700, minHeight: 48, marginTop: 10 }}>Sign Out</button>}
      </div>
      {building && <SplitBuilder onSave={props.onAddSplit} onCreateExercise={props.onCreateExercise} onClose={() => setBuilding(false)} />}
      {editingSplit && <SplitBuilder initial={editingSplit} onSave={props.onUpdateSplit} onCreateExercise={props.onCreateExercise} onClose={() => setEditingSplit(null)} />}
      {planLib && <PlanLibrary onApply={props.onApplyPlan} onClose={() => setPlanLib(false)} />}
    </div>
  );
}

// ─── COACH TAB (full-screen chat that knows your training log) ───
function renderInline(text, keyBase) {
  const out = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`)/g;
  let last = 0, m, k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={keyBase + "b" + k++} style={{ fontWeight: 800 }}>{tok.slice(2, -2)}</strong>);
    else out.push(<code key={keyBase + "c" + k++} style={{ background: "#eef1f5", borderRadius: 5, padding: "1px 5px", fontSize: "0.92em" }}>{tok.slice(1, -1)}</code>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function CoachMarkdown(props) {
  const lines = String(props.text || "").replace(/\r/g, "").split("\n");
  const blocks = [];
  let list = null;
  const flush = () => { if (list) { blocks.push(list); list = null; } };
  lines.forEach((raw) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*•]\s+(.*)$/);
    const num = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    const head = line.match(/^\s*#{1,4}\s+(.*)$/);
    if (bullet) { if (!list || list.type !== "ul") { flush(); list = { type: "ul", items: [] }; } list.items.push(bullet[1]); return; }
    if (num) { if (!list || list.type !== "ol") { flush(); list = { type: "ol", items: [] }; } list.items.push(num[2]); return; }
    flush();
    if (!line.trim()) { blocks.push({ type: "gap" }); return; }
    if (head) { blocks.push({ type: "h", text: head[1] }); return; }
    blocks.push({ type: "p", text: line });
  });
  flush();
  const cleaned = blocks.filter((b, i) => !(b.type === "gap" && (i === 0 || i === blocks.length - 1 || (blocks[i - 1] && blocks[i - 1].type === "gap"))));
  return (
    <div>
      {cleaned.map((b, i) => {
        if (b.type === "gap") return <div key={i} style={{ height: 8 }} />;
        if (b.type === "h") return <div key={i} style={{ fontSize: 15, fontWeight: 800, margin: "4px 0 4px" }}>{renderInline(b.text, i)}</div>;
        if (b.type === "p") return <div key={i}>{renderInline(b.text, i)}</div>;
        const Tag = b.type === "ol" ? "ol" : "ul";
        return (
          <Tag key={i} style={{ margin: "4px 0", paddingLeft: 20 }}>
            {b.items.map((it, j) => <li key={j} style={{ margin: "3px 0" }}>{renderInline(it, i + "-" + j)}</li>)}
          </Tag>
        );
      })}
    </div>
  );
}

function coachPrompts(workouts) {
  const lifts = loggedExercises(workouts);
  const top = lifts.length ? exLabel(lifts[0].id) : null;
  if (!workouts || !workouts.length) {
    return ["Build me a 4 day split", "How many sets per muscle a week?", "How do I warm up for heavy lifts?", "How much protein do I need?"];
  }
  return [
    "How did my last week go?",
    top ? "Am I progressing on " + top + "?" : "Am I progressing?",
    "What should I hit next workout?",
    "What does the research say about training to failure?",
  ];
}

function CoachTab(props) {
  const { workouts, profile, splits, weekSchedule } = props;
  const [messages, setMessages] = useState(() => {
    try { const d = localStorage.getItem("ff-chat"); return d ? JSON.parse(d) : []; } catch (e) { return []; }
  });
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);
  const taRef = useRef(null);
  // The running plan, if any, so the coach can answer running questions from the engine's numbers.
  const [runCtx, setRunCtx] = useState("");
  useEffect(() => { loadRunning().then((st) => setRunCtx(runningCoachContext(st))).catch(() => {}); }, []);

  useEffect(() => {
    try { localStorage.setItem("ff-chat", JSON.stringify(messages.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content, sources: m.sources || undefined })).slice(-60))); } catch (e) {}
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming, error]);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(120, ta.scrollHeight) + "px";
  }, [input]);

  async function run(history) {
    setError(null);
    setStreaming(true);
    setMessages(history.concat([{ role: "assistant", content: "" }]));
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    let acc = "";
    try {
      const sess = await supabase.auth.getSession();
      const token = sess && sess.data && sess.data.session ? sess.data.session.access_token : "";
      const resp = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          context: (runCtx ? "RUNNING PLAN (from the app's running engine; these numbers are facts):\n" + runCtx + "\n\nLIFTING:\n" : "") + coachContext(workouts, profile, splits, weekSchedule),
          today: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        }),
        signal: ctrl.signal,
      });
      if (!resp.ok) {
        let msg = "The coach is unavailable right now. Try again in a moment.";
        try { const j = await resp.json(); if (j && j.error) msg = j.error; } catch (e) {}
        if (resp.status === 401) msg = "Your session expired. Sign out and back in to use the coach.";
        throw new Error(msg);
      }
      const reply = { role: "assistant", content: "", sources: [], searches: [], searching: false };
      const push = () => { acc = reply.content; setMessages(history.concat([Object.assign({}, reply)])); };
      const handle = (line) => {
        if (!line.trim()) return;
        let ev;
        try { ev = JSON.parse(line); } catch (e) { reply.content += line; return; }
        if (ev.t === "text") { reply.content += ev.v; reply.searching = false; }
        else if (ev.t === "search") { reply.searches = reply.searches.concat([ev.v]); reply.searching = true; }
        else if (ev.t === "sources") reply.sources = Array.isArray(ev.v) ? ev.v : [];
        else if (ev.t === "error") throw new Error(ev.v);
      };
      const reader = resp.body && resp.body.getReader ? resp.body.getReader() : null;
      if (!reader) {
        (await resp.text()).split("\n").forEach(handle);
        push();
      } else {
        const dec = new TextDecoder();
        let buf = "";
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let i;
          while ((i = buf.indexOf("\n")) >= 0) { handle(buf.slice(0, i)); buf = buf.slice(i + 1); }
          push();
        }
        if (buf.trim()) { handle(buf); push(); }
      }
      if (!acc.trim()) throw new Error("The coach didn't answer. Try asking again.");
    } catch (e) {
      if (e && e.name === "AbortError") {
        setMessages((cur) => (acc.trim() ? cur : history));
      } else {
        setMessages((cur) => (acc.trim() ? cur : history));
        setError((e && e.message) || "The coach is unavailable right now.");
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  function send(text) {
    const content = (text != null ? text : input).trim();
    if (!content || streaming) return;
    setInput("");
    run(messages.filter((m) => m.content).concat([{ role: "user", content }]));
  }
  function retry() {
    const hist = messages.filter((m) => m.content);
    if (hist.length && hist[hist.length - 1].role === "user") run(hist);
  }
  function stop() { if (abortRef.current) abortRef.current.abort(); }
  async function newChat() {
    if (streaming) stop();
    if (messages.length) {
      const yes = await appConfirm({ title: "Start a new chat?", message: "This clears the current conversation.", confirmLabel: "New chat" });
      if (!yes) return;
    }
    setMessages([]); setError(null);
    try { localStorage.removeItem("ff-chat"); } catch (e) {}
  }
  function onKey(e) {
    if (e.key === "Enter" && !e.shiftKey && window.matchMedia && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); send(); }
  }

  const prompts = coachPrompts(workouts);
  const name = profile && profile.username ? profile.username : "";
  const userBubble = { background: "linear-gradient(135deg,#1a73e8,#1565d8)", color: "#fff", borderBottomRightRadius: 6, whiteSpace: "pre-wrap" };
  const botBubble = { background: "#fff", color: "#1a2332", border: "1px solid " + BORDER, borderBottomLeftRadius: 6, boxShadow: shadowSm };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100dvh - 186px)", minHeight: 380 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1a73e8,#0c47b7)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: shadowPrimary }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 6.5h11M6.5 17.5h11M3 9.5v5M21 9.5v5M6.5 4v16M17.5 4v16" /></svg>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.1 }}>Coach</div>
            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 2 }}>{workouts && workouts.length ? "Reads your training log" : "Training, programming, recovery"}</div>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={newChat} style={{ display: "flex", alignItems: "center", gap: 6, background: "#fff", border: "1px solid " + BORDER, borderRadius: 10, padding: "8px 12px", fontSize: 13, fontWeight: 700, color: "#374151", minHeight: 38, boxShadow: shadowSm }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /></svg>
            New
          </button>
        )}
      </div>

      <div ref={scrollRef} style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, padding: "2px 2px 12px", WebkitOverflowScrolling: "touch" }}>
        {messages.length === 0 && (
          <div style={{ margin: "auto 0", padding: "8px 0" }}>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.2, textWrap: "balance" }}>{name ? "Hey " + name + ", what are we working on?" : "What are we working on?"}</div>
            <p style={{ fontSize: 14.5, color: "#6b7280", lineHeight: 1.5, margin: "8px 0 18px", textWrap: "pretty" }}>Ask about your progress, your next session, form, or the research. I read your actual log and can look up current studies, with sources.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {prompts.map((q, i) => (
                <button key={i} onClick={() => send(q)} style={{ textAlign: "left", background: "#fff", border: "1px solid " + BORDER, borderRadius: 14, padding: "13px 14px", fontSize: 14, color: "#1a2332", fontWeight: 600, lineHeight: 1.35, boxShadow: shadowSm, minHeight: 64 }}>{q}</button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => {
          const isLast = i === messages.length - 1;
          if (m.role === "assistant" && !m.content && isLast && streaming && m.searches && m.searches.length) {
            return (
              <div key={i} style={{ display: "flex" }}>
                <div style={Object.assign({ borderRadius: 18, padding: "11px 14px", display: "flex", alignItems: "center", gap: 10, maxWidth: "88%" }, botBubble)}>
                  <span style={{ width: 16, height: 16, flexShrink: 0, border: "2px solid #dbe9fd", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                  <span style={{ fontSize: 13.5, color: "#6b7280", minWidth: 0 }}>Searching the web for <strong style={{ color: "#1a2332", fontWeight: 700 }}>{m.searches[m.searches.length - 1]}</strong></span>
                </div>
              </div>
            );
          }
          if (m.role === "assistant" && !m.content && isLast && streaming) {
            return (
              <div key={i} style={{ display: "flex" }}>
                <div style={Object.assign({ borderRadius: 18, padding: "14px 16px", display: "flex", gap: 5 }, botBubble)}>
                  {[0, 1, 2].map((d) => <span key={d} style={{ width: 7, height: 7, borderRadius: "50%", background: "#9ca3af", display: "inline-block", animation: "coachdot 1s " + (d * 0.15) + "s infinite ease-in-out" }} />)}
                </div>
              </div>
            );
          }
          return (
            <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
              <div style={Object.assign({ maxWidth: "88%", padding: "11px 14px", borderRadius: 18, fontSize: 14.5, lineHeight: 1.55, overflowWrap: "anywhere" }, m.role === "user" ? userBubble : botBubble)}>
                {m.role === "user" ? m.content : <CoachMarkdown text={m.content} />}
                {m.role === "assistant" && m.searching && isLast && streaming && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, fontSize: 13, color: "#6b7280" }}>
                    <span style={{ width: 14, height: 14, flexShrink: 0, border: "2px solid #dbe9fd", borderTopColor: "#1a73e8", borderRadius: "50%", animation: "spin .7s linear infinite" }} />
                    <span>Searching the web for <strong style={{ color: "#1a2332" }}>{m.searches[m.searches.length - 1]}</strong></span>
                  </div>
                )}
                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f0f2f5" }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: "#9ca3af", letterSpacing: ".04em", textTransform: "uppercase", marginBottom: 6 }}>Sources</div>
                    {m.sources.map((src, j) => {
                      let host = "";
                      try { host = new URL(src.url).hostname.replace(/^www\./, ""); } catch (e) {}
                      return (
                        <a key={j} href={src.url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "baseline", gap: 6, padding: "4px 0", fontSize: 13, color: "#1a73e8", textDecoration: "none", lineHeight: 1.35 }}>
                          <span style={{ flexShrink: 0, fontWeight: 700, color: "#9ca3af" }}>{j + 1}.</span>
                          <span style={{ minWidth: 0 }}><span style={{ fontWeight: 600 }}>{src.title}</span>{host && <span style={{ color: "#9ca3af" }}>{"  " + host}</span>}</span>
                        </a>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, padding: "11px 14px" }}>
            <span style={{ flex: 1, fontSize: 13.5, color: "#b91c1c", fontWeight: 600 }}>{error}</span>
            <button onClick={retry} style={{ flexShrink: 0, background: "#fff", border: "1px solid #fecaca", borderRadius: 10, padding: "7px 12px", fontSize: 13, fontWeight: 700, color: "#b91c1c", minHeight: 36 }}>Retry</button>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, background: "#fff", border: "1px solid " + BORDER, borderRadius: 18, boxShadow: shadowSm, padding: 6, display: "flex", gap: 6, alignItems: "flex-end" }}>
        <textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKey} rows={1} placeholder="Ask your coach..." style={{ flex: 1, resize: "none", border: "none", outline: "none", boxShadow: "none", background: "transparent", fontSize: 15, color: "#1a2332", padding: "10px 10px", maxHeight: 120, lineHeight: 1.4, fontFamily: "inherit" }} />
        {streaming ? (
          <button onClick={stop} aria-label="Stop" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "50%", border: "none", background: "#1a2332", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ width: 13, height: 13, borderRadius: 3, background: "#fff", display: "block" }} />
          </button>
        ) : (
          <button onClick={() => send()} disabled={!input.trim()} aria-label="Send" style={{ flexShrink: 0, width: 42, height: 42, borderRadius: "50%", border: "none", background: !input.trim() ? "#c7d6f0" : "linear-gradient(135deg,#1a73e8,#0c47b7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ─── WEEK BOARD (hold a day to lift + reorder; tap a day to assign; shows checks) ───
const ROW_H = 54;
function WeekBoard(props) {
  const { splits, workouts, tIdx, onSaveSchedule, onLoadSplit } = props;
  const known = new Set((splits || []).map((s) => s.id));
  const [sched, setSched] = useState(() => {
    const b = (props.schedule || []).slice();
    while (b.length < 7) b.push("rest");
    return b.slice(0, 7).map((v) => (v && v !== "rest" && known.has(v) ? v : "rest"));
  });
  const [dragIdx, setDragIdx] = useState(null);
  const [dy, setDy] = useState(0);
  const [assignDay, setAssignDay] = useState(null);
  const containerRef = useRef(null);
  const startRef = useRef(null);
  const holdRef = useRef(null);
  const tmRef = useRef(null);
  const done = weekDoneFlags(workouts);
  const splitById = (id) => (splits || []).find((s) => s.id === id);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const overIdx = dragIdx == null ? null : clamp(dragIdx + Math.round(dy / ROW_H), 0, 6);

  function rowShift(i) {
    if (dragIdx == null || i === dragIdx) return 0;
    if (dragIdx < overIdx && i > dragIdx && i <= overIdx) return -ROW_H;
    if (dragIdx > overIdx && i >= overIdx && i < dragIdx) return ROW_H;
    return 0;
  }

  function beginDrag(i) {
    if (containerRef.current && startRef.current && containerRef.current.setPointerCapture) { try { containerRef.current.setPointerCapture(startRef.current.pid); } catch (x) {} }
    setDragIdx(i); setDy(0);
    if (navigator.vibrate) navigator.vibrate(12);
    tmRef.current = (ev) => ev.preventDefault();
    window.addEventListener("touchmove", tmRef.current, { passive: false });
  }
  function endDrag() {
    if (tmRef.current) { window.removeEventListener("touchmove", tmRef.current); tmRef.current = null; }
    setDragIdx((from) => {
      if (from != null) {
        const to = clamp(from + Math.round(dy / ROW_H), 0, 6);
        if (to !== from) setSched((prev) => { const next = prev.slice(); const m = next.splice(from, 1)[0]; next.splice(to, 0, m); onSaveSchedule(next); return next; });
      }
      return null;
    });
    setDy(0);
  }

  function onDown(e) {
    const rowEl = e.target && e.target.closest ? e.target.closest("[data-row]") : null;
    if (!rowEl) return;
    const i = Number(rowEl.getAttribute("data-row"));
    startRef.current = { y: e.clientY, i: i, moved: false, t: Date.now(), pid: e.pointerId };
    holdRef.current = setTimeout(() => beginDrag(i), 170);
  }
  function onMove(e) {
    const st = startRef.current; if (!st) return;
    const d = e.clientY - st.y;
    if (dragIdx == null) {
      if (!st.moved && Math.abs(d) > 10) { st.moved = true; clearTimeout(holdRef.current); } // a scroll, not a hold
      return;
    }
    setDy(clamp(d, -(dragIdx) * ROW_H - 10, (6 - dragIdx) * ROW_H + 10));
  }
  function onUp() {
    const st = startRef.current; startRef.current = null;
    clearTimeout(holdRef.current);
    if (dragIdx != null) { endDrag(); return; }
    if (st && !st.moved && Date.now() - st.t < 400) setAssignDay(st.i);
  }

  function assign(dayIdx, val) {
    setSched((prev) => { const next = prev.slice(); next[dayIdx] = val; onSaveSchedule(next); return next; });
    setAssignDay(null);
  }

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={Object.assign({}, labelStyle, { marginBottom: 8 })}>This Week</div>
      <div ref={containerRef} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ position: "relative", background: "#fff", border: "1px solid " + BORDER, borderRadius: 16, boxShadow: shadowSm, overflow: "hidden" }}>
        {sched.map((val, i) => {
          const split = val && val !== "rest" ? splitById(val) : null;
          const isToday = i === tIdx;
          const lifted = i === dragIdx;
          const shift = lifted ? dy : rowShift(i);
          return (
            <div
              key={i}
              data-row={i}
              style={{ display: "flex", alignItems: "center", gap: 10, height: ROW_H, padding: "0 12px 0 14px", boxSizing: "border-box", background: isToday ? "#f0f5ff" : "#fff", borderBottom: i < 6 ? "1px solid #f3f4f6" : "none", transform: "translateY(" + shift + "px)" + (lifted ? " scale(1.02)" : ""), transition: lifted ? "none" : "transform .16s cubic-bezier(.22,1,.36,1)", boxShadow: lifted ? "0 10px 24px rgba(16,24,40,.18)" : "none", zIndex: lifted ? 5 : 1, position: "relative", touchAction: "pan-y", cursor: "grab" }}
            >
              <span style={{ flexShrink: 0, color: "#c7ccd4", display: "flex", flexDirection: "column", gap: 2, lineHeight: 0 }} aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M4 8h16M4 16h16" /></svg>
              </span>
              <span style={{ flexShrink: 0, width: 34, fontSize: 13, fontWeight: 700, color: isToday ? "#1a73e8" : "#9ca3af" }}>{DAY_ABBR[i]}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 15, fontWeight: split ? 600 : 400, color: split ? "#1a2332" : "#9ca3af", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{split ? split.name : "Rest"}</span>
              {isToday && <span style={{ flexShrink: 0, fontSize: 10, fontWeight: 700, color: "#1a73e8", background: "#dbe9fd", borderRadius: 6, padding: "3px 7px", letterSpacing: ".03em" }}>TODAY</span>}
              {done[i] && (
                <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: "#22c55e", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="completed">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "10px 2px 0", lineHeight: 1.4 }}>Press and hold a day to lift it, then drag to reorder. Tap a day to set its workout. Green checks mark days you trained.</p>
      {(splits || []).length === 0 && <p style={{ fontSize: 13, color: "#9ca3af", marginTop: 6 }}>Create a workout first (Settings, top right) and it will show up here.</p>}

      {assignDay != null && (
        <div style={overlay} onClick={() => setAssignDay(null)}>
          <div onClick={(e) => e.stopPropagation()} style={Object.assign({}, sheet, { maxWidth: 380 })}>
            <div style={sheetHead}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{DAY_FULL[assignDay]}</h2>
              <button onClick={() => setAssignDay(null)} style={xBtn}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>
              {(splits || []).map((s) => {
                const active = sched[assignDay] === s.id;
                return (
                  <button key={s.id} onClick={() => assign(assignDay, s.id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: active ? "#f0f5ff" : "none", border: "none", borderBottom: "1px solid #f3f4f6", padding: "15px 6px", minHeight: 52, fontSize: 16, fontWeight: active ? 700 : 500, color: active ? "#1a73e8" : "#1a2332" }}>
                    {s.name}
                    {active && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                  </button>
                );
              })}
              <button onClick={() => assign(assignDay, "rest")} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", textAlign: "left", background: sched[assignDay] === "rest" ? "#f0f5ff" : "none", border: "none", padding: "15px 6px", minHeight: 52, fontSize: 16, fontWeight: sched[assignDay] === "rest" ? 700 : 500, color: sched[assignDay] === "rest" ? "#1a73e8" : "#6b7280" }}>
                Rest
                {sched[assignDay] === "rest" && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </button>
            </div>
            {sched[assignDay] !== "rest" && splitById(sched[assignDay]) && (
              <button onClick={() => { const sp = splitById(sched[assignDay]); setAssignDay(null); if (sp) onLoadSplit(sp); }} style={Object.assign({}, primaryBtn, { borderRadius: 12, minHeight: 50, marginTop: 10 })}>Start this workout</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── PROFILE TAB (avatar + username + friends + stats) ───
function ProfileTab(props) {
  const { profile, workouts, weekSchedule, onSave, onSignOut, social } = props;
  const st = social.state;
  const handle = st.me ? st.me.username : (profile.username || "");
  const [username, setUsername] = useState(handle);
  const [busy, setBusy] = useState(false);
  const [manage, setManage] = useState(false);
  const fileRef = useRef(null);
  const stats = computeGameStats(workouts, weekSchedule);
  const prs = personalRecords(workouts);

  useEffect(() => { social.loadSocial(); }, []);
  useEffect(() => { setUsername(handle); }, [handle]);

  function pickPhoto() { if (fileRef.current) fileRef.current.click(); }
  function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const size = 256;
        const c = document.createElement("canvas");
        c.width = size; c.height = size;
        const ctx = c.getContext("2d");
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale, h = img.height * scale;
        ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
        onSave({ avatar: c.toDataURL("image/jpeg", 0.85) }, "Photo updated");
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  async function saveName() {
    setBusy(true);
    await social.setHandle(username);
    setBusy(false);
  }

  const initial = (handle || "?").charAt(0).toUpperCase();
  const cleaned = cleanUsername(username);
  const changed = cleaned && cleaned !== cleanUsername(handle);
  const stat = [
    { v: stats.total, l: "Workouts" },
    { v: st.friends.length, l: "Friends" },
    { v: prs.length, l: "PRs Tracked" },
  ];

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "8px 0 20px" }}>
        <button onClick={pickPhoto} aria-label="Change photo" style={{ position: "relative", width: 104, height: 104, borderRadius: "50%", border: "none", padding: 0, background: "#1a2332", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", boxShadow: "0 6px 20px rgba(16,24,40,.18)" }}>
          {profile.avatar ? <img src={profile.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span style={{ fontSize: 42, fontWeight: 800, color: "#fff" }}>{initial}</span>}
          <span style={{ position: "absolute", right: 4, bottom: 4, width: 30, height: 30, borderRadius: "50%", background: "#1a73e8", border: "3px solid #f5f7fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
          </span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} style={{ display: "none" }} />
        <div style={{ fontSize: 22, fontWeight: 800, marginTop: 14 }}>{handle ? "@" + handle : "Add a username"}</div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af", marginTop: 3 }}>Level {stats.level}  ·  {stats.streak} week streak</div>
      </div>

      <div style={{ display: "flex", background: "#fff", border: "1px solid " + BORDER, borderRadius: 16, boxShadow: shadowSm, padding: "16px 0", marginBottom: 12 }}>
        {stat.map((s, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid #f0f2f5" : "none" }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{s.v}</div>
            <div style={{ fontSize: 11.5, fontWeight: 600, color: "#9ca3af", marginTop: 3 }}>{s.l}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 12, marginBottom: 12 }}>
        <div style={Object.assign({}, cardStyle, { marginBottom: 0 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <span style={{ fontSize: 15, fontWeight: 800 }}>Friends</span>
            {st.incoming.length > 0 && <span style={{ fontSize: 11.5, fontWeight: 800, color: "#fff", background: "#ef4444", borderRadius: 9, padding: "2px 8px" }}>{st.incoming.length} new</span>}
          </div>
          <div style={{ display: "flex", alignItems: "center", minHeight: 38, marginBottom: 12 }}>
            {st.friends.length === 0 && <span style={{ fontSize: 13.5, color: "#9ca3af" }}>Add friends to see each other's workouts.</span>}
            {st.friends.slice(0, 7).map((f, i) => <div key={f.id} style={{ marginLeft: i ? -10 : 0 }}><Avatar person={f} size={36} ring /></div>)}
            {st.friends.length > 7 && <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 700, color: "#6b7280" }}>+{st.friends.length - 7}</span>}
          </div>
          <button onClick={() => setManage(true)} style={{ width: "100%", background: "#f0f5ff", color: "#1a73e8", border: "1px solid #dbe9fd", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, minHeight: 46 }}>{st.incoming.length ? "Review Requests" : "Find Friends"}</button>
        </div>

        <div style={Object.assign({}, cardStyle, { marginBottom: 0 })}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 12 }}>Username</div>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontSize: 16, fontWeight: 600, color: "#9ca3af" }}>@</span>
            <input style={Object.assign({}, fieldStyle, { paddingLeft: 30, padding: "12px 16px 12px 30px" })} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" autoCapitalize="none" autoCorrect="off" />
          </div>
          <p style={{ fontSize: 12.5, color: "#9ca3af", margin: "8px 0 12px", lineHeight: 1.45 }}>Friends find you by this. Letters, numbers, dots, dashes, underscores.</p>
          <button onClick={saveName} disabled={busy || !changed} style={{ width: "100%", background: busy || !changed ? "#c7d6f0" : "#1a73e8", color: "#fff", border: "none", borderRadius: 12, padding: "12px", fontSize: 14, fontWeight: 700, minHeight: 46 }}>{busy ? "Saving..." : "Save Username"}</button>
        </div>
      </div>

      {onSignOut && <button onClick={onSignOut} style={{ width: "100%", background: "#fff", color: "#dc2626", border: "1px solid " + BORDER, borderRadius: 16, padding: "15px", fontSize: 15, fontWeight: 700, minHeight: 52, boxShadow: shadowSm }}>Sign Out</button>}
      {manage && <FriendsSheet social={social} onClose={() => setManage(false)} />}
    </div>
  );
}


// ─── WORKOUT SHARE STUDIO (post-workout, configurable) ───
function prettyDate(dateStr) {
  const p = dateStr.split("-").map(Number);
  return new Date(p[0], p[1] - 1, p[2]).toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
}
function fmtDur(sec) {
  if (!sec || sec < 1) return "";
  const m = Math.round(sec / 60);
  if (m < 60) return m + " min";
  return Math.floor(m / 60) + "h " + String(m % 60).padStart(2, "0") + "m";
}
const SHARE_DEFAULT = { duration: true, location: false, address: false, volume: true, topSets: true, weights: true };

function WorkoutShareModal(props) {
  const { data, profile } = props;
  const [cfg, setCfg] = useState(Object.assign({}, SHARE_DEFAULT, profile.shareConfig || {}));
  const [locationText, setLocationText] = useState("");
  const [addressText, setAddressText] = useState("");
  const [places, setPlaces] = useState([]);
  const [geoBusy, setGeoBusy] = useState(false);
  const [working, setWorking] = useState(false);
  const [caption, setCaption] = useState("");
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);
  const durText = fmtDur(data.durationSec);
  const pctText = data.pct != null && data.pct > 0 ? "+" + data.pct + "%" : (data.pct != null ? data.pct + "%" : null);

  function persist(next) { if (props.onSaveProfile) props.onSaveProfile({ shareConfig: next }); }
  function toggle(key) { setCfg((c) => { const n = Object.assign({}, c, { [key]: !c[key] }); persist(n); if (key === "location" && !c.location && !places.length) fetchPlaces(); return n; }); }

  function osmAddr(t) {
    if (!t) return "";
    const l1 = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
    return [l1, t["addr:city"]].filter(Boolean).join(", ");
  }
  function fetchPlaces() {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const la = pos.coords.latitude, lo = pos.coords.longitude;
      let pointAddr = "";
      try {
        const rn = await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=" + la + "&lon=" + lo + "&zoom=18&addressdetails=1");
        const jn = await rn.json();
        const a = jn.address || {};
        pointAddr = [[a.house_number, a.road].filter(Boolean).join(" "), a.city || a.town || a.village, a.state].filter(Boolean).join(", ");
      } catch (e) {}
      let list = [];
      try {
        const q = "[out:json][timeout:8];(nwr(around:170," + la + "," + lo + ")[name];);out center tags 60;";
        const r = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: "data=" + encodeURIComponent(q) });
        const j = await r.json();
        (j.elements || []).forEach((el) => {
          const nm = el.tags && el.tags.name; if (!nm) return;
          const ela = el.lat != null ? el.lat : (el.center && el.center.lat);
          const elo = el.lon != null ? el.lon : (el.center && el.center.lon);
          if (ela == null || elo == null) return;
          const fit = !!(el.tags.leisure === "fitness_centre" || el.tags.amenity === "gym" || el.tags.sport === "fitness");
          list.push({ name: nm, address: osmAddr(el.tags) || pointAddr, fit: fit, d: (ela - la) * (ela - la) + (elo - lo) * (elo - lo) });
        });
      } catch (e) {}
      list.sort((a, b) => (b.fit - a.fit) || (a.d - b.d));
      const seen = {}; const top = [];
      for (const pl of list) { if (seen[pl.name]) continue; seen[pl.name] = 1; top.push(pl); if (top.length >= 6) break; }
      if (top.length === 0) {
        try {
          const r2 = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + la + "&longitude=" + lo + "&localityLanguage=en");
          const j2 = await r2.json();
          const city = [j2.city || j2.locality, j2.principalSubdivision].filter(Boolean).join(", ");
          if (city) top.push({ name: city, address: pointAddr });
        } catch (e) {}
      }
      setPlaces(top);
      if (top.length) { setLocationText(top[0].name); setAddressText(top[0].address || pointAddr); }
      else if (pointAddr) { setLocationText(pointAddr); }
      setGeoBusy(false);
    }, () => { setGeoBusy(false); }, { timeout: 9000, maximumAge: 600000 });
  }


  const bigVal = cfg.volume && data.vol > 0 ? data.vol.toLocaleString() : (pctText || (data.groups[0] || "Done"));
  const bigLbl = cfg.volume && data.vol > 0 ? "LBS VOLUME" : (pctText ? "VS LAST TIME" : "TRAINED");

  function draw() {
    const LOGO = "/train/icons/icon-192.png";
    function loadImg(src) { return new Promise((res) => { if (!src) { res(null); return; } const im = new Image(); im.onload = () => res(im); im.onerror = () => res(null); im.src = src; }); }
    return new Promise((resolve) => {
      const W = 1080, H = 1350, PAD = 90;
      const c = document.createElement("canvas"); c.width = W; c.height = H;
      const ctx = c.getContext("2d");
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, "#1a73e8"); g.addColorStop(1, "#0c3aa0");
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      function text(str, x, y, size, weight, color, align) { ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.font = weight + " " + size + "px Inter, -apple-system, Segoe UI, Roboto, sans-serif"; ctx.fillText(str, x, y); }
      function rrect(x, y, w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h); }
      Promise.all([loadImg(LOGO), loadImg(profile.avatar)]).then(function (imgs) {
        const logo = imgs[0], avatar = imgs[1];
        const ls = 60;
        if (logo) { ctx.save(); rrect(PAD, 76, ls, ls, 15); ctx.clip(); ctx.drawImage(logo, PAD, 76, ls, ls); ctx.restore(); }
        text("FORWARD FITNESS", PAD + (logo ? ls + 22 : 0), 120, 34, "800", "#fff", "left");
        const avY = 192, av = 88;
        if (avatar) { ctx.save(); ctx.beginPath(); ctx.arc(PAD + av / 2, avY + av / 2, av / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(avatar, PAD, avY, av, av); ctx.restore(); }
        text(profile.username ? "@" + profile.username : "Forward Fitness", PAD + (avatar ? av + 22 : 0), avY + av / 2 + 14, 40, "700", "#fff", "left");
        text(data.name.toUpperCase(), PAD, 470, 92, "800", "#fff", "left");
        let sub = prettyDate(data.date);
        if (cfg.duration && durText) sub += "   ·   " + durText;
        text(sub, PAD, 540, 38, "500", "rgba(255,255,255,.85)", "left");
        let yy = 592;
        if (cfg.location && locationText) { text(locationText, PAD, yy, 38, "600", "#fff", "left"); yy += 44; }
        if (cfg.location && cfg.address && addressText) { text(addressText, PAD, yy, 30, "500", "rgba(255,255,255,.7)", "left"); yy += 40; }
        const boxY = Math.max(650, yy + 8), boxH = 210, gap = 30, boxW = (W - PAD * 2 - gap) / 2;
        function box(x, big, small) { ctx.fillStyle = "rgba(255,255,255,.14)"; rrect(x, boxY, boxW, boxH, 28); ctx.fill(); text(big, x + boxW / 2, boxY + 118, 84, "800", "#fff", "center"); text(small, x + boxW / 2, boxY + 165, 32, "600", "rgba(255,255,255,.8)", "center"); }
        box(PAD, String(data.sets), "SETS");
        box(PAD + boxW + gap, bigVal, bigLbl);
        let ly = boxY + boxH + 110;
        if (cfg.topSets && (data.topLifts || []).length) {
          text("TOP SETS", PAD, ly, 30, "700", "rgba(255,255,255,.6)", "left"); ly += 46;
          data.topLifts.slice(0, 5).forEach((l) => {
            text(l.name, PAD, ly, 38, "600", "#fff", "left");
            const right = cfg.weights && l.weight ? l.weight + " x " + l.reps : l.sets + " sets";
            text(right, W - PAD, ly, 38, "700", "#fff", "right");
            ly += 60;
          });
        }
        text("forwardfitness.app", W / 2, H - 70, 34, "600", "rgba(255,255,255,.7)", "center");
        resolve(c);
      });
    });
  }
  function toBlob(canvas) { return new Promise((res) => canvas.toBlob(res, "image/png")); }
  function download(blob) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = "forward-fitness-" + data.date + ".png"; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(() => URL.revokeObjectURL(url), 1000); }

  async function share() {
    if (working) return; setWorking(true);
    try {
      const canvas = await draw(); const blob = await toBlob(canvas);
      const file = new File([blob], "forward-fitness.png", { type: "image/png" });
      const txt = data.name + " done. " + data.sets + " sets" + (pctText ? ", " + pctText + " vs last time" : "") + ".";
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: "Forward Fitness", text: txt }); } catch (e) {}
      } else { download(blob); props.flash("Image saved to your photos. Post it anywhere."); }
    } catch (e) { props.flash("Could not build the image", "err"); }
    setWorking(false);
  }
  async function save() {
    if (working) return; setWorking(true);
    try { const canvas = await draw(); const blob = await toBlob(canvas); download(blob); props.flash("Image saved"); }
    catch (e) { props.flash("Could not build the image", "err"); }
    setWorking(false);
  }

  async function postToFriends() {
    if (posting || posted || !props.onPost) return;
    setPosting(true);
    const summary = {
      name: data.name, date: data.date, sets: data.sets, groups: data.groups || [],
      durationSec: cfg.duration ? data.durationSec || null : null,
      location: cfg.location && locationText ? locationText : null,
      vol: cfg.volume ? data.vol : null,
      pct: cfg.volume ? data.pct : null,
      topLifts: cfg.topSets ? (data.topLifts || []).map((l) => ({ name: l.name, sets: l.sets, weight: cfg.weights ? l.weight : 0, reps: cfg.weights ? l.reps : 0 })) : [],
      prs: (data.prs || []).map((x) => ({ name: x.name, weight: cfg.weights ? x.weight : 0, reps: cfg.weights ? x.reps : 0 })),
    };
    const ok = await props.onPost(summary, caption, data.workoutId);
    setPosting(false);
    if (ok) setPosted(true);
  }

  const toggles = [
    { key: "duration", label: "Duration", disabled: !durText },
    { key: "location", label: "Location", disabled: false },
    { key: "volume", label: "Volume", disabled: false },
    { key: "topSets", label: "Top sets", disabled: false },
    { key: "weights", label: "Weights", disabled: false },
  ];

  return (
    <div style={overlay}>
      <div style={Object.assign({}, sheet, { maxWidth: 400 })}>
        <div style={{ textAlign: "center", marginBottom: 8 }}>
          <div style={{ fontSize: 22, fontWeight: 800 }}>Workout complete</div>
          <div style={{ fontSize: 13, color: "#9ca3af", marginTop: 2 }}>Choose what to show, then share it.</div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "6px 2px" }}>
          <div style={{ borderRadius: 20, padding: 22, color: "#fff", background: "linear-gradient(135deg,#1a73e8,#0c3aa0)", boxShadow: shadowPrimary }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <img src="/train/icons/icon-192.png" alt="" style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0 }} />
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: ".08em", opacity: 0.9 }}>FORWARD FITNESS</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
              {profile.avatar && <img src={profile.avatar} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover" }} />}
              <span style={{ fontSize: 15, fontWeight: 700 }}>{profile.username ? "@" + profile.username : "Forward Fitness"}</span>
            </div>
            <div style={{ fontSize: 30, fontWeight: 800, marginTop: 16, lineHeight: 1.05 }}>{data.name}</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{prettyDate(data.date)}{cfg.duration && durText ? "   ·   " + durText : ""}</div>
            {cfg.location && locationText && <div style={{ fontSize: 13, opacity: 0.9, marginTop: 4, fontWeight: 600 }}>{locationText}</div>}
            {cfg.location && cfg.address && addressText && <div style={{ fontSize: 12, opacity: 0.72, marginTop: 1 }}>{addressText}</div>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{data.sets}</div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, marginTop: 2 }}>SETS</div>
              </div>
              <div style={{ background: "rgba(255,255,255,.15)", borderRadius: 14, padding: "14px 8px", textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 800 }}>{bigVal}</div>
                <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 600, marginTop: 2 }}>{bigLbl}</div>
              </div>
            </div>
            {cfg.topSets && (data.topLifts || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                {data.topLifts.slice(0, 4).map((l, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, padding: "5px 0", borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,.15)" }}>
                    <span style={{ fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 10 }}>{l.name}</span>
                    <span style={{ fontWeight: 700, flexShrink: 0 }}>{cfg.weights && l.weight ? l.weight + " × " + l.reps : l.sets + " sets"}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {toggles.map((t) => (
              <button key={t.key} onClick={() => !t.disabled && toggle(t.key)} disabled={t.disabled} style={{ flex: "1 0 28%", background: t.disabled ? "#f3f4f6" : cfg[t.key] ? "#1a73e8" : "#fff", color: t.disabled ? "#c7ccd4" : cfg[t.key] ? "#fff" : "#374151", border: "2px solid " + (cfg[t.key] && !t.disabled ? "#1a73e8" : "#eaeef3"), borderRadius: 12, padding: "10px 8px", fontSize: 13, fontWeight: 700, minHeight: 42, opacity: t.disabled ? 0.7 : 1 }}>{t.label}</button>
            ))}
          </div>
          {cfg.location && (
            <div style={{ marginTop: 12 }}>
              {geoBusy && <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 8 }}>Finding nearby places...</div>}
              {places.length > 0 && (
                <div style={{ border: "1px solid " + BORDER, borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
                  {places.map((pl, i) => {
                    const sel = pl.name === locationText;
                    return (
                      <button key={i} onClick={() => { setLocationText(pl.name); setAddressText(pl.address || addressText); }} style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: sel ? "#f0f5ff" : "#fff", border: "none", borderBottom: i < places.length - 1 ? "1px solid #f3f4f6" : "none", padding: "12px 14px", minHeight: 50 }}>
                        <span style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: sel ? "#1a73e8" : "#1a2332", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</span>
                          {pl.address && <span style={{ display: "block", fontSize: 12.5, color: "#9ca3af", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.address}</span>}
                        </span>
                        {sel && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M20 6L9 17l-5-5" /></svg>}
                      </button>
                    );
                  })}
                </div>
              )}
              <input value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="Location name" style={Object.assign({}, fieldStyle, { marginBottom: 8 })} />
              <input value={addressText} onChange={(e) => setAddressText(e.target.value)} placeholder="Address (optional)" style={fieldStyle} />
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12 }}>
                <button onClick={() => setCfg((c) => { const n = Object.assign({}, c, { address: !c.address }); persist(n); return n; })} style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, background: "none", border: "none", padding: 0, textAlign: "left" }}>
                  <span style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "#1a2332" }}>Show address on card</span>
                  <span style={{ flexShrink: 0, width: 44, height: 26, borderRadius: 13, background: cfg.address ? "#1a73e8" : "#d1d5db", position: "relative", transition: "background .2s" }}>
                    <span style={{ position: "absolute", top: 3, left: cfg.address ? 21 : 3, width: 20, height: 20, borderRadius: "50%", background: "#fff", transition: "left .2s", boxShadow: "0 1px 3px rgba(0,0,0,.2)" }} />
                  </span>
                </button>
                <button onClick={fetchPlaces} disabled={geoBusy} aria-label="find nearby" style={{ flexShrink: 0, background: "#f0f5ff", border: "1px solid #dbe9fd", borderRadius: 12, width: 46, height: 40, color: "#1a73e8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1a73e8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-6-5.686-6-10a6 6 0 0 1 12 0c0 4.314-6 10-6 10z" /><circle cx="12" cy="11" r="2" /></svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {props.onPost && (
          <div style={{ marginTop: 12 }}>
            {!posted && <input value={caption} onChange={(e) => setCaption(e.target.value.slice(0, 500))} placeholder="Add a caption for your friends (optional)" style={Object.assign({}, fieldStyle, { padding: "12px 14px", marginBottom: 8 })} />}
            <button onClick={postToFriends} disabled={posting || posted} style={{ width: "100%", background: posted ? "#f0fdf4" : "#1a2332", color: posted ? "#16a34a" : "#fff", border: posted ? "1px solid #bbf7d0" : "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {posted
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></svg>}
              {posted ? "Posted to Friends" : posting ? "Posting..." : "Post to Friends"}
            </button>
          </div>
        )}
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button onClick={props.onClose} style={{ background: "#f3f4f6", color: "#374151", border: "none", borderRadius: 12, padding: "14px 16px", fontSize: 14, fontWeight: 700, minHeight: 52 }}>Done</button>
          <button onClick={save} disabled={working} style={{ background: "#fff", color: "#1a73e8", border: "1px solid #dbe9fd", borderRadius: 12, padding: "14px 16px", fontSize: 14, fontWeight: 700, minHeight: 52 }}>Save</button>
          <button onClick={share} disabled={working} style={{ flex: 1, background: "linear-gradient(180deg,#2b7cf0,#1a73e8)", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, minHeight: 52, boxShadow: shadowPrimary, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" /></svg>
            {working ? "..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
}
