/**
 * CSV for German Excel: semicolon separator, decimal comma, UTF-8 with BOM
 * (without it Excel shows umlauts wrong), dates stay ISO (YYYY-MM-DD).
 */

export type Cell = string | number | boolean | null | undefined;

const BOM = "﻿";

function cell(value: Cell): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "number") s = Number.isFinite(value) ? String(value).replace(".", ",") : "";
  else if (typeof value === "boolean") s = value ? "ja" : "nein";
  else s = value;
  // Quote when needed; Excel also treats a leading = + - @ as a formula.
  if (/^[=+\-@]/.test(s) && typeof value === "string") s = `'${s}`;
  if (/[;"\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(header: string[], rows: Cell[][]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(";"));
  return BOM + lines.join("\r\n") + "\r\n";
}
