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
  source: string;
}

// Fetch jobs from Adzuna API (Free tier: 250 requests/month)
async function fetchAdzunaJobs(appId: string, appKey: string): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const countries = ['gb', 'us', 'au', 'de', 'fr', 'nl', 'in', 'za'];
  const categories = ['it-jobs', 'engineering-jobs'];
  
  for (const country of countries.slice(0, 3)) {
    for (const category of categories) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=${category}&content-type=application/json`;
        
        const response = await fetch(url);
        if (!response.ok) {
          console.error(`Adzuna API error for ${country}/${category}:`, response.status);
          continue;
        }
        
        const data = await response.json();
        
        for (const result of data.results || []) {
          const salaryMin = result.salary_min || 30000;
          const salaryMax = result.salary_max || salaryMin * 1.5;
          
          jobs.push({
            title: result.title || 'Untitled Position',
            company: result.company?.display_name || 'Unknown Company',
            description: result.description || 'No description available',
            location: result.location?.display_name || 'Remote',
            budget_min: Math.round(salaryMin / 12), // Convert annual to monthly
            budget_max: Math.round(salaryMax / 12),
            required_skills: extractSkillsFromDescription(result.description || ''),
            remote: (result.description || '').toLowerCase().includes('remote'),
            url: result.redirect_url || '',
            source: 'adzuna'
          });
        }
      } catch (error) {
        console.error(`Error fetching Adzuna jobs for ${country}:`, error);
      }
    }
  }
  
  return jobs;
}

// Fetch jobs from JSearch (RapidAPI) - has free tier
async function fetchJSearchJobs(rapidApiKey: string): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const queries = ['software developer remote', 'frontend developer', 'data analyst', 'ui ux designer', 'freelance developer'];
  
  for (const query of queries.slice(0, 3)) {
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1`;
      
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': rapidApiKey,
          'X-RapidAPI-Host': 'jsearch.p.rapidapi.com'
        }
      });
      
      if (!response.ok) {
        console.error(`JSearch API error:`, response.status);
        continue;
      }
      
      const data = await response.json();
      
      for (const result of data.data || []) {
        const salaryMin = result.job_min_salary || 3000;
        const salaryMax = result.job_max_salary || salaryMin * 1.5;
        
        jobs.push({
          title: result.job_title || 'Untitled Position',
          company: result.employer_name || 'Unknown Company',
          description: result.job_description || 'No description available',
          location: `${result.job_city || ''}, ${result.job_country || 'Remote'}`.trim(),
          budget_min: Math.round(salaryMin),
          budget_max: Math.round(salaryMax),
          required_skills: result.job_required_skills?.slice(0, 10) || extractSkillsFromDescription(result.job_description || ''),
          remote: result.job_is_remote || false,
          url: result.job_apply_link || '',
          source: 'jsearch'
        });
      }
    } catch (error) {
      console.error(`Error fetching JSearch jobs:`, error);
    }
  }
  
  return jobs;
}

