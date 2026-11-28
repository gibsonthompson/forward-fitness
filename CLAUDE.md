# Forward Fitness

This is the master context file for working on this repo. Claude Code reads it automatically at the start of every session. Read it fully before making changes.

The running coach has its own full spec: @docs/running-coach.md

Current status, open decisions and next steps: @docs/HANDOFF.md (update it at the end of every session)

---

## 1. What Forward Fitness Is

Forward Fitness is a training app built around one idea: **progressive overload**. You get stronger and fitter by doing a little more than last time, over and over. The app's job is to make that automatic, so you always know what to beat and you can see that it's working.

**The core loop (lifting, live today):**

1. Open today's workout.
2. Every exercise already shows what you lifted last session.
3. Log each set fast (weight, reps, check it off). The rest timer starts on its own.
4. See the proof: strength trends, weekly volume, personal records, streaks.

**The second pillar (running, to be built):** a running coach that takes a goal like "run a 20-minute 5K", builds a personal training plan backed by real exercise science, and adjusts the plan after every run you log. See `docs/running-coach.md`.

Every feature should help someone train consistently, beat last time, or see their progress. Social, sharing and chat support that loop. They are not the point.

**Who it's for:** anyone who trains, from their first month to their tenth year. That covers a commercial gym, a garage gym, dumbbells at home, or the road.

**Owner:** Gibson Thompson, solo founder.

**Live URLs:**
- https://forwardfitness.app is the marketing site.
- https://forwardfitness.app/train/ is the app.
- https://forwardfitness.app/onboarding.html is signup.

---

## 2. Where It's Going

### The destination is a native Apple product

- **iPhone app** on the App Store, built from this codebase with Capacitor. An iOS shell already exists.
- **Apple Watch app** for logging sets and reps from the wrist, and later for tracking runs. This is the headline long-term feature.
- **Lock-screen Live Activity:** a "workout in progress" card with the current exercise, the set, and a self-ticking rest timer.
- **Apple Health:** save workouts and runs, and read runs recorded elsewhere.
- **Design bar: it should feel like Apple made it.** Calm, premium and confident, with nothing that looks templated or generated.

### Order of work

1. **Polish and restructure.** Split `App.jsx` into modules, build the lifting progression engine, fix the security gaps, and apply the premium redesign to the app and site.
2. **Running coach v1 (web).** Manual run logging (distance, time, effort), goal setup, plan generation, and adaptation after each run. This needs no native features, so build it before the native phase.
3. **Capacitor iOS build plus TestFlight.** Needs a Mac with Xcode 16+ and the Apple Developer Program. Test one native feature per TestFlight round on real devices.
4. **GPS run tracking:**
   - Live map, distance, pace and splits.
   - Leaflet and OpenStreetMap for the map.
   - `@capacitor-community/background-geolocation` for screen-off tracking.
   - Build it behind a location-provider interface (`start`, `stop`, `onPoint`) so the browser `watchPosition` version and the native version are interchangeable.
5. **Live Activity.**
   - Display via a Capacitor Live Activities plugin driven from the web layer.
   - Interactive lock-screen buttons (log a set, add weight) need native App Intents.
6. **Apple Watch:**
   - A native SwiftUI watchOS target synced over WatchConnectivity.
   - `HKWorkoutSession` keeps the app alive mid-workout and saves to Health.
   - Lifting set logging comes first, then run tracking on the wrist.
7. **Native sharing:**
   - Save to Photos and the iOS share sheet (`@capacitor/share`).
   - A dedicated Instagram Stories button (URL scheme).
   - Snapchat via Snap Creative Kit.

**Native architecture rule:** the phone holds the single source of truth for the in-progress workout or run. The Watch and the Live Activity are synced views with quick inputs, not separate engines.

### Mobile build gotchas

