-- Complete schema for a fresh Supabase project.
-- Run this FIRST, then run 202605211_user_system_uuid_refactor.sql only if migrating old data.
-- For fresh setups, this file alone is sufficient.

create extension if not exists "pgcrypto";

-- Users
create table if not exists public.users (
  id           uuid primary key default gen_random_uuid(),
  auth_id      uuid references auth.users(id),
  email        text,
  name         text,
  short_name   text,
  initials     text,
  color        text,
  role         text check (role in ('admin','supervisor','member')) default 'member',
  is_supervisor boolean default false
);

-- Projects
create table if not exists public.projects (
  id              text primary key,
  name            text not null,
  color           text,
  client          text,
  owner           uuid references public.users(id),
  coordinator     uuid references public.users(id),
  brief           text,
  context         text,
  who_to_ask      text,
  drive_folder_url text
);

-- Tasks
create table if not exists public.tasks (
  id              text primary key,
  project_id      text references public.projects(id),
  priority        text check (priority in ('P0','P1','P2','P3','P4')) default 'P2',
  status          text check (status in ('pending','in-progress','done','overdue','stuck')) default 'pending',
  assignee        uuid references public.users(id),
  due             text,
  task            text not null,
  next_action     text,
  notes           text,
  escalation      text,
  blocker_type    text,
  blocker_note    text,
  blocked_since   bigint,
  last_updated_at bigint,
  last_updated_by uuid references public.users(id)
);

-- Row Level Security
alter table public.users    enable row level security;
alter table public.projects enable row level security;
alter table public.tasks    enable row level security;

-- Policies: any authenticated user can read and write
create policy "auth_select_users"    on public.users    for select using (auth.role() = 'authenticated');
create policy "auth_insert_users"    on public.users    for insert with check (auth.role() = 'authenticated');
create policy "auth_update_users"    on public.users    for update using (auth.role() = 'authenticated');

create policy "auth_select_projects" on public.projects for select using (auth.role() = 'authenticated');
create policy "auth_insert_projects" on public.projects for insert with check (auth.role() = 'authenticated');
create policy "auth_update_projects" on public.projects for update using (auth.role() = 'authenticated');

create policy "auth_select_tasks"    on public.tasks    for select using (auth.role() = 'authenticated');
create policy "auth_insert_tasks"    on public.tasks    for insert with check (auth.role() = 'authenticated');
create policy "auth_update_tasks"    on public.tasks    for update using (auth.role() = 'authenticated');

-- Safe email existence check callable by unauthenticated users.
-- Returns only true/false — no user data is exposed.
create or replace function public.email_exists(check_email text)
returns boolean
language sql
security definer
stable
as $$
  select exists(select 1 from public.users where email = lower(check_email));
$$;

-- Trigger: auto-create public.users row when a new auth user signs up.
-- Runs server-side with postgres permissions — no RLS, no race conditions.
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
as $$
declare
  colors text[] := array['#3b82f6','#8b5cf6','#10b981','#f97316','#ec4899','#14b8a6','#f59e0b','#0ea5e9'];
  picked_color text;
begin
  picked_color := colors[(abs(hashtext(new.email)) % 8) + 1];
  insert into public.users (auth_id, email, name, short_name, initials, color, role, is_supervisor)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data->>'name',    split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'short_name', split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'initials',   upper(left(split_part(new.email,'@',1),2))),
    coalesce(new.raw_user_meta_data->>'color',   picked_color),
    'member',
    false
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
