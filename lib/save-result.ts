/** What every autosave Server Action returns. Validation errors are not retried. */
export type SaveResult = { ok: true } | { ok: false; error: string; invalid?: boolean };

export const saved: SaveResult = { ok: true };

export function invalid(error: string): SaveResult {
  return { ok: false, error, invalid: true };
}
