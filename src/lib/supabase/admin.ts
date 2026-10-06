import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only admin client. Uses the secret key, which bypasses Row Level
// Security. Never import this into a Client Component; never expose the key.
//
// Built lazily so that importing this module never requires the environment
// variables — that keeps builds (which have no secrets) working, and turns a
// missing key into a clear runtime error instead of a build failure.
let client: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase env missing: set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.",
    );
  }

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