- Mobile builds run `npm run build:mobile`, which is `CAP=1 vite build`. That sets base `/` and outputs to `mobile/`. Never use `/train/` as the base there, or the assets 404.
- Inside Capacitor the app loads from `capacitor://localhost`, so relative `/api/*` calls fail. `src/apiBase.js` rewrites them to `https://forwardfitness.app/api/...` on native only. Always call APIs as plain `fetch('/api/...')` so that rewrite applies.

---

## 3. How It Works Today

### Stack

- **Frontend:** React 18 and Vite 5. Nearly the whole app lives in one file, `src/App.jsx` (about 3,400 lines).
- **Backend:**
  - Supabase: Postgres, Auth and row-level security.
  - Vercel serverless functions in `api/`.
- **Hosting:** Vercel, with build command `vite build && cp -r site/. dist/`.
  - The static marketing site in `site/` is served at `/`.
  - The React app is served at `/train/` (Vite base `/train/`, outDir `dist/train`).
- **Native shell:** Capacitor 8.
  - Config is in `capacitor.config.ts`: appId `app.forwardfitness`, webDir `mobile`.
  - Scripts: `cap:sync`, `cap:open`.
- **AI:** the Anthropic API, used by `api/coach.js`. It runs `claude-sonnet-5-5` with `claude-haiku-5-5` as a fallback, plus the server-side web search tool.

### Repo map

| Path | What it is |
|---|---|
| `src/App.jsx` | The entire app: data, logic, all screens |
| `src/main.jsx` | React entry |
| `src/supabaseClient.js` | Supabase client (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) |
| `src/apiBase.js` | Rewrites `/api/*` to the live domain inside Capacitor |
| `src/pwaBoot.js`, `src/pwaUpdate.js` | Service worker registration plus auto-update. Loaded as a separate entry so updates still arrive if the app crashes |
| `public/sw.js`, `public/manifest.json` | PWA service worker and manifest |
| `api/coach.js` | AI lifting coach. Verifies the Supabase token, streams NDJSON (`{t:"text"\|"search"\|"sources"\|"error", v}`), and can run web searches with cited sources |
| `api/config.js` | Gives the onboarding page the public Supabase URL and anon key |
| `site/` | Marketing site (`index.html`, `styles.css`, `script.js`) and signup (`onboarding.html`, `onboarding.js`) |
| `vite.config.js` | Web vs mobile build switch, and a per-build ID stamped into `version.json` and `sw.js` |
| `vercel.json` | Build command, plus cache headers: no-cache on `sw.js`, `version.json` and the app shell; immutable on hashed assets |

### Screens (bottom tabs: Train, Progress, Coach, Profile)

- **Sign-in (`AuthScreen`):**
  - Username plus password.
  - Usernames map to synthetic emails `username@callbirdai.com` (`USERNAME_DOMAIN`). Keep that mapping intact or existing users get locked out.
  - Navy hero with an animated barbell.
- **Signup (`site/onboarding.html`):**
  - Asks for goal, experience and days per week.
  - Creates the account and drops the user into the app signed in.
  - Answers are stored in `localStorage` as `ff-onboarding`.
- **Train (`WorkoutTab`):**
  - Weekly schedule (`WeekBoard`) with hold-and-drag reordering.
  - Today's workout, where each `ExerciseCard` shows last session's sets and prefills them.
  - Set logging:
    - Swipe-to-delete set rows.
    - Warmup sets, which are excluded from all stats.
    - Plate calculator (`PlateModal`).
    - Rest timer (`RestBar`).
  - Building workouts:
    - Exercise picker.
    - Split builder.
    - Preset plans (`PLANS`).
  - The in-progress workout is saved to `localStorage` (`ff-draft`) so it survives reloads.
- **Finish and share (`WorkoutShareModal`):**
  - A share card with toggles: duration, location, address, volume, top sets, weights.
  - Nearby place picker.
  - Post to friends with a caption.
- **Progress (`ProgressTab`)** has two views:
  - **You:**
    - Level, plus last-30-days stats compared with the prior 30.
    - Strength trend: estimated 1-rep max per lift, using Epley `w × (1 + r/30)`.
    - Weekly volume.
    - Personal records with NEW badges.
    - Muscle balance, consistency and achievements.
  - **Friends:** feed of friends' posts, props, friend requests, and search by username.
