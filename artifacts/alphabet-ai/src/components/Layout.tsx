import { useState } from "react";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { getRole, clearRole } from "@/lib/role";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, GitBranch, Zap, TrendingUp, Timer,
  Users, Upload, Dumbbell, LogOut, GraduationCap, AlertTriangle, Volume2, VolumeX, FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetStudentProfile,
  useUpdateStudentProfile,
  getGetStudentProfileQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { useCurrentUser } from "@/hooks/use-current-user";

const studentNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/practice", label: "Daily Practice", icon: Zap },
  { href: "/skill-tree", label: "Skill Tree", icon: GitBranch },
  { href: "/fluency", label: "Fluency", icon: Timer },
  { href: "/intervention", label: "Intervention", icon: AlertTriangle },
  { href: "/projects", label: "My Projects", icon: FolderOpen },
  { href: "/progress", label: "Progress", icon: TrendingUp },
];

const teacherNav = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/roster", label: "Class Roster", icon: Users },
  { href: "/teacher/projects", label: "Group Projects", icon: FolderOpen },
  { href: "/teacher/book-upload", label: "Book Upload", icon: Upload },
  { href: "/teacher/exercises", label: "Exercises", icon: Dumbbell },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const role = getRole();
  const [location, setLocation] = useLocation();
  const nav = role === "teacher" ? teacherNav : studentNav;
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { displayName } = useCurrentUser();

  const { data: profile } = useGetStudentProfile();
  const updateProfile = useUpdateStudentProfile();
  const [togglingAudio, setTogglingAudio] = useState(false);

  const audioEnabled = (profile as any)?.audioEnabled !== false;

  const userLabel = displayName ?? (role === "teacher" ? "Teacher" : role === "student" ? "Student" : "You");
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : "";

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
    <div className="flex h-[100dvh] bg-background">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-sidebar-border bg-sidebar shrink-0 shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl game-gradient flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-sidebar-foreground text-lg tracking-tight">Alphabet AI</span>
              <p className="text-xs text-sidebar-foreground/60 font-bold uppercase tracking-wider">{roleLabel} HUB</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-3 pb-4 space-y-2 overflow-y-auto">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = location === href || location.startsWith(href + "/");
            return (
              <button
                key={href}
                onClick={() => setLocation(href)}
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all bouncy-hover",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-[0_0_15px_rgba(139,92,246,0.5)] border border-primary-border translate-x-1"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border border-transparent"
                )}
              >
                <Icon className={cn("w-5 h-5 shrink-0", isActive ? "animate-pulse text-white" : "")} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-sidebar-border space-y-3 bg-sidebar-accent/10">
          {role === "student" && profile && (
            <button
              onClick={handleToggleAudio}
              disabled={togglingAudio}
              data-testid="btn-toggle-audio"
              className={cn(
                "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all bouncy-hover",
                audioEnabled 
                  ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                  : "bg-sidebar-accent text-sidebar-foreground/70 border border-sidebar-border",
                "disabled:opacity-50"
              )}
            >
              {audioEnabled ? (
                <Volume2 className="w-4 h-4 shrink-0 text-indigo-400" />
              ) : (
                <VolumeX className="w-4 h-4 shrink-0" />
              )}
              <span>{audioEnabled ? "AUDIO ON" : "AUDIO OFF"}</span>
            </button>
          )}

          {/* User identity row */}
          <div className="flex items-center gap-3 px-2 py-1">
            <Avatar name={userLabel} size="sm" className="border-2 border-primary/50" />
            <span className="text-sm font-bold text-sidebar-foreground truncate">{userLabel}</span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sidebar-foreground/60 hover:text-red-400 hover:bg-red-500/10 font-bold uppercase tracking-wider"
            onClick={handleLogout}
            data-testid="btn-logout"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </Button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-sidebar text-sidebar-foreground z-10 shadow-md">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg game-gradient flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-heading font-extrabold text-lg tracking-tight">Alphabet AI</span>
          </div>
          <div className="flex items-center gap-3">
            {role === "student" && profile && (
              <button
                onClick={handleToggleAudio}
                disabled={togglingAudio}
                aria-label={audioEnabled ? "Disable read aloud" : "Enable read aloud"}
                className={cn(
                  "p-2 rounded-lg transition-colors border",
                  audioEnabled 
                    ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                    : "bg-sidebar-accent text-sidebar-foreground/70 border-sidebar-border"
                )}
              >
                {audioEnabled ? (
                  <Volume2 className="w-4 h-4" />
                ) : (
                  <VolumeX className="w-4 h-4" />
                )}
              </button>
            )}
            <div className="flex items-center gap-2 bg-sidebar-accent/50 p-1.5 rounded-full border border-sidebar-border">
              <Avatar name={userLabel} size="sm" className="w-6 h-6 border border-primary/50" />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-sidebar-border bg-sidebar pb-safe z-10">
          {nav.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const isActive = location === href || location.startsWith(href + "/");
            return (
              <button
                key={href}
                onClick={() => setLocation(href)}
                className={cn(
                  "flex-1 flex flex-col items-center gap-1.5 py-3 text-[10px] font-extrabold uppercase tracking-wider transition-all",
                  isActive 
                    ? "text-primary shadow-[inset_0_4px_0_0_var(--color-primary)] bg-primary/10" 
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                {label.split(" ")[0]}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
