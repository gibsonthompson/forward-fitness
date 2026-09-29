# Forward Fitness

React/Vite workout tracker. The training app is served at `/train/`; the existing marketing site remains separate.

## Local setup

1. Run `npm ci`.
2. Copy `.env.example` to `.env.local` and fill in the existing project's Supabase URL and public anon/publishable key. Ask the project owner for these values. Never use a service-role key in the browser.
3. Run `npm run dev` and open `http://localhost:3000/train/`.

Without configuration, the app shows setup instructions instead of failing during startup. Environment values must also be supplied when building the app for deployment.

## Design preview

Open `http://localhost:3000/train/?design-preview` while the development server runs. This development-only preview uses labeled sample data, supports empty states and chart range controls, and does not connect to Supabase. Navigation buttons describe their destination in the preview; the signed-in app opens the actual tabs. The preview is excluded from production builds.

The new Today screen uses weekly active training days against the number of scheduled training days, plus today's protein and calorie totals against existing profile targets. The chart counts non-warmup sets with positive reps. Rings visually stop at 100%; numeric totals still show over-goal values. No Apple Health data is imported.

## Haptics and iOS status

Set completion, successful workout saves, and tab selection use optional Capacitor haptics, with browser vibration where supported. Settings includes a device-local toggle. Native iPhone haptics require the iOS Capacitor project and a device build; those are not included in this design PR yet. Safari cannot provide the same native feedback.

For TestFlight, the next steps are to create the iOS project, confirm a permanent bundle identifier and Apple signing team, check backend/API URLs in the native runtime, and upload a signed archive through Xcode. Xcode and a paid Apple Developer membership are required. Signing credentials stay outside this repository.

## Collaboration

Work on feature branches and open pull requests against `main`. This design is on `codex/cody-changes`; do not push it directly to `main`.

## Validation

Run `npm run build` with the Supabase environment variables configured to compile the authenticated app. Without them, the build intentionally includes the configuration screen. Test account sign-in, workout saves, nutrition logging, and native haptics against an appropriate test environment before release.
