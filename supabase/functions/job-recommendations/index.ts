import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { profileId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get user profile with skills
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('skills, bio, location')
      .eq('id', profileId)
      .single();

    if (profileError) throw profileError;

    // Get all open jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);

    if (jobsError) throw jobsError;

    // Use AI to match skills and recommend jobs
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are a job matching expert. Analyze the candidate profile and job listings to provide the best matches. Return a JSON array of job IDs with match scores (0-100) and reasons.'
          },
          {
            role: 'user',
            content: `Candidate Profile:
Skills: ${JSON.stringify(profile.skills)}
Bio: ${profile.bio || 'N/A'}
Location: ${profile.location || 'N/A'}

Available Jobs:
${JSON.stringify(jobs.map(j => ({
  id: j.id,
  title: j.title,
  description: j.description.substring(0, 500),
  required_skills: j.required_skills,
  location: j.location,
  budget_min: j.budget_min,
  budget_max: j.budget_max
})))}

Return ONLY a JSON array with this exact structure:
[
  {
    "job_id": "uuid",
    "match_score": 85,
    "reason": "Your React and TypeScript skills are a perfect match. The remote location fits your preference."
  }
]

Return top 10 matches sorted by score descending.`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "recommend_jobs",
              description: "Return job recommendations with match scores",
              parameters: {
                type: "object",
                properties: {
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        job_id: { type: "string" },
                        match_score: { type: "number" },
                        reason: { type: "string" }
                      },
                      required: ["job_id", "match_score", "reason"],
                      additionalProperties: false
                    }
                  }
                },
                required: ["recommendations"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "recommend_jobs" } }
      }),
    });

    if (!aiResponse.ok) {
      console.error('AI API error:', await aiResponse.text());
      throw new Error('Failed to get AI recommendations');
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    const recommendations = toolCall?.function?.arguments 
      ? JSON.parse(toolCall.function.arguments).recommendations 
      : [];

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});