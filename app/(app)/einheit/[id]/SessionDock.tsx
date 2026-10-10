"use client";

import { useEffect, useMemo, useOptimistic, useState, useSyncExternalStore, useTransition } from "react";
import { setSessionClock } from "@/app/actions/training";
import { useNow } from "@/components/useNow";
import { formatBerlinTime } from "@/lib/dates";
import { formatDuration } from "@/lib/duration";
import { REST_EXTEND_SEC, REST_PRESETS_SEC, elapsedSec, extendRest, parseRestState, restPhase, startRest, type RestState } from "@/lib/timers";

// ---------------------------------------------------------------------------
// Rest timer state: one per phone, in localStorage, so reloading the page or
// switching to another session keeps it running.
// ---------------------------------------------------------------------------

const REST_KEY = "ms:rest";
const REST_EVENT = "ms:rest-change";
let memoryRest: string | null = null; // fallback when localStorage is blocked

function subscribeRest(listener: () => void) {
  window.addEventListener("storage", listener);
  window.addEventListener(REST_EVENT, listener);
  return () => {
    window.removeEventListener("storage", listener);
    window.removeEventListener(REST_EVENT, listener);
  };
}

function readRest(): string | null {
  try {
    return window.localStorage.getItem(REST_KEY);
  } catch {
    return memoryRest;
  }
}

function writeRest(state: RestState) {
  memoryRest = state ? JSON.stringify(state) : null;
  try {
    if (memoryRest) window.localStorage.setItem(REST_KEY, memoryRest);
    else window.localStorage.removeItem(REST_KEY);
  } catch {
    // Private mode: the timer still works until the page is closed.
  }
  window.dispatchEvent(new Event(REST_EVENT));
}

// ---------------------------------------------------------------------------
// Sound: Web Audio has to be unlocked by a tap, so the beeps are scheduled
// when the timer is started. They only play while the app is in front.
// ---------------------------------------------------------------------------

let audio: AudioContext | null = null;
let beeps: OscillatorNode[] = [];

function unlockAudio() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audio ??= new Ctor();
    if (audio.state === "suspended") void audio.resume();
  } catch {
    audio = null;
  }
}

function cancelBeeps() {
  for (const osc of beeps) {
    try {
      osc.stop();
      osc.disconnect();
    } catch {
      // already finished
    }
  }
  beeps = [];
}

function scheduleBeeps(endAt: number) {
  cancelBeeps();
  if (!audio || audio.state === "closed") return;
  const start = audio.currentTime + Math.max(0, (endAt - Date.now()) / 1000);
  for (let i = 0; i < 3; i++) {
    const t = start + i * 0.4;
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.type = "sine";
    osc.frequency.value = i === 2 ? 1320 : 880;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    osc.connect(gain).connect(audio.destination);
    osc.start(t);
    osc.stop(t + 0.32);
    beeps.push(osc);
  }
}

// ---------------------------------------------------------------------------

type Clock = { startedAt: string | null; endedAt: string | null };

/**
 * Bar above the bottom navigation: training clock (start, running time,
 * total) and, for strength and HIIT, the rest timer.
 */
