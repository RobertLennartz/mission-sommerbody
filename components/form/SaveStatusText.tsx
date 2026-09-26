import type { SaveStatus } from "./useAutosave";

const TIME = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });

export function SaveStatusText({ status, savedAt, error }: { status: SaveStatus; savedAt: Date | null; error: string | null }) {
  let text = "";
  let color = "var(--color-mute)";
  if (status === "saving" || status === "dirty") text = "Speichert ...";
  else if (status === "saved" && savedAt) text = `Gespeichert ${TIME.format(savedAt)}`;
  else if (status === "error") {
    text = error ?? "Nicht gespeichert";
    color = "var(--color-bad)";
  } else if (status === "invalid") {
    text = error ?? "Ungültiger Wert";
    color = "var(--color-bad)";
  }
  return (
    <span className="t-label t-label-sm block min-h-[14px]" style={{ color }} aria-live="polite">
      {text}
    </span>
  );
}
