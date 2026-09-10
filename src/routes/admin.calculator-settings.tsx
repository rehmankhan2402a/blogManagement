import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sliders,
  Save,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Layers,
  Building2,
  Home,
} from "lucide-react";
import { PageHeader } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/calculator-settings")({
  component: CalculatorSettingsPage,
});

interface SpaceRow {
  id: string;
  label: string;
  base_price: number;
  is_default_selected: boolean;
  default_package: string;
  sort_order: number;
  is_active: boolean;
}

interface SettingsRow {
  id: string;
  core_rooms: {
    bedroom: number;
    bath: number;
    kitchen: number;
    lounge: number;
    passage: number;
  };
  area_base_prices: Record<string, number>;
  stage_multipliers: Record<string, number>;
  commercial_multiplier: number;
}

const DEFAULT_SETTINGS: SettingsRow = {
  id: "default",
  core_rooms: {
    bedroom: 45000,
    bath: 25000,
    kitchen: 35000,
    lounge: 55000,
    passage: 20000,
  },
  area_base_prices: {
    "1,000 – 2,000 sq ft": 120000,
    "2,001 – 3,000 sq ft": 210000,
    "3,001 – 5,000 sq ft": 340000,
    "5,001+ sq ft": 520000,
  },
  stage_multipliers: {
    "Under Construction": 1.0,
    "Renovation": 1.1,
    "Constructed": 1.18,
  },
  commercial_multiplier: 1.25,
};

