import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
  console.error('[Supabase] Missing environment variables: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
}

type SupabaseClient = ReturnType<typeof createClient<Database>>;

let _client: SupabaseClient | undefined;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: {
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        // Pass a no-op WebSocket class on the server to prevent Node 20
        // from throwing "Node.js 20 detected without native WebSocket support"
        // during RealtimeClient construction.
        ...(typeof window === 'undefined'
          ? { transport: class NoopWS { static OPEN = 1; addEventListener() {} removeEventListener() {} send() {} close() {} } }
          : {}),
      },
    });
  }
  return _client;
}

/**
 * Lazy Supabase client — only instantiated on first access.
 * This prevents the Realtime WebSocket constructor from throwing
 * at module load time when bundled into the SSR server entry on Node 20.
 */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
});
