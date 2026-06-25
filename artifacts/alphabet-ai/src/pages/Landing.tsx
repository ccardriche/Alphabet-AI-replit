import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  GraduationCap,
  BookOpen,
  Users,
  ArrowRight,
  Star,
  TrendingUp,
  Brain,
  LogIn,
  Heart,
  Sparkles,
  Flame,
  Trophy,
  Volume2,
  Target,
  Rocket,
  CheckCircle2,
  Quote,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@workspace/replit-auth-web";
import { useGetStudentProfile, getGetStudentProfileQueryKey, useGetCaregiverProfile, getGetCaregiverProfileQueryKey } from "@workspace/api-client-react";
import { ROLE_KEY, STUDENT_ID_KEY, PLACEMENT_COMPLETED_KEY } from "@/lib/constants";
import { apiUrl } from "@/lib/api-url";

export default function Landing() {
  const { isAuthenticated, isLoading: authLoading, login } = useAuth();
  const [, setLocation] = useLocation();

  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useGetStudentProfile({
    query: {
      queryKey: getGetStudentProfileQueryKey(),
      enabled: isAuthenticated,
      retry: false,
    },
  });

  const { data: caregiverProfile, isLoading: caregiverLoading } = useGetCaregiverProfile({
    query: {
      queryKey: getGetCaregiverProfileQueryKey(),
      enabled: isAuthenticated && !!profileError,
      retry: false,
    },
  });

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    // Fast-path: returning student already has a local student ID stored from
    // a previous session. Skip role-selection and route immediately.
    const storedStudentId = localStorage.getItem(STUDENT_ID_KEY);
    if (storedStudentId) {
      const placementDone = localStorage.getItem(PLACEMENT_COMPLETED_KEY);
      setLocation(placementDone ? "/dashboard" : "/placement");
      return;
    }

    if (profileLoading) return;

    if (profile) {
      if ((profile as any).preAssessmentCompleted) {
        setLocation("/dashboard");
      } else {
        setLocation("/placement");
      }
    } else if (profileError) {
      const role = sessionStorage.getItem(ROLE_KEY);
      if (role === "teacher") {
        setLocation("/teacher");
      } else if (role === "student") {
        setLocation("/onboarding");
      } else if (role === "caregiver") {
        setLocation("/caregiver");
      }
      // No role yet → stay on landing to show role-selection UI
    }
  }, [authLoading, isAuthenticated, profileLoading, profile, profileError, setLocation]);

  // Auto-redirect returning caregivers
  useEffect(() => {
    if (!isAuthenticated || profileLoading || caregiverLoading) return;
    if (profileError && caregiverProfile) {
      setLocation("/caregiver");
    }
  }, [isAuthenticated, profileLoading, caregiverLoading, profileError, caregiverProfile, setLocation]);

  async function handleRole(role: "student" | "teacher" | "caregiver") {
    sessionStorage.setItem(ROLE_KEY, role);
    try {
      await fetch(apiUrl("/api/me"), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
        credentials: "include",
      });
      if (role === "student") setLocation("/onboarding");
      else if (role === "teacher") setLocation("/teacher");
      else setLocation("/caregiver-onboarding");
    } catch (error) {
      console.error("Failed to set role:", error);
    }
  }

  if (isAuthenticated && profileLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 relative">
          <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
          <div className="absolute inset-0 rounded-full border-4 border-primary border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-primary font-black uppercase tracking-widest text-sm animate-pulse">Loading your adventure</p>
      </div>
    );
  }

  const statCards = [
    { icon: Sparkles, value: "2,450 XP", label: "Power Points", color: "var(--color-domain-sl)" },
    { icon: Flame, value: "12 day streak", label: "Daily Practice", color: "var(--color-domain-ri)" },
    { icon: TrendingUp, value: "87% mastery", label: "Reading Skills", color: "var(--color-domain-w)" },
    { icon: Rocket, value: "6 missions", label: "Story Lab", color: "var(--color-domain-rl)" },
  ];

  const bandStats = [
    { value: "6", label: "Reading Domains", icon: BookOpen },
    { value: "100+", label: "Skills to Master", icon: Star },
    { value: "K–12", label: "Grade Levels", icon: Users },
    { value: "AI", label: "Powered", icon: Sparkles },
  ];

  const features = [
    { icon: Brain, label: "Adaptive AI", desc: "Questions change to fit your exact level, right as you play.", color: "var(--color-domain-rf)" },
    { icon: TrendingUp, label: "SmartScore", desc: "Watch your 0–100 score climb as you master each new skill.", color: "var(--color-domain-w)" },
    { icon: Star, label: "Your Stories", desc: "Reading missions built around the things you love most.", color: "var(--color-domain-sl)" },
    { icon: Volume2, label: "Read Aloud", desc: "Tap to hear any question read out loud, any time.", color: "var(--color-domain-rl)" },
    { icon: BookOpen, label: "Real Science", desc: "Built on proven, research-backed ways kids learn to read.", color: "var(--color-domain-ri)" },
    { icon: Flame, label: "XP & Streaks", desc: "Earn points, keep your streak, and level up every day.", color: "var(--color-domain-l)" },
  ];

  const steps = [
    { icon: UserPlus, title: "Sign Up", desc: "Make your profile and pick what you love to read about.", color: "var(--color-domain-rl)" },
    { icon: Target, title: "Get Placed", desc: "Take a short, friendly quiz so we find your perfect level.", color: "var(--color-domain-rf)" },
    { icon: BookOpen, title: "Go on Missions", desc: "Practice fun reading missions made just for you.", color: "var(--color-domain-w)" },
    { icon: Trophy, title: "Level Up", desc: "Earn XP, grow your SmartScore, and become a reading hero.", color: "var(--color-domain-sl)" },
  ];

  const roles: { role: "student" | "teacher" | "caregiver"; icon: typeof BookOpen; title: string; desc: string; color: string; testid: string; cta: string }[] = [
    { role: "student", icon: BookOpen, title: "I'm a Student", desc: "Go on reading missions made just for you and level up.", color: "var(--color-domain-rl)", testid: "btn-student-login", cta: "Start Reading" },
    { role: "teacher", icon: Users, title: "I'm a Teacher", desc: "See your whole class, spot gaps, and assign the right help.", color: "var(--color-domain-rf)", testid: "btn-teacher-login", cta: "Open Classroom" },
    { role: "caregiver", icon: Heart, title: "I'm a Caregiver", desc: "Cheer on your reader and watch their skills grow at home.", color: "var(--color-domain-ri)", testid: "btn-caregiver-login", cta: "Support a Reader" },
  ];

  const testimonials = [
    { quote: "My students actually ask to read now. The missions make it feel like a game!", name: "Ms. Rivera", role: "4th Grade Teacher", color: "var(--color-domain-rf)" },
    { quote: "I leveled up three times this week and my SmartScore keeps going up!", name: "Jayden", role: "Reader, Age 9", color: "var(--color-domain-w)" },
    { quote: "I can finally see exactly where my daughter needs a little extra help.", name: "Dana M.", role: "Parent", color: "var(--color-domain-ri)" },
  ];

  function roleAction(role: "student" | "teacher" | "caregiver") {
    if (isAuthenticated) handleRole(role);
    else login();
  }

  return (
    <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden relative">
      {/* Soft vibrant glow backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-15%] left-[-10%] w-[600px] h-[600px] bg-primary/15 rounded-full blur-[130px]" />
        <div className="absolute top-[10%] right-[-10%] w-[500px] h-[500px] bg-fuchsia-500/15 rounded-full blur-[120px]" />
        <div className="absolute top-[60%] left-[20%] w-[500px] h-[500px] bg-[#00d4ff]/10 rounded-full blur-[120px]" />
      </div>

      {/* ===== NAV ===== */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/70 border-b border-border/60">
        <nav className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl game-gradient flex items-center justify-center shadow-lg">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-heading font-black tracking-tight">Alphabet AI</span>
          </div>
          {!authLoading && !isAuthenticated && (
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                className="font-black uppercase tracking-widest text-xs hidden sm:inline-flex"
                onClick={() => login()}
                data-testid="btn-login-nav"
              >
                Sign In
              </Button>
              <Button
                className="game-gradient text-white font-black uppercase tracking-widest text-xs h-11 px-5 rounded-xl bouncy-hover border-b-4 border-black/20 gap-1.5"
                onClick={() => login()}
                data-testid="btn-get-started-nav"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </nav>
      </header>

      <main className="relative z-10">
        {/* ===== HERO ===== */}
        <section className="max-w-4xl mx-auto px-5 md:px-8 pt-16 md:pt-24 pb-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border-2 border-primary/20 text-primary font-black text-[11px] uppercase tracking-widest mb-7"
          >
            <Sparkles className="w-3.5 h-3.5" />
            AI-Adaptive Reading for Grades K–12
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-5xl md:text-7xl font-heading font-black leading-[1.05] tracking-tight mb-6"
          >
            Reading that{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">clicks.</span>
            <br />
            Skills that{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00d4ff] via-sky-400 to-[#00fa9a]">stick.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="text-lg md:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Personalized practice powered by adaptive AI. Earn XP, go on reading
            missions, and watch your mastery grow — word by word.
          </motion.p>

          {/* CTA / role area (auth-aware) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
          >
            {authLoading ? (
              <div className="flex items-center justify-center gap-3 bg-card border-2 border-border rounded-2xl p-5 w-max mx-auto">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-black uppercase tracking-widest text-sm">Loading…</span>
              </div>
            ) : !isAuthenticated ? (
              <>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Button
                    size="lg"
                    className="game-gradient text-white font-black text-base uppercase tracking-widest h-16 px-10 rounded-2xl bouncy-hover border-b-4 border-black/20 gap-2 w-full sm:w-auto"
                    onClick={() => login()}
                    data-testid="btn-login"
                  >
                    <LogIn className="w-5 h-5" /> Start Free
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-card border-2 border-border font-black text-base uppercase tracking-widest h-16 px-8 rounded-2xl bouncy-hover w-full sm:w-auto"
                    onClick={() => login()}
                    data-testid="btn-sign-in"
                  >
                    Sign In
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-7">
                  {["No credit card needed", "Adaptive from day one", "Works on any device"].map((t) => (
                    <span key={t} className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-[#00fa9a]" /> {t}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="max-w-2xl mx-auto">
                <p className="font-black text-xs text-muted-foreground uppercase tracking-widest mb-4">Choose how you'll explore</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  {roles.map(({ role, icon: Icon, title, color, testid }) => (
                    <button
                      key={role}
                      onClick={() => handleRole(role)}
                      data-testid={testid}
                      className="group flex flex-col items-center gap-3 bg-card border-2 border-border rounded-2xl p-5 bouncy-hover"
                    >
                      <span className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color }}>
                        <Icon className="w-7 h-7 text-white" />
                      </span>
                      <span className="font-black uppercase tracking-widest text-xs">{title.replace("I'm a ", "").replace("I'm ", "")}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>

          {/* Floating stat cards */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-16 max-w-3xl mx-auto"
          >
            {statCards.map(({ icon: Icon, value, label, color }) => (
              <div key={label} className="bg-card border-2 border-border rounded-2xl p-5 shadow-sm hover:-translate-y-1 transition-transform">
                <span className="inline-flex w-11 h-11 rounded-xl items-center justify-center mb-3" style={{ backgroundColor: `color-mix(in srgb, ${color} 18%, transparent)` }}>
                  <Icon className="w-5 h-5" style={{ color }} />
                </span>
                <p className="font-black text-lg leading-tight">{value}</p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
          </motion.div>
        </section>

        {/* ===== STATS BAND ===== */}
        <section className="border-y border-border/60 bg-card/40 backdrop-blur-sm mt-12">
          <div className="max-w-5xl mx-auto px-5 md:px-8 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
            {bandStats.map(({ value, label, icon: Icon }) => (
              <div key={label} className="text-center">
                <p className="text-4xl md:text-5xl font-heading font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-pink-500">{value}</p>
                <p className="flex items-center justify-center gap-1.5 text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">Why kids love it</p>
            <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight">Everything you need to grow as a reader</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, label, desc, color }, i) => (
              <motion.div
                key={label}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45, delay: (i % 3) * 0.08 }}
                className="bg-card border-2 border-border rounded-3xl p-7 hover:-translate-y-1.5 hover:shadow-xl transition-all"
              >
                <span className="inline-flex w-14 h-14 rounded-2xl items-center justify-center mb-5 shadow-lg" style={{ backgroundColor: color }}>
                  <Icon className="w-7 h-7 text-white" />
                </span>
                <h3 className="text-lg font-heading font-black mb-2">{label}</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section className="bg-card/40 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">How it works</p>
              <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight">Your reading adventure in 4 steps</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map(({ icon: Icon, title, desc, color }, i) => (
                <motion.div
                  key={title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="relative bg-card border-2 border-border rounded-3xl p-7 text-center"
                >
                  <span className="absolute -top-3 -right-3 w-9 h-9 rounded-full game-gradient text-white font-black text-sm flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                  <span className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-5 shadow-lg" style={{ backgroundColor: color }}>
                    <Icon className="w-8 h-8 text-white" />
                  </span>
                  <h3 className="text-lg font-heading font-black mb-2">{title}</h3>
                  <p className="text-sm font-medium text-muted-foreground leading-relaxed">{desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== ROLES ===== */}
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">Built for everyone</p>
            <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight">One platform, three ways to win</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {roles.map(({ role, icon: Icon, title, desc, color, cta }) => (
              <motion.div
                key={role}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.45 }}
                className="flex flex-col bg-card border-2 border-border rounded-3xl p-8 hover:-translate-y-1.5 hover:shadow-xl transition-all"
              >
                <span className="inline-flex w-16 h-16 rounded-2xl items-center justify-center mb-5 shadow-lg" style={{ backgroundColor: color }}>
                  <Icon className="w-8 h-8 text-white" />
                </span>
                <h3 className="text-xl font-heading font-black mb-2">{title}</h3>
                <p className="text-sm font-medium text-muted-foreground leading-relaxed mb-6 flex-1">{desc}</p>
                <Button
                  onClick={() => roleAction(role)}
                  className="w-full h-12 font-black uppercase tracking-widest text-xs rounded-xl bouncy-hover text-white border-b-4 border-black/20 gap-2"
                  style={{ backgroundColor: color }}
                >
                  {cta} <ArrowRight className="w-4 h-4" />
                </Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* ===== TESTIMONIALS ===== */}
        <section className="bg-card/40 border-y border-border/60">
          <div className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <p className="text-xs font-black text-primary uppercase tracking-widest mb-3">Loved by readers</p>
              <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight">Don't just take our word for it</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {testimonials.map(({ quote, name, role, color }, i) => (
                <motion.div
                  key={name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="bg-card border-2 border-border rounded-3xl p-7 flex flex-col"
                >
                  <Quote className="w-8 h-8 mb-4" style={{ color }} />
                  <p className="text-base font-medium leading-relaxed flex-1">"{quote}"</p>
                  <div className="flex items-center gap-1 mt-5 mb-3">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="w-4 h-4 fill-[#ffaa00] text-[#ffaa00]" />
                    ))}
                  </div>
                  <p className="font-black text-sm">{name}</p>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{role}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== FINAL CTA ===== */}
        <section className="max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.5 }}
            className="relative overflow-hidden rounded-[2rem] game-gradient text-white text-center px-6 py-16 md:py-20 shadow-2xl"
          >
            <div className="absolute inset-0 pattern-grid-lg opacity-20" aria-hidden="true" />
            <div className="relative z-10 max-w-2xl mx-auto">
              <Trophy className="w-12 h-12 mx-auto mb-6" />
              <h2 className="text-3xl md:text-5xl font-heading font-black tracking-tight mb-4">Ready to start your reading adventure?</h2>
              <p className="text-base md:text-lg font-medium text-white/85 mb-9">Join Alphabet AI today and turn reading practice into your favorite game.</p>
              {!isAuthenticated ? (
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-black text-base uppercase tracking-widest h-16 px-10 rounded-2xl bouncy-hover border-b-4 border-black/10 gap-2"
                  onClick={() => login()}
                  data-testid="btn-login-cta"
                >
                  <LogIn className="w-5 h-5" /> Start Free
                </Button>
              ) : (
                <Button
                  size="lg"
                  className="bg-white text-primary hover:bg-white/90 font-black text-base uppercase tracking-widest h-16 px-10 rounded-2xl bouncy-hover border-b-4 border-black/10 gap-2"
                  onClick={() => handleRole("student")}
                  data-testid="btn-cta-student"
                >
                  <BookOpen className="w-5 h-5" /> Start Reading
                </Button>
              )}
            </div>
          </motion.div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-border/60 bg-card/40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl game-gradient flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="font-heading font-black">Alphabet AI</span>
          </div>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest text-center">
            Adaptive reading mastery for every kid
          </p>
          <p className="text-xs font-medium text-muted-foreground">© {new Date().getFullYear()} Alphabet AI</p>
        </div>
      </footer>
    </div>
  );
}
