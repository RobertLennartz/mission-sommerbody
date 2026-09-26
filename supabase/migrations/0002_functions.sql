-- Multi-row writes that must succeed or fail as a whole.

create or replace function public.next_session_slot(p_athlete uuid, p_date date)
returns smallint
language sql
stable
set search_path = ''
as $$
  select (coalesce(max(slot), 0) + 1)::smallint
  from public.sessions
  where athlete_id = p_athlete and date = p_date;
$$;

-- One session, optionally copied from a template (with its exercises).
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
    duration_min, activity, distance_km, template_id, pair_id
  )
  values (
    p_athlete,
    p_date,
    public.next_session_slot(p_athlete, p_date),
    coalesce(v_t.category, p_category),
    coalesce(nullif(btrim(p_title), ''), v_t.name),
    p_status,
    v_t.default_duration_min,
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

-- Same session for one or more athletes. Several athletes share a pair_id.
create or replace function public.create_sessions(
  p_athletes uuid[],
  p_date date,
  p_status text,
  p_template uuid,
  p_category text,
  p_title text
)
returns setof uuid
language plpgsql
set search_path = ''
as $$
declare
  v_pair uuid := case when cardinality(p_athletes) > 1 then gen_random_uuid() end;
  v_athlete uuid;
begin
  foreach v_athlete in array p_athletes
  loop
    return next public.insert_session(v_athlete, p_date, p_status, p_template, p_category, p_title, v_pair);
  end loop;
end;
$$;

-- "Woche aus Vorlage füllen": planned sessions for one week, only on days
-- between p_from and p_to (the mission). Optionally replaces the planned,
-- not yet done sessions of that week first.
create or replace function public.fill_week(
  p_athletes uuid[],
  p_week_template uuid,
  p_monday date,
  p_from date,
  p_to date,
  p_replace boolean
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_item record;
  v_day date;
  v_pair uuid;
  v_athlete uuid;
  v_count integer := 0;
begin
  if extract(isodow from p_monday) <> 1 then
    raise exception 'p_monday must be a Monday';
  end if;

  if p_replace then
    delete from public.sessions
    where athlete_id = any (p_athletes)
      and date between p_monday and p_monday + 6
      and status = 'planned';
  end if;

  for v_item in
    select weekday, slot, plan_template_id
    from public.week_template_items
    where week_template_id = p_week_template
    order by weekday, slot
  loop
    v_day := p_monday + (v_item.weekday - 1);
    continue when v_day < p_from or v_day > p_to;
    v_pair := case when cardinality(p_athletes) > 1 then gen_random_uuid() end;
    foreach v_athlete in array p_athletes
    loop
      perform public.insert_session(v_athlete, v_day, 'planned', v_item.plan_template_id, null, null, v_pair);
      v_count := v_count + 1;
    end loop;
  end loop;

  return v_count;
end;
$$;
