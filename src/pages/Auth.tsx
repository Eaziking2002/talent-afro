import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { z } from "zod";
import { Eye, EyeOff, Check, X, Briefcase, User, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

// Strong password validation schema
const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const talentSignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().optional(),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  location: z.string().min(2, "Location is required"),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
  bio: z.string().max(500).optional(),
});

const employerSignupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: passwordSchema,
  phone: z.string().optional(),
  companyName: z.string().min(2, "Company name is required"),
  companyDescription: z.string().max(1000).optional(),
  website: z.string().url().optional().or(z.literal("")),
  linkedIn: z.string().optional(),
  twitter: z.string().optional(),
});

const signinSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// Password strength checker
const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
  let score = 0;
  if (password.length >= 8) score += 20;
  if (password.length >= 12) score += 10;
  if (/[A-Z]/.test(password)) score += 20;
  if (/[a-z]/.test(password)) score += 20;
  if (/[0-9]/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 15;
  
  if (score < 40) return { score, label: "Weak", color: "bg-destructive" };
  if (score < 70) return { score, label: "Fair", color: "bg-yellow-500" };
  if (score < 90) return { score, label: "Good", color: "bg-blue-500" };
  return { score, label: "Strong", color: "bg-green-500" };
};

type UserRole = "talent" | "employer" | null;

