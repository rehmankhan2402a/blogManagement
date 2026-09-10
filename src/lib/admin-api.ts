import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import ws from 'ws';
import type { Database } from '@/integrations/supabase/types';
import { translateBlogContent, generateTranslatedSlug, SUPPORTED_LANGUAGES, type LanguageCode } from './translation-service';

type Role = 'admin' | 'editor';

function getAdminClient() {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Server configuration error: SUPABASE_SERVICE_ROLE_KEY is not set in .env');
  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws as any },
  });
}

export const createUserFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }: { data: { email: string; password: string; role: Role; fullName: string } }) => {
    const sb = getAdminClient();
    const { data: created, error } = await sb.auth.admin.createUser({
      email:         data.email.trim().toLowerCase(),
      password:      data.password,
      email_confirm: true,
      user_metadata: { full_name: data.fullName },
    });
    if (error) throw new Error(error.message);
    const uid = created.user.id;
    const { error: roleErr } = await sb.from('user_roles').insert({ user_id: uid, role: data.role });
    if (roleErr) throw new Error(roleErr.message);
    const { error: profErr } = await sb.from('profiles').upsert({ id: uid, full_name: data.fullName });
    if (profErr) throw profErr;
    return { id: uid, email: created.user.email };
  });

export const deleteUserFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }: { data: { userId: string } }) => {
    const sb = getAdminClient();
    await sb.from('user_roles').delete().eq('user_id', data.userId);
    await sb.from('profiles').delete().eq('id', data.userId);
    const { error } = await sb.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const sendTestEmailFn = createServerFn({ method: 'POST' })
  .handler(async ({ data }: {
    data: {
      provider: string;
      to: string;
      fromName: string;
      fromEmail: string;
      apiKey?: string;
      smtpHost?: string;
      smtpPort?: number;
      smtpUser?: string;
      smtpPass?: string;
    }
  }) => {
    const rawKey = data.apiKey ? data.apiKey.trim() : '';
    // Use user-provided key if it starts with 're_', otherwise fall back to environment / default key
    const apiKey = (rawKey && rawKey.startsWith('re_'))
      ? rawKey
      : (process.env.RESEND_API_KEY || process.env.VITE_RESEND_API_KEY || 're_fXUixaH4_4dMM6P4q715dQkEhsT1pocBk');

    const fromName = data.fromName || 'KASEER Smart Home Automation';
    const fromEmail = data.fromEmail || 'onboarding@resend.dev';
    const recipient = data.to ? data.to.trim() : '';

    if (!recipient || !recipient.includes('@')) {
      throw new Error('Please specify a valid recipient email address.');
    }

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; background: #061122; color: #f8fafc; padding: 32px; border-radius: 12px; max-width: 580px; margin: 0 auto; border: 1px solid #1e293b;">
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; padding: 6px 16px; background: rgba(217, 119, 6, 0.15); border: 1px solid #d97706; border-radius: 9999px; color: #f59e0b; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            System Test Message
          </div>
          <h1 style="color: #ffffff; margin-top: 16px; margin-bottom: 8px; font-size: 22px;">SMTP & Email Connection Verified 🚀</h1>
          <p style="color: #94a3b8; font-size: 14px; margin: 0;">KASEER Smart Home Automation Dashboard</p>
        </div>

        <div style="background: #0d1932; border: 1px solid #334155; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
          <table style="width: 100%; font-size: 13px; color: #cbd5e1; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #94a3b8; width: 140px;">Selected Provider:</td>
              <td style="padding: 6px 0; font-weight: bold; color: #38bdf8;">${(data.provider || 'resend').toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Sender Name:</td>
              <td style="padding: 6px 0; color: #ffffff;">${fromName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Sender Email:</td>
              <td style="padding: 6px 0; color: #ffffff;">${fromEmail}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Recipient:</td>
              <td style="padding: 6px 0; color: #ffffff;">${recipient}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #94a3b8;">Sent At:</td>
              <td style="padding: 6px 0; color: #ffffff;">${new Date().toLocaleString()}</td>
            </tr>
          </table>
        </div>

        <div style="background: rgba(34, 197, 94, 0.1); border-left: 4px solid #22c55e; padding: 12px 16px; border-radius: 4px; margin-bottom: 24px; font-size: 13px; color: #86efac;">
          ✓ Your email notification system is properly configured and ready to dispatch incoming quote requests and customer inquiries in real time!
        </div>

        <div style="text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #1e293b; padding-top: 16px;">
          This test was initiated from the KASEER Admin Settings interface.
        </div>
      </div>
    `;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [recipient],
        subject: `[TEST] KASEER SMTP & Email Verification — ${new Date().toLocaleTimeString()}`,
        html: htmlBody,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = err.message || `Resend API returned error status ${res.status}`;
      
      // If free tier domain restriction occurs
      if (res.status === 403 && msg.includes('only send testing emails')) {
        throw new Error(`Resend Free Sandbox: To send to custom addresses like ${recipient}, add & verify your custom domain on resend.com/domains.`);
      }
      throw new Error(msg);
    }

    const resData = await res.json();
    return { success: true, id: resData.id };
  });

export const translateBlogFn = createServerFn({ method: 'POST' })
  .handler(async (ctx: any) => {
    const { blogId, languages }: { blogId: string; languages?: LanguageCode[] } = ctx.data;
    const sb = getAdminClient();
    
    // Fetch the blog content
    const { data: blog, error: blogError } = await sb
      .from('blogs')
      .select('*')
      .eq('id', blogId)
      .single();
    
    if (blogError || !blog) {
      throw new Error(blogError?.message || 'Blog not found');
    }

    // Determine which languages to translate
    const targetLanguages = languages || SUPPORTED_LANGUAGES.map(l => l.code);

    // Translate the content
    const translations = await translateBlogContent(
      {
        title: blog.title,
        excerpt: blog.excerpt || undefined,
        content: blog.content,
        contentHtml: blog.content_html || undefined,
        metaTitle: blog.meta_title || undefined,
        metaDescription: blog.meta_description || undefined,
      },
      targetLanguages
    );

    // Store translations in the database
    for (const translation of translations) {
      const slug = generateTranslatedSlug(translation.title);
      
      console.log(`Storing translation for ${translation.languageCode}:`, translation.title);

      const translationData = {
        blog_id: blogId,
        language_code: translation.languageCode,
        title: translation.title,
        slug: slug,
        excerpt: translation.excerpt || null,
        content: translation.content || null,
        content_html: translation.contentHtml || null,
        meta_title: translation.metaTitle || null,
        meta_description: translation.metaDescription || null,
      };

      // Check if translation already exists
      const { data: existing } = await sb
        .from('blog_translations' as any)
        .select('id')
        .eq('blog_id', blogId)
        .eq('language_code', translation.languageCode)
        .maybeSingle();

      let storeError;
      if (existing) {
        // Update existing translation
        const { error } = await sb
          .from('blog_translations' as any)
          .update(translationData as any)
          .eq('blog_id', blogId)
          .eq('language_code', translation.languageCode);
        storeError = error;
      } else {
        // Insert new translation
        const { error } = await sb
          .from('blog_translations' as any)
          .insert(translationData as any);
        storeError = error;
      }

      if (storeError) {
        console.error(`Failed to store translation for ${translation.languageCode}:`, storeError);
      } else {
        console.log(`Successfully stored translation for ${translation.languageCode}`);
      }
    }

    return { 
      success: true, 
      translatedCount: translations.length,
      languages: translations.map(t => t.languageCode)
    };
  });