import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  jobsCreated: number;
  jobsRejected: number;
  scrapeTimestamp: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Notify admin function started");
    
    const { jobsCreated, jobsRejected, scrapeTimestamp }: NotificationPayload = await req.json();
    
    // Only send notification if jobs were created
    if (jobsCreated === 0) {
      console.log("No jobs created, skipping notification");
      return new Response(
        JSON.stringify({ message: "No notification needed" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all admins with notification preferences
    const { data: admins, error: adminError } = await supabase
      .from("user_roles")
      .select(`
        user_id,
        admin_notification_preferences (notify_new_jobs)
      `)
      .eq("role", "admin");

    if (adminError) {
      console.error("Error fetching admins:", adminError);
      throw adminError;
    }

    if (!admins || admins.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ message: "No admins to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter admins who want notifications
    const notifyAdmins = admins.filter(
      (admin: any) => 
        !admin.admin_notification_preferences?.[0] || 
        admin.admin_notification_preferences[0].notify_new_jobs !== false
    );

    // Get admin emails
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error fetching users:", usersError);
      throw usersError;
    }

    const adminEmails = users.users
      .filter((user) => notifyAdmins.some((admin: any) => admin.user_id === user.id))
      .map((user) => user.email)
      .filter(Boolean);

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send email notifications
    const emailPromises = adminEmails.map((email) =>
      fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Lovable Jobs <onboarding@resend.dev>",
          to: [email!],
          subject: `🔔 ${jobsCreated} New Job${jobsCreated > 1 ? 's' : ''} Require Verification`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="color: #333;">New Jobs Scraped</h1>
              <p>The AI job scraper has completed a scan and found new opportunities:</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h2 style="color: #4CAF50; margin-top: 0;">✅ ${jobsCreated} New Job${jobsCreated > 1 ? 's' : ''} Created</h2>
                <p style="color: #666; margin: 0;">These jobs are waiting for your review and verification.</p>
              </div>

              ${jobsRejected > 0 ? `
                <div style="background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="color: #856404; margin-top: 0;">⚠️ ${jobsRejected} Job${jobsRejected > 1 ? 's' : ''} Rejected</h3>
                  <p style="color: #856404; margin: 0;">These didn't meet quality standards.</p>
                </div>
              ` : ''}

              <p style="margin: 30px 0;">
                <strong>Scrape Time:</strong> ${new Date(scrapeTimestamp).toLocaleString()}
              </p>

              <div style="margin: 30px 0;">
                <a href="${supabaseUrl.replace('https://', 'https://app.')}/admin/jobs" 
                   style="background: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Review Jobs Now
                </a>
              </div>

              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                You're receiving this because you're an admin with job notification preferences enabled.
              </p>
            </div>
          `,
        }),
      })
    );

    const results = await Promise.allSettled(emailPromises);
    const successful = results.filter((r) => r.status === "fulfilled").length;
    
    console.log(`Sent ${successful}/${adminEmails.length} notifications`);

    return new Response(
      JSON.stringify({ 
        message: `Notifications sent to ${successful} admin(s)`,
        recipients: adminEmails.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in notify-admin-new-jobs:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});