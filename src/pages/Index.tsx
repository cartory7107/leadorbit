import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Lock, Copy, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import HeroSection from "@/components/HeroSection";
import LeadSearch from "@/components/LeadSearch";
import LeadCard from "@/components/LeadCard";
import OutreachPanel from "@/components/OutreachPanel";
import { searchLeads, enrichLead, leadsToCSV, type Lead } from "@/lib/leadGenerator";
import { useToast } from "@/hooks/use-toast";
import logoImage from "@/assets/logo.png";

const FREE_LIMIT = 10;

const Index = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalFound, setTotalFound] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [service, setService] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [searchDone, setSearchDone] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [enrichingIds, setEnrichingIds] = useState<Set<string>>(new Set());
  const resultsRef = useRef<HTMLDivElement>(null);
  const toolRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const handleStart = () => {
    toolRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSearch = useCallback(async (businessType: string, location: string, svc: string) => {
    setIsLoading(true);
    setService(svc);
    setSearchDone(false);
    setSearchError(null);

    try {
      const limit = isPremium ? 100 : FREE_LIMIT + 5;
      const result = await searchLeads(businessType, location, limit);
      setLeads(result.leads);
      setTotalFound(result.totalFound);
      setSearchDone(true);

      if (result.leads.length === 0) {
        setSearchError("No leads found. Try a different business type or location.");
      }

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Search failed";
      setSearchError(msg);
      setSearchDone(true);
      toast({ title: "Search Error", description: msg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast, isPremium]);

  const handleEnrich = useCallback(async (lead: Lead) => {
    setEnrichingIds(prev => new Set(prev).add(lead.id));
    try {
      const enrichedData = await enrichLead(lead);
      setLeads(prev => prev.map(l =>
        l.id === lead.id ? { ...l, ...enrichedData, enriched: true } : l
      ));
      toast({ title: "Enriched!", description: `Found additional data for ${lead.businessName}` });
    } catch {
      toast({ title: "Enrichment failed", description: "Could not fetch additional data", variant: "destructive" });
    } finally {
      setEnrichingIds(prev => {
        const next = new Set(prev);
        next.delete(lead.id);
        return next;
      });
    }
  }, [toast]);

  const visibleLeads = isPremium ? leads : leads.slice(0, FREE_LIMIT);
  const lockedLeads = isPremium ? [] : leads.slice(FREE_LIMIT);

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
    const text = visibleLeads.map(l => `${l.businessName} | ${l.category || l.industry} | ${l.website || "N/A"} | ${l.email || "N/A"}`).join("\n");
    await navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${visibleLeads.length} leads copied to clipboard.` });
  };

  const handleUnlock = () => {
    setIsPremium(true);
    toast({ title: "🎉 Premium Unlocked!", description: "You now have access to 100 leads per search." });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <img src={logoImage} alt="Cartory Lead Orbit" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-semibold text-foreground text-sm">Cartory Lead Orbit</span>
          </div>
          <div className="micro-label">AI Lead Hunter</div>
        </div>
      </header>

      <main className="pt-14">
        <HeroSection onStart={handleStart} />

        <div ref={toolRef}>
          <LeadSearch onSearch={handleSearch} isLoading={isLoading} />
        </div>

        <AnimatePresence>
          {searchDone && (
            <motion.div
              ref={resultsRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="container max-w-5xl mx-auto px-4 mt-12 mb-20"
            >
              {searchError && leads.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Search Issue</h3>
                  <p className="text-muted-foreground text-sm max-w-md mx-auto">{searchError}</p>
                </div>
              ) : leads.length > 0 && (
                <>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                    <div>
                      <h2 className="text-xl font-bold text-foreground">
                        Found <span className="text-primary font-mono-data">{totalFound}</span> Verified Leads
                      </h2>
                      <p className="text-xs text-muted-foreground mt-1">
                        Powered by Foursquare Places + Firecrawl enrichment
                        {!isPremium && ` · Showing ${Math.min(FREE_LIMIT, leads.length)} of ${totalFound}`}
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {visibleLeads.map((lead, i) => (
                      <LeadCard
                        key={lead.id}
                        lead={lead}
                        index={i}
                        isLocked={false}
                        onOutreach={setSelectedLead}
                        onEnrich={handleEnrich}
                        isEnriching={enrichingIds.has(lead.id)}
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

                  {!isPremium && lockedLeads.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5 }}
                      className="relative mt-6 p-8 rounded-xl bg-card border border-primary/20 text-center"
                      style={{ boxShadow: "var(--shadow-glow)" }}
                    >
                      <Lock className="w-8 h-8 text-primary mx-auto mb-3" />
                      <h3 className="text-lg font-bold text-foreground mb-2">
                        Unlock up to 100 leads per search
                      </h3>
                      <p className="text-muted-foreground text-sm mb-5">
                        Get full access to all verified leads with contact details for just $5
                      </p>
                      <Button variant="premium" size="lg" onClick={handleUnlock}>
                        <Lock className="w-4 h-4" />
                        Unlock All Leads — $5
                      </Button>
                    </motion.div>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="border-t border-border/50 py-8 mt-12">
        <div className="container text-center">
          <p className="text-sm text-muted-foreground">Cartory Lead Orbit — AI Powered Lead Discovery</p>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-muted-foreground hover:text-primary transition-colors">Terms</a>
          </div>
        </div>
      </footer>

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
