// Session RPE load (Foster et al. 2001): effort on the CR-10 scale (0 to 10) times duration in
// minutes. Valid and reliable across sports, ages and levels in a review of 36 studies
// (Haddad et al. 2017, https://www.ncbi.nlm.nih.gov/pmc/articles/PMC5673663/).
//
// Load is tracked for trends and explanations only. The acute:chronic workload ratio is NOT used
// to predict injury; it has been heavily criticized on methodological grounds
// (Impellizzeri et al., https://iris.univr.it/handle/11562/1139126).

export function sessionLoad(rpe, durationS) {
  if (!(rpe >= 0) || !(durationS > 0)) return 0
  return Math.min(10, rpe) * (durationS / 60)
}

/** Total load and run count per week, keyed by the ISO date of the week's first day. */
export function weeklyLoads(runs, weekStartsOn = 1) {
  const out = new Map()
  for (const r of runs) {
    const d = new Date(r.date + 'T00:00:00')
    const shift = (d.getDay() - weekStartsOn + 7) % 7
    d.setDate(d.getDate() - shift)
    const key = d.toISOString().slice(0, 10)
    const cur = out.get(key) || { load: 0, distanceM: 0, runs: 0 }
    cur.load += sessionLoad(r.rpe, r.duration_s ?? r.durationS)
    cur.distanceM += r.distance_m ?? r.distanceM ?? 0
    cur.runs += 1
    out.set(key, cur)
  }
  return out
}
