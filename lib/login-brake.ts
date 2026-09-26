import "server-only";
import { check, db } from "@/lib/supabase/server";

/** Five failed attempts within 15 minutes lock that IP until the window has passed. */
export const MAX_FAILURES = 5;
export const WINDOW_MINUTES = 15;
export const FAILURE_DELAY_MS = 1500;

function windowStart(now: Date): string {
  return new Date(now.getTime() - WINDOW_MINUTES * 60_000).toISOString();
}

export async function recentFailures(ipHash: string, now = new Date()): Promise<number> {
  const result = await db()
    .from("login_attempts")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .gte("attempted_at", windowStart(now));
  if (result.error) throw new Error(`Login-Versuche lesen: ${result.error.message}`);
  return result.count ?? 0;
}

export async function recordFailure(ipHash: string, now = new Date()): Promise<void> {
  // Housekeeping: nothing older than 24 hours is kept (the IP hash is personal data).
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000).toISOString();
  check(await db().from("login_attempts").delete().lt("attempted_at", dayAgo), "Alte Login-Versuche löschen");
  check(await db().from("login_attempts").insert({ ip_hash: ipHash }), "Login-Versuch speichern");
}

export async function clearFailures(ipHash: string): Promise<void> {
  check(await db().from("login_attempts").delete().eq("ip_hash", ipHash), "Login-Versuche löschen");
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
