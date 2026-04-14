# IRON PROTOCOL

Progressive overload workout tracker with smart weight recommendations, nutrition tracking, and evidence-based training reference.

## Features

- **Smart Weight Recommendations** — Double progression algorithm with RIR tracking. Automatically calculates your next session's target weight based on performance.
- **Plateau Detection** — Flags stalled exercises after 3+ sessions and prescribes deload protocols.
- **Pre-loaded Split** — Chest/Back, Arms, Shoulders/Legs with full exercise library and custom exercise support.
- **Nutrition Tracker** — Protein & calorie tracking with ring gauges, 20+ food presets, meal distribution analysis, and 7-day history.
- **Weekly Volume Monitor** — Real-time sets-per-muscle-group tracking against the 10-20 optimal range.
- **Progress Dashboard** — Estimated 1RM PRs, lifetime stats, volume heatmap, and body measurement logging.
- **Training Intel** — Evidence-based reference sections on progressive overload, volume, aesthetics, nutrition, and recovery.

## Tech Stack

- React 18
- Vite
- localStorage for persistence
- Zero dependencies beyond React

## Getting Started

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`.

## Build

```bash
npm run build
```

Output in `dist/` — deploy anywhere (Vercel, Netlify, static hosting).

## Progressive Overload Algorithm

The engine uses **double progression** with RIR (Reps in Reserve):

1. Hit top of rep range (12) at RIR ≤1 → **increase weight** (5lb upper / 10lb lower), reset reps to 8
2. Hit top of range but RIR >1 → **same weight**, push harder next session
3. Missed target reps at failure → **hold weight**, build up
4. Plateau 3+ sessions → **deload week** at 60%, then push

## License

MIT
