import { useState, useEffect, useRef } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Mail,
  Server,
  Key,
  Send,
  Check,
  RefreshCw,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Bell,
  AtSign,
  Upload,
  Camera,
  Trash2,
  Lock,
  Calendar,
  Fingerprint,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { uploadImage } from "@/lib/media";
import { sendTestEmailFn } from "@/lib/admin-api";
import { PageHeader } from "@/components/admin/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/settings")({ component: SettingsPage });

interface SmtpFormState {
  provider: "custom_smtp" | "resend" | "gmail" | "sendgrid";
  smtp_host: string;
  smtp_port: number;
  smtp_encryption: "TLS" | "SSL" | "None";
  smtp_user: string;
  smtp_pass: string;
  from_name: string;
  from_email: string;
  admin_recipient_email: string;
  resend_api_key: string;
  notify_on_quote: boolean;
  notify_on_contact: boolean;
  auto_reply_to_customer: boolean;
}

const DEFAULT_SETTINGS: SmtpFormState = {
  provider: "resend",
  smtp_host: "smtp.gmail.com",
  smtp_port: 587,
  smtp_encryption: "TLS",
  smtp_user: "",
  smtp_pass: "",
  from_name: "KASEER Smart Home Automation",
  from_email: "onboarding@resend.dev",
  admin_recipient_email: "info@kaseer.com",
  resend_api_key: "",
  notify_on_quote: true,
  notify_on_contact: true,
  auto_reply_to_customer: true,
};

const STORAGE_KEY = "kaseer_smtp_settings_v2";

