-- ─────────────────────────────────────────────────────────────────────────────
-- Run this in your Supabase project → SQL Editor
-- Creates the contact_messages table for storing website contact form enquiries
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  full_name   text not null,
  email       text not null,
  phone       text,
  service     text,
  message     text not null,
  status      text not null default 'unread'
                check (status in ('unread', 'read', 'replied')),
  notes       text
);

-- Index for quick unread count queries
create index if not exists contact_messages_status_idx
  on public.contact_messages (status);

-- RLS: enable row level security
alter table public.contact_messages enable row level security;

-- Policy: anyone (including anonymous visitors) can INSERT (submit the form)
create policy "Anyone can submit a contact message"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (true);

-- Policy: only authenticated admin/editor users can SELECT, UPDATE, DELETE
create policy "Authenticated users can read messages"
  on public.contact_messages
  for select
  to authenticated
  using (true);

create policy "Authenticated users can update messages"
  on public.contact_messages
  for update
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can delete messages"
  on public.contact_messages
  for delete
  to authenticated
  using (true);
