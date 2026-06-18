import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

interface Body {
  to: string;
  type: "submitted" | "new_application" | "status_update";
  jobTitle: string;
  candidateName?: string;
  newStatus?: string;
}

function escapeHtml(str: unknown): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

const tpl = (b: Body) => {
  const jobTitle = escapeHtml(b.jobTitle);
  const candidateName = escapeHtml(b.candidateName ?? "A candidate");
  const newStatus = escapeHtml(b.newStatus ?? "");

  if (b.type === "submitted") {
    return {
      subject: `Application received — ${b.jobTitle.replace(/[\r\n]/g, " ").slice(0, 200)}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
        <h2 style="margin:0 0 12px;color:#0f1b3d">Your application is in 🎉</h2>
        <p>Thanks for applying to <strong>${jobTitle}</strong> on SkillLink Africa.</p>
        <p>You'll get an update as the employer reviews your profile. Track status anytime in your dashboard.</p>
        <p style="color:#64748b;font-size:13px;margin-top:24px">— The SkillLink Africa team</p>
      </div>`,
    };
  }
  if (b.type === "new_application") {
    return {
      subject: `New applicant for ${b.jobTitle.replace(/[\r\n]/g, " ").slice(0, 200)}`,
      html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
        <h2 style="margin:0 0 12px;color:#0f1b3d">You have a new application</h2>
        <p>${candidateName} just applied to <strong>${jobTitle}</strong>.</p>
        <p>Review their profile and CV in your employer dashboard.</p>
      </div>`,
    };
  }
  return {
    subject: `Application update — ${b.jobTitle.replace(/[\r\n]/g, " ").slice(0, 200)}`,
    html: `<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fff;color:#0f172a">
      <h2 style="margin:0 0 12px;color:#0f1b3d">Status update</h2>
      <p>Your application for <strong>${jobTitle}</strong> moved to <strong>${newStatus}</strong>.</p>
    </div>`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    // Require an authenticated caller to prevent unauthenticated phishing-email abuse
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await sb.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as Body;
    if (!body?.to || !body?.type || !body?.jobTitle) {
      return new Response(JSON.stringify({ error: "to, type, jobTitle required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isValidEmail(body.to)) {
      return new Response(JSON.stringify({ error: "Invalid recipient email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!["submitted", "new_application", "status_update"].includes(body.type)) {
      return new Response(JSON.stringify({ error: "Invalid type" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.jobTitle.length > 300) body.jobTitle = body.jobTitle.slice(0, 300);
    if (body.candidateName && body.candidateName.length > 200) body.candidateName = body.candidateName.slice(0, 200);
    if (body.newStatus && body.newStatus.length > 100) body.newStatus = body.newStatus.slice(0, 100);

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { subject, html } = tpl(body);
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "SkillLink Africa <onboarding@resend.dev>", to: [body.to], subject, html }),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("Resend error", data);
      return new Response(JSON.stringify({ error: "Email send failed" }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ id: data.id }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("send-application-email error:", e);
    return new Response(JSON.stringify({ error: "An unexpected error occurred" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
