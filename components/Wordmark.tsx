import Link from "next/link";
import { APP_NAME } from "@/lib/brand";

export function Wordmark({ href = "/heute" }: { href?: string }) {
  return (
    <Link href={href} className="t-head text-[18px] text-bg sm:text-[22px]">
      {APP_NAME}
    </Link>
  );
}
