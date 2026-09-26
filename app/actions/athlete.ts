"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ATHLETE_COOKIE, getAthletes } from "@/lib/athletes";
import { requireSession } from "@/lib/auth";

async function setAthleteCookie(slug: string): Promise<void> {
  await requireSession();
  const athletes = await getAthletes();
  if (!athletes.some((a) => a.slug === slug)) throw new Error("Unbekannte Person");
  (await cookies()).set(ATHLETE_COOKIE, slug, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

/** Header switch: setting the cookie re-renders the current page for the new person. */
export async function switchAthlete(slug: string): Promise<void> {
  await setAthleteCookie(slug);
}

/** First choice after login. */
export async function chooseAthlete(formData: FormData): Promise<void> {
  await setAthleteCookie(String(formData.get("slug") ?? ""));
  redirect("/heute");
}
