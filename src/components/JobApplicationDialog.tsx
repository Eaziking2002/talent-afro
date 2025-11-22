import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2, Send } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface JobApplicationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
}

export const JobApplicationDialog = ({
  open,
  onOpenChange,
  jobId,
  jobTitle,
  companyName,
}: JobApplicationDialogProps) => {
  const [proposalText, setProposalText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to apply for jobs",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!proposalText.trim()) {
      toast({
        title: "Proposal Required",
        description: "Please write a proposal before submitting",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile Not Found",
          description: "Please complete your profile setup first",
          variant: "destructive",
        });
        navigate("/profile-setup");
        return;
      }

      // Submit application
      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        applicant_id: profile.id,
        proposal_text: proposalText.trim(),
        status: "pending",
      });

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Already Applied",
            description: "You have already applied to this job",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Application Submitted! 🎉",
          description: "Your application has been sent to the employer",
        });
        setProposalText("");
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error submitting application:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit your application. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Apply for {jobTitle}</DialogTitle>
          <DialogDescription className="text-base">
            at {companyName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="proposal" className="text-base font-medium">
              Your Proposal *
            </Label>
            <Textarea
              id="proposal"
              placeholder="Explain why you're the perfect fit for this role. Highlight your relevant experience, skills, and what you can bring to the project..."
              value={proposalText}
              onChange={(e) => setProposalText(e.target.value)}
              className="min-h-[200px] resize-none"
              required
            />
            <p className="text-sm text-muted-foreground">
              {proposalText.length} characters (minimum 50 recommended)
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};