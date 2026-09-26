import { describe, expect, it } from "vitest";
import { formatDecimal, formatInt, formatSigned, parseDecimal, parseInteger, toInputValue } from "@/lib/numbers";

describe("parseDecimal", () => {
  it.each([
    ["82,5", 82.5],
    ["82.5", 82.5],
    [" 82 ", 82],
    ["1.234,5", 1234.5],
    ["1,234.5", 1234.5],
    ["0,75", 0.75],
    [",5", 0.5],
    ["82,", 82],
  ])("%s -> %d", (raw, expected) => {
    expect(parseDecimal(raw)).toBe(expected);
  });

  it("returns null for empty and NaN for garbage", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNaN();
    expect(parseDecimal("8,2,5")).toBeNaN();
    expect(parseDecimal("-3")).toBeNaN();
  });
});

describe("parseInteger", () => {
  it("treats dots and spaces as thousands separators", () => {
    expect(parseInteger("12.345")).toBe(12345);
    expect(parseInteger("12 345")).toBe(12345);
    expect(parseInteger("8000")).toBe(8000);
  });

  it("rejects decimals and garbage", () => {
    expect(parseInteger("12,5")).toBeNaN();
    expect(parseInteger("zehn")).toBeNaN();
    expect(parseInteger("")).toBeNull();
  });
});

describe("German formatting", () => {
  it("formats numbers the German way", () => {
    expect(formatInt(12345)).toBe("12.345");
    expect(formatDecimal(82.5)).toBe("82,5");
    expect(formatDecimal(15.2641, 1)).toBe("15,3");
    expect(formatDecimal(80, 1, true)).toBe("80,0");
    expect(formatSigned(-1.25)).toBe("-1,3");
    expect(formatSigned(2)).toBe("+2,0");
    expect(toInputValue(1234.5)).toBe("1234,5");
    expect(toInputValue(null)).toBe("");
  });
});
