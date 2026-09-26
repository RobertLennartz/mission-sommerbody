/**
 * fetch with exactly one retry for short outages (taken over from One and Done).
 *
 * Supabase on the free plan occasionally answers 502/503/504 or drops a
 * connection for a few seconds. One retry after a short pause catches that.
 *
 * Only reads are retried (GET/HEAD). A write that came back with 504 may
 * still have landed, and sending it again could store it twice. 500 is not
 * retried either: that is usually a real error that would repeat.
 */

const TRANSIENT = new Set([502, 503, 504]);
const PAUSE_MS = 400;

export function shouldRetry(
  method: string,
  result: { status?: number; networkError?: boolean },
): boolean {
  const m = method.toUpperCase();
  if (m !== "GET" && m !== "HEAD") return false;
  if (result.networkError) return true;
  return result.status !== undefined && TRANSIENT.has(result.status);
}

function pause() {
  return new Promise((resolve) => setTimeout(resolve, PAUSE_MS));
}

export const fetchWithRetry: typeof fetch = async (input, init) => {
  const method =
    init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");

  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error) {
    if (!shouldRetry(method, { networkError: true })) throw error;
    await pause();
    return fetch(input, init);
  }

  if (!shouldRetry(method, { status: response.status })) return response;
  await pause();
  return fetch(input, init);
};
