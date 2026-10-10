-- New category "light" (10.10.2026): easy cycling or walking before or after
-- training. Counts toward energy, not toward the weekly training goal.
-- Only widens the allowed values; no existing row is changed.

alter table public.sessions drop constraint sessions_category_check;
alter table public.sessions add constraint sessions_category_check
  check (category in ('strength', 'cardio', 'hiit', 'recovery', 'light'));

alter table public.plan_templates drop constraint plan_templates_category_check;
alter table public.plan_templates add constraint plan_templates_category_check
  check (category in ('strength', 'cardio', 'hiit', 'recovery', 'light'));