const Auth = () => {
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get("role") as UserRole;
  
  const [selectedRole, setSelectedRole] = useState<UserRole>(roleFromUrl);
  const [isLoading, setIsLoading] = useState(false);
  
  // Common fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [showReset, setShowReset] = useState(false);
  
  // Talent-specific fields
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [bio, setBio] = useState("");
  
  // Employer-specific fields
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [linkedIn, setLinkedIn] = useState("");
  const [twitter, setTwitter] = useState("");
  
  const { signUp, signIn, user, loading } = useAuth();
  const navigate = useNavigate();
  const locationState = useLocation();

  // Password validation state
  const passwordChecks = useMemo(() => ({
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password),
  }), [password]);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);
  const isPasswordValid = Object.values(passwordChecks).every(Boolean);

  // If the user is already authenticated, redirect away
  useEffect(() => {
    if (loading) return;
    if (!user) return;

    const fromPath = (locationState.state as any)?.from?.pathname;
    navigate(fromPath || "/", { replace: true });
  }, [loading, user, locationState.state, navigate]);

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim()) && skills.length < 10) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleTalentSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = talentSignupSchema.parse({ 
        email, password, phone, fullName, location, skills, bio 
      });
      setIsLoading(true);
      
      const { error } = await signUp(validated.email, validated.password, validated.phone);
      
      if (error) {
        toast.error(error.message);
        return;
      }

      // Get the newly created user
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (newUser) {
        // Create profile
        const { error: profileError } = await supabase
          .from("profiles")
          .insert({
            user_id: newUser.id,
            full_name: validated.fullName,
            bio: validated.bio || null,
            location: validated.location,
            skills: validated.skills,
          });

        if (profileError) throw profileError;

        // Assign talent role
        await supabase.from("user_roles").insert({
          user_id: newUser.id,
          role: "talent",
        });

        // Create wallet
        await supabase.from("wallets").insert({
          user_id: newUser.id,
          balance_minor_units: 0,
          currency: "USD",
        });
      }

      toast.success("Account created successfully!");
      navigate("/dashboard");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error(err);
        toast.error("Failed to create account. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployerSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const validated = employerSignupSchema.parse({ 
        email, password, phone, companyName, companyDescription, website, linkedIn, twitter 
      });
      setIsLoading(true);
      
      const { error } = await signUp(validated.email, validated.password, validated.phone);
      
      if (error) {
        toast.error(error.message);
        return;
      }

      // Get the newly created user
      const { data: { user: newUser } } = await supabase.auth.getUser();
      
      if (newUser) {
        // Create employer profile
        const { error: employerError } = await supabase
          .from("employers")
          .insert({
            user_id: newUser.id,
            company_name: validated.companyName,
            company_description: validated.companyDescription || null,
            website: validated.website || null,
          });

        if (employerError) throw employerError;

        // Assign employer role
        await supabase.from("user_roles").insert({
          user_id: newUser.id,
          role: "employer",
        });

        // Create wallet
        await supabase.from("wallets").insert({
          user_id: newUser.id,
          balance_minor_units: 0,
          currency: "USD",
        });
      }

      toast.success("Employer account created successfully!");
      navigate("/employer/dashboard");
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error(err);
        toast.error("Failed to create account. Please try again.");
      }
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
      
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      }
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

      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password reset email sent! Check your inbox.");
        setShowReset(false);
        setResetEmail("");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Role selection screen
  if (!selectedRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold">Join SkillLink Africa</CardTitle>
            <CardDescription>
              Choose how you want to use the platform
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <button
              onClick={() => setSelectedRole("talent")}
              className="w-full p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">I'm a Talent</h3>
                  <p className="text-sm text-muted-foreground">
                    Looking for gigs, jobs, and freelance opportunities
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedRole("employer")}
              className="w-full p-6 border-2 rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left group"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Briefcase className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg mb-1">I'm Hiring</h3>
                  <p className="text-sm text-muted-foreground">
                    Looking to hire talented professionals for my projects
                  </p>
                </div>
              </div>
            </button>

            <p className="text-center text-sm text-muted-foreground pt-4">
              Already have an account?{" "}
              <button 
                onClick={() => setSelectedRole("talent")} 
                className="text-primary hover:underline font-medium"
              >
                Sign In
              </button>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const PasswordStrengthIndicator = () => (
    password && (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Progress value={passwordStrength.score} className="h-2 flex-1" />
          <span className={`text-xs font-medium ${
            passwordStrength.score < 40 ? 'text-destructive' :
            passwordStrength.score < 70 ? 'text-yellow-600' :
            passwordStrength.score < 90 ? 'text-blue-600' : 'text-green-600'
          }`}>
            {passwordStrength.label}
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-1 text-xs">
          <div className={`flex items-center gap-1 ${passwordChecks.minLength ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passwordChecks.minLength ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            8+ characters
          </div>
          <div className={`flex items-center gap-1 ${passwordChecks.hasUppercase ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passwordChecks.hasUppercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Uppercase
          </div>
          <div className={`flex items-center gap-1 ${passwordChecks.hasLowercase ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passwordChecks.hasLowercase ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Lowercase
          </div>
          <div className={`flex items-center gap-1 ${passwordChecks.hasNumber ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passwordChecks.hasNumber ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Number
          </div>
          <div className={`flex items-center gap-1 ${passwordChecks.hasSpecial ? 'text-green-600' : 'text-muted-foreground'}`}>
            {passwordChecks.hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
            Special char
          </div>
        </div>
      </div>
    )
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <button 
            onClick={() => setSelectedRole(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-4 h-4" />
            Change role
          </button>
          <div className="flex items-center gap-2">
            {selectedRole === "talent" ? (
              <User className="w-6 h-6 text-primary" />
            ) : (
              <Briefcase className="w-6 h-6 text-primary" />
            )}
            <CardTitle className="text-2xl font-bold">
              {selectedRole === "talent" ? "Talent Account" : "Employer Account"}
            </CardTitle>
          </div>
          <CardDescription>
            {selectedRole === "talent" 
              ? "Create your profile to find gigs and opportunities" 
              : "Set up your company to start hiring talent"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            {/* Sign In Tab - Same for both roles */}
            <TabsContent value="signin">
              {!showReset ? (
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowReset(true)}
                        className="text-xs text-primary hover:underline"
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
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      placeholder="you@example.com"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
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
                      {isLoading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </div>
                </form>
              )}
            </TabsContent>
            
            {/* Sign Up Tab - Different for Talent vs Employer */}
            <TabsContent value="signup">
              {selectedRole === "talent" ? (
                // Talent Sign Up Form
                <form onSubmit={handleTalentSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input
                      id="fullName"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email *</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      placeholder="+232 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input
                      id="location"
                      placeholder="Freetown, Sierra Leone"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="skills">Your Skills *</Label>
                    <div className="flex gap-2">
                      <Input
                        id="skills"
                        placeholder="e.g., Graphic Design"
                        value={currentSkill}
                        onChange={(e) => setCurrentSkill(e.target.value)}
                        onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                      />
                      <Button type="button" onClick={addSkill} variant="secondary" size="sm">
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs py-1 px-2">
                          {skill}
                          <button
                            type="button"
                            onClick={() => removeSkill(skill)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio (Optional)</Label>
                    <Textarea
                      id="bio"
                      placeholder="Tell employers about yourself..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={2}
                      maxLength={500}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={password && !isPasswordValid ? "border-destructive" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthIndicator />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !isPasswordValid || skills.length === 0}
                  >
                    {isLoading ? "Creating account..." : "Create Talent Account"}
                  </Button>
                </form>
              ) : (
                // Employer Sign Up Form
                <form onSubmit={handleEmployerSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input
                      id="companyName"
                      placeholder="Your Company Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employer-email">Business Email *</Label>
                    <Input
                      id="employer-email"
                      type="email"
                      placeholder="contact@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employer-phone">Phone Number (Optional)</Label>
                    <Input
                      id="employer-phone"
                      type="tel"
                      placeholder="+232 XX XXX XXXX"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="website">Company Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      placeholder="https://yourcompany.com"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="companyDescription">Company Description (Optional)</Label>
                    <Textarea
                      id="companyDescription"
                      placeholder="Tell talent about your company..."
                      value={companyDescription}
                      onChange={(e) => setCompanyDescription(e.target.value)}
                      rows={2}
                      maxLength={1000}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="linkedIn">LinkedIn (Optional)</Label>
                      <Input
                        id="linkedIn"
                        placeholder="linkedin.com/company/..."
                        value={linkedIn}
                        onChange={(e) => setLinkedIn(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter/X (Optional)</Label>
                      <Input
                        id="twitter"
                        placeholder="@yourcompany"
                        value={twitter}
                        onChange={(e) => setTwitter(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="employer-password">Password *</Label>
                    <div className="relative">
                      <Input
                        id="employer-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className={password && !isPasswordValid ? "border-destructive" : ""}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPassword ? (
                          <EyeOff className="w-4 h-4 text-muted-foreground" />
                        ) : (
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    <PasswordStrengthIndicator />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || !isPasswordValid || !companyName}
                  >
                    {isLoading ? "Creating account..." : "Create Employer Account"}
                  </Button>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;