import { createFileRoute } from '@tanstack/react-router';
import { createServerSupabase } from '@/lib/supabase-server';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type': 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute('/api/debug-translations')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        try {
          const u = new URL(request.url);
          const blogId = u.searchParams.get('blogId');

          if (!blogId) {
            return json({ error: 'blogId parameter required' }, 400);
          }

          const sb = createServerSupabase();

          // Check if translations exist for this blog
          const { data: translations, error } = await sb
            .from('blog_translations' as any)
            .select('*')
            .eq('blog_id', blogId);

          if (error) {
            return json({ error: error.message }, 500);
          }

          return json({
            blogId,
            translationCount: translations?.length || 0,
            translations: translations || [],
          });
        } catch (e: any) {
          return json({ error: e.message ?? 'Internal server error' }, 500);
        }
      },
    },
  },
});
