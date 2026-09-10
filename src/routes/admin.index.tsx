import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  FileText, CheckCircle2, FileEdit, Star, Plus, 
  Image as ImageIcon, FolderTree, ArrowUpRight, 
  MessageSquare, Mail, Package, Building2, Sparkles
} from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, subDays, startOfDay } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/admin/admin-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/admin/")({
  component: DashboardPage,
});

type Stats = { 
  total: number; 
  published: number; 
  draft: number; 
  featured: number;
  products: number;
  projects: number;
  services: number;
};

function DashboardPage() {
  const { data: stats, isLoading } = useQuery<Stats>({
    queryKey: ["dashboard-all-stats"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const [total, pub, draft, feat, prods, projs, servs] = await Promise.all([
        supabase.from("blogs").select("id", { count: "exact", head: true }),
        supabase.from("blogs").select("id", { count: "exact", head: true }).eq("status", "published"),
        supabase.from("blogs").select("id", { count: "exact", head: true }).eq("status", "draft"),
        supabase.from("blogs").select("id", { count: "exact", head: true }).eq("is_featured", true),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("projects").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }),
      ]);
      return {
        total: total.count ?? 0,
        published: pub.count ?? 0,
        draft: draft.count ?? 0,
        featured: feat.count ?? 0,
        products: prods.count ?? 0,
        projects: projs.count ?? 0,
        services: servs.count ?? 0,
      };
    },
  });

  const { data: recent } = useQuery({
    queryKey: ["recent-blogs"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const { data } = await supabase
        .from("blogs")
        .select("id,title,status,updated_at,is_featured")
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: recentMessages } = useQuery({
    queryKey: ["recent-messages-dash"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const { data } = await supabase
        .from("contact_messages")
        .select("id,full_name,email,message,status,created_at")
        .order("created_at", { ascending: false })
        .limit(4);
      return (data ?? []) as {
        id: string;
        full_name: string;
        email: string;
        message: string;
        status: "unread" | "read" | "replied";
        created_at: string;
      }[];
    },
  });

  const { data: unreadMsgCount } = useQuery<number>({
    queryKey: ["contact-messages-unread"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      return count ?? 0;
    },
  });

  const { data: chartData } = useQuery({
    queryKey: ["pub-chart"],
    enabled: typeof window !== 'undefined',
    queryFn: async () => {
      const since = subDays(new Date(), 29).toISOString();
      const { data } = await supabase
        .from("blogs")
        .select("published_at")
        .gte("published_at", since)
        .eq("status", "published");
      const buckets: Record<string, number> = {};
      for (let i = 29; i >= 0; i--) {
        const d = format(startOfDay(subDays(new Date(), i)), "MMM d");
        buckets[d] = 0;
      }
      (data ?? []).forEach((row: any) => {
        if (row.published_at) {
          const d = format(startOfDay(new Date(row.published_at)), "MMM d");
          if (d in buckets) buckets[d]++;
        }
      });
      return Object.entries(buckets).map(([date, count]) => ({ date, count }));
    },
  });

  const cards = [
    { label: "Total Blogs", value: stats?.total, icon: FileText, tone: "primary" as const, link: "/admin/blogs" },
    { label: "Published", value: stats?.published, icon: CheckCircle2, tone: "accent" as const, link: "/admin/blogs" },
    { label: "Drafts", value: stats?.draft, icon: FileEdit, tone: "muted" as const, link: "/admin/blogs" },
    { label: "Products", value: stats?.products, icon: Package, tone: "primary" as const, link: "/admin/products" },
    { label: "Projects", value: stats?.projects, icon: Building2, tone: "accent" as const, link: "/admin/projects" },
    { label: "Services", value: stats?.services, icon: Sparkles, tone: "primary" as const, link: "/admin/services" },
    { label: "Messages", value: unreadMsgCount ?? 0, icon: MessageSquare, tone: unreadMsgCount ? "primary" as const : "muted" as const, link: "/admin/messages" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard Overview"
        description="Manage blogs, hardware catalog, showcase projects, services, and incoming enquiries."
        actions={
          <Button asChild size="sm" className="rounded-full">
            <Link to="/admin/blogs/new"><Plus className="mr-1.5 h-3.5 w-3.5" /> New Blog</Link>
          </Button>
        }
      />

      <div className="space-y-5 p-4 sm:p-6">
        {/* Compact Stat Cards Grid */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {cards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
            >
              <Link to={c.link} className="block group">
                <Card className="relative overflow-hidden rounded-xl border-border/60 bg-card transition-all duration-200 hover:border-primary/50 hover:shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium text-muted-foreground">{c.label}</div>
                        <div className="mt-1 text-lg font-bold tracking-tight text-foreground">
                          {isLoading ? <Skeleton className="h-5 w-8" /> : <CountUp to={c.value ?? 0} />}
                        </div>
                      </div>
                      <div className={
                        c.tone === "primary"
                          ? "grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"
                          : c.tone === "accent"
                            ? "grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-accent/30 text-primary"
                            : "grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
                      }>
                        <c.icon className="h-3 w-3" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Chart */}
          <Card className="rounded-xl border-border/60 lg:col-span-2">
            <CardContent className="p-4 sm:p-4.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">Publishing Activity</div>
                  <div className="text-xs text-muted-foreground">Posts published in the last 30 days</div>
                </div>
              </div>
              <div className="mt-3 h-44 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData ?? []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.55 0.16 150)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.55 0.16 150)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.91 0.018 145)" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: "oklch(0.52 0.03 150)" }} interval={4} />
                    <YAxis tick={{ fontSize: 10, fill: "oklch(0.52 0.03 150)" }} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid oklch(0.91 0.018 145)",
                        background: "white",
                        fontSize: 11,
                        padding: "4px 8px"
                      }}
                    />
                    <Line type="monotone" dataKey="count" stroke="oklch(0.45 0.13 150)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-4 sm:p-4.5">
              <div className="text-sm font-semibold">Quick Actions</div>
              <div className="mt-2.5 grid gap-1.5">
                <QuickAction to="/admin/blogs/new" icon={Plus} label="New Blog Post" desc="Draft article" />
                <QuickAction to="/admin/products" icon={Package} label="Products Catalog" desc="Manage hardware items" />
                <QuickAction to="/admin/projects" icon={Building2} label="Projects & Gallery" desc="Case studies & showcase" />
                <QuickAction to="/admin/services" icon={Sparkles} label="Services" desc="Manage service offerings" />
                <QuickAction to="/admin/messages" icon={MessageSquare} label="Messages" desc="Contact inquiries" badge={unreadMsgCount ?? 0} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Recent activity */}
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-4 sm:p-4.5">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Recent Blog Posts</div>
                <Link to="/admin/blogs" className="text-xs font-medium text-primary hover:underline">
                  View all →
                </Link>
              </div>
              <div className="mt-2.5 divide-y divide-border/60">
                {!recent && [...Array(3)].map((_, i) => <Skeleton key={i} className="my-2 h-7" />)}
                {recent && recent.length === 0 && (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No blog posts yet — <Link to="/admin/blogs/new" className="text-primary hover:underline">create your first</Link>.
                  </div>
                )}
                {recent?.map((b: any) => (
                  <Link
                    key={b.id}
                    to="/admin/blogs/$id/edit"
                    params={{ id: b.id }}
                    className="flex items-center justify-between gap-2.5 py-1.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-foreground">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {b.status === "published" ? "Published" : "Draft"} · updated {format(new Date(b.updated_at), "MMM d, p")}
                      </div>
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent messages */}
          <Card className="rounded-xl border-border/60">
            <CardContent className="p-4 sm:p-4.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  Recent Enquiries
                  {(unreadMsgCount ?? 0) > 0 && (
                    <Badge className="rounded-full bg-blue-500 px-1.5 py-0 text-[10px] text-white">
                      {unreadMsgCount} unread
                    </Badge>
                  )}
                </div>
                <Link to="/admin/messages" className="text-xs font-medium text-primary hover:underline">
                  View all →
                </Link>
              </div>
              <div className="mt-2.5 divide-y divide-border/60">
                {!recentMessages && [...Array(3)].map((_, i) => <Skeleton key={i} className="my-2 h-7" />)}
                {recentMessages && recentMessages.length === 0 && (
                  <div className="py-5 text-center text-xs text-muted-foreground">
                    No messages yet. They will appear here once visitors submit the contact form.
                  </div>
                )}
                {recentMessages?.map((m) => (
                  <Link
                    key={m.id}
                    to="/admin/messages"
                    className="flex items-center justify-between gap-2.5 py-1.5 px-2 -mx-2 rounded-lg transition-colors hover:bg-muted/50"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-xs font-medium text-foreground">{m.full_name}</span>
                        {m.status === "unread" && (
                          <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                        )}
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">{m.message}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] text-muted-foreground">{format(new Date(m.created_at), "MMM d")}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

function QuickAction({ to, icon: Icon, label, desc, badge }: { to: string; icon: any; label: string; desc: string; badge?: number }) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2 rounded-lg border border-border/50 px-2.5 py-1.5 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div className="grid h-6 w-6 place-items-center rounded-md bg-accent/30 text-primary shrink-0">
        <Icon className="h-3 w-3" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground truncate">{desc}</div>
      </div>
      {badge ? (
        <Badge className="rounded-full bg-blue-500 px-1.5 py-0 text-[10px] text-white">{badge}</Badge>
      ) : (
        <ArrowUpRight className="h-3 w-3 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      )}
    </Link>
  );
}

function CountUp({ to }: { to: number }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const start = performance.now();
    const dur = 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      setN(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{n}</>;
}
