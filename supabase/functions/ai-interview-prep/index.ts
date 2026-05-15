import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { jobTitle, jobDescription, candidateSkills } = await req.json();
    if (!jobTitle) {
      return new Response(JSON.stringify({ error: "jobTitle is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You are a senior recruiter and interview coach. Be concise, practical, and specific." },
          { role: "user", content: `Generate 6 likely interview questions plus 4 practical preparation tips for this role.\n\nRole: ${jobTitle}\n${jobDescription ? `Description: ${jobDescription.slice(0, 2000)}\n` : ""}${candidateSkills?.length ? `Candidate skills: ${candidateSkills.join(", ")}` : ""}\n\nReturn as Markdown with two sections: ## Likely Questions, ## Preparation Tips.` },
        ],
      }),
    });
    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const data = await r.json();
    return new Response(JSON.stringify({ content: data.choices?.[0]?.message?.content ?? "" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
