-- ============================================================
-- MIGRATION: Functions, RLS Policies, and Triggers
-- Run this in the Supabase SQL Editor after the init_schema
-- ============================================================

-- Enable pgcrypto for password hashing (already enabled on most Supabase projects)
create extension if not exists pgcrypto schema extensions;

-- ============================================================
-- FUNCTION: handle_new_user (trigger)
-- Auto-creates a profile row whenever a new auth user is created
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set full_name  = excluded.full_name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

-- Drop + recreate trigger so this is idempotent
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Drop existing versions of these functions to allow return-type changes
drop function if exists public.get_users_for_admin() cascade;
drop function if exists public.create_user_as_admin(text, text, app_role, text) cascade;
drop function if exists public.create_user_as_admin(text, text, text, text) cascade;

-- ============================================================
-- FUNCTION: get_users_for_admin
-- Returns all auth users with their roles.
-- Caller MUST be an admin (checked inside function).
-- ============================================================
create or replace function public.get_users_for_admin()
returns table (
  id         uuid,
  email      text,
  created_at timestamptz,
  role       text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  -- Enforce admin-only access
  if not public.has_role('admin'::app_role, auth.uid()) then
    raise exception 'Permission denied: admin role required';
  end if;

  return query
    select
      au.id,
      au.email::text,
      au.created_at,
      ur.role::text
    from auth.users au
    left join public.user_roles ur on ur.user_id = au.id
    order by au.created_at desc;
end;
$$;

-- ============================================================
-- FUNCTION: create_user_as_admin
-- Creates a new auth user + profile + role assignment.
-- Caller MUST be an admin.
-- ============================================================
create or replace function public.create_user_as_admin(
  _email     text,
  _password  text,
  _role      app_role,
  _full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  _user_id     uuid;
  _existing_id uuid;
begin
  -- Enforce admin-only access
  if not public.has_role('admin'::app_role, auth.uid()) then
    raise exception 'Permission denied: admin role required';
  end if;

  -- Validate inputs
  if _email is null or trim(_email) = '' then
    raise exception 'Email is required';
  end if;
  if _password is null or length(_password) < 6 then
    raise exception 'Password must be at least 6 characters';
  end if;

  -- Check if email already exists
  select id into _existing_id
  from auth.users
  where email = lower(trim(_email))
  limit 1;

  if _existing_id is not null then
    raise exception 'A user with email % already exists', _email;
  end if;

  _user_id := gen_random_uuid();

  -- Create the auth user record
  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    aud,
    role,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
  )
  values (
    _user_id,
    '00000000-0000-0000-0000-000000000000',
    lower(trim(_email)),
    extensions.crypt(_password, extensions.gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', coalesce(_full_name, split_part(_email, '@', 1))),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '',
    ''
  );

  -- Link identity for email/password provider
  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    created_at,
    updated_at
  )
  values (
    gen_random_uuid(),
    _user_id,
    jsonb_build_object('sub', _user_id::text, 'email', lower(trim(_email))),
    'email',
    _user_id::text,
    now(),
    now()
  );

  -- Create profile (trigger may also do this — ON CONFLICT handles the race)
  insert into public.profiles (id, full_name)
  values (_user_id, coalesce(_full_name, split_part(_email, '@', 1)))
  on conflict (id) do update
    set full_name = excluded.full_name;

  -- Assign role
  insert into public.user_roles (user_id, role)
  values (_user_id, _role)
  on conflict (user_id) do update
    set role = excluded.role;

  return _user_id;
end;
$$;

-- ============================================================
-- FUNCTION: delete_user_as_admin
-- Removes a user's role, profile, and auth.users record.
-- Enforces admin-only privileges.
-- ============================================================
create or replace function public.delete_user_as_admin(_target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Enforce admin-only access
  if not public.has_role('admin'::app_role, auth.uid()) then
    raise exception 'Permission denied: admin role required';
  end if;

  -- Prevent admin from deleting themselves
  if _target_user_id = auth.uid() then
    raise exception 'Cannot delete your own account';
  end if;

  -- Delete role first
  delete from public.user_roles where user_id = _target_user_id;
  
  -- Delete profile
  delete from public.profiles where id = _target_user_id;

  -- Delete from auth.users (will cascade delete identities)
  delete from auth.users where id = _target_user_id;
end;
$$;

-- ============================================================
-- UNIQUE CONSTRAINT on user_roles(user_id)
-- One role per user — needed for ON CONFLICT upsert
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'user_roles_user_id_key'
  ) then
    alter table public.user_roles add constraint user_roles_user_id_key unique (user_id);
  end if;
end $$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles   enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.tags       enable row level security;
alter table public.blogs      enable row level security;
alter table public.blog_tags  enable row level security;
alter table public.media      enable row level security;

-- ── profiles ────────────────────────────────────────────────
drop policy if exists "profiles_select_own"   on public.profiles;
drop policy if exists "profiles_select_admin" on public.profiles;
drop policy if exists "profiles_update_own"   on public.profiles;
drop policy if exists "profiles_insert_own"   on public.profiles;

create policy "profiles_select_own"   on public.profiles
  for select using (auth.uid() = id);
create policy "profiles_select_admin" on public.profiles
  for select using (public.has_role('admin'::app_role, auth.uid()));
create policy "profiles_update_own"   on public.profiles
  for update using (auth.uid() = id);
create policy "profiles_insert_own"   on public.profiles
  for insert with check (auth.uid() = id);

-- ── user_roles ───────────────────────────────────────────────
-- NOTE: has_role() is security definer (runs as postgres/superuser)
-- so it bypasses these policies — no infinite recursion.
drop policy if exists "roles_select_own"    on public.user_roles;
drop policy if exists "roles_admin_all"     on public.user_roles;

create policy "roles_select_own" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "roles_admin_all"  on public.user_roles
  for all    using (public.has_role('admin'::app_role, auth.uid()));

-- ── categories ──────────────────────────────────────────────
drop policy if exists "categories_select" on public.categories;
drop policy if exists "categories_insert" on public.categories;
drop policy if exists "categories_update" on public.categories;
drop policy if exists "categories_delete" on public.categories;

create policy "categories_select" on public.categories
  for select using (auth.role() = 'authenticated');
create policy "categories_insert" on public.categories
  for insert with check (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "categories_update" on public.categories
  for update using (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "categories_delete" on public.categories
  for delete using (public.has_role('admin'::app_role, auth.uid()));

-- ── tags ────────────────────────────────────────────────────
drop policy if exists "tags_select" on public.tags;
drop policy if exists "tags_write"  on public.tags;
drop policy if exists "tags_delete" on public.tags;

create policy "tags_select" on public.tags
  for select using (auth.role() = 'authenticated');
create policy "tags_write"  on public.tags
  for insert with check (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "tags_delete" on public.tags
  for delete using (public.has_role('admin'::app_role, auth.uid()));

-- ── blogs ───────────────────────────────────────────────────
drop policy if exists "blogs_select"        on public.blogs;
drop policy if exists "blogs_insert"        on public.blogs;
drop policy if exists "blogs_update_admin"  on public.blogs;
drop policy if exists "blogs_update_editor" on public.blogs;
drop policy if exists "blogs_delete"        on public.blogs;

create policy "blogs_select" on public.blogs
  for select using (auth.role() = 'authenticated');
create policy "blogs_insert" on public.blogs
  for insert with check (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "blogs_update_admin" on public.blogs
  for update using (public.has_role('admin'::app_role, auth.uid()));
create policy "blogs_update_editor" on public.blogs
  for update using (
    public.has_role('editor'::app_role, auth.uid()) and
    author_id = auth.uid()
  );
create policy "blogs_delete" on public.blogs
  for delete using (public.has_role('admin'::app_role, auth.uid()));

-- ── blog_tags ────────────────────────────────────────────────
drop policy if exists "blog_tags_select" on public.blog_tags;
drop policy if exists "blog_tags_write"  on public.blog_tags;
drop policy if exists "blog_tags_delete" on public.blog_tags;

create policy "blog_tags_select" on public.blog_tags
  for select using (auth.role() = 'authenticated');
create policy "blog_tags_write"  on public.blog_tags
  for insert with check (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "blog_tags_delete" on public.blog_tags
  for delete using (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );

-- ── media ───────────────────────────────────────────────────
drop policy if exists "media_select" on public.media;
drop policy if exists "media_insert" on public.media;
drop policy if exists "media_delete" on public.media;

create policy "media_select" on public.media
  for select using (auth.role() = 'authenticated');
create policy "media_insert" on public.media
  for insert with check (
    public.has_role('admin'::app_role, auth.uid()) or
    public.has_role('editor'::app_role, auth.uid())
  );
create policy "media_delete" on public.media
  for delete using (
    public.has_role('admin'::app_role, auth.uid()) or
    uploaded_by = auth.uid()
  );
