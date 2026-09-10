/**
 * Node.js server for DreamHost VPS deployment.
 *
 * Handles:
 *   /api/*   → Public REST API (no auth required)
 *   /*       → TanStack Start worker (admin panel + SSR)
 *
 * Usage:
 *   npm run build && node server-node.mjs
 *
 * With PM2:
 *   pm2 start server-node.mjs --name hess-cms
 */

import { createServer } from 'node:http';
import { readFileSync, existsSync, createReadStream, statSync } from 'node:fs';
import { join, extname, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// ── Load .env.production ──────────────────────────────────────────────────────
const envFile = join(__dirname, '.env.production');
if (existsSync(envFile)) {
  const lines = readFileSync(envFile, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = val;
  }
}

// ── Supabase client (anon key — public read only) ─────────────────────────────
import ws from 'ws';

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    },
  );
}

// ── Supabase admin client (service role — bypasses RLS for trusted inserts) ───
function getSupabaseAdmin() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set on this server');
  }
  return createClient(
    process.env.SUPABASE_URL,
    serviceKey,
    {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: ws },
    },
  );
}

// ── CORS headers ──────────────────────────────────────────────────────────────
function getCORSHeaders(req, methods = 'GET, OPTIONS') {
  const origin = req?.headers?.origin || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
}

function sendJSON(res, body, status = 200, req = null) {
  res.writeHead(status, getCORSHeaders(req));
  res.end(JSON.stringify(body));
}

// ── Static file MIME types ────────────────────────────────────────────────────
const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

const clientDir = join(__dirname, 'dist', 'client');

// ── Worker handler (admin panel + SSR) ───────────────────────────────────────
const workerModule = await import('./dist/server/index.js');
const workerHandler = workerModule.default;

// ── API route handlers ────────────────────────────────────────────────────────

/**
 * GET /api/blogs
 * ?page, ?limit, ?category, ?tag, ?featured, ?search, ?sort
 */
async function handleBlogsList(req, res) {
  try {
    const u = new URL(req.url, `http://${req.headers.host}`);
    const page = Math.max(1, Number(u.searchParams.get('page') ?? 1));
    const limit = Math.min(50, Math.max(1, Number(u.searchParams.get('limit') ?? 10)));
    const cat = u.searchParams.get('category')?.trim();
    const tag = u.searchParams.get('tag')?.trim();
    const feat = u.searchParams.get('featured');
    const search = u.searchParams.get('search')?.trim();
    const oldest = u.searchParams.get('sort') === 'oldest';
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const sb = getSupabase();

    // Resolve category slug → id
    let categoryId = null;
    if (cat) {
      const { data: catRow } = await sb.from('categories').select('id').eq('slug', cat).maybeSingle();
      if (!catRow) return sendJSON(res, { data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });
      categoryId = catRow.id;
    }

    // Resolve tag slug → blog ids
    let tagBlogIds = null;
    if (tag) {
      const { data: tagRow } = await sb.from('tags').select('id').eq('slug', tag).maybeSingle();
      if (!tagRow) return sendJSON(res, { data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });
      const { data: btRows } = await sb.from('blog_tags').select('blog_id').eq('tag_id', tagRow.id);
      tagBlogIds = (btRows ?? []).map(r => r.blog_id);
      if (tagBlogIds.length === 0) return sendJSON(res, { data: [], meta: { total: 0, page, limit, totalPages: 0, hasNext: false, hasPrev: false } });
    }

    let q = sb
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
      .order('published_at', { ascending: oldest })
      .range(from, to);

    if (categoryId) q = q.eq('category_id', categoryId);
    if (tagBlogIds) q = q.in('id', tagBlogIds);
    if (feat === 'true') q = q.eq('is_featured', true);
    if (search) q = q.or(`title.ilike.%${search}%,excerpt.ilike.%${search}%`);

    const { data, count, error } = await q;
    if (error) return sendJSON(res, { error: error.message }, 500);

    const blogs = (data ?? []).map(b => ({
      id: b.id,
      title: b.title,
      slug: b.slug,
      excerpt: b.excerpt,
      featured_image_url: b.featured_image_url,
      og_image_url: b.og_image_url,
      published_at: b.published_at,
      updated_at: b.updated_at,
      reading_time_min: b.reading_time_min,
      is_featured: b.is_featured,
      meta_title: b.meta_title,
      meta_description: b.meta_description,
      canonical_url: b.canonical_url,
      category: b.categories ?? null,
      tags: (b.blog_tags ?? []).map(bt => bt.tags).filter(Boolean),
    }));

    const total = count ?? 0;
    const totalPages = Math.ceil(total / limit);
    sendJSON(res, { data: blogs, meta: { total, page, limit, totalPages, hasNext: page < totalPages, hasPrev: page > 1 } });
  } catch (e) {
    sendJSON(res, { error: e.message }, 500);
  }
}

