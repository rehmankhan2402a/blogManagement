/**

 * GET /api/blogs

 *

 * Query params:

 *   page        number   Page number, default 1

 *   limit       number   Items per page, default 10, max 50

 *   category    string   Filter by category slug

 *   tag         string   Filter by tag slug

 *   featured    boolean  true = only featured posts

 *   search      string   Search in title and excerpt

 *   sort        string   "newest" (default) | "oldest"

 *

 * Response:

 * {

 *   data: Blog[],

 *   meta: { total, page, limit, totalPages, hasNext, hasPrev }

 * }

 *

 * Each Blog:

 * {

 *   id, title, slug, excerpt,

 *   featured_image_url, og_image_url,

 *   published_at, updated_at, reading_time_min, is_featured,

 *   meta_title, meta_description, canonical_url,

 *   category: { id, name, slug, color } | null,

 *   tags: [{ id, name, slug }]

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



export const Route = createFileRoute('/api/blogs')({

  server: {

    handlers: {

      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),



      GET: async ({ request }) => {

    try {

      const u      = new URL(request.url);

      const page   = Math.max(1, Number(u.searchParams.get('page')  ?? 1));

      const limit  = Math.min(50, Math.max(1, Number(u.searchParams.get('limit') ?? 10)));

      const cat    = u.searchParams.get('category')?.trim();

      const tag    = u.searchParams.get('tag')?.trim();

      const feat   = u.searchParams.get('featured');

      const search = u.searchParams.get('search')?.trim();

      const lang   = u.searchParams.get('lang')?.trim();

      const sort   = u.searchParams.get('sort') === 'oldest' ? true : false;

      const from   = (page - 1) * limit;

      const to     = from + limit - 1;



      const client = sb();



      // ── If filtering by category slug, resolve it to an id first ──────────

      let categoryId: string | null = null;

      if (cat) {

        const { data: catRow } = await client

          .from('categories')

          .select('id')

          .eq('slug', cat)

          .maybeSingle();

        if (!catRow) return json({ data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });

        categoryId = catRow.id;

      }



      // ── If filtering by tag slug, resolve to blog ids ─────────────────────

      let tagBlogIds: string[] | null = null;

      if (tag) {

        const { data: tagRow } = await client

          .from('tags')

          .select('id')

          .eq('slug', tag)

          .maybeSingle();

        if (!tagRow) return json({ data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });



        const { data: btRows } = await client

          .from('blog_tags')

          .select('blog_id')

          .eq('tag_id', tagRow.id);

        tagBlogIds = (btRows ?? []).map((r) => r.blog_id);

        if (tagBlogIds.length === 0) return json({ data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });

      }



      // ── Main query ────────────────────────────────────────────────────────

      let q = client

        .from('blogs')

        .select(

          `id, title, slug, excerpt,

           featured_image_url, og_image_url,

           published_at, updated_at, reading_time_min, is_featured,

           meta_title, meta_description, canonical_url,

           categories ( id, name, slug, color ),

           blog_tags ( tags ( id, name, slug ) )`,

          { count: 'exact' },

        )

        .eq('status', 'published')

        .order('published_at', { ascending: sort })

        .range(from, to);



      if (categoryId)  q = q.eq('category_id', categoryId);

      if (tagBlogIds)  q = q.in('id', tagBlogIds);

      if (feat === 'true') q = q.eq('is_featured', true);

      if (search)      q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);



      const { data, count, error } = await q;

      if (error) return json({ error: error.message }, 500);



      // ── Fetch translations if language is specified ───────────────────────

      let translations: Map<string, any> = new Map();

      if (lang && lang !== 'en') {

        const blogIds = (data ?? []).map((b: any) => b.id);

        if (blogIds.length > 0) {

          const { data: transData } = await client

            .from('blog_translations' as any)

            .select('*')

            .eq('language_code', lang)

            .in('blog_id', blogIds);

          if (transData) {

            transData.forEach((t: any) => {

              translations.set(t.blog_id, t);

            });

          }

        }

      }



      // ── Normalise shape ───────────────────────────────────────────────────

      const blogs = (data ?? []).map((b: any) => {

        const translation = translations.get(b.id);

        return {

          id:                b.id,

          title:             translation?.title || b.title,

          slug:              translation?.slug || b.slug,

          excerpt:           translation?.excerpt || b.excerpt,

          featured_image_url: b.featured_image_url,

          og_image_url:      b.og_image_url,

          published_at:      b.published_at,

          updated_at:        b.updated_at,

          reading_time_min:  b.reading_time_min,

          is_featured:       b.is_featured,

          meta_title:        translation?.meta_title || b.meta_title,

          meta_description:  translation?.meta_description || b.meta_description,

          canonical_url:     b.canonical_url,

          category:          b.categories ?? null,

          tags:              (b.blog_tags ?? []).map((bt: any) => bt.tags).filter(Boolean),

          // Include translated HTML content if available

          content_html:      translation?.content_html || b.content_html,

        };

      });



      const total      = count ?? 0;

      const totalPages = Math.ceil(total / limit);



      return json({

        data: blogs,

        meta: {

          total,

          page,

          limit,

          totalPages,

          hasNext: page < totalPages,

          hasPrev: page > 1,

        },

      });

    } catch (e: any) {

      return json({ error: e.message ?? 'Internal server error' }, 500);

    }

      },

    },

  },

});



