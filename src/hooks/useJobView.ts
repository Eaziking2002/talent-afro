import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Generate or get session ID for tracking anonymous views
const getSessionId = () => {
  let sessionId = sessionStorage.getItem("job_session_id");
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    sessionStorage.setItem("job_session_id", sessionId);
  }
  return sessionId;
};

export const useJobView = (jobId: string, shouldTrack: boolean = true) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!shouldTrack || !jobId) return;

    const trackView = async () => {
      try {
        const sessionId = getSessionId();

        await supabase.from("job_views").insert({
          job_id: jobId,
          user_id: user?.id || null,
          session_id: sessionId,
        });
      } catch (error) {
        // Silently fail - view tracking shouldn't block the UI
        console.debug("View tracking error:", error);
      }
    };

    // Track view after a short delay to ensure it's a genuine view
    const timer = setTimeout(trackView, 2000);

    return () => clearTimeout(timer);
  }, [jobId, user, shouldTrack]);
};