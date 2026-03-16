import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import FeedbackWidget from "@/components/FeedbackWidget";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MapPin, DollarSign, Briefcase, Star, ArrowRight, Users, Award,
  CheckCircle, ExternalLink, TrendingUp, Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";
import { VerificationBadges } from "@/components/VerificationBadges";
import type { Json } from "@/integrations/supabase/types";

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

const CardSkeleton = () => (
  <Card>
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
);

const Index = () => {
  const [activeTab, setActiveTab] = useState("discover");

  // Fetch jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["home-jobs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, company_name, description, location, budget_min, budget_max, required_skills, remote, is_featured, created_at")
        .eq("status", "open")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch talents
  const { data: talents = [], isLoading: talentsLoading } = useQuery({
    queryKey: ["home-talents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          id, user_id, full_name, job_title, bio, location, avatar_url, skills,
          average_rating, total_gigs_completed, total_reviews,
          certifications (id, certificate_name, verified),
          portfolio_items (id, title, file_url, file_type)
        `)
        .eq("profile_visibility", "public")
        .order("average_rating", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 mt-16 pb-24 max-w-7xl">
        {/* Welcome banner */}
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-accent/10 to-secondary/10 border border-primary/10">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">SkillLink Africa</h1>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Discover opportunities, connect with talent, and grow your career across Africa.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <div className="flex items-center gap-1.5 text-sm">
              <Briefcase className="h-4 w-4 text-primary" />
              <span className="font-semibold text-primary">{jobs.length}+</span>
              <span className="text-muted-foreground">Open Jobs</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-secondary" />
              <span className="font-semibold text-secondary">{talents.length}+</span>
              <span className="text-muted-foreground">Talents</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4 text-accent-foreground" />
              <span className="text-muted-foreground">Growing daily</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start bg-muted/50 p-1">
            <TabsTrigger value="discover" className="flex-1 sm:flex-none">
              <Sparkles className="h-4 w-4 mr-1.5" /> Discover
            </TabsTrigger>
            <TabsTrigger value="jobs" className="flex-1 sm:flex-none">
              <Briefcase className="h-4 w-4 mr-1.5" /> Jobs
            </TabsTrigger>
            <TabsTrigger value="talents" className="flex-1 sm:flex-none">
              <Users className="h-4 w-4 mr-1.5" /> Talents
            </TabsTrigger>
          </TabsList>

          {/* Discover — mixed feed */}
          <TabsContent value="discover" className="space-y-8">
            {/* Featured Jobs Section */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-xl font-bold">Latest Opportunities</h2>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link to="/jobs">View all <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              {jobsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {jobs.slice(0, 6).map((job) => {
                    const skills = getSkills(job.required_skills);
                    return (
                      <Card key={job.id} className={`group transition-all hover:shadow-card-hover ${job.is_featured ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
                        <CardContent className="p-5 flex flex-col h-full">
                          <div className="flex items-center gap-1.5 mb-2">
                            {job.is_featured && (
                              <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                                <Star className="h-3 w-3 fill-current" /> Featured
                              </Badge>
                            )}
                            {job.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                            <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
                          </div>
                          <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">{job.title}</h3>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                            <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.company_name || "Company"}</span>
                            {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{job.description}</p>
                          {skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-3">
                              {skills.slice(0, 3).map((skill, i) => (
                                <Badge key={i} variant="outline" className="text-xs font-normal">{skill}</Badge>
                              ))}
                              {skills.length > 3 && <Badge variant="outline" className="text-xs font-normal">+{skills.length - 3}</Badge>}
                            </div>
                          )}
                          <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                            <div className="flex items-center gap-0.5 font-bold text-primary">
                              <DollarSign className="h-4 w-4" />
                              {job.budget_min.toLocaleString()} – {job.budget_max.toLocaleString()}
                            </div>
                            <Button size="sm" variant="ghost" asChild className="text-xs">
                              <Link to="/jobs">Apply</Link>
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Top Talents Section */}
            <section>
              <div className="flex items-end justify-between mb-4">
                <h2 className="text-xl font-bold">Top Talent</h2>
                <Button variant="ghost" size="sm" asChild className="gap-1">
                  <Link to="/talents">View all <ArrowRight className="h-4 w-4" /></Link>
                </Button>
              </div>
              {talentsLoading ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {talents.slice(0, 6).map((talent: any) => (
                    <TalentCard key={talent.id} talent={talent} />
                  ))}
                </div>
              )}
            </section>
          </TabsContent>

          {/* Jobs tab — all jobs */}
          <TabsContent value="jobs" className="space-y-4">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-xl font-bold">All Open Positions</h2>
              <Button variant="outline" size="sm" asChild>
                <Link to="/jobs">Advanced Search</Link>
              </Button>
            </div>
            {jobsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : jobs.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No jobs available yet</h3>
                  <p className="text-sm text-muted-foreground">New roles added daily. Check back soon!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jobs.map((job) => {
                  const skills = getSkills(job.required_skills);
                  return (
                    <Card key={job.id} className={`group transition-all hover:shadow-card-hover ${job.is_featured ? "border-primary/30 bg-primary/[0.02]" : ""}`}>
                      <CardContent className="p-5 flex flex-col h-full">
                        <div className="flex items-center gap-1.5 mb-2">
                          {job.is_featured && (
                            <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20">
                              <Star className="h-3 w-3 fill-current" /> Featured
                            </Badge>
                          )}
                          {job.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
                          <span className="ml-auto text-xs text-muted-foreground">{timeAgo(job.created_at)}</span>
                        </div>
                        <h3 className="font-semibold text-base leading-snug line-clamp-2 mb-1 group-hover:text-primary transition-colors">{job.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mb-2 flex-wrap">
                          <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{job.company_name || "Company"}</span>
                          {job.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{job.location}</span>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3 flex-1">{job.description}</p>
                        {skills.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-3">
                            {skills.slice(0, 3).map((skill, i) => (
                              <Badge key={i} variant="outline" className="text-xs font-normal">{skill}</Badge>
                            ))}
                            {skills.length > 3 && <Badge variant="outline" className="text-xs font-normal">+{skills.length - 3}</Badge>}
                          </div>
                        )}
                        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50">
                          <div className="flex items-center gap-0.5 font-bold text-primary">
                            <DollarSign className="h-4 w-4" />
                            {job.budget_min.toLocaleString()} – {job.budget_max.toLocaleString()}
                          </div>
                          <Button size="sm" variant="ghost" asChild className="text-xs">
                            <Link to="/jobs">Apply</Link>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Talents tab */}
          <TabsContent value="talents" className="space-y-4">
            <div className="flex items-end justify-between mb-2">
              <h2 className="text-xl font-bold">Browse Talent</h2>
              <Button variant="outline" size="sm" asChild>
                <Link to="/talents">Full Directory</Link>
              </Button>
            </div>
            {talentsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(9)].map((_, i) => <CardSkeleton key={i} />)}
              </div>
            ) : talents.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <h3 className="font-semibold mb-1">No talents yet</h3>
                  <p className="text-sm text-muted-foreground">Be the first to join!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {talents.map((talent: any) => (
                  <TalentCard key={talent.id} talent={talent} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
      <FeedbackWidget />
    </div>
  );
};

// Talent card component
const TalentCard = ({ talent }: { talent: any }) => {
  const skills = getSkills(talent.skills);
  return (
    <Card className="overflow-hidden hover:shadow-card-hover transition-shadow">
      <CardContent className="p-5 flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
        <div className="w-12 h-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
            {talent.avatar_url ? (
              <img src={talent.avatar_url} alt={talent.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg font-bold text-muted-foreground">
                {talent.full_name?.[0] || "?"}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-sm truncate">{talent.full_name}</h3>
              <VerificationBadges talentId={talent.id} inline />
            </div>
            {talent.job_title && (
              <p className="text-xs text-muted-foreground truncate">{talent.job_title}</p>
            )}
            {talent.location && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="h-3 w-3" /> {talent.location}
              </p>
            )}
          </div>
          {talent.average_rating > 0 && (
            <div className="flex items-center gap-0.5 text-sm">
              <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
              <span className="font-medium">{Number(talent.average_rating).toFixed(1)}</span>
            </div>
          )}
        </div>

        {talent.bio && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{talent.bio}</p>
        )}

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {skills.slice(0, 4).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal">{skill}</Badge>
            ))}
            {skills.length > 4 && <Badge variant="outline" className="text-xs">+{skills.length - 4}</Badge>}
          </div>
        )}

        {talent.certifications && talent.certifications.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-3">
            <Award className="h-3.5 w-3.5" />
            <span>{talent.certifications.length} certification{talent.certifications.length > 1 ? "s" : ""}</span>
            {talent.certifications.some((c: any) => c.verified) && (
              <CheckCircle className="h-3 w-3 text-green-500" />
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-border/50 text-xs text-muted-foreground">
          <span>{talent.total_gigs_completed || 0} gigs</span>
          <span>{talent.total_reviews || 0} reviews</span>
        </div>

        <Button size="sm" className="w-full mt-3" variant="outline" asChild>
          <Link to={`/profile/${talent.user_id}`}>View Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default Index;
