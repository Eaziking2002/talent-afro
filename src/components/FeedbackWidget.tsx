import { useState } from "react";
import { MessageSquarePlus, Bug, Lightbulb, HelpCircle, MoreHorizontal, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

type FeedbackType = "bug" | "suggestion" | "question" | "other";

const feedbackTypes: { type: FeedbackType; label: string; icon: React.ReactNode; color: string }[] = [
  { type: "bug", label: "Bug Report", icon: <Bug className="h-4 w-4" />, color: "text-red-500" },
  { type: "suggestion", label: "Suggestion", icon: <Lightbulb className="h-4 w-4" />, color: "text-yellow-500" },
  { type: "question", label: "Question", icon: <HelpCircle className="h-4 w-4" />, color: "text-blue-500" },
  { type: "other", label: "Other", icon: <MoreHorizontal className="h-4 w-4" />, color: "text-muted-foreground" },
];

const FeedbackWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const resetForm = () => {
    setSelectedType(null);
    setTitle("");
    setDescription("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedType || !title.trim() || !description.trim()) return;

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase.from("tester_feedback").insert({
        type: selectedType,
        title: title.trim().slice(0, 200),
        description: description.trim().slice(0, 2000),
        page_url: window.location.href,
        user_id: user?.id || null,
      });

      if (error) throw error;

      toast({
        title: "Feedback submitted!",
        description: "Thank you for helping us improve SkillLink Africa.",
      });
      
      resetForm();
      setIsOpen(false);
    } catch (error: any) {
      toast({
        title: "Failed to submit",
        description: error.message || "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg hover:scale-105 transition-transform"
        size="icon"
      >
        <MessageSquarePlus className="h-6 w-6" />
      </Button>

      {/* Feedback Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Send Feedback</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setIsOpen(false); resetForm(); }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Content */}
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {/* Type Selection */}
              <div className="space-y-2">
                <Label>What type of feedback?</Label>
                <div className="grid grid-cols-2 gap-2">
                  {feedbackTypes.map(({ type, label, icon, color }) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setSelectedType(type)}
                      className={cn(
                        "flex items-center gap-2 p-3 rounded-lg border transition-all text-left",
                        selectedType === type
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <span className={cn(selectedType === type ? "text-primary" : color)}>
                        {icon}
                      </span>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="feedback-title">Title</Label>
                <Input
                  id="feedback-title"
                  placeholder="Brief summary of your feedback"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={200}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="feedback-description">Description</Label>
                <Textarea
                  id="feedback-description"
                  placeholder="Please provide as much detail as possible..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  required
                />
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={!selectedType || !title.trim() || !description.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Feedback
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default FeedbackWidget;
