import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, ExternalLink, Eye, EyeOff,
  Star, Image as ImageIcon, Upload, Loader2, Sparkles,
  Building2, Check, RefreshCw, Layers, Images, X
} from "lucide-react";
import slugify from "slugify";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/projects")({ component: ProjectsLayout });

function ProjectsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin/projects" || pathname === "/admin/projects/") {
    return <ProjectsPage />;
  }
  return <Outlet />;
}

type ProjectItem = {
  tag?: string | null;
  id: string;
  title: string;
  slug: string;
  category: string;
  location?: string | null;
  description: string;
  full_description?: string | null;
  featured_image_url: string;
  is_featured: boolean;
  highlights?: any;
  specs?: any;
  status: "published" | "draft";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

type GalleryItem = {
  id: string;
  title: string;
  category: string;
  image_url: string;
  status: "published" | "draft";
  sort_order: number;
  created_at?: string;
};

function getDisplayImage(url: string | null | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/assets/"))) {
    return url;
  }
  if (url && url.trim()) {
    return `https://pkaulqqcevxoygbftfph.supabase.co/storage/v1/object/public/${url.trim()}`;
  }
  return "/assets/projects/hotel-room.jpg";
}

function ProjectsPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"projects" | "gallery">("projects");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Gallery item quick modal
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [editingGallery, setEditingGallery] = useState<GalleryItem | null>(null);
  const [galleryForm, setGalleryForm] = useState({
    title: "",
    category: "Living Room",
    image_url: "",
    status: "published",
    sort_order: 10,
  });
  const [uploadingGalleryImg, setUploadingGalleryImg] = useState(false);
  const [savingGallery, setSavingGallery] = useState(false);

  // Deletion
  const [deleteType, setDeleteType] = useState<"project" | "gallery" | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Query Case Studies
  const { data: projects, isLoading: loadingProjects, refetch: refetchProjects } = useQuery<ProjectItem[]>({
    queryKey: ["admin-projects"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ProjectItem[];
    },
  });

  // Query Project Gallery
  const { data: gallery, isLoading: loadingGallery, refetch: refetchGallery } = useQuery<GalleryItem[]>({
    queryKey: ["admin-project-gallery"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("project_gallery")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) return [];
      return (data || []) as unknown as GalleryItem[];
    },
  });

  // Toggle Project Live / Draft
  const toggleProjectStatus = async (p: ProjectItem) => {
    const nextStatus = p.status === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("projects")
        .update({
          tag: galleryForm.category, status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", p.id);

      if (error) throw error;
      toast.success(`"${p.title}" moved to ${nextStatus}`);
      await qc.invalidateQueries({ queryKey: ["admin-projects"] });
      await qc.invalidateQueries({ queryKey: ["projects"] });
      await qc.invalidateQueries({ queryKey: ["home-featured-projects"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  // Toggle Featured
  const toggleFeatured = async (p: ProjectItem) => {
    try {
      const { error } = await supabase
        .from("projects")
        .update({ is_featured: !p.is_featured, updated_at: new Date().toISOString() })
        .eq("id", p.id);

      if (error) throw error;
      toast.success(p.is_featured ? "Removed from Featured" : "Marked as Featured on Home");
      await qc.invalidateQueries({ queryKey: ["admin-projects"] });
      await qc.invalidateQueries({ queryKey: ["home-featured-projects"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update featured state");
    }
  };

  // Delete Action
  const handleDelete = async () => {
    if (!deleteId || !deleteType) return;
    try {
      if (deleteType === "project") {
        const { error } = await supabase.from("projects").delete().eq("id", deleteId);
        if (error) throw error;
        toast.success("Project deleted successfully");
        await qc.invalidateQueries({ queryKey: ["admin-projects"] });
        await qc.invalidateQueries({ queryKey: ["projects"] });
        await qc.invalidateQueries({ queryKey: ["home-featured-projects"] });
      } else {
        const { error } = await supabase.from("project_gallery").delete().eq("id", deleteId);
        if (error) throw error;
        toast.success("Gallery photo deleted successfully");
        await qc.invalidateQueries({ queryKey: ["admin-project-gallery"] });
        await qc.invalidateQueries({ queryKey: ["project_gallery"] });
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to delete item");
    } finally {
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  // Gallery modal save
  const handleSaveGallery = async () => {
    if (!galleryForm.title.trim()) {
      toast.error("Please enter a title");
      return;
    }
    if (!galleryForm.image_url.trim()) {
      toast.error("Please upload or provide an image");
      return;
    }

    setSavingGallery(true);
    try {
      const payload = {
        title: galleryForm.title.trim(),
        category: galleryForm.category.trim(),
        image_url: galleryForm.image_url.trim(),
        status: galleryForm.status,
        sort_order: Number(galleryForm.sort_order) || 10,
      };

      if (editingGallery) {
        const { error } = await supabase.from("project_gallery").update(payload as any).eq("id", editingGallery.id);
        if (error) throw error;
        toast.success("Gallery photo updated!");
      } else {
        const { error } = await supabase.from("project_gallery").insert([payload] as any);
        if (error) throw error;
        toast.success("Gallery photo added!");
      }

      setGalleryDialogOpen(false);
      await qc.invalidateQueries({ queryKey: ["admin-project-gallery"] });
      await qc.invalidateQueries({ queryKey: ["project_gallery"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save photo");
    } finally {
      setSavingGallery(false);
    }
  };

  const handleUploadGalleryPhoto = async (file: File) => {
    try {
      setUploadingGalleryImg(true);
      const url = await uploadImage(file);
      setGalleryForm((f) => ({ ...f, image_url: url }));
      toast.success("Gallery photo uploaded!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload photo");
    } finally {
      setUploadingGalleryImg(false);
    }
  };

  // Filtered lists
  const filteredProjects = (projects || []).filter((p) => {
    const q = (search || "").toLowerCase();
    const matchesSearch =
      (p.title || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.location || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredGallery = (gallery || []).filter((g) => {
    const q = (search || "").toLowerCase();
    const matchesSearch =
      (g.title || "").toLowerCase().includes(q) ||
      (g.category || "").toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalProjects = projects?.length || 0;
  const publishedProjects = projects?.filter((p) => p.status === "published").length || 0;
  const featuredCount = projects?.filter((p) => p.is_featured).length || 0;
  const galleryCount = gallery?.length || 0;

  return (
    <>
      <PageHeader
        title="Case Studies & Gallery"
        description="Manage automation project case studies, client portfolios, and showcase gallery photography."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchProjects();
                refetchGallery();
              }}
              className="gap-1.5 rounded-full text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            {activeTab === "projects" ? (
              <Button
                size="sm"
                asChild
                className="gap-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm"
              >
                <Link to="/admin/projects/new">
                  <Plus className="h-3.5 w-3.5" /> Add Case Study
                </Link>
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={() => {
                  setEditingGallery(null);
                  setGalleryForm({
                    title: "",
                    category: "Living Room",
                    image_url: "",
                    status: "published",
                    sort_order: 10,
                  });
                  setGalleryDialogOpen(true);
                }}
                className="gap-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> Add Gallery Photo
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Projects</div>
              <div className="mt-1 text-xl font-bold text-foreground">{totalProjects}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Published Live</div>
              <div className="mt-1 text-xl font-bold text-foreground">{publishedProjects}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-400 uppercase tracking-wider">
                <Star className="h-3 w-3 fill-amber-400" /> Featured Home
              </div>
              <div className="mt-1 text-xl font-bold text-foreground">{featuredCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Gallery Photos</div>
              <div className="mt-1 text-xl font-bold text-foreground">{galleryCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Tab & Filter Bar */}
        <Card className="rounded-xl border-border/70 bg-card/40 p-3 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
                <button
                  onClick={() => setActiveTab("projects")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    activeTab === "projects"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Building2 className="h-3.5 w-3.5" /> Case Studies ({totalProjects})
                </button>
                <button
                  onClick={() => setActiveTab("gallery")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all ${
                    activeTab === "gallery"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Images className="h-3.5 w-3.5" /> Gallery ({galleryCount})
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-8 rounded-xl bg-background/60 border-border/70 text-xs"
                />
              </div>

              <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
                {["all", "published", "draft"].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`rounded-lg px-2.5 py-0.5 text-[11px] font-semibold capitalize transition-all ${
                      statusFilter === st
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* PROJECTS TAB */}
        {activeTab === "projects" && (
          <div>
            {loadingProjects ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">Loading case studies...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-border/80 bg-card/30">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <Building2 className="h-10 w-10 text-muted-foreground/50" />
                  <div className="mt-3 text-base font-bold text-foreground">No case studies found</div>
                  <Button asChild className="mt-3 rounded-full text-xs bg-primary font-bold text-primary-foreground">
                    <Link to="/admin/projects/new">
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Create First Case Study
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                <AnimatePresence mode="popLayout">
                  {filteredProjects.map((project, idx) => (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                    >
                      <Card className="group relative flex flex-col overflow-hidden rounded-xl border-border/70 bg-card/60 backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5">
                        <Link
                          to="/admin/projects/$id/edit"
                          params={{ id: project.id }}
                          className="block relative aspect-[16/10] w-full overflow-hidden bg-black/50 cursor-pointer"
                        >
                          <img
                            src={getDisplayImage(project.featured_image_url)}
                            alt={project.title}
                            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/projects/hotel-room.jpg"; }}
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5 bg-gradient-to-b from-black/70 to-transparent">
                            <Badge className="rounded-md bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase">
                              {project.tag || "RESIDENTIAL"}
                            </Badge>
                            <div className="flex items-center gap-1">
                              {project.is_featured && (
                                <Badge className="rounded-md bg-amber-500/90 text-black font-bold text-[10px]">
                                  ★ Featured
                                </Badge>
                              )}
                              <Badge
                                variant="outline"
                                className={`rounded-md text-[10px] font-bold uppercase ${
                                  project.status === "published"
                                    ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                                    : "border-zinc-500/40 bg-zinc-800/80 text-zinc-400"
                                }`}
                              >
                                {project.status}
                              </Badge>
                            </div>
                          </div>
                        </Link>

                        <div className="flex flex-1 flex-col p-3.5">
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to="/admin/projects/$id/edit"
                              params={{ id: project.id }}
                              className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
                            >
                              {project.title}
                            </Link>
                            <span className="shrink-0 text-[10px] font-mono font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                              #{project.sort_order}
                            </span>
                          </div>

                          {project.location && (
                            <p className="mt-0.5 text-[11px] font-medium text-primary line-clamp-1">
                              📍 {project.location}
                            </p>
                          )}

                          <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                            {project.description}
                          </p>

                          <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/60">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleFeatured(project)}
                                title="Toggle Featured on Home"
                                className={`rounded-lg p-1 transition-colors ${
                                  project.is_featured
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "text-muted-foreground hover:text-amber-400"
                                }`}
                              >
                                <Star className={`h-3.5 w-3.5 ${project.is_featured ? "fill-amber-400" : ""}`} />
                              </button>
                              <div className="flex items-center gap-1">
                                <Switch
                                  checked={project.status === "published"}
                                  onCheckedChange={() => toggleProjectStatus(project)}
                                  className="scale-75 origin-left"
                                />
                                <span className="text-[10px] text-muted-foreground">
                                  {project.status === "published" ? "Live" : "Draft"}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                asChild
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                              >
                                <Link to="/admin/projects/$id/edit" params={{ id: project.id }}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Link>
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  setDeleteType("project");
                                  setDeleteId(project.id);
                                }}
                                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        )}

        {/* GALLERY TAB */}
        {activeTab === "gallery" && (
          <div>
            {loadingGallery ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">Loading gallery...</p>
              </div>
            ) : filteredGallery.length === 0 ? (
              <Card className="rounded-2xl border-dashed border-border/80 bg-card/30">
                <CardContent className="flex flex-col items-center py-16 text-center">
                  <Images className="h-10 w-10 text-muted-foreground/50" />
                  <div className="mt-3 text-base font-bold text-foreground">No gallery photos found</div>
                  <Button
                    onClick={() => {
                      setEditingGallery(null);
                      setGalleryForm({
                        title: "",
                        category: "Living Room",
                        image_url: "",
                        status: "published",
                        sort_order: 10,
                      });
                      setGalleryDialogOpen(true);
                    }}
                    className="mt-3 rounded-full text-xs bg-primary font-bold text-primary-foreground"
                  >
                    <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Photo
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredGallery.map((item) => (
                  <Card
                    key={item.id}
                    className="group relative flex flex-col overflow-hidden rounded-xl border-border/70 bg-card/60 backdrop-blur-md transition-all hover:border-primary/50 hover:shadow-md"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden bg-black/50">
                      <img
                        src={getDisplayImage(item.image_url)}
                        alt={item.title}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/projects/hotel-room.jpg"; }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2">
                        <div className="text-xs font-bold text-white truncate">{item.title}</div>
                        <div className="text-[10px] text-primary">{item.category}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 border-t border-border/60 bg-card">
                      <span className="text-[10px] font-mono text-muted-foreground">#{item.sort_order}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingGallery(item);
                            setGalleryForm({
                              title: item.title,
                              category: item.category,
                              image_url: item.image_url,
                              status: item.status,
                              sort_order: item.sort_order,
                            });
                            setGalleryDialogOpen(true);
                          }}
                          className="h-6 w-6 rounded text-muted-foreground hover:text-primary"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setDeleteType("gallery");
                            setDeleteId(item.id);
                          }}
                          className="h-6 w-6 rounded text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Gallery Dialog */}
      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editingGallery ? "Edit Gallery Photo" : "Add Gallery Showcase Photo"}</DialogTitle>
            <DialogDescription className="text-xs">
              Showcase high-resolution photos in the Project Gallery section on the website.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Title *</Label>
              <Input
                placeholder="e.g. Master Suite Automation, Smart Kitchen"
                value={galleryForm.title}
                onChange={(e) => setGalleryForm({ ...galleryForm, title: e.target.value })}
                className="text-xs rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Category Room</Label>
                <Input
                  placeholder="Living Room, Cinema..."
                  value={galleryForm.category}
                  onChange={(e) => setGalleryForm({ ...galleryForm, category: e.target.value })}
                  className="text-xs rounded-xl"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Sort Order</Label>
                <Input
                  type="number"
                  value={galleryForm.sort_order}
                  onChange={(e) => setGalleryForm({ ...galleryForm, sort_order: parseInt(e.target.value) || 1 })}
                  className="text-xs rounded-xl font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Photo Image</Label>
              {galleryForm.image_url ? (
                <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/70 bg-black">
                  <img src={getDisplayImage(galleryForm.image_url)} alt="preview" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGalleryForm({ ...galleryForm, image_url: "" })}
                    className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex aspect-[16/9] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:border-primary/60 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <span className="mt-1 text-xs text-muted-foreground">Upload Photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadGalleryPhoto(f);
                    }}
                  />
                </label>
              )}
              <Input
                placeholder="Or paste image URL"
                value={galleryForm.image_url}
                onChange={(e) => setGalleryForm({ ...galleryForm, image_url: e.target.value })}
                className="text-xs font-mono rounded-xl mt-1.5"
              />
            </div>
          </div>

          <DialogFooter className="pt-3">
            <Button variant="outline" size="sm" onClick={() => setGalleryDialogOpen(false)} className="rounded-xl text-xs">
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveGallery} disabled={savingGallery} className="rounded-xl text-xs font-bold bg-primary text-primary-foreground">
              {savingGallery ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              Save Photo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this item?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this {deleteType === "project" ? "case study" : "gallery photo"} from the database.
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
    </>
  );
}
