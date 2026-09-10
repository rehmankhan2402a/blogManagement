import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Eye, Upload, X, Plus, Trash2,
  Package, Check, ExternalLink, Loader2, Image as ImageIcon,
  Sparkles, Layers, RefreshCw, AlertCircle, FileText
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

const PRODUCT_CATEGORIES = [
  "Wall Controls",
  "Access & Security",
  "Power & Energy",
  "Infrastructure",
  "Control & Dashboards",
  "Lighting",
  "Climate Control",
  "Audio & Entertainment",
  "Sensors & Safety",
];

function getDisplayProductImage(url: string | null | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/assets/"))) {
    return url;
  }
  if (url && url.trim()) {
    return `https://pkaulqqcevxoygbftfph.supabase.co/storage/v1/object/public/${url.trim()}`;
  }
  return "/assets/products/touch-switch-01.jpg";
}

export function ProductEditor() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Form states
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [category, setCategory] = useState("Wall Controls");
  const [description, setDescription] = useState("");
  const [featuredImageUrl, setFeaturedImageUrl] = useState("");
  const [secondaryImageUrl, setSecondaryImageUrl] = useState("");
  const [features, setFeatures] = useState<string[]>([
    "1–6 gang tempered-glass fascia",
    "Scene recall and long-press dimming",
    "Backlight that tracks the house schedule"
  ]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [specs, setSpecs] = useState<[string, string][]>([
    ["Load per gang", "up to 400 W"],
    ["Protocol", "Zigbee 3.0 / RS-485"],
    ["Finish", "Glass, brushed steel, matte black"]
  ]);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [sortOrder, setSortOrder] = useState<number>(1);

  const [uploadingImg1, setUploadingImg1] = useState(false);
  const [uploadingImg2, setUploadingImg2] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch product data if editing
  const { data: product, isLoading } = useQuery({
    queryKey: ["admin-product", id],
    enabled: Boolean(!isNew && id && typeof window !== "undefined"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Populate form on load
  useEffect(() => {
    if (product) {
      setName(product.name || "");
      setSlug(product.slug || "");
      setSlugTouched(true);
      setCategory(product.category || "Wall Controls");
      setDescription(product.description || "");
      setFeaturedImageUrl(product.featured_image_url || "");
      setStatus(product.status === "published" ? "published" : "draft");
      setSortOrder(typeof product.sort_order === "number" ? product.sort_order : 1);

      // Features
      if (Array.isArray(product.features) && product.features.length > 0) {
        setFeatures(product.features as string[]);
      }

      // Specs
      if (Array.isArray(product.specs) && product.specs.length > 0) {
        setSpecs((product.specs as any[]).map((s: any) =>
          Array.isArray(s) ? [s[0] || "", s[1] || ""] : [String(s), ""]
        ));
      }

      // Images
      if (Array.isArray(product.images) && product.images.length > 0) {
        const img1 = product.images[0]?.src || product.featured_image_url || "";
        const img2 = product.images[1]?.src || "";
        if (img1) setFeaturedImageUrl(img1);
        if (img2) setSecondaryImageUrl(img2);
      }
    }
  }, [product]);

  // Handle title change & auto-slug
  const handleNameChange = (val: string) => {
    setName(val);
    if (!slugTouched) {
      setSlug(slugify(val, { lower: true, strict: true }));
    }
  };

  // Image Upload Handlers
  const handleUpload1 = async (file: File) => {
    try {
      setUploadingImg1(true);
      const url = await uploadImage(file);
      setFeaturedImageUrl(url);
      toast.success("Primary image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImg1(false);
    }
  };

  const handleUpload2 = async (file: File) => {
    try {
      setUploadingImg2(true);
      const url = await uploadImage(file);
      setSecondaryImageUrl(url);
      toast.success("Secondary image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImg2(false);
    }
  };

  // Feature List Helpers
  const addFeature = () => {
    if (!newFeatureText.trim()) return;
    setFeatures([...features, newFeatureText.trim()]);
    setNewFeatureText("");
  };

  const removeFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  // Spec List Helpers
  const addSpec = () => {
    setSpecs([...specs, ["Parameter", "Value"]]);
  };

  const updateSpec = (idx: number, key: string, val: string) => {
    const next = [...specs];
    next[idx] = [key, val];
    setSpecs(next);
  };

  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };

  // Save / Publish
  const handleSave = async (overrideStatus?: "published" | "draft") => {
    if (!name.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    const finalSlug = slug.trim() || slugify(name, { lower: true, strict: true });
    const targetStatus = overrideStatus || status;

    // Prepare dual images array
    const imagesArr: { src: string; alt: string }[] = [];
    if (featuredImageUrl.trim()) {
      imagesArr.push({
        src: featuredImageUrl.trim(),
        alt: `${name} primary view`
      });
    }
    if (secondaryImageUrl.trim()) {
      imagesArr.push({
        src: secondaryImageUrl.trim(),
        alt: `${name} detail view`
      });
    }

    const payload = {
      name: name.trim(),
      slug: finalSlug,
      category: category.trim(),
      description: description.trim(),
      featured_image_url: featuredImageUrl.trim() || "/assets/products/touch-switch-01.jpg",
      features: features.filter((f) => f.trim().length > 0),
      specs: specs.filter(([k]) => k.trim().length > 0),
      images: imagesArr.length > 0 ? imagesArr : [{ src: "/assets/products/touch-switch-01.jpg", alt: name.trim() }],
      status: targetStatus,
      sort_order: Number(sortOrder) || 1,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from("products").insert([payload]);
        if (error) throw error;
        toast.success("Product created successfully!");
      } else {
        const { error } = await supabase.from("products").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Product updated successfully!");
      }

      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["published-products-catalog"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
      navigate({ to: "/admin/products" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  // Delete product
  const handleDelete = async () => {
    if (!id || isNew) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      toast.success("Product deleted successfully");
      await qc.invalidateQueries({ queryKey: ["admin-products"] });
      await qc.invalidateQueries({ queryKey: ["published-products-catalog"] });
      navigate({ to: "/admin/products" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete product");
    }
  };

  if (!isNew && isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading product details...</p>
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
              onClick={() => navigate({ to: "/admin/products" })}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-full"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Products
            </Button>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                {isNew ? "New Product" : name || "Edit Product"}
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
                  href={`http://192.168.18.57:8000/products#${slug}`}
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
              {isNew ? "Create Product" : "Save Changes"}
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
                  <Package className="h-4 w-4 text-primary" /> Product Identity & Categorization
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Product Name *</Label>
                  <Input
                    placeholder="e.g. Touch Switches, Dial Switches, Smart Locks"
                    value={name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    className="text-base font-semibold rounded-xl bg-background/70 border-border/70"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">URL Slug</Label>
                    <Input
                      placeholder="touch-switches"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      className="rounded-xl bg-background/70 border-border/70 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category Range</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="rounded-xl bg-background/70 border-border/70 text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRODUCT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat} className="text-xs">
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Description & Positioning</Label>
                  <Textarea
                    placeholder="Explain what this hardware line achieves and how it interacts with the smart ecosystem..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="rounded-xl bg-background/70 border-border/70 text-xs leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Key Features */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Key Features & Bullet Points
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {features.length} features
                  </Badge>
                </div>

                <div className="space-y-2">
                  {features.map((feat, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 rounded-xl border border-border/60 bg-background/60 p-2.5 transition-all hover:border-primary/40"
                    >
                      <div className="size-2 rounded-full bg-primary shrink-0" />
                      <Input
                        value={feat}
                        onChange={(e) => {
                          const next = [...features];
                          next[idx] = e.target.value;
                          setFeatures(next);
                        }}
                        className="h-8 border-none bg-transparent p-0 text-xs shadow-none focus-visible:ring-0"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFeature(idx)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Add a new feature bullet (e.g. 1–6 gang tempered-glass fascia)..."
                    value={newFeatureText}
                    onChange={(e) => setNewFeatureText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    className="text-xs rounded-xl bg-background/70 border-border/70"
                  />
                  <Button
                    type="button"
                    onClick={addFeature}
                    size="sm"
                    className="gap-1 rounded-xl text-xs font-semibold shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Technical Specifications */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Layers className="h-4 w-4 text-primary" /> Technical Specifications
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSpec}
                    className="h-7 text-xs rounded-full gap-1 border-border/70"
                  >
                    <Plus className="h-3 w-3" /> Add Row
                  </Button>
                </div>

                <div className="space-y-2">
                  {specs.map(([k, v], idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Spec Name (e.g. Load per gang)"
                        value={k}
                        onChange={(e) => updateSpec(idx, e.target.value, v)}
                        className="h-8 text-xs font-medium rounded-lg bg-background/70 border-border/70 flex-1"
                      />
                      <Input
                        placeholder="Value (e.g. up to 400 W)"
                        value={v}
                        onChange={(e) => updateSpec(idx, k, e.target.value)}
                        className="h-8 text-xs font-mono rounded-lg bg-background/70 border-border/70 flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpec(idx)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Imagery & Media */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ImageIcon className="h-4 w-4 text-primary" /> High-Resolution Product Imagery (Side-by-Side Dual Images)
                </div>
                <p className="text-xs text-muted-foreground">
                  KASEER hardware showcase renders 2 images side-by-side per category for an immersive presentation.
                </p>

                <div className="grid gap-4 sm:grid-cols-2">
                  {/* Image 1 */}
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Primary Image (Main Catalog)</span>
                      {uploadingImg1 && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    </div>

                    {featuredImageUrl ? (
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border/70 bg-black">
                        <img
                          src={getDisplayProductImage(featuredImageUrl)}
                          alt="Primary"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setFeaturedImageUrl("")}
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-muted/20 hover:border-primary/60 transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="mt-2 text-xs font-medium text-muted-foreground">Click or drop image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload1(f);
                          }}
                        />
                      </label>
                    )}

                    <Input
                      placeholder="Or paste image URL / asset path"
                      value={featuredImageUrl}
                      onChange={(e) => setFeaturedImageUrl(e.target.value)}
                      className="h-8 text-xs font-mono rounded-lg bg-background/70 border-border/70"
                    />
                  </div>

                  {/* Image 2 */}
                  <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3.5">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span>Secondary Image (Detail / Ambient)</span>
                      {uploadingImg2 && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                    </div>

                    {secondaryImageUrl ? (
                      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-lg border border-border/70 bg-black">
                        <img
                          src={getDisplayProductImage(secondaryImageUrl)}
                          alt="Secondary"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => setSecondaryImageUrl("")}
                          className="absolute right-2 top-2 rounded-full bg-black/70 p-1 text-white hover:bg-black"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex aspect-[16/10] w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border/80 bg-muted/20 hover:border-primary/60 transition-colors">
                        <Upload className="h-6 w-6 text-muted-foreground" />
                        <span className="mt-2 text-xs font-medium text-muted-foreground">Click or drop image</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUpload2(f);
                          }}
                        />
                      </label>
                    )}

                    <Input
                      placeholder="Or paste image URL / asset path"
                      value={secondaryImageUrl}
                      onChange={(e) => setSecondaryImageUrl(e.target.value)}
                      className="h-8 text-xs font-mono rounded-lg bg-background/70 border-border/70"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar (1 col) */}
          <div className="space-y-6">
            {/* Publishing Controls */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 space-y-4">
                <div className="text-sm font-bold text-foreground">Publishing & Status</div>

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
                  <div>
                    <div className="text-xs font-semibold">Live Status</div>
                    <div className="text-[11px] text-muted-foreground">
                      {status === "published" ? "Visible to website visitors" : "Saved as draft only"}
                    </div>
                  </div>
                  <Switch
                    checked={status === "published"}
                    onCheckedChange={(c) => setStatus(c ? "published" : "draft")}
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
                    Items with lower sort order (1, 2, 3...) appear first.
                  </p>
                </div>

                <div className="pt-2 border-t border-border/60 space-y-2">
                  <Button
                    onClick={() => handleSave("published")}
                    disabled={saving}
                    className="w-full rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-sm"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                    Publish Product
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
                    href={`http://192.168.18.57:8000/products#${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-2.5 text-xs text-primary hover:underline"
                  >
                    <span className="truncate font-mono text-[11px]">/products#{slug}</span>
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
                    Permanently delete this product and remove it from catalog.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full rounded-xl text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Product
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
            <AlertDialogTitle>Are you sure you want to delete this product?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              This action cannot be undone. <strong>{name}</strong> will be permanently removed from the Supabase database and frontend hardware catalog.
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