- **Coach (`CoachTab`):**
  - Chat with an AI coach that receives a compact summary of the user's training log (`coachContext()`).
  - It answers from an evidence-based playbook and can search the web with cited sources.
  - History is kept in `localStorage` (`ff-chat`).
- **Profile (`ProfileTab`):** stats, friends, username change, settings, sign out.

### Data model

All Forward Fitness tables live in a Supabase project shared with other apps and are prefixed `iron_`. `user_id` is **text**, compared as `auth.uid()::text`.

| Table | Purpose |
|---|---|
| `iron_workouts` | One row per workout. `date`, `exercises` (jsonb array of `{exerciseId, sets:[{weight, reps, done, warmup}]}`), `notes` |
| `iron_profiles` | Bodyweight, age, plus `settings` jsonb (schedule, splits, custom exercises, preferences) |
| `iron_public_profiles` | `username` (unique, case-insensitive) and `avatar`. Readable by any signed-in user |
| `iron_friendships` | `requester`, `addressee`, `status` (pending or accepted). Only the addressee can accept |
| `iron_posts` | Post-workout posts: `summary` jsonb, `caption`, `workout_id`. Visible to the owner and accepted friends (via the `iron_is_friend()` security-definer function) |
| `iron_post_likes` | Props on posts |
| `iron_measurements` | Body measurements. **RLS is OFF.** Fix before launch |
| `iron_meals` | Leftover from the removed Food tab. Unused |

The exercise library is a hardcoded `EXERCISES` array (id, name, muscle group). Custom exercises are stored in `iron_profiles.settings`.

---

## 4. Where It Can Be Improved

Ranked by value.

### 1. Build a real lifting progression engine (the core promise)

The app shows and prefills last session's numbers, but nothing tells the user what to do next. The marketing site promises "add weight" vs "chase a rep", so build it properly:

- **Double progression per exercise.**
  - Each exercise has a rep range (for example 6 to 10).
  - When every working set reaches the top of the range, recommend adding weight.
  - Otherwise, recommend adding reps at the same weight.
- **Exercise-aware increments.** Use smaller jumps for dumbbells and isolation lifts, larger for barbell compounds, and respect available plates.
- **Effort.** Optionally capture reps in reserve or effort per set, and use it to hold or progress.
- **Stalls.** After repeated stalls, suggest a reset or a variation.
- **In the UI:** show the target clearly on every exercise, and celebrate beating last time.
- **Tests:** put the logic in pure functions with unit tests.

### 2. Break up `App.jsx`

Split the 3,400-line file into:

- `data/` for exercises and plans.
- `lib/` for progression, e1RM, stats, streaks and dates.
- `services/` for Supabase queries.
- `components/` and `screens/`.

Preserve behavior exactly. This is required before the running coach and native work, not optional.

### 3. Security and data

- Turn on RLS for `iron_measurements`.
- Review every policy.
- Decide whether to drop `iron_meals`.

### 4. Tests and tooling

- Add Vitest for `lib/`, especially progression, PRs, streaks and volume.
- Add ESLint.
- Consider TypeScript for new modules.

### 5. Workout state model

The in-progress workout lives only in `localStorage`. Before the Watch and Live Activity phase, make it an explicit, syncable object, for example `{ workoutId, exercises, currentExerciseIndex, currentSetIndex, restEndsAt }`.

### 6. Premium redesign of the app

Upgrade the whole app to feel like Apple. See section 5.

### 7. Redo the marketing site

- Better photography, better copy and a better overall design.
- The current version uses Pexels photos of real people training, hotlinked from the Pexels CDN.
- The next version should use higher-quality, consistent imagery and Apple-style product storytelling: large device shots of the real app and one idea per section.

### 8. Offline and sync

- Logging works offline today via the draft. Make sync conflicts explicit.
- Queue writes when offline, and show sync status.

