-- Cavebound account/auth foundation.
-- Apply with the Supabase CLI or paste into the Supabase SQL editor as a privileged project owner.

create schema if not exists private;
revoke all on schema private from public;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (display_name is null or char_length(display_name) between 2 and 40),
  avatar_url text,
  role text not null default 'player' check (role in ('player', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_updates (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  summary text not null check (char_length(summary) between 3 and 320),
  content text not null check (char_length(content) between 3 and 20000),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  published boolean not null default false
);

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', new.raw_user_meta_data ->> 'full_name'),
    new.raw_user_meta_data ->> 'avatar_url',
    'player'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute procedure private.set_updated_at();

drop trigger if exists game_updates_set_updated_at on public.game_updates;
create trigger game_updates_set_updated_at
  before update on public.game_updates
  for each row execute procedure private.set_updated_at();

alter table public.profiles enable row level security;
alter table public.game_updates enable row level security;

revoke all on table public.profiles from anon, authenticated;
grant select on table public.profiles to authenticated;
grant update (display_name, avatar_url) on table public.profiles to authenticated;

revoke all on table public.game_updates from anon, authenticated;
grant select on table public.game_updates to anon, authenticated;
grant insert, update, delete on table public.game_updates to authenticated;

revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()));

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) is not null and id = (select auth.uid()))
  with check ((select auth.uid()) is not null and id = (select auth.uid()));

drop policy if exists "updates_public_read_published" on public.game_updates;
create policy "updates_public_read_published"
  on public.game_updates for select
  to anon, authenticated
  using (published = true);

drop policy if exists "updates_admin_read_all" on public.game_updates;
create policy "updates_admin_read_all"
  on public.game_updates for select
  to authenticated
  using ((select private.is_admin()));

drop policy if exists "updates_admin_insert" on public.game_updates;
create policy "updates_admin_insert"
  on public.game_updates for insert
  to authenticated
  with check ((select private.is_admin()));

drop policy if exists "updates_admin_update" on public.game_updates;
create policy "updates_admin_update"
  on public.game_updates for update
  to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

drop policy if exists "updates_admin_delete" on public.game_updates;
create policy "updates_admin_delete"
  on public.game_updates for delete
  to authenticated
  using ((select private.is_admin()));

create index if not exists game_updates_publication_idx
  on public.game_updates (published, published_at desc);

comment on column public.profiles.role is
  'Authorization role. Client roles cannot update this column; promote the first admin with privileged SQL.';
