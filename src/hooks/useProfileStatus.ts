import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ProfileStatus = "loading" | "none" | "incomplete" | "complete";

interface ProfileData {
  id: string;
  full_name: string;
  bio: string | null;
  location: string | null;
  skills: any;
}

export const useProfileStatus = () => {
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<ProfileStatus>("loading");
  const [role, setRole] = useState<"talent" | "employer" | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setStatus("none");
      setRole(null);
      setProfileId(null);
      return;
    }

    const checkProfile = async () => {
      setStatus("loading");

      // Check role
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = roleData?.role as "talent" | "employer" | null;
      setRole(userRole);

      if (userRole === "employer") {
        // Check employer profile
        const { data: employer } = await supabase
          .from("employers")
          .select("id, company_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!employer) {
          setStatus("incomplete");
        } else {
          setStatus(employer.company_name ? "complete" : "incomplete");
        }
      } else {
        // Check talent profile
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, full_name, bio, location, skills")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!profile) {
          setStatus("incomplete");
          setProfileId(null);
        } else {
          setProfileId(profile.id);
          const hasName = !!profile.full_name;
          const hasLocation = !!profile.location;
          const hasSkills = Array.isArray(profile.skills) && profile.skills.length > 0;
          setStatus(hasName && hasLocation && hasSkills ? "complete" : "incomplete");
        }
      }
    };

    checkProfile();
  }, [user, authLoading]);

  return { status, role, profileId };
};
