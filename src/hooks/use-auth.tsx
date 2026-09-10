/**
 * Auth hook — session from Supabase, role cached in localStorage.
 *
 * On page refresh:
 *   INITIAL_SESSION fires → session from localStorage → role from localStorage cache
 *   → initializing = false immediately, no DB call, no spinner.
 *
 * On first login:
 *   SIGNED_IN fires → fetch role from DB → cache in localStorage → done.
 *
 * On create/delete user (USER_UPDATED):
 *   Ignored — current user's role hasn't changed.
 */
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export type Role = 'admin' | 'editor' | null;

type AuthCtx = {
  session:      Session | null;
  user:         User | null;
  role:         Role;
  isAdmin:      boolean;
  isEditor:     boolean;
  initializing: boolean;
  signOut:      () => Promise<void>;
  refreshRole:  () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  session: null, user: null, role: null,
  isAdmin: false, isEditor: false, initializing: true,
  signOut: async () => {}, refreshRole: async () => {},
});

// ── localStorage role cache ───────────────────────────────────────────────────

function roleKey(uid: string) { return `hess_role_${uid}`; }

function readCachedRole(uid: string): Role {
  if (typeof window === 'undefined') return null;
  const v = window.localStorage.getItem(roleKey(uid));
  return v === 'admin' || v === 'editor' ? v : null;
}

function writeCachedRole(uid: string, r: Role) {
  if (typeof window === 'undefined') return;
  if (r) window.localStorage.setItem(roleKey(uid), r);
  else   window.localStorage.removeItem(roleKey(uid));
}

// ── DB fetch ──────────────────────────────────────────────────────────────────

async function fetchRoleFromDB(uid: string, accessToken?: string): Promise<Role> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/user_roles?select=role&user_id=eq.${uid}&limit=1`;
  const key  = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  try {
    const res = await fetch(url, {
      headers: {
        'apikey':        key,
        'Authorization': `Bearer ${accessToken ?? key}`,
        'Accept':        'application/json',
      },
    });

    if (res.ok) {
      const rows: { role: string }[] = await res.json();
      const r = rows[0]?.role;
      if (r === 'admin' || r === 'editor') return r as Role;
    }
  } catch (e) {
    console.error('[auth] fetchRoleFromDB HTTP error:', e);
  }

  // Fallback: try via supabase client
  try {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', uid)
      .maybeSingle();
    if (data?.role === 'admin' || data?.role === 'editor') return data.role as Role;
  } catch (_) {}

  return null;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session,      setSession]      = useState<Session | null>(null);
  const [role,         setRole]         = useState<Role>(null);
  const [initializing, setInitializing] = useState(true);

  const doneRef        = useRef(false);
  const fetchingForRef = useRef<string | null>(null);

  function finish() {
    if (!doneRef.current) { doneRef.current = true; setInitializing(false); }
  }

  useEffect(() => {
    // useEffect is CLIENT-ONLY — never runs on the server.
    let dead = false;

    // Safety: unblock UI after 5 s no matter what
    const safety = setTimeout(() => { if (!dead) finish(); }, 5_000);

    // Poll session validity every 30s — catches deleted/disabled accounts
    const sessionPoll = setInterval(async () => {
      if (dead) return;
      const { data: { session: currentSession }, error } = await supabase.auth.getSession();
      if (error || !currentSession) {
        // Session gone — user was deleted or logged out externally
        if (session?.user) writeCachedRole(session.user.id, null);
        fetchingForRef.current = null;
        setSession(null);
        setRole(null);
        finish();
      }
    }, 30_000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (evt, s) => {
      if (dead) return;

      // ── Page load ──────────────────────────────────────────────────────────
      if (evt === 'INITIAL_SESSION') {
        if (s?.user) {
          setSession(s);
          fetchingForRef.current = s.user.id;

          // Try localStorage cache first — instant, no network
          const cached = readCachedRole(s.user.id);
          if (cached) {
            setRole(cached);
            clearTimeout(safety);
            finish();
            return;
          }

          // Cache miss — fetch from DB with explicit token (no timing issues)
          const r = await fetchRoleFromDB(s.user.id, s.access_token);
          if (!dead && fetchingForRef.current === s.user.id) {
            writeCachedRole(s.user.id, r);
            setRole(r);
          }
        } else {
          setSession(null);
          setRole(null);
        }
        clearTimeout(safety);
        if (!dead) finish();
        return;
      }

      // ── Login ──────────────────────────────────────────────────────────────
      if (evt === 'SIGNED_IN' && s?.user) {
        setSession(s);
        fetchingForRef.current = s.user.id;
        // Always fetch fresh from DB on explicit login, pass token explicitly
        writeCachedRole(s.user.id, null);
        const r = await fetchRoleFromDB(s.user.id, s.access_token);
        if (!dead && fetchingForRef.current === s.user.id) {
          writeCachedRole(s.user.id, r);
          setRole(r);
          finish();
        }
        return;
      }

      // ── Token refresh — role unchanged, just sync session ──────────────────
      if (evt === 'TOKEN_REFRESHED') {
        setSession(s);
        return;
      }

      // ── Admin created/deleted another user — ignore, our role is unchanged ─
      if (evt === 'USER_UPDATED') {
        setSession(s);
        return;
      }

      // ── Sign out ───────────────────────────────────────────────────────────
      if (evt === 'SIGNED_OUT' || !s?.user) {
        if (session?.user) writeCachedRole(session.user.id, null);
        fetchingForRef.current = null;
        setSession(null);
        setRole(null);
        finish();
        return;
      }
    });

    return () => {
      dead = true;
      clearTimeout(safety);
      clearInterval(sessionPoll);
      subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signOut = async () => {
    if (session?.user) writeCachedRole(session.user.id, null);
    fetchingForRef.current = null;
    setRole(null);
    setSession(null);
    await supabase.auth.signOut();
  };

  const refreshRole = async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (!s?.user) return;
    writeCachedRole(s.user.id, null);
    fetchingForRef.current = s.user.id;
    const r = await fetchRoleFromDB(s.user.id, s.access_token);
    if (fetchingForRef.current === s.user.id) {
      writeCachedRole(s.user.id, r);
      setRole(r);
    }
  };

  return (
    <Ctx.Provider value={{
      session, user: session?.user ?? null, role,
      isAdmin:  role === 'admin',
      isEditor: role === 'editor',
      initializing, signOut, refreshRole,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
