import "server-only";
import { isAuthenticated } from "@/lib/auth";
import { getAthletes } from "@/lib/athletes";
import { isIsoDate } from "@/lib/dates";
import type { AthleteRow } from "@/lib/supabase/database.types";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class InputError extends Error {}

/** Every Server Action starts here: session check first, then input checks. */
export async function guard(): Promise<void> {
  if (!(await isAuthenticated())) throw new Error("Nicht angemeldet. Bitte neu einloggen.");
}

export function requireUuid(value: unknown, what = "ID"): string {
  if (typeof value !== "string" || !UUID.test(value)) throw new InputError(`Ungültige ${what}.`);
  return value;
}

export function requireDate(value: unknown): string {
  if (!isIsoDate(value)) throw new InputError("Ungültiges Datum.");
  return value;
}

export async function requireAthlete(id: unknown): Promise<AthleteRow> {
  const athleteId = requireUuid(id, "Person");
  const athlete = (await getAthletes()).find((a) => a.id === athleteId);
  if (!athlete) throw new InputError("Unbekannte Person.");
  return athlete;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], what: string): T {
  if (typeof value !== "string" || !(allowed as readonly string[]).includes(value)) {
    throw new InputError(`Ungültige Angabe: ${what}.`);
  }
  return value as T;
}
