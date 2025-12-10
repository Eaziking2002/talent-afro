import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { 
  Target, TrendingUp, BookOpen, Award, Loader2, 
  ChevronRight, ExternalLink, Lightbulb, BarChart3,
  CheckCircle, AlertCircle, Sparkles
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SkillGap {
  skill: string;
  demandLevel: "high" | "medium" | "low";
  averageSalaryBoost: number;
  matchingJobs: number;
}

interface CourseRecommendation {
  title: string;
  provider: string;
  duration: string;
  level: string;
  skills: string[];
  url?: string;
}

interface AnalysisResult {
  currentSkillsScore: number;
  marketDemandScore: number;
  gapAnalysis: SkillGap[];
  recommendations: CourseRecommendation[];
  topPayingSkills: string[];
  improvementPotential: number;
}

const SkillGapAnalysis = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [highPayingJobs, setHighPayingJobs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProfileAndJobs();
  }, [user]);

  const fetchProfileAndJobs = async () => {
    try {
      // Get user's profile with skills
      const { data: profile } = await supabase
        .from("profiles")
        .select("*, skill_assessments(*), certifications(*)")
        .eq("user_id", user!.id)
        .single();

      if (!profile) {
        navigate("/profile-setup");
        return;
      }
      setProfileData(profile);

      // Get high-paying jobs to analyze skill requirements
      const { data: jobs } = await supabase
        .from("jobs")
        .select("*")
        .eq("status", "open")
        .order("budget_max", { ascending: false })
        .limit(50);

      setHighPayingJobs(jobs || []);
      
      // Auto-run initial analysis
      await runSkillAnalysis(profile, jobs || []);
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const runSkillAnalysis = async (profile: any, jobs: any[]) => {
    setAnalyzing(true);
    try {
      const response = await supabase.functions.invoke("skill-gap-analysis", {
        body: {
          profileId: profile.id,
          userSkills: profile.skills || [],
          certifications: profile.certifications?.map((c: any) => c.certificate_name) || [],
          assessments: profile.skill_assessments || [],
          highPayingJobs: jobs.map(j => ({
            title: j.title,
            skills: j.required_skills || [],
            budget: j.budget_max
          }))
        }
      });

      if (response.error) throw response.error;
      setAnalysis(response.data);
    } catch (error) {
      console.error("Analysis error:", error);
      // Fallback to local analysis if edge function fails
      performLocalAnalysis(profile, jobs);
    } finally {
      setAnalyzing(false);
    }
  };

  const performLocalAnalysis = (profile: any, jobs: any[]) => {
    const userSkills = (profile.skills || []).map((s: string) => s.toLowerCase());
    
    // Count skill demand from high-paying jobs
    const skillDemand: Record<string, { count: number; totalBudget: number }> = {};
    
    jobs.forEach(job => {
      const requiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
      requiredSkills.forEach((skill: string) => {
        const normalizedSkill = skill.toLowerCase();
        if (!skillDemand[normalizedSkill]) {
          skillDemand[normalizedSkill] = { count: 0, totalBudget: 0 };
        }
        skillDemand[normalizedSkill].count++;
        skillDemand[normalizedSkill].totalBudget += job.budget_max;
      });
    });

    // Find missing skills
    const gapAnalysis: SkillGap[] = [];
    Object.entries(skillDemand)
      .filter(([skill]) => !userSkills.includes(skill))
      .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
      .slice(0, 10)
      .forEach(([skill, data]) => {
        gapAnalysis.push({
          skill,
          demandLevel: data.count > 10 ? "high" : data.count > 5 ? "medium" : "low",
          averageSalaryBoost: Math.round(data.totalBudget / data.count / 100) * 10,
          matchingJobs: data.count
        });
      });

    // Generate course recommendations
    const recommendations: CourseRecommendation[] = gapAnalysis.slice(0, 5).map(gap => ({
      title: `Master ${gap.skill.charAt(0).toUpperCase() + gap.skill.slice(1)}`,
      provider: ["Coursera", "Udemy", "LinkedIn Learning", "Pluralsight"][Math.floor(Math.random() * 4)],
      duration: `${Math.floor(Math.random() * 20) + 10} hours`,
      level: gap.demandLevel === "high" ? "Intermediate" : "Beginner",
      skills: [gap.skill],
    }));

    // Calculate scores
    const matchedSkillsCount = userSkills.filter((s: string) => skillDemand[s]).length;
    const currentSkillsScore = Math.min(100, Math.round((matchedSkillsCount / Math.max(Object.keys(skillDemand).length, 1)) * 100 * 2));
    const marketDemandScore = gapAnalysis.length > 0 ? Math.max(20, 100 - gapAnalysis.length * 8) : 100;

    setAnalysis({
      currentSkillsScore,
      marketDemandScore,
      gapAnalysis,
      recommendations,
      topPayingSkills: Object.entries(skillDemand)
        .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
        .slice(0, 5)
        .map(([skill]) => skill),
      improvementPotential: Math.min(50, gapAnalysis.reduce((acc, g) => acc + g.averageSalaryBoost / 100, 0))
    });
  };

  const getDemandBadge = (level: string) => {
    switch (level) {
      case "high":
        return <Badge className="bg-green-500">High Demand</Badge>;
      case "medium":
        return <Badge className="bg-yellow-500">Medium Demand</Badge>;
      default:
        return <Badge variant="outline">Low Demand</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Skill Gap Analysis</h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Discover missing skills for high-paying jobs and get personalized learning recommendations
          </p>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Skills Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analysis?.currentSkillsScore || 0}%</div>
              <Progress value={analysis?.currentSkillsScore || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Market Readiness
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analysis?.marketDemandScore || 0}%</div>
              <Progress value={analysis?.marketDemandScore || 0} className="mt-2" />
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Skill Gaps Found
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{analysis?.gapAnalysis.length || 0}</div>
              <p className="text-sm text-muted-foreground mt-1">Missing in-demand skills</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Earning Potential
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">+{analysis?.improvementPotential || 0}%</div>
              <p className="text-sm text-muted-foreground mt-1">With skill upgrades</p>
            </CardContent>
          </Card>
        </div>

        {/* Your Current Skills */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Your Current Skills
            </CardTitle>
            <CardDescription>Skills from your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(profileData?.skills || []).length > 0 ? (
                (profileData?.skills || []).map((skill: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-sm py-1 px-3">
                    {skill}
                  </Badge>
                ))
              ) : (
                <p className="text-muted-foreground">
                  No skills added yet.{" "}
                  <Button variant="link" className="p-0" onClick={() => navigate("/profile-setup")}>
                    Add skills to your profile
                  </Button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="gaps" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="gaps" className="gap-2">
              <AlertCircle className="h-4 w-4" />
              Skill Gaps
            </TabsTrigger>
            <TabsTrigger value="courses" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="certifications" className="gap-2">
              <Award className="h-4 w-4" />
              Certifications
            </TabsTrigger>
          </TabsList>

          <TabsContent value="gaps" className="space-y-4">
            {analyzing ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Analyzing skill gaps...</p>
                </CardContent>
              </Card>
            ) : analysis?.gapAnalysis.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium">Great job!</p>
                  <p className="text-muted-foreground">Your skills align well with current market demands</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {analysis?.gapAnalysis.map((gap, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Target className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold capitalize">{gap.skill}</h3>
                            <p className="text-sm text-muted-foreground">
                              {gap.matchingJobs} jobs require this skill
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          {getDemandBadge(gap.demandLevel)}
                          <div className="text-right">
                            <p className="font-semibold text-green-600">+${gap.averageSalaryBoost}</p>
                            <p className="text-xs text-muted-foreground">avg. budget boost</p>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Top Paying Skills */}
            {analysis?.topPayingSkills && analysis.topPayingSkills.length > 0 && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Paying Skills in Your Market
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topPayingSkills.map((skill, i) => (
                      <Badge 
                        key={i} 
                        variant={(profileData?.skills || []).map((s: string) => s.toLowerCase()).includes(skill) ? "default" : "outline"}
                        className="text-sm py-1 px-3 capitalize"
                      >
                        {skill}
                        {(profileData?.skills || []).map((s: string) => s.toLowerCase()).includes(skill) && (
                          <CheckCircle className="h-3 w-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="courses" className="space-y-4">
            {analysis?.recommendations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No course recommendations yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {analysis?.recommendations.map((course, i) => (
                  <Card key={i} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{course.title}</CardTitle>
                          <CardDescription>{course.provider}</CardDescription>
                        </div>
                        <Badge variant="secondary">{course.level}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                        <span>⏱️ {course.duration}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-4">
                        {course.skills.map((skill, j) => (
                          <Badge key={j} variant="outline" className="text-xs capitalize">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                      {course.url ? (
                        <Button variant="outline" size="sm" asChild>
                          <a href={course.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Course
                          </a>
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(course.title + ' ' + course.provider + ' course')}`, '_blank')}>
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Find Course
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="certifications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Recommended Certifications
                </CardTitle>
                <CardDescription>
                  Based on high-paying job requirements in your field
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {analysis?.gapAnalysis.slice(0, 5).map((gap, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Award className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium capitalize">{gap.skill} Certification</h4>
                        <p className="text-sm text-muted-foreground">
                          Validates expertise in {gap.skill}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {getDemandBadge(gap.demandLevel)}
                      <Button variant="outline" size="sm" onClick={() => navigate("/talent-certification")}>
                        Get Certified
                      </Button>
                    </div>
                  </div>
                ))}

                {(!analysis?.gapAnalysis || analysis.gapAnalysis.length === 0) && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Lightbulb className="h-12 w-12 mx-auto mb-4" />
                    <p>Complete your profile skills to get certification recommendations</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Your Certifications */}
            <Card>
              <CardHeader>
                <CardTitle>Your Certifications</CardTitle>
              </CardHeader>
              <CardContent>
                {(profileData?.certifications || []).length > 0 ? (
                  <div className="space-y-3">
                    {profileData.certifications.map((cert: any) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Award className={`h-6 w-6 ${cert.verified ? 'text-green-500' : 'text-muted-foreground'}`} />
                          <div>
                            <p className="font-medium">{cert.certificate_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {cert.issue_date && `Issued: ${new Date(cert.issue_date).toLocaleDateString()}`}
                            </p>
                          </div>
                        </div>
                        {cert.verified ? (
                          <Badge className="bg-green-500">Verified</Badge>
                        ) : (
                          <Badge variant="outline">Pending Verification</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No certifications yet.{" "}
                    <Button variant="link" className="p-0" onClick={() => navigate("/talent-certification")}>
                      Add certifications
                    </Button>
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Refresh Analysis Button */}
        <div className="mt-8 text-center">
          <Button 
            onClick={() => runSkillAnalysis(profileData, highPayingJobs)}
            disabled={analyzing}
            size="lg"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Refresh Analysis
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SkillGapAnalysis;
