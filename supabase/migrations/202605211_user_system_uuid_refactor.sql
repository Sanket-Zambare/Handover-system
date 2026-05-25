create extension if not exists "pgcrypto";

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid references auth.users(id),
  email text,
  name text,
  short_name text,
  initials text,
  color text,
  role text check (role in ('admin','supervisor','member')) default 'member',
  is_supervisor boolean default false
);

alter table public.users add column if not exists auth_id uuid references auth.users(id);
alter table public.users add column if not exists email text;
alter table public.users add column if not exists name text;
alter table public.users add column if not exists short_name text;
alter table public.users add column if not exists initials text;
alter table public.users add column if not exists color text;
alter table public.users add column if not exists role text default 'member';
alter table public.users add column if not exists is_supervisor boolean default false;

insert into public.users (id, auth_id, email, name, short_name, initials, color, role, is_supervisor)
values
  ('11111111-1111-4111-8111-111111111111', null, null, 'N Nidhi', 'Nidhi', 'NN', '#14b8a6', 'supervisor', true),
  ('22222222-2222-4222-8222-222222222222', null, null, 'Khushboo Nitnaware', 'Khushboo', 'KN', '#f59e0b', 'member', false),
  ('33333333-3333-4333-8333-333333333333', null, null, 'You (Strategist)', 'You', 'ST', '#8b5cf6', 'admin', false),
  ('44444444-4444-4444-8444-444444444444', null, null, 'S Mannmad Rao', 'Mannmad', 'SR', '#0ea5e9', 'member', false),
  ('55555555-5555-4555-8555-555555555555', null, null, 'External Team', 'External', 'EX', '#64748b', 'member', false)
on conflict (id) do update set
  name=excluded.name,
  short_name=excluded.short_name,
  initials=excluded.initials,
  color=excluded.color,
  role=excluded.role,
  is_supervisor=excluded.is_supervisor;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='users' and column_name='person_key'
  ) then
    update public.users
    set
      name = coalesce(name, case person_key
        when 'nidhi' then 'N Nidhi'
        when 'khushboo' then 'Khushboo Nitnaware'
        when 'strategist' then 'You (Strategist)'
        when 'mannmad' then 'S Mannmad Rao'
        when 'external' then 'External Team'
      end),
      short_name = coalesce(short_name, case person_key
        when 'nidhi' then 'Nidhi'
        when 'khushboo' then 'Khushboo'
        when 'strategist' then 'You'
        when 'mannmad' then 'Mannmad'
        when 'external' then 'External'
      end),
      initials = coalesce(initials, case person_key
        when 'nidhi' then 'NN'
        when 'khushboo' then 'KN'
        when 'strategist' then 'ST'
        when 'mannmad' then 'SR'
        when 'external' then 'EX'
      end),
      color = coalesce(color, case person_key
        when 'nidhi' then '#14b8a6'
        when 'khushboo' then '#f59e0b'
        when 'strategist' then '#8b5cf6'
        when 'mannmad' then '#0ea5e9'
        when 'external' then '#64748b'
      end),
      is_supervisor = case when person_key='nidhi' then true else coalesce(is_supervisor,false) end;

    alter table public.users drop column person_key;
  end if;
end $$;

alter table public.tasks
  alter column assignee type uuid
  using case
    when assignee='nidhi' then '11111111-1111-4111-8111-111111111111'::uuid
    when assignee='khushboo' then '22222222-2222-4222-8222-222222222222'::uuid
    when assignee='strategist' then '33333333-3333-4333-8333-333333333333'::uuid
    when assignee='mannmad' then '44444444-4444-4444-8444-444444444444'::uuid
    when assignee='external' then '55555555-5555-4555-8555-555555555555'::uuid
    when assignee ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then assignee::uuid
    else null
  end;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname='tasks_assignee_fkey'
  ) then
    alter table public.tasks
      add constraint tasks_assignee_fkey foreign key (assignee) references public.users(id);
  end if;
end $$;

alter table public.projects
  alter column owner type uuid
  using case
    when owner='nidhi' then '11111111-1111-4111-8111-111111111111'::uuid
    when owner='khushboo' then '22222222-2222-4222-8222-222222222222'::uuid
    when owner='strategist' then '33333333-3333-4333-8333-333333333333'::uuid
    when owner='mannmad' then '44444444-4444-4444-8444-444444444444'::uuid
    when owner='external' then '55555555-5555-4555-8555-555555555555'::uuid
    when owner ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then owner::uuid
    else null
  end;

alter table public.projects
  alter column coordinator type uuid
  using case
    when coordinator='nidhi' then '11111111-1111-4111-8111-111111111111'::uuid
    when coordinator='khushboo' then '22222222-2222-4222-8222-222222222222'::uuid
    when coordinator='strategist' then '33333333-3333-4333-8333-333333333333'::uuid
    when coordinator='mannmad' then '44444444-4444-4444-8444-444444444444'::uuid
    when coordinator='external' then '55555555-5555-4555-8555-555555555555'::uuid
    when coordinator ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then coordinator::uuid
    else null
  end;
