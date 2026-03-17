import { motion } from "framer-motion";

const LeadCardSkeleton = ({ index }: { index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    className="bg-card rounded-xl p-5 border border-border/50"
  >
    <div className="animate-pulse space-y-3">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 w-3/4 rounded bg-secondary" />
          <div className="h-3 w-1/2 rounded bg-secondary mt-2" />
        </div>
        <div className="h-5 w-16 rounded-full bg-secondary" />
      </div>
      <div className="h-3 w-full rounded bg-secondary/60" />
      <div className="flex gap-2">
        <div className="h-6 w-20 rounded bg-secondary" />
        <div className="h-6 w-16 rounded bg-secondary" />
      </div>
      <div className="h-3 w-4/5 rounded bg-secondary/50" />
      <div className="flex gap-2 pt-2 border-t border-border/50">
        <div className="h-8 flex-1 rounded-lg bg-secondary" />
        <div className="h-8 flex-1 rounded-lg bg-secondary" />
      </div>
    </div>
  </motion.div>
);

export default LeadCardSkeleton;
