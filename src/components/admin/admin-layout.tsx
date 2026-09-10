import { useState, useEffect } from "react";
import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  FolderKanban,
  Tags,
  Users,
  Image as ImageIcon,
  MessageSquare,
  Calculator,
  Settings,
  Sliders,
  Menu,
  LogOut,
  Layers,
  Wrench,
  Boxes,
  User as UserIcon,
  ChevronDown,
  Globe,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
  adminOnly?: boolean;
}

const NAV: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Blog Posts", to: "/admin/blogs", icon: FileText },
  { label: "Categories", to: "/admin/categories", icon: FolderKanban },
  { label: "Tags", to: "/admin/tags", icon: Tags },
  { label: "Media Library", to: "/admin/media", icon: ImageIcon },
  { label: "Projects Portfolio", to: "/admin/projects", icon: Layers },
  { label: "Products Catalog", to: "/admin/products", icon: Boxes },
  { label: "Services Catalog", to: "/admin/services", icon: Wrench },
  { label: "Calculator Quotes", to: "/admin/calculator-quotes", icon: Calculator },
  { label: "Calculator Pricing", to: "/admin/calculator-settings", icon: Sliders, adminOnly: true },
  { label: "Contact Messages", to: "/admin/messages", icon: MessageSquare },
  { label: "User Management", to: "/admin/users", icon: Users, adminOnly: true },
  { label: "Settings", to: "/admin/settings", icon: Settings },
];

function getInitials(name?: string, email?: string) {
  if (name && name.trim().length > 0) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email && email.length > 0) {
    return email.slice(0, 2).toUpperCase();
  }
  return "AD";
}

// User Profile Header Dropdown Component
export function AdminProfileDropdown() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fullName = (user?.user_metadata?.full_name as string) || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || "";
  const roleLabel = role === "admin" ? "Administrator" : role === "editor" ? "Editor" : "User";
  const initials = getInitials(fullName, user?.email);

  if (!mounted) {
    return (
      <div className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2.5 bg-muted/40 border border-border/60 opacity-70">
        <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/40 grid place-items-center text-primary text-xs font-bold">
          {initials}
        </div>
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center gap-2.5 rounded-full p-1 pl-1.5 pr-2.5 bg-muted/40 hover:bg-muted border border-border/60 transition-all outline-none focus:ring-2 focus:ring-primary/30"
          aria-label="User profile menu"
        >
          <Avatar className="h-8 w-8 border border-primary/40 ring-2 ring-primary/10">
            <AvatarImage src={avatarUrl} alt={fullName || user?.email || "Admin"} className="object-cover" />
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground max-w-[120px] truncate leading-tight">
              {fullName || user?.email?.split("@")[0]}
            </span>
            <span className="text-[10px] text-primary font-medium leading-tight">
              {roleLabel}
            </span>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground hidden sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-xl border-border/80 z-50">
        <DropdownMenuLabel className="font-normal p-2 pb-1.5">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-semibold text-foreground leading-none">
              {fullName || "Administrator"}
            </p>
            <p className="text-xs text-muted-foreground truncate leading-none">
              {user?.email}
            </p>
            <div className="pt-1.5">
              <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-[10px] px-1.5 py-0">
                <ShieldCheck className="mr-1 h-3 w-3" /> {roleLabel}
              </Badge>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          className="cursor-pointer rounded-xl gap-2 text-xs font-medium py-2"
          onClick={() => navigate({ to: "/admin/settings" })}
        >
          <UserIcon className="h-4 w-4 text-primary" />
          <span>Profile</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-1.5" />

        <DropdownMenuItem
          className="cursor-pointer rounded-xl gap-2 text-xs font-medium py-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
          onClick={() => signOut().then(() => navigate({ to: "/login" }))}
        >
          <LogOut className="h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Sidebar content component

function SidebarContent({
  path,
  onNavigate,
}: {
  path: string;
  onNavigate?: () => void;
}) {
  const { user, role, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const fullName = (user?.user_metadata?.full_name as string) || "";
  const avatarUrl = (user?.user_metadata?.avatar_url as string) || "";
  const roleLabel = role === "admin" ? "Administrator" : role === "editor" ? "Editor" : null;
  const initials = getInitials(fullName, user?.email);

  // Poll for unread quote count
  const { data: newQuoteCount } = useQuery<number>({
    queryKey: ["calculator-quotes-new-count"],
    enabled: typeof window !== "undefined",
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("calculator_quotes")
        .select("id", { count: "exact", head: true })
        .eq("status", "new");
      return count ?? 0;
    },
  });

  // Poll for unread contact messages
  const { data: unreadCount } = useQuery<number>({
    queryKey: ["contact-messages-unread"],
    enabled: typeof window !== "undefined",
    refetchInterval: 30_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("contact_messages")
        .select("id", { count: "exact", head: true })
        .eq("status", "unread");
      return count ?? 0;
    },
  });

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {/* Logo */}
      <div className="flex items-center px-6 py-4 border-b border-sidebar-border">
        <Link to="/admin" className="flex items-center gap-2 py-1">
          <img
            src="/assets/Kaseer logo.png"
            alt="KASEER Logo"
            className="h-10 w-auto object-contain"
          />
        </Link>
      </div>

      {/* Nav links */}
      <nav className="mt-4 flex-1 space-y-1.5 px-3">
        {NAV
          .filter((item) => !item.adminOnly || isAdmin)
          .map((item) => {
            const active = item.exact
              ? path === item.to || (item.to === "/admin" && (path === "/admin" || path === "/admin/"))
              : (item.to === "/admin" ? path === "/admin" || path === "/admin/" : path.startsWith(item.to));
            const Icon = item.icon;
            const isMessages = item.to === "/admin/messages";
            const isQuotes = item.to === "/admin/calculator-quotes";
            const showMsgBadge = isMessages && (unreadCount ?? 0) > 0;
            const showQuoteBadge = isQuotes && (newQuoteCount ?? 0) > 0;

            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={onNavigate}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                  active
                    ? "bg-sidebar-accent text-primary shadow-sm border border-primary/20"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-y-2 left-0 w-1 rounded-r bg-primary shadow-[0_0_10px_rgba(245,169,63,0.5)]"
                  />
                )}
                <Icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                <span className="flex-1">{item.label}</span>

                {showMsgBadge && (
                  <Badge className="h-5 min-w-5 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shadow-[0_0_10px_rgba(245,169,63,0.4)]">
                    {unreadCount}
                  </Badge>
                )}

                {showQuoteBadge && (
                  <Badge className="h-5 min-w-5 rounded-full bg-amber-500 px-1.5 text-[10px] font-bold text-black shadow-[0_0_10px_rgba(245,158,11,0.4)]">
                    {newQuoteCount}
                  </Badge>
                )}
              </Link>
            );
          })}
      </nav>

      {/* User footer */}
      <div className="border-t border-sidebar-border p-4">
        <div
          onClick={() => {
            if (onNavigate) onNavigate();
            navigate({ to: "/admin/settings" });
          }}
          className="flex items-center gap-3 p-2 rounded-2xl hover:bg-sidebar-accent/80 transition-colors cursor-pointer group"
          title="Click to manage profile"
        >
          <Avatar className="h-9 w-9 border border-primary/40 ring-1 ring-primary/20">
            <AvatarImage src={avatarUrl} alt={fullName || user?.email || "User"} className="object-cover" />
            <AvatarFallback className="bg-primary/15 text-primary text-xs font-bold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-foreground group-hover:text-primary transition-colors">
              {fullName || user?.email}
            </div>
            {roleLabel && (
              <div className="text-[10px] text-primary font-medium">{roleLabel}</div>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              signOut().then(() => navigate({ to: "/login" }));
            }}
            className="rounded-lg p-1.5 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-destructive transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Spinner

function FullPageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-primary border-t-transparent shadow-[0_0_15px_rgba(245,169,63,0.3)]" />
        <p className="text-sm font-semibold text-muted-foreground">Loading KASEER Portal...</p>
      </div>
    </div>
  );
}

// No-role screen

function NoRoleScreen() {
  const { signOut, refreshRole } = useAuth();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(false);

  async function retry() {
    setChecking(true);
    await refreshRole();
    setChecking(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md rounded-3xl border border-white/10 bg-card p-10 text-center shadow-2xl">
        <Link to="/admin" className="flex items-center gap-2">
            <img
              src="/assets/Kaseer logo.png"
              alt="KASEER Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
        <h1 className="mt-4 text-2xl font-bold text-foreground">Access not authorized</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn't have an administrator or editor role assigned. Contact KASEER system admin.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            variant="outline"
            className="rounded-full"
            disabled={checking}
            onClick={retry}
          >
            {checking ? "Checking..." : "Retry"}
          </Button>
          <Button
            className="rounded-full bg-primary font-bold text-primary-foreground"
            onClick={() => signOut().then(() => navigate({ to: "/login" }))}
          >
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

// Admin layout

export function AdminLayout() {
  const { user, role, initializing } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!initializing && !user) {
      navigate({ to: "/login" });
    }
  }, [initializing, user, navigate]);

  if (initializing) return <FullPageSpinner />;
  if (!user) return null;

  const isAuthorized = role === "admin" || role === "editor";
  if (!isAuthorized) return <NoRoleScreen />;

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 shrink-0 md:block border-r border-border/80 bg-sidebar">
        <SidebarContent path={path} />
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center justify-between border-b border-border bg-sidebar px-4 py-3 md:hidden">
        <div className="flex items-center gap-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <button
                className="rounded-lg p-2 text-sidebar-foreground hover:bg-sidebar-accent"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-0 p-0 bg-sidebar">
              <SidebarContent path={path} onNavigate={() => setMobileOpen(false)} />
            </SheetContent>
          </Sheet>
          <Link to="/admin" className="flex items-center gap-2">
            <img
              src="/assets/Kaseer logo.png"
              alt="KASEER Logo"
              className="h-8 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Mobile Profile Icon Dropdown */}
        <AdminProfileDropdown />
      </div>

      {/* Page content */}
      <main className="flex-1 overflow-x-hidden pt-14 md:pt-0 bg-background min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}

// Page header (shared across admin pages)

export function PageHeader({
  title,
  description,
  actions,
  hideProfile,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  hideProfile?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-between gap-4 border-b border-border bg-card/40 px-6 py-5 backdrop-blur-md md:px-10"
    >
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      <div className="flex items-center gap-3">
        {actions && (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        )}
        {!hideProfile && (
          <div className="hidden md:block pl-2 border-l border-border/60">
            <AdminProfileDropdown />
          </div>
        )}
      </div>
    </motion.div>
  );
}
