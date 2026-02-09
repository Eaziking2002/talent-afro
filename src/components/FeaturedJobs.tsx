import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, DollarSign, Briefcase, ArrowRight, Star } from "lucide-react";
import { Link } from "react-router-dom";
import type { Json } from "@/integrations/supabase/types";

interface FeaturedJob {
  id: string;
  title: string;
  company_name: string | null;
  description: string;
  location: string | null;
  budget_min: number;
  budget_max: number;
  required_skills: Json | null;
  remote: boolean | null;
  is_featured: boolean | null;
  created_at: string;
}

const FeaturedJobsSkeleton = () => (
  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
    {[...Array(6)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-10 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const FeaturedJobs = () => {
  const [jobs, setJobs] = useState<FeaturedJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id, title, company_name, description, location, budget_min, budget_max, required_skills, remote, is_featured, created_at")
          .eq("status", "open")
          .order("is_featured", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(9);

        if (error) throw error;
        setJobs(data || []);
      } catch (err) {
        console.error("Failed to fetch featured jobs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  const getSkills = (skills: Json | null): string[] => {
    if (!skills || !Array.isArray(skills)) return [];
    return skills as string[];
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days}d ago`;
    return `${Math.floor(days / 7)}w ago`;
  };

  return (
    <section className="py-12 md:py-16">
      <div className="container px-4 md:px-6">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Latest Opportunities</h2>
            <p className="text-muted-foreground mt-1">Fresh roles added daily across Africa and remote</p>
          </div>
          <Button variant="ghost" asChild className="hidden sm:flex gap-1.5">
            <Link to="/jobs">
              View all jobs
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>

        {loading ? (
          <FeaturedJobsSkeleton />
        ) : jobs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">No jobs available yet</h3>
              <p className="text-sm text-muted-foreground">New roles are added daily. Check back soon!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job) => {
                const skills = getSkills(job.required_skills);
                return (
                  <Card
                    key={job.id}
                    className={`group transition-all hover:shadow-card-hover ${
                      job.is_featured ? "border-primary/30 bg-primary/[0.02]" : ""
                    }`}
                  >
                    <CardContent className="p-5 flex flex-col h-full">
                      <div className="flex items-center gap-1.5 mb-2">
                        {job.is_featured && (
                          <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                            <Star className="h-3 w-3 fill-current" />
                            Featured
                          </Badge>
                        )}
                        {job.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                        <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
                      </div>

                      <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">
                        {job.title}
                      </h3>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3.5 w-3.5" />
                          {job.company_name || "Company"}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {job.location}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{job.description}</p>

                      {skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {skills.slice(0, 3).map((skill, i) => (
                            <Badge key={i} variant="outline" className="text-xs font-normal">{skill}</Badge>
                          ))}
                          {skills.length > 3 && (
                            <Badge variant="outline" className="text-xs font-normal">+{skills.length - 3}</Badge>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                        <div className="flex items-center gap-0.5 font-bold text-primary">
                          <DollarSign className="h-4 w-4" />
                          {job.budget_min.toLocaleString()} – {job.budget_max.toLocaleString()}
                        </div>
                        <Button size="sm" variant="ghost" asChild className="text-xs">
                          <Link to="/jobs">View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <Button variant="outline" asChild className="gap-1.5">
                <Link to="/jobs">
                  View all jobs
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
};

export default FeaturedJobs;
