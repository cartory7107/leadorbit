const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface SearchResult {
  url: string;
  title: string;
  description?: string;
  markdown?: string;
}

interface Lead {
  id: string;
  businessName: string;
  industry: string;
  website: string | null;
  socialMedia: Record<string, string>;
  reason: string;
  location: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  enriched: boolean;
}

function extractSocialLinks(text: string): Record<string, string> {
  const socials: Record<string, string> = {};
  const patterns: Record<string, RegExp> = {
    facebook: /https?:\/\/(?:www\.)?facebook\.com\/[^\s"'<>,)]+/gi,
    instagram: /https?:\/\/(?:www\.)?instagram\.com\/[^\s"'<>,)]+/gi,
    twitter: /https?:\/\/(?:www\.)?(?:twitter|x)\.com\/[^\s"'<>,)]+/gi,
    linkedin: /https?:\/\/(?:www\.)?linkedin\.com\/(?:company|in)\/[^\s"'<>,)]+/gi,
    youtube: /https?:\/\/(?:www\.)?youtube\.com\/(?:@|channel\/|c\/)[^\s"'<>,)]+/gi,
  };

  for (const [platform, regex] of Object.entries(patterns)) {
    const match = text.match(regex);
    if (match) {
      socials[platform] = match[0];
    }
  }
  return socials;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (match) {
    const cleaned = match[0].replace(/\s+/g, ' ').trim();
    if (cleaned.replace(/\D/g, '').length >= 7) {
      return cleaned;
    }
  }
  return null;
}

function extractBusinessName(title: string, url: string): string {
  // Clean up title - remove common suffixes
  let name = title
    .replace(/\s*[-|–—]\s*.{0,50}$/, '') // Remove " - Something" at end
    .replace(/\s*\|.*$/, '') // Remove " | Something"
    .replace(/\s*·.*$/, '') // Remove " · Something"
    .trim();

  if (!name || name.length < 2) {
    // Fallback: extract from URL
    try {
      const hostname = new URL(url).hostname.replace('www.', '');
      name = hostname.split('.')[0]
        .replace(/-/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
    } catch {
      name = 'Unknown Business';
    }
  }

  return name;
}

function generateInsight(result: SearchResult, businessType: string): string {
  const text = (result.markdown || result.description || '').toLowerCase();
  const insights = [];

  if (!text.includes('facebook') && !text.includes('instagram')) {
    insights.push('Limited social media presence detected');
  }
  if (!text.includes('online order') && !text.includes('e-commerce') && !text.includes('shop online')) {
    insights.push('No visible online ordering system');
  }
  if (text.includes('yelp') || text.includes('review')) {
    insights.push('Active on review platforms — could benefit from review management');
  }

  if (insights.length === 0) {
    insights.push(`Active ${businessType} that could benefit from enhanced digital marketing`);
  }

  return insights[0];
}

function isRelevantResult(result: SearchResult, businessType: string): boolean {
  const url = result.url.toLowerCase();
  const title = (result.title || '').toLowerCase();

  // Skip aggregator/directory-only results
  const skipDomains = ['yelp.com', 'tripadvisor.com', 'yellowpages.com', 'bbb.org', 'mapquest.com', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com'];
  if (skipDomains.some(d => url.includes(d))) return false;

  // Skip if title is too generic
  if (title.includes('best ') || title.includes(' top ') || title.includes('list of')) return false;

  return true;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, location, limit = 15 } = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'businessType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('FIRECRAWL_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured. Please connect Firecrawl in project settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const query = `"${businessType}" in ${location} small business`;
    console.log('Searching:', query);

    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: Math.min(limit + 10, 30), // fetch extra to account for filtering
        scrapeOptions: {
          formats: ['markdown'],
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Firecrawl error:', data);
      const errorMsg = response.status === 402
        ? 'Firecrawl credits exhausted. Please upgrade your Firecrawl plan.'
        : (data.error || `Search failed (${response.status})`);
      return new Response(
        JSON.stringify({ success: false, error: errorMsg }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const results: SearchResult[] = data.data || [];
    console.log(`Got ${results.length} raw results`);

    const leads: Lead[] = [];
    for (const result of results) {
      if (leads.length >= limit) break;
      if (!isRelevantResult(result, businessType)) continue;

      const fullText = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`;
      const socialLinks = extractSocialLinks(fullText);

      leads.push({
        id: `lead-${leads.length}-${Date.now()}`,
        businessName: extractBusinessName(result.title || '', result.url),
        industry: businessType,
        website: result.url || null,
        socialMedia: socialLinks,
        reason: generateInsight(result, businessType),
        location,
        phone: extractPhone(fullText),
        email: extractEmail(fullText),
        description: result.description || null,
        enriched: false,
      });
    }

    console.log(`Returning ${leads.length} leads`);

    return new Response(
      JSON.stringify({ success: true, data: leads, totalFound: leads.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
