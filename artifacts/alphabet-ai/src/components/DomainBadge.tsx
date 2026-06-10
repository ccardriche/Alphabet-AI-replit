import { DOMAIN_COLORS, DOMAIN_LABELS } from "@/lib/constants";

interface DomainBadgeProps {
  domainCode: string;
  size?: "sm" | "md";
}

export default function DomainBadge({ domainCode, size = "md" }: DomainBadgeProps) {
  const color = DOMAIN_COLORS[domainCode] ?? "#6b7280";
  const label = DOMAIN_LABELS[domainCode] ?? domainCode;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-white ${size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs"}`}
      style={{ backgroundColor: color }}
    >
      {domainCode} · {label}
    </span>
  );
}
