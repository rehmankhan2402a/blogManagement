import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Lock, ArrowRight, Sparkles } from "lucide-react";
import logo from "@/assets/images/kaseer-logo.png";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordInput } from "@/components/ui/password-input";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const { user, initializing } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"sign-in" | "forgot">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);

  // Already authenticated -> go straight to admin
  useEffect(() => {
    if (!initializing && user) {
      navigate({ to: "/admin" });
    }
  }, [initializing, user, navigate]);

  if (initializing) return null;

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "sign-in") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        if (!remember) {
          window.addEventListener(
            "beforeunload",
            () => {
              Object.keys(localStorage).forEach((k) => {
                if (k.startsWith("sb-")) localStorage.removeItem(k);
              });
            },
            { once: true },
          );
        }

        navigate({ to: "/admin" });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent — check your email");
        setMode("sign-in");
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2 bg-background">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#091428] p-12 text-foreground lg:flex lg:flex-col lg:justify-between border-r border-white/10">
        <div className="absolute inset-0 bg-gradient-to-br from-[#061122] via-[#0D1932] to-[#081224]" />
        <div className="absolute -bottom-20 -right-20 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute -top-24 -left-16 h-80 w-80 rounded-full bg-primary/15 blur-[100px]" />

        <div className="relative flex items-center">
          <img src="/assets/Kaseer logo.png" alt="KASEER Logo" className="h-14 w-auto object-contain" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> KASEER Admin Portal
          </div>
          <h2 className="max-w-md text-4xl font-extrabold tracking-tight leading-tight text-foreground">
            Your home. <span className="text-primary">Thinking ahead.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm text-muted-foreground leading-relaxed">
            Manage technical insights, publish articles to the live website, view client inquiries from Lahore &amp; Karachi, and administer smart system content.
          </p>
        </motion.div>

        <div className="relative text-xs text-muted-foreground">
          &copy; {new Date().getFullYear()} KASEER Intelligent Living. All rights reserved.
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-white/10 bg-card p-8 sm:p-10 shadow-2xl"
        >
          <div className="mb-8 lg:hidden flex justify-center">
            <img src="/assets/Kaseer logo.png" alt="KASEER Logo" className="h-12 w-auto object-contain" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            {mode === "forgot" ? "Reset password" : "Admin Sign In"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {mode === "forgot"
              ? "Enter your email and we will send you a reset link."
              : "Sign in to manage KASEER blogs, media, and client inquiries."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            <div>
              <Label htmlFor="email">Email address</Label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="admin@kaseer.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl pl-10 border-white/10 bg-surface focus:border-primary"
                />
              </div>
            </div>

            {mode !== "forgot" && (
              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <PasswordInput
                    id="password"
                    required
                    minLength={6}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 rounded-xl pl-10 border-white/10 bg-surface focus:border-primary"
                  />
                </div>
              </div>
            )}

            {mode === "sign-in" && (
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <label className="flex cursor-pointer items-center gap-2 text-muted-foreground hover:text-foreground">
                  <Checkbox checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                  Remember me
                </label>
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              disabled={busy}
              className="h-12 w-full rounded-xl bg-primary font-bold text-primary-foreground shadow-[0_0_20px_rgba(245,169,63,0.3)] transition-all hover:bg-primary/90 active:scale-[0.99]"
            >
              {busy ? "Authenticating..." : mode === "forgot" ? "Send Reset Link" : "Sign In to Dashboard"}
              {!busy && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>

            {mode === "forgot" && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setMode("sign-in")}
                  className="text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  ← Back to Sign In
                </button>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </div>
  );
}
