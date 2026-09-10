import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Eye, Monitor, Smartphone, Upload, X, Star, Tag, Plus,
  Languages, ExternalLink, Clock, Calendar, Sparkles, Image as ImageIcon,
  BookOpen, CheckCircle2, ChevronRight, Hash, Layers
} from "lucide-react";
import slugify from "slugify";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { RichEditor } from "@/components/admin/rich-editor";
import { uploadImage } from "@/lib/media";
import { computeSeoScore, keywordDensity, readingTimeMinutes } from "@/lib/seo-score";

export function BlogEditor() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuth();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [excerpt, setExcerpt] = useState("");
  const [contentJson, setContentJson] = useState<any>(null);
  const [contentHtml, setContentHtml] = useState("");
  const [featuredImage, setFeaturedImage] = useState<string | null>(null);
  const [gallery, setGallery] = useState<string[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isFeatured, setIsFeatured] = useState(false);
  const [readingTimeInput, setReadingTimeInput] = useState<number>(5);
  const [readingTimeTouched, setReadingTimeTouched] = useState(false);
  const [publishedAt, setPublishedAt] = useState<string>("");
  const [authorName, setAuthorName] = useState<string>("KASEER Architecture");
  
  // SEO & Social
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [focusKeyword, setFocusKeyword] = useState("");
  const [ogImage, setOgImage] = useState<string | null>(null);
  const [canonicalUrl, setCanonicalUrl] = useState("");

  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState<"edit" | "desktop" | "mobile">("edit");
  const [tagInput, setTagInput] = useState("");
  const [selectedTags, setSelectedTags] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [translating, setTranslating] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    enabled: typeof window !== "undefined",
    queryFn: async () => (await supabase.from("categories").select("id,name,color").order("name")).data ?? [],
  });

  const { data: allTags } = useQuery({
    queryKey: ["tags"],
    enabled: typeof window !== "undefined",
    queryFn: async () => (await supabase.from("tags").select("id,name,slug").order("name")).data ?? [],
  });

  useEffect(() => {
    if (!id) return;
    async function loadBlog() {
      const { data, error } = await supabase.from("blogs").select("*").eq("id", id as string).maybeSingle();
      if (error || !data) { toast.error("Blog not found"); return; }
      setTitle(data.title || "");
      setSlug(data.slug || "");
      setExcerpt(data.excerpt ?? "");
      setContentJson(data.content);
      setContentHtml(data.content_html ?? "");
      setFeaturedImage(data.featured_image_url);
      setGallery(Array.isArray(data.gallery) ? (data.gallery as string[]) : []);
      setCategoryId(data.category_id);
      setStatus(data.status as any);
      setIsFeatured(Boolean(data.is_featured));
      setReadingTimeInput(data.reading_time_min || 5);
      setReadingTimeTouched(true);
      if (data.published_at) {
        setPublishedAt(new Date(data.published_at).toISOString().slice(0, 16));
      }
      setMetaTitle(data.meta_title ?? "");
      setMetaDescription(data.meta_description ?? "");
      setFocusKeyword(data.focus_keyword ?? "");
      setOgImage(data.og_image_url);
      setCanonicalUrl(data.canonical_url ?? "");
      setSlugTouched(true);

      // Load tags
      const { data: blogTags } = await supabase
        .from("blog_tags")
        .select("tags(id,name,slug)")
        .eq("blog_id", id as string);
      if (blogTags) {
        setSelectedTags(blogTags.map((bt: any) => bt.tags).filter(Boolean));
      }
    }
    loadBlog();
  }, [id]);

  useEffect(() => {
    if (!slugTouched && title) {
      setSlug(slugify(title || "", { lower: true, strict: true }));
    }
  }, [title, slugTouched]);

  const autoReadingTime = useMemo(() => readingTimeMinutes(contentHtml), [contentHtml]);

  useEffect(() => {
    if (!readingTimeTouched) {
      setReadingTimeInput(autoReadingTime);
    }
  }, [autoReadingTime, readingTimeTouched]);

  // Live Table of Contents parser for outline inspection
  const extractedToc = useMemo(() => {
    if (!contentHtml) return [];
    const parser = new DOMParser();
    const doc = parser.parseFromString(contentHtml, "text/html");
    const headings = doc.querySelectorAll("h2, h3");
    const items: { id: string; text: string; level: number }[] = [];
    headings.forEach((h, index) => {
      const text = h.textContent?.trim() || "";
      if (text) {
        items.push({
          id: h.id || ("heading-" + (index + 1)),
          text,
          level: h.tagName.toLowerCase() === "h2" ? 2 : 3,
        });
      }
    });
    return items;
  }, [contentHtml]);

  const seoScore = useMemo(
    () => computeSeoScore({
      metaTitle: metaTitle || title,
      metaDescription: metaDescription || excerpt,
      focusKeyword,
      title,
      contentHtml,
      featuredImageUrl: featuredImage
    }),
    [metaTitle, metaDescription, focusKeyword, title, contentHtml, featuredImage],
  );

  const density = useMemo(() => keywordDensity(contentHtml, focusKeyword), [contentHtml, focusKeyword]);

  async function save(publish?: boolean) {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    setSaving(true);
    try {
      const finalStatus = publish ? "published" : status;
      let finalPublishedAt = publishedAt ? new Date(publishedAt).toISOString() : null;
      if (finalStatus === "published" && !finalPublishedAt) {
        finalPublishedAt = new Date().toISOString();
      }

      const payload: any = {
        title: title.trim(),
        slug: slug.trim(),
        excerpt: excerpt || null,
        content: contentJson,
        content_html: contentHtml,
        featured_image_url: featuredImage,
        gallery: gallery,
        category_id: categoryId,
        author_id: user?.id,
        reading_time_min: readingTimeInput || autoReadingTime,
        status: finalStatus,
        is_featured: isFeatured,
        published_at: finalPublishedAt,
        meta_title: metaTitle || null,
        meta_description: metaDescription || null,
        focus_keyword: focusKeyword || null,
        og_image_url: ogImage,
        canonical_url: canonicalUrl || null,
      };

      if (isNew) {
        const { data, error } = await supabase.from("blogs").insert(payload).select("id").single();
        if (error) throw error;
        // Save tags
        if (selectedTags.length) {
          await supabase.from("blog_tags").insert(selectedTags.map((t) => ({ blog_id: data.id, tag_id: t.id })));
        }
        toast.success(publish ? "Published to KASEER website!" : "Draft saved");
        qc.invalidateQueries({ queryKey: ["blogs"] });
        qc.invalidateQueries({ queryKey: ["blog-stats"] });
        navigate({ to: "/admin/blogs/$id/edit", params: { id: data.id } });
      } else {
        const { error } = await supabase.from("blogs").update(payload).eq("id", id!);
        if (error) throw error;
        // Sync tags: delete all then re-insert
        await supabase.from("blog_tags").delete().eq("blog_id", id!);
        if (selectedTags.length) {
          await supabase.from("blog_tags").insert(selectedTags.map((t) => ({ blog_id: id!, tag_id: t.id })));
        }
        setStatus(finalStatus);
        toast.success(publish ? "Updated on KASEER website!" : "Changes saved");
        qc.invalidateQueries({ queryKey: ["blogs"] });
        qc.invalidateQueries({ queryKey: ["blog-stats"] });
      }
    } catch (e: any) {
      toast.error(e.message ?? "Could not save blog");
    } finally {
      setSaving(false);
    }
  }

  async function onUploadFeatured(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setFeaturedImage(url);
      toast.success("Featured image uploaded");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
  }

  async function onUploadGalleryImage(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsGalleryUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const url = await uploadImage(files[i]);
        uploadedUrls.push(url);
      }
      setGallery((prev) => [...prev, ...uploadedUrls]);
      toast.success("Uploaded " + uploadedUrls.length + " image(s) to gallery");
    } catch (err: any) {
      toast.error(err.message || "Gallery upload failed");
    } finally {
      setIsGalleryUploading(false);
    }
  }

  function removeGalleryImage(index: number) {
    setGallery((prev) => prev.filter((_, i) => i !== index));
  }

  async function onUploadOgImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadImage(file);
      setOgImage(url);
      toast.success("Social sharing image uploaded");
    } catch (err: any) { toast.error(err.message || "Upload failed"); }
  }

  async function addTag(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (selectedTags.some((t) => t.name.toLowerCase() === trimmed.toLowerCase())) return;
    const existing = (allTags ?? []).find((t: any) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setSelectedTags((prev) => [...prev, existing as any]);
    } else {
      const slug = slugify(trimmed || "", { lower: true, strict: true });
      const { data, error } = await supabase.from("tags").insert({ name: trimmed, slug }).select("id,name,slug").single();
      if (error) { toast.error(error.message); return; }
      setSelectedTags((prev) => [...prev, data]);
      qc.invalidateQueries({ queryKey: ["tags"] });
    }
    setTagInput("");
  }

  function removeTag(id: string) {
    setSelectedTags((prev) => prev.filter((t) => t.id !== id));
  }

  async function translateBlog() {
    if (!id) {
      toast.error("Please save the blog first before translating");
      return;
    }
    setTranslating(true);
    try {
      const response = await fetch('/api/translate-blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blogId: id }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Translation failed');
      }
      const result = await response.json();
      toast.success("Successfully translated to " + result.translatedCount + " languages: " + result.languages.join(', '));
      qc.invalidateQueries({ queryKey: ["blog-translations"] });
    } catch (e: any) {
      toast.error(e.message ?? "Translation failed");
    } finally {
      setTranslating(false);
    }
  }

  const selectedCategoryName = categories?.find((c: any) => c.id === categoryId)?.name || "Infrastructure";

  return (
    <>
      {/* Top action bar */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/90 px-6 py-4 backdrop-blur md:px-10">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate({ to: "/admin/blogs" })}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="text-lg font-semibold flex items-center gap-2">
              {isNew ? "New Insight / Blog Post" : "Edit Blog Post"}
              {isFeatured && <Badge variant="secondary" className="rounded-full gap-1 text-[10px] bg-primary/10 text-primary border-primary/20"><Star className="h-3 w-3 fill-primary text-primary" /> Featured</Badge>}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-2">
              <span className={status === "published" ? "text-emerald-500 font-medium" : "text-amber-500"}>
                ● {status === "published" ? "Published Live" : "Draft"}
              </span>
              <span>·</span>
              <span>{readingTimeInput} min read</span>
              {slug && (
                <>
                  <span>·</span>
                  <span className="font-mono text-[11px] text-muted-foreground">/insights/{slug}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Live View Button */}
          {slug && (
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs gap-1.5 hidden sm:inline-flex"
              onClick={() => window.open("http://localhost:5173/insights/" + slug, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5 text-primary" /> View Live
            </Button>
          )}

          {/* Preview Modes */}
          <Tabs value={previewMode} onValueChange={(v) => setPreviewMode(v as any)}>
            <TabsList className="rounded-full">
              <TabsTrigger value="edit" className="rounded-full text-xs">Editor</TabsTrigger>
              <TabsTrigger value="desktop" className="rounded-full text-xs gap-1"><Monitor className="h-3.5 w-3.5" /> Preview</TabsTrigger>
              <TabsTrigger value="mobile" className="rounded-full text-xs"><Smartphone className="h-3.5 w-3.5" /></TabsTrigger>
            </TabsList>
          </Tabs>

          {!isNew && (
            <Button variant="outline" size="sm" className="rounded-full" disabled={translating || saving} onClick={translateBlog}>
              <Languages className="mr-1.5 h-3.5 w-3.5" /> {translating ? "Translating..." : "Translate"}
            </Button>
          )}
          <Button variant="outline" size="sm" className="rounded-full" disabled={saving} onClick={() => save(false)}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save Draft
          </Button>
          <Button size="sm" className="rounded-full shadow-md" disabled={saving} onClick={() => save(true)}>
            <Eye className="mr-1.5 h-3.5 w-3.5" /> {status === "published" ? "Update Live" : "Publish to KASEER"}
          </Button>
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 p-6 md:grid-cols-[1fr_360px] md:p-10">
        {/* Main column */}
        <div className="space-y-6">
          {previewMode === "edit" ? (
            <>
              {/* Main article fields */}
              <Card className="rounded-3xl border-border/60 shadow-sm">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <Label htmlFor="title" className="text-sm font-semibold">Article Title</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Designing Light for the Human Rhythm"
                      className="mt-1.5 h-12 rounded-xl text-lg font-medium"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug" className="text-sm font-semibold">URL Path</Label>
                    <div className="mt-1.5 flex h-11 items-center rounded-xl border border-input bg-muted/20 px-3">
                      <span className="text-xs font-mono text-muted-foreground mr-1">kaseer.com/insights/</span>
                      <input
                        id="slug"
                        value={slug}
                        onChange={(e) => { setSlug(e.target.value); setSlugTouched(true); }}
                        placeholder="designing-light-for-human-rhythm"
                        className="flex-1 bg-transparent text-xs font-mono outline-none text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="excerpt" className="text-sm font-semibold">Lead Excerpt / Summary</Label>
                      <span className="text-xs text-muted-foreground">Renders as prominent 18px lead paragraph</span>
                    </div>
                    <Textarea
                      id="excerpt"
                      rows={3}
                      value={excerpt}
                      onChange={(e) => setExcerpt(e.target.value)}
                      placeholder="Why the cabling decision made at grey-structure stage quietly determines what your home can do a decade later."
                      className="mt-1.5 rounded-xl leading-relaxed"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* TipTap Rich Editor */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <Label className="text-sm font-semibold flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5 text-[#F5A93F]" />
                    Editorial Content Body
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    Use <strong className="text-primary">H2</strong> for main sections (generates Table of Contents)
                  </span>
                </div>
                <RichEditor
                  value={contentJson}
                  onChange={(json, html) => {
                    setContentJson(json);
                    setContentHtml(html);
                  }}
                />
              </div>

              {/* Table of Contents Live Inspector */}
              {extractedToc.length > 0 && (
                <Card className="rounded-3xl border-primary/20 bg-primary/5">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary">
                        <Layers className="h-4 w-4" /> Live Table of Contents ({extractedToc.length} sections detected)
                      </div>
                      <span className="text-[11px] text-muted-foreground">Auto-generated for "On This Page" sidebar</span>
                    </div>
                    <div className="space-y-1.5">
                      {extractedToc.map((t, idx) => (
                        <div key={idx} className={"flex items-center gap-2 text-xs " + (t.level === 3 ? "pl-5 text-muted-foreground" : "font-medium text-foreground")}>
                          <Badge variant="outline" className="h-4 px-1 text-[9px] rounded font-mono">
                            {t.level === 2 ? "H2" : "H3"}
                          </Badge>
                          <span className="truncate">{t.text}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* SEO & Search Engine Optimization */}
              <Card className="rounded-3xl border-border/60 shadow-sm">
                <CardContent className="space-y-4 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold">Search Engine Optimization (SEO)</div>
                      <p className="text-xs text-muted-foreground">Optimize how this insight ranks on Google & Bing.</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs font-medium">SEO Score</div>
                        <div className="text-lg font-bold tabular-nums text-primary">{seoScore}/100</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="meta-title" className="text-xs">Meta Title</Label>
                        <span className="text-[10px] text-muted-foreground">{(metaTitle || title).length}/60</span>
                      </div>
                      <Input
                        id="meta-title"
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        placeholder={title || "Designing Light for the Human Rhythm"}
                        className="mt-1 rounded-xl text-sm"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="focus-keyword" className="text-xs">Focus Keyword</Label>
                        {focusKeyword && <span className="text-[10px] text-muted-foreground">Density: {density}%</span>}
                      </div>
                      <Input
                        id="focus-keyword"
                        value={focusKeyword}
                        onChange={(e) => setFocusKeyword(e.target.value)}
                        placeholder="e.g. smart lighting, cabling backbone"
                        className="mt-1 rounded-xl text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="meta-description" className="text-xs">Meta Description</Label>
                      <span className="text-[10px] text-muted-foreground">{(metaDescription || excerpt).length}/160</span>
                    </div>
                    <Textarea
                      id="meta-description"
                      rows={2}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      placeholder={excerpt || "Deep dive into residential lighting automation and circadian engineering."}
                      className="mt-1 rounded-xl text-xs"
                    />
                  </div>

                  {/* SERP preview */}
                  <div className="rounded-2xl border border-border bg-muted/20 p-4">
                    <div className="text-[11px] font-medium text-muted-foreground mb-1">Google SERP Snippet Preview</div>
                    <div className="text-sm font-semibold text-[#1a0dab] hover:underline cursor-pointer truncate">
                      {metaTitle || title || "Article Title — KASEER Insights"}
                    </div>
                    <div className="text-xs text-[#006621] truncate">{"https://kaseer.com/insights/" + (slug || "post-slug")}</div>
                    <div className="mt-1 text-xs text-muted-foreground line-clamp-2">
                      {metaDescription || excerpt || "Architectural insights and engineering notes from KASEER Smart Home systems."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <LuxuryPreviewPane
              mode={previewMode}
              title={title}
              excerpt={excerpt}
              html={contentHtml}
              image={featuredImage}
              category={selectedCategoryName}
              author={authorName}
              readingTime={readingTimeInput}
              toc={extractedToc}
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Publish & Status Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div className="text-sm font-semibold flex items-center justify-between">
                <span>Publishing Status</span>
                <Badge
                  variant={status === "published" ? "default" : "outline"}
                  className={status === "published" ? "rounded-full bg-emerald-600 text-white" : "rounded-full"}
                >
                  {status === "published" ? "Published" : "Draft"}
                </Badge>
              </div>

              <div className="flex items-center justify-between pt-1">
                <Label htmlFor="featured" className="flex items-center gap-2 text-sm font-medium cursor-pointer">
                  <Star className="h-4 w-4 text-primary" /> Highlight as Featured
                </Label>
                <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>

              {/* Published Date */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label htmlFor="published-at" className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> Published Date
                  </Label>
                  <button
                    type="button"
                    onClick={() => setPublishedAt(new Date().toISOString().slice(0, 16))}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Set to Now
                  </button>
                </div>
                <Input
                  id="published-at"
                  type="datetime-local"
                  value={publishedAt}
                  onChange={(e) => setPublishedAt(e.target.value)}
                  className="h-8 rounded-xl text-xs"
                />
              </div>

              {/* Reading Time */}
              <div className="space-y-1.5 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                  <Label htmlFor="reading-time" className="text-xs flex items-center gap-1 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" /> Reading Time (Minutes)
                  </Label>
                  <button
                    type="button"
                    onClick={() => {
                      setReadingTimeInput(autoReadingTime);
                      setReadingTimeTouched(false);
                      toast.info("Auto-calculated " + autoReadingTime + " min read");
                    }}
                    className="text-[10px] text-primary hover:underline font-medium"
                  >
                    Auto ({autoReadingTime}m)
                  </button>
                </div>
                <Input
                  id="reading-time"
                  type="number"
                  min={1}
                  max={60}
                  value={readingTimeInput}
                  onChange={(e) => {
                    setReadingTimeInput(parseInt(e.target.value) || 1);
                    setReadingTimeTouched(true);
                  }}
                  className="h-8 rounded-xl text-xs"
                />
              </div>
            </CardContent>
          </Card>

          {/* Category Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Category</div>
                <Badge variant="outline" className="text-[10px] rounded-full">KASEER Theme</Badge>
              </div>
              <Select value={categoryId ?? "none"} onValueChange={(v) => setCategoryId(v === "none" ? null : v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {categories?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color || "#F5A93F" }} />
                        <span>{c.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Author / Byline Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="text-sm font-semibold">Author / Byline</div>
              <Input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="KASEER Architecture"
                className="h-9 rounded-xl text-xs"
              />
              <p className="text-[11px] text-muted-foreground">Displays on article header with author initials badge.</p>
            </CardContent>
          </Card>

          {/* Featured Image Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Featured Hero Image</div>
                <span className="text-[10px] text-muted-foreground">16:7 or 16:9 ratio</span>
              </div>
              {featuredImage ? (
                <div className="relative group overflow-hidden rounded-2xl border border-border">
                  <img src={featuredImage} alt="Featured" className="aspect-video w-full object-cover" />
                  <button
                    onClick={() => setFeaturedImage(null)}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white hover:bg-black transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors">
                  <Upload className="h-6 w-6 text-primary" />
                  <span className="mt-2 text-xs font-medium text-foreground">Upload hero image</span>
                  <span className="text-[10px] text-muted-foreground">Direct Supabase storage</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onUploadFeatured} />
                </label>
              )}
            </CardContent>
          </Card>

          {/* Gallery / Project Photos Card */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold flex items-center gap-1.5">
                  <ImageIcon className="h-4 w-4" /> Media Gallery
                </div>
                <span className="text-[10px] text-muted-foreground">{gallery.length} photo(s)</span>
              </div>
              
              {gallery.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {gallery.map((imgUrl, idx) => (
                    <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-border bg-black/40">
                      <img src={imgUrl} alt="" className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeGalleryImage(idx)}
                        className="absolute right-1 top-1 rounded-full bg-black/80 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <label className="flex h-12 cursor-pointer items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground hover:border-primary/50 hover:bg-muted/30 transition-colors gap-2">
                <Plus className="h-4 w-4 text-primary" />
                <span>{isGalleryUploading ? "Uploading..." : "Add gallery photos"}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onUploadGalleryImage} disabled={isGalleryUploading} />
              </label>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Tag className="h-3.5 w-3.5" /> Tags & Topics
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedTags.map((t) => (
                  <Badge key={t.id} variant="secondary" className="rounded-full gap-1 pr-1 text-xs">
                    {t.name}
                    <button onClick={() => removeTag(t.id)} className="ml-0.5 rounded-full hover:bg-muted-foreground/20">
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(tagInput); } }}
                  placeholder="Add tag and press Enter…"
                  className="h-8 rounded-xl text-xs"
                />
                <Button size="sm" variant="outline" className="h-8 rounded-xl px-2.5" onClick={() => addTag(tagInput)}>
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Social / OG Image */}
          <Card className="rounded-3xl border-border/60 shadow-sm">
            <CardContent className="space-y-3 p-6">
              <div className="text-sm font-semibold">Social Sharing (OG Image)</div>
              <p className="text-[11px] text-muted-foreground">Overrides hero image when link is shared on WhatsApp or LinkedIn.</p>
              {ogImage ? (
                <div className="relative group overflow-hidden rounded-2xl border border-border">
                  <img src={ogImage} alt="" className="aspect-video w-full object-cover" />
                  <button onClick={() => setOgImage(null)} className="absolute right-2 top-2 rounded-full bg-black/70 p-1.5 text-white">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border text-muted-foreground hover:border-primary/50 hover:bg-muted/40 transition-colors">
                  <Upload className="h-5 w-5 text-primary" />
                  <span className="mt-1 text-xs">Upload OG Image</span>
                  <input type="file" accept="image/*" className="hidden" onChange={onUploadOgImage} />
                </label>
              )}
            </CardContent>
          </Card>
        </aside>
      </motion.div>
    </>
  );
}

function LuxuryPreviewPane({
  mode,
  title,
  excerpt,
  html,
  image,
  category,
  author,
  readingTime,
  toc
}: {
  mode: "desktop" | "mobile";
  title: string;
  excerpt: string;
  html: string;
  image: string | null;
  category: string;
  author: string;
  readingTime: number;
  toc: { id: string; text: string; level: number }[];
}) {
  return (
    <div className="flex justify-center">
      <div
        className="overflow-hidden rounded-3xl border border-white/10 bg-[#061122] text-[#F0F4F8] shadow-2xl transition-all"
        style={{ width: mode === "mobile" ? 390 : "min(100%, 940px)" }}
      >
        {/* Mock KASEER Header */}
        <div className="border-b border-white/10 bg-[#061122]/90 px-6 py-4 flex items-center justify-between">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#F5A93F]">KASEER</div>
          <Badge variant="outline" className="text-[10px] border-white/20 text-white/60">Live Preview Mode</Badge>
        </div>

        <div className="p-6 sm:p-10 space-y-6">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-white/50">
            <span>Home</span>
            <ChevronRight className="h-3 w-3" />
            <span>Insights</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-white/80 truncate max-w-[180px]">Article</span>
          </div>

          {/* Category Tag */}
          <span className="inline-block text-[11px] font-bold tracking-[0.22em] text-[#F5A93F] uppercase">
            {category || "INFRASTRUCTURE"}
          </span>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white leading-tight">
            {title || "Untitled Insight Post"}
          </h1>

          {/* Byline */}
          <div className="flex items-center gap-3 pt-2">
            <div className="h-9 w-9 rounded-full bg-[#F5A93F]/20 border border-[#F5A93F]/40 flex items-center justify-center text-[#F5A93F] text-xs font-bold">
              KA
            </div>
            <div className="flex flex-wrap items-center gap-x-3 text-xs text-white/60">
              <span className="font-medium text-white">{author || "KASEER Architecture"}</span>
              <span>·</span>
              <span>{category || "Smart Home Systems"}</span>
              <span>·</span>
              <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{readingTime || 5} min read</span>
            </div>
          </div>

          {/* Hero Image */}
          {image && (
            <div className="aspect-[16/7] w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40">
              <img src={image} alt="" className="h-full w-full object-cover" />
            </div>
          )}

          {/* 2-Column Article & TOC layout */}
          <div className={toc.length > 0 && mode === "desktop" ? "grid grid-cols-[1fr_240px] gap-8 pt-4" : "pt-4"}>
            <article className="space-y-6">
              {excerpt && (
                <p className="text-base sm:text-lg leading-relaxed text-white/80 font-light border-b border-white/10 pb-6">
                  {excerpt}
                </p>
              )}

              {/* Prose */}
              <div
                className="prose prose-invert prose-base max-w-none text-white/85 [&_h2]:text-white [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-4 [&_h3]:text-white/95 [&_h3]:text-lg [&_h3]:font-semibold [&_blockquote]:border-l-4 [&_blockquote]:border-[#F5A93F] [&_blockquote]:bg-white/5 [&_blockquote]:p-4 [&_blockquote]:rounded-r-xl [&_blockquote]:italic [&_blockquote]:text-white/90"
                dangerouslySetInnerHTML={{ __html: html || "<p className='italic text-white/40'>Empty article content.</p>" }}
              />

              {/* Closing CTA */}
              <div className="mt-10 rounded-2xl border border-white/10 bg-[#0D1932] p-6 text-sm text-white/80">
                <p>Have a question about this architecture? <span className="font-semibold text-[#F5A93F] underline">Get in touch</span> with our engineering team.</p>
              </div>
            </article>

            {/* Sidebar Table of Contents */}
            {toc.length > 0 && mode === "desktop" && (
              <aside className="border-l border-white/10 pl-5 space-y-3">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#F5A93F]">On This Page</div>
                <ul className="space-y-2">
                  {toc.map((item, idx) => (
                    <li key={idx} className={item.level === 3 ? "pl-3 text-xs text-white/60" : "text-xs text-white/80 font-medium"}>
                      <span className="hover:text-[#F5A93F] cursor-pointer transition-colors block py-0.5">
                        {item.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </aside>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
