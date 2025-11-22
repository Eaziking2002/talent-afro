import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export const useJobBookmark = (jobId: string) => {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, jobId]);

  const checkBookmarkStatus = async () => {
    if (!user) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) return;

      const { data } = await supabase
        .from("job_bookmarks")
        .select("id")
        .eq("profile_id", profile.id)
        .eq("job_id", jobId)
        .single();

      setIsBookmarked(!!data);
    } catch (error) {
      // Bookmark doesn't exist
      setIsBookmarked(false);
    }
  };

  const toggleBookmark = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to bookmark jobs",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile Required",
          description: "Please complete your profile setup first",
          variant: "destructive",
        });
        return;
      }

      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from("job_bookmarks")
          .delete()
          .eq("profile_id", profile.id)
          .eq("job_id", jobId);

        if (error) throw error;

        setIsBookmarked(false);
        toast({
          title: "Bookmark Removed",
          description: "Job removed from your saved list",
        });
      } else {
        // Add bookmark
        const { error } = await supabase.from("job_bookmarks").insert({
          user_id: user.id,
          profile_id: profile.id,
          job_id: jobId,
        });

        if (error) throw error;

        setIsBookmarked(true);
        toast({
          title: "Job Bookmarked! 🔖",
          description: "Job saved to your dashboard",
        });
      }
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to update bookmark",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    isBookmarked,
    loading,
    toggleBookmark,
  };
};