import type { Metadata } from "next";

export const metadata: Metadata = { title: "Heute" };

export default function Page() {
  return (
    <div>
      <h1 className="t-head text-[30px]">Heute</h1>
      <p className="mt-3 text-[15px] text-mute">Kommt mit Meilenstein 2.</p>
    </div>
  );
}
