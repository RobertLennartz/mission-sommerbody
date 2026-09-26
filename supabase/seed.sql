-- Mission Sommerbody: starting data. Safe to run more than once.
-- Everything here can be changed later in the app.

insert into public.athletes (slug, name, sort_order)
values ('robert', 'Robert', 1), ('eddie', 'Eddie', 2)
on conflict (slug) do nothing;

insert into public.exercises (name)
select v.name
from (values
  ('Bankdrücken'), ('Schrägbankdrücken KH'), ('Schulterdrücken'), ('Seitheben'),
  ('Trizepsdrücken am Kabel'), ('Klimmzüge'), ('Langhantelrudern'), ('Latziehen'),
  ('Face Pulls'), ('Bizepscurls'), ('Kniebeugen'), ('Rumänisches Kreuzheben'),
  ('Beinpresse'), ('Ausfallschritte'), ('Wadenheben'), ('Hip Thrust')
) as v (name)
where not exists (
  select 1 from public.exercises e where lower(btrim(e.name)) = lower(btrim(v.name))
);

insert into public.plan_templates (name, category, default_duration_min, activity, default_distance_km)
values
  ('Push', 'strength', 60, null, null),
  ('Pull', 'strength', 60, null, null),
  ('Beine', 'strength', 60, null, null),
  ('Ganzkörper', 'strength', 60, null, null),
  ('HIIT-Kurs', 'hiit', 45, 'HIIT-Kurs', null),
  ('Lauf 5 km', 'cardio', 30, 'Laufen', 5)
on conflict (name) do nothing;

-- Template exercises, only for templates that have none yet.
with plan (template, position, exercise, sets, reps) as (
  values
    ('Push', 1, 'Bankdrücken', 4, '6-8'),
    ('Push', 2, 'Schrägbankdrücken KH', 3, '8-10'),
    ('Push', 3, 'Schulterdrücken', 3, '8-10'),
    ('Push', 4, 'Seitheben', 3, '12-15'),
    ('Push', 5, 'Trizepsdrücken am Kabel', 3, '10-12'),
    ('Pull', 1, 'Klimmzüge', 4, '6-10'),
    ('Pull', 2, 'Langhantelrudern', 3, '8-10'),
    ('Pull', 3, 'Latziehen', 3, '10-12'),
    ('Pull', 4, 'Face Pulls', 3, '12-15'),
    ('Pull', 5, 'Bizepscurls', 3, '10-12'),
    ('Beine', 1, 'Kniebeugen', 4, '6-8'),
    ('Beine', 2, 'Rumänisches Kreuzheben', 3, '8-10'),
    ('Beine', 3, 'Beinpresse', 3, '10-12'),
    ('Beine', 4, 'Ausfallschritte', 3, '10'),
    ('Beine', 5, 'Wadenheben', 4, '12-15'),
    ('Ganzkörper', 1, 'Kniebeugen', 3, '8'),
    ('Ganzkörper', 2, 'Bankdrücken', 3, '8'),
    ('Ganzkörper', 3, 'Langhantelrudern', 3, '10'),
    ('Ganzkörper', 4, 'Schulterdrücken', 3, '10'),
    ('Ganzkörper', 5, 'Hip Thrust', 3, '10')
)
insert into public.plan_template_exercises (template_id, position, exercise_id, target_sets, target_reps)
select t.id, p.position, e.id, p.sets, p.reps
from plan p
join public.plan_templates t on t.name = p.template
join public.exercises e on lower(e.name) = lower(p.exercise)
where not exists (
  select 1 from public.plan_template_exercises x where x.template_id = t.id
);

insert into public.week_templates (name)
values ('Standardwoche')
on conflict (name) do nothing;

with week (weekday, template) as (
  values (1, 'Push'), (2, 'HIIT-Kurs'), (3, 'Pull'), (4, 'Lauf 5 km'), (5, 'Beine'), (6, 'HIIT-Kurs')
)
insert into public.week_template_items (week_template_id, weekday, slot, plan_template_id)
select w.id, week.weekday, 1, t.id
from week
join public.week_templates w on w.name = 'Standardwoche'
join public.plan_templates t on t.name = week.template
where not exists (
  select 1 from public.week_template_items i where i.week_template_id = w.id
);
