import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, Check, X, Briefcase, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { BrandLogo } from "@/components/BrandLogo";
import { DeskLamp, type LampState } from "@/components/DeskLamp";
import { cn } from "@/lib/utils";

// ── VALIDATION SCHEMAS (unchanged from original) ─────────────────────────────
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── PASSWORD STRENGTH (unchanged from original) ───────────────────────────────
const getPasswordStrength = (password: string): { score: number; label: string } => {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  if (score < 40) return { score, label: "Weak" };
  if (score < 70) return { score, label: "Fair" };
  if (score < 90) return { score, label: "Good" };
  return { score, label: "Strong" };
};

type UserRole = "talent" | "employer" | null;

// ── SHARED STYLE CONSTANTS ────────────────────────────────────────────────────
const PAGE_BG = "hsl(222, 25%, 4%)";
const CARD_BG = "hsl(222, 25%, 8%)";
const CARD_BORDER = "hsl(222, 20%, 15%)";
const INPUT_BG = "hsl(222, 25%, 11%)";
const INPUT_BORDER = "hsl(222, 20%, 18%)";
const EMERALD = "hsl(158, 75%, 40%)";
const BLUE = "hsl(222, 80%, 60%)";
const AMBER_GLOW = "rgba(245, 166, 35, 0.14)";

