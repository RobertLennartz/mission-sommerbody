-- Mission Sommerbody: starting data. Safe to run more than once.
-- Everything here can be changed later in the app.
-- Strength templates are Robert's own plans (26.09.2026); sets and reps are
-- defaults, editable under Planung > Vorlagen.

insert into public.athletes (slug, name, sort_order, training_target_per_week, bodyfat_formula)
values
  ('robert', 'Robert', 1, 5, 'jp7_male'),
  ('eddie', 'Eddie', 2, 5, 'jp7_male'),
  ('anny', 'Anny', 3, 0, null) -- no weekly goal; formula chosen in the app
on conflict (slug) do nothing;

insert into public.exercises (name)
select v.name
from (values
  ('Brustpresse'), ('Klimmzüge'), ('Rudern'), ('Schrägbankdrücken'), ('Reverse Flys (Maschine)'),
  ('Face Pulls'), ('Schulterdrücken'),
  ('Kabel-Lateral-Raise'), ('Langhantel-Bizeps-Curls'), ('Samurai-Extensions'), ('Schulter-Raise-Mix'),
  ('Trizeps-Drücken'), ('Bizeps-Curls am Kabelzug'),
  ('Warm-up'), ('Wall-Sit'), ('Romanian Deadlift'), ('Bulgarian Split Squat'), ('Wadenheben'),
  ('Beinbeugen'), ('Beinstrecken'), ('Abductor-Maschine')
) as v (name)
where not exists (
  select 1 from public.exercises e where lower(btrim(e.name)) = lower(btrim(v.name))
);

insert into public.plan_templates (name, category, default_duration_min, activity, default_distance_km)
values
  ('Oberkörper 1', 'strength', 60, null, null),
  ('Oberkörper 2', 'strength', 60, null, null),
  ('Unterkörper', 'strength', 60, null, null),
  ('HIIT-Kurs', 'hiit', 45, 'HIIT-Kurs', null),
  ('Lauf 5 km', 'cardio', 30, 'Laufen', 5),
  ('Schwimmen', 'cardio', 45, 'Schwimmen', null),
  ('Recovery', 'recovery', null, 'Sauna', null)
on conflict (name) do nothing;

-- Template exercises, only for templates that have none yet.
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

insert into public.week_templates (name)
values ('Standardwoche')
on conflict (name) do nothing;

with week (weekday, template) as (
  values
    (1, 'Oberkörper 1'), (2, 'HIIT-Kurs'), (3, 'Unterkörper'),
    (4, 'Lauf 5 km'), (5, 'Oberkörper 2'), (6, 'HIIT-Kurs')
)
insert into public.week_template_items (week_template_id, weekday, slot, plan_template_id)
select w.id, week.weekday, 1, t.id
from week
join public.week_templates w on w.name = 'Standardwoche'
join public.plan_templates t on t.name = week.template
where not exists (
  select 1 from public.week_template_items i where i.week_template_id = w.id
);
