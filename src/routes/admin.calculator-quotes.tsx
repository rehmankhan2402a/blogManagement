import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Calculator,
  Search,
  Phone,
  Mail,
  MapPin,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  FileText,
  User,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/calculator-quotes")({
  component: CalculatorQuotesPage,
});

interface QuoteRow {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string;
  city: string | null;
  notes: string | null;
  site_type: string;
  area_range: string;
  site_stage: string;
  room_counts: Record<string, number>;
  other_spaces: Array<{
    id: string;
    label: string;
    count: number;
    basePrice: number;
    packageType: string;
  }>;
  estimated_total: number;
  status: "new" | "contacted" | "survey_scheduled" | "converted" | "archived";
  admin_notes: string | null;
}

const STATUS_CONFIG: Record<
  QuoteRow["status"],
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; bg: string; text: string }
> = {
  new: { label: "New Lead", variant: "default", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-500" },
  contacted: { label: "Contacted", variant: "secondary", bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400" },
  survey_scheduled: { label: "Survey Scheduled", variant: "secondary", bg: "bg-purple-500/10 border-purple-500/30", text: "text-purple-400" },
  converted: { label: "Converted / Closed", variant: "default", bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400" },
  archived: { label: "Archived", variant: "outline", bg: "bg-muted/40 border-muted", text: "text-muted-foreground" },
};

function CalculatorQuotesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [siteTypeFilter, setSiteTypeFilter] = useState<string>("all");
  const [selectedQuote, setSelectedQuote] = useState<QuoteRow | null>(null);
  const [adminNotesText, setAdminNotesText] = useState("");

  // Fetch Quotes
  const { data: quotes = [], isLoading, refetch } = useQuery<QuoteRow[]>({
    queryKey: ["calculator-quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("calculator_quotes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching calculator_quotes:", error.message);
        return [];
      }
      return (data || []) as QuoteRow[];
    },
  });

  // Update Quote Mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, admin_notes }: { id: string; status?: QuoteRow["status"]; admin_notes?: string }) => {
      const updates: Partial<QuoteRow> = {};
      if (status !== undefined) updates.status = status;
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;

      const { error } = await supabase
        .from("calculator_quotes")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-quotes"] });
      toast.success("Quote updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update quote");
    },
  });

  // Delete Quote Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("calculator_quotes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calculator-quotes"] });
      toast.success("Quote deleted");
      setSelectedQuote(null);
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete quote");
    },
  });

  // Filtered quotes
  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchesSearch =
        !search ||
        q.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        q.email?.toLowerCase().includes(search.toLowerCase()) ||
        q.phone?.includes(search) ||
        q.city?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || q.status === statusFilter;
      const matchesType = siteTypeFilter === "all" || q.site_type === siteTypeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [quotes, search, statusFilter, siteTypeFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = quotes.length;
    const newCount = quotes.filter((q) => q.status === "new").length;
    const totalVal = quotes.reduce((acc, q) => acc + (Number(q.estimated_total) || 0), 0);
    const convertedCount = quotes.filter((q) => q.status === "converted").length;

    return { total, newCount, totalVal, convertedCount };
  }, [quotes]);

  const handleOpenModal = (quote: QuoteRow) => {
    setSelectedQuote(quote);
    setAdminNotesText(quote.admin_notes || "");
  };

  const handleSaveNotes = () => {
    if (!selectedQuote) return;
    updateStatusMutation.mutate({
      id: selectedQuote.id,
      admin_notes: adminNotesText,
    });
    setSelectedQuote({ ...selectedQuote, admin_notes: adminNotesText });
  };

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* ── HEADER ── */}
      <PageHeader
        title="Calculator Inquiries & Quotes"
        description="Incoming cost estimation leads from the customer smart home floor plan calculator."
        actions={
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2 shrink-0">
            <RefreshCw className="size-4" />
            Refresh Leads
          </Button>
        }
      />

      <div className="p-6 md:p-8 lg:p-10 space-y-6 max-w-7xl mx-auto">
        {/* ── METRICS SUMMARY CARDS ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Total Quotes</CardDescription>
              <CardTitle className="text-2xl font-bold">{stats.total}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground flex items-center gap-1">
              <Calculator className="size-3 text-primary" /> Lifetime calculator submissions
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">New Actionable Leads</CardDescription>
              <CardTitle className="text-2xl font-bold text-amber-500">{stats.newCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="size-3 text-amber-500" /> Pending initial follow-up
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Total Pipeline Value</CardDescription>
              <CardTitle className="text-xl font-bold text-primary truncate">
                PKR {(stats.totalVal / 1000000).toFixed(2)}M
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
              Cumulative estimated automation value
            </CardContent>
          </Card>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader className="p-4 pb-2">
              <CardDescription className="text-xs">Converted Clients</CardDescription>
              <CardTitle className="text-2xl font-bold text-emerald-500">{stats.convertedCount}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="size-3 text-emerald-500" /> Successful projects won
            </CardContent>
          </Card>
        </div>

        {/* ── FILTERS & SEARCH ── */}
        <Card className="border-border/60 bg-card/40">
          <CardContent className="p-4 flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by client name, email, phone, city..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-background/80"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px] bg-background/80">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="new">New Leads</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="survey_scheduled">Survey Scheduled</SelectItem>
                  <SelectItem value="converted">Converted</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>

              <Select value={siteTypeFilter} onValueChange={setSiteTypeFilter}>
                <SelectTrigger className="w-[150px] bg-background/80">
                  <SelectValue placeholder="Property Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Residential">Residential</SelectItem>
                  <SelectItem value="Commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ── QUOTES LIST ── */}
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            Loading calculator inquiries...
          </div>
        ) : filteredQuotes.length === 0 ? (
          <Card className="p-12 text-center border-dashed">
            <Calculator className="mx-auto size-10 text-muted-foreground/50 mb-3" />
            <h3 className="font-semibold text-foreground text-base">No calculator quotes found</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              {quotes.length === 0
                ? "Estimates submitted by visitors on the /calculator page will automatically appear here in real-time."
                : "No inquiries matched your search or status filter."}
            </p>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredQuotes.map((quote) => {
              const statusCfg = STATUS_CONFIG[quote.status] || STATUS_CONFIG.new;
              const cleanPhone = quote.phone.replace(/[^0-9+]/g, "");
              const waPhone = cleanPhone.startsWith("0") ? "92" + cleanPhone.slice(1) : cleanPhone.replace("+", "");

              return (
                <Card
                  key={quote.id}
                  className="border-border/60 bg-card hover:border-primary/40 transition-all shadow-sm overflow-hidden"
                >
                  <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                    {/* Left: Client & Site Info */}
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                          <User className="size-4 text-primary" />
                          {quote.full_name}
                        </h3>

                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusCfg.bg} ${statusCfg.text}`}
                        >
                          {statusCfg.label}
                        </span>

                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="size-3" />
                          {quote.created_at ? format(new Date(quote.created_at), "dd MMM yyyy, hh:mm a") : "Recent"}
                        </span>
                      </div>

                      {/* Contact details */}
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <a
                          href={`https://wa.me/${waPhone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-emerald-400 hover:underline font-medium"
                        >
                          <Phone className="size-3" />
                          {quote.phone} (WhatsApp)
                        </a>
                        <a
                          href={`mailto:${quote.email}`}
                          className="inline-flex items-center gap-1 hover:text-foreground transition-colors"
                        >
                          <Mail className="size-3" />
                          {quote.email}
                        </a>
                        {quote.city && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="size-3 text-muted-foreground" />
                            {quote.city}
                          </span>
                        )}
                      </div>

                      {/* Property Specs Pill */}
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                        <span className="bg-surface/80 border border-white/10 px-2 py-0.5 rounded text-foreground font-medium">
                          {quote.site_type}
                        </span>
                        <span className="bg-surface/80 border border-white/10 px-2 py-0.5 rounded text-muted-foreground">
                          {quote.area_range}
                        </span>
                        <span className="bg-surface/80 border border-white/10 px-2 py-0.5 rounded text-muted-foreground">
                          {quote.site_stage}
                        </span>

                        {/* Rooms summary */}
                        {quote.room_counts && (
                          <span className="text-muted-foreground text-[11px]">
                            {quote.room_counts.bedrooms ?? 0} Bed • {quote.room_counts.baths ?? 0} Bath • {quote.room_counts.kitchen ?? 0} Kitchen • {quote.room_counts.lounge ?? 0} Lounge
                          </span>
                        )}
                      </div>

                      {/* Extra Spaces badges */}
                      {Array.isArray(quote.other_spaces) && quote.other_spaces.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {quote.other_spaces.map((sp, idx) => (
                            <span
                              key={idx}
                              className="bg-primary/10 border border-primary/20 text-primary text-[10px] px-1.5 py-0.5 rounded font-medium"
                            >
                              + {sp.label} ({sp.count})
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Total Value, Status Changer & Action Modal Button */}
                    <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-3 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-border/40">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground lg:text-right">
                          Calculated Estimate
                        </div>
                        <div className="text-xl font-extrabold text-primary">
                          PKR {Number(quote.estimated_total).toLocaleString("en-PK")}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Status Dropdown */}
                        <Select
                          value={quote.status}
                          onValueChange={(val: QuoteRow["status"]) =>
                            updateStatusMutation.mutate({ id: quote.id, status: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs w-[140px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">New Lead</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="survey_scheduled">Survey Scheduled</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="archived">Archived</SelectItem>
                          </SelectContent>
                        </Select>

                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleOpenModal(quote)}
                          className="h-8 text-xs font-semibold gap-1.5"
                        >
                          <FileText className="size-3.5" />
                          Details
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* ── QUOTE DETAIL MODAL ── */}
      {selectedQuote && (
        <Dialog open={!!selectedQuote} onOpenChange={(open) => !open && setSelectedQuote(null)}>
          <DialogContent className="max-w-2xl bg-card border-border/80">
            <DialogHeader>
              <div className="flex items-center justify-between pr-4">
                <div>
                  <DialogTitle className="text-xl font-bold flex items-center gap-2">
                    <User className="size-5 text-primary" />
                    {selectedQuote.full_name}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Submitted {format(new Date(selectedQuote.created_at), "PPP p")}
                  </DialogDescription>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Estimated Total</div>
                  <div className="text-xl font-extrabold text-primary">
                    PKR {Number(selectedQuote.estimated_total).toLocaleString("en-PK")}
                  </div>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 py-2">
              {/* Contact Card */}
              <div className="rounded-lg border border-border/60 bg-surface/50 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Client Details</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Phone / WhatsApp:</span>
                    <a
                      href={`https://wa.me/${selectedQuote.phone.replace(/[^0-9]/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-emerald-400 hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <Phone className="size-3" />
                      {selectedQuote.phone}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Email Address:</span>
                    <a
                      href={`mailto:${selectedQuote.email}`}
                      className="font-medium text-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                    >
                      <Mail className="size-3" />
                      {selectedQuote.email}
                    </a>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">City:</span>
                    <span className="font-medium text-foreground">{selectedQuote.city || "Not specified"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Current Status:</span>
                    <span className="font-semibold text-primary capitalize">{selectedQuote.status.replace("_", " ")}</span>
                  </div>
                </div>
              </div>

              {/* Floor Plan Breakdown */}
              <div className="rounded-lg border border-border/60 bg-surface/50 p-4 space-y-3">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Floor Plan &amp; Property Specs</div>
                <div className="grid grid-cols-3 gap-2 text-xs border-b border-border/40 pb-3">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Type of Site:</span>
                    <span className="font-bold text-foreground">{selectedQuote.site_type}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Area:</span>
                    <span className="font-bold text-foreground">{selectedQuote.area_range}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Stage:</span>
                    <span className="font-bold text-foreground">{selectedQuote.site_stage}</span>
                  </div>
                </div>

                {/* Rooms Count */}
                {selectedQuote.room_counts && (
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Standard Rooms:</span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                      <div className="bg-background/80 p-2 rounded border border-white/5 text-center">
                        <span className="text-muted-foreground text-[10px] block">Bedrooms</span>
                        <span className="font-bold text-sm text-foreground">{selectedQuote.room_counts.bedrooms ?? 0}</span>
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-white/5 text-center">
                        <span className="text-muted-foreground text-[10px] block">Baths</span>
                        <span className="font-bold text-sm text-foreground">{selectedQuote.room_counts.baths ?? 0}</span>
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-white/5 text-center">
                        <span className="text-muted-foreground text-[10px] block">Kitchen</span>
                        <span className="font-bold text-sm text-foreground">{selectedQuote.room_counts.kitchen ?? 0}</span>
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-white/5 text-center">
                        <span className="text-muted-foreground text-[10px] block">Lounge</span>
                        <span className="font-bold text-sm text-foreground">{selectedQuote.room_counts.lounge ?? 0}</span>
                      </div>
                      <div className="bg-background/80 p-2 rounded border border-white/5 text-center">
                        <span className="text-muted-foreground text-[10px] block">Passages</span>
                        <span className="font-bold text-sm text-foreground">{selectedQuote.room_counts.passage ?? 0}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Specialized Spaces */}
                {Array.isArray(selectedQuote.other_spaces) && selectedQuote.other_spaces.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-muted-foreground block mb-1">Specialized Spaces Added:</span>
                    <div className="space-y-1.5">
                      {selectedQuote.other_spaces.map((sp, i) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-background/80 p-2 rounded border border-white/5">
                          <span className="font-medium text-foreground">
                            {sp.label} <span className="text-primary font-bold">(Qty: {sp.count})</span>
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {sp.packageType}
                          </span>
                          <span className="font-bold text-primary">
                            + PKR {(sp.basePrice * sp.count).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Client Notes */}
              {selectedQuote.notes && (
                <div className="rounded-lg border border-border/60 bg-surface/50 p-4">
                  <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1">Client Notes / Preferences</div>
                  <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">{selectedQuote.notes}</p>
                </div>
              )}

              {/* Admin Internal Notes */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-primary">Internal Admin Notes &amp; Follow-up Log</div>
                <Textarea
                  rows={3}
                  placeholder="Add survey dates, quotation revisions, customer preferences, or follow-up logs..."
                  value={adminNotesText}
                  onChange={(e) => setAdminNotesText(e.target.value)}
                  className="bg-background text-xs"
                />
                <div className="flex justify-end">
                  <Button size="sm" onClick={handleSaveNotes} className="text-xs h-7">
                    Save Notes
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter className="flex flex-row items-center justify-between sm:justify-between w-full border-t border-border/40 pt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Are you sure you want to delete this quote inquiry?")) {
                    deleteMutation.mutate(selectedQuote.id);
                  }
                }}
                className="gap-1.5 text-xs"
              >
                <Trash2 className="size-3.5" /> Delete
              </Button>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedQuote(null)} className="text-xs">
                  Close
                </Button>
                <a
                  href={`https://wa.me/${selectedQuote.phone.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 px-3 rounded-md transition-colors"
                >
                  <Phone className="size-3.5" />
                  Contact on WhatsApp
                </a>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