/**
 * GET /api/blogs/:slug
 */
async function handleBlogBySlug(req, res, slug) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const lang = url.searchParams.get('lang');

    const { data, error } = await getSupabase()
      .from('blogs')
      .select(
        `id, title, slug, excerpt, content_html,
         featured_image_url, og_image_url, gallery,
         published_at, updated_at, reading_time_min, is_featured,
         meta_title, meta_description, canonical_url, focus_keyword,
         categories ( id, name, slug, color, description ),
         blog_tags ( tags ( id, name, slug ) )`,
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) return sendJSON(res, { error: error.message }, 500);
    if (!data) return sendJSON(res, { error: 'Blog post not found' }, 404);

    const debugInfo = {
      hasTranslation: false,
      translationCount: 0,
      availableLanguages: []
    };

    let translation = null;

    if (lang && lang !== 'en') {
      const { data: transData } = await getSupabase()
        .from('blog_translations')
        .select('*')
        .eq('blog_id', data.id)
        .eq('language_code', lang)
        .maybeSingle();

      if (transData) {
        translation = transData;
        debugInfo.hasTranslation = true;
      }

      const { data: allTranslations } = await getSupabase()
        .from('blog_translations')
        .select('language_code')
        .eq('blog_id', data.id);

      debugInfo.translationCount = allTranslations?.length || 0;
      debugInfo.availableLanguages = allTranslations?.map(t => t.language_code) || [];
    }

    const responseData = {
      ...data,
      category: data.categories ?? null,
      tags: (data.blog_tags ?? []).map(bt => bt.tags).filter(Boolean),
      categories: undefined,
      blog_tags: undefined,
    };

    if (translation) {
      responseData.title = translation.title;
      responseData.excerpt = translation.excerpt || data.excerpt;
      responseData.content_html = translation.content_html || data.content_html;
      responseData.meta_title = translation.meta_title || data.meta_title;
      responseData.meta_description = translation.meta_description || data.meta_description;
    }

    sendJSON(res, {
      data: responseData,
      _debug: debugInfo,
    });
  } catch (e) {
    sendJSON(res, { error: e.message }, 500);
  }
}

/**
 * GET /api/categories
 */
async function handleCategories(req, res) {
  try {
    const sb = getSupabase();
    const { data: cats, error } = await sb.from('categories').select('id, name, slug, description, color').order('name');
    if (error) return sendJSON(res, { error: error.message }, 500);

    const { data: counts } = await sb.from('blogs').select('category_id').eq('status', 'published').not('category_id', 'is', null);
    const countMap = {};
    (counts ?? []).forEach(b => { countMap[b.category_id] = (countMap[b.category_id] ?? 0) + 1; });

    sendJSON(res, { data: (cats ?? []).map(c => ({ ...c, post_count: countMap[c.id] ?? 0 })) });
  } catch (e) {
    sendJSON(res, { error: e.message }, 500);
  }
}

/**
 * GET /api/tags
 */
async function handleTags(req, res) {
  try {
    const sb = getSupabase();
    const { data: tags, error } = await sb.from('tags').select('id, name, slug').order('name');
    if (error) return sendJSON(res, { error: error.message }, 500);

    const { data: btRows } = await sb.from('blog_tags').select('tag_id, blogs!inner(status)').eq('blogs.status', 'published');
    const countMap = {};
    (btRows ?? []).forEach(r => { countMap[r.tag_id] = (countMap[r.tag_id] ?? 0) + 1; });

    sendJSON(res, { data: (tags ?? []).map(t => ({ ...t, post_count: countMap[t.id] ?? 0 })) });
  } catch (e) {
    sendJSON(res, { error: e.message }, 500);
  }
}

/**
 * POST /api/contact
 * Accepts a contact form submission and stores it in contact_messages.
 */
