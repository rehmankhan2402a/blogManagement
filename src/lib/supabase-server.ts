import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import type { Database } from '@/integrations/supabase/types';

export function createServerSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY environment variables');
  }

  return createClient<Database>(url, key, {
    auth: {
      storage:          undefined,
      persistSession:   false,
      autoRefreshToken: false,
    },
    realtime: { transport: ws as any },
  });
}
