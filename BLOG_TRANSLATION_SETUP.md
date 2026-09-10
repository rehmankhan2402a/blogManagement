# Blog Translation Setup Guide

This guide explains how to set up DeepL API for blog localization in your CMS.

## Overview

The blog translation system automatically translates blog posts to multiple languages when they are published. The workflow is:

1. Admin writes blog in English
2. Backend calls DeepL Translation API
3. Creates translations for Arabic, Chinese, French, Spanish, Malay
4. Stores all translations in the database
5. Frontend serves translated content based on user's language preference

## Prerequisites

- DeepL API Free Account (sign up at https://www.deepl.com/pro-api)

## Step 1: Get DeepL API Key

1. Go to [DeepL API](https://www.deepl.com/pro-api)
2. Sign up for a free account (no credit card required)
3. Navigate to your account settings
4. Generate an API key
5. Copy the API key

## Step 2: Configure Environment Variable

Add the DeepL API key to your environment:

### For Development (.env)
```env
DEEPL_API_KEY=your-deepl-api-key-here
```

### For Production (PM2)
Add to your `ecosystem.config.cjs`:
```javascript
module.exports = {
  apps: [
    {
      name: 'hess-cms',
      script: 'server-node.mjs',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SUPABASE_URL: 'your-supabase-url',
        SUPABASE_SERVICE_ROLE_KEY: 'your-service-role-key',
        DEEPL_API_KEY: 'your-deepl-api-key-here',
      },
    },
  ],
};
```

## DeepL API Details

- **Cost**: Free tier available
- **Free Tier Limit**: 500,000 characters/month
- **Quality**: Excellent (better than MyMemory and Google Translate)
- **Languages Supported**: Arabic, Chinese, French, Spanish, Indonesian (for Malay)
- **Rate Limiting**: Built-in rate limiting (we add 200ms delays between requests)

## Step 1: Run Database Migration

Run the migration to create the `blog_translations` table:

```bash
supabase db push
```

## Step 2: Test the Translation

1. Start your development server
2. Create a new blog post in the admin panel
3. Save/Publish the blog post
4. Click the **Translate** button in the blog editor
5. The system will translate the blog to all supported languages
6. Check the database to verify translations were created

## Supported Languages

The system currently supports translation to:

- Arabic (ar)
- French (fr)
- Spanish (es)
- German (de)
- Chinese (zh)
- Portuguese (pt)
- Russian (ru)
- Italian (it)
- Japanese (ja)
- Korean (ko)

You can modify the `SUPPORTED_LANGUAGES` array in `src/lib/translation-service.ts` to add or remove languages.

## Using Translations in Frontend

### API Usage

To fetch translated content, add the `lang` query parameter:

```bash
# Get blog list in Arabic
GET /api/blogs?lang=ar

# Get single blog in French
GET /api/blogs/my-blog-slug?lang=fr
```

### Language Selector Component

Use the `LanguageSelector` component in your frontend:

```tsx
import { LanguageSelector } from '@/components/language-selector';

function BlogPage() {
  const [language, setLanguage] = useState('en');

  return (
    <div>
      <LanguageSelector 
        currentLanguage={language}
        onLanguageChange={setLanguage}
      />
      {/* Fetch blogs with the selected language */}
    </div>
  );
}
```

## Usage Limits and Considerations

DeepL API has a monthly limit of 500,000 characters on the free tier. This means:

- **Average blog post** (~2000 characters): ~250 translations per month
- **Short blog post** (~500 characters): ~1000 translations per month
- **Long blog post** (~5000 characters): ~100 translations per month

### Tips to Stay Within Limits

1. **Translate selectively**: Only translate important/high-traffic blog posts
2. **Reduce target languages**: Translate to fewer languages (e.g., just Arabic and Spanish)
3. **Monitor usage**: Check your DeepL account dashboard for usage statistics

### If You Need Higher Limits

If you exceed the monthly limit, you can:

1. **Wait for the next month** (limit resets monthly)
2. **Upgrade to DeepL paid plan** (higher limits available)
3. **Switch to a different provider**

## Troubleshooting

### Translation fails with quota error

You've hit the monthly limit. Either:
- Wait until next month for the limit to reset
- Reduce the number of target languages
- Consider upgrading to a paid DeepL plan

### "DEEPL_API_KEY not set" error

Make sure you've:
1. Signed up for DeepL API at https://www.deepl.com/pro-api
2. Generated an API key in your account settings
3. Added the API key to your environment variables

### Translation quality is poor

DeepL provides excellent machine translation quality. If you still have issues:
- Manually edit translations in the `blog_translations` table
- Check if the source text is properly formatted
- Consider breaking long content into smaller chunks

### Database errors

Make sure the migration was run successfully and the `blog_translations` table exists.

## Manual Translation Editing

If you need to manually edit a translation (e.g., to fix machine translation errors), you can:

1. Access the `blog_translations` table directly in Supabase
2. Edit the translated content
3. The frontend will automatically use the updated translation

## Switching to Other Translation Services

If you need higher limits or better quality, you can easily switch to other services:

### DeepL API (Recommended Alternative)

- **Free tier**: 500,000 characters/month
- **Quality**: Excellent (better than MyMemory)
- **Setup**: Requires free account signup (no credit card)
- **Documentation**: https://www.deepl.com/pro-api

To switch to DeepL, modify `src/lib/translation-service.ts` to use the DeepL API instead of MyMemory.

## Next Steps

1. Add the `LanguageSelector` component to your website header
2. Store user's language preference in localStorage or cookies
3. Update your blog listing and detail pages to use the `lang` parameter
4. Consider adding language-specific URLs (e.g., `/ar/blog/my-post`)
5. Monitor your daily translation usage to stay within limits
