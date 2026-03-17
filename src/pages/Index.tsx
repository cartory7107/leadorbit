import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/HeroSection";
import LeadSearch from "@/components/LeadSearch";
import LeadCard from "@/components/LeadCard";
import OutreachPanel from "@/components/OutreachPanel";
import { generateLeads, leadsToCSV, type Lead } from "@/lib/leadGenerator";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/og-image.png";

const FREE_LIMIT = 10;
const TOTAL_LEADS = 30;

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [service, setService] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleStart = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = useCallback((businessType: string, location: string, svc: string) => {
    setIsLoading(true);
    setService(svc);
    setSearchDone(false);

    // Simulate AI processing
    setTimeout(() => {
      const newLeads = generateLeads(businessType, location, TOTAL_LEADS);
      setLeads(newLeads);
      setIsLoading(false);
      setSearchDone(true);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }, 2000);
  }, []);

  const visibleLeads = isPremium ? leads : leads.slice(0, FREE_LIMIT);
  const lockedLeads = isPremium ? [] : leads.slice(FREE_LIMIT);
  const totalFound = leads.length;

  const handleExportCSV = () => {
    const data = leadsToCSV(visibleLeads);
    const blob = new Blob([data], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cartory-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported!", description: `${visibleLeads.length} leads downloaded as CSV.` });
  };

  const handleCopyAll = async () => {
    const text = visibleLeads.map(l => `${l.businessName} | ${l.industry} | ${l.website || "N/A"} | ${l.reason}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${visibleLeads.length} leads copied to clipboard.` });
  };

  const handleUnlock = () => {
    setIsPremium(true);
    toast({ title: "🎉 Premium Unlocked!", description: "You now have access to all leads." });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-secondary">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <img src={logoImage} alt="Cartory Lead Orbit" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-semibold text-foreground text-sm">Cartory Lead Orbit</span>
          </div>
          <div className="micro-label">AI Lead Hunter</div>
        </div>
      </header>

      <main className="pt-14">
        {/* Hero */}
        <HeroSection onStart={handleStart} />

        {/* Ad Placeholder */}
        <div className="container max-w-2xl mx-auto px-4 mb-8">
          <div className="h-[90px] rounded-lg bg-secondary/50 glass-border flex items-center justify-center">
            <span className="micro-label text-muted-foreground/50">Sponsored</span>
          </div>
        </div>

        {/* Tool */}
        <div ref={toolRef}>
          <LeadSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        {/* Results */}
        <AnimatePresence>
          {searchDone && leads.length > 0 && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="container max-w-4xl mx-auto px-4 mt-12 mb-20"
            >
              {/* Results header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold text-foreground">
                    Found <span className="text-primary font-mono-data">{totalFound}</span> Leads
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isPremium ? "All leads unlocked" : `Showing ${FREE_LIMIT} of ${totalFound} leads`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleCopyAll}>
                    <Copy className="w-3.5 h-3.5" />
                    Copy All
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleExportCSV}>
                    <Download className="w-3.5 h-3.5" />
                    Export CSV
                  </Button>
                </div>
              </div>

              {/* Lead grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {visibleLeads.map((lead, i) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    index={i}
                    isLocked={false}
                    onOutreach={setSelectedLead}
                  />
                ))}
                {lockedLeads.slice(0, 4).map((lead, i) => (
                  <LeadCard
                    key={lead.id}
                    lead={lead}
                    index={visibleLeads.length + i}
                    isLocked={true}
                    onOutreach={() => {}}
                  />
                ))}
              </div>

              {/* Paywall */}
              {!isPremium && lockedLeads.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="relative mt-4 p-8 rounded-xl bg-card glass-border text-center"
                >
                  <div className="absolute inset-0 rounded-xl backdrop-blur-[1px]" />
                  <div className="relative z-10">
                    <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-foreground mb-2">
                      You found {FREE_LIMIT} leads. There are {totalFound - FREE_LIMIT} more.
                    </h3>
                    <p className="text-muted-foreground text-sm mb-5">
                      Unlock the full list for just $5
                    </p>
                    <Button variant="premium" size="lg" onClick={handleUnlock}>
                      <Lock className="w-4 h-4" />
                      Unlock {totalFound - FREE_LIMIT} More Leads — $5
                    </Button>
                  </div>
                </motion.div>
              )}

              {/* Bottom Ad */}
              <div className="mt-10 h-[90px] rounded-lg bg-secondary/50 glass-border flex items-center justify-center">
                <span className="micro-label text-muted-foreground/50">Sponsored</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="border-t border-secondary py-8 mt-12">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">Cartory Lead Orbit — AI Powered Lead Discovery</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>

      {/* Outreach Panel */}
      {selectedLead && (
        <OutreachPanel
          lead={selectedLead}
          service={service}
          onClose={() => setSelectedLead(null)}
        />
      )}
    </div>
  );
};

export default Index;
