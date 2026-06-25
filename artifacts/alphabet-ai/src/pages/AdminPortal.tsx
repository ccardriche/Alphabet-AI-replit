import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, Heart, ArrowRight, ShieldCheck, LogOut, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearRole, setRole, setViewAs, type ViewRole } from "@/lib/role";
import { HOME_REDIRECTED_KEY } from "@/lib/constants";

const VIEWS: {
  role: ViewRole;
  icon: typeof BookOpen;
  title: string;
  desc: string;
  color: string;
  path: string;
}[] = [
  {
    role: "student",
    icon: BookOpen,
    title: "Student View",
    desc: "See the learner experience — dashboard, daily practice, skill tree, and progress.",
    color: "var(--color-domain-rl)",
    path: "/dashboard",
  },
  {
    role: "teacher",
    icon: Users,
    title: "Teacher View",
    desc: "See the classroom tools — roster, analytics, book upload, and exercises.",
    color: "var(--color-domain-rf)",
    path: "/teacher",
  },
  {
    role: "caregiver",
    icon: Heart,
    title: "Parent View",
    desc: "See the family portal — at-home tips and a child's progress at a glance.",
    color: "var(--color-domain-ri)",
    path: "/caregiver",
  },
];

export default function AdminPortal() {
  const [, setLocation] = useLocation();

  // Ensure the real role is persisted as admin (so view-switching works even on
  // a direct visit to /admin) and any prior preview state is cleared.
  function enter(view: (typeof VIEWS)[number]) {
    setRole("admin");
    setViewAs(view.role);
    setLocation(view.path);
  }

  function handleLogout() {
    clearRole();
    sessionStorage.removeItem(HOME_REDIRECTED_KEY);
    setLocation("/");
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden relative">
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[130px]" />
        <div className="absolute top-[20%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/15 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <nav className="max-w-5xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <button
            onClick={() => setLocation("/")}
            className="flex items-center gap-3 bouncy-hover"
            data-testid="btn-home-logo"
          >
            <div className="w-10 h-10 rounded-2xl game-gradient flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <span className="text-lg font-heading font-black tracking-tight block leading-none">Alphabet AI</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Admin</span>
            </div>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            data-testid="btn-logout"
            className="gap-2 font-bold uppercase tracking-wider text-muted-foreground hover:text-red-500"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </Button>
        </nav>
      </header>

      <main className="relative max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-2xl mx-auto mb-14"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-black uppercase tracking-widest mb-5">
            <ShieldCheck className="w-4 h-4" /> Administrator
          </span>
          <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight mb-4">
            Preview every view
          </h1>
          <p className="text-base md:text-lg font-medium text-muted-foreground">
            Step into the student, teacher, or parent experience. Switch between
            them anytime from the preview bar, or come back here.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {VIEWS.map(({ role, icon: Icon, title, desc, color, path }, i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 + i * 0.08 }}
              className="flex flex-col bg-card border-2 border-border rounded-3xl p-8 hover:-translate-y-1.5 hover:shadow-xl transition-all"
            >
              <span
                className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-5 shadow-lg"
                style={{ backgroundColor: color }}
              >
                <Icon className="w-8 h-8 text-white" />
              </span>
              <h3 className="text-xl font-heading font-black mb-2">{title}</h3>
              <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-6 flex-1">{desc}</p>
              <Button
                onClick={() => enter({ role, icon: Icon, title, desc, color, path })}
                data-testid={`btn-admin-enter-${role}`}
                className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl bouncy-hover text-white border-b-4 border-black/20 gap-2"
                style={{ backgroundColor: color }}
              >
                <Eye className="w-4 h-4" /> Open View <ArrowRight className="w-4 h-4" />
              </Button>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
