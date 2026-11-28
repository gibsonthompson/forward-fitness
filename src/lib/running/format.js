// Display helpers. Engine values are always meters and seconds; convert only for display.
export const KM_PER_MI = 1.609344

/** "4:15" style clock from seconds. Hours are shown when needed: "1:02:03". */
export function formatClock(totalS) {
  const s = Math.round(totalS)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = String(s % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

/** Pace from seconds per km to the user's unit, for example "4:15 /km" or "6:50 /mi". */
export function formatPace(sPerKm, unit = 'km') {
  const v = unit === 'mi' ? sPerKm * KM_PER_MI : sPerKm
  return `${formatClock(v)} /${unit}`
}

/** Pace range, fast to slow. */
export function formatPaceRange(range, unit = 'km') {
  return `${formatClock(unit === 'mi' ? range.fast * KM_PER_MI : range.fast)} to ${formatPace(range.slow, unit)}`
}

export function formatDistance(m, unit = 'km') {
  const v = unit === 'mi' ? m / 1000 / KM_PER_MI : m / 1000
  return `${v >= 10 ? v.toFixed(1) : v.toFixed(2).replace(/0$/, '')} ${unit}`
}

/** Parse "20:00" or "1:35:10" to seconds. Returns null when invalid. */
export function parseClock(text) {
  const parts = String(text).trim().split(':').map(Number)
  if (!parts.length || parts.length > 3 || parts.some((p) => !Number.isFinite(p) || p < 0)) return null
  return parts.reduce((acc, p) => acc * 60 + p, 0)
}
