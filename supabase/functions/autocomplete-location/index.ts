import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory cache
const cache = new Map<string, { data: any; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let query = url.searchParams.get("query")?.trim();

    // Also support POST body
    if (!query && req.method === "POST") {
      try {
        const body = await req.json();
        query = body.query?.trim();
      } catch {}
    }

    if (!query || query.length < 2) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cacheKey = query.toLowerCase();
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) {
      return new Response(JSON.stringify(cached.data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("FOURSQUARE_API_KEY");
    if (!apiKey) {
      throw new Error("FOURSQUARE_API_KEY not configured");
    }

    const fsqUrl = `https://api.foursquare.com/v3/autocomplete?query=${encodeURIComponent(query)}&types=geo&limit=10`;

    const response = await fetch(fsqUrl, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Foursquare autocomplete error:", response.status, err);
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();

    const results = (data.results || [])
      .filter((r: any) => r.type === "geo" && r.geo)
      .map((r: any) => {
        const geo = r.geo;
        const name = geo.name || "";
        const country = geo.country || "";
        const region = geo.state || geo.region || "";
        return {
          label: country ? `${name} — ${country}` : name,
          city: name,
          country,
          region,
        };
      })
      .slice(0, 10);

    cache.set(cacheKey, { data: results, ts: Date.now() });

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Autocomplete error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
