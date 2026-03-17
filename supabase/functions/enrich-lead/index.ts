const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function extractSocialLinks(text: string): Record<string, string> {
  const socials: Record<string, string> = {};
  const patterns: Record<string, RegExp> = {
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>,)]+/gi,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>,)]+/gi,
    twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>,)]+/gi,
    linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>,)]+/gi,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^\s"'<>,)]+/gi,
    tiktok: /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>,)]+/gi,
  };

  for (const [platform, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      socials[platform] = match[0];
    }
  }
  return socials;
}

function extractEmails(text: string): string[] {
  const matches = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
  // Filter out common non-business emails
  return [...new Set(matches)].filter(e => !e.includes('example.com') && !e.includes('sentry.io'));
}

function extractPhones(text: string): string[] {
  const matches = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g) || [];
  return [...new Set(matches.filter(p => p.replace(/\D/g, '').length >= 7))];
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ success: false, error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Enriching:', url);

    const response = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url,
        formats: ['markdown', 'links'],
        onlyMainContent: false, // We want footer/header for contact info
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl scrape error:', data);
      return new Response(
        JSON.stringify({ success: false, error: data.error || 'Scrape failed' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const markdown = data.data?.markdown || data.markdown || '';
    const links = data.data?.links || data.links || [];
    const fullText = `${markdown} ${links.join(' ')}`;

    const socialLinks = extractSocialLinks(fullText);
    const emails = extractEmails(fullText);
    const phones = extractPhones(fullText);

    console.log(`Found: ${Object.keys(socialLinks).length} socials, ${emails.length} emails, ${phones.length} phones`);

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          socialMedia: socialLinks,
          emails,
          phones,
          description: data.data?.metadata?.description || null,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error enriching:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Enrichment failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
