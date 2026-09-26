export type NavItem = { href: string; label: string };

export const NAV_ITEMS: NavItem[] = [
  { href: "/heute", label: "Heute" },
  { href: "/woche", label: "Woche" },
  { href: "/planung", label: "Planung" },
  { href: "/ernaehrung", label: "Ernährung" },
  { href: "/checkups", label: "Checkups" },
  { href: "/uebersicht", label: "Übersicht" },
  { href: "/einstellungen", label: "Einstellungen" },
];

/** Phones: the first four directly in the bottom bar, the rest under "Mehr". */
export const BOTTOM_PRIMARY = NAV_ITEMS.slice(0, 4);
export const BOTTOM_MORE = NAV_ITEMS.slice(4);

export function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
