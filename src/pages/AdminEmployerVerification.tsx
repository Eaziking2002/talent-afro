import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Building2, ExternalLink, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { VerificationBadge } from "@/components/VerificationBadge";

interface Employer {
  id: string;
  company_name: string;
  company_description: string | null;
  website: string | null;
  verified: boolean;
  verification_level: "unverified" | "basic" | "verified" | "premium";
  verification_date: string | null;
  trust_score: number;
  total_jobs_posted: number;
  successful_hires: number;
  verification_notes: string | null;
  created_at: string;
  user_id: string;
}

export default function AdminEmployerVerification() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmployer, setSelectedEmployer] = useState<Employer | null>(null);
  const [verificationNotes, setVerificationNotes] = useState("");
  const [verificationLevel, setVerificationLevel] = useState<"basic" | "verified" | "premium">("verified");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    checkAdminStatus();
    fetchEmployers();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (error || !data) {
      navigate("/");
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive",
      });
    }
  };

  const fetchEmployers = async () => {
    try {
      const { data, error } = await supabase
        .from("employers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEmployers((data || []) as Employer[]);
    } catch (error: any) {
      console.error("Error fetching employers:", error);
      toast({
        title: "Error",
        description: "Failed to fetch employers",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmployer = async (employer: Employer) => {
    if (!user) return;
    setIsVerifying(true);

    try {
      const { error } = await supabase
        .from("employers")
        .update({
          verified: true,
          verification_level: verificationLevel,
          verification_date: new Date().toISOString(),
          verified_by: user.id,
          verification_notes: verificationNotes,
        })
        .eq("id", employer.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `${employer.company_name} has been verified at ${verificationLevel} level`,
      });

      setSelectedEmployer(null);
      setVerificationNotes("");
      fetchEmployers();
    } catch (error: any) {
      console.error("Error verifying employer:", error);
      toast({
        title: "Error",
        description: "Failed to verify employer",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRejectVerification = async (employer: Employer) => {
    if (!user) return;
    setIsVerifying(true);

    try {
      const { error } = await supabase
        .from("employers")
        .update({
          verified: false,
          verification_level: "unverified",
          verification_notes: verificationNotes,
        })
        .eq("id", employer.id);

      if (error) throw error;

      toast({
        title: "Verification Rejected",
        description: `${employer.company_name} verification has been rejected`,
      });

      setSelectedEmployer(null);
      setVerificationNotes("");
      fetchEmployers();
    } catch (error: any) {
      console.error("Error rejecting verification:", error);
      toast({
        title: "Error",
        description: "Failed to reject verification",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const filterEmployers = (status: string) => {
    switch (status) {
      case "unverified":
        return employers.filter((e) => e.verification_level === "unverified");
      case "verified":
        return employers.filter((e) => ["basic", "verified", "premium"].includes(e.verification_level));
      default:
        return employers;
    }
  };

  const EmployerCard = ({ employer }: { employer: Employer }) => (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {employer.company_name}
            </CardTitle>
            <VerificationBadge 
              level={employer.verification_level} 
              trustScore={employer.trust_score}
              showScore={true}
            />
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setSelectedEmployer(employer);
                  setVerificationNotes(employer.verification_notes || "");
                }}
              >
                Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Verify {employer.company_name}</DialogTitle>
                <DialogDescription>
                  Review employer details and set verification level
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label>Company Name</Label>
                  <p className="text-sm font-medium">{employer.company_name}</p>
                </div>

                {employer.company_description && (
                  <div>
                    <Label>Description</Label>
                    <p className="text-sm text-muted-foreground">{employer.company_description}</p>
                  </div>
                )}

                {employer.website && (
                  <div>
                    <Label>Website</Label>
                    <a 
                      href={employer.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary flex items-center gap-1 hover:underline"
                    >
                      {employer.website} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Jobs Posted</Label>
                    <p className="text-2xl font-bold">{employer.total_jobs_posted}</p>
                  </div>
                  <div>
                    <Label>Successful Hires</Label>
                    <p className="text-2xl font-bold">{employer.successful_hires}</p>
                  </div>
                </div>

                <div>
                  <Label>Verification Level</Label>
                  <Select value={verificationLevel} onValueChange={(value: any) => setVerificationLevel(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="basic">Basic Verified</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="premium">Premium Verified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Verification Notes</Label>
                  <Textarea
                    placeholder="Add notes about this verification..."
                    value={verificationNotes}
                    onChange={(e) => setVerificationNotes(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleVerifyEmployer(employer)}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Verify
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => handleRejectVerification(employer)}
                    disabled={isVerifying}
                    className="flex-1"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>
          Member since {new Date(employer.created_at).toLocaleDateString()}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm">
          {employer.company_description && (
            <p className="text-muted-foreground line-clamp-2">{employer.company_description}</p>
          )}
          
          <div className="flex items-center justify-between pt-2">
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>{employer.total_jobs_posted} jobs</span>
              <span>{employer.successful_hires} hires</span>
            </div>
            {employer.verification_date && (
              <Badge variant="outline" className="text-xs">
                Verified {new Date(employer.verification_date).toLocaleDateString()}
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const stats = {
    total: employers.length,
    unverified: employers.filter((e) => e.verification_level === "unverified").length,
    verified: employers.filter((e) => ["basic", "verified", "premium"].includes(e.verification_level)).length,
    premium: employers.filter((e) => e.verification_level === "premium").length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Employer Verification</h1>
          <p className="text-muted-foreground">
            Review and verify employer accounts to build trust in the platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total Employers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                Unverified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.unverified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Verified
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.verified}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-purple-500" />
                Premium
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.premium}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All Employers</TabsTrigger>
            <TabsTrigger value="unverified">
              Unverified ({stats.unverified})
            </TabsTrigger>
            <TabsTrigger value="verified">
              Verified ({stats.verified})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {employers.map((employer) => (
                <EmployerCard key={employer.id} employer={employer} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="unverified" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterEmployers("unverified").map((employer) => (
                <EmployerCard key={employer.id} employer={employer} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="verified" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filterEmployers("verified").map((employer) => (
                <EmployerCard key={employer.id} employer={employer} />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}