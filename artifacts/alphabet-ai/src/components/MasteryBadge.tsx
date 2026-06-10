import { cn } from "@/lib/utils";
import { MASTERY_COLORS, MASTERY_LABELS } from "@/lib/constants";

interface MasteryBadgeProps {
  level: string;
  size?: "sm" | "md";
  showLabel?: boolean;
}

export default function MasteryBadge({ level, size = "md", showLabel = true }: MasteryBadgeProps) {
  const colorClass = MASTERY_COLORS[level] ?? "bg-gray-200 text-gray-600";
  const label = MASTERY_LABELS[level] ?? level;

  return (
    <span className={cn(
      "inline-flex items-center rounded-full font-medium",
      colorClass,
      size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"
    )}>
      {showLabel ? label : ""}
    </span>
  );
}
