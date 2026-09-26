"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logout } from "@/app/login/actions";
import { BOTTOM_MORE, BOTTOM_PRIMARY, isActive } from "@/lib/nav";

/**
 * Phone navigation at the bottom, within thumb reach. Deliberate deviation
 * from One and Done: seven items at the top would scroll sideways on 375 px.
 */
export function BottomNav() {
  const pathname = usePathname();
  // The sheet belongs to the page it was opened on, so navigating closes it.
  const [openedOn, setOpenedOn] = useState<string | null>(null);
  const moreOpen = openedOn === pathname;
  const setMoreOpen = (open: boolean) => setOpenedOn(open ? pathname : null);
  const moreActive = BOTTOM_MORE.some((item) => isActive(pathname, item.href));

  const itemClass = (active: boolean) =>
    `t-strong flex min-h-[56px] flex-1 items-center justify-center px-1 text-[11px] uppercase tracking-[0.04em] ${
      active ? "text-ink" : "text-mute"
    }`;
  const activeStyle = { boxShadow: "inset 0 4px 0 0 var(--color-acc)" };

  return (
    <>
      {moreOpen ? (
        <div className="fixed inset-0 z-30 bg-ink/40 sm:hidden" onClick={() => setMoreOpen(false)} aria-hidden />
      ) : null}
      {moreOpen ? (
        <div
          id="mehr-menu"
          className="fixed inset-x-0 bottom-[57px] z-40 bg-bg sm:hidden"
          style={{ borderTop: "1.5px solid var(--color-ink)" }}
        >
          <ul className="divide-line">
            {BOTTOM_MORE.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="t-strong flex min-h-[52px] items-center px-5 text-[14px] uppercase"
                  aria-current={isActive(pathname, item.href) ? "page" : undefined}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <form action={logout}>
                <button type="submit" className="t-strong flex min-h-[52px] w-full items-center px-5 text-[14px] uppercase text-mute">
                  Abmelden
                </button>
              </form>
            </li>
          </ul>
        </div>
      ) : null}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex bg-bg pb-[env(safe-area-inset-bottom)] sm:hidden"
        style={{ borderTop: "1.5px solid var(--color-ink)" }}
        aria-label="Hauptnavigation"
      >
        {BOTTOM_PRIMARY.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={itemClass(active)}
              style={active ? activeStyle : undefined}
            >
              {item.label}
            </Link>
          );
        })}
        <button
          type="button"
          className={itemClass(moreActive || moreOpen)}
          style={moreActive ? activeStyle : undefined}
          aria-expanded={moreOpen}
          aria-controls="mehr-menu"
          onClick={() => setMoreOpen(!moreOpen)}
        >
          Mehr
        </button>
      </nav>
    </>
  );
}
