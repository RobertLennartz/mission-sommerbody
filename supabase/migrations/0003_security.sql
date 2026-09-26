-- Access only through the server with the secret key (role service_role).
-- anon and authenticated get nothing: no table rights, no function rights,
-- and RLS without policies as a second lock. This holds regardless of which
-- default grants Supabase gives new projects.

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant select, insert, update, delete on table public.%I to service_role', t);
  end loop;
end;
$$;

revoke all on all sequences in schema public from anon, authenticated;
grant usage, select on all sequences in schema public to service_role;

revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- Objects created later by the migration role start out closed as well.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema public grant select, insert, update, delete on tables to service_role;
alter default privileges in schema public grant usage, select on sequences to service_role;
alter default privileges in schema public grant execute on functions to service_role;
