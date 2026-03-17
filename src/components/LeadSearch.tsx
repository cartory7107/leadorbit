import { useState, useRef } from "react";
import { Search, MapPin, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface LeadSearchProps {
  onSearch: (businessType: string, location: string, service: string) => void;
  isLoading: boolean;
}

const LeadSearch = ({ onSearch, isLoading }: LeadSearchProps) => {
  const [businessType, setBusinessType] = useState("");
  const [location, setLocation] = useState("");
  const [service, setService] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

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
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="e.g. Restaurant, Dentist, Clothing Store"
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="micro-label">Target Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City or Country"
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              required
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="micro-label">Your Service (Optional)</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={service}
              onChange={(e) => setService(e.target.value)}
              placeholder="e.g. Website Design, Marketing, Automation"
              className="w-full h-12 pl-10 pr-4 rounded-lg bg-secondary text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
            />
          </div>
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