async function handleContact(req, res) {
  try {
    let body;
    try {
      const raw = await new Promise((resolve) => {
        const chunks = [];
        req.on('data', c => chunks.push(c));
        req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
      });
      body = JSON.parse(raw);
    } catch {
      return sendJSON(res, { error: 'Invalid JSON body' }, 400, req);
    }

    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const email     = typeof body.email     === 'string' ? body.email.trim().toLowerCase() : '';
    const phone     = typeof body.phone     === 'string' ? body.phone.trim() || null : null;
    const service   = typeof body.service   === 'string' ? body.service.trim() || null : null;
    const message   = typeof body.message   === 'string' ? body.message.trim() : '';

    if (!full_name) return sendJSON(res, { error: 'full_name is required' }, 400, req);
    if (!email)     return sendJSON(res, { error: 'email is required' }, 400, req);
    if (!message)   return sendJSON(res, { error: 'message is required' }, 400, req);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return sendJSON(res, { error: 'email is invalid' }, 400, req);
    }

    const ALLOWED_SERVICES = [
      'Environmental & Social (E&S)',
      'Occupational Health & Safety (OHS)',
      'Risk, Compliance & Advisory',
      'ESG & Sustainability Reporting',
      'Monitoring & Implementation',
      'Technical & Modelling',
      'Other',
    ];
    if (service && !ALLOWED_SERVICES.includes(service)) {
      return sendJSON(res, { error: `service must be one of: ${ALLOWED_SERVICES.join(', ')}` }, 400, req);
    }

    const { data, error } = await getSupabaseAdmin()
      .from('contact_messages')
      .insert([{ full_name, email, phone, service, message, status: 'unread' }])
      .select('id')
      .single();

    if (error) {
      console.error('[POST /api/contact] Supabase error:', JSON.stringify(error));
      return sendJSON(res, { error: error.message, code: error.code, details: error.details, hint: error.hint }, 500, req);
    }

    sendJSON(res, { success: true, id: data.id }, 201, req);
  } catch (e) {
    console.error('[POST /api/contact] Unexpected error:', e.message);
    sendJSON(res, { error: 'Internal server error' }, 500, req);
  }
}
/**
 * POST /api/translate-blog
 * Translates a blog post to multiple languages using DeepL API
 */
