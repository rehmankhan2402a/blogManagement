import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, FolderTree, Pencil, Trash2 } from "lucide-react";
import slugify from "slugify";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/categories")({ component: CategoriesPage });

function CategoriesPage() {
  const qc = useQueryClient();
  const { data: cats, isLoading } = useQuery({
    queryKey: ["categories-full"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => (await supabase.from("categories").select("*").order("name")).data ?? [],
  });
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState("#16a34a");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openNew() {
    setEditing(null); setName(""); setSlug(""); setDescription(""); setColor("#16a34a"); setOpen(true);
  }
  function openEdit(c: any) {
    setEditing(c); setName(c.name); setSlug(c.slug); setDescription(c.description ?? ""); setColor(c.color); setOpen(true);
  }

  async function save() {
    if (!name.trim()) return toast.error("Name required");
    const payload = { name: name.trim(), slug: slug.trim() || slugify(name, { lower: true, strict: true }), description: description || null, color };
    const { error } = editing
      ? await supabase.from("categories").update(payload).eq("id", editing.id)
      : await supabase.from("categories").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing ? "Category updated" : "Category created");
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  async function removeCategory(id: string) {
    const { count } = await supabase.from("blogs").select("id", { count: "exact", head: true }).eq("category_id", id);
    if ((count ?? 0) > 0) { toast.error("Category has blogs assigned"); setDeleteId(null); return; }
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    setDeleteId(null);
    qc.invalidateQueries({ queryKey: ["categories-full"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
  }

  return (
    <>
      <PageHeader title="Categories" description="Organize your blog posts."
        actions={<Button onClick={openNew} className="rounded-full"><Plus className="mr-1.5 h-4 w-4" /> New Category</Button>} />
      <div className="p-6 md:p-10">
        {isLoading ? null : cats?.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <FolderTree className="h-10 w-10 text-muted-foreground/60" />
              <div className="mt-3 text-base font-medium">No categories yet</div>
              <div className="mt-1 text-sm text-muted-foreground">Create your first category to organize posts.</div>
              <Button onClick={openNew} className="mt-4 rounded-full"><Plus className="mr-1.5 h-4 w-4" /> New Category</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cats?.map((c: any) => (
              <motion.div key={c.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="rounded-2xl border-border/60 transition-shadow hover:shadow-lg">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl" style={{ background: `${c.color}25`, border: `1px solid ${c.color}50` }} />
                        <div>
                          <div className="font-medium">{c.name}</div>
                          <div className="text-xs text-muted-foreground">/{c.slug}</div>
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                      </div>
                    </div>
                    {c.description && <p className="mt-3 text-sm text-muted-foreground">{c.description}</p>}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Edit category" : "New category"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={(e) => { setName(e.target.value); if (!editing) setSlug(slugify(e.target.value, { lower: true, strict: true })); }} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Slug</Label><Input value={slug} onChange={(e) => setSlug(e.target.value)} className="mt-1.5 rounded-xl" /></div>
            <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="mt-1.5 rounded-xl" /></div>
            <div>
              <Label>Color</Label>
              <div className="mt-1.5 flex items-center gap-2">
                <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg" />
                <Input value={color} onChange={(e) => setColor(e.target.value)} className="rounded-xl" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="rounded-full" onClick={() => setOpen(false)}>Cancel</Button>
            <Button className="rounded-full" onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && removeCategory(deleteId)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}