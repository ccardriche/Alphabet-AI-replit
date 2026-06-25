import { motion } from "framer-motion";
import {
  Rocket,
  BookOpen,
  Bot,
  Trophy,
  Star,
  Sparkles,
  Zap,
  Heart,
  Award,
  Flame,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type OnboardingIllustrationVariant =
  | "welcome"
  | "reading"
  | "coaching"
  | "achievement";

type FloatItem = { icon: LucideIcon; className: string; delay: string };

type VariantConfig = {
  /** Plain-language description used as the accessible label / alt text. */
  alt: string;
  /** Big central glyph. */
  hero: LucideIcon;
  /** Tailwind gradient for the panel background. */
  panel: string;
  /** Tailwind gradient for the hero badge. */
  badge: string;
  /** Glow color behind the hero badge. */
  glow: string;
  /** Floating decorative icons. */
  floats: FloatItem[];
  /** Caption shown beneath the art. */
  caption: string;
};

const VARIANTS: Record<OnboardingIllustrationVariant, VariantConfig> = {
  welcome: {
    alt: "A friendly rocket ship blasting off with stars, ready to start a reading adventure",
    hero: Rocket,
    panel: "from-[#0a1138] via-[#1b1466] to-[#3a0ca3]",
    badge: "from-[#00d4ff] to-[#8a2be2]",
    glow: "bg-[#00d4ff]/40",
    caption: "Start your mission!",
    floats: [
      { icon: Star, className: "top-4 left-5 text-[#ffaa00] w-6 h-6", delay: "0s" },
      { icon: Sparkles, className: "top-8 right-6 text-[#00fa9a] w-7 h-7", delay: "0.6s" },
      { icon: Zap, className: "bottom-6 left-8 text-[#ff007f] w-6 h-6", delay: "1.2s" },
      { icon: Star, className: "bottom-8 right-7 text-[#00d4ff] w-5 h-5", delay: "0.3s" },
    ],
  },
  reading: {
    alt: "An open book glowing with bright letters, showing reading and word practice",
    hero: BookOpen,
    panel: "from-[#04123a] via-[#062a6e] to-[#0353a4]",
    badge: "from-[#00fa9a] to-[#00d4ff]",
    glow: "bg-[#00fa9a]/40",
    caption: "Read & play with words!",
    floats: [
      { icon: Sparkles, className: "top-5 left-6 text-[#ffaa00] w-6 h-6", delay: "0.2s" },
      { icon: Star, className: "top-9 right-5 text-[#ff007f] w-6 h-6", delay: "0.9s" },
      { icon: Heart, className: "bottom-7 left-5 text-[#ff007f] w-5 h-5", delay: "1.4s" },
      { icon: Zap, className: "bottom-5 right-8 text-[#00fa9a] w-6 h-6", delay: "0.5s" },
    ],
  },
  coaching: {
    alt: "A cheerful robot helper surrounded by sparkles, ready to coach and give hints",
    hero: Bot,
    panel: "from-[#1a0938] via-[#3a0ca3] to-[#6d23b6]",
    badge: "from-[#ff007f] to-[#8a2be2]",
    glow: "bg-[#ff007f]/40",
    caption: "Your AI helper is here!",
    floats: [
      { icon: Sparkles, className: "top-4 left-7 text-[#00d4ff] w-7 h-7", delay: "0.1s" },
      { icon: Heart, className: "top-9 right-6 text-[#ff007f] w-6 h-6", delay: "0.8s" },
      { icon: Star, className: "bottom-6 left-6 text-[#ffaa00] w-5 h-5", delay: "1.3s" },
      { icon: Zap, className: "bottom-8 right-7 text-[#00fa9a] w-6 h-6", delay: "0.4s" },
    ],
  },
  achievement: {
    alt: "A shining gold trophy with stars and an XP burst, celebrating a level-up",
    hero: Trophy,
    panel: "from-[#3a1402] via-[#7a3a00] to-[#b56500]",
    badge: "from-[#ffaa00] to-[#ff007f]",
    glow: "bg-[#ffaa00]/50",
    caption: "Level up & earn XP!",
    floats: [
      { icon: Star, className: "top-4 left-6 text-[#ffaa00] w-7 h-7", delay: "0.2s" },
      { icon: Award, className: "top-8 right-6 text-[#00d4ff] w-7 h-7", delay: "0.7s" },
      { icon: Flame, className: "bottom-6 left-7 text-[#ff007f] w-6 h-6", delay: "1.1s" },
      { icon: Sparkles, className: "bottom-8 right-7 text-[#00fa9a] w-6 h-6", delay: "0.5s" },
    ],
  },
};

export default function OnboardingIllustration({
  variant,
  className,
}: {
  variant: OnboardingIllustrationVariant;
  className?: string;
}) {
  const cfg = VARIANTS[variant];
  const Hero = cfg.hero;

  return (
    <motion.div
      key={variant}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, type: "spring", bounce: 0.2 }}
      role="img"
      aria-label={cfg.alt}
      className={cn(
        "relative w-full overflow-hidden rounded-3xl border-2 border-white/10 shadow-xl",
        "aspect-[5/3] sm:aspect-[4/3] lg:aspect-square",
        "bg-gradient-to-br",
        cfg.panel,
        className,
      )}
    >
      {/* soft grid + glow backdrop */}
      <div className="absolute inset-0 pattern-grid-lg opacity-20" aria-hidden="true" />
      <div
        className={cn(
          "absolute left-1/2 top-1/2 h-40 w-40 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl",
          cfg.glow,
        )}
        aria-hidden="true"
      />

      {/* floating decorations */}
      {cfg.floats.map((f, i) => {
        const FloatIcon = f.icon;
        return (
          <span
            key={i}
            className={cn("absolute onboard-float drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]", f.className)}
            style={{ animationDelay: f.delay }}
            aria-hidden="true"
          >
            <FloatIcon className="w-full h-full" strokeWidth={2.5} />
          </span>
        );
      })}

      {/* hero badge */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-4 text-center">
        <div
          className={cn(
            "onboard-float-slow flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br shadow-2xl ring-4 ring-white/15 sm:h-28 sm:w-28",
            cfg.badge,
          )}
          aria-hidden="true"
        >
          <Hero className="h-12 w-12 text-white sm:h-14 sm:w-14" strokeWidth={2.5} />
        </div>
        <span className="rounded-full bg-black/30 px-4 py-1.5 text-[11px] font-black uppercase tracking-widest text-white backdrop-blur-sm sm:text-xs">
          {cfg.caption}
        </span>
      </div>
    </motion.div>
  );
}
