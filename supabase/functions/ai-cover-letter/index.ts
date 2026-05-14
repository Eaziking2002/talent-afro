import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { jobTitle, companyName, jobDescription, skills, candidateName, yearsExperience } = await req.json();

    if (!jobTitle || !companyName) {
      return new Response(JSON.stringify({ error: 'jobTitle and companyName are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const prompt = `Write a professional, concise cover letter (max 250 words, 3 short paragraphs) for the position of "${jobTitle}" at ${companyName}.
${candidateName ? `Candidate name: ${candidateName}.` : ''}
${yearsExperience ? `Years of experience: ${yearsExperience}.` : ''}
${skills?.length ? `Key skills: ${skills.join(', ')}.` : ''}
${jobDescription ? `Job description excerpt: ${String(jobDescription).slice(0, 500)}` : ''}

Tone: confident, warm, modern, African talent perspective. Avoid clichés like "I am writing to apply". Start with a hook. End with a clear call to action. Output the letter only — no preamble.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('AI gateway error:', response.status, errText);
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const coverLetter = data?.choices?.[0]?.message?.content?.trim() ?? '';

    return new Response(JSON.stringify({ coverLetter }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('ai-cover-letter error:', err);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
