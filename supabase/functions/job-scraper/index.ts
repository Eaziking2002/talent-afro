import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobListing {
  title: string;
  company: string;
  description: string;
  location: string;
  budget_min: number;
  budget_max: number;
  required_skills: string[];
  remote: boolean;
  url: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let logEntry = {
    jobs_found: 0,
    jobs_created: 0,
    jobs_rejected: 0,
    error_message: null as string | null,
    execution_time_ms: 0,
    status: "pending" as "pending" | "success" | "failed",
  };

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting AI job scraping...");

    // Call Lovable AI to search for African tech jobs
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a job scraping assistant. Search for real tech job opportunities in Africa, focusing on remote work, freelance, and gig economy positions. 
            
Return ONLY valid JSON (no markdown, no code blocks) in this exact format:
{
  "jobs": [
    {
      "title": "job title",
      "company": "company name",
      "description": "detailed job description",
      "location": "city, country or Remote",
      "budget_min": 100,
      "budget_max": 5000,
      "required_skills": ["skill1", "skill2"],
      "remote": true,
      "url": "https://original-job-posting-url.com"
    }
  ]
}

Requirements:
- Find 5-10 real current job opportunities
- Focus on tech, design, writing, customer service, data entry
- Budget in USD
- Only include legitimate job postings
- Include diverse locations across Africa`,
          },
          {
            role: "user",
            content: "Find current tech job opportunities in Africa for today's date. Focus on remote, freelance, and micro-gig opportunities.",
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (response.status === 402) {
        throw new Error("Payment required. Please add credits to your Lovable AI workspace.");
      }
      
      throw new Error(`AI API error: ${response.status} ${errorText}`);
    }

    const aiData = await response.json();
    console.log("AI response received");

    const aiContent = aiData.choices?.[0]?.message?.content;
    if (!aiContent) {
      throw new Error("No content in AI response");
    }

    // Parse the AI response - handle both JSON and markdown wrapped JSON
    let jobsData: { jobs: JobListing[] };
    try {
      // Remove markdown code blocks if present
      const cleanContent = aiContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      jobsData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse AI response:", aiContent);
      throw new Error(`Failed to parse AI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }

    const jobs = jobsData.jobs || [];
    logEntry.jobs_found = jobs.length;

    console.log(`Found ${jobs.length} jobs from AI`);

    // Quality filter: Only accept jobs with complete information
    const qualityJobs = jobs.filter((job) => {
      const isValid =
        job.title &&
        job.company &&
        job.description &&
        job.description.length > 50 &&
        job.budget_min > 0 &&
        job.budget_max > job.budget_min &&
        Array.isArray(job.required_skills) &&
        job.required_skills.length > 0;

      if (!isValid) {
        logEntry.jobs_rejected++;
      }

      return isValid;
    });

    console.log(`${qualityJobs.length} jobs passed quality filter`);

    // Insert jobs into database
    for (const job of qualityJobs) {
      try {
        const { error } = await supabase.from("jobs").insert({
          title: job.title,
          company_name: job.company,
          description: job.description,
          location: job.location || "Remote",
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          required_skills: job.required_skills,
          remote: job.remote ?? true,
          status: "open",
          source: "ai_scraped",
          ai_scraped: true,
          external_url: job.url,
          verification_status: "unverified",
          duration_days: 30,
        });

        if (error) {
          console.error("Error inserting job:", error);
          logEntry.jobs_rejected++;
        } else {
          logEntry.jobs_created++;
          console.log(`Created job: ${job.title}`);
        }
      } catch (insertError) {
        console.error("Insert error:", insertError);
        logEntry.jobs_rejected++;
      }
    }

    logEntry.status = "success";
    logEntry.execution_time_ms = Date.now() - startTime;

    // Log the scraping run
    await supabase.from("job_scraping_logs").insert(logEntry);

    console.log(
      `Job scraping completed: ${logEntry.jobs_created} created, ${logEntry.jobs_rejected} rejected`
    );

    // Send notification to admins if jobs were created
    if (logEntry.jobs_created > 0) {
      try {
        const notifyResponse = await fetch(
          `${Deno.env.get('SUPABASE_URL')}/functions/v1/notify-admin-new-jobs`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
            },
            body: JSON.stringify({
              jobsCreated: logEntry.jobs_created,
              jobsRejected: logEntry.jobs_rejected,
              scrapeTimestamp: new Date().toISOString()
            })
          }
        );
        
        if (notifyResponse.ok) {
          console.log('Admin notification sent successfully');
        }
      } catch (notifyError) {
        console.error('Failed to send admin notification:', notifyError);
        // Don't fail the main operation if notification fails
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        jobs_found: logEntry.jobs_found,
        jobs_created: logEntry.jobs_created,
        jobs_rejected: logEntry.jobs_rejected,
        execution_time_ms: logEntry.execution_time_ms,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Job scraping error:", error);
    logEntry.status = "failed";
    logEntry.error_message = error instanceof Error ? error.message : "Unknown error";
    logEntry.execution_time_ms = Date.now() - startTime;

    // Try to log the error
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
      const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
        await supabase.from("job_scraping_logs").insert(logEntry);
      }
    } catch (logError) {
      console.error("Failed to log error:", logError);
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
