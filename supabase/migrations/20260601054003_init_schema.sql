-- ============================================================
-- ENUMS
-- ============================================================

create type app_role as enum ('admin', 'editor');
create type blog_status as enum ('draft', 'published');

-- ============================================================
-- profiles
-- Linked to auth.users via id
-- ============================================================
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- user_roles
-- One role per user (admin or editor)
-- ============================================================
create table user_roles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        app_role not null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- categories
-- ============================================================
create table categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  description text,
  icon        text,
  color       text not null default '#6366f1',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- tags
-- ============================================================
create table tags (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- blogs
-- ============================================================
create table blogs (
  id                  uuid primary key default gen_random_uuid(),
  title               text not null,
  slug                text not null unique,
  content             jsonb,
  content_html        text,
  excerpt             text,
  featured_image_url  text,
  gallery             jsonb not null default '[]',
  status              blog_status not null default 'draft',
  is_featured         boolean not null default false,
  reading_time_min    integer not null default 0,
  meta_title          text,
  meta_description    text,
  og_image_url        text,
  canonical_url       text,
  focus_keyword       text,
  author_id           uuid references auth.users(id) on delete set null,
  category_id         uuid references categories(id) on delete set null,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ============================================================
-- blog_tags  (many-to-many)
-- ============================================================
create table blog_tags (
  blog_id  uuid not null references blogs(id) on delete cascade,
  tag_id   uuid not null references tags(id) on delete cascade,
  primary key (blog_id, tag_id)
);

-- ============================================================
-- media
-- ============================================================
create table media (
  id          uuid primary key default gen_random_uuid(),
  url         text not null,
  path        text not null,
  filename    text not null,
  mime        text,
  size_bytes  integer,
  width       integer,
  height      integer,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ============================================================
-- FUNCTION: has_role
-- Used by RLS policies to check if a user has a given role
-- ============================================================
create or replace function has_role(_role app_role, _user_id uuid)
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1 from user_roles
    where user_id = _user_id
      and role    = _role
  );
$$;