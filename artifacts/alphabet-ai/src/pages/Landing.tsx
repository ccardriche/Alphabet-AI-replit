import { useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, ArrowRight, Star, TrendingUp, Brain, LogIn, Heart, Shield } from "lucide-react";
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#0a0a1a]">
        <div className="w-16 h-16 relative">
           <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
           <div className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        </div>
        <p className="mt-6 text-indigo-400 font-black uppercase tracking-widest text-sm animate-pulse">Initializing System</p>
      </div>
    );
  }

  const features = [
    { icon: Brain, label: "Adaptive AI", desc: "Real-time mission difficulty calibration" },
    { icon: TrendingUp, label: "SmartScore Engine", desc: "0-100 mastery tracking per skill vector" },
    { icon: Star, label: "Identity Sync", desc: "Missions adapt to operator preferences" },
    { icon: BookOpen, label: "Core Protocol", desc: "Built on foundational reading science" },
  ];

  return (
    <div className="min-h-[100dvh] bg-[#0a0a1a] text-white overflow-hidden relative">
      {/* Cyber Grid Background */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: "linear-gradient(rgba(139, 92, 246, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(139, 92, 246, 0.15) 1px, transparent 1px)",
        backgroundSize: "48px 48px"
      }} />
      {/* Glow Orbs */}
      <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-fuchsia-600/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 md:py-20 min-h-[100dvh] flex flex-col">
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-4 mb-16 md:mb-24"
        >
          <div className="w-12 h-12 rounded-2xl game-gradient flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.5)]">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="text-2xl font-heading font-black tracking-tight uppercase">Alphabet AI</span>
        </motion.div>

        <div className="flex-1 flex flex-col lg:flex-row gap-16 lg:gap-24 items-center">
          
          {/* Left Content */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="flex-1"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/30 text-primary font-black text-[10px] uppercase tracking-widest mb-8">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              K-12 Literacy Engine
            </div>
            
            <h1 className="text-5xl md:text-7xl font-heading font-black leading-[1.1] mb-6 uppercase">
              Master Reading.
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-fuchsia-500">
                Unlock Worlds.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-slate-300 font-medium mb-12 leading-relaxed max-w-xl">
              Engage with adaptive missions calibrated to your exact skill level. Train your reading, earn XP, and track your mastery.
            </p>

            {authLoading ? (
              <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-6 w-max">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="font-bold uppercase tracking-widest text-sm">Authenticating...</span>
              </div>
            ) : !isAuthenticated ? (
              <Button
                size="lg"
                className="game-gradient text-white font-black text-lg uppercase tracking-widest h-16 px-10 rounded-2xl hover:-translate-y-1 active:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_rgba(0,0,0,0.3)] border-b-4 border-black/20 w-full sm:w-auto"
                onClick={() => login()}
                data-testid="btn-login"
              >
                <LogIn className="w-5 h-5 mr-3" />
                INITIALIZE LOGIN
              </Button>
            ) : (
              <div className="space-y-6">
                <p className="font-black text-sm text-slate-400 uppercase tracking-widest">Select Operating Mode</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Button
                    size="lg"
                    className="game-gradient text-white font-black text-base uppercase tracking-widest h-16 rounded-2xl hover:-translate-y-1 shadow-[0_8px_0_rgba(0,0,0,0.3)] border-b-4 border-black/20"
                    onClick={() => handleRole("student")}
                    data-testid="btn-student-login"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Agent Mode
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-slate-900/50 border-2 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-500 font-black text-base uppercase tracking-widest h-16 rounded-2xl hover:-translate-y-1"
                    onClick={() => handleRole("teacher")}
                    data-testid="btn-teacher-login"
                  >
                    <Users className="w-5 h-5 mr-2 text-blue-400" />
                    Command
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="bg-slate-900/50 border-2 border-slate-700 text-slate-200 hover:bg-slate-800 hover:border-slate-500 font-black text-base uppercase tracking-widest h-16 rounded-2xl hover:-translate-y-1 sm:col-span-2"
                    onClick={() => handleRole("caregiver")}
                    data-testid="btn-caregiver-login"
                  >
                    <Heart className="w-5 h-5 mr-2 text-rose-400" />
                    Support Team
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Right Visual (Hidden on mobile) */}
          <motion.div
            initial={{ opacity: 0, x: 30, rotateY: 20 }}
            animate={{ opacity: 1, x: 0, rotateY: 0 }}
            transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            className="hidden lg:block flex-1 perspective-1000"
          >
            <div className="bg-slate-900/80 border-2 border-slate-700/50 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden transform rotate-y-[-10deg] rotate-x-[5deg]">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-primary to-fuchsia-500" />
              
              <div className="flex items-center justify-between mb-8">
                <h3 className="font-heading font-black uppercase tracking-wider text-xl flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" /> Sector Status
                </h3>
                <span className="px-3 py-1 rounded-md bg-green-500/20 text-green-400 font-black text-[10px] uppercase tracking-widest border border-green-500/30">Live Sync</span>
              </div>

              <div className="space-y-6">
                {[
                  { domain: "RL", label: "LITERATURE", score: 87, color: "#3b82f6" },
                  { domain: "RF", label: "FOUNDATIONS", score: 72, color: "#8b5cf6" },
                  { domain: "W", label: "WRITING", score: 64, color: "#10b981" },
                  { domain: "L", label: "LANGUAGE", score: 91, color: "#f43f5e" },
                ].map((item, i) => (
                  <div key={item.domain} className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-lg" style={{ backgroundColor: item.color }}>
                      {item.domain}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">{item.label}</span>
                        <span className="text-xs font-black text-white">{item.score} / 100</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-800 border border-slate-700 shadow-inner overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${item.score}%` }}
                          transition={{ duration: 1.5, delay: 0.5 + (i * 0.1), ease: "easeOut" }}
                          className="h-full rounded-full relative"
                          style={{ backgroundColor: item.color }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                        </motion.div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Bottom Feature Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-auto pt-16"
        >
          {features.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:bg-slate-800/60 transition-colors group">
              <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform border border-slate-700">
                <Icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-sm font-black text-white mb-2 uppercase tracking-wide">{label}</h3>
              <p className="text-xs font-medium text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
