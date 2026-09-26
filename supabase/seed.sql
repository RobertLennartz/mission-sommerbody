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
  ('Lauf 5 km', 'cardio', 30, 'Laufen', 5),
  ('Schwimmen', 'cardio', 45, 'Schwimmen', null),
  ('Recovery', 'recovery', 30, 'Mobility', null)
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

-- Robert's own training plans (26.09.2026). Sets and reps are defaults,
-- editable in the app under Planung > Vorlagen.
insert into public.exercises (name)
select v.name
from (values
  ('Brustpresse'), ('Rudern'), ('Schrägbankdrücken'), ('Reverse Flys (Maschine)'),
  ('Kabel-Lateral-Raise'), ('Langhantel-Bizeps-Curls'), ('Samurai-Extensions'), ('Schulter-Raise-Mix'),
  ('Trizeps-Drücken'), ('Bizeps-Curls am Kabelzug'), ('Warm-up'), ('Wall-Sit'), ('Romanian Deadlift'),
  ('Bulgarian Split Squat'), ('Beinbeugen'), ('Beinstrecken'), ('Abductor-Maschine')
) as v (name)
where not exists (
  select 1 from public.exercises e where lower(btrim(e.name)) = lower(btrim(v.name))
);

insert into public.plan_templates (name, category, default_duration_min)
values ('Oberkörper 1', 'strength', 60), ('Oberkörper 2', 'strength', 60), ('Unterkörper', 'strength', 60)
on conflict (name) do nothing;

with plan (template, position, exercise, sets, reps) as (
  values
    ('Oberkörper 1', 1, 'Brustpresse', 3, '8-12'),
    ('Oberkörper 1', 2, 'Klimmzüge', 3, '8-12'),
    ('Oberkörper 1', 3, 'Rudern', 3, '8-12'),
    ('Oberkörper 1', 4, 'Schrägbankdrücken', 3, '8-12'),
    ('Oberkörper 1', 5, 'Reverse Flys (Maschine)', 3, '8-12'),
    ('Oberkörper 1', 6, 'Face Pulls', 3, '8-12'),
    ('Oberkörper 1', 7, 'Schulterdrücken', 3, '8-12'),
    ('Oberkörper 2', 1, 'Kabel-Lateral-Raise', 3, '8-12'),
    ('Oberkörper 2', 2, 'Langhantel-Bizeps-Curls', 3, '8-12'),
    ('Oberkörper 2', 3, 'Samurai-Extensions', 3, '8-12'),
    ('Oberkörper 2', 4, 'Schulter-Raise-Mix', 3, '8-12'),
    ('Oberkörper 2', 5, 'Trizeps-Drücken', 3, '8-12'),
    ('Oberkörper 2', 6, 'Bizeps-Curls am Kabelzug', 3, '8-12'),
    ('Unterkörper', 1, 'Warm-up', 1, '5-10 min'),
    ('Unterkörper', 2, 'Wall-Sit', 3, '30-60 s'),
    ('Unterkörper', 3, 'Romanian Deadlift', 3, '8-12'),
    ('Unterkörper', 4, 'Bulgarian Split Squat', 3, '8-12'),
    ('Unterkörper', 5, 'Wadenheben', 3, '8-12'),
    ('Unterkörper', 6, 'Beinbeugen', 3, '8-12'),
    ('Unterkörper', 7, 'Beinstrecken', 3, '8-12'),
    ('Unterkörper', 8, 'Abductor-Maschine', 3, '8-12')
)
insert into public.plan_template_exercises (template_id, position, exercise_id, target_sets, target_reps)
select t.id, p.position, e.id, p.sets, p.reps
from plan p
join public.plan_templates t on t.name = p.template
join public.exercises e on lower(e.name) = lower(p.exercise)
where not exists (
  select 1 from public.plan_template_exercises x where x.template_id = t.id
);
