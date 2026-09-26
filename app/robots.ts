import type { MetadataRoute } from "next";

/** Private app: nothing to index, not even the login page. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
