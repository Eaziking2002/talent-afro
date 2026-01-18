import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Eye, EyeOff, Check, X } from "lucide-react";

// Password strength checker
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

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
  const passwordsMatch = password === confirmPassword;

  useEffect(() => {
    // Check if user has a valid session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        toast.error("Invalid or expired reset link");
        navigate("/auth");
      }
    });
  }, [navigate]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.error("Passwords don't match");
      return;
    }

    if (!isPasswordValid) {
      toast.error("Password doesn't meet security requirements");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      toast.success("Password updated successfully!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Reset Password</CardTitle>
          <CardDescription>Enter your new password below</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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
              
              {/* Password strength indicator */}
              {password && (
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
                  
                  {/* Password requirements checklist */}
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
              )}
              
              {!password && (
                <p className="text-xs text-muted-foreground">
                  Use at least 8 characters with uppercase, lowercase, numbers & symbols
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm Password</Label>
              <Input
                id="confirm"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className={confirmPassword && !passwordsMatch ? "border-destructive" : ""}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <X className="w-3 h-3" /> Passwords don't match
                </p>
              )}
              {confirmPassword && passwordsMatch && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <Check className="w-3 h-3" /> Passwords match
                </p>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !isPasswordValid || !passwordsMatch}
            >
              {loading ? "Updating..." : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;