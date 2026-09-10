import { createClient } from '@supabase/supabase-js';

const SERVICE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvamVxZXR6a2lxbHhicnl0bGxiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDI4NDg0NywiZXhwIjoyMDk1ODYwODQ3fQ.I7upnPQ5yAfUgIcu4-a8CFg5y7hj57OZy_CJ86aAYk0';
const sb = createClient('https://hojeqetzkiqlxbrytllb.supabase.co', SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const EDITOR_ID    = '09bf8985-4e6c-4172-8c0b-edfd45dc0de4';
const EDITOR_EMAIL = 'editor@hess.com';
const NEW_PASSWORD = 'Editor@123456';

console.log('1. Deleting corrupt editor user...');
await sb.from('user_roles').delete().eq('user_id', EDITOR_ID);
await sb.from('profiles').delete().eq('id', EDITOR_ID);
const { error: delErr } = await sb.auth.admin.deleteUser(EDITOR_ID);
console.log('   Delete:', delErr?.message ?? 'OK');

console.log('2. Recreating via admin API (correct method)...');
const { data: newUser, error: createErr } = await sb.auth.admin.createUser({
  email:         EDITOR_EMAIL,
  password:      NEW_PASSWORD,
  email_confirm: true,
  user_metadata: { full_name: 'Editor' },
});
if (createErr) {
  console.error('   Create failed:', createErr.message);
  process.exit(1);
}
console.log('   Created user id:', newUser.user.id);

console.log('3. Assigning editor role...');
const { error: roleErr } = await sb.from('user_roles')
  .insert({ user_id: newUser.user.id, role: 'editor' });
console.log('   Role:', roleErr?.message ?? 'OK');

console.log('4. Upserting profile...');
const { error: profErr } = await sb.from('profiles')
  .upsert({ id: newUser.user.id, full_name: 'Editor' });
console.log('   Profile:', profErr?.message ?? 'OK');

console.log('\n✅ Done!');
console.log('   Email   :', EDITOR_EMAIL);
console.log('   Password:', NEW_PASSWORD);
console.log('   Role    : editor');
