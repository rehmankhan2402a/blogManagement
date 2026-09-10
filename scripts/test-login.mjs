import { createClient } from '@supabase/supabase-js';

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvamVxZXR6a2lxbHhicnl0bGxiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyODQ4NDcsImV4cCI6MjA5NTg2MDg0N30.oMy7pogXK2Ii2yiF28rDBnvq5WfQu9j-tcoldihDb_w';
const sb = createClient('https://hojeqetzkiqlxbrytllb.supabase.co', ANON);

console.log('Testing editor login...');
const { data, error } = await sb.auth.signInWithPassword({
  email: 'editor@hess.com',
  password: 'Editor@123456',
});

if (error) {
  console.log('Login FAILED:', error.message, error.code);
} else {
  console.log('Login SUCCESS:', data.user.email, data.user.id);
  const { data: role } = await sb.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle();
  console.log('Role:', role?.role ?? 'NO ROLE');
}
