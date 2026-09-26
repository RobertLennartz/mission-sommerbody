-- Duration in seconds instead of minutes, so pace (min/km) is exact
-- (Robert, 26.09.2026: "Kilometer und Dauer, den Schnitt selbst errechnen").

alter table public.sessions add column duration_sec integer check (duration_sec between 1 and 36000);
update public.sessions set duration_sec = duration_min * 60 where duration_min is not null;
alter table public.sessions drop column duration_min;

create or replace function public.insert_session(
  p_athlete uuid,
  p_date date,
  p_status text,
  p_template uuid,
  p_category text,
  p_title text,
  p_pair uuid
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_t public.plan_templates%rowtype;
begin
  if p_template is not null then
    select * into v_t from public.plan_templates where id = p_template;
    if not found then
      raise exception 'plan template % not found', p_template;
    end if;
  end if;

  insert into public.sessions (
    athlete_id, date, slot, category, title, status,
    duration_sec, activity, distance_km, template_id, pair_id
  )
  values (
    p_athlete,
    p_date,
    public.next_session_slot(p_athlete, p_date),
    coalesce(v_t.category, p_category),
    coalesce(nullif(btrim(p_title), ''), v_t.name),
    p_status,
    v_t.default_duration_min * 60,
    v_t.activity,
    v_t.default_distance_km,
    p_template,
    p_pair
  )
  returning id into v_id;

  if p_template is not null then
    insert into public.session_exercises (session_id, position, exercise_id, target_sets, target_reps)
    select v_id, position, exercise_id, target_sets, target_reps
    from public.plan_template_exercises
    where template_id = p_template
    order by position;
  end if;

  return v_id;
end;
$$;
