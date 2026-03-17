import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, ExternalLink, Lightbulb, MessageSquare } from "lucide-react";
import type { Lead } from "@/lib/leadGenerator";

interface LeadCardProps {
  lead: Lead;
  index: number;
  isLocked: boolean;
  onOutreach: (lead: Lead) => void;
}

const LeadCard = ({ lead, index, isLocked, onOutreach }: LeadCardProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05, ease: [0.16, 1, 0.3, 1] }}
      className={`relative bg-card rounded-lg p-4 transition-all duration-200 cursor-pointer ${isLocked ? "opacity-40 blur-[2px] pointer-events-none select-none" : ""}`}
      style={{ boxShadow: isHovered ? "var(--shadow-hover)" : "var(--shadow-subtle)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isLocked && onOutreach(lead)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate">{lead.businessName}</h3>
          <p className="micro-label mt-1">{lead.industry} · {lead.location}</p>
        </div>
        <button
          className="shrink-0 p-2 rounded-md bg-secondary text-primary hover:bg-primary hover:text-primary-foreground transition-all"
          onClick={(e) => { e.stopPropagation(); onOutreach(lead); }}
          title="Generate outreach"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-3 mt-3 text-sm">
        {lead.website && (
          <a
            href={lead.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:underline font-mono-data text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <Globe className="w-3 h-3" />
            Website
            <ExternalLink className="w-3 h-3 transition-transform" style={{ transform: isHovered ? "translateX(2px)" : "none" }} />
          </a>
        )}
        {lead.socialMedia && (
          <a
            href={lead.socialMedia}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent hover:underline font-mono-data text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            Social
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>{lead.reason}</span>
      </div>
    </motion.div>
  );
};

export default LeadCard;
