function nameToHue(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

interface AvatarProps {
  name: string;
  size?: "sm" | "md";
  className?: string;
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  const initials = getInitials(name);
  const hue = nameToHue(name);
  const bg = `hsl(${hue}, 60%, 50%)`;

  const sizeClasses = size === "sm"
    ? "w-7 h-7 text-[10px]"
    : "w-8 h-8 text-xs";

  return (
    <div
      className={`${sizeClasses} rounded-full flex items-center justify-center font-semibold text-white shrink-0 select-none ${className ?? ""}`}
      style={{ backgroundColor: bg }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
