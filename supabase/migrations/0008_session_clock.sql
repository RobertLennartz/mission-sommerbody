-- Training clock (10.10.2026): when a tracked session was started and ended.
-- Additive only: two nullable columns, no existing row is changed.

alter table public.sessions
  add column started_at timestamptz,
  add column ended_at timestamptz;

alter table public.sessions
  add constraint sessions_clock_order
  check (ended_at is null or (started_at is not null and ended_at >= started_at));
