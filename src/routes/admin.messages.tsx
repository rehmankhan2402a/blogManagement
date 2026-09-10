import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  MailOpen,
  Trash2,
  Phone,
  Briefcase,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  RefreshCw,
  Search,
  StickyNote,
  Send,
  MessageCircle,
  CheckCircle2,
  User
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/messages")({
  component: MessagesPage,
});

type ContactMessage = {
  id: string;
  created_at: string;
  full_name: string;
  email: string;
  phone: string | null;
  service: string | null;
  message: string;
  status: "unread" | "read";
  notes: string | null;
};

const STATUS_CONFIG = {
  unread: {
    label: "Unread",
    icon: Mail,
    badgeClass: "bg-[#F5A93F]/15 text-[#F5A93F] border-[#F5A93F]/30",
  },
  read: {
    label: "Read",
    icon: MailOpen,
    badgeClass: "bg-muted/60 text-muted-foreground border-border/40",
  },
} as const;

function MessagesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unread" | "read">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [noteValue, setNoteValue] = useState<Record<string, string>>({});
  const [savingNote, setSavingNote] = useState<string | null>(null);

  const { data: messages, isLoading, refetch } = useQuery<ContactMessage[]>({
    queryKey: ["contact-messages"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contact_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as ContactMessage[];
    },
  });

  const { data: unreadCount } = useQuery<number>({
    queryKey: ["contact-messages-unread"],
    enabled: typeof window !== "undefined",
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      return count ?? 0;
    },
  });

  async function markStatus(id: string, status: "unread" | "read") {
    const { error } = await supabase
      .from("contact_messages")
      .update({ status })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as " + status);
    qc.invalidateQueries({ queryKey: ["contact-messages"] });
    qc.invalidateQueries({ queryKey: ["contact-messages-unread"] });
  }

  async function handleExpand(msg: ContactMessage) {
    const isExpanding = expandedId !== msg.id;
    setExpandedId(isExpanding ? msg.id : null);
    if (isExpanding && msg.status === "unread") {
      await markStatus(msg.id, "read");
    }
    if (isExpanding) {
      setNoteValue((prev) => ({ ...prev, [msg.id]: msg.notes ?? "" }));
    }
  }

  async function saveNote(id: string) {
    setSavingNote(id);
    const { error } = await supabase
      .from("contact_messages")
      .update({ notes: noteValue[id] ?? "" })
      .eq("id", id);
    setSavingNote(null);
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    qc.invalidateQueries({ queryKey: ["contact-messages"] });
  }

  async function deleteMessage(id: string) {
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Message deleted");
    setDeleteId(null);
    if (expandedId === id) setExpandedId(null);
    qc.invalidateQueries({ queryKey: ["contact-messages"] });
    qc.invalidateQueries({ queryKey: ["contact-messages-unread"] });
  }

  const filtered = (messages ?? []).filter((msg) => {
    const matchStatus = filterStatus === "all" || msg.status === filterStatus;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      msg.full_name.toLowerCase().includes(q) ||
      msg.email.toLowerCase().includes(q) ||
      (msg.phone ?? "").toLowerCase().includes(q) ||
      (msg.service ?? "").toLowerCase().includes(q) ||
      msg.message.toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  return (
    <>
      <PageHeader
        title="Client Inquiries & Messages"
        description="Real-time contact messages and consultation requests submitted through KASEER website."
        actions={
          <Button
            variant="outline"
            size="sm"
            className="rounded-full gap-1.5"
            onClick={() => {
              refetch();
              toast.info("Refreshed messages");
            }}
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        }
      />

      <div className="space-y-6 p-6 md:p-10">
        {/* Filters and search row */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {(["all", "unread", "read"] as const).map((s) => {
              const count =
                s === "all"
                  ? (messages ?? []).length
                  : (messages ?? []).filter((m) => m.status === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    filterStatus === s
                      ? "border-primary bg-primary/20 text-primary font-semibold"
                      : "border-border/60 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  {s === "unread" && <Mail className="h-3 w-3 text-[#F5A93F]" />}
                  {s === "read" && <MailOpen className="h-3 w-3" />}
                  {s === "all" && <MessageSquare className="h-3 w-3" />}
                  {s.charAt(0).toUpperCase() + s.slice(1)}{" "}
                  <span className={cn("rounded-full px-1.5 text-[10px]", s === "unread" && count > 0 ? "bg-[#F5A93F] text-black font-bold" : "bg-muted")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="relative min-w-[260px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, message…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 rounded-xl pl-9 text-xs"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border/60 bg-card/50">
            <CardContent className="flex flex-col items-center py-16 text-center">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <div className="mt-3 text-base font-medium">No messages found</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Inquiries submitted from the website contact form will appear here.
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filtered.map((msg, i) => {
                const isOpen = expandedId === msg.id;
                const isUnread = msg.status === "unread";
                const cfg = STATUS_CONFIG[msg.status] ?? STATUS_CONFIG.read;
                const StatusIcon = cfg.icon;

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card
                      className={cn(
                        "rounded-2xl transition-all duration-200 overflow-hidden",
                        isUnread
                          ? "border-l-4 border-l-[#F5A93F] border-border/80 bg-[#0B172E]/90 hover:bg-[#0E1E3D] shadow-md shadow-primary/5"
                          : "border-border/60 bg-card hover:bg-card/80",
                        isOpen && "shadow-xl ring-1 ring-primary/20"
                      )}
                    >
                      {/* Header row */}
                      <button
                        className="flex w-full items-center gap-4 px-5 py-4 text-left"
                        onClick={() => handleExpand(msg)}
                      >
                        <div
                          className={cn(
                            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
                            isUnread
                              ? "border-[#F5A93F]/40 bg-[#F5A93F]/15 text-[#F5A93F]"
                              : "border-border/60 bg-muted/40 text-muted-foreground"
                          )}
                        >
                          <StatusIcon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {isUnread && (
                              <span className="h-2 w-2 rounded-full bg-[#F5A93F] animate-pulse" />
                            )}
                            <span className={cn("text-sm", isUnread ? "font-bold text-white" : "font-medium text-foreground")}>
                              {msg.full_name}
                            </span>
                            <Badge
                              variant="outline"
                              className={cn("rounded-full text-[10px] py-0 px-2 font-medium", cfg.badgeClass)}
                            >
                              {cfg.label}
                            </Badge>
                            {msg.service && (
                              <Badge variant="secondary" className="rounded-full text-[10px] py-0 px-2 bg-primary/10 text-primary border border-primary/20">
                                {msg.service}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                            <span>{msg.email}</span>
                            {msg.phone && <span>· {msg.phone}</span>}
                            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/80">
                              <Clock className="h-3 w-3" />
                              {format(new Date(msg.created_at), "MMM d, yyyy · h:mm a")}
                            </span>
                          </div>

                          {!isOpen && (
                            <p className="mt-1.5 truncate text-xs text-muted-foreground/90 font-light">
                              {msg.message}
                            </p>
                          )}
                        </div>

                        <div className="shrink-0 text-muted-foreground p-1 rounded-lg hover:bg-muted/40">
                          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </div>
                      </button>

                      {/* Expanded body */}
                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            key="body"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-5 border-t border-border/60 px-5 pb-5 pt-4 bg-black/20">
                              {/* Contact details grid */}
                              <div className="grid gap-3 sm:grid-cols-3">
                                <Detail
                                  icon={Mail}
                                  label="Email Address"
                                  value={msg.email}
                                  href={"mailto:" + msg.email}
                                  actionText="Send Email"
                                />
                                {msg.phone && (
                                  <Detail
                                    icon={Phone}
                                    label="Phone / WhatsApp"
                                    value={msg.phone}
                                    href={"https://wa.me/" + msg.phone.replace(/[^0-9]/g, "")}
                                    actionText="Open WhatsApp"
                                  />
                                )}
                                {msg.service && (
                                  <Detail
                                    icon={Briefcase}
                                    label="Service Interested In"
                                    value={msg.service}
                                  />
                                )}
                              </div>

                              {/* Full Message text */}
                              <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm">
                                <div className="mb-2 flex items-center justify-between text-xs font-semibold text-primary">
                                  <span className="flex items-center gap-1.5">
                                    <MessageSquare className="h-3.5 w-3.5" /> Client Enquiry Message
                                  </span>
                                  <span className="text-[11px] text-muted-foreground font-normal">
                                    Received {format(new Date(msg.created_at), "PPpp")}
                                  </span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90 font-light">
                                  {msg.message}
                                </p>
                              </div>

                              {/* Internal Notes */}
                              <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
                                <div className="mb-2 flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                                    <StickyNote className="h-3.5 w-3.5 text-primary" /> Internal Admin Notes
                                  </div>
                                  <span className="text-[10px] text-muted-foreground">Private to team</span>
                                </div>
                                <Textarea
                                  placeholder="Write notes about follow-up calls, quote sent, site visit date..."
                                  rows={2}
                                  className="rounded-xl text-xs bg-background/80"
                                  value={noteValue[msg.id] ?? ""}
                                  onChange={(e) =>
                                    setNoteValue((prev) => ({ ...prev, [msg.id]: e.target.value }))
                                  }
                                />
                                <div className="mt-2 flex justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg text-xs h-7 px-3"
                                    disabled={savingNote === msg.id}
                                    onClick={() => saveNote(msg.id)}
                                  >
                                    {savingNote === msg.id ? "Saving…" : "Save Note"}
                                  </Button>
                                </div>
                              </div>

                              {/* Actions Bar */}
                              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/40">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Status:</span>
                                  <Select
                                    value={msg.status}
                                    onValueChange={(v) =>
                                      markStatus(msg.id, v as "unread" | "read")
                                    }
                                  >
                                    <SelectTrigger className="h-8 w-32 rounded-lg text-xs bg-card">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="unread">Mark Unread</SelectItem>
                                      <SelectItem value="read">Mark Read</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 rounded-lg text-xs gap-1.5"
                                    onClick={() => window.open("mailto:" + msg.email + "?subject=KASEER Enquiry: " + (msg.service || "Smart Home Architecture"), "_blank")}
                                  >
                                    <Send className="h-3 w-3 text-primary" /> Reply via Email
                                  </Button>
                                  
                                  {msg.phone && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 rounded-lg text-xs gap-1.5 text-emerald-500 hover:text-emerald-400"
                                      onClick={() => window.open("https://wa.me/" + msg.phone?.replace(/[^0-9]/g, ""), "_blank")}
                                    >
                                      <MessageCircle className="h-3 w-3" /> WhatsApp
                                    </Button>
                                  )}

                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10"
                                    onClick={() => setDeleteId(msg.id)}
                                  >
                                    <Trash2 className="mr-1 h-3 w-3" /> Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client message?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the contact inquiry from the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={() => deleteId && deleteMessage(deleteId)}
            >
              Delete Message
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
  href,
  actionText,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  href?: string;
  actionText?: string;
}) {
  return (
    <div className="rounded-xl border border-border/80 bg-card p-3.5">
      <div className="mb-1 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          <Icon className="h-3 w-3 text-primary" />
          {label}
        </div>
        {actionText && href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-[10px] text-primary hover:underline font-medium"
          >
            {actionText} ↗
          </a>
        )}
      </div>
      <div className="text-xs sm:text-sm font-medium text-foreground truncate">{value}</div>
    </div>
  );
}
