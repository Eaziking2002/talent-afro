import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";
import { Trophy, Star, TrendingUp, Clock } from "lucide-react";

interface LeaderboardEntry {
  id: string;
  full_name: string;
  average_rating: number;
  total_reviews: number;
  total_gigs_completed?: number;
  successful_hires?: number;
  completion_rate: number;
  avg_response_time?: number;
}

const Leaderboard = () => {
  const [talents, setTalents] = useState<LeaderboardEntry[]>([]);
  const [employers, setEmployers] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchLeaderboards();
  }, []);

  const fetchLeaderboards = async () => {
    try {
      // Fetch top talents
      const { data: talentsData, error: talentsError } = await supabase
        .from("profiles")
        .select("id, full_name, average_rating, total_reviews, total_gigs_completed")
        .not("average_rating", "is", null)
        .order("average_rating", { ascending: false })
        .order("total_reviews", { ascending: false })
        .limit(10);

      if (talentsError) throw talentsError;

      // Calculate completion rates for talents
      const talentsWithStats = await Promise.all(
        (talentsData || []).map(async (talent) => {
          const { data: contracts } = await supabase
            .from("contracts")
            .select("status")
            .eq("talent_id", talent.id);

          const total = contracts?.length || 0;
          const completed = contracts?.filter((c) => c.status === "completed").length || 0;
          const completion_rate = total > 0 ? (completed / total) * 100 : 0;

          // Calculate average response time
          const { data: messages } = await supabase
            .from("contract_messages")
            .select("response_time_minutes")
            .eq("sender_id", talent.id)
            .not("response_time_minutes", "is", null);

          const avg_response_time = messages?.length
            ? messages.reduce((acc, m) => acc + (m.response_time_minutes || 0), 0) / messages.length
            : undefined;

          return { ...talent, completion_rate, avg_response_time };
        })
      );

      setTalents(talentsWithStats);

      // Fetch top employers
      const { data: employersData, error: employersError } = await supabase
        .from("employers")
        .select("id, user_id, average_rating, total_reviews, successful_hires")
        .not("average_rating", "is", null)
        .order("average_rating", { ascending: false })
        .order("total_reviews", { ascending: false })
        .limit(10);

      if (employersError) throw employersError;

      // Get employer profiles and calculate completion rates
      const employersWithStats = await Promise.all(
        (employersData || []).map(async (employer) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", employer.user_id)
            .single();

          const { data: contracts } = await supabase
            .from("contracts")
            .select("status")
            .eq("employer_id", employer.user_id);

          const total = contracts?.length || 0;
          const completed = contracts?.filter((c) => c.status === "completed").length || 0;
          const completion_rate = total > 0 ? (completed / total) * 100 : 0;

          return {
            id: employer.id,
            full_name: profile?.full_name || "Unknown",
            average_rating: employer.average_rating || 0,
            total_reviews: employer.total_reviews || 0,
            successful_hires: employer.successful_hires || 0,
            completion_rate,
          };
        })
      );

      setEmployers(employersWithStats);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Trophy className="w-5 h-5 text-orange-600" />;
    return <span className="text-muted-foreground">#{index + 1}</span>;
  };

  const renderLeaderboard = (entries: LeaderboardEntry[], isTalent: boolean) => (
    <div className="space-y-3">
      {entries.map((entry, index) => (
        <Card key={entry.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12">
                {getRankBadge(index)}
              </div>
              
              <Avatar className="w-12 h-12">
                <AvatarFallback className="bg-primary/10">
                  {entry.full_name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h3 className="font-semibold">{entry.full_name}</h3>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span>{entry.average_rating.toFixed(1)}</span>
                    <span>({entry.total_reviews} reviews)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    <span>{entry.completion_rate.toFixed(0)}% completed</span>
                  </div>
                  {isTalent && entry.avg_response_time !== undefined && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{entry.avg_response_time.toFixed(0)}min response</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="text-right">
                {isTalent ? (
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {entry.total_gigs_completed || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">gigs completed</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {entry.successful_hires || 0}
                    </p>
                    <p className="text-xs text-muted-foreground">successful hires</p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      {entries.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No data available yet
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading leaderboards...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-400" />
            Leaderboard
          </h1>
          <p className="text-lg text-muted-foreground">
            Top performers based on ratings, completion rates, and responsiveness
          </p>
        </div>

        <Tabs defaultValue="talents" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="talents">Top Talents</TabsTrigger>
            <TabsTrigger value="employers">Top Employers</TabsTrigger>
          </TabsList>

          <TabsContent value="talents" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Rated Talents</CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(talents, true)}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employers" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Rated Employers</CardTitle>
              </CardHeader>
              <CardContent>
                {renderLeaderboard(employers, false)}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Leaderboard;
