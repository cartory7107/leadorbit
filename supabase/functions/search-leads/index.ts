const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FoursquarePlace {
  fsq_place_id: string;
  name: string;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
    country?: string;
    formatted_address?: string;
  };
  categories?: { name: string }[];
  website?: string;
  tel?: string;
  email?: string;
}

interface Lead {
  id: string;
  businessName: string;
  category: string;
  address: string | null;
  city: string | null;
  country: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  socialMedia: Record<string, string>;
  source: 'foursquare' | 'enriched';
  enriched: boolean;
  reason: string;
}

// ── In-memory cache (10 min TTL) ──
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

function getCached(key: string) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any) {
  cache.set(key, { data, ts: Date.now() });
  // Prune old entries
  if (cache.size > 100) {
    const now = Date.now();
    for (const [k, v] of cache) {
      if (now - v.ts > CACHE_TTL) cache.delete(k);
    }
  }
}

// ── Foursquare Places Search ──
async function searchFoursquare(businessType: string, location: string, apiKey: string, limit: number): Promise<FoursquarePlace[]> {
  const query = encodeURIComponent(businessType);
  const near = encodeURIComponent(location);
  const fields = 'fsq_place_id,name,location,categories,website,tel,email';
  const url = `https://places-api.foursquare.com/places/search?query=${query}&near=${near}&limit=${Math.min(limit, 50)}&sort=RELEVANCE&fields=${fields}`;

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Accept': 'application/json',
      'X-Places-Api-Version': '2025-06-17',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Foursquare error:', JSON.stringify(data));
    return [];
  }
  return data.results || [];
}

// ── Firecrawl Website Discovery (with timeout) ──
async function discoverWebsite(businessName: string, city: string, firecrawlKey: string): Promise<{ website: string | null; email: string | null; socialMedia: Record<string, string> }> {
  const query = `"${businessName}" "${city}" official website`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit: 3, scrapeOptions: { formats: ['markdown'] } }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    if (!response.ok || !data.data?.length) return { website: null, email: null, socialMedia: {} };

    const skipDomains = ['yelp.com', 'tripadvisor.com', 'yellowpages.com', 'bbb.org', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com', 'foursquare.com'];

    for (const result of data.data) {
      const url = (result.url || '').toLowerCase();
      if (skipDomains.some(d => url.includes(d))) continue;

      const resultTitle = (result.title || '').toLowerCase();
      const nameLower = businessName.toLowerCase();
      const nameWords = nameLower.split(/\s+/).filter((w: string) => w.length > 2);
      const matchCount = nameWords.filter((w: string) => resultTitle.includes(w)).length;
      if (nameWords.length > 0 && matchCount < Math.ceil(nameWords.length * 0.4)) continue;

      const fullText = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`.toLowerCase();
      const cityLower = city.toLowerCase();
      if (!fullText.includes(cityLower)) {
        const cityWords = cityLower.split(/\s+/).filter((w: string) => w.length > 2);
        if (!cityWords.some((w: string) => fullText.includes(w))) continue;
      }

      return {
        website: result.url,
        email: extractEmail(fullText),
        socialMedia: extractSocialLinks(fullText),
      };
    }
  } catch (e) {
    clearTimeout(timeout);
    console.warn('Firecrawl failed for', businessName, e);
  }

  return { website: null, email: null, socialMedia: {} };
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
    if (match) socials[platform] = match[0];
  }
  return socials;
}

function extractEmail(text: string): string | null {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match && !match[0].includes('example.com') && !match[0].includes('sentry.io') ? match[0] : null;
}

function deduplicateLeads(leads: Lead[]): Lead[] {
  const seen = new Map<string, Lead>();
  for (const lead of leads) {
    const key = lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) seen.set(key, lead);
  }
  return Array.from(seen.values());
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { businessType, location, limit = 20, enrichMode = 'parallel' } = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'businessType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check cache
    const cacheKey = `${businessType}|${location}|${limit}`.toLowerCase();
    const cached = getCached(cacheKey);
    if (cached) {
      console.log('Cache hit for', cacheKey);
      return new Response(
        JSON.stringify(cached),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const foursquareKey = Deno.env.get('FOURSQUARE_API_KEY');
    const firecrawlKey = Deno.env.get('FIRECRAWL_API_KEY');

    if (!foursquareKey) {
      return new Response(
        JSON.stringify({ success: false, error: 'Foursquare API key not configured.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching: "${businessType}" in "${location}" (limit: ${limit})`);

    // Step 1: Get Foursquare results
    const places = await searchFoursquare(businessType, location, foursquareKey, limit);
    console.log(`Foursquare returned ${places.length} places`);

    if (places.length === 0) {
      const empty = { success: true, data: [], totalFound: 0 };
      return new Response(JSON.stringify(empty), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Step 2: Build base leads from Foursquare
    const baseLeads: Lead[] = places.map(place => {
      const city = place.location?.locality || place.location?.region || location;
      const country = place.location?.country || null;
      const category = place.categories?.[0]?.name || businessType;

      return {
        id: `fsq-${place.fsq_place_id || Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        businessName: place.name,
        category,
        address: place.location?.formatted_address || place.location?.address || null,
        city,
        country,
        website: place.website || null,
        email: place.email || null,
        phone: place.tel || null,
        socialMedia: {},
        source: 'foursquare' as const,
        enriched: false,
        reason: place.website ? 'Active business with web presence' : 'No website found — potential opportunity for web services',
      };
    });

    // Step 3: Enrich in parallel with Firecrawl (only businesses without websites)
    if (firecrawlKey && enrichMode === 'parallel') {
      const enrichTargets = baseLeads.filter(l => !l.website).slice(0, 10); // Max 10 enrichments per request
      const enrichPromises = enrichTargets.map(async (lead) => {
        const discovery = await discoverWebsite(lead.businessName, lead.city || location, firecrawlKey);
        if (discovery.website) {
          lead.website = discovery.website;
          lead.email = lead.email || discovery.email;
          lead.socialMedia = discovery.socialMedia;
          lead.source = 'enriched';
          lead.enriched = true;
          lead.reason = Object.keys(discovery.socialMedia).length > 0
            ? 'Active business with web presence — good outreach candidate'
            : 'Has website but limited social media presence';
        }
      });
      await Promise.allSettled(enrichPromises);
    }

    const uniqueLeads = deduplicateLeads(baseLeads).slice(0, limit);
    const result = { success: true, data: uniqueLeads, totalFound: uniqueLeads.length };

    // Cache the result
    setCache(cacheKey, result);

    console.log(`Returning ${uniqueLeads.length} leads`);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Search failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
