import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Star, Award, TrendingUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AIJobMatchesProps {
  jobId: string;
}

export function AIJobMatches({ jobId }: AIJobMatchesProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: matches } = useQuery({
    queryKey: ["job-matches", jobId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("job_matches")
        .select(`
          *,
          talent:profiles!job_matches_talent_id_fkey(
            full_name,
            bio,
            average_rating,
            total_gigs_completed,
            skills
          )
        `)
        .eq("job_id", jobId)
        .order("match_score", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const findMatches = useMutation({
    mutationFn: async () => {
      setIsAnalyzing(true);

      const { data, error } = await supabase.functions.invoke("ai-job-matching", {
        body: { jobId },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["job-matches"] });
      toast({
        title: "AI Analysis Complete",
        description: `Found ${data.matchesFound} qualified talents`,
      });
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsAnalyzing(false);
    },
  });

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-blue-600";
    return "text-orange-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 85) return "Excellent Match";
    if (score >= 70) return "Good Match";
    return "Potential Match";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              AI-Powered Talent Matches
            </CardTitle>
            <CardDescription>
              Let AI find the best talents for this job based on skills, experience, and ratings
            </CardDescription>
          </div>
          <Button
            onClick={() => findMatches.mutate()}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Find Matches
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isAnalyzing && (
          <div className="space-y-4 py-8">
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">AI is analyzing talents...</p>
            </div>
            <Progress value={33} className="w-full" />
          </div>
        )}

        {!isAnalyzing && matches?.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Click "Find Matches" to discover the best talents for this job using AI
            </p>
          </div>
        )}

        <div className="space-y-4">
          {matches?.map((match: any) => (
            <Card key={match.id} className="overflow-hidden border-2">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarFallback className="text-lg">
                      {match.talent?.full_name?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{match.talent?.full_name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {match.talent?.bio || "No bio available"}
                        </p>
                      </div>

                      <div className="text-right">
                        <div className={`text-3xl font-bold ${getScoreColor(match.match_score)}`}>
                          {match.match_score}%
                        </div>
                        <Badge variant="outline" className={getScoreColor(match.match_score)}>
                          {getScoreLabel(match.match_score)}
                        </Badge>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-medium">{match.talent?.average_rating?.toFixed(1) || "0.0"}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>{match.talent?.total_gigs_completed || 0} gigs</span>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex flex-wrap gap-1">
                      {(match.talent?.skills as string[] || []).slice(0, 6).map((skill: string, idx: number) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>

                    {/* Match Reasons */}
                    <div className="space-y-2 pt-2 border-t">
                      <p className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-green-500" />
                        Why This Match?
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        {(match.match_reasons as string[] || []).map((reason: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-primary">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <Button className="w-full">
                      Contact Talent
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
