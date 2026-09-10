import { useEffect, useState } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, Save, Eye, Upload, X, Plus, Trash2,
  Sparkles, Check, ExternalLink, Loader2, Image as ImageIcon,
  Layers, Search, FileText, Star,
  Lightbulb, Thermometer, ShieldCheck, Video, Lock,
  KeyRound, Blinds, Clapperboard, Speaker, Gauge, Sun,
  Wifi, Flame, Building2, Cpu, Wrench
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

const AVAILABLE_ICONS = [
  { name: "Lightbulb", icon: Lightbulb, label: "Lighting Automation" },
  { name: "Thermometer", icon: Thermometer, label: "Climate & HVAC" },
  { name: "ShieldCheck", icon: ShieldCheck, label: "Security & Safety" },
  { name: "Video", icon: Video, label: "CCTV & Video Entry" },
  { name: "Lock", icon: Lock, label: "Access & Smart Locks" },
  { name: "KeyRound", icon: KeyRound, label: "Keyless Credentials" },
  { name: "Blinds", icon: Blinds, label: "Motorised Shading" },
  { name: "Clapperboard", icon: Clapperboard, label: "Cinema & Theater" },
  { name: "Speaker", icon: Speaker, label: "Multi-Room Audio" },
  { name: "Gauge", icon: Gauge, label: "Energy Monitoring" },
  { name: "Sun", icon: Sun, label: "Solar & Microgrid" },
  { name: "Wifi", icon: Wifi, label: "Wi-Fi 7 & Network" },
  { name: "Flame", icon: Flame, label: "Fire & Life Safety" },
  { name: "Building2", icon: Building2, label: "BMS & Commercial" },
  { name: "Cpu", icon: Cpu, label: "Edge Processors & Hubs" },
  { name: "Wrench", icon: Wrench, label: "Preventative Care" },
  { name: "Layers", icon: Layers, label: "Custom Integration" },
  { name: "Sparkles", icon: Sparkles, label: "Smart Experience" },
];

const SERVICE_TAGS = [
  "Lighting",
  "Climate",
  "Security",
  "Access",
  "Shading",
  "Entertainment",
  "Audio",
  "Energy",
  "Network",
  "Safety",
  "Commercial",
  "Automation"
];

function getDisplayImage(url: string | null | undefined): string {
  if (url && (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("/assets/"))) {
    return url;
  }
  if (url && url.trim()) {
    return `https://pkaulqqcevxoygbftfph.supabase.co/storage/v1/object/public/${url.trim()}`;
  }
  return "/assets/Smart Lighting.png";
}

