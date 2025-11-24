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
    console.log("Starting dispute escalation check...");

    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const { data: disputes, error } = await supabase
      .from("disputes")
      .select(`
        id,
        reason,
        created_at,
        contract_id,
        contracts!inner (
          id,
          employer_id,
          talent_id,
          job_id,
          jobs!inner (title)
        )
      `)
      .eq("status", "open")
      .lt("created_at", fortyEightHoursAgo.toISOString());

    if (error) {
      console.error("Error fetching disputes:", error);
      throw error;
    }

    const escalated = [];

    for (const dispute of disputes || []) {
      const { data: existing } = await supabase
        .from("dispute_escalations")
        .select("id")
        .eq("dispute_id", dispute.id)
        .maybeSingle();

      if (!existing) {
        const { data: adminRole } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin")
          .limit(1)
          .maybeSingle();

        if (adminRole) {
          const { error: escalationError } = await supabase
            .from("dispute_escalations")
            .insert({
              dispute_id: dispute.id,
              escalated_to: adminRole.user_id,
              escalation_notes: "Automatically escalated after 48 hours without resolution",
            });

          if (!escalationError) {
            const { data: adminProfile } = await supabase
              .from("profiles")
              .select("email, full_name")
              .eq("user_id", adminRole.user_id)
              .maybeSingle();

            if (adminProfile?.email) {
              await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: "SkillLink <onboarding@resend.dev>",
                  to: [adminProfile.email],
                  subject: "Dispute Escalated - Requires Senior Admin Attention",
                  html: `
                    <h2>Hello ${adminProfile.full_name},</h2>
                    <p>A dispute has been escalated to you as it has been unresolved for more than 48 hours.</p>
                    <p><strong>Contract:</strong> ${(dispute.contracts as any).jobs.title}</p>
                    <p><strong>Reason:</strong> ${dispute.reason}</p>
                    <p>Please review and resolve this dispute as soon as possible.</p>
                  `,
                }),
              });
            }

            escalated.push(dispute.id);
          }
        }
      }
    }

    console.log(`Escalated ${escalated.length} disputes`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        escalated: escalated.length,
        disputeIds: escalated 
      }),
      { headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in escalate-disputes:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
