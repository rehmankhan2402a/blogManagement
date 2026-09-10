/**
 * POST /api/contact
 *
 * Accepts a contact form submission from the public website and stores it
 * in the contact_messages table as status = 'unread'.
 *
 * Request body (JSON):
 * {
 *   "full_name": "Jane Doe",           // required
 *   "email":     "jane@company.com",   // required
 *   "phone":     "+92 300 1234567",    // optional
 *   "service":   "ESG & Sustainability Reporting", // optional
 *   "message":   "We need help with..." // required
 * }
 *
 * Accepted service values:
 *   "Environmental & Social (E&S)"
 *   "Occupational Health & Safety (OHS)"
 *   "Risk, Compliance & Advisory"
 *   "ESG & Sustainability Reporting"
 *   "Monitoring & Implementation"
 *   "Technical & Modelling"
 *   "Other"
 *
 * Success response (201):
 * { "success": true, "id": "<uuid>" }
 *
 * Error response (400 / 500):
 * { "error": "reason" }
 */

import { createFileRoute } from '@tanstack/react-router';
import { createServerSupabase } from '@/lib/supabase-server';

const ALLOWED_SERVICES = [
  'Environmental & Social (E&S)',
  'Occupational Health & Safety (OHS)',
  'Risk, Compliance & Advisory',
  'ESG & Sustainability Reporting',
  'Monitoring & Implementation',
  'Technical & Modelling',
  'Other',
] as const;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Content-Type':                 'application/json',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute('/api/contact')({
  server: {
    handlers: {
      // Handle browser preflight requests
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        try {
          // ── Parse body ──────────────────────────────────────────────────
          let body: Record<string, unknown>;
          try {
            body = await request.json();
          } catch {
            return json({ error: 'Invalid JSON body' }, 400);
          }

          const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
          const email     = typeof body.email     === 'string' ? body.email.trim().toLowerCase() : '';
          const phone     = typeof body.phone     === 'string' ? body.phone.trim() : null;
          const service   = typeof body.service   === 'string' ? body.service.trim() : null;
          const message   = typeof body.message   === 'string' ? body.message.trim() : '';

          // ── Validate required fields ────────────────────────────────────
          if (!full_name) return json({ error: 'full_name is required' }, 400);
          if (!email)     return json({ error: 'email is required' }, 400);
          if (!message)   return json({ error: 'message is required' }, 400);

          // Basic email format check
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return json({ error: 'email is invalid' }, 400);
          }

          // Reject unknown service values (allow null/empty)
          if (service && !(ALLOWED_SERVICES as readonly string[]).includes(service)) {
            return json({ error: `service must be one of: ${ALLOWED_SERVICES.join(', ')}` }, 400);
          }

          // ── Insert into Supabase ────────────────────────────────────────
          const client = createServerSupabase();
          const { data, error } = await client
            .from('contact_messages')
            .insert([{
              full_name,
              email,
              phone:   phone   || null,
              service: service || null,
              message,
              status:  'unread',
            }])
            .select('id')
            .single();

          if (error) {
            console.error('[POST /api/contact] Supabase error:', error.message);
            return json({ error: 'Failed to save message. Please try again.' }, 500);
          }

          return json({ success: true, id: data.id }, 201);

        } catch (e: any) {
          console.error('[POST /api/contact] Unexpected error:', e.message);
          return json({ error: 'Internal server error' }, 500);
        }
      },
    },
  },
});