export function ServiceEditor() {
  const params = useParams({ strict: false }) as { id?: string };
  const id = params.id;
  const isNew = !id || id === "new";
  const navigate = useNavigate();
  const qc = useQueryClient();

  // Form states matching Supabase services table columns
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tag, setTag] = useState("Lighting");
  const [iconName, setIconName] = useState("Lightbulb");
  const [iconSearch, setIconSearch] = useState("");
  const [shortDesc, setShortDesc] = useState("");
  const [detailedDesc, setDetailedDesc] = useState("");
  const [imageUrl, setImageUrl] = useState("/assets/Smart Lighting.png");
  const [features, setFeatures] = useState<string[]>([
    "Circadian rhythm scheduling",
    "Multi-gang keypad scenes",
    "Occupancy & daylight sensors"
  ]);
  const [newFeatureText, setNewFeatureText] = useState("");
  const [specs, setSpecs] = useState<string[]>([
    "KNX / DALI-2 / Zigbee 3.0",
    "0.1% True Dimming",
    "0-10V Drivers"
  ]);
  const [newSpecText, setNewSpecText] = useState("");
  const [isFeatured, setIsFeatured] = useState(true);
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [sortOrder, setSortOrder] = useState<number>(1);

  const [uploadingImg, setUploadingImg] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Fetch service data if editing
  const { data: service, isLoading } = useQuery({
    queryKey: ["admin-service", id],
    enabled: Boolean(!isNew && id && typeof window !== "undefined"),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Populate form on load
  useEffect(() => {
    if (service) {
      setTitle(service.title || "");
      setSlug(service.slug || "");
      setSlugTouched(true);
      setTag(service.tag || "Lighting");
      setIconName(service.icon_name || "Lightbulb");
      setShortDesc(service.short_desc || "");
      setDetailedDesc(service.detailed_desc || "");
      setImageUrl(service.image_url || "/assets/Smart Lighting.png");
      setIsFeatured(Boolean(service.is_featured));
      setStatus(service.status === "published" ? "published" : "draft");
      setSortOrder(typeof service.sort_order === "number" ? service.sort_order : 1);

      // Features
      if (Array.isArray(service.features) && service.features.length > 0) {
        setFeatures(service.features as string[]);
      }

      // Specs
      if (Array.isArray(service.specs) && service.specs.length > 0) {
        setSpecs((service.specs as any[]).map((s: any) =>
          Array.isArray(s) ? s.join(" — ") : String(s)
        ));
      }
    }
  }, [service]);

  // Handle title change & auto-slug
  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!slugTouched) {
      setSlug(slugify(val, { lower: true, strict: true }));
    }
  };

  // Image Upload Handler
  const handleUploadImage = async (file: File) => {
    try {
      setUploadingImg(true);
      const url = await uploadImage(file);
      setImageUrl(url);
      toast.success("Service image uploaded successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to upload image");
    } finally {
      setUploadingImg(false);
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
    if (!newSpecText.trim()) return;
    setSpecs([...specs, newSpecText.trim()]);
    setNewSpecText("");
  };

  const removeSpec = (idx: number) => {
    setSpecs(specs.filter((_, i) => i !== idx));
  };

  // Save / Publish
  const handleSave = async (overrideStatus?: "published" | "draft") => {
    if (!title.trim()) {
      toast.error("Please enter a service title");
      return;
    }
    const finalSlug = slug.trim() || slugify(title, { lower: true, strict: true });
    const targetStatus = overrideStatus || status;

    const payload = {
      title: title.trim(),
      slug: finalSlug,
      tag: tag.trim() || "Lighting",
      icon_name: iconName,
      short_desc: shortDesc.trim(),
      detailed_desc: detailedDesc.trim(),
      image_url: imageUrl.trim() || "/assets/Smart Lighting.png",
      features: features.filter((f) => f.trim().length > 0),
      specs: specs.filter((s) => s.trim().length > 0),
      is_featured: isFeatured,
      status: targetStatus,
      sort_order: Number(sortOrder) || 1,
      updated_at: new Date().toISOString(),
    };

    setSaving(true);
    try {
      if (isNew) {
        const { error } = await supabase.from("services").insert([payload]);
        if (error) throw error;
        toast.success("Service created successfully!");
      } else {
        const { error } = await supabase.from("services").update(payload).eq("id", id!);
        if (error) throw error;
        toast.success("Service updated successfully!");
      }

      await qc.invalidateQueries({ queryKey: ["admin-services"] });
      await qc.invalidateQueries({ queryKey: ["published-services-catalog"] });
      await qc.invalidateQueries({ queryKey: ["dashboard-all-stats"] });
      navigate({ to: "/admin/services" });
    } catch (err: any) {
      toast.error(err.message || "Failed to save service");
    } finally {
      setSaving(false);
    }
  };

  // Delete service
  const handleDelete = async () => {
    if (!id || isNew) return;
    try {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
      toast.success("Service deleted successfully");
      await qc.invalidateQueries({ queryKey: ["admin-services"] });
      await qc.invalidateQueries({ queryKey: ["published-services-catalog"] });
      navigate({ to: "/admin/services" });
    } catch (err: any) {
      toast.error(err.message || "Failed to delete service");
    }
  };

  const filteredIcons = AVAILABLE_ICONS.filter(
    (i) =>
      (i.name || "").toLowerCase().includes((iconSearch || "").toLowerCase()) ||
      (i.label || "").toLowerCase().includes((iconSearch || "").toLowerCase())
  );

  if (!isNew && isLoading) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-muted-foreground">Loading service details...</p>
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
              onClick={() => navigate({ to: "/admin/services" })}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-full"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Services
            </Button>
            <div className="hidden h-4 w-px bg-border sm:block" />
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs">
                {isNew ? "New Service" : title || "Edit Service"}
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
                  href={`http://192.168.18.57:8000/services#${slug}`}
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
              {isNew ? "Create Service" : "Save Changes"}
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
                  <Sparkles className="h-4 w-4 text-primary" /> Service Identity & Overview
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Service Title *</Label>
                  <Input
                    placeholder="e.g. Smart Lighting, HVAC & Climate Automation, Dedicated Home Cinema"
                    value={title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    className="text-base font-semibold rounded-xl bg-background/70 border-border/70"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">URL Slug</Label>
                    <Input
                      placeholder="smart-lighting"
                      value={slug}
                      onChange={(e) => {
                        setSlug(e.target.value);
                        setSlugTouched(true);
                      }}
                      className="rounded-xl bg-background/70 border-border/70 font-mono text-xs"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Category Tag</Label>
                    <Select value={tag} onValueChange={setTag}>
                      <SelectTrigger className="rounded-xl bg-background/70 border-border/70 text-xs">
                        <SelectValue placeholder="Select Tag" />
                      </SelectTrigger>
                      <SelectContent>
                        {SERVICE_TAGS.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Short Summary / Tagline (shown on card)</Label>
                  <Input
                    placeholder="e.g. Circadian scenes, zero wall acne."
                    value={shortDesc}
                    onChange={(e) => setShortDesc(e.target.value)}
                    className="rounded-xl bg-background/70 border-border/70 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Detailed Scope & Engineering Narrative</Label>
                  <Textarea
                    placeholder="In-depth explanation displayed inside the interactive service modal on the website..."
                    value={detailedDesc}
                    onChange={(e) => setDetailedDesc(e.target.value)}
                    rows={4}
                    className="rounded-xl bg-background/70 border-border/70 text-xs leading-relaxed"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Icon Picker */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Service Icon Selector
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    Selected: {iconName}
                  </Badge>
                </div>

                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search icons (e.g. lighting, climate, video, wifi)..."
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                    className="h-8 pl-8 text-xs rounded-xl bg-background/70 border-border/70"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                  {filteredIcons.map((item) => {
                    const IconComp = item.icon;
                    const isSelected = iconName === item.name;
                    return (
                      <button
                        key={item.name}
                        type="button"
                        onClick={() => setIconName(item.name)}
                        className={`flex items-center gap-2 rounded-xl border p-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm ring-1 ring-primary"
                            : "border-border/60 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <IconComp className="h-4 w-4 shrink-0" />
                        <span className="truncate text-xs font-medium">{item.name}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Features List */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Sparkles className="h-4 w-4 text-primary" /> Deliverables & Core Capabilities
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {features.length} items
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
                    placeholder="Add deliverable (e.g. Circadian rhythm scheduling)..."
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

            {/* Specifications */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                    <Layers className="h-4 w-4 text-primary" /> Technical Standards & Protocols
                  </div>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {specs.length} items
                  </Badge>
                </div>

                <div className="space-y-2">
                  {specs.map((sp, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Input
                        placeholder="Spec / Protocol (e.g. KNX / DALI-2 / Zigbee 3.0)"
                        value={sp}
                        onChange={(e) => {
                          const next = [...specs];
                          next[idx] = e.target.value;
                          setSpecs(next);
                        }}
                        className="h-8 text-xs font-medium rounded-lg bg-background/70 border-border/70 flex-1"
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

                <div className="flex gap-2">
                  <Input
                    placeholder="Add specification (e.g. KNX / DALI-2 / Zigbee 3.0)..."
                    value={newSpecText}
                    onChange={(e) => setNewSpecText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSpec();
                      }
                    }}
                    className="text-xs rounded-xl bg-background/70 border-border/70"
                  />
                  <Button
                    type="button"
                    onClick={addSpec}
                    size="sm"
                    className="gap-1 rounded-xl text-xs font-semibold shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Featured Image */}
            <Card className="rounded-2xl border-border/70 bg-card/70 backdrop-blur-sm shadow-sm">
              <CardContent className="p-5 sm:p-6 space-y-4">
                <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                  <ImageIcon className="h-4 w-4 text-primary" /> Service Visual Backdrop
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span>Feature Image</span>
                    {uploadingImg && <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />}
                  </div>

                  {imageUrl ? (
                    <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/70 bg-black">
                      <img
                        src={getDisplayImage(imageUrl)}
                        alt="Service feature"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/assets/Smart Lighting.png"; }}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => setImageUrl("")}
                        className="absolute right-3 top-3 rounded-full bg-black/70 p-1.5 text-white hover:bg-black"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <label className="flex aspect-[16/8] w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border/80 bg-muted/20 hover:border-primary/60 transition-colors">
                      <Upload className="h-8 w-8 text-muted-foreground" />
                      <span className="mt-2 text-xs font-medium text-muted-foreground">
                        Upload high-resolution service photograph
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadImage(f);
                        }}
                      />
                    </label>
                  )}

                  <Input
                    placeholder="Or paste image URL / asset path (e.g. /assets/Smart Lighting.png)"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
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

                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-3">
                  <div>
                    <div className="flex items-center gap-1 text-xs font-semibold">
                      <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" /> Feature Highlight
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      Highlight this service on website
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
                    Publish Service
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
                    href={`http://192.168.18.57:8000/services#${slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between rounded-xl border border-border/60 bg-background/60 p-2.5 text-xs text-primary hover:underline"
                  >
                    <span className="truncate font-mono text-[11px]">/services#{slug}</span>
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
                    Permanently delete this service from the database.
                  </p>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="w-full rounded-xl text-xs font-bold"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete Service
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
            <AlertDialogTitle>Are you sure you want to delete this service?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed">
              This action cannot be undone. <strong>{title}</strong> will be permanently removed from the Supabase database.
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
