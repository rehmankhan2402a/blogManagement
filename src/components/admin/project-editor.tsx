import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Eye, Upload, X, Plus, Trash2,
  Building2, Check, ExternalLink, Loader2, Image as ImageIcon,
  Sparkles, Star, Layers, MapPin, Calendar, FileText
} from "lucide-react";
import slugify from "slugify";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

const PROJECT_TAGS = [
  "Residential",
  "Commercial",
  "Hospitality",
  "Private Villa",
  "Penthouse",
  "Multi-Dwelling Estate",
  "Corporate Headquarters",
  "Boutique Hotel",
];

function getDisplayImage(url: string | null | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/assets/"))) {
    return url;
  }
  if (url && url.trim()) {
    return `https://pkaulqqcevxoygbftfph.supabase.co/storage/v1/object/public/${url.trim()}`;
  }
  return "/assets/projects/hotel-room.jpg";
}

export function ProjectEditor() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Form states matching Supabase projects schema
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tag, setTag] = useState("Residential");
  const [location, setLocation] = useState("");
  const [clientName, setClientName] = useState("");
  const [year, setYear] = useState("2026");
  const [scope, setScope] = useState("Full Villa Automation");
  const [description, setDescription] = useState("");
  const [contentHtml, setContentHtml] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("/assets/projects/hotel-room.jpg");
  const [isFeatured, setIsFeatured] = useState(false);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [sortOrder, setSortOrder] = useState<number>(1);

  const [uploadingHero, setUploadingHero] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch project data if editing
  const { data: project, isLoading } = useQuery({
    queryKey: ["admin-project", id],
    enabled: Boolean(!isNew && id && typeof window !== "undefined"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Populate form on load
  useEffect(() => {
    if (project) {
      setTitle(project.title || "");
      setSlug(project.slug || "");
      setSlugTouched(true);
      setTag(project.tag || "Residential");
      setLocation(project.location || "");
      setClientName(project.client_name || "");
      setYear(project.year || "2026");
      setScope(project.scope || "Full Villa Automation");
      setDescription(project.description || "");
      setContentHtml(project.content_html || "");
      setFeaturedImageUrl(project.featured_image_url || "/assets/projects/hotel-room.jpg");
      setIsFeatured(Boolean(project.is_featured));
      setStatus(project.status === "published" ? "published" : "draft");
      setSortOrder(typeof project.sort_order === "number" ? project.sort_order : 1);
    }
  }, [project]);

  // Handle title change & auto-slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val, { lower: true, strict: true }));
    }
  };

  // Image Upload Handler
  const handleUploadHero = async (file: File) => {
    try {
      setUploadingHero(true);
      const url = await uploadImage(file);
      setFeaturedImageUrl(url);
      toast.success("Hero image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingHero(false);
    }
  };

  // Save / Publish
  const handleSave = async (overrideStatus?: "published" | "draft") => {
    if (!title.trim()) {
      toast.error("Please enter a project title");
      return;
    }
    const finalSlug = slug.trim() || slugify(title, { lower: true, strict: true });
    const targetStatus = overrideStatus || status;

    const payload = {
      title: title.trim(),
      slug: finalSlug,
      tag: tag.trim(),
      location: location.trim(),
      client_name: clientName.trim(),
      year: year.trim(),
      scope: scope.trim(),
      description: description.trim(),
      content_html: contentHtml.trim(),
      featured_image_url: featuredImageUrl.trim() || "/assets/projects/hotel-room.jpg",
      is_featured: isFeatured,
      status: targetStatus,
      sort_order: Number(sortOrder) || 1,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from("projects").insert([payload]);
        if (error) throw error;
        toast.success("Case study created successfully!");
      } else {
        const { error } = await supabase.from("projects").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Case study updated successfully!");
      }

      await qc.invalidateQueries({ queryKey: ["admin-projects"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["home-featured-projects"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
      navigate({ to: "/admin/projects" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save project");
    } finally {
      setSaving(false);
    }
  };

  // Delete project
  const handleDelete = async () => {
    if (!id || isNew) return;
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      toast.success("Project deleted successfully");
      await qc.invalidateQueries({ queryKey: ["admin-projects"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      navigate({ to: "/admin/projects" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete project");
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading project details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      {/* Top sticky navigation bar */}
      <div className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate({ to: "/admin/projects" })}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-full"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Projects
            </Button>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                {isNew ? "New Case Study" : title || "Edit Project"}
              </span>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold uppercase rounded-md ${
                  status === "published"
                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                    : "border-zinc-500/40 bg-zinc-800/80 text-zinc-400"
                }`}
              >
                {status}
              </Badge>
              {isFeatured && (
                <Badge className="rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold uppercase">
                  Featured Home
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isNew && slug && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="hidden sm:inline-flex gap-1.5 text-xs rounded-full border-border/70"
              >
                <a
                  href={`https://kaseer.com/projects#${slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Eye className="h-3.5 w-3.5" /> Preview on Site
                </a>
              </Button>
            )}

            <Button
              size="sm"
              onClick={() => handleSave()}
              disabled={saving}
              className="gap-1.5 text-xs rounded-full font-bold bg-primary text-primary-foreground shadow-sm"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {isNew ? "Create Project" : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Column (2 cols) */}
          <div className="space-y-6 lg:col-span-2">
            {/* General Info */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <Building2 className="h-4 w-4 text-primary" /> Case Study Overview & Identity
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Project Title *</Label>
                  <Input
                    placeholder="e.g. Minimalist Urban Villa, Penthouse Sky Lounge, Corporate HQ"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-base font-semibold rounded-xl bg-background/70 border-border/70"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">URL Slug</Label>
                    <Input
                      placeholder="minimalist-urban-villa"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      className="rounded-xl bg-background/70 border-border/70 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">Category / Tag</Label>
                    <Select value={tag} onValueChange={setTag}>
                      <SelectTrigger className="rounded-xl bg-background/70 border-border/70 text-xs">
                        <SelectValue placeholder="Select Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {PROJECT_TAGS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">Location</Label>
                    <Input
                      placeholder="e.g. Emirates Hills, Dubai"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="rounded-xl bg-background/70 border-border/70 text-xs"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">Scope of Work</Label>
                    <Input
                      placeholder="e.g. Full Villa Automation"
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      className="rounded-xl bg-background/70 border-border/70 text-xs"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">Year Completed</Label>
                    <Input
                      placeholder="2026"
                      value={year}
                      onChange={(e) => setYear(e.target.value)}
                      className="rounded-xl bg-background/70 border-border/70 text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-1.5 sm:col-span-1">
                    <Label className="text-xs font-semibold">Client / Property</Label>
                    <Input
                      placeholder="Private Client"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      className="rounded-xl bg-background/70 border-border/70 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Short Summary / Excerpt</Label>
                  <Textarea
                    placeholder="Brief description that appears on project cards and home page work grid..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={2}
                    className="rounded-xl bg-background/70 border-border/70 text-xs leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Full Case Study Narrative & Architecture Story</Label>
                  <Textarea
                    placeholder="Comprehensive overview explaining client requirements, engineering challenges, protocols implemented, and architectural finishes..."
                    value={contentHtml}
                    onChange={(e) => setContentHtml(e.target.value)}
                    rows={5}
                    className="rounded-xl bg-background/70 border-border/70 text-xs leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Photography & Hero Image */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ImageIcon className="h-4 w-4 text-primary" /> Featured Showcase Photography
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Main Cover Image</span>
                    {uploadingHero && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </div>

                  {featuredImageUrl ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/70 bg-black">
                      <img
                        src={getDisplayImage(featuredImageUrl)}
                        alt="Project Hero"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/projects/hotel-room.jpg"; }}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setFeaturedImageUrl("")}
                        className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex aspect-[16/8] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:border-primary/60 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="mt-2 text-xs font-medium text-muted-foreground">
                        Upload high-resolution case study photograph
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadHero(f);
                        }}
                      />
                    </label>
                  )}

                  <Input
                    placeholder="Or paste image URL / asset path (e.g. /assets/projects/hotel-room.jpg)"
                    value={featuredImageUrl}
                    onChange={(e) => setFeaturedImageUrl(e.target.value)}
                    className="h-8 text-xs font-mono rounded-lg bg-background/70 border-border/70"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Publishing Controls */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="text-sm font-bold text-foreground">Publishing & Visibility</div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
                  <div>
                    <div className="text-xs font-semibold">Live Status</div>
                    <div className="text-[11px] text-muted-foreground">
                      {status === "published" ? "Published on website" : "Draft (hidden)"}
                    </div>
                  </div>
                  <Switch
                    checked={status === "published"}
                    onCheckedChange={(c) => setStatus(c ? "published" : "draft")}
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Feature on Homepage
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Display in "Featured Work" section
                    </div>
                  </div>
                  <Switch
                    checked={isFeatured}
                    onCheckedChange={setIsFeatured}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Display Sort Order</Label>
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(parseInt(e.target.value) || 1)}
                    className="rounded-xl bg-background/70 border-border/70 text-xs font-mono"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Items with lower numbers (1, 2, 3...) show first.
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <Button
                    onClick={() => handleSave("published")}
                    disabled={saving}
                    className="w-full rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Publish Case Study
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleSave("draft")}
                    disabled={saving}
                    className="w-full rounded-xl text-xs font-semibold border-border/70"
                  >
                    Save as Draft
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Live Website Link */}
            {!isNew && slug && (
              <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="text-xs font-bold text-foreground">Live Website URL</div>
                  <a
                    href={`https://kaseer.com/projects#${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-2.5 text-xs text-primary hover:underline"
                  >
                    <span className="truncate font-mono text-[11px]">/projects#{slug}</span>
                    <ExternalLink className="h-3.5 w-3.5 shrink-0 ml-1.5" />
                  </a>
                </CardContent>
              </Card>
            )}

            {/* Danger Zone */}
            {!isNew && (
              <Card className="rounded-2xl border-destructive/30 bg-destructive/5 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <div className="text-xs font-bold text-destructive">Danger Zone</div>
                  <p className="text-[11px] text-muted-foreground">
                    Permanently delete this project from the database.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full rounded-xl text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Project
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this project?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              This action cannot be undone. <strong>{title}</strong> will be permanently removed from the Supabase database and live portfolio.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl text-xs">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="rounded-xl text-xs font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
