import { useState } from "react";
import { motion } from "framer-motion";
import { Globe, ExternalLink, Lightbulb, MessageSquare, Mail, Phone, MapPin, Loader2, Search, CheckCircle2 } from "lucide-react";
import type { Lead } from "@/lib/leadGenerator";

interface LeadCardProps {
  lead: Lead;
  index: number;
  isLocked: boolean;
  onOutreach: (lead: Lead) => void;
  onEnrich?: (lead: Lead) => void;
  isEnriching?: boolean;
}

const socialIcons: Record<string, string> = {
  facebook: "FB",
  instagram: "IG",
  twitter: "X",
  linkedin: "LI",
  youtube: "YT",
};

const LeadCard = ({ lead, index, isLocked, onOutreach, onEnrich, isEnriching }: LeadCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const socialEntries = Object.entries(lead.socialMedia || {});

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className={`relative bg-card rounded-xl p-5 transition-all duration-200 cursor-pointer border border-border/50 hover:border-primary/30 ${isLocked ? "opacity-40 blur-[2px] pointer-events-none select-none" : ""}`}
      style={{ boxShadow: isHovered ? "var(--shadow-hover)" : "var(--shadow-subtle)" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => !isLocked && onOutreach(lead)}
    >
      {/* Source badge */}
      <div className="absolute top-3 right-3 flex items-center gap-1">
        {lead.enriched && (
          <span className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-semibold">
            <CheckCircle2 className="w-2.5 h-2.5" /> VERIFIED
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-medium">
          {lead.source === 'enriched' ? <Search className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
          {lead.source === 'enriched' ? 'Enriched' : 'Foursquare'}
        </span>
      </div>

      <div className="flex items-start justify-between gap-3 pr-24">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate text-sm">{lead.businessName}</h3>
          <p className="micro-label mt-1">{lead.category || lead.industry}{lead.city ? ` · ${lead.city}` : ''}{lead.country ? `, ${lead.country}` : ''}</p>
        </div>
      </div>

      {/* Address */}
      {lead.address && (
        <div className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="truncate">{lead.address}</span>
        </div>
      )}

      {/* Website & Socials */}
      <div className="flex items-center gap-2 mt-3 flex-wrap">
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
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
        {socialEntries.map(([platform, url]) => (
          <a
            key={platform}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-secondary text-accent hover:bg-accent hover:text-accent-foreground font-mono-data text-xs transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {socialIcons[platform] || platform}
            <ExternalLink className="w-2.5 h-2.5" />
          </a>
        ))}
      </div>

      {/* Contact info */}
      {(lead.email || lead.phone) && (
        <div className="flex items-center gap-3 mt-2 text-xs">
          {lead.email && (
            <a href={`mailto:${lead.email}`} className="inline-flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              <Mail className="w-3 h-3" /> {lead.email}
            </a>
          )}
          {lead.phone && (
            <a href={`tel:${lead.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
              <Phone className="w-3 h-3" /> {lead.phone}
            </a>
          )}
        </div>
      )}

      {/* AI Insight */}
      <div className="flex items-start gap-1.5 mt-3 text-xs text-muted-foreground">
        <Lightbulb className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
        <span>{lead.reason}</span>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/50">
        {!lead.enriched && lead.website && onEnrich && (
          <button
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-secondary text-accent hover:bg-accent hover:text-accent-foreground text-xs font-medium transition-all"
            onClick={(e) => { e.stopPropagation(); onEnrich(lead); }}
            disabled={isEnriching}
          >
            {isEnriching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Globe className="w-3.5 h-3.5" />}
            {isEnriching ? "Enriching..." : "Enrich"}
          </button>
        )}
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground text-xs font-medium transition-all"
          onClick={(e) => { e.stopPropagation(); onOutreach(lead); }}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Outreach
        </button>
      </div>
    </motion.div>
  );
};

export default LeadCard;
