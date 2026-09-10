-- ============================================================
-- Add view_count column to blogs (idempotent)
-- ============================================================
alter table public.blogs
  add column if not exists view_count integer not null default 0;

-- ============================================================
-- FUNCTION: increment_blog_view
-- Atomically increments view_count for a published blog post.
-- SECURITY DEFINER so it bypasses RLS (server-side only call).
-- ============================================================
create or replace function public.increment_blog_view(blog_slug text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.blogs
  set view_count = coalesce(view_count, 0) + 1
  where slug = blog_slug
    and status = 'published';
$$;
