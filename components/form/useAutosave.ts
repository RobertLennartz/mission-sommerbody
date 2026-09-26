"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SaveResult } from "@/lib/save-result";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error" | "invalid";

// Unsaved work across all fields on the page: the tab warns before closing.
const pending = new Set<string>();
let unloadGuard = false;
function markPending(id: string, isPending: boolean) {
  if (isPending) pending.add(id);
  else pending.delete(id);
  if (!unloadGuard && typeof window !== "undefined") {
    unloadGuard = true;
    window.addEventListener("beforeunload", (event) => {
      if (pending.size > 0) event.preventDefault();
    });
  }
}

function readDraft(key: string | undefined): string | null {
  if (!key) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDraft(key: string | undefined, value: string | null) {
  if (!key) return;
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch {
    // Private mode or full storage: the field still works, only the backup is gone.
  }
}

/**
 * Autosave for one field: saves after a typing pause and on blur, one request
 * at a time, always the newest value. Failed saves (dead spot in the gym) stay
 * in the field and in localStorage and are retried when the network is back.
 */
export function useAutosave(opts: {
  id: string;
  initial: string;
  save: (value: string) => Promise<SaveResult>;
  validate?: (value: string) => string | null;
  debounceMs?: number;
  /** localStorage key for the unsaved draft; omit to disable. */
  draftKey?: string;
}) {
  const { id, initial, save, validate, debounceMs = 800, draftKey } = opts;
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  const lastSaved = useRef(initial);
  const latest = useRef(initial);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const runRef = useRef<() => Promise<void>>(async () => {});
  const saveRef = useRef(save);
  const validateRef = useRef(validate);
  useEffect(() => {
    saveRef.current = save;
    validateRef.current = validate;
  });

  const run = useCallback(async () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    if (inFlight.current) return;
    const current = latest.current;
    if (current === lastSaved.current) {
      markPending(id, false);
      return;
    }
    const problem = validateRef.current?.(current) ?? null;
    if (problem) {
      setStatus("invalid");
      setError(problem);
      return;
    }
    inFlight.current = true;
    setStatus("saving");
    try {
      const result = await saveRef.current(current);
      if (result.ok) {
        lastSaved.current = current;
        setError(null);
        setSavedAt(new Date());
        if (latest.current === current) {
          writeDraft(draftKey, null);
          markPending(id, false);
          setStatus("saved");
        }
      } else {
        setStatus(result.invalid ? "invalid" : "error");
        setError(result.error);
      }
    } catch {
      setStatus("error");
      setError("Nicht gespeichert, keine Verbindung. Wird automatisch wiederholt.");
    } finally {
      inFlight.current = false;
    }
    // Typed on while the request ran: save the newer value too.
    if (latest.current !== lastSaved.current && !validateRef.current?.(latest.current)) {
      timer.current = setTimeout(() => void runRef.current(), 50);
    }
  }, [id, draftKey]);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  const change = useCallback(
    (next: string) => {
      setValue(next);
      latest.current = next;
      const problem = validateRef.current?.(next) ?? null;
      if (problem) {
        setStatus("invalid");
        setError(problem);
      } else {
        setStatus(next === lastSaved.current ? "idle" : "dirty");
        setError(null);
      }
      const isDirty = next !== lastSaved.current;
      markPending(id, isDirty);
      writeDraft(draftKey, isDirty ? next : null);
      if (timer.current) clearTimeout(timer.current);
      if (!problem && isDirty) timer.current = setTimeout(run, debounceMs);
    },
    [id, draftKey, debounceMs, run],
  );

  // A draft from an earlier failed save wins over the server value once.
  useEffect(() => {
    const draft = readDraft(draftKey);
    if (draft !== null && draft !== initial) {
      const t = setTimeout(() => change(draft), 0);
      return () => clearTimeout(t);
    }
  }, [draftKey, initial, change]);

  // Retry failed saves when the connection returns, and every 15 seconds.
  useEffect(() => {
    if (status !== "error") return;
    const retry = () => void run();
    window.addEventListener("online", retry);
    const interval = setInterval(retry, 15_000);
    return () => {
      window.removeEventListener("online", retry);
      clearInterval(interval);
    };
  }, [status, run]);

  useEffect(() => () => markPending(id, false), [id]);

  return { value, change, flush: run, status, error, savedAt };
}
