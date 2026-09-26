/**
 * Signed session cookie: "<expiresAtSeconds>.<signature>".
 *
 * The signature is HMAC-SHA256 with SESSION_SECRET over the expiry and a
 * fingerprint of APP_PASSWORD. Changing either secret invalidates every
 * session, so a new password logs out all devices.
 *
 * Web Crypto only, so this runs in proxy.ts as well as in server code.
 */

export const SESSION_COOKIE = "ms_session";
export const SESSION_MAX_AGE_SECONDS = 90 * 24 * 60 * 60;

const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sign(message: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(message)));
}

async function payload(expiresAt: number, password: string): Promise<string> {
  return `v1|${expiresAt}|${await sha256Hex(password)}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(
  secret: string,
  password: string,
  nowMs: number = Date.now(),
): Promise<string> {
  const expiresAt = Math.floor(nowMs / 1000) + SESSION_MAX_AGE_SECONDS;
  return `${expiresAt}.${await sign(await payload(expiresAt, password), secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  password: string,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret || !password) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expiresRaw = token.slice(0, dot);
  if (!/^\d+$/.test(expiresRaw)) return false;
  const expiresAt = Number(expiresRaw);
  if (expiresAt * 1000 <= nowMs) return false;
  const expected = await sign(await payload(expiresAt, password), secret);
  return constantTimeEqual(token.slice(dot + 1), expected);
}

/** Only same-site relative paths are allowed as redirect target after login. */
export function safeNextPath(raw: unknown): string {
  if (typeof raw !== "string") return "/heute";
  if (!raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return "/heute";
  if (raw.startsWith("/login")) return "/heute";
  return raw;
}
