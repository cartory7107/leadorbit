const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessName, category, city, country, language, service } = await req.json();

    if (!businessName || !language) {
      return new Response(
        JSON.stringify({ success: false, error: 'businessName and language are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: 'AI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const locationStr = [city, country].filter(Boolean).join(', ');
    const serviceOffer = service || 'digital marketing, website design, or social media management services';

    const prompt = `Generate 3 outreach messages for a ${category || 'business'} called "${businessName}" located in ${locationStr || 'an unknown location'}.

Language: ${language}
Tone: Adapt to the cultural and business norms of the ${language} language region. Be professional yet friendly.

Service being offered: ${serviceOffer}

Generate exactly 3 messages in the following JSON format:
{
  "dm": "A short, friendly direct message (2-3 sentences) suitable for Instagram/Facebook DM or WhatsApp",
  "email": "A professional cold email with subject line (format: Subject: [subject]\\n\\n[body]). Include greeting, value proposition, and call to action",
  "short": "A very short 1-2 sentence pitch message"
}

IMPORTANT:
- Write ALL messages in ${language} language only
- Personalize using the business name "${businessName}" and category "${category}"
- Make the tone culturally appropriate for ${language} speakers
- Return ONLY valid JSON, no extra text`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: 'You are a professional outreach message generator. Always return valid JSON only.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again shortly.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ success: false, error: 'AI credits exhausted. Please add funds.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const errText = await response.text();
      console.error('AI gateway error:', status, errText);
      return new Response(JSON.stringify({ success: false, error: 'AI generation failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content || '';

    // Parse JSON from response (handle markdown code blocks)
    let messages;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      messages = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
    } catch {
      console.error('Failed to parse AI response:', content);
      messages = {
        dm: content.slice(0, 200),
        email: content,
        short: content.slice(0, 100),
      };
    }

    return new Response(
      JSON.stringify({ success: true, data: messages }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Outreach generation error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Generation failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
