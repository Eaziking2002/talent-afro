import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, Award, CheckCircle, ExternalLink, Star } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function TalentCertifications() {
  const [uploadUrl, setUploadUrl] = useState("");
  const [certificateName, setCertificateName] = useState("");
  const [issueDate, setIssueDate] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: certifications } = useQuery({
    queryKey: ["certifications", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("certifications")
        .select("*")
        .eq("talent_id", profile.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const { data: assessments } = useQuery({
    queryKey: ["assessments", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("skill_assessments")
        .select(`
          *,
          profiles:assessed_by (full_name)
        `)
        .eq("talent_id", profile.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const uploadCertificate = useMutation({
    mutationFn: async () => {
      if (!profile?.id) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("certifications")
        .insert({
          talent_id: profile.id,
          certificate_name: certificateName,
          certificate_url: uploadUrl,
          issue_date: issueDate || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certifications"] });
      toast({
        title: "Certificate uploaded!",
        description: "Your certificate has been added to your profile.",
      });
      setCertificateName("");
      setUploadUrl("");
      setIssueDate("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (certificateName && uploadUrl) {
      uploadCertificate.mutate();
    }
  };

  const verifiedCount = certifications?.filter(c => c.verified).length || 0;
  const avgScore = assessments?.reduce((sum, a) => sum + a.assessment_score, 0) / (assessments?.length || 1) || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Certifications & Skills</h1>
            <p className="text-muted-foreground">
              Showcase your expertise with verified certifications and skill assessments
            </p>
          </div>

          {/* Stats */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Certificates</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{certifications?.length || 0}</div>
                <p className="text-xs text-muted-foreground">{verifiedCount} verified</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Assessments</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{assessments?.length || 0}</div>
                <p className="text-xs text-muted-foreground">completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Score</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgScore.toFixed(0)}%</div>
                <p className="text-xs text-muted-foreground">across all tests</p>
              </CardContent>
            </Card>
          </div>

          {/* Upload Form */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Certificate</CardTitle>
              <CardDescription>Add a new certification to your profile</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Certificate Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., AWS Certified Developer"
                    value={certificateName}
                    onChange={(e) => setCertificateName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="url">Certificate URL</Label>
                  <Input
                    id="url"
                    type="url"
                    placeholder="https://..."
                    value={uploadUrl}
                    onChange={(e) => setUploadUrl(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Issue Date (Optional)</Label>
                  <Input
                    id="date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={uploadCertificate.isPending}>
                  <Upload className="h-4 w-4 mr-2" />
                  {uploadCertificate.isPending ? "Uploading..." : "Upload Certificate"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Certifications List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Certifications</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {certifications?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No certifications yet. Upload your first certificate!
                  </p>
                )}

                {certifications?.map((cert) => (
                  <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Award className="h-5 w-5 text-primary" />
                        <p className="font-medium">{cert.certificate_name}</p>
                        {cert.verified && <CheckCircle className="h-4 w-4 text-green-500" />}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {cert.issue_date && `Issued: ${new Date(cert.issue_date).toLocaleDateString()}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge variant={cert.verified ? "default" : "secondary"}>
                        {cert.verified ? "Verified" : "Pending"}
                      </Badge>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Skill Assessments */}
          <Card>
            <CardHeader>
              <CardTitle>Skill Assessments</CardTitle>
              <CardDescription>Tests completed by employers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {assessments?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No assessments yet. Employers can test your skills during contracts.
                  </p>
                )}

                {assessments?.map((assessment: any) => (
                  <div key={assessment.id} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{assessment.skill_name}</p>
                      <Badge variant="default">{assessment.assessment_score}%</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Assessed by: {assessment.profiles?.full_name}
                    </p>
                    {assessment.assessment_notes && (
                      <p className="text-sm mt-2">{assessment.assessment_notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
