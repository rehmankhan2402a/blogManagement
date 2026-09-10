import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Search, Star, Trash2, MoreHorizontal, ExternalLink, CheckCircle2, FileEdit, Eye, Copy, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { computeSeoScore } from "@/lib/seo-score";

export const Route = createFileRoute("/admin/blogs")({
  component: BlogsLayout,
});

function BlogsLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  // Show list only at exactly /admin/blogs
  if (path === "/admin/blogs") return <BlogList />;
  return <Outlet />;
}

const PAGE_SIZE = 10;

function BlogList() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [categoryId, setCategoryId] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<"delete" | "publish" | null>(null);

  useEffect(() => {
    setSelected(new Set());
  }, [page, search, status, categoryId]);

  const { data: categories } = useQuery({
    queryKey: ["categories"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => (await supabase.from("categories").select("id,name,color")).data ?? [],
  });

  const { data, isLoading } = useQuery({
    queryKey: ["blogs", search, status, categoryId, page],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      let q = supabase
        .from("blogs")
        .select("id,title,slug,status,is_featured,featured_image_url,published_at,updated_at,reading_time_min,view_count,category_id,meta_title,meta_description,focus_keyword,content_html,categories(name,color)", { count: "exact" })
        .order("updated_at", { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      if (status !== "all") q = q.eq("status", status as "draft" | "published");
      if (categoryId !== "all") q = q.eq("category_id", categoryId);
      const { data, count, error } = await q;
      if (error) throw error;
      return { rows: data ?? [], count: count ?? 0 };
    },
  });

  const pageCount = Math.max(1, Math.ceil((data?.count ?? 0) / PAGE_SIZE));
  const allSelected = useMemo(
    () => !!data?.rows?.length && data.rows.every((r: any) => selected.has(r.id)),
    [data, selected],
  );

  function toggleAll() {
    const next = new Set(selected);
    if (allSelected) data?.rows.forEach((r: any) => next.delete(r.id));
    else data?.rows.forEach((r: any) => next.add(r.id));
    setSelected(next);
  }

  async function performBulk() {
    const ids = Array.from(selected);
    if (!ids.length) return;
    if (bulkAction === "delete") {
      const { error } = await supabase.from("blogs").delete().in("id", ids);
      if (error) return toast.error(error.message);
      toast.success(`Deleted ${ids.length} post${ids.length > 1 ? "s" : ""}`);
    } else if (bulkAction === "publish") {
      const { error } = await supabase
        .from("blogs")
        .update({ status: "published", published_at: new Date().toISOString() })
        .in("id", ids);
      if (error) return toast.error(error.message);
      toast.success(`Published ${ids.length} post${ids.length > 1 ? "s" : ""}`);
    }
    setSelected(new Set());
    setBulkAction(null);
    qc.invalidateQueries({ queryKey: ["blogs"] });
    qc.invalidateQueries({ queryKey: ["blog-stats"] });
  }

  async function deleteOne(id: string) {
    const { error } = await supabase.from("blogs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Blog deleted");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["blogs"] });
    qc.invalidateQueries({ queryKey: ["blog-stats"] });
  }

  async function toggleFeatured(id: string, current: boolean) {
    const { error } = await supabase.from("blogs").update({ is_featured: !current }).eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["blogs"] });
    qc.invalidateQueries({ queryKey: ["blog-stats"] });
  }

  async function duplicateBlog(id: string) {
    const { data, error } = await supabase.from("blogs").select("*").eq("id", id).single();
    if (error || !data) return toast.error("Could not fetch blog");
    const { id: _id, created_at, updated_at, published_at, ...rest } = data;
    const newSlug = `${rest.slug}-copy-${Date.now().toString(36)}`;
    const { error: insertError } = await supabase.from("blogs").insert({
      ...rest,
      slug: newSlug,
      title: `${rest.title} (Copy)`,
      status: "draft",
      is_featured: false,
      author_id: user?.id,
    });
    if (insertError) return toast.error(insertError.message);
    toast.success("Blog duplicated as draft");
    qc.invalidateQueries({ queryKey: ["blogs"] });
    qc.invalidateQueries({ queryKey: ["blog-stats"] });
  }

  async function togglePublished(id: string, current: string) {
    const next = current === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("blogs")
      .update({ status: next, published_at: next === "published" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? "Published" : "Moved to draft");
    qc.invalidateQueries({ queryKey: ["blogs"] });
    qc.invalidateQueries({ queryKey: ["blog-stats"] });
  }

  return (
    <>
      <PageHeader
        title="Blogs"
        description="Manage all blog posts, drafts and publishing."
        actions={
          <Button asChild className="rounded-full">
            <Link to="/admin/blogs/new"><Plus className="mr-1.5 h-4 w-4" /> New Blog</Link>
          </Button>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Filters */}
        <Card className="rounded-2xl border-border/60">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by title…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="h-10 rounded-xl pl-9"
              />
            </div>
            <Select value={status} onValueChange={(v) => { setStatus(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-[150px] rounded-xl"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryId} onValueChange={(v) => { setCategoryId(v); setPage(0); }}>
              <SelectTrigger className="h-10 w-[180px] rounded-xl"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories?.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selected.size > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{selected.size} selected</span>
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => setBulkAction("publish")}>
                  <CheckCircle2 className="mr-1.5 h-4 w-4" /> Publish
                </Button>
                <Button size="sm" variant="outline" className="rounded-full text-destructive" onClick={() => setBulkAction("delete")}>
                  <Trash2 className="mr-1.5 h-4 w-4" /> Delete
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="overflow-hidden rounded-2xl border-border/60">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-4 py-3">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">SEO</th>
                  <th className="px-4 py-3">Views</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {isLoading && [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-t border-border">
                    <td colSpan={8} className="px-4 py-4"><Skeleton className="h-10 w-full" /></td>
                  </tr>
                ))}
                {!isLoading && data?.rows.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-16 text-center">
                    <div className="mx-auto max-w-sm">
                      <FileEdit className="mx-auto mb-3 h-10 w-10 text-muted-foreground/60" />
                      <div className="text-base font-medium">No blog posts found</div>
                      <div className="mt-1 text-sm text-muted-foreground">Get started by creating your first article.</div>
                      <Button asChild className="mt-4 rounded-full">
                        <Link to="/admin/blogs/new"><Plus className="mr-1.5 h-4 w-4" /> New Blog</Link>
                      </Button>
                    </div>
                  </td></tr>
                )}
                {data?.rows.map((b: any) => {
                  const seo = computeSeoScore({
                    metaTitle: b.meta_title,
                    metaDescription: b.meta_description,
                    focusKeyword: b.focus_keyword,
                    title: b.title,
                    contentHtml: b.content_html,
                    featuredImageUrl: b.featured_image_url,
                  });
                  return (
                    <motion.tr
                      key={b.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-t border-border hover:bg-muted/30"
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={selected.has(b.id)}
                          onCheckedChange={(c) => {
                            const next = new Set(selected);
                            c ? next.add(b.id) : next.delete(b.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {b.featured_image_url ? (
                            <img src={b.featured_image_url} alt="" className="h-10 w-14 rounded-lg object-cover" />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-muted" />
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <Link to="/admin/blogs/$id/edit" params={{ id: b.id }} className="truncate font-medium hover:text-primary">
                                {b.title}
                              </Link>
                              {b.is_featured && <Star className="h-3.5 w-3.5 fill-accent text-accent" />}
                            </div>
                            <div className="truncate text-xs font-mono text-muted-foreground">/insights/{b.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {b.categories ? (
                          <Badge variant="secondary" className="rounded-full" style={{ backgroundColor: `${b.categories.color}20`, color: b.categories.color }}>
                            {b.categories.name}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={
                            b.status === "published"
                              ? "rounded-full border-primary/30 bg-primary/10 text-primary"
                              : "rounded-full"
                          }
                        >
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${seo}%`,
                                background: seo >= 75 ? "oklch(0.55 0.16 150)" : seo >= 40 ? "oklch(0.75 0.18 80)" : "oklch(0.6 0.22 27)",
                              }}
                            />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{seo}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 text-xs tabular-nums text-muted-foreground">
                          <TrendingUp className="h-3 w-3 shrink-0" />
                          {(b.view_count ?? 0).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{b.updated_at ? format(new Date(b.updated_at), "MMM d, yyyy") : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.open(`http://localhost:5173/insights/${b.slug}`, "_blank")}>
      <ExternalLink className="mr-2 h-4 w-4 text-primary" /> View Live
    </DropdownMenuItem>
    <DropdownMenuItem asChild>
                              <Link to="/admin/blogs/$id/edit" params={{ id: b.id }}>
                                <FileEdit className="mr-2 h-4 w-4" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => togglePublished(b.id, b.status)}>
                              <Eye className="mr-2 h-4 w-4" />
                              {b.status === "published" ? "Move to draft" : "Publish"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFeatured(b.id, b.is_featured)}>
                              <Star className="mr-2 h-4 w-4" />
                              {b.is_featured ? "Unfeature" : "Feature"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicateBlog(b.id)}>
                              <Copy className="mr-2 h-4 w-4" /> Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(b.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {(data?.count ?? 0) > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t border-border px-4 py-3 text-sm">
              <div className="text-muted-foreground">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, data!.count)} of {data!.count}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" className="rounded-full" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="px-2 text-xs text-muted-foreground">Page {page + 1} / {pageCount}</span>
                <Button variant="outline" size="sm" className="rounded-full" disabled={page + 1 >= pageCount} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this blog post?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteOne(deleteId)}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!bulkAction} onOpenChange={(o) => !o && setBulkAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction === "delete" ? `Delete ${selected.size} posts?` : `Publish ${selected.size} posts?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {bulkAction === "delete" ? "This action cannot be undone." : "Selected drafts will be published now."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={performBulk}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}