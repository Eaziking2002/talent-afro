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
  job_type: string;
  date_posted: string | null;
}

// Validate that a URL is reachable (returns 2xx/3xx, not 404/500)
async function isUrlValid(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timeout);
    return response.ok || (response.status >= 300 && response.status < 400);
  } catch {
    return false;
  }
}

// Fetch jobs from Remotive (Free, no API key needed)
async function fetchRemotiveJobs(): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const categories = ["software-dev", "design", "marketing", "data"];

  for (const category of categories) {
    try {
      const url = `https://remotive.com/api/remote-jobs?category=${category}&limit=30`;
      const response = await fetch(url);
      if (!response.ok) continue;
      const data = await response.json();

      for (const job of data.jobs || []) {
        // Remotive provides direct company URLs — these are reliable
        const applyUrl = job.url || "";
        if (!applyUrl) continue;

        const baseSalary = getSalaryEstimate(job.title, category);
        const jobType = detectJobType(job.title, job.job_type || "", job.description || "");

        jobs.push({
          title: (job.title || "").trim(),
          company: (job.company_name || "").trim(),
          description: stripHtml(job.description || ""),
          location: job.candidate_required_location || "Worldwide",
          budget_min: baseSalary,
          budget_max: Math.round(baseSalary * 1.5),
          required_skills: job.tags?.slice(0, 8) || extractSkillsFromDescription(job.description || ""),
          remote: true,
          url: applyUrl,
          source: "remotive",
          job_type: jobType,
          date_posted: job.publication_date || null,
        });
      }
    } catch (error) {
      console.error(`Error fetching Remotive jobs for ${category}:`, error);
    }
  }
  return jobs;
}

