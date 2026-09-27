import { describe, expect, it } from "vitest";
import { proteinBasisText } from "@/lib/protein";

describe("proteinBasisText", () => {
  it("describes where the protein target comes from", () => {
    expect(proteinBasisText({ weightKg: 91, source: "checkup", date: "2026-09-27" }, 2)).toBe(
      "Basis: 91 kg (Checkup vom 27.09.2026) × 2 g/kg",
    );
    expect(proteinBasisText({ weightKg: 89.4, source: "morning", date: "2026-10-12" }, 1.8)).toBe(
      "Basis: 89,4 kg (Morgengewicht vom 12.10.2026) × 1,8 g/kg",
    );
  });
});
