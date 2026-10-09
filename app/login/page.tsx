import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { isAuthenticated } from "@/lib/auth";
import { safeNextPath } from "@/lib/session";
import { MISSION_RANGE_LABEL } from "@/lib/mission";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Anmelden" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = safeNextPath(typeof params.weiter === "string" ? params.weiter : undefined);
  if (await isAuthenticated()) redirect(next);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="bg-ink text-bg" style={{ borderBottom: "4px solid var(--color-acc)" }}>
        <div className="mx-auto max-w-[1180px] px-4 py-3 sm:px-6">
          <Wordmark href="/login" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[420px] flex-1 px-4 py-12 sm:px-6">
        <p className="t-label text-mute">{MISSION_RANGE_LABEL}</p>
        <h1 className="t-head mt-2 text-[34px]">Rein da.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-mute">
          Gemeinsames Passwort eingeben. Danach bleibt das Gerät 90 Tage angemeldet.
        </p>
        <LoginForm next={next} />
      </main>
    </div>
  );
}
