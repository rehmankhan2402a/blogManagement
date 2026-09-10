-- ============================================================
-- RPC FUNCTION: create_user_as_admin
-- Security Definer to bypass standard signup/email verification
-- ============================================================
create or replace function public.create_user_as_admin(
  _email text,
  _password text,
  _role public.app_role,
  _full_name text
)
returns uuid
language plpgsql
security definer -- runs with database owner privileges
as $$
declare
  new_user_id uuid;
begin
  -- 1. Ensure calling user is an Admin
  if not public.has_role('admin', auth.uid()) then
    raise exception 'Access Denied: Only administrators can create users.';
  end if;

  -- 2. Insert into auth.users (triggers profile creation if any triggers exist)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    _email,
    crypt(_password, gen_salt('bf')),
    now(), -- instantly verify email so no confirmation email is triggered
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('full_name', _full_name),
    now(),
    now(),
    '',
    '',
    '',
    ''
  )
  returning id into new_user_id;

  -- 3. Ensure profile is upserted with the full name
  insert into public.profiles (id, full_name, created_at, updated_at)
  values (new_user_id, _full_name, now(), now())
  on conflict (id) do update
  set full_name = excluded.full_name, updated_at = now();

  -- 4. Assign user role
  insert into public.user_roles (user_id, role)
  values (new_user_id, _role);

  return new_user_id;
end;
$$;
