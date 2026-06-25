import { useLocation } from "wouter";
import { Eye, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import { getRole, getViewAs, setViewAs, clearViewAs, type ViewRole } from "@/lib/role";

const VIEWS: { role: ViewRole; label: string; path: string }[] = [
  { role: "student", label: "Student", path: "/dashboard" },
  { role: "teacher", label: "Teacher", path: "/teacher" },
  { role: "caregiver", label: "Parent", path: "/caregiver" },
];

/**
 * Persistent bar shown only to admins while they preview one of the three role
 * views. Lets them jump between views or exit back to the admin portal.
 */
export default function AdminViewBar() {
  const [, setLocation] = useLocation();

  if (getRole() !== "admin") return null;

  const active = getViewAs();

  function enter(view: (typeof VIEWS)[number]) {
    setViewAs(view.role);
    setLocation(view.path);
  }

  function exit() {
    clearViewAs();
    setLocation("/admin");
  }

  return (
    <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-slate-900 text-white text-xs font-bold border-b border-white/10 overflow-x-auto">
      <span className="flex items-center gap-1.5 text-amber-300 uppercase tracking-widest shrink-0">
        <Eye className="w-3.5 h-3.5" /> Admin Preview
      </span>
      <span className="text-white/40 shrink-0">·</span>
      <div className="flex items-center gap-1.5 shrink-0">
        {VIEWS.map((v) => (
          <button
            key={v.role}
            onClick={() => enter(v)}
            data-testid={`admin-view-${v.role}`}
            className={cn(
              "px-3 py-1 rounded-full uppercase tracking-wider transition-colors",
              active === v.role
                ? "bg-white text-slate-900"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            )}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button
        onClick={exit}
        data-testid="admin-exit-preview"
        className="ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 uppercase tracking-wider shrink-0"
      >
        <LogOut className="w-3.5 h-3.5" /> Exit
      </button>
    </div>
  );
}
