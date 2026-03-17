import { supabase } from "@/integrations/supabase/client";

export interface Lead {
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

export async function searchLeads(businessType: string, location: string, limit = 20): Promise<{ leads: Lead[]; totalFound: number }> {
  const { data, error } = await supabase.functions.invoke('search-leads', {
    body: { businessType, location, limit },
  });

  if (error) {
    throw new Error(error.message || 'Failed to search leads');
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Search returned no results');
  }

  return { leads: data.data as Lead[], totalFound: data.totalFound || data.data.length };
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
    description: enriched.description || lead.description,
    enriched: true,
  };
}

export function generateOutreach(lead: Lead, service?: string): { dm: string; email: string; short: string } {
  const serviceText = service
    ? `I specialize in ${service} and believe it could significantly boost your business.`
    : "I help businesses strengthen their digital presence and attract more customers online.";

  const dm = `Hi there! 👋 I came across ${lead.businessName} and was really impressed. I noticed ${lead.reason.toLowerCase()}, and I'd love to help. ${serviceText} Would you be open to a quick chat?`;

  const email = `Subject: Quick idea for ${lead.businessName}\n\nHello,\n\nI recently came across ${lead.businessName} in ${lead.location} and I was impressed by your work in the ${lead.industry} space.\n\nHowever, I noticed that your business ${lead.reason.toLowerCase()}. ${serviceText}\n\nI've helped similar businesses increase their online visibility and revenue. I'd love to share a few ideas that could work for you.\n\nWould you be available for a brief 10-minute call this week?\n\nBest regards`;

  const short = `Hey! Noticed ${lead.businessName} ${lead.reason.toLowerCase()}. ${service ? `I offer ${service} that could help.` : "I can help fix that."} Interested?`;

  return { dm, email, short };
}

export function leadsToCSV(leads: Lead[]): string {
  const header = "Business Name,Industry,Website,Address,Facebook,Instagram,Twitter,Email,Phone,AI Insight,Location,Source";
  const rows = leads.map(l =>
    `"${l.businessName}","${l.industry}","${l.website || "N/A"}","${l.address || "N/A"}","${l.socialMedia?.facebook || "N/A"}","${l.socialMedia?.instagram || "N/A"}","${l.socialMedia?.twitter || "N/A"}","${l.email || "N/A"}","${l.phone || "N/A"}","${l.reason}","${l.location}","${l.source}"`
  );
  return [header, ...rows].join("\n");
}
