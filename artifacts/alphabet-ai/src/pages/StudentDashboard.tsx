import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetStudentDashboard,
  useGetMasterySummary,
  useGetMyBadges,
  useGetFluencyHistory,
} from "@workspace/api-client-react";
import { Zap, Flame, Trophy, BookOpen, ArrowRight, TrendingUp, Lock, CheckCircle2, Timer, Globe, Compass, Shield } from "lucide-react";
import { getWPMLabel } from "@/lib/passages";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import MasteryBadge from "@/components/MasteryBadge";
import { DOMAIN_COLORS } from "@/lib/constants";


function FlameIcon({ streak }: { streak: number }) {
  const isHot = streak >= 3;
  return (
    <div className="relative">
      <motion.div
        animate={isHot ? {
          scale: [1, 1.15, 1, 1.1, 1],
          rotate: [-3, 3, -2, 2, 0],
        } : {}}
        transition={isHot ? { duration: 1.8, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <Flame
          className={`w-6 h-6 transition-colors duration-300 ${isHot ? "text-orange-500 drop-shadow-[0_0_8px_rgba(249,115,22,0.8)]" : "text-amber-400"}`}
        />
      </motion.div>
      {isHot && (
        <motion.div
          className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,1)]"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
        />
      )}
    </div>
  );
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
} as const;

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetStudentDashboard();
  const { data: summary } = useGetMasterySummary();
  const { data: allBadges = [] } = useGetMyBadges();
  const { data: fluencyHistory = [] } = useGetFluencyHistory();

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4 max-w-5xl mx-auto">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-muted/50" />)}
      </div>
    </Layout>
  );

  const profile = data?.profile;
  const todayStats = data?.todayStats;
  const domainProgress = data?.domainProgress ?? [];
  const nextSkills = data?.nextSkills ?? [];
  const recentMastery = data?.recentMastery ?? [];
  const streak = data?.streakDays ?? 0;
  const practicedToday = (todayStats?.questionsAnswered ?? 0) > 0;

  const earnedBadges = allBadges.filter((b) => b.earned);
  const lockedBadges = allBadges.filter((b) => !b.earned);

  return (
    <Layout>
      <motion.div 
        className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-8 pb-24"
        variants={containerVars}
        initial="hidden"
        animate="show"
      >
        {/* Header / Hero */}
        <motion.div variants={itemVars} className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative">
          <div className="z-10">
            <h1 className="text-4xl md:text-5xl font-heading font-black tracking-tight text-foreground uppercase mb-2">
              Mission Hub
            </h1>
            <p className="text-lg text-muted-foreground font-medium">
              Welcome back, <span className="text-foreground font-bold">{profile?.displayName ?? "Agent"}</span>! 
              {profile?.diagnosedGradeLevel ? ` Level ${profile.diagnosedGradeLevel}` : ""}
            </p>
          </div>
          
          <div className="flex items-center gap-4 z-10 self-start md:self-end">
            <AnimatePresence>
              {streak > 0 && !practicedToday && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, x: 20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="hidden sm:flex items-center gap-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl px-4 py-2 font-bold uppercase tracking-wider text-xs shadow-lg shadow-orange-500/20"
                >
                  <Flame className="w-4 h-4" />
                  Keep your streak alive!
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="flex items-center gap-3 bg-card border-2 border-border rounded-2xl px-5 py-3 shadow-lg transform transition-transform hover:scale-105">
              <FlameIcon streak={streak} />
              <div>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Streak</p>
                <p className="text-xl font-heading font-black text-foreground leading-none">{streak} <span className="text-sm">Days</span></p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Primary CTA Area */}
        <motion.div variants={itemVars}>
          {!profile?.preAssessmentCompleted ? (
            <div className="game-gradient rounded-3xl p-1 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
              <div className="bg-background/10 backdrop-blur-xl rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/20">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <Compass className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-heading font-black text-white mb-2 uppercase tracking-wide">Initial Scan Required</h2>
                    <p className="text-white/80 font-medium max-w-md">Complete your placement assessment to calibrate your personalized mission path.</p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/placement")}
                  size="lg"
                  className="w-full md:w-auto bg-white text-indigo-600 hover:bg-white/90 font-black uppercase tracking-wider gap-2 h-14 px-8 text-lg bouncy-hover rounded-2xl shadow-xl"
                  data-testid="btn-start-placement"
                >
                  Initiate Scan <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="game-gradient rounded-3xl p-1 shadow-[0_0_40px_rgba(139,92,246,0.3)]">
              <div className="bg-background/10 backdrop-blur-xl rounded-[22px] p-6 md:p-8 flex flex-col md:flex-row items-center justify-between gap-6 border border-white/20">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 shadow-inner">
                    <Zap className="w-8 h-8 text-white animate-pulse" />
                  </div>
                  <div>
                    <h2 className="text-2xl md:text-3xl font-heading font-black text-white mb-2 uppercase tracking-wide">
                      {practicedToday ? "MISSION ACCOMPLISHED" : "DAILY MISSION READY"}
                    </h2>
                    <p className="text-white/90 font-medium max-w-md">
                      {practicedToday
                        ? `Great work today agent! You earned ${todayStats?.xpEarned} XP. Ready for more?`
                        : "5 adaptive challenges precisely calibrated to your level. Earn XP and unlock badges."}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => setLocation("/practice")}
                  size="lg"
                  className="w-full md:w-auto bg-white text-indigo-600 hover:bg-indigo-50 font-black uppercase tracking-wider gap-2 h-14 px-8 text-lg bouncy-hover rounded-2xl shadow-xl border-b-4 border-indigo-200"
                  data-testid="btn-start-practice"
                >
                  START MISSION <ArrowRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </motion.div>

        {/* HUD Stats Row */}
        <motion.div variants={containerVars} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "MISSIONS COMPLETED", value: todayStats?.questionsAnswered ?? 0, icon: Shield, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
            {
              label: "ACCURACY RATING",
              value: (todayStats?.questionsAnswered ?? 0) > 0
                ? `${Math.round(((todayStats?.correctAnswers ?? 0) / todayStats!.questionsAnswered!) * 100)}%`
                : "—",
              icon: Trophy,
              color: "text-green-500",
              bg: "bg-green-500/10",
              border: "border-green-500/20",
            },
            { label: "DAILY XP", value: todayStats?.xpEarned ?? 0, icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
            { label: "LIFETIME XP", value: data?.totalXp ?? 0, icon: TrendingUp, color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" },
          ].map(({ label, value, icon: Icon, color, bg, border }, i) => (
            <motion.div key={label} variants={itemVars}>
              <div className={`hud-card rounded-2xl p-5 border-2 ${border} flex flex-col items-center justify-center text-center relative overflow-hidden group`}>
                <div className={`absolute -right-4 -top-4 w-16 h-16 rounded-full ${bg} blur-2xl group-hover:scale-150 transition-transform duration-500`} />
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-3 relative z-10`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className="text-3xl font-heading font-black text-foreground mb-1 relative z-10">{value.toLocaleString()}</p>
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest relative z-10">{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Identity Quest Optional CTA */}
        <AnimatePresence>
          {profile && !(profile as any).identityQuestCompleted && (
            <motion.div variants={itemVars} initial="hidden" animate="show" exit={{ opacity: 0, height: 0 }}>
              <div className="bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded-2xl p-1 shadow-lg">
                <div className="bg-background/10 backdrop-blur-md rounded-xl p-5 flex items-center justify-between gap-4 border border-white/20">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                      <Globe className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-black text-white uppercase tracking-wide mb-1">Identity Quest</h2>
                      <p className="text-fuchsia-100 text-sm font-medium">Personalize your hub & earn 75 XP!</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/identity-quest")}
                    variant="secondary"
                    className="font-black uppercase tracking-wider shrink-0 rounded-xl bouncy-hover bg-white text-fuchsia-700 hover:bg-fuchsia-50 border-b-2 border-fuchsia-200"
                    data-testid="btn-identity-quest"
                  >
                    START <ArrowRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Domain Progress Grid */}
          <motion.div variants={itemVars}>
            <div className="hud-card rounded-2xl h-full flex flex-col">
              <div className="p-5 border-b border-border/50 bg-muted/20">
                <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-primary" /> Sector Mastery
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col justify-center space-y-5">
                {domainProgress.length === 0 ? (
                  <div className="text-center py-6">
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                      <Lock className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Data Locked</p>
                    <p className="text-xs text-muted-foreground mt-1">Complete initial scan to reveal</p>
                  </div>
                ) : domainProgress.map((d) => {
                  const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                  const pct = d.totalCount > 0 ? Math.round((d.masteredCount / d.totalCount) * 100) : 0;
                  return (
                    <div key={d.domainCode} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-[4px] rotate-45" style={{ backgroundColor: color }} />
                          <span className="text-sm font-bold uppercase tracking-wider">{d.domain}</span>
                        </div>
                        <span className="text-xs font-black" style={{ color }}>{pct}% SECURED</span>
                      </div>
                      <div className="h-3 rounded-full bg-muted/50 overflow-hidden shadow-inner border border-border/50">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                          className="h-full rounded-full relative"
                          style={{ backgroundColor: color }}
                        >
                          <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                        </motion.div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Up Next Arcade Cards */}
          <motion.div variants={itemVars}>
            <div className="hud-card rounded-2xl h-full flex flex-col">
              <div className="p-5 border-b border-border/50 bg-muted/20">
                <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <Target className="w-5 h-5 text-orange-500" /> Target Objectives
                </h3>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                {nextSkills.length === 0 ? (
                   <div className="text-center py-6 flex-1 flex flex-col justify-center">
                   <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                     <Lock className="w-6 h-6 text-muted-foreground/50" />
                   </div>
                   <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Awaiting Orders</p>
                   <p className="text-xs text-muted-foreground mt-1">Complete scan for next targets</p>
                 </div>
                ) : (
                  <div className="space-y-3 mb-4">
                    {nextSkills.slice(0, 4).map((skill, i) => {
                      const color = DOMAIN_COLORS[skill.domainCode] ?? "#6b7280";
                      return (
                        <motion.div 
                          key={skill.skillCode} 
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.3 + i * 0.1 }}
                          className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card hover:bg-muted transition-colors bouncy-hover group cursor-pointer"
                          onClick={() => setLocation("/practice?skill=" + skill.skillCode)}
                        >
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black text-white shrink-0 shadow-sm transition-transform group-hover:scale-110" style={{ backgroundColor: color }}>
                            {skill.domainCode}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate text-foreground">{skill.skillName}</p>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Level {skill.gradeLevel} Target</p>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4 text-primary" />
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
                <Button
                  variant="outline"
                  className="w-full mt-auto font-black uppercase tracking-wider border-2 border-border border-b-4 hover:border-primary hover:text-primary rounded-xl h-12 bouncy-hover"
                  onClick={() => setLocation("/skill-tree")}
                  data-testid="btn-view-skill-tree"
                >
                  View Full Tree
                </Button>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Fluency Action Banner */}
        <AnimatePresence>
          {profile?.preAssessmentCompleted && (
            <motion.div variants={itemVars} initial="hidden" animate="show" exit={{ opacity: 0 }}>
              <div className="game-gradient rounded-2xl p-0.5 shadow-lg relative overflow-hidden">
                {/* Background effect */}
                <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
                <div className="bg-background/95 backdrop-blur-xl rounded-[14px] p-6 flex flex-col sm:flex-row items-center justify-between gap-5 relative z-10 border border-border/50">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-indigo-500/20 flex items-center justify-center shrink-0 border border-indigo-500/30">
                      <Timer className="w-7 h-7 text-indigo-500" />
                    </div>
                    <div>
                      <h3 className="font-heading font-black text-lg uppercase tracking-wide">Timed Run: Fluency</h3>
                      {(fluencyHistory as any[]).length > 0 ? (
                        <p className={`text-sm font-bold mt-1 ${(getWPMLabel((fluencyHistory as any[])[0].wcpm, (fluencyHistory as any[])[0].gradeLevel) as any).color ?? "text-indigo-500"}`}>
                          Latest: {(fluencyHistory as any[])[0].wcpm} WCPM <span className="text-muted-foreground font-medium">· {(getWPMLabel((fluencyHistory as any[])[0].wcpm, (fluencyHistory as any[])[0].gradeLevel) as any).label}</span>
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground font-medium">No recorded runs. Try a 60s sprint!</p>
                      )}
                    </div>
                  </div>
                  <Button
                    onClick={() => setLocation("/fluency")}
                    className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-wider rounded-xl bouncy-hover shadow-lg border-b-4 border-indigo-800"
                    data-testid="btn-fluency"
                  >
                    {(fluencyHistory as any[]).length > 0 ? "RUN AGAIN" : "START SPRINT"} <Timer className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trophies / Badges */}
        <motion.div variants={itemVars}>
          <div className="hud-card rounded-2xl overflow-hidden">
            <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
              <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" /> Trophy Case
              </h3>
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{earnedBadges.length} UNLOCKED</span>
            </div>
            <div className="p-6">
              {earnedBadges.length === 0 && (
                <div className="text-center py-6 mb-4">
                  <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Trophy Case Empty</p>
                  <p className="text-xs text-muted-foreground mt-1">Complete missions to start earning rewards.</p>
                </div>
              )}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {earnedBadges.map((badge, i) => (
                  <motion.div
                    key={badge.code}
                    initial={{ opacity: 0, scale: 0.5, rotate: -10 }}
                    animate={{ opacity: 1, scale: 1, rotate: 0 }}
                    transition={{ delay: 0.5 + (i * 0.08), type: "spring", stiffness: 200, damping: 15 }}
                    className="relative group"
                    title={badge.desc}
                  >
                    <div className="absolute inset-0 bg-yellow-400/20 rounded-2xl blur-xl group-hover:bg-yellow-400/40 transition-colors" />
                    <div className="relative flex flex-col items-center gap-2 p-4 rounded-2xl bg-gradient-to-b from-amber-100 to-yellow-50 dark:from-amber-900/30 dark:to-yellow-900/10 border-2 border-amber-300 dark:border-amber-700 text-center shadow-lg transform transition-transform hover:-translate-y-2">
                      <span className="text-4xl filter drop-shadow-md">{badge.icon}</span>
                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-900 dark:text-amber-400 leading-tight">{badge.title}</p>
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full p-1 border-2 border-white dark:border-card shadow-sm">
                        <CheckCircle2 className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  </motion.div>
                ))}
                {lockedBadges.slice(0, Math.max(0, 6 - earnedBadges.length)).map((badge, i) => (
                  <motion.div
                    key={badge.code}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.8 + (i * 0.05) }}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-muted/30 border-2 border-dashed border-border/50 text-center opacity-60"
                    title="Locked"
                  >
                    <Lock className="w-6 h-6 text-muted-foreground/50 mb-1" />
                    <div className="h-1.5 w-10 bg-border rounded-full" />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Recent Activity Log */}
        {recentMastery.length > 0 && (
          <motion.div variants={itemVars}>
            <div className="hud-card rounded-2xl">
              <div className="p-5 border-b border-border/50 bg-muted/20">
                <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-500" /> Mission Log
                </h3>
              </div>
              <div className="p-2">
                {recentMastery.slice(0, 5).map((m, i) => (
                  <motion.div 
                    key={m.id} 
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 + i * 0.05 }}
                    className="flex items-center justify-between p-4 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors rounded-xl"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                         <TrendingUp className="w-5 h-5 text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{m.skillName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">{m.domain}</span>
                          <span className="w-1 h-1 rounded-full bg-border" />
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-wider">SCORE: {Math.round(m.smartScore)}</span>
                        </div>
                      </div>
                    </div>
                    <MasteryBadge level={m.masteryLevel} size="md" />
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>
    </Layout>
  );
}
// Add Target icon missing import above
import { Target } from "lucide-react";
