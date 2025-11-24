import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { CheckCircle, Upload, Award, FileText, User } from "lucide-react";

export default function TalentVerification() {
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    type: "identity",
    documents: [] as string[],
    additionalInfo: ""
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (profileId) {
      fetchVerificationData();
    }
  }, [profileId]);

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) setProfileId(data.id);
  };

  const fetchVerificationData = async () => {
    const { data: reqData } = await supabase
      .from("verification_requests")
      .select("*")
      .eq("talent_id", profileId)
      .order("created_at", { ascending: false });

    const { data: badgeData } = await supabase
      .from("verification_badges")
      .select("*")
      .eq("talent_id", profileId);

    if (reqData) setRequests(reqData);
    if (badgeData) setBadges(badgeData);
  };

  const handleSubmit = async () => {
    if (!profileId) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("verification_requests")
        .insert({
          talent_id: profileId,
          request_type: formData.type,
          verification_data: { additionalInfo: formData.additionalInfo },
          documents: formData.documents,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Verification request submitted!");
      setFormData({ type: "identity", documents: [], additionalInfo: "" });
      fetchVerificationData();
    } catch (error: any) {
      toast.error("Failed to submit request: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationIcon = (type: string) => {
    switch (type) {
      case "identity": return <User className="h-5 w-5" />;
      case "skill": return <Award className="h-5 w-5" />;
      case "portfolio": return <FileText className="h-5 w-5" />;
      case "blue_tick": return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <CheckCircle className="h-5 w-5" />;
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "bronze": return "bg-orange-600";
      case "silver": return "bg-gray-400";
      case "gold": return "bg-yellow-500";
      case "platinum": return "bg-purple-600";
      default: return "bg-blue-500";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Talent Verification</h1>
          <p className="text-muted-foreground">
            Get verified to build trust with employers
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Request Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Request Verification</CardTitle>
              <CardDescription>
                Submit documents for verification review
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Verification Type</Label>
                <select
                  className="w-full mt-1 rounded-md border border-input bg-background px-3 py-2"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="identity">Identity Verification</option>
                  <option value="skill">Skill Assessment</option>
                  <option value="portfolio">Portfolio Review</option>
                  <option value="blue_tick">Blue Tick (Premium)</option>
                </select>
              </div>

              <div>
                <Label>Additional Information</Label>
                <Textarea
                  value={formData.additionalInfo}
                  onChange={(e) => setFormData({ ...formData, additionalInfo: e.target.value })}
                  placeholder="Provide any relevant details..."
                  rows={4}
                />
              </div>

              <div>
                <Label>Document Upload</Label>
                <div className="mt-2 border-2 border-dashed border-border rounded-lg p-8 text-center">
                  <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mb-2">
                    Click to upload documents
                  </p>
                  <Input
                    type="file"
                    multiple
                    className="max-w-xs mx-auto"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      // In production, upload files to storage and get URLs
                      console.log("Files selected:", files);
                    }}
                  />
                </div>
              </div>

              <Button onClick={handleSubmit} disabled={loading} className="w-full">
                Submit Request
              </Button>
            </CardContent>
          </Card>

          {/* Current Badges */}
          <Card>
            <CardHeader>
              <CardTitle>Your Badges</CardTitle>
              <CardDescription>Verified credentials</CardDescription>
            </CardHeader>
            <CardContent>
              {badges.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No badges yet
                </p>
              ) : (
                <div className="space-y-3">
                  {badges.map((badge) => (
                    <div
                      key={badge.id}
                      className="flex items-center gap-3 p-3 rounded-lg border"
                    >
                      <div className={`p-2 rounded-full ${getBadgeColor(badge.badge_level || "")}`}>
                        {getVerificationIcon(badge.badge_type)}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium capitalize">
                          {badge.badge_type.replace("_", " ")}
                        </p>
                        {badge.badge_level && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {badge.badge_level} Level
                          </p>
                        )}
                      </div>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Request History */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Request History</CardTitle>
            <CardDescription>Track your verification submissions</CardDescription>
          </CardHeader>
          <CardContent>
            {requests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No requests submitted yet
              </p>
            ) : (
              <div className="space-y-4">
                {requests.map((request) => (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      {getVerificationIcon(request.request_type)}
                      <div>
                        <p className="font-medium capitalize">
                          {request.request_type.replace("_", " ")}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(request.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge
                      variant={
                        request.status === "approved"
                          ? "default"
                          : request.status === "rejected"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {request.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
