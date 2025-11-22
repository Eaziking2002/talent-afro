import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface JobAlert {
  id: string;
  user_id: string;
  profile_id: string;
  skills: string[];
  locations: string[];
  min_budget: number;
  remote_only: boolean;
  frequency: "instant" | "daily" | "weekly";
  active: boolean;
  last_sent_at: string | null;
}

interface Profile {
  email: string;
  full_name: string;
}

interface Job {
  id: string;
  title: string;
  company_name: string;
  description: string;
  location: string;
  budget_min: number;
  budget_max: number;
  required_skills: string[];
  remote: boolean;
  created_at: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !RESEND_API_KEY) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    console.log("Starting job alerts processing...");

    // Get all active job alerts
    const { data: alerts, error: alertsError } = await supabase
      .from("job_alerts")
      .select("*")
      .eq("active", true);

    if (alertsError) throw alertsError;

    console.log(`Found ${alerts?.length || 0} active job alerts`);

    let emailsSent = 0;
    const now = new Date();

    for (const alert of alerts || []) {
      try {
        // Check if enough time has passed based on frequency
        if (alert.last_sent_at) {
          const lastSent = new Date(alert.last_sent_at);
          const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

          if (alert.frequency === "daily" && hoursSinceLastSent < 24) continue;
          if (alert.frequency === "weekly" && hoursSinceLastSent < 168) continue;
        }

        // Get matching jobs created since last alert
        const sinceDate = alert.last_sent_at || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

        const { data: jobs, error: jobsError } = await supabase
          .from("jobs")
          .select("*")
          .eq("status", "open")
          .gte("created_at", sinceDate)
          .order("created_at", { ascending: false });

        if (jobsError) throw jobsError;

        // Filter jobs based on user preferences
        const matchingJobs = jobs?.filter((job) => {
          // Check budget
          if (job.budget_max < alert.min_budget) return false;

          // Check remote preference
          if (alert.remote_only && !job.remote) return false;

          // Check location (if specified)
          if (alert.locations?.length > 0) {
            const jobLocation = job.location?.toLowerCase() || "";
            const matchesLocation = alert.locations.some((loc: string) =>
              jobLocation.includes(loc.toLowerCase())
            );
            if (!matchesLocation && !job.remote) return false;
          }

          // Check skills (if specified)
          if (alert.skills?.length > 0 && job.required_skills) {
            const jobSkills = (job.required_skills as string[]).map((s) => s.toLowerCase());
            const alertSkills = alert.skills.map((s: string) => s.toLowerCase());
            const matchesSkill = alertSkills.some((skill: string) =>
              jobSkills.some((js) => js.includes(skill) || skill.includes(js))
            );
            if (!matchesSkill) return false;
          }

          return true;
        }) || [];

        if (matchingJobs.length === 0) continue;

        console.log(`Found ${matchingJobs.length} matching jobs for alert ${alert.id}`);

        // Get user profile for email
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("email, full_name")
          .eq("id", alert.profile_id)
          .single();

        if (profileError || !profile?.email) {
          console.error(`No email found for profile ${alert.profile_id}`);
          continue;
        }

        // Send email with matching jobs
        const jobsHtml = matchingJobs
          .slice(0, 10) // Limit to 10 jobs per email
          .map(
            (job) => `
          <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 16px;">
            <h3 style="margin: 0 0 8px 0; color: #111827;">${job.title}</h3>
            <p style="margin: 0 0 8px 0; color: #6b7280;">${job.company_name || "Company"} • ${job.location || "Remote"}</p>
            <p style="margin: 0 0 8px 0; color: #374151; font-size: 14px;">${job.description.substring(0, 150)}...</p>
            <p style="margin: 0; color: #059669; font-weight: 600;">$${job.budget_min} - $${job.budget_max}</p>
          </div>
        `
          )
          .join("");

        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #111827; margin-bottom: 16px;">New Jobs Matching Your Preferences 🎯</h1>
            <p style="color: #374151; margin-bottom: 24px;">
              Hi ${profile.full_name},
            </p>
            <p style="color: #374151; margin-bottom: 24px;">
              We found ${matchingJobs.length} new job${matchingJobs.length === 1 ? "" : "s"} that match your job alert preferences:
            </p>
            
            ${jobsHtml}
            
            ${
              matchingJobs.length > 10
                ? `<p style="color: #6b7280; font-size: 14px; margin-top: 16px;">
                +${matchingJobs.length - 10} more jobs available on the platform
              </p>`
                : ""
            }
            
            <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
              <a href="${SUPABASE_URL.replace(".supabase.co", ".lovable.app")}/jobs" 
                 style="display: inline-block; background: #059669; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; font-weight: 600;">
                View All Jobs
              </a>
            </div>
            
            <p style="color: #9ca3af; font-size: 12px; margin-top: 32px;">
              You're receiving this because you enabled job alerts. 
              <a href="${SUPABASE_URL.replace(".supabase.co", ".lovable.app")}/jobs" style="color: #059669;">Manage your preferences</a>
            </p>
          </div>
        `;

        const { error: emailError } = await (async () => {
          const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Job Alerts <onboarding@resend.dev>",
              to: [profile.email],
              subject: `${matchingJobs.length} New Job${matchingJobs.length === 1 ? "" : "s"} Matching Your Preferences`,
              html: emailHtml,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            return { error: new Error(errorText) };
          }

          return { error: null };
        })();

        if (emailError) {
          console.error(`Failed to send email to ${profile.email}:`, emailError);
          continue;
        }

        // Update last_sent_at
        await supabase
          .from("job_alerts")
          .update({ last_sent_at: now.toISOString() })
          .eq("id", alert.id);

        emailsSent++;
        console.log(`Sent job alert email to ${profile.email}`);
      } catch (error) {
        console.error(`Error processing alert ${alert.id}:`, error);
      }
    }

    console.log(`Job alerts completed: ${emailsSent} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        emails_sent: emailsSent,
        alerts_processed: alerts?.length || 0,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Job alerts error:", error);
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