// ── COMPONENT ─────────────────────────────────────────────────────────────────
const Auth = () => {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role") as UserRole;

  const [selectedRole, setSelectedRole] = useState<UserRole>(roleFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [lampState, setLampState] = useState<LampState>("off");

  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);

  const { signUp, signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation();

  // Password validation (unchanged)
  const passwordChecks = useMemo(
    () => ({
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecial: /[^A-Za-z0-9]/.test(password),
    }),
    [password]
  );
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  // Redirect if already authenticated (unchanged)
  useEffect(() => {
    if (loading) return;
    if (!user) return;
    const fromPath = (locationState.state as any)?.from?.pathname;
    navigate(fromPath || "/profile-setup", { replace: true });
  }, [loading, user, locationState.state, navigate]);

  // ── LAMP FOCUS HANDLERS ────────────────────────────────────────────────────
  const handleEmailFocus = useCallback(() => setLampState("warm"), []);
  const handlePasswordFocus = useCallback(() => setLampState("on"), []);
  const handleInputBlur = useCallback(() => {
    // Small delay so focus can transfer to next field before dimming
    setTimeout(() => {
      const active = document.activeElement as HTMLElement | null;
      const activeId = active?.id ?? "";
      if (activeId.includes("password")) setLampState("on");
      else if (activeId.includes("email")) setLampState("warm");
      else setLampState("off");
    }, 80);
  }, []);

  // ── AUTH HANDLERS (logic identical to original) ───────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = signupSchema.parse({ email, password, phone });
      setIsLoading(true);

      const { error } = await signUp(validated.email, validated.password, validated.phone);
      if (error) { toast.error(error.message); return; }

      const { data: { user: newUser } } = await supabase.auth.getUser();
      if (newUser && selectedRole) {
        const roleToAssign = selectedRole === "employer" ? "employer" : "talent";
        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: newUser.id, role: roleToAssign });
        if (roleError) console.error("Role assignment failed:", roleError.message);

        const { error: walletError } = await supabase
          .from("wallets")
          .insert({ user_id: newUser.id, balance_minor_units: 0, currency: "USD" });
        if (walletError) console.error("Wallet creation failed:", walletError.message);

        const { error: contactError } = await supabase
          .from("profile_private")
          .upsert(
            { user_id: newUser.id, email: validated.email, phone_number: validated.phone || null },
            { onConflict: "user_id" }
          );
        if (contactError) console.error("Contact info save failed:", contactError.message);
      }

      setLampState("on"); // brief success flash
      toast.success("Account created! Let's complete your profile.");
      navigate("/profile-setup");
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
      else { console.error(err); toast.error("Failed to create account. Please try again."); }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = signinSchema.parse({ email, password });
      setIsLoading(true);
      const { error } = await signIn(validated.email, validated.password);
      if (error) toast.error(error.message);
      else { setLampState("on"); toast.success("Welcome back!"); }
    } catch (err) {
      if (err instanceof z.ZodError) toast.error(err.errors[0].message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) toast.error(error.message);
      else { toast.success("Password reset email sent! Check your inbox."); setShowReset(false); setResetEmail(""); }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // ── PASSWORD STRENGTH INDICATOR (unchanged logic) ─────────────────────────
  const PasswordStrengthIndicator = () =>
    password ? (
      <div className="space-y-2 mt-2">
        <div className="flex items-center gap-2">
          <Progress value={passwordStrength.score} className="h-1.5 flex-1" />
          <span
            className={cn("text-xs font-medium w-12 text-right", {
              "text-destructive": passwordStrength.score < 40,
              "text-yellow-500": passwordStrength.score >= 40 && passwordStrength.score < 70,
              "text-blue-400": passwordStrength.score >= 70 && passwordStrength.score < 90,
              "text-emerald-400": passwordStrength.score >= 90,
            })}
          >
            {passwordStrength.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-y-1 gap-x-3 text-xs">
          {(
            [
              { key: "minLength", label: "8+ characters" },
              { key: "hasUppercase", label: "Uppercase" },
              { key: "hasLowercase", label: "Lowercase" },
              { key: "hasNumber", label: "Number" },
              { key: "hasSpecial", label: "Special char" },
            ] as const
          ).map(({ key, label }) => (
            <div
              key={key}
              className={cn(
                "flex items-center gap-1",
                passwordChecks[key] ? "text-emerald-400" : "text-muted-foreground"
              )}
            >
              {passwordChecks[key] ? <Check className="w-3 h-3 shrink-0" /> : <X className="w-3 h-3 shrink-0" />}
              {label}
            </div>
          ))}
        </div>
      </div>
    ) : null;

  // ── INPUT STYLE HELPER ─────────────────────────────────────────────────────
  const inputStyle = {
    background: INPUT_BG,
    borderColor: INPUT_BORDER,
  };

  // ── ROLE SELECTION SCREEN ─────────────────────────────────────────────────
  if (!selectedRole) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden"
        style={{ background: PAGE_BG }}
      >
        {/* Background gradient */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 40% at 50% -10%, hsl(222,80%,20%,0.45), transparent)",
          }}
        />

        <div className="relative z-10 w-full max-w-[440px]">
          {/* Brand */}
          <div className="flex flex-col items-center mb-8">
            <BrandLogo asLink size="lg" tagline className="justify-center" />
          </div>

          {/* Lamp — decorative, always warm on this screen */}
          <div className="flex justify-center mb-5">
            <DeskLamp state="warm" className="w-24 h-28 opacity-75" />
          </div>

          {/* Role card */}
          <div
            className="rounded-2xl p-7 space-y-3"
            style={{ background: CARD_BG, border: `1px solid ${CARD_BORDER}`, backdropFilter: "blur(20px)" }}
          >
            <div className="text-center mb-5">
              <h1 className="font-display font-bold text-xl text-foreground">Join SkillLink Africa</h1>
              <p className="text-xs text-muted-foreground mt-1">Choose how you want to use the platform</p>
            </div>

            {/* Talent button */}
            <button
              onClick={() => setSelectedRole("talent")}
              className="w-full p-4 rounded-xl text-left transition-all duration-200 group"
              style={{ border: `1px solid ${CARD_BORDER}`, background: "hsl(222,25%,10%)" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(26,204,130,0.35)";
                el.style.background = "rgba(26,204,130,0.06)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = CARD_BORDER;
                el.style.background = "hsl(222,25%,10%)";
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${EMERALD}22` }}>
                  <User className="w-4 h-4" style={{ color: EMERALD }} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">I'm a Talent</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Looking for gigs, jobs, and freelance work</p>
                </div>
              </div>
            </button>

            {/* Employer button */}
            <button
              onClick={() => setSelectedRole("employer")}
              className="w-full p-4 rounded-xl text-left transition-all duration-200 group"
              style={{ border: `1px solid ${CARD_BORDER}`, background: "hsl(222,25%,10%)" }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = "rgba(100,140,240,0.35)";
                el.style.background = "rgba(100,140,240,0.06)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = CARD_BORDER;
                el.style.background = "hsl(222,25%,10%)";
              }}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg shrink-0" style={{ background: `${BLUE}22` }}>
                  <Briefcase className="w-4 h-4" style={{ color: BLUE }} />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">I'm Hiring</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Looking to hire talented professionals</p>
                </div>
              </div>
            </button>

            <p className="text-center text-xs text-muted-foreground pt-1">
              Already have an account?{" "}
              <button
                onClick={() => setSelectedRole("talent")}
                className="font-medium transition-colors"
                style={{ color: EMERALD }}
              >
                Sign In
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN AUTH SCREEN ──────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: PAGE_BG }}
    >
      {/* Static deep background gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 90% 50% at 50% -8%, hsl(222,80%,18%,0.4), transparent)",
        }}
      />

      {/* Warm ambient glow that intensifies with lamp state */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 50% 70% at 22% 45%, ${
            lampState === "on"
              ? AMBER_GLOW
              : lampState === "warm"
              ? "rgba(245,166,35,0.055)"
              : "transparent"
          }, transparent)`,
          transition: "background 0.9s ease",
        }}
      />

      {/* Main content — two-column on desktop, stacked on mobile */}
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col lg:flex-row items-center gap-8 lg:gap-14">

        {/* ── LEFT: Lamp + branding ── */}
        <div className="flex flex-col items-center lg:items-start lg:flex-1">
          {/* Logo */}
          <div className="mb-8 lg:mb-10">
            <BrandLogo asLink size="lg" tagline />
          </div>

          {/* Lamp */}
          <DeskLamp
            state={lampState}
            className="w-36 h-44 lg:w-52 lg:h-60"
          />

          {/* Brand text — desktop only */}
          <div className="hidden lg:block mt-7 max-w-xs space-y-3">
            <p className="text-sm leading-relaxed" style={{ color: "hsl(220,10%,55%)" }}>
              Africa's talent infrastructure —{" "}
              <span className="text-foreground font-medium">Connect. Work. Grow.</span>
            </p>
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: EMERALD }} />
              <p className="text-xs" style={{ color: "hsl(220,10%,45%)" }}>
                Trusted by 5,000+ professionals across Africa
              </p>
            </div>
          </div>
        </div>

        {/* ── RIGHT: Auth form card ── */}
        <div className="w-full lg:w-[420px] shrink-0">
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: `${CARD_BG}f0`,
              border: `1px solid ${
                lampState !== "off" ? "rgba(245,166,35,0.14)" : CARD_BORDER
              }`,
              backdropFilter: "blur(20px)",
              boxShadow:
                lampState === "on"
                  ? "0 0 70px rgba(245,166,35,0.07), 0 24px 48px rgba(0,0,0,0.45)"
                  : "0 24px 48px rgba(0,0,0,0.4)",
              transition: "border-color 0.7s ease, box-shadow 0.8s ease",
            }}
          >
            {/* Card header */}
            <div
              className="px-7 pt-7 pb-5"
              style={{ borderBottom: `1px solid ${CARD_BORDER}` }}
            >
              <button
                onClick={() => setSelectedRole(null)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-5"
                aria-label="Change role"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Change role
              </button>

              <div className="flex items-center gap-3">
                <div
                  className="p-2 rounded-lg shrink-0"
                  style={{
                    background:
                      selectedRole === "talent" ? `${EMERALD}18` : `${BLUE}18`,
                  }}
                >
                  {selectedRole === "talent" ? (
                    <User className="w-5 h-5" style={{ color: EMERALD }} />
                  ) : (
                    <Briefcase className="w-5 h-5" style={{ color: BLUE }} />
                  )}
                </div>
                <div>
                  <h2 className="font-display font-bold text-lg text-foreground leading-tight">
                    {selectedRole === "talent" ? "Talent Account" : "Employer Account"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {selectedRole === "talent"
                      ? "Sign up in seconds, complete your profile next"
                      : "Create your account, set up your company next"}
                  </p>
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className="px-7 py-6 space-y-5">
              {/* Google OAuth button */}
              <button
                type="button"
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-200"
                style={{
                  background: "hsl(222,25%,11%)",
                  border: `1px solid ${INPUT_BORDER}`,
                  color: "hsl(210,20%,88%)",
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "hsl(222,25%,14%)";
                  el.style.borderColor = "hsl(222,20%,24%)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.background = "hsl(222,25%,11%)";
                  el.style.borderColor = INPUT_BORDER;
                }}
                onClick={async () => {
                  const { lovable } = await import("@/integrations/lovable/index");
                  const r = await lovable.auth.signInWithOAuth("google", {
                    redirect_uri: window.location.origin,
                  });
                  if (r.error) toast.error("Google sign-in failed");
                }}
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full" style={{ borderTop: `1px solid ${CARD_BORDER}` }} />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span
                    className="px-3 text-muted-foreground"
                    style={{ background: CARD_BG }}
                  >
                    or with email
                  </span>
                </div>
              </div>

              {/* Tabs */}
              <Tabs defaultValue="signin" className="w-full">
                <TabsList
                  className="grid w-full grid-cols-2 mb-4"
                  style={{ background: "hsl(222,25%,11%)" }}
                >
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                {/* ── SIGN IN ── */}
                <TabsContent value="signin">
                  {!showReset ? (
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="signin-email" className="text-xs text-muted-foreground">
                          Email address
                        </Label>
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onFocus={handleEmailFocus}
                          onBlur={handleInputBlur}
                          required
                          style={inputStyle}
                          className="focus:border-[hsl(158,75%,40%)] transition-colors"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="signin-password" className="text-xs text-muted-foreground">
                            Password
                          </Label>
                          <button
                            type="button"
                            onClick={() => setShowReset(true)}
                            className="text-xs transition-colors"
                            style={{ color: EMERALD }}
                          >
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onFocus={handlePasswordFocus}
                            onBlur={handleInputBlur}
                            required
                            style={inputStyle}
                            className="pr-10 focus:border-[hsl(158,75%,40%)] transition-colors"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full font-medium"
                        disabled={isLoading}
                      >
                        {isLoading ? "Signing in…" : "Sign In"}
                      </Button>
                    </form>
                  ) : (
                    <form onSubmit={handleResetPassword} className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="reset-email" className="text-xs text-muted-foreground">
                          Email address
                        </Label>
                        <Input
                          id="reset-email"
                          type="email"
                          placeholder="you@example.com"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                          style={inputStyle}
                        />
                        <p className="text-xs text-muted-foreground">
                          We'll send you a link to reset your password
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setShowReset(false)}
                        >
                          Back
                        </Button>
                        <Button type="submit" className="flex-1" disabled={isLoading}>
                          {isLoading ? "Sending…" : "Send Reset Link"}
                        </Button>
                      </div>
                    </form>
                  )}
                </TabsContent>

                {/* ── SIGN UP ── */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email" className="text-xs text-muted-foreground">
                        Email address *
                      </Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        onFocus={handleEmailFocus}
                        onBlur={handleInputBlur}
                        required
                        style={inputStyle}
                        className="focus:border-[hsl(158,75%,40%)] transition-colors"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-phone" className="text-xs text-muted-foreground">
                        Phone number (optional)
                      </Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        placeholder="+232 XX XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        style={inputStyle}
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password" className="text-xs text-muted-foreground">
                        Password *
                      </Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onFocus={handlePasswordFocus}
                          onBlur={handleInputBlur}
                          required
                          style={inputStyle}
                          className={cn(
                            "pr-10 focus:border-[hsl(158,75%,40%)] transition-colors",
                            password && !isPasswordValid && "border-destructive"
                          )}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <PasswordStrengthIndicator />
                    </div>

                    <Button
                      type="submit"
                      className="w-full font-medium"
                      disabled={isLoading || !isPasswordValid}
                    >
                      {isLoading ? "Creating account…" : "Create Account"}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                      You'll complete your profile in the next step
                    </p>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
