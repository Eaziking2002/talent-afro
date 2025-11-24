import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Gift, Users, CheckCircle, Clock, XCircle } from "lucide-react";

export default function ReferralRewards() {
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"talent" | "employer">("talent");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: referrals } = useQuery({
    queryKey: ["referrals", profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      
      const { data, error } = await supabase
        .from("referrals")
        .select("*")
        .eq("referrer_id", profile.id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const createReferral = useMutation({
    mutationFn: async ({ email, type }: { email: string; type: string }) => {
      if (!profile?.id) throw new Error("Profile not found");

      const { data, error } = await supabase
        .from("referrals")
        .insert({
          referrer_id: profile.id,
          referred_email: email,
          referred_type: type,
          reward_credits: 50,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["referrals"] });
      toast({
        title: "Referral sent!",
        description: "Your referral link has been created. You'll earn 50 credits when they complete their first contract.",
      });
      setEmail("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const totalEarned = referrals?.reduce((sum, r) => sum + (r.status === "completed" ? r.reward_credits : 0), 0) || 0;
  const pending = referrals?.filter(r => r.status === "pending").length || 0;
  const completed = referrals?.filter(r => r.status === "completed").length || 0;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "expired":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      createReferral.mutate({ email, type });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Referral Rewards</h1>
            <p className="text-muted-foreground">
              Earn 50 credits for every user you refer who completes a contract
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
                <Gift className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEarned} credits</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completed}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
                <Clock className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{pending}</div>
              </CardContent>
            </Card>
          </div>

          {/* Referral Form */}
          <Card>
            <CardHeader>
              <CardTitle>Refer a New User</CardTitle>
              <CardDescription>
                Invite talents or employers to join the platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={type === "talent" ? "default" : "outline"}
                    onClick={() => setType("talent")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Talent
                  </Button>
                  <Button
                    type="button"
                    variant={type === "employer" ? "default" : "outline"}
                    onClick={() => setType("employer")}
                  >
                    <Users className="h-4 w-4 mr-2" />
                    Employer
                  </Button>
                </div>

                <Input
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />

                <Button type="submit" className="w-full" disabled={createReferral.isPending}>
                  {createReferral.isPending ? "Sending..." : "Send Referral"}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Referrals List */}
          <Card>
            <CardHeader>
              <CardTitle>Your Referrals</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {referrals?.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No referrals yet. Start inviting users to earn rewards!
                  </p>
                )}

                {referrals?.map((referral) => (
                  <div
                    key={referral.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{referral.referred_email}</p>
                      <p className="text-sm text-muted-foreground">
                        {referral.referred_type} • {new Date(referral.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                        {referral.status}
                      </Badge>
                      {getStatusIcon(referral.status)}
                      {referral.status === "completed" && (
                        <span className="text-sm font-medium text-green-600">
                          +{referral.reward_credits} credits
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
