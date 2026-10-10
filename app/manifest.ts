import type { MetadataRoute } from "next";
import { MISSION_RANGE_LABEL } from "@/lib/mission";

/**
 * Makes the site installable ("Zum Home-Bildschirm"): own icon, starts
 * without browser bars. iOS takes its icon from app/apple-icon.png.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Mission Sommerbody",
    short_name: "Sommerbody",
    description: `Trainingsphase von Robert, Eddie und Anny, ${MISSION_RANGE_LABEL}.`,
    start_url: "/heute",
    scope: "/",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B0C0B",
    lang: "de",
    icons: [
      { src: "/icons/icon-192.png", type: "image/png", sizes: "192x192", purpose: "any" },
      { src: "/icons/icon-512.png", type: "image/png", sizes: "512x512", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", type: "image/png", sizes: "512x512", purpose: "maskable" },
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
    ],
  };
}
