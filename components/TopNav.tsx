"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, isActive } from "@/lib/nav";

/** Laptop navigation: white bar, active item with a 4 px yellow underline. */
export function TopNav() {
  const pathname = usePathname();
  return (
    <nav
      className="hidden bg-bg sm:block"
      style={{ borderBottom: "1.5px solid var(--color-ink)" }}
      aria-label="Hauptnavigation"
    >
      <div className="mx-auto flex max-w-[1180px] items-stretch gap-1 overflow-x-auto px-4">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`t-strong whitespace-nowrap px-4 py-3 text-[12px] uppercase tracking-[0.06em] ${
                active ? "text-ink" : "text-mute hover:text-ink"
              }`}
              style={active ? { boxShadow: "inset 0 -4px 0 0 var(--color-acc)" } : undefined}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
