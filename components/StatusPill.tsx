import { STATUS_LABEL } from "@/lib/categories";
import type { SessionStatus } from "@/lib/supabase/database.types";

const COLOR: Record<SessionStatus, string> = { planned: "text-mute", done: "text-good", skipped: "text-bad" };

export function StatusPill({ status }: { status: SessionStatus }) {
  return <span className={`pill ${COLOR[status]}`}>{STATUS_LABEL[status]}</span>;
}
