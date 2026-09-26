"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="mt-8 flex flex-col gap-4">
      <input type="hidden" name="weiter" value={next} />
      <label className="flex flex-col gap-2">
        <span className="t-label">Passwort</span>
        <input
          className="field"
          type="password"
          name="password"
          autoComplete="current-password"
          required
          autoFocus
          aria-invalid={state.error ? true : undefined}
          aria-describedby={state.error ? "login-error" : undefined}
        />
      </label>

      {state.error ? (
        <p
          id="login-error"
          role="alert"
          className="px-3 py-2 text-[14px]"
          style={{ border: "1.5px solid var(--color-bad)", color: "var(--color-bad)" }}
        >
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-primary w-full" disabled={pending}>
        {pending ? "Wird geprüft ..." : "Einloggen"}
      </button>
    </form>
  );
}
