import { formatDate } from "@/lib/dates";
import { formatDecimal } from "@/lib/numbers";

/** "Basis: 91,0 kg (Checkup vom 27.09.2026) × 2,0 g/kg". Plain module, usable on server and client. */
export function proteinBasisText(basis: { weightKg: number; source: "checkup" | "morning"; date: string }, factor: number): string {
  const src = basis.source === "checkup" ? "Checkup" : "Morgengewicht";
  return `Basis: ${formatDecimal(basis.weightKg, 1)} kg (${src} vom ${formatDate(basis.date)}) × ${formatDecimal(factor, 1)} g/kg`;
}
