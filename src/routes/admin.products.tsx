import { createFileRoute, Link, Outlet, useRouterState, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, Pencil, Trash2, ExternalLink, Eye, EyeOff,
  Package, Loader2, RefreshCw, Layers, Check, Cpu
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/products")({ component: ProductsLayout });

function ProductsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  if (pathname === "/admin/products" || pathname === "/admin/products/") {
    return <ProductsPage />;
  }
  return <Outlet />;
}

type ProductItem = {
  id: string;
  name: string;
  slug: string;
  category?: string | null;
  description: string;
  featured_image_url?: string | null;
  features?: any;
  specs?: any;
  images?: any;
  status: "published" | "draft";
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

function getDisplayProductImage(url: string | null | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/assets/"))) {
    return url;
  }
  if (url && url.trim()) {
    return `https://pkaulqqcevxoygbftfph.supabase.co/storage/v1/object/public/${url.trim()}`;
  }
  return "/assets/products/touch-switch-01.jpg";
}

function ProductsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: products, isLoading, refetch } = useQuery<ProductItem[]>({
    queryKey: ["admin-products"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as ProductItem[];
    },
  });

  const toggleStatus = async (product: ProductItem) => {
    const nextStatus = product.status === "published" ? "draft" : "published";
    try {
      const { error } = await supabase
        .from("products")
        .update({ status: nextStatus, updated_at: new Date().toISOString() })
        .eq("id", product.id);

      if (error) throw error;
      toast.success(`"${product.name}" moved to ${nextStatus}`);
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["published-products-catalog"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", deleteId);
      if (error) throw error;
      toast.success("Product deleted successfully");
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["published-products-catalog"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    } finally {
      setDeleteId(null);
    }
  };

  const filtered = (products || []).filter((p) => {
    const q = (search || "").toLowerCase();
    const matchesSearch =
      (p.name || "").toLowerCase().includes(q) ||
      (p.slug || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.description || "").toLowerCase().includes(q);

    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalCount = products?.length || 0;
  const publishedCount = products?.filter((p) => p.status === "published").length || 0;
  const draftCount = products?.filter((p) => p.status === "draft").length || 0;

  return (
    <>
      <PageHeader
        title="Hardware Products"
        description="Manage capacitive touch panels, smart locks, sockets, and hubs."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-1.5 rounded-full text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button
              size="sm"
              asChild
              className="gap-1.5 rounded-full text-xs font-bold bg-primary text-primary-foreground shadow-sm"
            >
              <Link to="/admin/products/new">
                <Plus className="h-3.5 w-3.5" /> Add Product
              </Link>
            </Button>
          </div>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Products</div>
              <div className="mt-1 text-xl font-bold text-foreground">{totalCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-primary uppercase tracking-wider">Published Live</div>
              <div className="mt-1 text-xl font-bold text-foreground">{publishedCount}</div>
            </CardContent>
          </Card>
          <Card className="rounded-xl border-border/70 bg-card/60 backdrop-blur-sm">
            <CardContent className="p-3">
              <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Draft Items</div>
              <div className="mt-1 text-xl font-bold text-foreground">{draftCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card className="rounded-xl border-border/70 bg-card/40 p-3 backdrop-blur-sm">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search products by name, category, description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl bg-background/60 border-border/70 text-xs"
              />
            </div>

            <div className="flex items-center rounded-xl bg-muted/60 p-1 border border-border/60">
              {["all", "published", "draft"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold capitalize transition-all ${
                    statusFilter === st ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </Card>

        {/* Products Grid */}
        {isLoading ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs font-semibold text-muted-foreground">Loading products...</p>
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-2xl border-dashed border-border/80 bg-card/30">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <Package className="h-10 w-10 text-muted-foreground/50" />
              <div className="mt-3 text-base font-bold text-foreground">No products found</div>
              <Button asChild className="mt-3 rounded-full text-xs bg-primary font-bold text-primary-foreground">
                <Link to="/admin/products/new">
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Product
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <AnimatePresence mode="popLayout">
              {filtered.map((product, idx) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                >
                  <Card className="group relative flex flex-col overflow-hidden rounded-xl border-border/70 bg-card/60 backdrop-blur-md transition-all duration-300 hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5">
                    <Link
                      to="/admin/products/$id/edit"
                      params={{ id: product.id }}
                      className="block relative aspect-[16/10] w-full overflow-hidden bg-black/50 cursor-pointer"
                    >
                      <img
                        src={getDisplayProductImage(product.featured_image_url)}
                        alt={product.name}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/products/touch-switch-01.jpg"; }}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-2.5 bg-gradient-to-b from-black/70 to-transparent">
                        <Badge className="rounded-md bg-primary/90 text-primary-foreground font-bold text-[10px] uppercase">
                          {product.category || "HARDWARE"}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`rounded-md text-[10px] font-bold uppercase ${
                            product.status === "published"
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                              : "border-zinc-500/40 bg-zinc-800/80 text-zinc-400"
                          }`}
                        >
                          {product.status}
                        </Badge>
                      </div>
                    </Link>

                    <div className="flex flex-1 flex-col p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to="/admin/products/$id/edit"
                          params={{ id: product.id }}
                          className="text-sm font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors"
                        >
                          {product.name}
                        </Link>
                        <span className="shrink-0 text-[10px] font-mono font-semibold text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                          #{product.sort_order}
                        </span>
                      </div>

                      <p className="mt-1.5 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-2">
                        {product.description}
                      </p>

                      <div className="mt-3 flex items-center justify-between pt-2.5 border-t border-border/60">
                        <div className="flex items-center gap-1.5">
                          <Switch
                            checked={product.status === "published"}
                            onCheckedChange={() => toggleStatus(product)}
                            className="scale-75 origin-left"
                          />
                          <span className="text-[11px] text-muted-foreground">
                            {product.status === "published" ? "Live" : "Draft"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            asChild
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                          >
                            <Link to="/admin/products/$id/edit" params={{ id: product.id }}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(product.id)}
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

      {/* Delete Dialog */}
      <AlertDialog open={Boolean(deleteId)} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              This will permanently delete this hardware item from the database.
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
