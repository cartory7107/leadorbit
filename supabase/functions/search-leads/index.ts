const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface Lead {
  id: string;
  businessName: string;
  industry: string;
  website: string | null;
  address: string | null;
  socialMedia: Record<string, string>;
  reason: string;
  location: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  enriched: boolean;
  source: 'google_maps' | 'firecrawl' | 'both';
}

// ── Extraction helpers ──

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
    if (match) socials[platform] = match[0];
  }
  return socials;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match && !match[0].includes('example.com') ? match[0] : null;
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/);
  if (match && match[0].replace(/\D/g, '').length >= 7) return match[0].trim();
  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ── Firecrawl Web Search ──

async function searchFirecrawl(businessType: string, location: string, apiKey: string, limit: number): Promise<Lead[]> {
  const query = `"${businessType}" in ${location} small business`;

  const response = await fetch('https://api.firecrawl.dev/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      limit: Math.min(limit + 10, 30),
      scrapeOptions: { formats: ['markdown'] },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Firecrawl error:', data);
    return [];
  }

  const skipDomains = ['yelp.com', 'tripadvisor.com', 'yellowpages.com', 'bbb.org', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com'];

  const leads: Lead[] = [];
  for (const result of (data.data || [])) {
    if (leads.length >= limit) break;
    const url = (result.url || '').toLowerCase();
    if (skipDomains.some(d => url.includes(d))) continue;

    const title = (result.title || '').toLowerCase();
    if (title.includes('best ') || title.includes(' top ') || title.includes('list of')) continue;

    const fullText = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`;

    let name = (result.title || '')
      .replace(/\s*[-|–—]\s*.{0,50}$/, '')
      .replace(/\s*\|.*$/, '')
      .trim();

    if (!name || name.length < 2) {
      try {
        const hostname = new URL(result.url).hostname.replace('www.', '');
        name = hostname.split('.')[0].replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase());
      } catch { name = 'Unknown Business'; }
    }

    const socialLinks = extractSocialLinks(fullText);
    const hasSocials = Object.keys(socialLinks).length > 0;

    leads.push({
      id: `fc-${leads.length}-${Date.now()}`,
      businessName: name,
      industry: businessType,
      website: result.url || null,
      address: null,
      socialMedia: socialLinks,
      reason: !hasSocials
        ? 'Limited social media presence detected'
        : 'Active business that could benefit from enhanced digital marketing',
      location,
      phone: extractPhone(fullText),
      email: extractEmail(fullText),
      description: result.description || null,
      enriched: false,
      source: 'firecrawl',
    });
  }

  return leads;
}

// ── Deduplication ──

function deduplicateLeads(leads: Lead[]): Lead[] {
  const seen = new Map<string, Lead>();

  for (const lead of leads) {
    const key = normalizeName(lead.businessName);
    const existing = seen.get(key);

    if (!existing) {
      seen.set(key, lead);
    } else {
      // Merge: prefer the one with more data
      seen.set(key, {
        ...existing,
        website: existing.website || lead.website,
        address: existing.address || lead.address,
        phone: existing.phone || lead.phone,
        email: existing.email || lead.email,
        socialMedia: { ...existing.socialMedia, ...lead.socialMedia },
        description: existing.description || lead.description,
        source: 'both',
      });
    }
  }

  return Array.from(seen.values());
}

// ── Main handler ──

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, location, limit = 20 } = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'businessType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Firecrawl connector not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching: "${businessType}" in "${location}" (limit: ${limit})`);

    const firecrawlLeads = await searchFirecrawl(businessType, location, firecrawlKey, limit);

    console.log(`Firecrawl: ${firecrawlLeads.length}`);

    const allLeads = deduplicateLeads(firecrawlLeads);

    // Limit results
    const limitedLeads = allLeads.slice(0, limit);

    console.log(`Returning ${limitedLeads.length} deduplicated leads`);

    return new Response(
      JSON.stringify({ success: true, data: limitedLeads, totalFound: allLeads.length }),
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
