import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BadgeStatus } from "@workspace/api-client-react";

const RARITY_STYLES: Record<string, { bg: string; border: string; glow: string; label: string }> = {
  common:    { bg: "bg-gray-50",    border: "border-gray-200",   glow: "",                          label: "text-gray-600"    },
  uncommon:  { bg: "bg-blue-50",    border: "border-blue-300",   glow: "shadow-blue-200",           label: "text-blue-700"    },
  rare:      { bg: "bg-purple-50",  border: "border-purple-300", glow: "shadow-purple-200",         label: "text-purple-700"  },
  legendary: { bg: "bg-amber-50",   border: "border-amber-300",  glow: "shadow-amber-200 shadow-lg", label: "text-amber-700"  },
};

interface Props {
  badges: BadgeStatus[];
  onDismiss: () => void;
}

export default function BadgeCelebration({ badges, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        onClick={onDismiss}
      >
        <motion.div
          initial={{ scale: 0.8, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", damping: 18, stiffness: 300 }}
          className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-5xl mb-3"
          >
            🎉
          </motion.div>

          <h2 className="text-xl font-bold text-gray-900 mb-1">
            {badges.length === 1 ? "Badge Unlocked!" : `${badges.length} Badges Unlocked!`}
          </h2>
          <p className="text-sm text-muted-foreground mb-6">Keep it up — you're on a roll!</p>

          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {badges.map((badge, i) => {
              const styles = RARITY_STYLES[badge.rarity] ?? RARITY_STYLES.common;
              return (
                <motion.div
                  key={badge.code}
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", damping: 14, stiffness: 260, delay: 0.15 + i * 0.1 }}
                  className={`w-20 h-20 rounded-2xl border-2 ${styles.bg} ${styles.border} ${styles.glow} flex flex-col items-center justify-center gap-1 shadow-md`}
                >
                  <span className="text-3xl">{badge.icon}</span>
                  <p className={`text-[10px] font-bold ${styles.label} leading-tight px-1 text-center`}>{badge.title}</p>
                </motion.div>
              );
            })}
          </div>

          {badges.length === 1 && (
            <p className="text-xs text-muted-foreground mb-5 italic">"{badges[0].desc}"</p>
          )}

          <button
            onClick={onDismiss}
            className="w-full py-2.5 px-6 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Awesome!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
