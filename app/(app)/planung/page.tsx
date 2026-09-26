import type { Metadata } from "next";

export const metadata: Metadata = { title: "Planung" };

export default function Page() {
  return (
    <div>
      <h1 className="t-head text-[30px]">Planung</h1>
      <p className="mt-3 text-[15px] text-mute">Kommt mit Meilenstein 3.</p>
    </div>
  );
}
