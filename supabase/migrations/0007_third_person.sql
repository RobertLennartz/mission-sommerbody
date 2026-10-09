-- Third person (Anny, 09.10.2026) and a per-person body fat formula.
-- Additive only: no existing row is changed except setting the formula
-- Robert chose for himself and Eddie (Jackson/Pollock men).

alter table public.athletes
  add column bodyfat_formula text check (bodyfat_formula in ('jp7_male', 'jp7_female'));

update public.athletes set bodyfat_formula = 'jp7_male' where slug in ('robert', 'eddie') and bodyfat_formula is null;

-- No fixed weekly goal for Anny: 0 means "kein Ziel".
insert into public.athletes (slug, name, sort_order, training_target_per_week)
values ('anny', 'Anny', 3, 0)
on conflict (slug) do nothing;
