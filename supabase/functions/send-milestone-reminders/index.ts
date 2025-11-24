import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.81.1";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
    console.log("Starting milestone reminder check...");

    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find milestones due in 24 hours
    const { data: upcomingMilestones, error: upcomingError } = await supabase
      .from("milestones")
      .select(`
        id,
        title,
        due_date,
        contract_id,
        contracts!inner (
          employer_id,
          talent_id,
          job_id,
          jobs!inner (title)
        )
      `)
      .eq("status", "in_progress")
      .gte("due_date", now.toISOString())
      .lte("due_date", tomorrow.toISOString());

    if (upcomingError) {
      console.error("Error fetching upcoming milestones:", upcomingError);
      throw upcomingError;
    }

    // Find overdue milestones
    const { data: overdueMilestones, error: overdueError } = await supabase
      .from("milestones")
      .select(`
        id,
        title,
        due_date,
        contract_id,
        contracts!inner (
          employer_id,
          talent_id,
          job_id,
          jobs!inner (title)
        )
      `)
      .eq("status", "in_progress")
      .lt("due_date", now.toISOString());

    if (overdueError) {
      console.error("Error fetching overdue milestones:", overdueError);
      throw overdueError;
    }

    const remindersSent = [];

    // Send 24h reminders
    for (const milestone of (upcomingMilestones || []) as any[]) {
      const { data: existingReminder } = await supabase
        .from("milestone_reminders")
        .select("id")
        .eq("milestone_id", milestone.id)
        .eq("reminder_type", "24h_before")
        .maybeSingle();

      if (!existingReminder) {
        await sendReminderEmails(milestone, "24h_before");
        
        await supabase
          .from("milestone_reminders")
          .insert({ milestone_id: milestone.id, reminder_type: "24h_before" });

        remindersSent.push({ milestone_id: milestone.id, type: "24h_before" });
      }
    }

    // Send overdue reminders
    for (const milestone of (overdueMilestones || []) as any[]) {
      const { data: existingReminder } = await supabase
        .from("milestone_reminders")
        .select("id")
        .eq("milestone_id", milestone.id)
        .eq("reminder_type", "overdue")
        .maybeSingle();

      if (!existingReminder) {
        await sendReminderEmails(milestone, "overdue");
        
        await supabase
          .from("milestone_reminders")
          .insert({ milestone_id: milestone.id, reminder_type: "overdue" });

        remindersSent.push({ milestone_id: milestone.id, type: "overdue" });
      }
    }

    console.log(`Sent ${remindersSent.length} milestone reminders`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersSent: remindersSent.length,
        details: remindersSent 
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-milestone-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});

async function sendReminderEmails(milestone: any, type: string) {
  const contract = milestone.contracts;
  
  const { data: employerProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", contract.employer_id)
    .maybeSingle();

  const { data: talentProfile } = await supabase
    .from("profiles")
    .select("email, full_name")
    .eq("id", contract.talent_id)
    .maybeSingle();

  const jobTitle = contract.jobs.title;
  const subject = type === "24h_before" 
    ? `Milestone Due Tomorrow: ${milestone.title}`
    : `Overdue Milestone: ${milestone.title}`;

  const message = type === "24h_before"
    ? `The milestone "${milestone.title}" for the contract "${jobTitle}" is due tomorrow.`
    : `The milestone "${milestone.title}" for the contract "${jobTitle}" is now overdue.`;

  const sendEmail = async (email: string, name: string) => {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "SkillLink <onboarding@resend.dev>",
        to: [email],
        subject,
        html: `<h2>Hello ${name},</h2><p>${message}</p>`,
      }),
    });
  };

  if (employerProfile?.email) {
    await sendEmail(employerProfile.email, employerProfile.full_name);
  }

  if (talentProfile?.email) {
    await sendEmail(talentProfile.email, talentProfile.full_name);
  }
}
