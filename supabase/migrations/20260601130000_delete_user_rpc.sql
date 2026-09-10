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
