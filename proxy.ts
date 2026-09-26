import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/session";

/**
 * First gate: everything except /login needs a valid session cookie.
 * Not the only gate: pages, Server Actions and route handlers check again
 * (lib/auth.ts), as the Next.js docs recommend.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login") return NextResponse.next();

  const ok = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value,
    process.env.SESSION_SECRET ?? "",
    process.env.APP_PASSWORD ?? "",
  );
  if (ok) return NextResponse.next();

  if (request.method !== "GET" && request.method !== "HEAD") {
    return new NextResponse("Nicht angemeldet", { status: 401 });
  }
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("weiter", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|apple-icon.png|manifest.webmanifest|robots.txt).*)",
  ],
};
