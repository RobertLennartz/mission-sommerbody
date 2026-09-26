import "server-only";

type EnvName = "APP_PASSWORD" | "SESSION_SECRET" | "SUPABASE_URL" | "SUPABASE_SECRET_KEY";

/**
 * Read at runtime, never at build time: the build needs no secrets, and a
 * missing variable fails with a message that says what to do.
 */
export function requireEnv(name: EnvName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Umgebungsvariable ${name} fehlt. Lokal in .env.local eintragen, auf Vercel unter Settings > Environment Variables.`,
    );
  }
  return value;
}