function CalculatorSettingsPage() {
  const queryClient = useQueryClient();

  // Local Settings Form State
  const [settings, setSettings] = useState<SettingsRow>(DEFAULT_SETTINGS);

  // Spaces Dialog State
  const [spaceModalOpen, setSpaceModalOpen] = useState(false);
  const [editingSpace, setEditingSpace] = useState<SpaceRow | null>(null);
  const [spaceFormData, setSpaceFormData] = useState<SpaceRow>({
    id: "",
    label: "",
    base_price: 35000,
    is_default_selected: false,
    default_package: "Complete Scene Automation",
    sort_order: 10,
    is_active: true,
  });

  // 1. Fetch Settings
  const { data: dbSettings, isLoading: settingsLoading } = useQuery<SettingsRow>({
    queryKey: ["calculator-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculator_settings")
        .select("*")
        .eq("id", "default")
        .maybeSingle();

      if (error || !data) return DEFAULT_SETTINGS;
      return data as SettingsRow;
    },
  });

  // 2. Fetch Spaces
  const { data: spaces = [], isLoading: spacesLoading } = useQuery<SpaceRow[]>({
    queryKey: ["calculator-spaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculator_spaces")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) {
        console.warn("Error fetching spaces:", error.message);
        return [];
      }
      return (data || []) as SpaceRow[];
    },
  });

  // Sync DB settings to local state when loaded
  useEffect(() => {
    if (dbSettings) {
      setSettings(dbSettings);
    }
  }, [dbSettings]);

  // Save Settings Mutation
  const saveSettingsMutation = useMutation({
    mutationFn: async (updated: SettingsRow) => {
      const { error } = await supabase
        .from("calculator_settings")
        .upsert({
          id: "default",
          core_rooms: updated.core_rooms,
          area_base_prices: updated.area_base_prices,
          stage_multipliers: updated.stage_multipliers,
          commercial_multiplier: updated.commercial_multiplier,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-settings"] });
      toast.success("Calculator pricing settings saved successfully!");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save settings");
    },
  });

  // Save/Update Space Mutation
  const saveSpaceMutation = useMutation({
    mutationFn: async (space: SpaceRow) => {
      const { error } = await supabase.from("calculator_spaces").upsert({
        id: space.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, ""),
        label: space.label.trim(),
        base_price: Number(space.base_price),
        is_default_selected: space.is_default_selected,
        default_package: space.default_package.trim(),
        sort_order: Number(space.sort_order),
        is_active: space.is_active,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-spaces"] });
      toast.success("Space saved successfully!");
      setSpaceModalOpen(false);
      setEditingSpace(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save space");
    },
  });

  // Toggle Space Active Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("calculator_spaces")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-spaces"] });
      toast.success("Space status updated");
    },
  });

  // Delete Space Mutation
  const deleteSpaceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("calculator_spaces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-spaces"] });
      toast.success("Space deleted");
    },
  });

  const handleOpenAddSpace = () => {
    setEditingSpace(null);
    setSpaceFormData({
      id: "space_" + Date.now().toString().slice(-4),
      label: "",
      base_price: 40000,
      is_default_selected: false,
      default_package: "Complete Scene Automation",
      sort_order: spaces.length + 1,
      is_active: true,
    });
    setSpaceModalOpen(true);
  };

  const handleOpenEditSpace = (space: SpaceRow) => {
    setEditingSpace(space);
    setSpaceFormData({ ...space });
    setSpaceModalOpen(true);
  };

  const handleSaveSpaceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!spaceFormData.label) {
      toast.error("Please provide a space label");
      return;
    }
    saveSpaceMutation.mutate(spaceFormData);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* ── HEADER ── */}
      <PageHeader
        title="Calculator Rates & Space Studio"
        description="Configure dynamic room costs, baseline infrastructure rates, and specialized automation spaces."
        actions={
          <Button
            onClick={() => saveSettingsMutation.mutate(settings)}
            disabled={saveSettingsMutation.isPending}
            className="gap-2 shrink-0 font-bold"
          >
            <Save className="size-4" />
            {saveSettingsMutation.isPending ? "Saving Rates..." : "Save Pricing Rates"}
          </Button>
        }
      />

      <div className="p-6 md:p-8 lg:p-10 space-y-8 max-w-7xl mx-auto">
        {/* ── SECTION 1: CORE ROOM BASE PRICES ── */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Home className="size-5 text-primary" />
                  Standard Room Unit Prices (PKR)
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  The baseline cost charged per standard room counter selected by the customer.
                </CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">
                Per Unit Rate
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* Bedroom */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-surface/40">
                <label className="text-xs font-semibold text-foreground">Bedrooms (PKR)</label>
                <Input
                  type="number"
                  value={settings.core_rooms?.bedroom ?? 45000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      core_rooms: { ...settings.core_rooms, bedroom: Number(e.target.value) },
                    })
                  }
                  className="bg-background text-sm font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">Touch switches &amp; dimming</span>
              </div>

              {/* Bath */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-surface/40">
                <label className="text-xs font-semibold text-foreground">Bath / Wardrobe</label>
                <Input
                  type="number"
                  value={settings.core_rooms?.bath ?? 25000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      core_rooms: { ...settings.core_rooms, bath: Number(e.target.value) },
                    })
                  }
                  className="bg-background text-sm font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">Sensors &amp; backlight</span>
              </div>

              {/* Kitchen */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-surface/40">
                <label className="text-xs font-semibold text-foreground">Kitchen</label>
                <Input
                  type="number"
                  value={settings.core_rooms?.kitchen ?? 35000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      core_rooms: { ...settings.core_rooms, kitchen: Number(e.target.value) },
                    })
                  }
                  className="bg-background text-sm font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">Under-cabinet &amp; gas sensor</span>
              </div>

              {/* Lounge */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-surface/40">
                <label className="text-xs font-semibold text-foreground">Lounge / Living</label>
                <Input
                  type="number"
                  value={settings.core_rooms?.lounge ?? 55000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      core_rooms: { ...settings.core_rooms, lounge: Number(e.target.value) },
                    })
                  }
                  className="bg-background text-sm font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">Curtains &amp; multi-zone AC</span>
              </div>

              {/* Passage */}
              <div className="space-y-1.5 p-3 rounded-lg border border-border/40 bg-surface/40">
                <label className="text-xs font-semibold text-foreground">Passages</label>
                <Input
                  type="number"
                  value={settings.core_rooms?.passage ?? 20000}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      core_rooms: { ...settings.core_rooms, passage: Number(e.target.value) },
                    })
                  }
                  className="bg-background text-sm font-semibold"
                />
                <span className="text-[10px] text-muted-foreground block">Path illumination zones</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── SECTION 2: AREA BASELINE & MULTIPLIERS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Area Infrastructure Base Costs (7 cols) */}
          <Card className="lg:col-span-7 border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Layers className="size-5 text-primary" />
                Area Infrastructure Base Prices (PKR)
              </CardTitle>
              <CardDescription className="text-xs">
                Includes core smart gateways, distribution hub, and baseline cabling network.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                "1,000 – 2,000 sq ft",
                "2,001 – 3,000 sq ft",
                "3,001 – 5,000 sq ft",
                "5,001+ sq ft",
              ].map((range) => (
                <div
                  key={range}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-surface/30 gap-4"
                >
                  <span className="text-xs font-semibold text-foreground">{range}</span>
                  <div className="w-44">
                    <Input
                      type="number"
                      value={settings.area_base_prices?.[range] ?? 120000}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          area_base_prices: {
                            ...settings.area_base_prices,
                            [range]: Number(e.target.value),
                          },
                        })
                      }
                      className="bg-background text-xs font-semibold text-right"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Multipliers (5 cols) */}
          <Card className="lg:col-span-5 border-border/60 bg-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Building2 className="size-5 text-primary" />
                Site &amp; Construction Multipliers
              </CardTitle>
              <CardDescription className="text-xs">
                Modifiers for commercial load &amp; construction stage retrofits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Commercial Multiplier */}
              <div className="p-3 rounded-lg border border-border/40 bg-surface/30 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-foreground">Commercial Load Multiplier</span>
                  <span className="text-[11px] text-primary font-bold">{settings.commercial_multiplier}x</span>
                </div>
                <Input
                  type="number"
                  step="0.05"
                  value={settings.commercial_multiplier ?? 1.25}
                  onChange={(e) =>
                    setSettings({ ...settings, commercial_multiplier: Number(e.target.value) })
                  }
                  className="bg-background text-xs"
                />
              </div>

              {/* Stage Multipliers */}
              {["Under Construction", "Renovation", "Constructed"].map((stage) => (
                <div
                  key={stage}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-surface/30 text-xs"
                >
                  <span className="font-medium text-foreground">{stage}</span>
                  <div className="w-24">
                    <Input
                      type="number"
                      step="0.01"
                      value={settings.stage_multipliers?.[stage] ?? 1.0}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          stage_multipliers: {
                            ...settings.stage_multipliers,
                            [stage]: Number(e.target.value),
                          },
                        })
                      }
                      className="bg-background text-xs text-right font-bold text-primary"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── SECTION 3: SPECIALIZED SPACES MANAGEMENT ── */}
        <Card className="border-border/60 bg-card">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Specialized Extra Spaces Management
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Add, customize, or disable extra luxury areas available for selection on the calculator page.
                </CardDescription>
              </div>
              <Button onClick={handleOpenAddSpace} size="sm" className="gap-1.5 text-xs font-semibold">
                <Plus className="size-4" />
                Add New Space
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            {spacesLoading ? (
              <div className="p-8 text-center text-xs text-muted-foreground">Loading spaces...</div>
            ) : spaces.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground border border-dashed rounded-lg">
                No specialized spaces configured yet. Click "Add New Space" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {spaces.map((sp) => (
                  <div
                    key={sp.id}
                    className={`rounded-xl border p-4 transition-all flex flex-col justify-between gap-3 ${sp.is_active
                      ? "border-border/80 bg-surface/50"
                      : "border-border/30 bg-muted/20 opacity-60"
                      }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                            {sp.label}
                            {sp.is_default_selected && (
                              <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                                Default Checked
                              </Badge>
                            )}
                          </h4>
                          <div className="text-[11px] text-muted-foreground mt-0.5">ID: {sp.id}</div>
                        </div>

                        <Switch
                          checked={sp.is_active}
                          onCheckedChange={(val) =>
                            toggleActiveMutation.mutate({ id: sp.id, is_active: val })
                          }
                        />
                      </div>

                      <div className="mt-3 p-2.5 rounded-lg bg-background/80 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Unit Price:</span>
                          <span className="font-bold text-primary">PKR {Number(sp.base_price).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Package:</span>
                          <span className="font-medium text-foreground text-[11px] truncate max-w-[160px]">
                            {sp.default_package}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5">
                      <span className="text-[10px] text-muted-foreground">Sort Order: {sp.sort_order}</span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEditSpace(sp)}
                          className="size-7 text-muted-foreground hover:text-foreground"
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${sp.label}"?`)) {
                              deleteSpaceMutation.mutate(sp.id);
                            }
                          }}
                          className="size-7 text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── SPACE ADD/EDIT MODAL ── */}
      {spaceModalOpen && (
        <Dialog open={spaceModalOpen} onOpenChange={setSpaceModalOpen}>
          <DialogContent className="max-w-md bg-card border-border/80">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                {editingSpace ? "Edit Space Configuration" : "Add New Specialized Space"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Set the label, unit price in PKR, and default package description.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveSpaceSubmit} className="space-y-4 py-2">
              <div>
                <label className="text-xs font-semibold text-foreground">Space Identifier (Key)</label>
                <Input
                  required
                  disabled={!!editingSpace}
                  placeholder="e.g. cinema, pool, rooftop"
                  value={spaceFormData.id}
                  onChange={(e) => setSpaceFormData({ ...spaceFormData, id: e.target.value })}
                  className="mt-1 bg-background text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Display Name / Label</label>
                <Input
                  required
                  placeholder="e.g. Cinema / Home Theatre"
                  value={spaceFormData.label}
                  onChange={(e) => setSpaceFormData({ ...spaceFormData, label: e.target.value })}
                  className="mt-1 bg-background text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground">Base Price (PKR)</label>
                  <Input
                    type="number"
                    required
                    value={spaceFormData.base_price}
                    onChange={(e) =>
                      setSpaceFormData({ ...spaceFormData, base_price: Number(e.target.value) })
                    }
                    className="mt-1 bg-background text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground">Sort Order</label>
                  <Input
                    type="number"
                    value={spaceFormData.sort_order}
                    onChange={(e) =>
                      setSpaceFormData({ ...spaceFormData, sort_order: Number(e.target.value) })
                    }
                    className="mt-1 bg-background text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-foreground">Default Package Description</label>
                <Input
                  required
                  placeholder="e.g. Acoustic & Cinema Scene Automation"
                  value={spaceFormData.default_package}
                  onChange={(e) =>
                    setSpaceFormData({ ...spaceFormData, default_package: e.target.value })
                  }
                  className="mt-1 bg-background text-xs"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-surface/40">
                <div className="text-xs">
                  <span className="font-semibold block text-foreground">Pre-checked by default</span>
                  <span className="text-[11px] text-muted-foreground">Select this space automatically on first load</span>
                </div>
                <Switch
                  checked={spaceFormData.is_default_selected}
                  onCheckedChange={(val) =>
                    setSpaceFormData({ ...spaceFormData, is_default_selected: val })
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-surface/40">
                <div className="text-xs">
                  <span className="font-semibold block text-foreground">Active in Calculator</span>
                  <span className="text-[11px] text-muted-foreground">Show this option to website visitors</span>
                </div>
                <Switch
                  checked={spaceFormData.is_active}
                  onCheckedChange={(val) =>
                    setSpaceFormData({ ...spaceFormData, is_active: val })
                  }
                />
              </div>

              <DialogFooter className="pt-3 border-t border-border/40">
                <Button type="button" variant="outline" size="sm" onClick={() => setSpaceModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saveSpaceMutation.isPending} className="font-bold">
                  {saveSpaceMutation.isPending ? "Saving..." : "Save Space"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
