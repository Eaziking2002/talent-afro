// Firecrawl career-page crawler: scrapes company career pages, extracts jobs via Lovable AI,
// validates apply URLs, and inserts them into public.jobs with verification_status='unverified'.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ExtractedJob {
  title: string;
  description: string;
  location: string;
  remote: boolean;
  job_type: string;
  required_skills: string[];
  budget_min: number;
  budget_max: number;
  url: string;
}

async function isUrlReachable(url: string): Promise<boolean> {
  if (!url || !url.startsWith("http")) return false;
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 5000);
    const r = await fetch(url, { method: "HEAD", signal: c.signal, redirect: "follow" });
    clearTimeout(t);
    return r.ok || (r.status >= 300 && r.status < 400);
  } catch {
    return false;
  }
}

async function scrapeCareersPage(url: string, firecrawlKey: string): Promise<string | null> {
  try {
    const res = await fetch("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${firecrawlKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["markdown", "links"],
        onlyMainContent: true,
        waitFor: 1500,
      }),
    });
    if (!res.ok) {
      console.error(`Firecrawl scrape failed for ${url}: ${res.status} ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    const md = data?.data?.markdown ?? data?.markdown ?? "";
    const links: string[] = data?.data?.links ?? data?.links ?? [];
    return md + "\n\n[LINKS]\n" + links.slice(0, 200).join("\n");
  } catch (e) {
    console.error(`Firecrawl error for ${url}:`, e);
    return null;
  }
}

async function extractJobsFromContent(
  company: string,
  pageUrl: string,
  content: string,
  lovableKey: string,
): Promise<ExtractedJob[]> {
  const trimmed = content.slice(0, 18000);
  const sysPrompt = `You extract real job listings from a company's careers page. Return ONLY valid JSON (no markdown).
Format: {"jobs":[{"title":"","description":"","location":"","remote":false,"job_type":"full-time","required_skills":[],"budget_min":0,"budget_max":0,"url":""}]}
Rules:
- Only include actual job openings shown on the page (not navigation, blog posts, or generic pages).
- "url" must be the full apply/details link found in the page content. If only relative, prefix with the company's careers domain.
- "job_type" must be one of: full-time, part-time, contract, internship, freelance.
- "required_skills" 3-8 items inferred from the title/description.
- "budget_min"/"budget_max" in USD/year. Estimate realistically if not stated (e.g. SWE 60000-120000). Use 0/0 only if truly unknown.
- "description" 80-400 chars, plain text.
- Return up to 25 jobs. Skip entries with missing title or url.`;

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sysPrompt },
        { role: "user", content: `Company: ${company}\nCareers page URL: ${pageUrl}\n\nPage content:\n${trimmed}` },
      ],
    }),
  });
  if (!res.ok) {
    console.error(`Lovable AI failed for ${company}: ${res.status}`);
    return [];
  }
  const data = await res.json();
  const raw = data?.choices?.[0]?.message?.content ?? "";
  try {
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed.jobs) ? parsed.jobs : [];
  } catch (e) {
    console.error(`Parse error for ${company}:`, e);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();
  const FIRECRAWL_API_KEY = Deno.env.get("FIRECRAWL_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!FIRECRAWL_API_KEY || !LOVABLE_API_KEY || !SUPABASE_URL || !SERVICE_KEY) {
    return new Response(JSON.stringify({ error: "Missing required env vars" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);
  const log: any = { jobs_found: 0, jobs_created: 0, jobs_rejected: 0, status: "pending", error_message: null };

  try {
    // Optional: limit how many companies per run via body.limit
    let limit = 8;
    try {
      const body = await req.json().catch(() => ({}));
      if (typeof body?.limit === "number" && body.limit > 0 && body.limit <= 25) limit = body.limit;
    } catch { /* ignore */ }

    // Pick the active companies that haven't been crawled most recently
    const { data: companies, error: cErr } = await supabase
      .from("target_companies")
      .select("id, company_name, careers_url")
      .eq("is_active", true)
      .order("last_crawled_at", { ascending: true, nullsFirst: true })
      .limit(limit);

    if (cErr) throw cErr;
    console.log(`Crawling ${companies?.length ?? 0} companies`);

    for (const c of companies ?? []) {
      const content = await scrapeCareersPage(c.careers_url, FIRECRAWL_API_KEY);
      let companyJobsCreated = 0;
      if (content) {
        const jobs = await extractJobsFromContent(c.company_name, c.careers_url, content, LOVABLE_API_KEY);
        log.jobs_found += jobs.length;

        for (const j of jobs) {
          if (!j.title || !j.url || !j.description) {
            log.jobs_rejected++;
            continue;
          }
          // Validate the apply URL is reachable
          if (!(await isUrlReachable(j.url))) {
            log.jobs_rejected++;
            continue;
          }
          // Skip duplicates by external_url
          const { data: existing } = await supabase
            .from("jobs")
            .select("id")
            .eq("external_url", j.url)
            .maybeSingle();
          if (existing) continue;

          const { error: insErr } = await supabase.from("jobs").insert({
            title: j.title.slice(0, 200),
            company_name: c.company_name,
            description: j.description.slice(0, 4000),
            location: j.location || "Not specified",
            remote: !!j.remote,
            job_type: j.job_type || "full-time",
            required_skills: j.required_skills ?? [],
            budget_min: j.budget_min || 0,
            budget_max: j.budget_max || j.budget_min || 0,
            status: "open",
            source: "firecrawl",
            ai_scraped: true,
            employer_id: null,
            external_url: j.url,
            verification_status: "unverified",
            duration_days: 30,
          });
          if (insErr) {
            console.error("Insert err:", insErr);
            log.jobs_rejected++;
          } else {
            log.jobs_created++;
            companyJobsCreated++;
          }
        }
      }
      await supabase
        .from("target_companies")
        .update({ last_crawled_at: new Date().toISOString(), last_jobs_found: companyJobsCreated })
        .eq("id", c.id);
    }

    log.status = "success";
    log.execution_time_ms = Date.now() - startTime;
    await supabase.from("job_scraping_logs").insert(log);

    return new Response(JSON.stringify({ success: true, ...log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    log.status = "failed";
    log.error_message = e instanceof Error ? e.message : String(e);
    log.execution_time_ms = Date.now() - startTime;
    try { await supabase.from("job_scraping_logs").insert(log); } catch { /* ignore */ }
    return new Response(JSON.stringify({ success: false, error: log.error_message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
