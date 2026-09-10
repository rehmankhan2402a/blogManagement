/**
 * GET /api/categories
 *
 * Returns all categories with their published blog post count.
 *
 * Response:
 * {
 *   data: [{ id, name, slug, description, color, post_count }]
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

export const Route = createFileRoute('/api/categories')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async () => {
        try {
          const client = sb();

          // Get categories
          const { data: cats, error } = await client
            .from('categories')
            .select('id, name, slug, description, color')
            .order('name');

          if (error) return json({ error: error.message }, 500);

          // Get published post counts per category
          const { data: counts } = await client
            .from('blogs')
            .select('category_id')
            .eq('status', 'published')
            .not('category_id', 'is', null);

          const countMap: Record<string, number> = {};
          (counts ?? []).forEach((b: any) => {
            countMap[b.category_id] = (countMap[b.category_id] ?? 0) + 1;
          });

          return json({
            data: (cats ?? []).map((c) => ({
              ...c,
              post_count: countMap[c.id] ?? 0,
            })),
          });
        } catch (e: any) {
          return json({ error: e.message ?? 'Internal server error' }, 500);
        }
      },
    },
  },
});
