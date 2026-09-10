import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Tag, Pencil, Trash2, Search, FileText, Hash } from "lucide-react";
import slugify from "slugify";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/tags")({
  component: TagsPage,
});

interface TagItem {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
  post_count?: number;
}

const DEFAULT_SUGGESTED_TAGS = [
  "Smart Lighting",
  "Circadian Rhythm",
  "Home Automation",
  "Climate Control",
  "Security & Access",
  "Multi-Room Audio",
  "Energy Efficiency",
  "KNX Protocol",
  "Smart Sensors",
  "Voice Control",
];

function TagsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<TagItem | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all tags with post count
  const { data: tags = [], isLoading } = useQuery<TagItem[]>({
    queryKey: ["tags-admin-list"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { data: tagRows, error } = await supabase
        .from("tags")
        .select("id, name, slug, created_at")
        .order("name", { ascending: true });

      if (error) throw error;

      // Query blog_tags count
      const { data: btRows } = await supabase
        .from("blog_tags")
        .select("tag_id");

      const countMap: Record<string, number> = {};
      (btRows ?? []).forEach((row: { tag_id: string }) => {
        if (row.tag_id) {
          countMap[row.tag_id] = (countMap[row.tag_id] ?? 0) + 1;
        }
      });

      return (tagRows ?? []).map((t) => ({
        ...t,
        post_count: countMap[t.id] ?? 0,
      }));
    },
  });

  const filteredTags = useMemo(() => {
    if (!search.trim()) return tags;
    const q = search.toLowerCase();
    return tags.filter(
      (t) =>
        t.name.toLowerCase().includes(q) || t.slug.toLowerCase().includes(q)
    );
  }, [tags, search]);

  function openNew(prefillName = "") {
    setEditing(null);
    setName(prefillName);
    setSlug(prefillName ? slugify(prefillName, { lower: true, strict: true }) : "");
    setOpen(true);
  }

  function openEdit(t: TagItem) {
    setEditing(t);
    setName(t.name);
    setSlug(t.slug);
    setOpen(true);
  }

  async function save() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Tag name is required");
      return;
    }

    const trimmedSlug = (slug.trim() || slugify(trimmedName, { lower: true, strict: true }))
      .toLowerCase();

    setIsSubmitting(true);
    try {
      const payload = {
        name: trimmedName,
        slug: trimmedSlug,
      };

      if (editing) {
        const { error } = await supabase
          .from("tags")
          .update(payload)
          .eq("id", editing.id);

        if (error) throw error;
        toast.success(`Tag "${trimmedName}" updated`);
      } else {
        const { error } = await supabase.from("tags").insert(payload);
        if (error) throw error;
        toast.success(`Tag "${trimmedName}" created`);
      }

      setOpen(false);
      qc.invalidateQueries({ queryKey: ["tags-admin-list"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to save tag");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function removeTag(id: string) {
    try {
      // First clean up blog_tags references
      await supabase.from("blog_tags").delete().eq("tag_id", id);

      const { error } = await supabase.from("tags").delete().eq("id", id);
      if (error) throw error;

      toast.success("Tag deleted successfully");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["tags-admin-list"] });
      qc.invalidateQueries({ queryKey: ["tags"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete tag");
    }
  }

  return (
    <>
      <PageHeader
        title="Tags"
        description="Organize, classify, and cross-reference your articles and insights."
        actions={
          <Button onClick={() => openNew()} className="rounded-full shadow-sm">
            <Plus className="mr-1.5 h-4 w-4" /> New Tag
          </Button>
        }
      />

      <div className="space-y-6 p-6 md:p-10">
        {/* Search & Statistics Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tags by name or slug..."
              className="pl-9 rounded-xl bg-card border-border/80"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-border px-3 py-1 font-medium text-foreground">
              Total: <span className="text-primary font-bold ml-1">{tags.length}</span>
            </Badge>
          </div>
        </div>

        {/* Tag List / Cards */}
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-card/60 animate-pulse border border-border/40" />
            ))}
          </div>
        ) : filteredTags.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border/80 bg-card/40">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 border border-primary/20 grid place-items-center mb-4">
                <Tag className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                {search ? "No tags match your search" : "No tags created yet"}
              </h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                {search
                  ? "Try searching with a different term or create a new tag."
                  : "Create tags to group your blogs and make them easily searchable for your readers."}
              </p>

              {!search && (
                <div className="mt-6">
                  <p className="text-xs font-semibold text-muted-foreground mb-3">
                    Quick suggestions:
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 max-w-md">
                    {DEFAULT_SUGGESTED_TAGS.map((sug) => (
                      <button
                        key={sug}
                        onClick={() => openNew(sug)}
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium bg-muted/60 hover:bg-primary/20 hover:text-primary border border-border/60 transition-all"
                      >
                        <Plus className="h-3 w-3" /> {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={() => openNew()} className="mt-6 rounded-full">
                <Plus className="mr-1.5 h-4 w-4" /> Create New Tag
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredTags.map((t, idx) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
              >
                <Card className="rounded-2xl border-border/60 bg-card hover:border-primary/40 hover:shadow-md transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/30 grid place-items-center text-primary shrink-0">
                          <Hash className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-semibold text-foreground truncate text-sm">
                            {t.name}
                          </h4>
                          <div className="text-xs font-mono text-muted-foreground truncate">
                            #{t.slug}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => openEdit(t)}
                          title="Edit tag"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeleteId(t.id)}
                          title="Delete tag"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5 text-primary" />
                        <span>
                          <strong className="text-foreground font-semibold">{t.post_count ?? 0}</strong> blogs
                        </span>
                      </span>
                      <Badge variant="outline" className="text-[10px] py-0 px-2 border-border/60">
                        Tag
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create / Edit Tag Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="h-5 w-5 text-primary" />
              <span>{editing ? "Edit Tag" : "Create New Tag"}</span>
            </DialogTitle>
            <DialogDescription>
              Tags help visitors find and filter related articles easily.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="tag-name">Tag Name *</Label>
              <Input
                id="tag-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing) {
                    setSlug(slugify(e.target.value, { lower: true, strict: true }));
                  }
                }}
                placeholder="e.g. Smart Lighting"
                className="mt-1.5 rounded-xl"
                autoFocus
              />
            </div>

            <div>
              <Label htmlFor="tag-slug">Slug (URL identifier)</Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-muted-foreground">
                  #
                </span>
                <Input
                  id="tag-slug"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="smart-lighting"
                  className="pl-7 rounded-xl font-mono text-xs"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              className="rounded-full font-bold"
              onClick={save}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : editing ? "Update Tag" : "Create Tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this tag?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the tag from the system and un-tag any associated blog posts. The blog posts themselves will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId && removeTag(deleteId)}
            >
              Delete Tag
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
