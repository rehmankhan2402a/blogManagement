-- Drop the recursive user_roles policies
drop policy if exists "Allow users to read own roles" on public.user_roles;
drop policy if exists "Allow admins full access to user_roles" on public.user_roles;

-- 1. Simple policy for reading roles:
-- Anyone can read user_roles, or just matching user_id without recursion.
create policy "Allow read access to user_roles" on public.user_roles
  for select using (true);

-- 2. Allow insert/update/delete on roles only if the user is authenticated (we can verify admin status using the secure has_role function which runs as security definer)
create policy "Allow admin write access to user_roles" on public.user_roles
  for all using (
    public.has_role('admin', auth.uid())
  );