export function SessionDock({
  id,
  startedAt,
  endedAt,
  isToday,
  restCategory,
}: {
  id: string;
  startedAt: string | null;
  endedAt: string | null;
  /** Start and rest timer are offered on the session's own day only. */
  isToday: boolean;
  restCategory: boolean;
}) {
  const now = useNow();
  const [clock, setClock] = useOptimistic<Clock, Clock>({ startedAt, endedAt }, (_current, next) => next);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const restRaw = useSyncExternalStore(subscribeRest, readRest, () => null);
  const rest = useMemo(() => parseRestState(restRaw), [restRaw]);
  const phase = now === null ? ({ phase: "idle" } as const) : restPhase(rest, now);

  const running = clock.startedAt !== null && clock.endedAt === null;
  const ended = clock.startedAt !== null && clock.endedAt !== null;
  const showClock = isToday || clock.startedAt !== null;
  const showRest = restCategory && !ended && (isToday || running);

  // Beeps follow the timer; when the phone wakes up after the end, no late beep.
  const restEndAt = rest?.endAt ?? null;
  useEffect(() => {
    const sync = () => {
      if (restEndAt !== null && restEndAt > Date.now() && document.visibilityState === "visible") scheduleBeeps(restEndAt);
      else cancelBeeps();
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, [restEndAt]);

  const restOver = phase.phase === "over";
  useEffect(() => {
    if (restOver) navigator.vibrate?.([200, 100, 200, 100, 300]);
  }, [restOver]);

  // Keep the screen on while a rest runs, where the phone supports it.
  const restRunning = phase.phase === "running";
  useEffect(() => {
    if (!restRunning || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    let done = false;
    const request = async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const l = await navigator.wakeLock.request("screen");
        if (done) void l.release();
        else lock = l;
      } catch {
        // not allowed (battery saver), the timer works anyway
      }
    };
    void request();
    document.addEventListener("visibilitychange", request);
    return () => {
      done = true;
      document.removeEventListener("visibilitychange", request);
      void lock?.release().catch(() => undefined);
    };
  }, [restRunning]);

  if (!showClock && !showRest) return null;

  const runClock = (op: "start" | "stop" | "resume" | "reset", next: Clock) => {
    setError(null);
    startTransition(async () => {
      setClock(next);
      try {
        const result = await setSessionClock(id, op);
        if (!result.ok) setError(result.invalid ? result.error : "Nicht gespeichert. Bitte noch einmal tippen.");
      } catch {
        setError("Keine Verbindung. Bitte noch einmal tippen.");
      }
    });
  };
  const nowIso = () => new Date().toISOString();

  const elapsed = clock.startedAt === null ? 0 : ended || now !== null ? elapsedSec(clock.startedAt, clock.endedAt, now ?? 0) : null;

  return (
    <>
    {/* Space at the end of the page so the bar never covers the last controls. */}
    <div aria-hidden style={{ height: (showClock ? 80 : 0) + (showRest ? 64 : 0) + 8 }} />
    <div
      className="fixed inset-x-0 bottom-[calc(57px+env(safe-area-inset-bottom))] z-20 bg-bg sm:bottom-0"
      style={{ borderTop: "1.5px solid var(--color-ink)", boxShadow: "0 -6px 16px rgba(11,12,11,0.08)" }}
    >
      <div className="mx-auto flex max-w-[720px] flex-col px-4 sm:px-6">
        {showClock ? (
          <div className="flex items-center gap-3 py-2.5">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="t-label text-mute">
                {running && clock.startedAt ? (
                  <>
                    Training seit {formatBerlinTime(clock.startedAt)} ·{" "}
                    <button
                      type="button"
                      className="underline"
                      disabled={pending}
                      onClick={() => {
                        if (confirm("Zeitmessung abbrechen? Die gelaufene Zeit wird nicht gespeichert.")) {
                          runClock("reset", { startedAt: null, endedAt: null });
                        }
                      }}
                    >
                      Abbrechen
                    </button>
                  </>
                ) : ended && clock.startedAt && clock.endedAt ? (
                  `Trainingszeit · ${formatBerlinTime(clock.startedAt)} bis ${formatBerlinTime(clock.endedAt)}`
                ) : (
                  "Trainingszeit"
                )}
              </span>
              <span
                className="t-num text-[26px] font-medium leading-tight"
                style={{ color: clock.startedAt === null ? "var(--color-dead)" : undefined }}
                aria-live="off"
              >
                {elapsed === null ? " " : formatDuration(elapsed)}
              </span>
            </div>
            {running ? (
              <button
                type="button"
                className="btn btn-primary min-w-[112px]"
                disabled={pending}
                onClick={() => runClock("stop", { startedAt: clock.startedAt, endedAt: nowIso() })}
              >
                Beenden
              </button>
            ) : ended ? (
              <button type="button" className="btn btn-sm" disabled={pending} onClick={() => runClock("resume", { startedAt: clock.startedAt, endedAt: null })}>
                Fortsetzen
              </button>
            ) : (
              <button
                type="button"
                className="btn btn-primary min-w-[112px]"
                disabled={pending}
                onClick={() => runClock("start", { startedAt: nowIso(), endedAt: null })}
              >
                Starten
              </button>
            )}
          </div>
        ) : null}
        {error ? (
          <p className="pb-2 text-[13px] text-bad" role="alert">
            {error}
          </p>
        ) : null}

        {showRest ? (
          <div
            className="-mx-4 flex min-h-[60px] items-center gap-2 px-4 py-2 sm:-mx-6 sm:px-6"
            style={{
              borderTop: showClock ? "1px solid var(--color-line)" : undefined,
              background: phase.phase === "over" ? "var(--color-acc)" : undefined,
              color: phase.phase === "over" ? "var(--color-acc-on)" : undefined,
            }}
            role="group"
            aria-label="Pausen-Timer"
          >
            {phase.phase === "running" ? (
              <>
                <span className="t-label w-[44px] shrink-0">Pause</span>
                <span className="t-num flex-1 text-[26px] font-medium" role="timer">
                  {formatDuration(phase.remainingSec)}
                </span>
                <button
                  type="button"
                  className="btn btn-sm t-num"
                  onClick={() => {
                    unlockAudio();
                    writeRest(extendRest(rest, Date.now()));
                  }}
                >
                  +{REST_EXTEND_SEC} s
                </button>
                <button type="button" className="btn btn-sm" onClick={() => writeRest(null)}>
                  Stopp
                </button>
              </>
            ) : phase.phase === "over" ? (
              <>
                <span className="t-strong flex-1 text-[16px] uppercase" role="status">
                  Pause vorbei <span className="t-num text-[14px] font-medium">+{formatDuration(phase.overSec)}</span>
                </span>
                <button type="button" className="btn btn-sm" onClick={() => writeRest(null)}>
                  OK
                </button>
              </>
            ) : (
              <>
                <span className="t-label w-[44px] shrink-0">Pause</span>
                <div className="grid flex-1 grid-cols-4 gap-1.5">
                  {REST_PRESETS_SEC.map((sec) => (
                    <button
                      key={sec}
                      type="button"
                      className="btn btn-sm t-num px-0"
                      aria-label={`Pause ${formatDuration(sec)} Minuten starten`}
                      onClick={() => {
                        unlockAudio();
                        writeRest(startRest(sec, Date.now()));
                      }}
                    >
                      {formatDuration(sec)}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </div>
    </>
  );
}
