/**
 * GET /api/blogs/:slug
 *
 * Returns a single published blog post by slug.
 * Includes full HTML content, category, tags, and all SEO fields.
 *
 * Query params:
 *   lang        string   Language code for translations (e.g., 'ar', 'fr', 'es')
 *
 * Response:
 * {
 *   data: {
 *     id, title, slug, excerpt, content_html,
 *     featured_image_url, og_image_url, gallery,
 *     published_at, updated_at, reading_time_min, is_featured,
 *     meta_title, meta_description, canonical_url, focus_keyword,
 *     category: { id, name, slug, color, description } | null,
 *     tags: [{ id, name, slug }]
 *   }
 * }
 *
 * 404 if not found or not published.
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

export const Route = createFileRoute('/api/blogs/$slug')({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ params, request }) => {
        try {
          const u = new URL(request.url);
          const lang = u.searchParams.get('lang')?.trim();

          const { data, error } = await sb()
            .from('blogs')
            .select(
              `id, title, slug, excerpt, content_html,
               featured_image_url, og_image_url, gallery,
               published_at, updated_at, reading_time_min, is_featured,
               meta_title, meta_description, canonical_url, focus_keyword,
               categories ( id, name, slug, color, description ),
               blog_tags ( tags ( id, name, slug ) )`,
            )
            .eq('slug', params.slug)
            .eq('status', 'published')
            .maybeSingle();

          if (error) return json({ error: error.message }, 500);
          if (!data)  return json({ error: 'Blog post not found' }, 404);

          // Fetch translation if language is specified and not English
          let translation: any = null;
          let debugInfo: any = { hasTranslation: false, translationCount: 0 };
          
          if (lang && lang !== 'en') {
            const { data: transData } = await sb()
              .from('blog_translations' as any)
              .select('*')
              .eq('blog_id', data.id)
              .eq('language_code', lang)
              .maybeSingle();
            
            if (transData) {
              translation = transData;
              debugInfo.hasTranslation = true;
            }
            
            // Check total translations for this blog
            const { data: allTranslations } = await sb()
              .from('blog_translations' as any)
              .select('language_code')
              .eq('blog_id', data.id);
            
            debugInfo.translationCount = allTranslations?.length || 0;
            debugInfo.availableLanguages = allTranslations?.map((t: any) => t.language_code) || [];
          }

          return json({
            data: {
              id:                data.id,
              title:             translation?.title || data.title,
              slug:              translation?.slug || data.slug,
              excerpt:           translation?.excerpt || data.excerpt,
              content_html:      translation?.content_html || (data as any).content_html,
              featured_image_url: data.featured_image_url,
              og_image_url:      data.og_image_url,
              gallery:           data.gallery,
              published_at:      data.published_at,
              updated_at:        data.updated_at,
              reading_time_min:  data.reading_time_min,
              is_featured:       data.is_featured,
              meta_title:        translation?.meta_title || data.meta_title,
              meta_description:  translation?.meta_description || data.meta_description,
              canonical_url:     data.canonical_url,
              focus_keyword:     (data as any).focus_keyword,
              category:          (data as any).categories ?? null,
              tags:              ((data as any).blog_tags ?? []).map((bt: any) => bt.tags).filter(Boolean),
            },
            _debug: debugInfo,
          });
        } catch (e: any) {
          return json({ error: e.message ?? 'Internal server error' }, 500);
        }
      },
    },
  },
});
