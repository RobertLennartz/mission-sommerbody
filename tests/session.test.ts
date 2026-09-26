import { describe, expect, it } from "vitest";
import { SESSION_MAX_AGE_SECONDS, createSessionToken, safeNextPath, verifySessionToken } from "@/lib/session";

const SECRET = "test-secret-with-enough-entropy-000000";
const PASSWORD = "vier zufaellige woerter";
const NOW = Date.UTC(2026, 9, 12, 8, 0, 0);

describe("session token", () => {
  it("accepts its own token", async () => {
    const token = await createSessionToken(SECRET, PASSWORD, NOW);
    expect(await verifySessionToken(token, SECRET, PASSWORD, NOW)).toBe(true);
  });

  it("expires after 90 days", async () => {
    const token = await createSessionToken(SECRET, PASSWORD, NOW);
    const justBefore = NOW + (SESSION_MAX_AGE_SECONDS - 1) * 1000;
    const after = NOW + SESSION_MAX_AGE_SECONDS * 1000;
    expect(await verifySessionToken(token, SECRET, PASSWORD, justBefore)).toBe(true);
    expect(await verifySessionToken(token, SECRET, PASSWORD, after)).toBe(false);
  });

  it("rejects tampered tokens", async () => {
    const token = await createSessionToken(SECRET, PASSWORD, NOW);
    const [exp, sig] = token.split(".");
    const longer = `${Number(exp) + 1_000_000}.${sig}`;
    const flipped = `${exp}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`;
    expect(await verifySessionToken(longer, SECRET, PASSWORD, NOW)).toBe(false);
    expect(await verifySessionToken(flipped, SECRET, PASSWORD, NOW)).toBe(false);
    expect(await verifySessionToken("garbage", SECRET, PASSWORD, NOW)).toBe(false);
    expect(await verifySessionToken(undefined, SECRET, PASSWORD, NOW)).toBe(false);
  });

  it("logs everyone out when the password or the secret changes", async () => {
    const token = await createSessionToken(SECRET, PASSWORD, NOW);
    expect(await verifySessionToken(token, SECRET, "neues passwort", NOW)).toBe(false);
    expect(await verifySessionToken(token, "another-secret", PASSWORD, NOW)).toBe(false);
  });

  it("refuses to verify without configured secrets", async () => {
    const token = await createSessionToken(SECRET, PASSWORD, NOW);
    expect(await verifySessionToken(token, "", PASSWORD, NOW)).toBe(false);
    expect(await verifySessionToken(token, SECRET, "", NOW)).toBe(false);
  });
});

describe("safeNextPath", () => {
  it("only allows local paths", () => {
    expect(safeNextPath("/woche?kw=43")).toBe("/woche?kw=43");
    expect(safeNextPath("https://evil.example")).toBe("/heute");
    expect(safeNextPath("//evil.example")).toBe("/heute");
    expect(safeNextPath("/\\evil.example")).toBe("/heute");
    expect(safeNextPath("/login")).toBe("/heute");
    expect(safeNextPath(undefined)).toBe("/heute");
  });
});
