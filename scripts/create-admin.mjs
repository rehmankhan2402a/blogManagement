import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY || SERVICE_ROLE_KEY === 'new-secret-key') {
  throw new Error('Set real SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env before running this script.');
}

// ── Admin credentials ──────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@hess.com';
const ADMIN_PASSWORD = 'Admin@123456';
const ADMIN_NAME     = 'Super Admin';
// ──────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('   Hess CMS — Super Admin Setup Script');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // ── 1. Check existing admin users ─────────────────────────
  console.log('🔍 Checking for existing admin users...');
  const { data: existingRoles, error: rolesErr } = await supabase
    .from('user_roles')
    .select('user_id, role')
    .eq('role', 'admin');

  if (rolesErr) {
    console.error('❌ Failed to query user_roles:', rolesErr.message);
    process.exit(1);
  }

  if (existingRoles && existingRoles.length > 0) {
    console.log(`⚠️  Found ${existingRoles.length} existing admin(s):\n`);
    for (const r of existingRoles) {
      const { data: ud } = await supabase.auth.admin.getUserById(r.user_id);
      console.log(`   • ${ud?.user?.email ?? r.user_id}  [${r.role}]`);
    }
    console.log('\n✅ Admin user(s) already exist. No new user created.');
    console.log('   To force-create anyway, remove existing roles first.\n');
    process.exit(0);
  }

  console.log('   No admins found. Creating super-admin...\n');

  // ── 2. Check if email already exists in auth ───────────────
  const { data: allUsers, error: listErr } = await supabase.auth.admin.listUsers();
  if (listErr) {
    console.error('❌ Failed to list users:', listErr.message);
    process.exit(1);
  }

  let userId;
  const existing = allUsers?.users?.find(u => u.email === ADMIN_EMAIL);

  if (existing) {
    console.log(`⚠️  Auth user ${ADMIN_EMAIL} already exists (id: ${existing.id})`);
    userId = existing.id;
  } else {
    // ── 3. Create auth user ──────────────────────────────────
    console.log(`📧 Creating auth user: ${ADMIN_EMAIL}`);
    const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,          // skip confirmation email
      user_metadata: { full_name: ADMIN_NAME },
    });

    if (createErr) {
      console.error('❌ Failed to create auth user:', createErr.message);
      process.exit(1);
    }

    userId = newUser.user.id;
    console.log(`   ✅ Auth user created  (id: ${userId})`);
  }

  // ── 4. Upsert profile ──────────────────────────────────────
  console.log('👤 Upserting profile...');
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert({ id: userId, full_name: ADMIN_NAME }, { onConflict: 'id' });

  if (profileErr) {
    console.error('❌ Failed to upsert profile:', profileErr.message);
    process.exit(1);
  }
  console.log('   ✅ Profile upserted');

  // ── 5. Assign admin role ───────────────────────────────────
  console.log('🛡️  Assigning admin role...');
  // Delete any existing role for this user first, then insert fresh
  await supabase.from('user_roles').delete().eq('user_id', userId);
  const { error: roleErr } = await supabase
    .from('user_roles')
    .insert({ user_id: userId, role: 'admin' });

  if (roleErr) {
    console.error('❌ Failed to assign role:', roleErr.message);
    process.exit(1);
  }
  console.log('   ✅ Role assigned: admin\n');

  // ── Done ───────────────────────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉  Super Admin created successfully!\n');
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${ADMIN_PASSWORD}`);
  console.log(`   Role     : admin`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('⚠️  Please change the password after first login!');
}

main().catch(console.error);
