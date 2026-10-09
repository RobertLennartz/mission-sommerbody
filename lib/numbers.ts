/**
 * Number input and output in German conventions.
 *
 * Parsing returns null for an empty field and NaN for anything that is not a
 * number, so callers can tell "nothing entered" from "typo".
 */

const DECIMAL = /^\d+(\.\d*)?$|^\.\d+$/;
const INTEGER = /^\d+$/;

/** "82,5", "82.5", " 82 " and "1.234,5" all parse; the last separator is the decimal one. */
export function parseDecimal(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (s === "") return null;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma !== -1 && lastDot !== -1) {
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    s = s.split(thousandsSep).join("").replace(decimalSep, ".");
  } else if (lastComma !== -1) {
    s = s.replace(",", ".");
  }
  if (!DECIMAL.test(s)) return NaN;
  return Number(s);
}

/** Whole numbers: dots and spaces count as thousands separators ("12.345" is 12345). */
export function parseInteger(raw: string): number | null {
  const s = raw.trim().replace(/[\s.]/g, "");
  if (s === "") return null;
  if (!INTEGER.test(s)) return NaN;
  return Number(s);
}

const intFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 });

/** 12345 -> "12.345" */
export function formatInt(n: number): string {
  return intFormat.format(n);
}

/** 82.5 -> "82,5"; trailing zeros are dropped unless fixed is set. */
export function formatDecimal(n: number, digits = 1, fixed = false): string {
  return new Intl.NumberFormat("de-DE", {
    minimumFractionDigits: fixed ? digits : 0,
    maximumFractionDigits: digits,
  }).format(n);
}

/** Value for an input field: German comma, no thousands dots, empty for null. */
export function toInputValue(n: number | null | undefined, digits = 2): string {
  if (n === null || n === undefined) return "";
  return new Intl.NumberFormat("de-DE", {
    maximumFractionDigits: digits,
    useGrouping: false,
  }).format(n);
}

export function formatSigned(n: number, digits = 1): string {
  const s = formatDecimal(Math.abs(n), digits, true);
  if (n > 0) return `+${s}`;
  if (n < 0) return `-${s}`;
  return s;
}

/** "1 Tag", "3 Tage" */
export function daysLabel(n: number): string {
  return `${formatInt(n)} ${n === 1 ? "Tag" : "Tage"}`;
}

/** "Eddie", "Eddie und Anny", "Robert, Eddie und Anny" */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} und ${names[names.length - 1]}`;
}
