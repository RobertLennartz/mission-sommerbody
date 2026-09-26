-- Flexible training (Robert, 26.09.2026): no fixed 3 strength + 3 cardio.
-- New category "recovery"; one weekly target for all trainings instead of two.

alter table public.sessions drop constraint sessions_category_check;
alter table public.sessions add constraint sessions_category_check
  check (category in ('strength', 'cardio', 'hiit', 'recovery'));

alter table public.plan_templates drop constraint plan_templates_category_check;
alter table public.plan_templates add constraint plan_templates_category_check
  check (category in ('strength', 'cardio', 'hiit', 'recovery'));

alter table public.athletes
  add column training_target_per_week smallint not null default 5
    check (training_target_per_week between 0 and 14);

alter table public.athletes drop column strength_target_per_week;
alter table public.athletes drop column cardio_target_per_week;
