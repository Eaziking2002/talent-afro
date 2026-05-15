import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  to: string;
  type: "submitted" | "new_application" | "status_update";
  jobTitle: string;
  candidateName?: string;
  newStatus?: string;
}

const tpl = (b: Body) => {
  if (b.type === "submitted") {
    return {
      subject: `Application received — ${b.jobTitle}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
        <h2 style="margin:0 0 12px;color:#0f1b3d">Your application is in 🎉</h2>
        <p>Thanks for applying to <strong>${b.jobTitle}</strong> on SkillLink Africa.</p>
        <p>You'll get an update as the employer reviews your profile. Track status anytime in your dashboard.</p>
        <p style="color:#64748b;font-size:13px;margin-top:24px">— The SkillLink Africa team</p>
      </div>`,
    };
  }
  if (b.type === "new_application") {
    return {
      subject: `New applicant for ${b.jobTitle}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
        <h2 style="margin:0 0 12px;color:#0f1b3d">You have a new application</h2>
        <p>${b.candidateName ?? "A candidate"} just applied to <strong>${b.jobTitle}</strong>.</p>
        <p>Review their profile and CV in your employer dashboard.</p>
      </div>`,
    };
  }
  return {
    subject: `Application update — ${b.jobTitle}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
      <h2 style="margin:0 0 12px;color:#0f1b3d">Status update</h2>
      <p>Your application for <strong>${b.jobTitle}</strong> moved to <strong>${b.newStatus}</strong>.</p>
    </div>`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.to || !body?.type || !body?.jobTitle) {
      return new Response(JSON.stringify({ error: "to, type, jobTitle required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");

    const { subject, html } = tpl(body);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "SkillLink Africa <onboarding@resend.dev>", to: [body.to], subject, html }),
    });
    const data = await r.json();
    if (!r.ok) return new Response(JSON.stringify({ error: data }), { status: r.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ id: data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
