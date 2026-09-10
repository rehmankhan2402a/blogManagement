// Supported languages for translation - matching website's i18n config
export const SUPPORTED_LANGUAGES = [
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

export interface BlogContent {
  title: string;
  excerpt?: string;
  content?: any; // JSON content from TipTap
  contentHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
}

export interface TranslatedContent {
  languageCode: LanguageCode;
  title: string;
  excerpt?: string;
  content?: any;
  contentHtml?: string;
  metaTitle?: string;
  metaDescription?: string;
}

/**
 * Translate text using DeepL API
 * Free tier: 500,000 characters/month
 * Documentation: https://www.deepl.com/docs-api/
 * 
 * Note: For free tier, you need to sign up at https://www.deepl.com/pro-api
 * and get an API key. Set DEEPL_API_KEY environment variable.
 */
async function translateText(text: string, targetLanguage: LanguageCode, isHtml = false): Promise<string> {
  if (!text || text.trim() === '') return text;

  try {
    const apiKey = process.env.DEEPL_API_KEY;
    
    if (!apiKey) {
      console.error('DEEPL_API_KEY not set. Translation will fail.');
      throw new Error('DEEPL_API_KEY not set in environment variables');
    }

    // DeepL API has rate limits, so we add a delay between requests
    await new Promise(resolve => setTimeout(resolve, 500));

    // Map language codes to DeepL format
    const langMap: Record<LanguageCode, string> = {
      'ar': 'AR',
      'zh': 'ZH',
      'fr': 'FR',
      'es': 'ES',
      'ms': 'ID', // Malay uses Indonesian in DeepL
    };

    const deeplLang = langMap[targetLanguage] || targetLanguage.toUpperCase();

    console.log(`Translating${isHtml ? ' HTML' : ''} to ${targetLanguage} (${deeplLang}), chars: ${text.length}`);

    const requestBody: Record<string, any> = {
      text: [text],
      source_lang: 'EN',
      target_lang: deeplLang,
    };

    // Tell DeepL to handle HTML properly — preserves tags, only translates text nodes
    if (isHtml) {
      requestBody.tag_handling = 'html';
    }

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Authorization': `DeepL-Auth-Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DeepL API error ${response.status}:`, errorText);
      throw new Error(`DeepL API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (data.translations && data.translations[0]) {
      const translated = data.translations[0].text;
      console.log(`Translation success for ${targetLanguage}:`, translated.substring(0, 50) + '...');
      return translated;
    }
    
    // If translation fails, throw error
    console.error(`Translation failed for ${targetLanguage}:`, data);
    throw new Error(`DeepL API returned invalid response for ${targetLanguage}`);
  } catch (error) {
    console.error(`Translation error for language ${targetLanguage}:`, error);
    // Throw error instead of returning original text
    throw error;
  }
}

/**
 * Translate plain text (for titles, excerpts, meta fields)
 * MyMemory API handles both plain text and HTML
 */
async function translatePlainText(text: string, targetLanguage: LanguageCode): Promise<string> {
  return translateText(text, targetLanguage);
}

/**
 * Translate blog content to multiple languages
 */
export async function translateBlogContent(
  content: BlogContent,
  targetLanguages: LanguageCode[] = SUPPORTED_LANGUAGES.map(l => l.code)
): Promise<TranslatedContent[]> {
  const translations: TranslatedContent[] = [];

  for (const langCode of targetLanguages) {
    try {
      const [translatedTitle, translatedExcerpt, translatedMetaTitle, translatedMetaDescription] = await Promise.all([
        translatePlainText(content.title, langCode),
        content.excerpt ? translatePlainText(content.excerpt, langCode) : Promise.resolve(undefined),
        content.metaTitle ? translatePlainText(content.metaTitle, langCode) : Promise.resolve(undefined),
        content.metaDescription ? translatePlainText(content.metaDescription, langCode) : Promise.resolve(undefined),
      ]);

      // For content_html, translate as HTML — failure is isolated so title/excerpt still save
      let translatedContentHtml: string | undefined = undefined;
      try {
        if (content.contentHtml) {
          translatedContentHtml = await translateText(content.contentHtml, langCode, true);
        }
      } catch (htmlError) {
        console.error(`Failed to translate content_html for ${langCode}:`, htmlError);
      }

      // For JSON content (TipTap), translate recursively — failure is isolated
      let translatedContent: any = undefined;
      try {
        if (content.content) {
          translatedContent = await translateJsonContent(content.content, langCode);
        }
      } catch (jsonError) {
        console.error(`Failed to translate JSON content for ${langCode}:`, jsonError);
      }

      translations.push({
        languageCode: langCode,
        title: translatedTitle,
        excerpt: translatedExcerpt,
        content: translatedContent,
        contentHtml: translatedContentHtml,
        metaTitle: translatedMetaTitle,
        metaDescription: translatedMetaDescription,
      });
    } catch (error) {
      console.error(`Failed to translate to ${langCode}:`, error);
      // Continue with other languages even if one fails
    }
  }

  return translations;
}

/**
 * Translate TipTap JSON content
 * This is a simplified version - you may need to enhance this based on your specific content structure
 */
async function translateJsonContent(jsonContent: any, targetLanguage: LanguageCode): Promise<any> {
  if (!jsonContent) return jsonContent;

  try {
    // If it's a string, translate it
    if (typeof jsonContent === 'string') {
      return await translatePlainText(jsonContent, targetLanguage);
    }

    // If it's an array, process each element
    if (Array.isArray(jsonContent)) {
      return Promise.all(jsonContent.map(item => translateJsonContent(item, targetLanguage)));
    }

    // If it's an object, process text fields
    if (typeof jsonContent === 'object') {
      const translated: any = { ...jsonContent };
      
      // Common TipTap text fields
      if (translated.text) {
        translated.text = await translatePlainText(translated.text, targetLanguage);
      }
      
      // Recursively process nested content
      if (translated.content) {
        translated.content = await translateJsonContent(translated.content, targetLanguage);
      }

      return translated;
    }

    return jsonContent;
  } catch (error) {
    console.error('Error translating JSON content:', error);
    return jsonContent;
  }
}

/**
 * Generate slug from an already-translated title.
 * No extra DeepL call — just slugify what we already have.
 */
export function generateTranslatedSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim() || 'untitled';
}
