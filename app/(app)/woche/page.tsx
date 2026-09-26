import type { Metadata } from "next";

export const metadata: Metadata = { title: "Woche" };

export default function Page() {
  return (
    <div>
      <h1 className="t-head text-[30px]">Woche</h1>
      <p className="mt-3 text-[15px] text-mute">Kommt mit Meilenstein 4.</p>
    </div>
  );
}
