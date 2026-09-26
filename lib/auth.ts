import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { requireEnv } from "@/lib/env";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * Session check for pages, Server Actions and route handlers. The proxy
 * checks too, but Server Actions are reachable by direct POST, so every
 * entry point verifies on its own.
 */
export const isAuthenticated = cache(async (): Promise<boolean> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token, requireEnv("SESSION_SECRET"), requireEnv("APP_PASSWORD"));
});

export async function requireSession(): Promise<void> {
  if (!(await isAuthenticated())) redirect("/login");
}

/** Constant-time comparison: hashing first makes both sides equally long. */
export function passwordMatches(input: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(requireEnv("APP_PASSWORD"), "utf8").digest();
  return timingSafeEqual(a, b);
}

/** Client IP as keyed hash: good enough to count attempts, useless to anyone reading the table. */
export async function clientIpHash(): Promise<string> {
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip")?.trim() || "unknown";
  return createHmac("sha256", requireEnv("SESSION_SECRET")).update(`ip|${ip}`).digest("hex");
}