function SettingsPage() {
  const { user, role, signOut } = useAuth();
  const navigate = useNavigate();
  const roleLabel = role === "admin" ? "Administrator" : role === "editor" ? "Editor" : "No role";

  const [activeTab, setActiveTab] = useState("smtp");

  // SMTP Settings State
  const [formData, setFormData] = useState<SmtpFormState>(DEFAULT_SETTINGS);
  const [isSavingSmtp, setIsSavingSmtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  // Test Email State
  const [testRecipient, setTestRecipient] = useState(DEFAULT_SETTINGS.admin_recipient_email);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; timestamp?: string } | null>(null);

  // Profile State
  const [fullName, setFullName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Password Change State
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  // Load Settings and Profile on Mount
  useEffect(() => {
    // Clear legacy storage keys with personal email
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("kaseer_smtp_settings_v1");
        const v2 = localStorage.getItem("kaseer_smtp_settings_v2");
        if (v2 && v2.includes("abdul69rehman")) {
          localStorage.removeItem("kaseer_smtp_settings_v2");
        }
      } catch (_) {}
    }

    async function loadAll() {
      if (user) {
        setProfileEmail(user.email || "");
        setFullName((user.user_metadata?.full_name as string) || "");
        setAvatarUrl((user.user_metadata?.avatar_url as string) || "");

        // Try to fetch profile from `profiles` table
        try {
          const { data: prof } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();

          if (prof) {
            if (prof.full_name) setFullName(prof.full_name);
            if (prof.avatar_url) setAvatarUrl(prof.avatar_url);
          }
        } catch (e) {
          console.warn("Could not fetch profiles table row:", e);
        }
      }

      try {
        // Try loading SMTP from Supabase first
        const { data, error } = await supabase
          .from("smtp_settings")
          .select("*")
          .eq("id", "default")
          .maybeSingle();

        if (data && !error) {
          const loaded: SmtpFormState = {
            provider: (data.provider as SmtpFormState["provider"]) || "resend",
            smtp_host: data.smtp_host || DEFAULT_SETTINGS.smtp_host,
            smtp_port: data.smtp_port || DEFAULT_SETTINGS.smtp_port,
            smtp_encryption: (data.smtp_encryption as SmtpFormState["smtp_encryption"]) || "TLS",
            smtp_user: data.smtp_user || "",
            smtp_pass: data.smtp_pass || "",
            from_name: data.from_name || DEFAULT_SETTINGS.from_name,
            from_email: data.from_email || DEFAULT_SETTINGS.from_email,
            admin_recipient_email: data.admin_recipient_email || DEFAULT_SETTINGS.admin_recipient_email,
            resend_api_key: data.resend_api_key || DEFAULT_SETTINGS.resend_api_key,
            notify_on_quote: data.notify_on_quote ?? true,
            notify_on_contact: data.notify_on_contact ?? true,
            auto_reply_to_customer: data.auto_reply_to_customer ?? true,
          };
          setFormData(loaded);
          setTestRecipient(loaded.admin_recipient_email);
        } else {
          // Fallback to localStorage
          const savedLocal = localStorage.getItem(STORAGE_KEY);
          if (savedLocal) {
            try {
              // Clean out any old legacy local storage key
          try {
            const oldLocal = localStorage.getItem("kaseer_smtp_settings_v1");
            if (oldLocal && oldLocal.includes("abdul69rehman")) {
              localStorage.removeItem("kaseer_smtp_settings_v1");
            }
          } catch (_) {}
          const parsed = JSON.parse(savedLocal);
          if (parsed.admin_recipient_email && parsed.admin_recipient_email.includes("abdul69rehman")) {
            parsed.admin_recipient_email = "info@kaseer.com";
          }
              setFormData((prev) => ({ ...prev, ...parsed }));
              if (parsed.admin_recipient_email) {
                setTestRecipient(parsed.admin_recipient_email);
              }
            } catch (e) {
              console.warn("Could not parse local smtp settings", e);
            }
          }
        }
      } catch (err) {
        console.warn("Failed fetching smtp settings:", err);
      }
    }

    loadAll();
  }, [user]);

  // Handle Avatar Upload
  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file (PNG, JPG, WebP)");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const uploadedUrl = await uploadImage(file);
      setAvatarUrl(uploadedUrl);
      toast.success("Profile photo uploaded successfully!");
    } catch (err: any) {
      console.warn("Direct upload error:", err);
      // Fallback: Read as data URL for instant preview
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") {
          setAvatarUrl(reader.result);
          toast.success("Profile photo preview updated!");
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async () => {
    if (!user) {
      toast.error("No active user session found.");
      return;
    }

    setIsSavingProfile(true);
    try {
      // 1. Update Supabase Auth user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
        },
      });

      if (authError) throw authError;

      // 2. Update profiles table
      try {
        await supabase.from("profiles").upsert({
          id: user.id,
          full_name: fullName.trim(),
          avatar_url: avatarUrl.trim() || null,
          updated_at: new Date().toISOString(),
        } as any);
      } catch (pErr) {
        console.warn("Profiles table upsert note:", pErr);
      }

      toast.success("Profile updated successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Update Password
  const handleUpdatePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New password and confirm password do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setNewPassword("");
      setConfirmPassword("");
      toast.success("Password changed successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleProviderChange = (provider: SmtpFormState["provider"]) => {
    let updates: Partial<SmtpFormState> = { provider };
    if (provider === "gmail") {
      updates = {
        provider: "gmail",
        smtp_host: "smtp.gmail.com",
        smtp_port: 587,
        smtp_encryption: "TLS",
      };
    } else if (provider === "sendgrid") {
      updates = {
        provider: "sendgrid",
        smtp_host: "smtp.sendgrid.net",
        smtp_port: 587,
        smtp_encryption: "TLS",
        smtp_user: "apikey",
      };
    } else if (provider === "resend") {
      updates = {
        provider: "resend",
        from_email: "onboarding@resend.dev",
      };
    }
    setFormData((prev) => ({ ...prev, ...updates }));
    toast.info(`Switched preset to ${provider.toUpperCase()}`);
  };

  const handleSaveSmtp = async () => {
    setIsSavingSmtp(true);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));

      const { error } = await supabase.from("smtp_settings").upsert(
        {
          id: "default",
          provider: formData.provider,
          smtp_host: formData.smtp_host,
          smtp_port: Number(formData.smtp_port),
          smtp_encryption: formData.smtp_encryption,
          smtp_user: formData.smtp_user || null,
          smtp_pass: formData.smtp_pass || null,
          from_name: formData.from_name,
          from_email: formData.from_email,
          admin_recipient_email: formData.admin_recipient_email,
          resend_api_key: formData.resend_api_key || null,
          notify_on_quote: formData.notify_on_quote,
          notify_on_contact: formData.notify_on_contact,
          auto_reply_to_customer: formData.auto_reply_to_customer,
          updated_at: new Date().toISOString(),
        } as any,
        { onConflict: "id" }
      );

      if (error) {
        console.warn("Supabase upsert note:", error.message);
        toast.success("Settings saved locally to dashboard.");
      } else {
        toast.success("SMTP & Email settings successfully saved to database!");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setIsSavingSmtp(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testRecipient || !testRecipient.includes("@")) {
      toast.error("Please enter a valid recipient email address for testing.");
      return;
    }

    setIsSendingTest(true);
    setTestResult(null);

    try {
      const res = await sendTestEmailFn({
        data: {
          provider: formData.provider,
          to: testRecipient,
          fromName: formData.from_name,
          fromEmail: formData.from_email,
          apiKey: formData.resend_api_key,
          smtpHost: formData.smtp_host,
          smtpPort: formData.smtp_port,
          smtpUser: formData.smtp_user,
          smtpPass: formData.smtp_pass,
        },
      });

      setTestResult({
        success: true,
        message: `Email successfully delivered to ${testRecipient}! Check your inbox.`,
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.success(`Test email sent successfully to ${testRecipient}!`);
    } catch (err: any) {
      console.error("Test email dispatch error:", err);
      setTestResult({
        success: false,
        message: err.message || "Failed to dispatch test email.",
        timestamp: new Date().toLocaleTimeString(),
      });
      toast.error(`Error sending test email: ${err.message}`);
    } finally {
      setIsSendingTest(false);
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name && name.trim().length > 0) {
      const parts = name.trim().split(" ");
      if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
      return name.slice(0, 2).toUpperCase();
    }
    if (email && email.length > 0) {
      return email.slice(0, 2).toUpperCase();
    }
    return "AD";
  };

  return (
    <>
      <PageHeader
        title="Settings & Preferences"
        description="Manage your administrator profile, security credentials, and email notification servers."
      />

      <div className="space-y-6 p-6 md:p-10 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 md:w-[380px] rounded-2xl bg-muted/60 p-1">
            <TabsTrigger value="smtp" className="rounded-xl flex items-center gap-2">
              <Mail className="h-4 w-4" />
              <span>Email & SMTP</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="rounded-xl flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              <span>Profile & Security</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: SMTP & EMAIL SETTINGS */}
          <TabsContent value="smtp" className="space-y-6">
            <Card className="rounded-3xl border-primary/20 bg-gradient-to-r from-primary/5 via-primary/[0.02] to-transparent shadow-sm">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25">
                      <Sparkles className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-bold">Live Email Engine</h3>
                        <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium">
                          Active Ready
                        </Badge>
                        <Badge variant="secondary" className="capitalize font-mono text-xs">
                          Provider: {formData.provider}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Notifications from the Smart Home Calculator & Contact form are routed to{" "}
                        <span className="font-semibold text-foreground underline decoration-primary/50">
                          {formData.admin_recipient_email || "Admin Email"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full gap-1.5 border-border/80 hover:bg-muted"
                      onClick={() => setFormData(DEFAULT_SETTINGS)}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Reset Defaults
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full gap-1.5 shadow-md shadow-primary/20"
                      onClick={handleSaveSmtp}
                      disabled={isSavingSmtp}
                    >
                      {isSavingSmtp ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      Save Settings
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Provider Selection */}
            <Card className="rounded-3xl border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4 text-primary" />
                  Email Dispatch Provider
                </CardTitle>
                <CardDescription>
                  Choose how the application sends automated emails and client quotes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      id: "resend",
                      name: "Resend API",
                      desc: "Modern REST API • 100% High Delivery",
                      badge: "Recommended",
                      badgeColor: "bg-primary/20 text-primary border-primary/30",
                    },
                    {
                      id: "gmail",
                      name: "Google Gmail",
                      desc: "smtp.gmail.com:587 • App Password",
                      badge: "OAuth / App Pass",
                      badgeColor: "bg-blue-500/10 text-blue-500 border-blue-500/30",
                    },
                    {
                      id: "sendgrid",
                      name: "SendGrid SMTP",
                      desc: "smtp.sendgrid.net:587 • API Key Auth",
                      badge: "Cloud SMTP",
                      badgeColor: "bg-cyan-500/10 text-cyan-500 border-cyan-500/30",
                    },
                    {
                      id: "custom_smtp",
                      name: "Custom SMTP",
                      desc: "Private Host, CPanel or Enterprise Mail",
                      badge: "Self-Hosted",
                      badgeColor: "bg-amber-500/10 text-amber-500 border-amber-500/30",
                    },
                  ].map((p) => {
                    const isSelected = formData.provider === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleProviderChange(p.id as SmtpFormState["provider"])}
                        className={`text-left p-4 rounded-2xl border transition-all relative flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-md shadow-primary/10 ring-1 ring-primary/40"
                            : "border-border/60 hover:border-border hover:bg-muted/30"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-semibold text-sm">{p.name}</span>
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${p.badgeColor}`}>
                              {p.badge}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">{p.desc}</p>
                        </div>

                        {isSelected && (
                          <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary">
                            <CheckCircle2 className="h-3.5 w-3.5" /> Selected
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Sender & Routing Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-3xl border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <AtSign className="h-4 w-4 text-primary" />
                    Sender & Recipient Routing
                  </CardTitle>
                  <CardDescription>
                    Configure branding names and incoming alert addresses.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="from_name" className="text-xs font-medium text-muted-foreground">
                      Sender Name (From Name)
                    </Label>
                    <Input
                      id="from_name"
                      placeholder="e.g. KASEER Smart Home Automation"
                      value={formData.from_name}
                      onChange={(e) => setFormData({ ...formData, from_name: e.target.value })}
                      className="rounded-xl border-border/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="from_email" className="text-xs font-medium text-muted-foreground">
                      Sender Email (From Address)
                    </Label>
                    <Input
                      id="from_email"
                      type="email"
                      placeholder="e.g. onboarding@resend.dev or info@kaseer.com"
                      value={formData.from_email}
                      onChange={(e) => setFormData({ ...formData, from_email: e.target.value })}
                      className="rounded-xl border-border/60 font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Note: For Resend free tier, use <code className="text-primary">onboarding@resend.dev</code> or verify your custom domain.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="admin_recipient_email" className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Admin Notification Recipient Email</span>
                      <span className="text-[10px] text-primary">High Priority</span>
                    </Label>
                    <Input
                      id="admin_recipient_email"
                      type="email"
                      placeholder="e.g. info@kaseer.com or admin@kaseer.com"
                      value={formData.admin_recipient_email}
                      onChange={(e) => {
                        setFormData({ ...formData, admin_recipient_email: e.target.value });
                        setTestRecipient(e.target.value);
                      }}
                      className="rounded-xl border-border/60 font-mono text-xs"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      All new calculator quotes, estimates, and customer inquiries are dispatched to this inbox.
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* API Keys & Credentials */}
              <Card className="rounded-3xl border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    API Keys & SMTP Credentials
                  </CardTitle>
                  <CardDescription>
                    Configure Resend API keys or direct SMTP host credentials.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="resend_api_key" className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Resend API Key</span>
                      <a
                        href="https://resend.com/api-keys"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-primary hover:underline"
                      >
                        Get Key ↗
                      </a>
                    </Label>
                    <div className="relative">
                      <Input
                        id="resend_api_key"
                        type={showApiKey ? "text" : "password"}
                        placeholder="re_xxxxxxxxxxxxxx"
                        value={formData.resend_api_key}
                        onChange={(e) => setFormData({ ...formData, resend_api_key: e.target.value })}
                        className="rounded-xl border-border/60 font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <Label htmlFor="smtp_host" className="text-xs font-medium text-muted-foreground">
                        SMTP Host
                      </Label>
                      <Input
                        id="smtp_host"
                        placeholder="smtp.gmail.com"
                        value={formData.smtp_host}
                        onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                        className="rounded-xl border-border/60 font-mono text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_port" className="text-xs font-medium text-muted-foreground">
                        Port
                      </Label>
                      <Input
                        id="smtp_port"
                        type="number"
                        placeholder="587"
                        value={formData.smtp_port}
                        onChange={(e) => setFormData({ ...formData, smtp_port: Number(e.target.value) })}
                        className="rounded-xl border-border/60 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium text-muted-foreground">Encryption</Label>
                      <Select
                        value={formData.smtp_encryption}
                        onValueChange={(val) =>
                          setFormData({ ...formData, smtp_encryption: val as SmtpFormState["smtp_encryption"] })
                        }
                      >
                        <SelectTrigger className="rounded-xl border-border/60">
                          <SelectValue placeholder="Select encryption" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TLS">TLS (STARTTLS)</SelectItem>
                          <SelectItem value="SSL">SSL</SelectItem>
                          <SelectItem value="None">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="smtp_user" className="text-xs font-medium text-muted-foreground">
                        SMTP Username
                      </Label>
                      <Input
                        id="smtp_user"
                        placeholder="user@example.com"
                        value={formData.smtp_user}
                        onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                        className="rounded-xl border-border/60 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="smtp_pass" className="text-xs font-medium text-muted-foreground">
                      SMTP Password / App Secret
                    </Label>
                    <div className="relative">
                      <Input
                        id="smtp_pass"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••••••••"
                        value={formData.smtp_pass}
                        onChange={(e) => setFormData({ ...formData, smtp_pass: e.target.value })}
                        className="rounded-xl border-border/60 font-mono text-xs pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notification Automation Triggers */}
            <Card className="rounded-3xl border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  Automated Notification Rules & Triggers
                </CardTitle>
                <CardDescription>
                  Specify which events trigger real-time email dispatch.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">Quote Inquiries</div>
                      <p className="text-xs text-muted-foreground">
                        Alert admin immediately whenever a client submits a smart calculator estimate.
                      </p>
                    </div>
                    <Switch
                      checked={formData.notify_on_quote}
                      onCheckedChange={(checked) => setFormData({ ...formData, notify_on_quote: checked })}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">Contact Messages</div>
                      <p className="text-xs text-muted-foreground">
                        Alert admin when a general contact inquiry or consultation request is received.
                      </p>
                    </div>
                    <Switch
                      checked={formData.notify_on_contact}
                      onCheckedChange={(checked) => setFormData({ ...formData, notify_on_contact: checked })}
                    />
                  </div>

                  <div className="flex items-start justify-between gap-3 p-4 rounded-2xl border border-border/60 bg-muted/20">
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">Customer Auto-Reply</div>
                      <p className="text-xs text-muted-foreground">
                        Automatically email the customer a branded receipt and initial budget summary.
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_reply_to_customer}
                      onCheckedChange={(checked) => setFormData({ ...formData, auto_reply_to_customer: checked })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Test Email & Diagnostic Verification Card */}
            <Card className="rounded-3xl border-primary/20 bg-card shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Send className="h-4 w-4 text-primary" />
                  Live Test Email & Diagnostics
                </CardTitle>
                <CardDescription>
                  Send a live branded test email to verify that your credentials and API keys are functioning.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <div className="flex-1">
                    <Input
                      type="email"
                      placeholder="Enter recipient email address..."
                      value={testRecipient}
                      onChange={(e) => setTestRecipient(e.target.value)}
                      className="rounded-xl border-border/60 font-mono text-xs"
                    />
                  </div>
                  <Button
                    onClick={handleSendTestEmail}
                    disabled={isSendingTest}
                    className="rounded-full gap-2 shrink-0 shadow-md shadow-primary/20"
                  >
                    {isSendingTest ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send Test Email
                  </Button>
                </div>

                {testResult && (
                  <div
                    className={`p-4 rounded-2xl border text-sm flex items-start gap-3 transition-all ${
                      testResult.success
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-destructive/30 bg-destructive/10 text-destructive"
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-5 w-5 shrink-0 text-destructive mt-0.5" />
                    )}
                    <div className="space-y-1">
                      <div className="font-semibold">
                        {testResult.success ? "Test Email Delivered Successfully!" : "Dispatch Test Failed"}
                      </div>
                      <p className="text-xs opacity-90">{testResult.message}</p>
                      {testResult.timestamp && (
                        <p className="text-[10px] opacity-70">Verified at: {testResult.timestamp}</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bottom Save Bar */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/40">
              <Button
                variant="outline"
                className="rounded-full gap-2 border-border/80"
                onClick={() => setFormData(DEFAULT_SETTINGS)}
              >
                <RefreshCw className="h-4 w-4" /> Reset
              </Button>
              <Button
                className="rounded-full gap-2 px-6 shadow-lg shadow-primary/25"
                onClick={handleSaveSmtp}
                disabled={isSavingSmtp}
              >
                {isSavingSmtp ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          </TabsContent>

          {/* TAB 2: PROFILE & SECURITY */}
          <TabsContent value="profile" className="space-y-6">
            {/* Profile Information & Avatar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Avatar & Quick Info */}
              <Card className="rounded-3xl border-border/60 md:col-span-1">
                <CardHeader className="text-center pb-2">
                  <CardTitle className="text-base font-semibold">Profile Photo</CardTitle>
                  <CardDescription className="text-xs">Your public avatar and identity</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center p-6 pt-2 space-y-4">
                  <div className="relative group">
                    <Avatar className="h-28 w-28 ring-4 ring-primary/20 border-2 border-background shadow-xl">
                      <AvatarImage src={avatarUrl} alt={fullName || "User"} className="object-cover" />
                      <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-2xl font-bold">
                        {getInitials(fullName, profileEmail)}
                      </AvatarFallback>
                    </Avatar>

                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                      className="absolute bottom-0 right-0 p-2.5 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-110 active:scale-95 transition-all"
                      title="Upload new avatar"
                    >
                      {isUploadingAvatar ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarFileChange}
                  />

                  <div className="text-center space-y-1">
                    <div className="font-bold text-base">{fullName || "Admin Profile"}</div>
                    <div className="text-xs text-muted-foreground">{profileEmail}</div>
                    <div className="pt-2">
                      <Badge variant="outline" className="gap-1 border-primary/40 text-primary bg-primary/5">
                        <ShieldCheck className="h-3.5 w-3.5" /> {roleLabel}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-full text-xs flex-1 gap-1 border-border/70"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingAvatar}
                    >
                      <Upload className="h-3.5 w-3.5" /> Upload
                    </Button>
                    {avatarUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setAvatarUrl("")}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Remove
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Right Column: Profile Edit Form */}
              <Card className="rounded-3xl border-border/60 md:col-span-2">
                <CardHeader>
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <UserIcon className="h-4 w-4 text-primary" />
                    Personal Information
                  </CardTitle>
                  <CardDescription>
                    Update your display name, contact email, and profile avatar URL.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="prof_name" className="text-xs font-medium text-muted-foreground">
                      Full Name / Display Name
                    </Label>
                    <Input
                      id="prof_name"
                      placeholder="e.g. Abdul Rehman"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="rounded-xl border-border/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof_email" className="text-xs font-medium text-muted-foreground flex items-center justify-between">
                      <span>Account Email</span>
                      <span className="text-[10px] text-muted-foreground">Primary Auth Login</span>
                    </Label>
                    <Input
                      id="prof_email"
                      type="email"
                      value={profileEmail}
                      disabled
                      className="rounded-xl border-border/60 font-mono text-xs bg-muted/40 cursor-not-allowed opacity-80"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Account email is managed by Supabase authentication security.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="prof_avatar" className="text-xs font-medium text-muted-foreground">
                      Avatar Image URL (Optional)
                    </Label>
                    <Input
                      id="prof_avatar"
                      placeholder="https://..."
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      className="rounded-xl border-border/60 font-mono text-xs"
                    />
                  </div>

                  <div className="pt-3 flex justify-end">
                    <Button
                      onClick={handleSaveProfile}
                      disabled={isSavingProfile}
                      className="rounded-full gap-2 px-6 shadow-md shadow-primary/20"
                    >
                      {isSavingProfile ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save Profile Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Change Password Card */}
            <Card className="rounded-3xl border-border/60">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Security & Password
                </CardTitle>
                <CardDescription>
                  Change your administrator login password to keep your dashboard secure.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 max-w-xl">
                <div className="space-y-1.5">
                  <Label htmlFor="new_password" className="text-xs font-medium text-muted-foreground">
                    New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? "text" : "password"}
                      placeholder="At least 6 characters..."
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl border-border/60 font-mono text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="confirm_password" className="text-xs font-medium text-muted-foreground">
                    Confirm New Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Re-enter new password..."
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-xl border-border/60 font-mono text-xs pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {newPassword.length > 0 && (
                  <div className="text-xs flex items-center gap-1.5">
                    {newPassword === confirmPassword ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                      </span>
                    ) : (
                      <span className="text-amber-400 flex items-center gap-1">
                        <AlertCircle className="h-3.5 w-3.5" /> Passwords do not match
                      </span>
                    )}
                  </div>
                )}

                <div className="pt-2">
                  <Button
                    onClick={handleUpdatePassword}
                    disabled={isUpdatingPassword || !newPassword || newPassword !== confirmPassword}
                    className="rounded-full gap-2 px-6 shadow-md shadow-primary/20"
                  >
                    {isUpdatingPassword ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lock className="h-4 w-4" />
                    )}
                    Update Password
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Details & Session Card */}
            <Card className="rounded-3xl border-border/60">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-primary" />
                  Account Details & Active Session
                </CardTitle>
                <CardDescription>
                  Authenticated session information and quick sign out.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Role & Access
                    </div>
                    <div className="font-semibold text-sm capitalize">{roleLabel}</div>
                    <p className="text-[11px] text-muted-foreground">Full Administrative Access</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Fingerprint className="h-3.5 w-3.5 text-primary" /> User Identifier
                    </div>
                    <div className="font-mono text-xs truncate">{user?.id || "N/A"}</div>
                    <p className="text-[11px] text-muted-foreground">Supabase Auth UID</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-border/60 bg-muted/20 space-y-1">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-primary" /> Created Date
                    </div>
                    <div className="font-semibold text-xs">
                      {user?.created_at ? new Date(user.created_at).toLocaleDateString() : "Active"}
                    </div>
                    <p className="text-[11px] text-muted-foreground">Account Genesis</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 rounded-2xl border border-destructive/20 bg-destructive/5">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-sm text-destructive">Sign Out of Admin Console</div>
                    <div className="text-xs text-muted-foreground">
                      Safely terminate your authenticated administration session.
                    </div>
                  </div>
                  <Button
                    variant="destructive"
                    className="rounded-full gap-1.5"
                    onClick={() => signOut().then(() => navigate({ to: "/login" }))}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
