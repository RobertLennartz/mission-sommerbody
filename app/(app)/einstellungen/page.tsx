import type { Metadata } from "next";

export const metadata: Metadata = { title: "Einstellungen" };

export default function Page() {
  return (
    <div>
      <h1 className="t-head text-[30px]">Einstellungen</h1>
      <p className="mt-3 text-[15px] text-mute">Kommt mit Meilenstein 6.</p>
    </div>
  );
}