// Fetch from Adzuna if keys available
async function fetchAdzunaJobs(appId: string, appKey: string): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const countries = ["gb", "us", "za"];
  const categories = ["it-jobs", "engineering-jobs"];

  for (const country of countries) {
    for (const category of categories) {
      try {
        const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=25&what=${category}&content-type=application/json`;
        const response = await fetch(url);
        if (!response.ok) continue;
        const data = await response.json();

        for (const result of data.results || []) {
          const applyUrl = result.redirect_url || "";
          if (!applyUrl) continue;

          const salaryMin = result.salary_min || 30000;
          const salaryMax = result.salary_max || salaryMin * 1.5;
          const jobType = detectJobType(
            result.title || "",
            result.contract_type || "",
            result.description || ""
          );

          jobs.push({
            title: (result.title || "").trim(),
            company: (result.company?.display_name || "").trim(),
            description: (result.description || "").trim(),
            location: result.location?.display_name || "Remote",
            budget_min: Math.round(salaryMin / 12),
            budget_max: Math.round(salaryMax / 12),
            required_skills: extractSkillsFromDescription(result.description || ""),
            remote: (result.description || "").toLowerCase().includes("remote"),
            url: applyUrl,
            source: "adzuna",
            job_type: jobType,
            date_posted: result.created || null,
          });
        }
      } catch (error) {
        console.error(`Error fetching Adzuna jobs for ${country}/${category}:`, error);
      }
    }
  }
  return jobs;
}

// Fetch from JSearch (RapidAPI)
async function fetchJSearchJobs(rapidApiKey: string): Promise<JobListing[]> {
  const jobs: JobListing[] = [];
  const queries = ["software developer remote", "frontend developer", "data analyst"];

  for (const query of queries) {
    try {
      const url = `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(query)}&num_pages=1&page=1&date_posted=week`;
      const response = await fetch(url, {
        headers: {
          "X-RapidAPI-Key": rapidApiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      });
      if (!response.ok) continue;
      const data = await response.json();

      for (const result of data.data || []) {
        // JSearch provides job_apply_link which goes to the actual employer page
        const applyUrl = result.job_apply_link || "";
        if (!applyUrl) continue;

        const salaryMin = result.job_min_salary || 3000;
        const salaryMax = result.job_max_salary || salaryMin * 1.5;
        const jobType = result.job_employment_type
          ? mapEmploymentType(result.job_employment_type)
          : detectJobType(result.job_title || "", "", result.job_description || "");

        jobs.push({
          title: (result.job_title || "").trim(),
          company: (result.employer_name || "").trim(),
          description: (result.job_description || "").substring(0, 3000).trim(),
          location: [result.job_city, result.job_state, result.job_country].filter(Boolean).join(", ") || "Remote",
          budget_min: Math.round(salaryMin),
          budget_max: Math.round(salaryMax),
          required_skills: result.job_required_skills?.slice(0, 8) || extractSkillsFromDescription(result.job_description || ""),
          remote: result.job_is_remote || false,
          url: applyUrl,
          source: "jsearch",
          job_type: jobType,
          date_posted: result.job_posted_at_datetime_utc || null,
        });
      }
    } catch (error) {
      console.error(`Error fetching JSearch jobs:`, error);
    }
  }
  return jobs;
}

// Strip HTML tags from descriptions
function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Map JSearch employment types to our standard
function mapEmploymentType(type: string): string {
  const map: Record<string, string> = {
    FULLTIME: "full-time",
    PARTTIME: "part-time",
    CONTRACTOR: "contract",
    INTERN: "internship",
    FREELANCE: "freelance",
  };
  return map[type?.toUpperCase()] || "full-time";
}

// Detect job type from title/description
function detectJobType(title: string, typeField: string, description: string): string {
  const combined = `${title} ${typeField} ${description}`.toLowerCase();
  if (combined.includes("contract") || combined.includes("contractor")) return "contract";
  if (combined.includes("part-time") || combined.includes("part time")) return "part-time";
  if (combined.includes("freelance")) return "freelance";
  if (combined.includes("internship") || combined.includes("intern")) return "internship";
  return "full-time";
}

// Extract skills from description
function extractSkillsFromDescription(description: string): string[] {
  const commonSkills = [
    "JavaScript", "Python", "React", "Node.js", "TypeScript", "Java", "SQL",
    "AWS", "Docker", "Git", "HTML", "CSS", "MongoDB", "PostgreSQL", "GraphQL",
    "Vue.js", "Angular", "PHP", "Ruby", "Go", "Kubernetes", "Linux", "Azure",
    "Figma", "UI/UX", "SEO", "Data Analysis", "Machine Learning",
  ];
  const found = commonSkills.filter((skill) =>
    description.toLowerCase().includes(skill.toLowerCase())
  );
  return found.length > 0 ? found.slice(0, 8) : ["Communication", "Problem Solving"];
}

// Estimate salary
function getSalaryEstimate(title: string, category: string): number {
  const t = title.toLowerCase();
  if (t.includes("senior") || t.includes("lead")) return 8000;
  if (t.includes("junior") || t.includes("entry")) return 3000;
  if (t.includes("manager") || t.includes("director")) return 10000;
  const base: Record<string, number> = {
    "software-dev": 5000, design: 4000, marketing: 4500,
    "customer-support": 2500, data: 5500,
  };
  return base[category] || 4000;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  const logEntry = {
    jobs_found: 0, jobs_created: 0, jobs_rejected: 0,
    error_message: null as string | null,
    execution_time_ms: 0, status: "pending" as "pending" | "success" | "failed",
  };

  try {
    const ADZUNA_APP_ID = Deno.env.get("ADZUNA_APP_ID");
    const ADZUNA_APP_KEY = Deno.env.get("ADZUNA_APP_KEY");
    const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting job aggregation...");

    // 1. Clean up dead links from existing jobs (check a sample)
    const { data: existingJobs } = await supabase
      .from("jobs")
      .select("id, external_url")
      .not("external_url", "is", null)
      .eq("status", "open")
      .limit(20);

    let deadLinksRemoved = 0;
    if (existingJobs) {
      for (const job of existingJobs) {
        if (job.external_url) {
          const valid = await isUrlValid(job.external_url);
          if (!valid) {
            await supabase.from("jobs").update({ status: "closed" }).eq("id", job.id);
            deadLinksRemoved++;
          }
        }
      }
    }
    console.log(`Removed ${deadLinksRemoved} jobs with dead links`);

    // 2. Fetch new jobs from all sources
    const allJobs: JobListing[] = [];

    // Always fetch from Remotive (free, no key)
    console.log("Fetching from Remotive...");
    const remotiveJobs = await fetchRemotiveJobs();
    allJobs.push(...remotiveJobs);
    console.log(`Found ${remotiveJobs.length} from Remotive`);

    if (ADZUNA_APP_ID && ADZUNA_APP_KEY) {
      console.log("Fetching from Adzuna...");
      const adzunaJobs = await fetchAdzunaJobs(ADZUNA_APP_ID, ADZUNA_APP_KEY);
      allJobs.push(...adzunaJobs);
      console.log(`Found ${adzunaJobs.length} from Adzuna`);
    }

    if (RAPIDAPI_KEY) {
      console.log("Fetching from JSearch...");
      const jsearchJobs = await fetchJSearchJobs(RAPIDAPI_KEY);
      allJobs.push(...jsearchJobs);
      console.log(`Found ${jsearchJobs.length} from JSearch`);
    }

    logEntry.jobs_found = allJobs.length;

    // 3. Quality filter — STRICT: must have valid URL, real company, real title
    const qualityJobs = allJobs.filter((job) => {
      if (!job.url || !job.url.startsWith("http")) return false;
      if (!job.title || job.title.length < 5) return false;
      if (!job.company || job.company.length < 2) return false;
      if (!job.description || job.description.length < 50) return false;
      if (job.budget_min <= 0 || job.budget_max < job.budget_min) return false;
      if (!job.required_skills || job.required_skills.length === 0) return false;
      // Reject known spam patterns
      const spamPatterns = ["click here", "earn money fast", "work from home guaranteed"];
      const descLower = job.description.toLowerCase();
      if (spamPatterns.some((p) => descLower.includes(p))) return false;
      return true;
    });

    console.log(`${qualityJobs.length} passed quality filter`);

    // 4. Validate URLs and insert — only insert if URL is reachable
    for (const job of qualityJobs) {
      try {
        // Check duplicate
        const { data: existing } = await supabase
          .from("jobs")
          .select("id")
          .eq("title", job.title)
          .eq("company_name", job.company)
          .maybeSingle();

        if (existing) {
          logEntry.jobs_rejected++;
          continue;
        }

        // Validate URL is alive
        const urlOk = await isUrlValid(job.url);
        if (!urlOk) {
          console.log(`Rejected dead URL: ${job.url}`);
          logEntry.jobs_rejected++;
          continue;
        }

        // Calculate expiration (30 days from now)
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const { error } = await supabase.from("jobs").insert({
          title: job.title,
          company_name: job.company,
          description: job.description.substring(0, 5000),
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
          verification_status: "verified",
          duration_days: 30,
          job_type: job.job_type,
          date_posted: job.date_posted || new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        });

        if (error) {
          console.error("Insert error:", error.message);
          logEntry.jobs_rejected++;
        } else {
          logEntry.jobs_created++;
        }
      } catch (insertError) {
        console.error("Insert error:", insertError);
        logEntry.jobs_rejected++;
      }
    }

    logEntry.status = "success";
    logEntry.execution_time_ms = Date.now() - startTime;

    await supabase.from("job_scraping_logs").insert({
      ...logEntry,
      error_message: `Sources: Remotive${ADZUNA_APP_ID ? ", Adzuna" : ""}${RAPIDAPI_KEY ? ", JSearch" : ""}. Dead links removed: ${deadLinksRemoved}`,
    });

    return new Response(
      JSON.stringify({
        success: true,
        jobs_found: logEntry.jobs_found,
        jobs_created: logEntry.jobs_created,
        jobs_rejected: logEntry.jobs_rejected,
        dead_links_removed: deadLinksRemoved,
        execution_time_ms: logEntry.execution_time_ms,
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
      JSON.stringify({ success: false, error: logEntry.error_message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
