-- Enable RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.blogs enable row level security;
alter table public.blog_tags enable row level security;
alter table public.media enable row level security;

-- profiles policies
create policy "Allow public read-access to profiles" on public.profiles
  for select using (true);

create policy "Allow users to update own profile" on public.profiles
  for update using (auth.uid() = id);

-- user_roles policies
create policy "Allow users to read own roles" on public.user_roles
  for select using (auth.uid() = user_id);

create policy "Allow admins full access to user_roles" on public.user_roles
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

-- categories policies
create policy "Allow public read access to categories" on public.categories
  for select using (true);

create policy "Allow admins full access to categories" on public.categories
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role = 'admin'
    )
  );

-- tags policies
create policy "Allow public read access to tags" on public.tags
  for select using (true);

create policy "Allow admins/editors full access to tags" on public.tags
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  );

-- blogs policies
create policy "Allow public read access to published blogs" on public.blogs
  for select using (status = 'published');

create policy "Allow admins/editors full access to all blogs" on public.blogs
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  );

-- blog_tags policies
create policy "Allow public read access to blog_tags" on public.blog_tags
  for select using (true);

create policy "Allow admins/editors full access to blog_tags" on public.blog_tags
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  );

-- media policies
create policy "Allow public read access to media" on public.media
  for select using (true);

create policy "Allow admins/editors full access to media" on public.media
  for all using (
    exists (
      select 1 from public.user_roles
      where user_id = auth.uid()
        and role in ('admin', 'editor')
    )
  );
