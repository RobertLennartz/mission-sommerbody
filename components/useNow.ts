"use client";

import { useSyncExternalStore } from "react";

// One shared ticker for all clocks on the page. Times are always computed from
// timestamps, so a throttled tab (phone locked) shows the right value again
// as soon as it wakes up.
const TICK_MS = 250;
let now = 0;
let timer: ReturnType<typeof setInterval> | null = null;
const listeners = new Set<() => void>();

function tick() {
  now = Date.now();
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(tick, TICK_MS);
    document.addEventListener("visibilitychange", tick);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", tick);
    }
  };
}

function getSnapshot() {
  if (now === 0) now = Date.now();
  return now;
}

/** Current time in ms, updated four times a second; null during server render and hydration. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}
