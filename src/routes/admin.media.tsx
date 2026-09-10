import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { motion } from "framer-motion";
import { Upload, Search, Copy, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage, deleteMedia } from "@/lib/media";
import { PageHeader } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/media")({ component: MediaPage });

function MediaPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["media", search],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      let q = supabase.from("media").select("*").order("created_at", { ascending: false }).limit(120);
      if (search.trim()) q = q.ilike("filename", `%${search.trim()}%`);
      return (await q).data ?? [];
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [] },
    onDrop: async (files) => {
      for (const f of files) {
        try { await uploadImage(f); } catch (e: any) { toast.error(e.message); }
      }
      toast.success(`Uploaded ${files.length} file${files.length > 1 ? "s" : ""}`);
      qc.invalidateQueries({ queryKey: ["media"] });
    },
  });

  return (
    <>
      <PageHeader title="Media Library" description="Manage uploaded images." />
      <div className="space-y-6 p-6 md:p-10">
        <div
          {...getRootProps()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed p-10 transition-colors ${
            isDragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary/40 hover:bg-muted/40"
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="mt-3 text-sm font-medium">Drag & drop images here, or click to browse</div>
          <div className="text-xs text-muted-foreground">PNG, JPG, WEBP, GIF</div>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search media…" className="h-10 rounded-xl pl-9" />
        </div>

        {!isLoading && data?.length === 0 ? (
          <Card className="rounded-3xl border-dashed">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <ImageIcon className="h-10 w-10 text-muted-foreground/60" />
              <div className="mt-3 text-base font-medium">No media uploaded yet</div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {data?.map((m: any) => (
              <motion.div key={m.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                <img src={m.url} alt={m.filename} className="aspect-square w-full object-cover" loading="lazy" />
                <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/70 via-black/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100">
                  <div className="flex w-full items-center justify-between gap-2 p-3">
                    <button onClick={() => { navigator.clipboard.writeText(m.url); toast.success("URL copied"); }} className="rounded-full bg-white/90 p-2 text-foreground"><Copy className="h-3.5 w-3.5" /></button>
                    <button onClick={async () => { await deleteMedia(m.id, m.path); toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["media"] }); }} className="rounded-full bg-destructive/90 p-2 text-destructive-foreground"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
                <div className="truncate px-2 py-1.5 text-xs text-muted-foreground">{m.filename}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}