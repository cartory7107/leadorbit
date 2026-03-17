import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Mail, MessageCircle, Zap, RefreshCw, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/leadGenerator";
import { generateOutreach } from "@/lib/leadGenerator";
import { supabase } from "@/integrations/supabase/client";

interface OutreachPanelProps {
  lead: Lead;
  service?: string;
  onClose: () => void;
}

type TabType = "dm" | "email" | "short";

const LANGUAGES = [
  { code: "English", label: "English", flag: "🇬🇧" },
  { code: "Bangla", label: "বাংলা", flag: "🇧🇩" },
  { code: "Urdu", label: "اردو", flag: "🇵🇰" },
  { code: "Hindi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "Spanish", label: "Español", flag: "🇪🇸" },
  { code: "Italian", label: "Italiano", flag: "🇮🇹" },
  { code: "French", label: "Français", flag: "🇫🇷" },
  { code: "Arabic", label: "العربية", flag: "🇸🇦" },
];

const OutreachPanel = ({ lead, service, onClose }: OutreachPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("dm");
  const [copied, setCopied] = useState(false);
  const [language, setLanguage] = useState("English");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiMessages, setAiMessages] = useState<Record<string, { dm: string; email: string; short: string }>>({});

  // Cache key for this lead + language combo
  const cacheKey = `${lead.id}-${language}`;

  // Fallback English messages (instant)
  const fallback = generateOutreach(lead, service || undefined);

  const currentMessages = aiMessages[cacheKey] || (language === "English" ? fallback : null);

  const generateAiOutreach = useCallback(async (lang: string) => {
    const key = `${lead.id}-${lang}`;
    if (aiMessages[key]) return; // Already cached

    if (lang === "English") {
      // Use local generation for English
      setAiMessages(prev => ({ ...prev, [key]: fallback }));
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-outreach', {
        body: {
          businessName: lead.businessName,
          category: lead.category || lead.industry,
          city: lead.city || lead.location,
          country: lead.country,
          language: lang,
          service: service || undefined,
        },
      });

      if (error || !data?.success) {
        console.error('Outreach generation failed:', error || data?.error);
        // Fallback to English
        setAiMessages(prev => ({ ...prev, [key]: fallback }));
      } else {
        setAiMessages(prev => ({ ...prev, [key]: data.data }));
      }
    } catch (e) {
      console.error('Outreach error:', e);
      setAiMessages(prev => ({ ...prev, [key]: fallback }));
    } finally {
      setIsGenerating(false);
    }
  }, [lead, service, fallback, aiMessages]);

  // Auto-generate when language changes
  useEffect(() => {
    generateAiOutreach(language);
  }, [language]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegenerate = () => {
    // Remove cache for current key and regenerate
    setAiMessages(prev => {
      const next = { ...prev };
      delete next[cacheKey];
      return next;
    });
    setTimeout(() => generateAiOutreach(language), 0);
  };

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "dm", label: "DM", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { key: "email", label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
    { key: "short", label: "Short", icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  const messageContent = currentMessages ? currentMessages[activeTab] : "";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(messageContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-lg bg-card rounded-xl glass-border overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-secondary">
            <div>
              <h3 className="font-semibold text-foreground">{lead.businessName}</h3>
              <p className="micro-label mt-0.5">Outreach Message Generator</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Language Selector */}
          <div className="px-4 pt-3">
            <label className="micro-label mb-1.5 block">
              <Globe className="w-3 h-3 inline mr-1" />
              Select Language
            </label>
            <div className="flex flex-wrap gap-1.5">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    language === lang.code
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-secondary text-muted-foreground hover:text-foreground hover:bg-secondary/80"
                  }`}
                >
                  {lang.flag} {lang.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 p-2 mx-4 mt-3 bg-secondary rounded-lg">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="relative p-4">
            <div className="bg-secondary/50 rounded-lg p-4 font-mono-data text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto border border-secondary min-h-[120px]">
              {isGenerating ? (
                <div className="flex items-center justify-center h-24 gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Generating in {language}...</span>
                </div>
              ) : (
                messageContent || "Generating..."
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                variant="secondary"
                onClick={handleRegenerate}
                disabled={isGenerating}
                className="gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                Regenerate
              </Button>
              <Button
                size="sm"
                variant={copied ? "default" : "secondary"}
                onClick={handleCopy}
                disabled={isGenerating || !messageContent}
                className={`gap-1.5 ml-auto ${copied ? "glow" : ""}`}
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OutreachPanel;
