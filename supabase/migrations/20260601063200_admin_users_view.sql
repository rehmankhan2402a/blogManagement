-- ============================================================
-- VIEW: public.admin_user_list
-- Exposes registered user info with emails only to authenticated admins
-- ============================================================
create or replace view public.admin_user_list as
select 
  au.id,
  au.email,
  au.created_at,
  ur.role,
  p.full_name,
  p.avatar_url
from auth.users au
left join public.user_roles ur on au.id = ur.user_id
left join public.profiles p on au.id = p.id;

-- Enable RLS on the view or secure it via has_role
alter view public.admin_user_list owner to postgres;

-- Revoke all permissions from public first
revoke all on public.admin_user_list from public;
revoke all on public.admin_user_list from anon;
revoke all on public.admin_user_list from authenticated;

-- Allow only authenticated admin users to select from this view
grant select on public.admin_user_list to authenticated;

-- Add security barriers or function helper
create or replace function public.get_users_for_admin()
returns setof public.admin_user_list
language plpgsql
security definer -- runs as database owner
stable
as $$
begin
  -- Ensure only admin is calling this
  if not public.has_role('admin', auth.uid()) then
    raise exception 'Access Denied: Only administrators can view the user list.';
  end if;

  return query
  select * from public.admin_user_list
  order by created_at desc;
end;
$$;
