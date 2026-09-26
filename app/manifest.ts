import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mission Sommerbody",
    short_name: "Sommerbody",
    start_url: "/heute",
    display: "standalone",
    background_color: "#FFFFFF",
    theme_color: "#0B0C0B",
    lang: "de",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
