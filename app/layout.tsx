import type { Metadata, Viewport } from "next";
import { Archivo, Roboto_Mono } from "next/font/google";
import { APP_NAME } from "@/lib/brand";
import "./globals.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "800", "900"],
  display: "swap",
});

const robotoMono = Roboto_Mono({
  variable: "--font-roboto-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s · ${APP_NAME}` },
  description: "Trainingsphase von Robert und Eddie, 12.10. bis 13.11.2026.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Sommerbody", statusBarStyle: "black" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0B0C0B",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${archivo.variable} ${robotoMono.variable}`}>
      <body className="bg-bg text-ink min-h-dvh">{children}</body>
    </html>
  );
}
