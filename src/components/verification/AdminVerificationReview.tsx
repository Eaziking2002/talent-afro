import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { CheckCircle, XCircle, Eye, User, Clock, Shield } from "lucide-react";

interface Verification {
  id: string;
  user_id: string;
  document_type: string;
  front_image_url: string | null;
  back_image_url: string | null;
  status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export default function AdminVerificationReview() {
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVerification, setSelectedVerification] = useState<Verification | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [frontUrl, setFrontUrl] = useState<string | null>(null);
  const [backUrl, setBackUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("identity_verifications")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setVerifications(data);
    if (error) toast.error("Failed to load verifications");
    setLoading(false);
  };

  const openReview = async (v: Verification) => {
    setSelectedVerification(v);
    setAdminNotes(v.admin_notes || "");
    setFrontUrl(null);
    setBackUrl(null);
    setReviewDialog(true);

    // Get signed URLs for private files
    if (v.front_image_url) {
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(v.front_image_url, 300); // 5 min expiry
      if (data) setFrontUrl(data.signedUrl);
    }
    if (v.back_image_url) {
      const { data } = await supabase.storage
        .from("verification-docs")
        .createSignedUrl(v.back_image_url, 300);
      if (data) setBackUrl(data.signedUrl);
    }
  };

  const handleReview = async (status: "approved" | "rejected") => {
    if (!selectedVerification) return;
    if (status === "rejected" && !adminNotes.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }

    setReviewing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("identity_verifications")
        .update({
          status,
          admin_notes: adminNotes || null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", selectedVerification.id);

      if (error) throw error;

      // Send notification to user
      await supabase.from("notifications").insert({
        user_id: selectedVerification.user_id,
        type: "verification",
        title: status === "approved" ? "Verification Approved ✅" : "Verification Rejected",
        description:
          status === "approved"
            ? `Your ${selectedVerification.document_type.replace("_", " ")} has been verified.`
            : `Your ${selectedVerification.document_type.replace("_", " ")} was rejected: ${adminNotes}`,
        related_id: selectedVerification.id,
        related_type: "verification",
      });

      toast.success(`Verification ${status}!`);
      setReviewDialog(false);
      fetchVerifications();
    } catch (err: any) {
      toast.error("Failed: " + err.message);
    } finally {
      setReviewing(false);
    }
  };

  const pending = verifications.filter((v) => v.status === "pending");
  const reviewed = verifications.filter((v) => v.status !== "pending");

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <>
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pending.length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed ({reviewed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {pending.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No pending verifications
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {pending.map((v) => (
                <Card key={v.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-full bg-yellow-100">
                        <Clock className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {v.document_type.replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          User: {v.user_id.slice(0, 8)}... •{" "}
                          {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => openReview(v)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed">
          {reviewed.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12 text-muted-foreground">
                No reviewed verifications
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reviewed.map((v) => (
                <Card key={v.id}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full ${v.status === "approved" ? "bg-green-100" : "bg-red-100"}`}>
                        {v.status === "approved" ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium capitalize">
                          {v.document_type.replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(v.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={v.status === "approved" ? "default" : "destructive"}>
                      {v.status}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Review Dialog with side-by-side images */}
      <Dialog open={reviewDialog} onOpenChange={setReviewDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Review Document
            </DialogTitle>
            <DialogDescription className="capitalize">
              {selectedVerification?.document_type.replace("_", " ")} • Submitted{" "}
              {selectedVerification && new Date(selectedVerification.created_at).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Front Side</Label>
              {frontUrl ? (
                frontUrl.includes(".pdf") ? (
                  <div className="border rounded-lg p-4 text-center">
                    <p className="text-sm text-muted-foreground">PDF Document</p>
                    <a href={frontUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline">
                      Open PDF
                    </a>
                  </div>
                ) : (
                  <img src={frontUrl} alt="Front" className="w-full rounded-lg border object-contain max-h-72" />
                )
              ) : (
                <Skeleton className="w-full h-48" />
              )}
            </div>
            {selectedVerification?.back_image_url && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Back Side</Label>
                {backUrl ? (
                  <img src={backUrl} alt="Back" className="w-full rounded-lg border object-contain max-h-72" />
                ) : (
                  <Skeleton className="w-full h-48" />
                )}
              </div>
            )}
          </div>

          <div>
            <Label>Admin Notes</Label>
            <Textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add review notes (required for rejection)..."
              rows={3}
              className="mt-1"
            />
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => handleReview("approved")}
              disabled={reviewing}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
            <Button
              onClick={() => handleReview("rejected")}
              variant="destructive"
              disabled={reviewing}
              className="flex-1"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
