import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csv";

describe("toCsv", () => {
  it("writes German Excel CSV with BOM, semicolons and decimal comma", () => {
    const csv = toCsv(["Datum", "Gewicht", "Schritte"], [["2026-10-12", 82.5, 12345]]);
    expect(csv).toBe("﻿Datum;Gewicht;Schritte\r\n2026-10-12;82,5;12345\r\n");
  });

  it("quotes semicolons, quotes and line breaks in notes", () => {
    const csv = toCsv(["Notiz"], [['Beine; "schwer"\nzweite Zeile']]);
    expect(csv).toBe('﻿Notiz\r\n"Beine; ""schwer""\nzweite Zeile"\r\n');
  });

  it("leaves empty values empty and defuses formulas", () => {
    const csv = toCsv(["a", "b", "c"], [[null, undefined, "=SUM(A1)"]]);
    expect(csv).toBe("﻿a;b;c\r\n;;'=SUM(A1)\r\n");
  });
});
