import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userSkills, certifications, assessments, highPayingJobs } = await req.json();
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    console.log("Analyzing skill gaps for user with skills:", userSkills);

    const normalizedUserSkills = (userSkills || []).map((s: string) => s.toLowerCase());
    
    // Extract all required skills from high-paying jobs
    const allRequiredSkills: Record<string, { count: number; totalBudget: number }> = {};
    
    highPayingJobs.forEach((job: any) => {
      const skills = Array.isArray(job.skills) ? job.skills : [];
      skills.forEach((skill: string) => {
        const normalized = skill.toLowerCase();
        if (!allRequiredSkills[normalized]) {
          allRequiredSkills[normalized] = { count: 0, totalBudget: 0 };
        }
        allRequiredSkills[normalized].count++;
        allRequiredSkills[normalized].totalBudget += job.budget || 0;
      });
    });

    // Find skill gaps
    const gapAnalysis = Object.entries(allRequiredSkills)
      .filter(([skill]) => !normalizedUserSkills.includes(skill))
      .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
      .slice(0, 10)
      .map(([skill, data]) => ({
        skill,
        demandLevel: data.count > 10 ? "high" : data.count > 5 ? "medium" : "low",
        averageSalaryBoost: Math.round(data.totalBudget / Math.max(data.count, 1) / 100) * 10,
        matchingJobs: data.count
      }));

    // Use AI to generate course recommendations
    const topGaps = gapAnalysis.slice(0, 5).map(g => g.skill);
    
    let recommendations: any[] = [];
    
    if (topGaps.length > 0) {
      const prompt = `You are a career advisor. Based on these in-demand skills that a professional is missing: ${topGaps.join(", ")}

Generate 5 specific online course recommendations. For each course provide:
1. A realistic course title
2. Provider (use real platforms like Coursera, Udemy, LinkedIn Learning, Pluralsight, edX)
3. Estimated duration (e.g., "20 hours", "4 weeks")
4. Level (Beginner, Intermediate, or Advanced)
5. Skills covered

Return ONLY a JSON array in this format:
[{"title": "Course Title", "provider": "Platform", "duration": "X hours", "level": "Level", "skills": ["skill1"]}]`;

      try {
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${lovableApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.7,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          const content = aiData.choices[0].message.content;
          
          // Extract JSON from response
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            recommendations = JSON.parse(jsonMatch[0]);
          }
        }
      } catch (aiError) {
        console.error("AI recommendation error:", aiError);
      }
    }

    // Fallback recommendations if AI fails
    if (recommendations.length === 0 && gapAnalysis.length > 0) {
      recommendations = gapAnalysis.slice(0, 5).map(gap => ({
        title: `Complete ${gap.skill.charAt(0).toUpperCase() + gap.skill.slice(1)} Mastery`,
        provider: ["Coursera", "Udemy", "LinkedIn Learning", "Pluralsight"][Math.floor(Math.random() * 4)],
        duration: `${Math.floor(Math.random() * 20) + 10} hours`,
        level: gap.demandLevel === "high" ? "Intermediate" : "Beginner",
        skills: [gap.skill]
      }));
    }

    // Calculate scores
    const matchedSkillsCount = normalizedUserSkills.filter((s: string) => allRequiredSkills[s]).length;
    const totalRequiredSkills = Object.keys(allRequiredSkills).length;
    const currentSkillsScore = Math.min(100, Math.round((matchedSkillsCount / Math.max(totalRequiredSkills, 1)) * 100 * 2));
    const marketDemandScore = gapAnalysis.length > 0 ? Math.max(20, 100 - gapAnalysis.length * 8) : 100;

    // Top paying skills
    const topPayingSkills = Object.entries(allRequiredSkills)
      .sort((a, b) => b[1].totalBudget - a[1].totalBudget)
      .slice(0, 5)
      .map(([skill]) => skill);

    // Calculate improvement potential
    const improvementPotential = Math.min(50, gapAnalysis.reduce((acc, g) => acc + g.averageSalaryBoost / 100, 0));

    const result = {
      currentSkillsScore,
      marketDemandScore,
      gapAnalysis,
      recommendations,
      topPayingSkills,
      improvementPotential
    };

    console.log("Analysis complete:", { gapsFound: gapAnalysis.length, recommendationsCount: recommendations.length });

    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json", ...corsHeaders }
    });
  } catch (error: any) {
    console.error("Error in skill-gap-analysis:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
