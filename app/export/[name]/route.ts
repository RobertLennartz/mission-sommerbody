import { strToU8, zipSync } from "fflate";
import { isAuthenticated } from "@/lib/auth";
import { EXPORTS, buildExport, type ExportName } from "@/lib/data/export";
import { berlinToday } from "@/lib/dates";

export async function GET(_request: Request, ctx: RouteContext<"/export/[name]">) {
  if (!(await isAuthenticated())) return new Response("Nicht angemeldet", { status: 401 });
  const { name } = await ctx.params;
  const stamp = berlinToday();
  const headers = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" };

  if (name === "alles.zip") {
    const files: Record<string, Uint8Array> = {};
    for (const key of Object.keys(EXPORTS) as ExportName[]) {
      files[`${key}.csv`] = strToU8(await buildExport(key));
    }
    return new Response(Buffer.from(zipSync(files)), {
      headers: { ...headers, "Content-Type": "application/zip", "Content-Disposition": `attachment; filename="mission-sommerbody-${stamp}.zip"` },
    });
  }

  const key = name.replace(/\.csv$/, "") as ExportName;
  if (!(key in EXPORTS)) return new Response("Unbekannter Export", { status: 404 });
  return new Response(await buildExport(key), {
    headers: { ...headers, "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${key}-${stamp}.csv"` },
  });
}
