const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    locality?: string;
    region?: string;
    country?: string;
    formatted_address?: string;
  };
  categories: { name: string }[];
  geocodes?: { main?: { latitude: number; longitude: number } };
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

// ── Foursquare Places Search ──

async function searchFoursquare(businessType: string, location: string, apiKey: string, limit: number): Promise<FoursquarePlace[]> {
  const query = encodeURIComponent(businessType);
  const near = encodeURIComponent(location);
  const url = `https://api.foursquare.com/v3/places/search?query=${query}&near=${near}&limit=${Math.min(limit, 50)}&sort=RELEVANCE`;

  const response = await fetch(url, {
    headers: {
      'Authorization': apiKey,
      'Accept': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok) {
    console.error('Foursquare error:', data);
    return [];
  }

  return data.results || [];
}

// ── Firecrawl Website Discovery ──

async function discoverWebsite(businessName: string, city: string, firecrawlKey: string): Promise<{ website: string | null; email: string | null; socialMedia: Record<string, string> }> {
  const query = `"${businessName}" "${city}" official website`;

  try {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${firecrawlKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        limit: 3,
        scrapeOptions: { formats: ['markdown'] },
      }),
    });

    const data = await response.json();
    if (!response.ok || !data.data?.length) return { website: null, email: null, socialMedia: {} };

    const skipDomains = ['yelp.com', 'tripadvisor.com', 'yellowpages.com', 'bbb.org', 'google.com', 'facebook.com', 'instagram.com', 'twitter.com', 'x.com', 'linkedin.com', 'youtube.com', 'reddit.com', 'wikipedia.org', 'amazon.com', 'tiktok.com', 'foursquare.com'];

    for (const result of data.data) {
      const url = (result.url || '').toLowerCase();
      if (skipDomains.some(d => url.includes(d))) continue;

      // Validate business name similarity
      const resultTitle = (result.title || '').toLowerCase();
      const nameLower = businessName.toLowerCase();
      const nameWords = nameLower.split(/\s+/).filter(w => w.length > 2);
      const matchCount = nameWords.filter(w => resultTitle.includes(w)).length;

      if (nameWords.length > 0 && matchCount < Math.ceil(nameWords.length * 0.4)) continue;

      // Validate location match
      const fullText = `${result.title || ''} ${result.description || ''} ${result.markdown || ''}`.toLowerCase();
      const cityLower = city.toLowerCase();
      if (!fullText.includes(cityLower)) {
        // Check if at least partial location words match
        const cityWords = cityLower.split(/\s+/).filter(w => w.length > 2);
        const cityMatch = cityWords.some(w => fullText.includes(w));
        if (!cityMatch) continue;
      }

      // Extract data
      const socialMedia = extractSocialLinks(fullText);
      const email = extractEmail(fullText);

      return { website: result.url, email, socialMedia };
    }
  } catch (e) {
    console.warn('Firecrawl search failed for', businessName, e);
  }

  return { website: null, email: null, socialMedia: {} };
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
  return match && !match[0].includes('example.com') && !match[0].includes('sentry.io') ? match[0] : null;
}

// ── Deduplication ──

function deduplicateLeads(leads: Lead[]): Lead[] {
  const seen = new Map<string, Lead>();
  for (const lead of leads) {
    const key = lead.businessName.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!seen.has(key)) {
      seen.set(key, lead);
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
    const { businessType, location, limit = 10 } = await req.json();

    if (!businessType || !location) {
      return new Response(
        JSON.stringify({ success: false, error: 'businessType and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Step 1: Search Foursquare
    const places = await searchFoursquare(businessType, location, foursquareKey, limit);
    console.log(`Foursquare returned ${places.length} places`);

    if (places.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: [], totalFound: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Build leads from Foursquare data, then enrich with Firecrawl in parallel
    const enrichPromises = places.map(async (place): Promise<Lead> => {
      const city = place.location?.locality || place.location?.region || location;
      const country = place.location?.country || null;
      const category = place.categories?.[0]?.name || businessType;

      let website = place.website || null;
      let email = place.email || null;
      let phone = place.tel || null;
      let socialMedia: Record<string, string> = {};
      let enriched = false;

      // Step 2b: Use Firecrawl to discover website/contacts if we have the key
      if (firecrawlKey && !website) {
        const discovery = await discoverWebsite(place.name, city, firecrawlKey);
        if (discovery.website) {
          website = discovery.website;
          email = email || discovery.email;
          socialMedia = discovery.socialMedia;
          enriched = true;
        }
      }

      // Generate insight reason
      let reason = 'Verified local business from Foursquare';
      if (!website) reason = 'No website found — potential opportunity for web services';
      else if (Object.keys(socialMedia).length === 0) reason = 'Has website but limited social media presence';
      else reason = 'Active business with web presence — good outreach candidate';

      return {
        id: `fsq-${place.fsq_id}`,
        businessName: place.name,
        category,
        address: place.location?.formatted_address || place.location?.address || null,
        city,
        country,
        website,
        email,
        phone,
        socialMedia,
        source: enriched ? 'enriched' : 'foursquare',
        enriched,
        reason,
      };
    });

    const leads = await Promise.all(enrichPromises);

    // Step 3: Deduplicate and limit
    const uniqueLeads = deduplicateLeads(leads).slice(0, limit);

    console.log(`Returning ${uniqueLeads.length} verified leads`);

    return new Response(
      JSON.stringify({ success: true, data: uniqueLeads, totalFound: uniqueLeads.length }),
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
