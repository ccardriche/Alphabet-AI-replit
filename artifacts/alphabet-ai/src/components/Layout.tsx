import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getRole, clearRole } from "@/lib/role";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, GitBranch, Zap, TrendingUp,
  Users, Upload, Dumbbell, LogOut, GraduationCap, AlertTriangle, Volume2, VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetStudentProfile,
  useUpdateStudentProfile,
  getGetStudentProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

const studentNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Daily Practice", icon: Zap },
  { href: "/skill-tree", label: "Skill Tree", icon: GitBranch },
  { href: "/intervention", label: "Intervention", icon: AlertTriangle },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

const teacherNav = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/roster", label: "Class Roster", icon: Users },
  { href: "/teacher/book-upload", label: "Book Upload", icon: Upload },
  { href: "/teacher/exercises", label: "Exercises", icon: Dumbbell },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const role = getRole();
  const [location, setLocation] = useLocation();
  const nav = role === "teacher" ? teacherNav : studentNav;
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: profile } = useGetStudentProfile();
  const updateProfile = useUpdateStudentProfile();
  const [togglingAudio, setTogglingAudio] = useState(false);

  const audioEnabled = (profile as any)?.audioEnabled !== false;

  async function handleToggleAudio() {
    if (togglingAudio) return;
    setTogglingAudio(true);
    try {
      await updateProfile.mutateAsync({ data: { audioEnabled: !audioEnabled } as any });
      queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
    } catch {
      toast({ title: "Could not update audio setting — try again.", variant: "destructive" });
    } finally {
      setTogglingAudio(false);
    }
  }

  function handleLogout() {
    clearRole();
    setLocation("/");
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-border bg-sidebar shrink-0">
        <div className="p-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-sidebar-foreground text-sm">Alphabet AI</span>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => setLocation(href)}
              data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                location === href || location.startsWith(href + "/")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          {role === "student" && profile && (
            <button
              onClick={handleToggleAudio}
              disabled={togglingAudio}
              data-testid="btn-toggle-audio"
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                "disabled:opacity-50"
              )}
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 shrink-0 text-indigo-500" />
              ) : (
                <VolumeX className="w-4 h-4 shrink-0 text-muted-foreground" />
              )}
              <span>{audioEnabled ? "Read Aloud: On" : "Read Aloud: Off"}</span>
            </button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
            onClick={handleLogout}
            data-testid="btn-logout"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-background">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-bold text-sm">Alphabet AI</span>
          </div>
          {role === "student" && profile && (
            <button
              onClick={handleToggleAudio}
              disabled={togglingAudio}
              aria-label={audioEnabled ? "Disable read aloud" : "Enable read aloud"}
              className="p-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 text-indigo-500" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-border bg-background">
          {nav.slice(0, 5).map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => setLocation(href)}
              className={cn(
                "flex-1 flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                location === href || location.startsWith(href + "/") ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              {label.split(" ")[0]}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
