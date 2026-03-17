import { useState, useRef, useCallback, useMemo } from "react";
import { Search, Briefcase, MapPin, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import SmartAutocomplete from "@/components/SmartAutocomplete";
import { supabase } from "@/integrations/supabase/client";

interface LeadSearchProps {
  onSearch: (businessType: string, location: string, service: string) => void;
  isLoading: boolean;
}

const BUSINESS_TYPES = [
  "Restaurant", "Cafe", "Bakery", "Clothing Store", "Beauty Salon", "Barbershop",
  "Gym", "Dentist", "Doctor Clinic", "Real Estate Agency", "Law Firm", "Hotel",
  "Travel Agency", "Electronics Store", "Furniture Store", "Jewelry Store",
  "Car Repair Shop", "Marketing Agency", "Web Design Agency", "SaaS Company",
  "Salon", "Salad Bar", "Saloon", "Resort", "Retail Store", "Recruitment Agency",
  "Pharmacy", "Pet Store", "Photography Studio", "Printing Shop", "Plumber",
  "Pizza Shop", "Accounting Firm", "Auto Dealer", "Bar", "Book Store",
  "Car Wash", "Catering Service", "Construction Company", "Consulting Firm",
  "Courier Service", "Daycare Center", "Dry Cleaner", "Event Planner",
  "Florist", "Food Truck", "Gas Station", "Grocery Store", "Hardware Store",
  "Ice Cream Shop", "Insurance Agency", "Laundromat", "Library", "Locksmith",
  "Motel", "Music Store", "Nail Salon", "Nightclub", "Office Supplies",
  "Optical Store", "Paint Store", "Parking Lot", "Pawn Shop", "Spa",
  "Sports Store", "Tattoo Parlor", "Tire Shop", "Toy Store", "Veterinary Clinic",
];

const SERVICES = [
  "Website Development", "Website Redesign", "Ecommerce Store Setup",
  "Shopify Development", "WordPress Development", "SEO Optimization",
  "Local SEO", "Technical SEO", "Google Ads Management", "Meta Ads Management",
  "Social Media Marketing", "Email Marketing", "Branding", "Logo Design",
  "Video Editing", "Content Marketing", "Automation Setup", "AI Chatbot Integration",
  "Mobile App Development", "UI/UX Design", "Graphic Design", "PPC Management",
  "Copywriting", "PR Services", "Influencer Marketing", "Lead Generation",
  "CRM Setup", "Data Analytics", "Cloud Consulting", "Cybersecurity Services",
];

function fuzzyMatch(items: string[], query: string) {
  const q = query.toLowerCase();
  return items
    .filter((item) => item.toLowerCase().includes(q))
    .sort((a, b) => {
      const aStarts = a.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.toLowerCase().startsWith(q) ? 0 : 1;
      return aStarts - bStarts;
    })
    .slice(0, 10)
    .map((label) => ({ label, value: label }));
}

const locationCache = new Map<string, { data: any[]; ts: number }>();
const LOC_CACHE_TTL = 5 * 60 * 1000;

const LeadSearch = ({ onSearch, isLoading }: LeadSearchProps) => {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  const fetchLocationSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) return [];
    const key = query.toLowerCase();
    const cached = locationCache.get(key);
    if (cached && Date.now() - cached.ts < LOC_CACHE_TTL) return cached.data;

    try {
      const { data, error } = await supabase.functions.invoke("autocomplete-location", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        body: undefined,
      });

      // supabase.functions.invoke doesn't support query params well for GET,
      // so let's use fetch directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      const url = `https://${projectId}.supabase.co/functions/v1/autocomplete-location?query=${encodeURIComponent(query)}`;
      
      const res = await fetch(url, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (!res.ok) throw new Error("Failed");
      const results = await res.json();
      const mapped = (results || []).map((r: any) => ({
        label: r.label,
        value: r.city || r.label,
      }));
      locationCache.set(key, { data: mapped, ts: Date.now() });
      return mapped;
    } catch {
      return [];
    }
  }, []);

  const fetchBusinessSuggestions = useCallback(async (query: string) => {
    return fuzzyMatch(BUSINESS_TYPES, query);
  }, []);

  const fetchServiceSuggestions = useCallback(async (query: string) => {
    return fuzzyMatch(SERVICES, query);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (businessType.trim() && location.trim()) {
      onSearch(businessType.trim(), location.trim(), service.trim());
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="max-w-2xl mx-auto px-4"
      id="tool-section"
    >
      <form ref={formRef} onSubmit={handleSubmit} className="relative bg-card rounded-xl p-6 glass-border space-y-4">
        {isLoading && (
          <div className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl overflow-hidden">
            <div className="h-full bg-gradient-primary animate-scan w-1/2" />
          </div>
        )}

        <div className="space-y-1">
          <label className="micro-label">Business Type</label>
          <SmartAutocomplete
            value={businessType}
            onChange={setBusinessType}
            placeholder="e.g. Restaurant, Dentist, Clothing Store"
            icon={Briefcase}
            fetchSuggestions={fetchBusinessSuggestions}
            debounceMs={100}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="micro-label">Target Location</label>
          <SmartAutocomplete
            value={location}
            onChange={setLocation}
            placeholder="e.g. Dhaka, New York, London"
            icon={MapPin}
            fetchSuggestions={fetchLocationSuggestions}
            debounceMs={300}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="micro-label">Your Service (Optional)</label>
          <SmartAutocomplete
            value={service}
            onChange={setService}
            placeholder="e.g. Website Design, SEO, Marketing"
            icon={Wrench}
            fetchSuggestions={fetchServiceSuggestions}
            debounceMs={100}
          />
        </div>

        <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Scanning the web...
            </span>
          ) : (
            <>
              Generate Leads
              <Search className="w-5 h-5 ml-1" />
            </>
          )}
        </Button>
      </form>
    </motion.section>
  );
};

export default LeadSearch;
