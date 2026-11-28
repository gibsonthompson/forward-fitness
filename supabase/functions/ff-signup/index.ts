// Forward Fitness signup. Creates the account already confirmed through the admin API, so no
// confirmation email is sent to the synthetic username@callbirdai.com address. This keeps
// "Confirm email" on for the other apps that share this Supabase project.
//
// POST { username, password } -> 200 { ok: true } | 400 | 409 { error: "taken" } | 429
// The client signs in with the same username and password right after.
import { createClient } from "npm:@supabase/supabase-js@2";

const USERNAME_DOMAIN = "callbirdai.com"; // must match USERNAME_DOMAIN in src/App.jsx and site/onboarding.js
const MAX_PER_HOUR = 8;
const ALLOWED_ORIGINS = ["https://forwardfitness.app", "https://www.forwardfitness.app", "capacitor://localhost", "http://localhost"];

function cors(origin: string | null) {
  const ok = origin && (ALLOWED_ORIGINS.includes(origin) || /^http:\/\/localhost(:\d+)?$/.test(origin) || /^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(origin));
  return {
    "Access-Control-Allow-Origin": ok ? origin! : "https://forwardfitness.app",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), { status, headers: { ...headers, "Content-Type": "application/json" } });
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  const headers = cors(req.headers.get("origin"));
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return json({ error: "method" }, 405, headers);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: "Invalid request." }, 400, headers); }
  const username = String(body.username ?? "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const password = String(body.password ?? "");
  if (username.length < 3 || username.length > 30) return json({ error: "Username must be 3 to 30 letters, numbers, dots, dashes or underscores." }, 400, headers);
  if (password.length < 6 || password.length > 72) return json({ error: "Password must be at least 6 characters." }, 400, headers);

  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Rate limit by a salted hash of the caller's IP.
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = await sha256("ff-signup:" + ip + ":" + (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""));
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await admin.from("iron_signup_attempts").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_HOUR) return json({ error: "Too many signups from this network. Try again in an hour." }, 429, headers);
  await admin.from("iron_signup_attempts").insert({ ip_hash: ipHash });

  const { error } = await admin.auth.admin.createUser({
    email: username + "@" + USERNAME_DOMAIN,
    password,
    email_confirm: true,
    // The shared on_auth_user_created trigger reads "app" at insert time to decide which app's
    // profile to create. app_metadata is written after the insert, so set it in user_metadata too.
    user_metadata: { username, app: "forward-fitness" },
    app_metadata: { app: "forward-fitness" },
  });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return json({ error: "taken" }, 409, headers);
    console.error("createUser", error.message);
    return json({ error: "Could not create your account. Please try again." }, 500, headers);
  }
  return json({ ok: true }, 200, headers);
});
