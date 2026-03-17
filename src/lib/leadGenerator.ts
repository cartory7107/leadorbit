import { supabase } from "@/integrations/supabase/client";

export interface Lead {
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
  // Keep backward compat
  industry: string;
  location: string;
}

export async function searchLeads(businessType: string, location: string, limit = 10): Promise<{ leads: Lead[]; totalFound: number }> {
  const { data, error } = await supabase.functions.invoke('search-leads', {
    body: { businessType, location, limit },
  });

  if (error) {
    throw new Error(error.message || 'Failed to search leads');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Search returned no results');
  }

  // Map fields for backward compat
  const leads = (data.data as Lead[]).map(l => ({
    ...l,
    industry: l.category || l.industry || '',
    location: l.city || l.location || location,
  }));

  return { leads, totalFound: data.totalFound || leads.length };
}

export async function enrichLead(lead: Lead): Promise<Partial<Lead>> {
  if (!lead.website) return {};

  const { data, error } = await supabase.functions.invoke('enrich-lead', {
    body: { url: lead.website },
  });

  if (error || !data?.success) {
    console.warn('Enrichment failed for', lead.businessName);
    return {};
  }

  const enriched = data.data;
  return {
    socialMedia: { ...lead.socialMedia, ...enriched.socialMedia },
    email: enriched.emails?.[0] || lead.email,
    phone: enriched.phones?.[0] || lead.phone,
    enriched: true,
  };
}

export function generateOutreach(lead: Lead, service?: string): { dm: string; email: string; short: string } {
  const biz = lead.businessName;
  const cat = lead.category || lead.industry;
  const loc = lead.city || lead.location;

  const serviceText = service
    ? `I specialize in ${service} and believe it could significantly boost your business.`
    : "I help businesses strengthen their digital presence and attract more customers online.";

  const dm = `Hi there! 👋 I came across ${biz} and was really impressed with your work in ${cat}. ${serviceText} Would you be open to a quick chat?`;

  const email = `Subject: Quick idea for ${biz}\n\nHello,\n\nI recently came across ${biz} in ${loc} and I was impressed by your work in the ${cat} space.\n\n${serviceText}\n\nI've helped similar businesses increase their online visibility and revenue. I'd love to share a few ideas that could work for you.\n\nWould you be available for a brief 10-minute call this week?\n\nBest regards`;

  const short = `Hey! Love what ${biz} is doing in ${cat}. ${service ? `I offer ${service} that could help grow your business.` : "I can help boost your online presence."} Interested?`;

  return { dm, email, short };
}

export function leadsToCSV(leads: Lead[]): string {
  const header = "Business Name,Category,Address,Website,Email,Phone,Facebook,Instagram,Twitter,City,Country,Source";
  const rows = leads.map(l =>
    `"${l.businessName}","${l.category || ''}","${l.address || 'N/A'}","${l.website || 'N/A'}","${l.email || 'N/A'}","${l.phone || 'N/A'}","${l.socialMedia?.facebook || 'N/A'}","${l.socialMedia?.instagram || 'N/A'}","${l.socialMedia?.twitter || 'N/A'}","${l.city || ''}","${l.country || ''}","${l.source}"`
  );
  return [header, ...rows].join("\n");
}
