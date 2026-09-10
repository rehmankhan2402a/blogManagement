-- ============================================================
-- blog_translations
-- Stores translated versions of blog posts
-- ============================================================

create table blog_translations (
  id                  uuid primary key default gen_random_uuid(),
  blog_id             uuid not null references blogs(id) on delete cascade,
  language_code       text not null, -- e.g., 'ar', 'fr', 'es'
  title               text not null,
  slug                text not null,
  excerpt             text,
  content             jsonb,
  content_html        text,
  meta_title          text,
  meta_description    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique(blog_id, language_code)
);

-- Create index for faster lookups by language
create index idx_blog_translations_blog_id on blog_translations(blog_id);
create index idx_blog_translations_language_code on blog_translations(language_code);

-- Add comment
comment on table blog_translations is 'Stores translated versions of blog posts for multi-language support';