### 9. Accessibility

- Visible focus states.
- Real button semantics.
- Dynamic type friendliness.
- Respect reduced motion. The site already does, so carry it everywhere.

---

## 5. Design Direction: "Feel Like Apple"

### App

- **Layout:** roomy and calm. Use fewer borders and boxes, and let spacing and type hierarchy do the work.
- **Numbers:** big, confident numbers for the stats that matter.
- **Color:** one accent color, used sparingly.
- **Depth:** restrained shadows. Spring-based transitions and native-feeling sheets. Haptics in the native build.
- **Type:** the system stack (`-apple-system`, SF Pro). SF Rounded may work for numbers.
- **Charts:** minimal and clean, in the spirit of Apple Health and Fitness.
- **Speed:** logging stays fast. Premium never means more taps.

### Marketing site

- Copy should be plain, specific and confident, with no hype and no buzzwords.
- **Never fabricate testimonials, reviews, user counts or ratings.**

### Standing rules (Gibson's, apply everywhere)

- **Title Case** for headlines and titles. Never ALL CAPS.
- **Never use the em-dash character** in copy or UI. Use commas, periods or parentheses.
- **No typographic orphans.** Use `text-wrap: balance` on headings and `text-wrap: pretty` on body text.
- **Balanced grids:** never leave one item alone on a row. Use even counts, or span the leftover item full width on purpose.
- **Custom dropdowns only.** Never a native `<select>`. Reuse the app's `Dropdown` component.
- **Numeric settings** (days, percentages, amounts, paces) are typed number inputs, not dropdowns that list every value. Dropdowns are only for small fixed choices.
- **Choice buttons** must make sense on their own, in Title Case, with enough context.
- **Condense side by side** instead of long vertical stacks when content doesn't need full width.
- Never use the words "tackle" or "guru".
- Every screen gets loading, empty and error states, not just the happy path.

---

## 6. Monetization (planned, not built)

- Ads inside the app, with a paid premium tier that removes them.
- An honest in-app moment explaining why ads exist and that premium keeps the platform affordable for everyone.
- Native subscriptions will likely go through RevenueCat (App Store billing).
- The running coach is a natural premium feature. Decide when building it.

---

## 7. Other Ideas on File (not committed)

- **3D exercise demos:** an anatomical figure with the worked muscles highlighted.
  - The candidate source is the open-source `blwsk/exercise-animations` repo, but it has no license yet. Ask the author for MIT or CC0 before any commercial use.
  - The plan is to pre-render GIF or WebP clips per exercise and ship them as media.
- Integration with Gibson's separate life-planning app (Align) for nutrition.
- A smart-glasses rep-counting heads-up display.

---

## 8. How to Work With Gibson

- **Repo:** github.com/gibsonthompson/forward-fitness. GitHub is the source of truth. Pull before you start and never build on a stale copy.
- **Commits:** commit with `git add .`, then commit and push. Group each push by one concern; don't mix unrelated changes in one commit.
- **Database:** run database changes directly through Supabase migrations. Check what already exists first, then report what ran. Don't hand him SQL to run himself, and don't ask permission for routine repo or database work.
- **Explanations:** keep them plain and short. Describe the outcome, not an implementation walkthrough.
- **URLs:** write the full domain, for example https://forwardfitness.app/train/, never just `/train/`.
- **Completeness:** be thorough. Trace every feature end to end (storage, display, actual use by whatever consumes it, edge cases, loading, empty and error states). No half-wired features.
- **Testing order:** front-load everything buildable before any live test, then test in one clean pass.
- **Secrets:** never print, hardcode, commit or log them. Supabase keys and the Anthropic key live only in Vercel environment variables.
- **Existing data:** never break existing users' data. Any change to the `iron_workouts.exercises` shape needs a migration path.
- **Keep both deploys working:** the site at `/` and the app at `/train/`. Don't remove the build-ID stamp in `vite.config.js` or the no-cache headers in `vercel.json`; installed PWAs depend on them to update.
