import { createFileRoute } from '@tanstack/react-router';
import { translateBlogFn } from '@/lib/admin-api';

export const Route = createFileRoute('/api/translate-blog')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const result = await translateBlogFn({ data: body } as any);
          return new Response(JSON.stringify(result), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: e.message ?? 'Translation failed' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});
