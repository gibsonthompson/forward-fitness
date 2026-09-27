// Vercel serverless function: GET /api/config
// Hands the onboarding page the PUBLIC Supabase URL and anon key so it can create
// accounts. These are the same public values already shipped in the app bundle, so
// exposing them here is fine. They are read from your existing Vercel env vars,
// nothing is hardcoded.
export default function handler(req, res) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) { res.status(500).json({ error: "Supabase env vars not set" }); return; }
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({ url, anonKey });
}