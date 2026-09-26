import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { requireEnv } from "@/lib/env";
import { fetchWithRetry } from "@/lib/supabase/retry-fetch";
import type { Database } from "@/lib/supabase/database.types";

let client: SupabaseClient<Database> | null = null;

/**
 * Server-only client with the secret key (role service_role, bypasses RLS).
 * Never import this from anything that can end up in the browser; the
 * "server-only" import above turns that into a build error.
 */
export function db(): SupabaseClient<Database> {
  if (!client) {
    client = createClient<Database>(requireEnv("SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithRetry },
    });
  }
  return client;
}

/** Throws with the database message; pages show it via error.tsx. */
export function unwrap<T>(result: { data: T; error: { message: string } | null }, what: string): NonNullable<T> {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
  if (result.data === null || result.data === undefined) throw new Error(`${what}: keine Daten`);
  return result.data;
}

/** For writes without returned rows. */
export function check(result: { error: { message: string } | null }, what: string): void {
  if (result.error) throw new Error(`${what}: ${result.error.message}`);
}
