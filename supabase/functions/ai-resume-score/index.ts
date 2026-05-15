import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { cvText, targetRole } = await req.json();
    if (!cvText || typeof cvText !== "string" || cvText.length < 50) {
      return new Response(JSON.stringify({ error: "cvText (min 50 chars) is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "You score CVs for ATS readiness, clarity, impact, and role fit." },
          { role: "user", content: `Score this CV${targetRole ? ` for the role of "${targetRole}"` : ""}.\n\nCV:\n${cvText.slice(0, 12000)}` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "score_cv",
            description: "Return a CV score with feedback",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "0-100" },
                ats_score: { type: "number" },
                clarity_score: { type: "number" },
                impact_score: { type: "number" },
                strengths: { type: "array", items: { type: "string" } },
                weaknesses: { type: "array", items: { type: "string" } },
                suggestions: { type: "array", items: { type: "string" } },
                summary: { type: "string" },
              },
              required: ["overall_score", "ats_score", "clarity_score", "impact_score", "strengths", "weaknesses", "suggestions", "summary"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "score_cv" } },
      }),
    });

    if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.status === 402) return new Response(JSON.stringify({ error: "AI credits exhausted." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!r.ok) return new Response(JSON.stringify({ error: "AI gateway error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const data = await r.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const result = args ? JSON.parse(args) : null;
    return new Response(JSON.stringify({ result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
