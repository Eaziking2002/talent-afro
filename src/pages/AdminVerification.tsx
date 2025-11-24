import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { CheckCircle, XCircle, Award, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminVerification() {
  const [requests, setRequests] = useState<any[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [badgeDialog, setBadgeDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [selectedTalent, setSelectedTalent] = useState<string>("");
  const [badgeForm, setBadgeForm] = useState({
    badgeType: "identity",
    badgeLevel: "bronze"
  });

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data } = await supabase
      .from("verification_requests")
      .select(`
        *,
        profiles!verification_requests_talent_id_fkey (full_name, email)
      `)
      .order("created_at", { ascending: false });

    if (data) setRequests(data);
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedRequest) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("verification_requests")
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString()
        })
        .eq("id", selectedRequest.id);

      if (error) throw error;

      // If approved, create badge
      if (status === "approved") {
        await supabase
          .from("verification_badges")
          .insert({
            talent_id: selectedRequest.talent_id,
            badge_type: selectedRequest.request_type,
            badge_level: "bronze",
            issued_by: user.id
          });
      }

      toast.success(`Request ${status}!`);
      setReviewDialog(false);
      setSelectedRequest(null);
      setAdminNotes("");
      fetchRequests();
    } catch (error: any) {
      toast.error("Failed to review request: " + error.message);
    }
  };

  const handleIssueBadge = async () => {
    if (!selectedTalent) {
      toast.error("Please select a talent");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("verification_badges")
        .upsert({
          talent_id: selectedTalent,
          badge_type: badgeForm.badgeType,
          badge_level: badgeForm.badgeLevel,
          issued_by: user.id,
          issued_at: new Date().toISOString()
        }, {
          onConflict: "talent_id,badge_type"
        });

      if (error) throw error;

      toast.success("Badge issued successfully!");
      setBadgeDialog(false);
      setSelectedTalent("");
    } catch (error: any) {
      toast.error("Failed to issue badge: " + error.message);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "pending");
  const reviewedRequests = requests.filter(r => r.status !== "pending");

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2">Verification Management</h1>
            <p className="text-muted-foreground">Review and approve talent verifications</p>
          </div>
          
          <Button onClick={() => setBadgeDialog(true)}>
            <Award className="h-4 w-4 mr-2" />
            Issue Badge Manually
          </Button>
        </div>

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList>
            <TabsTrigger value="pending">
              Pending ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Reviewed ({reviewedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <div className="grid grid-cols-1 gap-4">
              {pendingRequests.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <p className="text-muted-foreground">No pending requests</p>
                  </CardContent>
                </Card>
              ) : (
                pendingRequests.map((request) => (
                  <Card key={request.id}>
                    <CardContent className="flex items-center justify-between p-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-full bg-primary/10">
                          <User className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold">{request.profiles.full_name}</p>
                          <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="capitalize">
                              {request.request_type.replace("_", " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(request.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        onClick={() => {
                          setSelectedRequest(request);
                          setReviewDialog(true);
                        }}
                      >
                        Review
                      </Button>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviewed">
            <div className="grid grid-cols-1 gap-4">
              {reviewedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="flex items-center justify-between p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-full bg-muted">
                        <User className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{request.profiles.full_name}</p>
                        <p className="text-sm text-muted-foreground">{request.profiles.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="capitalize">
                            {request.request_type.replace("_", " ")}
                          </Badge>
                          <Badge
                            variant={request.status === "approved" ? "default" : "destructive"}
                          >
                            {request.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">
                        Reviewed {new Date(request.reviewed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Review Verification Request</DialogTitle>
            <DialogDescription>
              {selectedRequest?.profiles.full_name} - {selectedRequest?.request_type}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Additional Information</Label>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedRequest?.verification_data?.additionalInfo || "No additional info provided"}
              </p>
            </div>

            <div>
              <Label>Admin Notes</Label>
              <Textarea
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add review notes..."
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={() => handleReview("approved")}
                className="flex-1"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => handleReview("rejected")}
                variant="destructive"
                className="flex-1"
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Badge Issue Dialog */}
      <Dialog open={badgeDialog} onOpenChange={setBadgeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Issue Verification Badge</DialogTitle>
            <DialogDescription>
              Manually award a badge to a talent
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Talent ID</Label>
              <Input
                value={selectedTalent}
                onChange={(e) => setSelectedTalent(e.target.value)}
                placeholder="Enter talent profile ID"
              />
            </div>

            <div>
              <Label>Badge Type</Label>
              <Select value={badgeForm.badgeType} onValueChange={(v) => setBadgeForm({ ...badgeForm, badgeType: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="identity">Identity</SelectItem>
                  <SelectItem value="skill">Skill</SelectItem>
                  <SelectItem value="portfolio">Portfolio</SelectItem>
                  <SelectItem value="blue_tick">Blue Tick</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Badge Level</Label>
              <Select value={badgeForm.badgeLevel} onValueChange={(v) => setBadgeForm({ ...badgeForm, badgeLevel: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bronze">Bronze</SelectItem>
                  <SelectItem value="silver">Silver</SelectItem>
                  <SelectItem value="gold">Gold</SelectItem>
                  <SelectItem value="platinum">Platinum</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button onClick={handleIssueBadge} className="w-full">
              Issue Badge
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
