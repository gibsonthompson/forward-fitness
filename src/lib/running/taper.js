// Taper before the goal race.
// Bosquet et al. 2007 (meta-analysis of 27 studies, https://pubmed.ncbi.nlm.nih.gov/17762369/):
// the best taper lasted about 2 weeks, with volume reduced exponentially by 41 to 60%, while
// intensity and frequency were kept. 5K races use a shorter taper of about 7 to 10 days.

/** Number of taper weeks (the race week included) for a goal distance. */
export function taperWeeks(distanceM) {
  return distanceM <= 10000 ? 1 : 2
}

/**
 * Weekly volume as a fraction of peak for each taper week, ending with race week.
 * The steps fall off exponentially so most of the cut lands in the final days.
 */
export function taperFactors(distanceM) {
  if (distanceM <= 5000) return [0.6]
  if (distanceM <= 10000) return [0.55]
  if (distanceM <= 21100) return [0.75, 0.5]
  return [0.7, 0.45]
}

/** Taper weeks as volumes in meters from a peak weekly volume. Intensity is kept. */
export function buildTaper(distanceM, peakWeeklyM) {
  return taperFactors(distanceM).map((f, i, all) => ({
    week: i + 1,
    of: all.length,
    volumeM: Math.round(peakWeeklyM * f),
    keepQuality: true,
  }))
}
