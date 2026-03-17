import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Copy, Check, Mail, MessageCircle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/lib/leadGenerator";
import { generateOutreach } from "@/lib/leadGenerator";

interface OutreachPanelProps {
  lead: Lead;
  service?: string;
  onClose: () => void;
}

type TabType = "dm" | "email" | "short";

const OutreachPanel = ({ lead, service, onClose }: OutreachPanelProps) => {
  const [activeTab, setActiveTab] = useState<TabType>("dm");
  const [copied, setCopied] = useState(false);
  const outreach = generateOutreach(lead, service || undefined);

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    { key: "dm", label: "DM", icon: <MessageCircle className="w-3.5 h-3.5" /> },
    { key: "email", label: "Email", icon: <Mail className="w-3.5 h-3.5" /> },
    { key: "short", label: "Short", icon: <Zap className="w-3.5 h-3.5" /> },
  ];

  const handleCopy = async () => {
    await navigator.clipboard.writeText(outreach[activeTab]);
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
              <p className="micro-label mt-0.5">Outreach Messages</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
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
            <div className="bg-secondary/50 rounded-lg p-4 font-mono-data text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto border border-secondary">
              {outreach[activeTab]}
            </div>

            {/* Copy Button */}
            <Button
              size="sm"
              variant={copied ? "default" : "secondary"}
              onClick={handleCopy}
              className={`absolute top-6 right-6 transition-all ${copied ? "glow" : ""}`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OutreachPanel;
