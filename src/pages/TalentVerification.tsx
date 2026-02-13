import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import VerificationUploadForm from "@/components/verification/VerificationUploadForm";
import { Skeleton } from "@/components/ui/skeleton";

export default function TalentVerification() {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVerifications();
  }, []);

  const fetchVerifications = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const { data } = await supabase
      .from("identity_verifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setVerifications(data);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-1">Verification Center</h1>
          <p className="text-muted-foreground">
            Verify your identity to build trust with employers
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <VerificationUploadForm
            verifications={verifications}
            onSubmitted={fetchVerifications}
          />
        )}
      </div>
    </div>
  );
}
