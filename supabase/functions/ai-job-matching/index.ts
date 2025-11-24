import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId } = await req.json();
    console.log("Finding matches for job:", jobId);

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from("jobs")
      .select("*, required_skills")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      throw new Error("Job not found");
    }

    // Get all talents with their details
    const { data: talents, error: talentsError } = await supabase
      .from("profiles")
      .select(`
        *,
        skill_assessments (skill_name, assessment_score),
        certifications (certificate_name, verified),
        portfolio_items (id)
      `);

    if (talentsError) throw talentsError;

    console.log(`Analyzing ${talents?.length || 0} talents`);

    // Use AI to analyze and score matches
    const matchResults = await Promise.all(
      (talents || []).slice(0, 20).map(async (talent) => {
        const prompt = `You are a job matching expert. Analyze this talent profile against the job requirements and provide a match score (0-100) with reasons.

Job Details:
- Title: ${job.title}
- Required Skills: ${JSON.stringify(job.required_skills || [])}
- Budget: $${job.budget_min} - $${job.budget_max}
- Description: ${job.description}

Talent Profile:
- Name: ${talent.full_name}
- Skills: ${JSON.stringify(talent.skills || [])}
- Bio: ${talent.bio || "No bio"}
- Average Rating: ${talent.average_rating || 0}/5
- Completed Gigs: ${talent.total_gigs_completed || 0}
- Skill Assessments: ${JSON.stringify(talent.skill_assessments || [])}
- Certifications: ${talent.certifications?.length || 0} certificates
- Portfolio Items: ${talent.portfolio_items?.length || 0} items

Provide ONLY the score and reasons in this exact JSON format:
{"score": <number 0-100>, "reasons": ["reason1", "reason2", "reason3"]}`;

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
              temperature: 0.3,
            }),
          });

          if (!aiResponse.ok) {
            console.error("AI API error:", aiResponse.status, await aiResponse.text());
            return null;
          }

          const aiData = await aiResponse.json();
          const content = aiData.choices[0].message.content;
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[^}]+\}/);
          if (!jsonMatch) {
            console.error("No JSON found in AI response");
            return null;
          }

          const result = JSON.parse(jsonMatch[0]);
          
          return {
            talent_id: talent.id,
            score: result.score,
            reasons: result.reasons,
          };
        } catch (error) {
          console.error(`Error matching talent ${talent.id}:`, error);
          return null;
        }
      })
    );

    // Filter out nulls and low scores, then save matches
    const validMatches = matchResults.filter(m => m && m.score >= 60);
    console.log(`Found ${validMatches.length} good matches`);

    // Save matches to database
    if (validMatches.length > 0) {
      const { error: insertError } = await supabase
        .from("job_matches")
        .upsert(
          validMatches.map(m => ({
            job_id: jobId,
            talent_id: m!.talent_id,
            match_score: m!.score,
            match_reasons: m!.reasons,
          })),
          { onConflict: "job_id,talent_id" }
        );

      if (insertError) {
        console.error("Error saving matches:", insertError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        matchesFound: validMatches.length,
        matches: validMatches 
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in ai-job-matching:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
