import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ExternalLink } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  job_id: string;
  match_score: number;
  reason: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  company_name: string | null;
  budget_min: number;
  budget_max: number;
  location: string | null;
  required_skills: any;
}

const JobRecommendations = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());

  const fetchRecommendations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        toast({
          title: "Profile Required",
          description: "Please complete your profile first",
          variant: "destructive",
        });
        return;
      }

      // Call AI recommendation function
      const { data, error } = await supabase.functions.invoke("job-recommendations", {
        body: { profileId: profile.id },
      });

      if (error) throw error;

      setRecommendations(data.recommendations || []);

      // Fetch job details for recommendations
      const jobIds = data.recommendations.map((r: Recommendation) => r.job_id);
      if (jobIds.length > 0) {
        const { data: jobsData, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .in("id", jobIds);

        if (jobsError) throw jobsError;

        const jobsMap = new Map(jobsData?.map(job => [job.id, job]) || []);
        setJobs(jobsMap);
      }

      toast({
        title: "Recommendations Generated",
        description: `Found ${data.recommendations.length} matching jobs`,
      });
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-orange-500";
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Job Recommendations
            </CardTitle>
            <CardDescription>
              Personalized job matches based on your skills and profile
            </CardDescription>
          </div>
          <Button onClick={fetchRecommendations} disabled={loading}>
            {loading ? "Analyzing..." : "Get Recommendations"}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Click "Get Recommendations" to see personalized job matches
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.map((rec) => {
              const job = jobs.get(rec.job_id);
              if (!job) return null;

              return (
                <Card key={rec.job_id} className="border-l-4 border-l-primary">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.title}</CardTitle>
                        <CardDescription className="mt-1">
                          {job.company_name || "Company"} • {job.location || "Remote"}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-12 rounded-full ${getMatchColor(rec.match_score)} flex items-center justify-center text-white font-bold`}>
                          {rec.match_score}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Why this matches you:</p>
                      <p className="text-sm text-muted-foreground">{rec.reason}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(Array.isArray(job.required_skills) ? job.required_skills : []).map((skill: string) => (
                        <Badge key={skill} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-medium">
                        ${job.budget_min} - ${job.budget_max}
                      </span>
                      <Button
                        size="sm"
                        onClick={() => navigate(`/jobs?job=${job.id}`)}
                        className="gap-2"
                      >
                        View Job
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default JobRecommendations;