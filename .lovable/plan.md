## HESS Sustainability — Admin Blog CMS (v1)

Building the admin panel only. The public blog frontend, related-posts UI, share buttons, scheduled publishing, autosave, newsletter, and analytics are deferred to v2 to keep v1 shippable and polished.

## Design system (mirrors hess-sustainability.alisonstech-dev.com)

- **Palette**: deep emerald `#0f5132` / `#14532d` primary, lime-green accent `#a8e063` → `#56ab2f` (the bright CTA pill), soft sage backgrounds `#f4f8f4`, dark forest overlays on hero, white cards. Earthy neutrals for text (`#1f2937` body, `#475569` muted).
- **Typography**: rounded sans (Plus Jakarta Sans or Inter) for body; heavier display weight for headings. Large, confident H1s.
- **Components**: fully rounded pill buttons, soft shadows, generous spacing, subtle gradients on hero/sidebar. Glassmorphism on top topbar over hero areas.
- **Motion**: Framer Motion fade/slide-up on mount, hover lift on cards, animated counters on dashboard stats.

Tokens go into `src/index.css` (HSL CSS vars) and `tailwind.config.ts`. All Shadcn components themed via tokens — no hardcoded colors in components.

## Tech & scaffold

- Lovable's standard stack: React + Vite + TanStack Start + TypeScript + Tailwind + Shadcn + Framer Motion. (Not Next.js — confirmed.)
- Lovable Cloud enabled for Postgres, auth, storage, edge functions.

## Routes

```
/login                      public — admin sign-in
/admin                      dashboard (stats + recent activity + quick actions)
/admin/blogs                blog list table
/admin/blogs/new            create blog
/admin/blogs/$id/edit       edit blog (same form, live preview toggle)
/admin/categories           category CRUD
/admin/media                media library
/admin/settings             profile + sign out
```

All `/admin/*` routes guarded by an `AdminLayout` that checks the session and redirects to `/login` if missing.

## Database schema (Lovable Cloud migration)

```text
profiles(id uuid pk → auth.users, full_name, avatar_url, created_at)
user_roles(id, user_id → auth.users, role app_role)   -- enum: 'admin','editor'
has_role(uid, role) security-definer fn
categories(id, name, slug unique, description, color, icon, created_at)
tags(id, name, slug unique)
blogs(
  id, title, slug unique, excerpt, content jsonb (Tiptap doc),
  content_html text, featured_image_url, gallery jsonb,
  category_id → categories, author_id → auth.users,
  reading_time_min int, status enum('draft','published'),
  is_featured bool, published_at timestamptz,
  meta_title, meta_description, focus_keyword,
  og_image_url, canonical_url,
  created_at, updated_at
)
blog_tags(blog_id, tag_id)  -- join
media(id, url, path, mime, size_bytes, width, height, uploaded_by, created_at)
```

RLS:
- `blogs`, `categories`, `tags`, `media`: SELECT public for published rows; full CRUD restricted to `has_role(auth.uid(),'admin')`.
- `user_roles`: only admins can read/write; seeded with the first signed-up user.
- Storage buckets: `blog-media` (public read, admin write).

## Feature breakdown

**1. Auth** — Shadcn-styled login (email + password), "Remember me" (Supabase persists by default; checkbox toggles `localStorage` vs `sessionStorage` via `auth.signInWithPassword` flow), "Forgot password" link → `/reset-password` page using `resetPasswordForEmail`. `onAuthStateChange` listener mounted before `getSession()`. Sign-up disabled in UI (admin creates accounts manually for v1).

**2. Dashboard** — animated stat cards (total/published/drafts/featured), 7-day publishing line chart (Recharts), recent activity feed (latest 5 blog updates), quick-action buttons.

**3. Blog list table** — Shadcn `Table` with thumbnail, title, slug, category badge, author, date, status pill, featured star, SEO score (simple heuristic: presence of meta_title/desc/focus_keyword/length checks → 0–100), actions dropdown (edit, duplicate, toggle featured, toggle published, delete). Search (debounced title/slug), category + status filters, sort by date, pagination (server-side via range queries), bulk-select with delete/publish.

**4. Create/edit blog form** — react-hook-form + zod. Auto-slug from title (overridable). Featured image + gallery upload to `blog-media` bucket. Category select, tag multi-select (creatable), author defaults to current user, reading-time auto-calc from word count.

**5. Rich text editor** — Tiptap with StarterKit + Heading, Bold, Italic, BulletList, OrderedList, Blockquote, CodeBlock, Table, Image (with drag-and-drop + paste upload to storage), Youtube/Video embed, Link. Sticky toolbar, clean premium styling matching site.

**6. SEO panel** — collapsible card inside the editor route: meta title (60-char counter), meta description (160-char counter), focus keyword, OG image upload, canonical URL, live Google-snippet preview, keyword density indicator (counts focus keyword occurrences in content_html / word count).

**7. Live preview** — toggle button switches the editor pane to a rendered preview using the same typography/prose styles the public blog will use. Desktop/mobile frame toggle (iframe-style wrapper at 1280px vs 390px).

**8. Categories** — list + modal-based add/edit (name, slug auto, description, color picker, icon picker from Lucide subset), delete with confirmation modal (blocks if category has blogs).

**9. Media library** — grid of uploaded images, drag-and-drop uploader (react-dropzone), search by filename, click for preview modal with copy-URL and delete.

**Extras included in v1**: toast notifications (Sonner), confirmation modals (AlertDialog), empty states for every list, skeleton loaders, framer-motion page transitions.

**Deferred to v2** (called out so we ship a tight v1): public blog frontend, related posts, share buttons, autosave drafts, scheduled publishing cron, markdown import/export, newsletter CTA, real analytics.

## Implementation order

1. Enable Lovable Cloud, write migration (enums, tables, RLS, storage bucket, `has_role`, profile trigger).
2. Theme tokens (`index.css`, `tailwind.config.ts`) + base layout primitives matching HESS site.
3. Auth: `/login`, `/reset-password`, `AdminLayout` guard with sidebar + topbar.
4. Dashboard with stats queries + Recharts.
5. Blog list table with filters/search/pagination/bulk actions.
6. Blog create/edit form shell + image uploads.
7. Tiptap editor with full toolbar + drag-drop upload.
8. SEO panel + live preview (desktop/mobile).
9. Categories CRUD.
10. Media library.
11. Polish pass: animations, empty states, skeletons, toasts, responsive QA.

## Technical notes

- TanStack Start file-based routing under `src/routes/`. Auth state via a `useAuth` hook wrapping `supabase.auth`.
- All Supabase reads through typed helpers in `src/lib/api/*.ts`; mutations invalidate TanStack Query caches.
- First signed-up email is auto-promoted to `admin` via a one-time trigger (seeded in migration); subsequent users default to no role.
- SEO score is a deterministic client-side function in `src/lib/seo-score.ts` — no external API.
- Image uploads go directly from the browser to Supabase Storage with signed policies; no edge function needed for v1.

This is a large build — expect it to land across several iterations. After v1 ships and you've used it, we'll layer the public blog frontend and the deferred extras.
