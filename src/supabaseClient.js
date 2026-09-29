import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
// App startup gates authentication on configuration; the design sandbox needs no client.
export const supabase = url && key ? createClient(url, key) : null;
