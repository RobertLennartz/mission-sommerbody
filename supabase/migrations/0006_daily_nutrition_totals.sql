-- Daily totals for protein and calories (Robert, 27.09.2026): a rough
-- estimate for the whole day. When set, it wins over the sum of the meals.

alter table public.daily_logs
  add column protein_total_g numeric(5, 1) check (protein_total_g between 0 and 500),
  add column kcal_total integer check (kcal_total between 0 and 10000);