async function handleTranslateBlog(req, res) {
  try {
    const body = await new Promise((resolve) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
    const { blogId, languages } = JSON.parse(body);

    if (!blogId) {
      return sendJSON(res, { error: 'blogId is required' }, 400, req);
    }

    const apiKey = process.env.DEEPL_API_KEY;
    if (!apiKey) {
      return sendJSON(res, { error: 'DEEPL_API_KEY not set' }, 500, req);
    }

    // Fetch the blog content using public client (read-only)
    const sb = getSupabase();
    const { data: blog, error: blogError } = await sb
      .from('blogs')
      .select('*')
      .eq('id', blogId)
      .single();

    if (blogError || !blog) {
      return sendJSON(res, { error: blogError?.message || 'Blog not found' }, 404, req);
    }

    const SUPPORTED_LANGUAGES = [
      { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
      { code: 'zh', name: 'Chinese', nativeName: '中文' },
      { code: 'fr', name: 'French', nativeName: 'Français' },
      { code: 'es', name: 'Spanish', nativeName: 'Español' },
      { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
    ];

    const targetLanguages = languages || SUPPORTED_LANGUAGES.map(l => l.code);
    const langMap = {
      'ar': 'AR',
      'zh': 'ZH',
      'fr': 'FR',
      'es': 'ES',
      'ms': 'ID',
    };

    let translatedCount = 0;
    const translatedLanguages = [];

    for (const langCode of targetLanguages) {
      try {
        const deeplLang = langMap[langCode] || langCode.toUpperCase();

        // Translate all fields in parallel
        await new Promise(resolve => setTimeout(resolve, 300));

        const translateField = async (text, isHtml = false) => {
          if (!text) return null;
          const body = {
            text: [text],
            source_lang: 'EN',
            target_lang: deeplLang,
          };
          if (isHtml) body.tag_handling = 'html';
          const r = await fetch('https://api-free.deepl.com/v2/translate', {
            method: 'POST',
            headers: { 'Authorization': `DeepL-Auth-Key ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!r.ok) { console.error(`DeepL error ${r.status} for ${langCode}`); return null; }
          const d = await r.json();
          return d.translations?.[0]?.text ?? null;
        };

        const translatedTitle = await translateField(blog.title);
        if (!translatedTitle) { console.error(`Failed to translate title to ${langCode}`); continue; }

        const translatedExcerpt     = await translateField(blog.excerpt);
        const translatedContentHtml = await translateField(blog.content_html, true);
        const translatedMetaTitle   = await translateField(blog.meta_title);
        const translatedMetaDesc    = await translateField(blog.meta_description);

        const translationData = {
          blog_id:          blogId,
          language_code:    langCode,
          title:            translatedTitle,
          slug:             `${blog.slug}-${langCode}`,
          excerpt:          translatedExcerpt,
          content:          blog.content || null,
          content_html:     translatedContentHtml,
          meta_title:       translatedMetaTitle,
          meta_description: translatedMetaDesc,
        };

        try {
          const adminSb = getSupabaseAdmin();

          // Check if translation already exists
          const { data: existing } = await adminSb
            .from('blog_translations')
            .select('id')
            .eq('blog_id', blogId)
            .eq('language_code', langCode)
            .maybeSingle();

          let storeError;
          if (existing) {
            const { error } = await adminSb
              .from('blog_translations')
              .update(translationData)
              .eq('blog_id', blogId)
              .eq('language_code', langCode);
            storeError = error;
          } else {
            const { error } = await adminSb
              .from('blog_translations')
              .insert(translationData);
            storeError = error;
          }

          if (storeError) {
            console.error(`Failed to store translation for ${langCode}:`, storeError);
          } else {
            console.log(`Successfully stored translation for ${langCode}`);
            translatedCount++;
            translatedLanguages.push(langCode);
          }
        } catch (e) {
          console.error(`Failed to store translation for ${langCode}:`, e.message);
        }
      } catch (e) {
        console.error(`Error translating to ${langCode}:`, e.message);
      }
    }

    sendJSON(res, { success: true, translatedCount, languages: translatedLanguages }, 200, req);
  } catch (e) {
    console.error('[POST /api/translate-blog] Error:', e.message);
    sendJSON(res, { error: 'Internal server error' }, 500, req);
  }
}

/**
 * POST /api/blogs/:slug/view
 * Increments view_count for a blog post.
 * Deduplicates per IP+slug within a 30-minute window to prevent
 * tab-toggling, page refreshes, and crawler inflation.
 */

// In-memory dedup store: "ip:slug" → timestamp of last counted view
const viewDedup = new Map();
const VIEW_COOLDOWN_MS = 30 * 60 * 1000; // 30 minutes

// Prune stale entries every 10 minutes so the map doesn't grow forever
setInterval(() => {
  const cutoff = Date.now() - VIEW_COOLDOWN_MS;
  for (const [key, ts] of viewDedup.entries()) {
    if (ts < cutoff) viewDedup.delete(key);
  }
}, 10 * 60 * 1000);

async function handleBlogView(req, res, slug) {
  try {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
             || req.headers['x-real-ip']
             || req.socket?.remoteAddress
             || 'unknown';
    const ua = req.headers['user-agent'] ?? '';

    // Skip bots/crawlers
    if (/bot|crawl|spider|slurp|facebookexternalhit|preview|curl|wget/i.test(ua)) {
      return sendJSON(res, { ok: true, skipped: 'bot' }, 200, req);
    }

    // FIX 1: Include user-agent in the dedup key so that different devices/browsers
    // on the same WiFi network (same public IP) are NOT collapsed into one visitor.
    // Without this, Device 2 on the same router was silently skipped with 'cooldown'.
    const dedupKey = `${ip}:${ua.slice(0, 150)}:${slug}`;
    const lastSeen = viewDedup.get(dedupKey) ?? 0;
    const now = Date.now();

    if (now - lastSeen < VIEW_COOLDOWN_MS) {
      return sendJSON(res, { ok: true, skipped: 'cooldown' }, 200, req);
    }

    viewDedup.set(dedupKey, now);

    // FIX 2: Use a single atomic SQL UPDATE via RPC instead of read-then-write.
    // The old approach read view_count, added 1, then wrote it back — concurrent
    // requests could all read the same stale value and write the same result.
    try {
      const { error: rpcErr } = await getSupabaseAdmin()
        .rpc('increment_blog_view', { blog_slug: slug });

      if (rpcErr) {
        console.error('[POST /api/blogs/:slug/view] RPC error:', rpcErr.message);
        return sendJSON(res, { ok: false, error: rpcErr.message }, 500, req);
      }
    } catch (e) {
      // If service role key is not set, skip view count increment but still return success
      if (e.message?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        console.warn('[POST /api/blogs/:slug/view] Service role key not set, skipping view count increment');
        return sendJSON(res, { ok: true, skipped: 'no_service_role_key' }, 200, req);
      }
      console.error('[POST /api/blogs/:slug/view] Error:', e.message);
      return sendJSON(res, { ok: false, error: 'Internal server error' }, 500, req);
    }

    sendJSON(res, { ok: true }, 200, req);
  } catch (e) {
    console.error('[POST /api/blogs/:slug/view] Error:', e.message);
    sendJSON(res, { ok: false, error: 'Internal server error' }, 500, req);
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;
  const method = req.method.toUpperCase();

  // CORS preflight
  if (method === 'OPTIONS' && pathname.startsWith('/api/')) {
    const isPost = pathname === '/api/contact' || pathname === '/api/translate-blog' || /^\/api\/blogs\/[^/]+\/view$/.test(pathname);
    const methods = isPost ? 'POST, OPTIONS' : 'GET, OPTIONS';
    res.writeHead(204, getCORSHeaders(req, methods));
    res.end();
    return;
  }

  // ── API routes ─────────────────────────────────────────────────────────────
  if (pathname.startsWith('/api/')) {
    // POST /api/translate-blog — translate blog post
    if (method === 'POST' && pathname === '/api/translate-blog') return handleTranslateBlog(req, res);

    // POST /api/contact — open to public
    if (method === 'POST' && pathname === '/api/contact') return handleContact(req, res);

    // POST /api/blogs/:slug/view — proper view count tracking
    const viewMatch = pathname.match(/^\/api\/blogs\/([^/]+)\/view$/);
    if (method === 'POST' && viewMatch) return handleBlogView(req, res, viewMatch[1]);

    if (method === 'GET') {
      if (pathname === '/api/blogs') return handleBlogsList(req, res);
      if (pathname === '/api/categories') return handleCategories(req, res);
      if (pathname === '/api/tags') return handleTags(req, res);

      // /api/blogs/:slug
      const slugMatch = pathname.match(/^\/api\/blogs\/([^/]+)$/);
      if (slugMatch) return handleBlogBySlug(req, res, slugMatch[1]);
    }

    sendJSON(res, { error: 'Not found' }, 404, req);
    return;
  }

  // ── Static assets from dist/client ────────────────────────────────────────
  const staticPath = join(clientDir, pathname);
  const relPath = relative(clientDir, staticPath);
  const isSafe = relPath && !relPath.startsWith('..') && !isAbsolute(relPath);

  if (isSafe && existsSync(staticPath)) {
    const stat = statSync(staticPath);
    if (stat.isFile() && !pathname.endsWith('/')) {
      const ext = extname(staticPath);
      const mime = MIME[ext] ?? 'application/octet-stream';
      const headers = {
        'Content-Type': mime,
        'Content-Length': stat.size,
      };

      if (pathname.startsWith('/assets/')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
      } else {
        headers['Cache-Control'] = 'public, max-age=3600, must-revalidate';
      }

      res.writeHead(200, headers);
      createReadStream(staticPath).pipe(res);
      return;
    }
  }

  // ── Everything else → worker (admin panel + SSR) ──────────────────────────
  try {
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) {
      headers[k] = Array.isArray(v) ? v.join(', ') : v;
    }
    const body = await new Promise(resolve => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => resolve(Buffer.concat(chunks)));
    });

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body: ['GET', 'HEAD'].includes(method) ? undefined : body,
    });
    const response = await workerHandler.fetch(request, process.env, {});

    res.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (e) {
    console.error('Worker error:', e);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

server.keepAliveTimeout = 65000;  // slightly higher than Nginx default (60s)
server.headersTimeout = 66000;     // must be > keepAliveTimeout

server.listen(Number(PORT), HOST, () => {
  console.log(`\n✅  HESS CMS running at http://${HOST}:${PORT}`);
  console.log(`    Admin panel : http://localhost:${PORT}/admin`);
  console.log(`    API - blogs : http://localhost:${PORT}/api/blogs`);
  console.log(`    API - single: http://localhost:${PORT}/api/blogs/:slug`);
  console.log(`    API - cats  : http://localhost:${PORT}/api/categories`);
  console.log(`    API - tags  : http://localhost:${PORT}/api/tags\n`);
});
