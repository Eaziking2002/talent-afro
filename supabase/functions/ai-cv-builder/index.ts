import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Body {
  fullName: string;
  role: string;
  yearsExperience?: number;
  email?: string;
  phone?: string;
  location?: string;
  skills?: string[];
  experience?: string;
  education?: string;
  achievements?: string;
  summary?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as Body;
    if (!body?.fullName || !body?.role) {
      return new Response(JSON.stringify({ error: "fullName and role are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `Generate a polished, ATS-friendly CV in clean Markdown for the candidate below. Use professional tone, action verbs, quantified impact. Include sections: Header, Professional Summary, Skills, Experience, Education, Achievements. Optimize for the target role.

Candidate data:
${JSON.stringify(body, null, 2)}

Return only the Markdown CV, no preface.`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior career coach who writes premium CVs for African professionals targeting global remote jobs." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const cv = data.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ cv }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
