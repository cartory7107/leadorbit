export interface Lead {
  id: string;
  businessName: string;
  industry: string;
  website: string | null;
  socialMedia: string | null;
  reason: string;
  location: string;
}

const businessPrefixes: Record<string, string[]> = {
  restaurant: ["Golden Plate", "Fresh Bites", "Urban Kitchen", "Spice Garden", "The Local Table", "Savory Corner", "Flame Grill", "Green Leaf Bistro", "Ocean Breeze Diner", "Royal Feast", "Tasty Junction", "Bamboo Kitchen", "The Hungry Chef", "Sunrise Cafe", "Mountain View Restaurant", "Seaside Grill", "Metro Dining", "Cozy Kitchen", "The Grand Fork", "Velvet Spoon", "Pepper & Salt", "Blue Lagoon Cafe", "The Copper Pot", "Harvest Table", "City Bites", "Cloud Nine Diner", "The Rustic Plate", "Moonlight Kitchen", "Safari Grill", "Crystal Palace", "Vintage Bites", "Paradise Kitchen", "The Secret Garden", "Neon Chopsticks", "Olive Branch", "The Golden Wok", "Silver Spoon Bistro", "Tropic Flavors", "The Daily Grind", "Firefly Cafe", "Urban Harvest", "The Nomad Kitchen", "Zen Garden Restaurant", "The Blue Door", "Maple & Oak", "The Artisan Table", "Coral Reef Diner", "Summit Cuisine", "The Wandering Chef", "Ivy Lane Bistro"],
  "clothing store": ["Style Hub", "Urban Threads", "Fashion Forward", "The Wardrobe", "Chic Boutique", "Trendy Corner", "Velvet Rose", "Edge Fashion", "Modern Closet", "Silk & Stitch", "The Style Vault", "Runway Express", "Thread & Needle", "Fashion Alley", "The Dressing Room", "Luxe Wear", "Bold & Beautiful", "Street Style Co", "The Fashion Lab", "Vintage Vibes", "Cotton & Co", "Denim Republic", "The Fabric House", "Stitch Perfect", "Crown Fashion", "Style Avenue", "The Trend Spot", "Fashion District", "Sapphire Styles", "The Outfit Bar", "Prism Fashion", "Eclipse Wear", "Timber & Cloth", "The Style Loft", "Radiant Threads", "Mosaic Boutique", "The Satin Door", "Wild Bloom Fashion", "Atlas Clothing", "Nordic Thread", "Luna Boutique", "The Canvas Co", "Ember & Stone", "Drift Fashion", "Pacific Threads", "The Luxe Label", "Ivory & Lace", "Phoenix Style", "The Vogue Stop", "Horizon Wear"],
  default: ["Bright Solutions", "Star Services", "Quick Fix Pro", "Prime Choice", "NextGen Solutions", "Elite Services", "First Class Co", "Peak Performance", "Smart Solutions", "Global Reach", "Top Tier Pro", "Innovation Hub", "Pioneer Group", "Alpha Services", "Summit Solutions", "Apex Business", "Horizon Ventures", "Nova Enterprise", "Pinnacle Co", "Zenith Group", "Catalyst Solutions", "Momentum Pro", "Vertex Services", "Vanguard Co", "Eclipse Group", "Titan Solutions", "Forge Industries", "Polaris Services", "Elevate Co", "Keystone Group", "Nexus Ventures", "Orbit Pro", "Terra Solutions", "Atlas Services", "Beacon Co", "Meridian Group", "Prism Solutions", "Compass Pro", "Anchor Services", "Solstice Co", "Trident Group", "Citadel Solutions", "Ember Pro", "Onyx Services", "Sapphire Co", "Granite Group", "Sterling Solutions", "Falcon Pro", "Cascade Services", "Aurora Co"],
};

const reasons = [
  "Has weak or outdated online presence",
  "Could benefit from an online ordering system",
  "No visible social media marketing strategy",
  "Website appears outdated or non-responsive",
  "Missing key SEO optimizations",
  "Could benefit from automated customer follow-ups",
  "No visible Google Business profile optimization",
  "Social media accounts inactive for months",
  "Lacking professional brand identity online",
  "Could benefit from email marketing automation",
  "No online booking or scheduling system",
  "Missing customer review management",
  "Could use a loyalty program system",
  "Website lacks mobile optimization",
  "No visible content marketing strategy",
];

const domains = [".com", ".co", ".io", ".net", ".biz"];
const socials = ["instagram.com/", "facebook.com/", "linkedin.com/company/", "twitter.com/"];

export function generateLeads(businessType: string, location: string, count: number): Lead[] {
  const type = businessType.toLowerCase();
  const names = businessPrefixes[type] || businessPrefixes.default;
  const shuffled = [...names].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, Math.min(count, shuffled.length));

  return selected.map((name, i) => {
    const slug = name.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 15);
    const hasWebsite = Math.random() > 0.3;
    const hasSocial = Math.random() > 0.25;

    return {
      id: `lead-${i}-${Date.now()}`,
      businessName: name,
      industry: businessType,
      website: hasWebsite ? `https://${slug}${domains[Math.floor(Math.random() * domains.length)]}` : null,
      socialMedia: hasSocial ? `https://${socials[Math.floor(Math.random() * socials.length)]}${slug}` : null,
      reason: reasons[Math.floor(Math.random() * reasons.length)],
      location,
    };
  });
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
  const header = "Business Name,Industry,Website,Social Media,AI Insight,Location";
  const rows = leads.map(l =>
    `"${l.businessName}","${l.industry}","${l.website || "N/A"}","${l.socialMedia || "N/A"}","${l.reason}","${l.location}"`
  );
  return [header, ...rows].join("\n");
}
