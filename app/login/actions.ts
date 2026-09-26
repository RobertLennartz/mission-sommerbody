"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { clientIpHash, passwordMatches } from "@/lib/auth";
import { requireEnv } from "@/lib/env";
import { FAILURE_DELAY_MS, MAX_FAILURES, clearFailures, recentFailures, recordFailure, sleep } from "@/lib/login-brake";
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, createSessionToken, safeNextPath } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("weiter"));

  let ipHash: string;
  try {
    ipHash = await clientIpHash();
    if ((await recentFailures(ipHash)) >= MAX_FAILURES) {
      await sleep(FAILURE_DELAY_MS);
      return { error: "Zu viele Fehlversuche. Bitte in 15 Minuten noch einmal probieren." };
    }
  } catch (error) {
    console.error("login brake unavailable", error);
    return { error: "Anmelden geht gerade nicht, die Datenbank antwortet nicht. Bitte gleich noch einmal probieren." };
  }

  if (!password || !passwordMatches(password)) {
    await recordFailure(ipHash).catch((error) => console.error("recordFailure", error));
    await sleep(FAILURE_DELAY_MS);
    return { error: "Das Passwort stimmt nicht." };
  }

  await clearFailures(ipHash).catch((error) => console.error("clearFailures", error));

  const token = await createSessionToken(requireEnv("SESSION_SECRET"), requireEnv("APP_PASSWORD"));
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Safari refuses secure cookies on http://localhost, so only in production.
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  redirect(next);
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
