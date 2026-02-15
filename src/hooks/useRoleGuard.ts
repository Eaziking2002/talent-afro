import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Role = "talent" | "employer" | "admin";

/**
 * Redirects user if they don't have the required role.
 * Returns { allowed, loading, role }.
 */
export const useRoleGuard = (requiredRole: Role) => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    const checkRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle();

      const userRole = data?.role as Role | null;
      setRole(userRole);

      if (requiredRole === "admin") {
        if (userRole !== "admin") {
          navigate("/", { replace: true });
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      } else if (requiredRole === "employer") {
        if (userRole === "talent") {
          navigate("/dashboard", { replace: true });
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      } else if (requiredRole === "talent") {
        if (userRole === "employer") {
          navigate("/employer/dashboard", { replace: true });
          setAllowed(false);
        } else {
          setAllowed(true);
        }
      }

      setLoading(false);
    };

    checkRole();
  }, [user, authLoading, requiredRole, navigate]);

  return { allowed, loading, role };
};
