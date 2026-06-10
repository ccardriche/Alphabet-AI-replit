import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { GraduationCap, BookOpen, Users, ArrowRight, Star, TrendingUp, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setRole } from "@/lib/role";

export default function Landing() {
  const [, setLocation] = useLocation();

  function handleRole(role: "student" | "teacher") {
    setRole(role);
    setLocation(role === "student" ? "/dashboard" : "/teacher");
  }

  const features = [
    { icon: Brain, label: "Adaptive IRT Engine", desc: "Questions calibrate to each student's level in real time" },
    { icon: TrendingUp, label: "SmartScore Mastery", desc: "Continuous 0-100 scores track every skill precisely" },
    { icon: Star, label: "Culturally Responsive", desc: "Content reflects student interests and cultural identity" },
    { icon: BookOpen, label: "Science of Reading", desc: "Built on phonics, phonemic awareness, and fluency research" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white overflow-hidden">
      {/* Grid background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
        backgroundSize: "40px 40px"
      }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-16">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center gap-3 mb-16"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold">Alphabet AI</span>
        </motion.div>

        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-16 items-center mb-24">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
              K-12 Adaptive ELA Platform
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Every student
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                reading at level.
              </span>
            </h1>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed">
              Alphabet AI delivers personalized, culturally-responsive ELA practice grounded in the Science of Reading — adapting to each student in real time.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold px-8 gap-2"
                onClick={() => handleRole("student")}
                data-testid="btn-student-login"
              >
                <BookOpen className="w-4 h-4" />
                I am a Student
                <ArrowRight className="w-4 h-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-200 hover:bg-slate-800 hover:text-white font-semibold px-8 gap-2"
                onClick={() => handleRole("teacher")}
                data-testid="btn-teacher-login"
              >
                <Users className="w-4 h-4" />
                I am a Teacher
              </Button>
            </div>
          </motion.div>

          {/* Stats card */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm space-y-4">
              {[
                { domain: "RL", label: "Literature", score: 87, color: "#3b82f6" },
                { domain: "RF", label: "Foundations", score: 72, color: "#8b5cf6" },
                { domain: "W", label: "Writing", score: 64, color: "#10b981" },
                { domain: "L", label: "Language", score: 91, color: "#f43f5e" },
              ].map((item) => (
                <div key={item.domain} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: item.color }}>
                    {item.domain}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-slate-300">{item.label}</span>
                      <span className="text-sm font-semibold text-white">{item.score}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${item.score}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-slate-400">Student SmartScore avg</span>
                <span className="text-sm font-bold text-white">78.5</span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {features.map(({ icon: Icon, label, desc }, i) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center mb-3">
                <Icon className="w-4 h-4 text-indigo-300" />
              </div>
              <h3 className="text-sm font-semibold text-white mb-1">{label}</h3>
              <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
