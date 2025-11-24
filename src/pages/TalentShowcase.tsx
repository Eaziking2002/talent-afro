import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Award, Star, CheckCircle, ExternalLink, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

export default function TalentShowcase() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  const { data: talents } = useQuery({
    queryKey: ["talents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(`
          *,
          portfolio_items (
            id,
            title,
            file_url,
            file_type
          ),
          certifications (
            id,
            certificate_name,
            verified
          ),
          skill_assessments (
            skill_name,
            assessment_score
          )
        `)
        .order("average_rating", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const allSkills = Array.from(
    new Set(
      talents?.flatMap(t => 
        ((t.skills as string[]) || []).concat(
          (t.skill_assessments || []).map((a: any) => a.skill_name)
        )
      ) || []
    )
  );

  const filteredTalents = talents?.filter(talent => {
    const matchesSearch = 
      talent.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (talent.bio || "").toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSkill = !selectedSkill || 
      (talent.skills as string[] || []).includes(selectedSkill) ||
      (talent.skill_assessments || []).some((a: any) => a.skill_name === selectedSkill);

    return matchesSearch && matchesSkill;
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 mt-16">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-4xl font-bold">Talent Showcase</h1>
            <p className="text-muted-foreground">
              Discover verified professionals with proven skills
            </p>
          </div>

          {/* Search & Filters */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search talents by name or bio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedSkill === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSkill(null)}
              >
                All Skills
              </Button>
              {allSkills.slice(0, 10).map((skill) => (
                <Button
                  key={skill}
                  variant={selectedSkill === skill ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedSkill(skill)}
                >
                  {skill}
                </Button>
              ))}
            </div>
          </div>

          {/* Talents Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTalents?.map((talent) => (
              <Card key={talent.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2">
                        {talent.full_name}
                        {talent.id_verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </CardTitle>
                      {talent.location && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="h-3 w-3" />
                          {talent.location}
                        </div>
                      )}
                    </div>
                    {talent.average_rating > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        <span className="font-semibold">{talent.average_rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <CardDescription className="line-clamp-2">
                    {talent.bio || "No bio provided"}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Skills */}
                  <div>
                    <p className="text-sm font-medium mb-2">Skills</p>
                    <div className="flex flex-wrap gap-1">
                      {((talent.skills as string[]) || []).slice(0, 5).map((skill, idx) => (
                        <Badge key={idx} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                      {(talent.skills as string[] || []).length > 5 && (
                        <Badge variant="outline">+{(talent.skills as string[]).length - 5}</Badge>
                      )}
                    </div>
                  </div>

                  {/* Certifications */}
                  {talent.certifications && talent.certifications.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Award className="h-4 w-4" />
                        Certifications
                      </p>
                      <div className="space-y-1">
                        {talent.certifications.slice(0, 2).map((cert: any) => (
                          <div key={cert.id} className="flex items-center gap-2 text-sm">
                            <span>{cert.certificate_name}</span>
                            {cert.verified && (
                              <CheckCircle className="h-3 w-3 text-green-500" />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Skill Assessments */}
                  {talent.skill_assessments && talent.skill_assessments.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2 flex items-center gap-2">
                        <Star className="h-4 w-4" />
                        Skill Scores
                      </p>
                      <div className="space-y-1">
                        {talent.skill_assessments.slice(0, 3).map((assessment: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-sm">
                            <span>{assessment.skill_name}</span>
                            <Badge variant="default">{assessment.assessment_score}%</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Portfolio Preview */}
                  {talent.portfolio_items && talent.portfolio_items.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Portfolio</p>
                      <div className="grid grid-cols-3 gap-2">
                        {talent.portfolio_items.slice(0, 3).map((item: any) => (
                          <a
                            key={item.id}
                            href={item.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-square bg-muted rounded-lg overflow-hidden hover:opacity-80 transition-opacity"
                          >
                            {item.file_type?.startsWith("image") ? (
                              <img src={item.file_url} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ExternalLink className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stats */}
                  <div className="pt-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                    <span>{talent.total_gigs_completed || 0} gigs completed</span>
                    <span>{talent.total_reviews || 0} reviews</span>
                  </div>

                  <Button className="w-full" asChild>
                    <Link to={`/jobs?talent=${talent.id}`}>
                      View Full Profile
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredTalents?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No talents found matching your criteria</p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
