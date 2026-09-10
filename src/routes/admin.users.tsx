import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, RefreshCw, User as UserIcon, ShieldCheck, Mail, Lock, Shield } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createUserFn, deleteUserFn } from "@/lib/admin-api";
import { PageHeader } from "@/components/admin/admin-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/admin/users")({ component: UsersPage });

type AppUser = {
  id: string;
  email: string;
  fullName: string;
  created_at: string;
  role: "admin" | "editor";
};

function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser, isAdmin, initializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!initializing && !isAdmin) {
      navigate({ to: "/admin" });
    }
  }, [isAdmin, initializing, navigate]);

  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [fullNameInput, setFullNameInput] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "editor">("editor");
  const [busy, setBusy] = useState(false);

  const { data: users, isLoading, refetch } = useQuery<AppUser[]>({
    queryKey: ["admin-users"],
    enabled: typeof window !== "undefined" && Boolean(isAdmin),
    queryFn: async () => {
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);

      const { data: profiles } = await supabase.from("profiles").select("*");
      const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

      return (roles ?? []).map((r: any) => {
        const prof = profileMap.get(r.user_id);
        const isCurrent = currentUser?.id === r.user_id;
        const name = prof?.full_name || (isCurrent ? "KASEER Administrator" : "Team Member");
        const mail = isCurrent ? currentUser?.email || "admin@kaseer.com" : `${name.toLowerCase().replace(/\s+/g, '.') || 'user'}@kaseer.com`;

        return {
          id: r.user_id,
          email: mail,
          fullName: name,
          created_at: r.created_at,
          role: (r.role as "admin" | "editor") || "editor",
        };
      });
    },
  });

  async function createUser() {
    if (!email.trim()) return toast.error("Email is required");
    if (!password.trim()) return toast.error("Password is required");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");
    setBusy(true);
    try {
      const nameFromEmail = email.split("@")[0];
      const displayName = fullNameInput.trim() || (nameFromEmail.charAt(0).toUpperCase() + nameFromEmail.slice(1));

      // Use Server Function to create user via Supabase Admin API
      await createUserFn({
        data: {
          email: email.trim().toLowerCase(),
          password: password,
          role: role,
          fullName: displayName,
        },
      });

      toast.success(`User ${email} created successfully as ${role}`);
      setAddOpen(false);
      setEmail("");
      setFullNameInput("");
      setPassword("");
      setRole("editor");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (e: any) {
      console.error("Create user error:", e);
      toast.error(e.message ?? "Could not create user. Please verify SUPABASE_SERVICE_ROLE_KEY in .env");
    } finally {
      setBusy(false);
    }
  }

  async function updateRole(userId: string, newRole: "admin" | "editor") {
    try {
      const { error } = await supabase
        .from("user_roles")
        .update({ role: newRole })
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(`Role updated to ${newRole}`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (e: any) {
      toast.error(e.message ?? "Could not update role");
    }
  }

  async function sendPasswordReset(userEmail: string) {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(userEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success(`Password reset instructions sent to ${userEmail}`);
    } catch (e: any) {
      toast.error(e.message ?? "Could not send password reset");
    }
  }

  async function deleteUser(userId: string) {
    try {
      await deleteUserFn({ data: { userId } });
      toast.success("User access removed");
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      refetch();
    } catch (e: any) {
      console.error("Delete user error:", e);
      try {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("profiles").delete().eq("id", userId);
        toast.success("User removed from roles");
        setDeleteId(null);
        qc.invalidateQueries({ queryKey: ["admin-users"] });
        refetch();
      } catch (err: any) {
        toast.error(e.message ?? "Could not remove user");
      }
    }
  }

  return (
    <>
      <PageHeader
        title="Team Members & Roles"
        description="Manage administrators and content editors who have access to the KASEER management console."
        actions={
          <Button onClick={() => setAddOpen(true)} className="rounded-full shadow-md gap-1.5">
            <Plus className="h-4 w-4" /> Add Team Member
          </Button>
        }
      />

      <div className="p-6 md:p-10 space-y-6">
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 animate-pulse rounded-2xl bg-muted/40" />
            ))}
          </div>
        ) : users?.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border/60 bg-card/40">
            <CardContent className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-full bg-primary/10 p-4 text-primary mb-3">
                <UserIcon className="h-8 w-8" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No team members yet</h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-sm">
                Add team members to give them access to publish blogs and manage content.
              </p>
              <Button onClick={() => setAddOpen(true)} className="mt-4 rounded-full text-xs">
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add First Member
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {users?.map((u) => {
              const isMe = currentUser?.id === u.id;
              return (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="rounded-2xl border-border/60 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#F5A93F]/15 text-[#F5A93F] border border-[#F5A93F]/30 font-bold text-sm">
                            {u.fullName.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-foreground flex items-center gap-1.5">
                              {u.fullName}
                              {isMe && <Badge variant="outline" className="text-[9px] py-0 px-1.5 rounded-full border-primary/40 text-primary">You</Badge>}
                            </div>
                            <div className="truncate text-xs text-muted-foreground">{u.email}</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <Badge
                          variant="secondary"
                          className={`rounded-full text-xs gap-1 py-0.5 px-2.5 ${
                            u.role === "admin"
                              ? "bg-primary/15 text-primary border border-primary/25 font-semibold"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <ShieldCheck className="h-3 w-3" />
                          {u.role === "admin" ? "Administrator" : "Editor"}
                        </Badge>

                        <div className="flex items-center gap-1.5">
                          {/* Role selector */}
                          <Select
                            value={u.role}
                            onValueChange={(v) => updateRole(u.id, v as "admin" | "editor")}
                            disabled={isMe}
                          >
                            <SelectTrigger className="h-7 w-24 rounded-lg text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="editor">Editor</SelectItem>
                            </SelectContent>
                          </Select>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                            title="Send Password Reset"
                            onClick={() => sendPasswordReset(u.email)}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                          </Button>

                          {!isMe && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 rounded-lg text-destructive hover:bg-destructive/10"
                              title="Remove User Access"
                              onClick={() => setDeleteId(u.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add user dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => { if (!busy) setAddOpen(o); }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" /> Add New Team Member
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label htmlFor="full-name" className="text-xs">Full Name</Label>
              <Input
                id="full-name"
                value={fullNameInput}
                onChange={(e) => setFullNameInput(e.target.value)}
                placeholder="e.g. Danish Farooq"
                className="mt-1 rounded-xl text-xs"
                disabled={busy}
              />
            </div>
            <div>
              <Label htmlFor="new-email" className="text-xs">Email Address</Label>
              <div className="relative mt-1">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="new-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@kaseer.com"
                  className="rounded-xl pl-9 text-xs"
                  disabled={busy}
                />
              </div>
            </div>
            <div>
              <Label htmlFor="new-password" className="text-xs">Initial Password</Label>
              <div className="relative mt-1">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <PasswordInput
                  id="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="rounded-xl pl-9 text-xs"
                  minLength={6}
                  disabled={busy}
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Role & Permissions</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "editor")} disabled={busy}>
                <SelectTrigger className="mt-1 rounded-xl text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor — can create &amp; edit blog posts</SelectItem>
                  <SelectItem value="admin">Administrator — full console &amp; user access</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="pt-3">
            <Button variant="outline" className="rounded-full text-xs" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button className="rounded-full text-xs shadow-md" disabled={busy} onClick={createUser}>
              {busy ? "Creating…" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke team member access?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the user's role and admin console permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground rounded-full"
              onClick={() => deleteId && deleteUser(deleteId)}
            >
              Confirm Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
