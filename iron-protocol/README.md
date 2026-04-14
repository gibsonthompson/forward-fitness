# IRON PROTOCOL

Progressive overload workout tracker with smart weight recommendations, nutrition tracking, and evidence-based training reference.

## Features

- **Supabase Auth** — Email/password login, data syncs across all devices.
- **Smart Weight Recommendations** — Double progression algorithm with RIR tracking. Automatically calculates your next session's target weight based on performance.
- **Plateau Detection** — Flags stalled exercises after 3+ sessions and prescribes deload protocols.
- **Pre-loaded Split** — Chest/Back, Arms, Shoulders/Legs with full exercise library and custom exercise support.
- **Nutrition Tracker** — Protein & calorie tracking with ring gauges, 20+ food presets, meal distribution analysis, and 7-day history.
- **Weekly Volume Monitor** — Real-time sets-per-muscle-group tracking against the 10-20 optimal range.
- **Progress Dashboard** — Estimated 1RM PRs, lifetime stats, volume heatmap, and body measurement logging.
- **Training Intel** — Evidence-based reference sections on progressive overload, volume, aesthetics, nutrition, and recovery.
- **PWA** — Install to home screen, offline-capable, safe-area support.

## Tech Stack

- React 18 + Vite
- Supabase (PostgreSQL + Auth) — shared project with DetailPro/JunkLine/RSA
- PWA with service worker
- Zero UI dependencies beyond React

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env and add your anon key
cp .env.example .env

# 3. Run the Supabase migration
#    Go to oschjeuhejqibymdaqxw.supabase.co → SQL Editor
#    Paste and run database/schema.sql

# 4. Start dev server
npm run dev
```

Opens at `http://localhost:3000`.

## Deploy to Vercel

```bash
npm run build
vercel deploy
```

Set env vars in Vercel dashboard:
```
VITE_SUPABASE_URL=https://oschjeuhejqibymdaqxw.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Database

Uses the shared Supabase project (`oschjeuhejqibymdaqxw`). Tables are prefixed with `iron_` to avoid collisions:

- `iron_profiles` — user weight/age for macro targets
- `iron_workouts` — date + exercises JSONB (sets/reps/weight/rir)
- `iron_meals` — date + entries JSONB (per-day meal log)
- `iron_measurements` — body measurements over time

All tables have RLS enabled — users can only access their own data.

## Progressive Overload Algorithm

The engine uses **double progression** with RIR (Reps in Reserve):

1. Hit top of rep range (12) at RIR ≤1 → **increase weight** (5lb upper / 10lb lower), reset reps to 8
2. Hit top of range but RIR >1 → **same weight**, push harder next session
3. Missed target reps at failure → **hold weight**, build up
4. Plateau 3+ sessions → **deload week** at 60%, then push

## License

MIT