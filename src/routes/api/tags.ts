/**
 * GET /api/tags
 *
 * Returns all tags with their published blog post count.
 *
 * Response:
 * {
 *   data: [{ id, name, slug, post_count }]
 * }
 */

import { createFileRoute } from '@tanstack/react-router';
import { createServerSupabase } from '@/lib/supabase-server';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

function sb() {
  return createServerSupabase();
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute('/api/tags')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        try {
          const client = sb();

          const { data: tags, error } = await client
            .from('tags')
            .select('id, name, slug')
            .order('name');

          if (error) return json({ error: error.message }, 500);

          // Count published posts per tag via blog_tags join
          const { data: btRows } = await client
            .from('blog_tags')
            .select('tag_id, blogs!inner(status)')
            .eq('blogs.status', 'published');

          const countMap: Record<string, number> = {};
          (btRows ?? []).forEach((r: any) => {
            countMap[r.tag_id] = (countMap[r.tag_id] ?? 0) + 1;
          });

          return json({
            data: (tags ?? []).map((t) => ({
              ...t,
              post_count: countMap[t.id] ?? 0,
            })),
          });
        } catch (e: any) {
          return json({ error: e.message ?? 'Internal server error' }, 500);
        }
      },
    },
  },
});
