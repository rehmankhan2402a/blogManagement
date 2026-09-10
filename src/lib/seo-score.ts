export function computeSeoScore(args: {
  metaTitle?: string | null;
  metaDescription?: string | null;
  focusKeyword?: string | null;
  title?: string | null;
  contentHtml?: string | null;
  featuredImageUrl?: string | null;
}): number {
  let score = 0;
  const kw = (args.focusKeyword || "").toLowerCase().trim();
  const mt = (args.metaTitle || "").trim();
  const md = (args.metaDescription || "").trim();
  const html = (args.contentHtml || "").toLowerCase();
  const text = html.replace(/<[^>]+>/g, " ");

  if (mt.length >= 30 && mt.length <= 60) score += 18;
  else if (mt.length > 0) score += 8;

  if (md.length >= 80 && md.length <= 160) score += 18;
  else if (md.length > 0) score += 8;

  if (args.featuredImageUrl) score += 12;

  if (kw) {
    if (mt.toLowerCase().includes(kw)) score += 12;
    if (md.toLowerCase().includes(kw)) score += 10;
    if ((args.title || "").toLowerCase().includes(kw)) score += 10;
    if (text.includes(kw)) score += 10;
  }

  const words = text.split(/\s+/).filter(Boolean).length;
  if (words >= 300) score += 10;

  return Math.min(100, score);
}

export function keywordDensity(html: string, keyword: string): number {
  if (!keyword) return 0;
  const text = (html || "").replace(/<[^>]+>/g, " ").toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const kw = keyword.toLowerCase();
  const matches = (text.match(new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "g")) || []).length;
  return +(100 * matches / words.length).toFixed(2);
}

export function readingTimeMinutes(html: string): number {
  const words = (html || "").replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}