// Fetch jobs from Remotive (Free, no API key needed)
async function fetchRemotiveJobs(): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const categories = ['software-dev', 'design', 'marketing', 'customer-support', 'data'];
  
  for (const category of categories) {
    try {
      const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=50`;
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error(`Remotive API error:`, response.status);
        continue;
      }
      
      const data = await response.json();
      
      for (const job of data.jobs || []) {
        // Estimate salary based on job type
        const baseSalary = getSalaryEstimate(job.title, category);
        
        jobs.push({
          title: job.title || 'Untitled Position',
          company: job.company_name || 'Unknown Company',
          description: job.description || 'No description available',
          location: job.candidate_required_location || 'Worldwide',
          budget_min: baseSalary,
          budget_max: Math.round(baseSalary * 1.5),
          required_skills: job.tags?.slice(0, 10) || extractSkillsFromDescription(job.description || ''),
          remote: true,
          url: job.url || '',
          source: 'remotive'
        });
      }
    } catch (error) {
      console.error(`Error fetching Remotive jobs for ${category}:`, error);
    }
  }
  
  return jobs;
}

// Helper: Extract skills from job description
function extractSkillsFromDescription(description: string): string[] {
  const commonSkills = [
    'JavaScript', 'Python', 'React', 'Node.js', 'TypeScript', 'Java', 'SQL',
    'AWS', 'Docker', 'Git', 'HTML', 'CSS', 'MongoDB', 'PostgreSQL', 'GraphQL',
    'Vue.js', 'Angular', 'PHP', 'Ruby', 'Go', 'Kubernetes', 'Linux', 'Azure',
    'Figma', 'Adobe', 'UI/UX', 'Photoshop', 'Illustrator', 'Sketch',
    'SEO', 'Content Writing', 'Social Media', 'Google Analytics', 'Marketing',
    'Excel', 'Data Analysis', 'Power BI', 'Tableau', 'Machine Learning'
  ];
  
  const foundSkills = commonSkills.filter(skill => 
    description.toLowerCase().includes(skill.toLowerCase())
  );
  
  return foundSkills.length > 0 ? foundSkills.slice(0, 8) : ['Communication', 'Problem Solving', 'Team Work'];
}

// Helper: Estimate salary based on job title and category
function getSalaryEstimate(title: string, category: string): number {
  const titleLower = title.toLowerCase();
  
  if (titleLower.includes('senior') || titleLower.includes('lead')) {
    return 8000;
  } else if (titleLower.includes('junior') || titleLower.includes('entry')) {
    return 3000;
  } else if (titleLower.includes('manager') || titleLower.includes('director')) {
    return 10000;
  }
  
  const categoryBaseSalaries: Record<string, number> = {
    'software-dev': 5000,
    'design': 4000,
    'marketing': 4500,
    'customer-support': 2500,
    'data': 5500
  };
  
  return categoryBaseSalaries[category] || 4000;
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
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required Supabase environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    console.log("Starting job aggregation from free APIs...");

    const allJobs: JobListing[] = [];

    // Fetch from Remotive (always free, no API key needed)
    console.log("Fetching from Remotive...");
    const remotiveJobs = await fetchRemotiveJobs();
    allJobs.push(...remotiveJobs);
    console.log(`Found ${remotiveJobs.length} jobs from Remotive`);

    // Fetch from Adzuna if API keys are available
    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      console.log("Fetching from Adzuna...");
      const adzunaJobs = await fetchAdzunaJobs(ADZUNA_APP_ID, ADZUNA_APP_KEY);
      allJobs.push(...adzunaJobs);
      console.log(`Found ${adzunaJobs.length} jobs from Adzuna`);
    } else {
      console.log("Skipping Adzuna (no API keys configured)");
    }

    // Fetch from JSearch if API key is available
    if (RAPIDAPI_KEY) {
      console.log("Fetching from JSearch...");
      const jsearchJobs = await fetchJSearchJobs(RAPIDAPI_KEY);
      allJobs.push(...jsearchJobs);
      console.log(`Found ${jsearchJobs.length} jobs from JSearch`);
    } else {
      console.log("Skipping JSearch (no RapidAPI key configured)");
    }

    logEntry.jobs_found = allJobs.length;
    console.log(`Total jobs found: ${allJobs.length}`);

    // Quality filter
    const qualityJobs = allJobs.filter((job) => {
      const isValid =
        job.title &&
        job.title.length > 3 &&
        job.company &&
        job.description &&
        job.description.length > 50 &&
        job.budget_min > 0 &&
        job.budget_max >= job.budget_min &&
        Array.isArray(job.required_skills) &&
        job.required_skills.length > 0;

      if (!isValid) {
        logEntry.jobs_rejected++;
      }

      return isValid;
    });

    console.log(`${qualityJobs.length} jobs passed quality filter`);

    // Check for duplicates and insert jobs
    for (const job of qualityJobs) {
      try {
        // Check if job already exists (by title and company)
        const { data: existing } = await supabase
          .from("jobs")
          .select("id")
          .eq("title", job.title)
          .eq("company_name", job.company)
          .maybeSingle();

        if (existing) {
          console.log(`Skipping duplicate: ${job.title} at ${job.company}`);
          logEntry.jobs_rejected++;
          continue;
        }

        const { error } = await supabase.from("jobs").insert({
          title: job.title,
          company_name: job.company,
          description: job.description.substring(0, 5000), // Limit description length
          location: job.location || "Remote",
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          required_skills: job.required_skills,
          remote: job.remote,
          status: "open",
          source: job.source,
          ai_scraped: false,
          employer_id: null,
          external_url: job.url,
          verification_status: "verified", // Auto-verify API jobs
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

    // Log the aggregation run
    await supabase.from("job_scraping_logs").insert({
      ...logEntry,
      error_message: `Sources: Remotive${ADZUNA_APP_ID ? ', Adzuna' : ''}${RAPIDAPI_KEY ? ', JSearch' : ''}`
    });

    console.log(`Job aggregation completed: ${logEntry.jobs_created} created, ${logEntry.jobs_rejected} rejected`);

    return new Response(
      JSON.stringify({
        success: true,
        jobs_found: logEntry.jobs_found,
        jobs_created: logEntry.jobs_created,
        jobs_rejected: logEntry.jobs_rejected,
        execution_time_ms: logEntry.execution_time_ms,
        sources: ['remotive', ADZUNA_APP_ID ? 'adzuna' : null, RAPIDAPI_KEY ? 'jsearch' : null].filter(Boolean)
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Job aggregation error:", error);
    logEntry.status = "failed";
    logEntry.error_message = error instanceof Error ? error.message : "Unknown error";
    logEntry.execution_time_ms = Date.now() - startTime;

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
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
