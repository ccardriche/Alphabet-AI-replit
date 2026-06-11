import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useGetCaregiverProfile,
  useGetCaregiverStudentOverview,
  getGetCaregiverProfileQueryKey,
  getGetCaregiverStudentOverviewQueryKey,
} from "@workspace/api-client-react";
import {
  BookOpen, Zap, Flame, Star, TrendingUp, TrendingDown, GraduationCap,
  Link2, CheckCircle2, BarChart3, Clock, Target, Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, MASTERY_LABELS } from "@/lib/constants";
import SmartScoreRing from "@/components/SmartScoreRing";

const PATHWAY_LABELS: Record<string, string> = {
  foundation:  "Foundation",
  developing:  "Developing",
  proficient:  "Proficient",
  advanced:    "Advanced",
};

const PATHWAY_COLORS: Record<string, string> = {
  foundation: "bg-orange-100 text-orange-700 border-orange-200",
  developing: "bg-amber-100 text-amber-700 border-amber-200",
  proficient: "bg-blue-100 text-blue-700 border-blue-200",
  advanced:   "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const AT_HOME_TIPS: Record<string, string> = {
  foundation: "Read aloud together for 10–15 minutes daily. Point to words as you say them.",
  developing: "Ask your student to retell stories they've read. Discuss new vocabulary words at dinner.",
  proficient: "Encourage journaling or writing short paragraphs. Ask opinion questions about books.",
  advanced:   "Challenge with chapter books above grade level. Discuss themes and author's purpose.",
};

function DomainBar({ domain, domainCode, mastered, practiced, total, avgScore }: any) {
  const color = DOMAIN_COLORS[domainCode] ?? "#6b7280";
  const pct = total > 0 ? (mastered / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: color }}>
        {domainCode}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium truncate">{domain}</span>
          <span className="text-xs text-muted-foreground ml-2 shrink-0">{mastered}/{total}</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
      <div className="w-8 text-right text-xs font-semibold text-muted-foreground shrink-0">{avgScore}</div>
    </div>
  );
}

function SessionRow({ session }: { session: any }) {
  const correct = session.correctCount ?? 0;
  const total = session.activitiesCompleted ?? 0;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  const when = session.completedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(session.completedAt))
    : "In progress";
  return (
    <div className="flex items-center gap-3 py-2.5 border-b last:border-0">
      <div className={cn("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0",
        pct >= 80 ? "bg-emerald-100 text-emerald-700" : pct >= 60 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"
      )}>
        {pct}%
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{correct}/{total} correct</p>
        <p className="text-xs text-muted-foreground">{when}</p>
      </div>
      {(session.xpEarned ?? 0) > 0 && (
        <div className="flex items-center gap-1 text-amber-500 text-xs font-medium">
          <Zap className="w-3 h-3" />+{session.xpEarned}
        </div>
      )}
    </div>
  );
}

export default function CaregiverDashboard() {
  const [, setLocation] = useLocation();

  const { data: profile, isLoading: profileLoading } = useGetCaregiverProfile({
    query: {
      queryKey: getGetCaregiverProfileQueryKey(),
      retry: false,
    },
  });

  const hasStudent = !!(profile as any)?.studentId;

  const { data: overview, isLoading: overviewLoading } = useGetCaregiverStudentOverview({
    query: {
      queryKey: getGetCaregiverStudentOverviewQueryKey(),
      enabled: hasStudent,
      retry: false,
    },
  });

  const student = (overview as any)?.student;
  const pathway = student?.placementPathway ?? "developing";
  const tip = AT_HOME_TIPS[pathway] ?? AT_HOME_TIPS.developing;

  if (profileLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No profile yet → redirect to onboarding
  if (!profile) {
    setLocation("/caregiver-onboarding");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 to-purple-600 text-white px-4 py-4 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-xs text-rose-200">Family Portal</p>
              <p className="font-bold text-sm">Alphabet AI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLocation("/caregiver-onboarding")}
              className="flex items-center gap-1.5 text-xs text-rose-200 hover:text-white transition-colors"
            >
              <Link2 className="w-3 h-3" />
              {hasStudent ? "Change student" : "Link student"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* No student linked */}
        {!hasStudent && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border p-8 text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-7 h-7 text-rose-500" />
            </div>
            <h2 className="text-lg font-bold mb-2">No student linked yet</h2>
            <p className="text-muted-foreground text-sm mb-5">Enter your student's code to start tracking their progress from home.</p>
            <Button
              onClick={() => setLocation("/caregiver-onboarding")}
              className="bg-rose-600 hover:bg-rose-700 text-white gap-2"
            >
              <Link2 className="w-4 h-4" /> Link a Student
            </Button>
          </motion.div>
        )}

        {/* Student overview */}
        {hasStudent && overviewLoading && (
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl" />)}
          </div>
        )}

        {hasStudent && overview && (
          <>
            {/* Student hero card */}
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border p-5 flex items-center gap-4"
            >
              <SmartScoreRing score={(overview as any).overallAvgScore} size={64} strokeWidth={6} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-0.5">Your student</p>
                <h2 className="text-xl font-bold truncate">{student.displayName}</h2>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-sm text-muted-foreground">{student.grade} grade</span>
                  {student.placementPathway && (
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", PATHWAY_COLORS[pathway] ?? "bg-gray-100 text-gray-600")}>
                      {PATHWAY_LABELS[student.placementPathway]}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-1.5 text-amber-500">
                  <Flame className="w-4 h-4" />
                  <span className="text-sm font-bold">{student.currentStreak ?? 0} day streak</span>
                </div>
                <div className="flex items-center gap-1.5 text-purple-500">
                  <Zap className="w-4 h-4" />
                  <span className="text-sm font-bold">{(student.totalXp ?? 0).toLocaleString()} XP</span>
                </div>
              </div>
            </motion.div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: BookOpen, label: "Skills Practiced", value: (overview as any).totalPracticed, color: "text-indigo-600", bg: "bg-indigo-50" },
                { icon: CheckCircle2, label: "Skills Mastered", value: (overview as any).totalMastered, color: "text-emerald-600", bg: "bg-emerald-50" },
                { icon: BarChart3, label: "Avg SmartScore", value: (overview as any).overallAvgScore, color: "text-blue-600", bg: "bg-blue-50" },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <motion.div key={label} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-xl border p-3 text-center"
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", bg)}>
                    <Icon className={cn("w-4 h-4", color)} />
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                </motion.div>
              ))}
            </div>

            {/* Domain mastery */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-2xl border p-5"
            >
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-500" /> ELA Domain Progress
              </h3>
              <div className="space-y-4">
                {((overview as any).domainMastery ?? []).map((d: any) => (
                  <DomainBar key={d.domainCode} {...d} />
                ))}
              </div>
            </motion.div>

            {/* Skills rows */}
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Strong skills */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-white rounded-2xl border p-5"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-emerald-700">
                  <TrendingUp className="w-4 h-4" /> Doing Well
                </h3>
                {((overview as any).strongSkills ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No skills practiced yet.</p>
                ) : (
                  <div className="space-y-2">
                    {((overview as any).strongSkills ?? []).map((s: any) => (
                      <div key={s.skillCode} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        <span className="text-sm flex-1 truncate">{s.skillCode}</span>
                        <span className="text-xs font-semibold text-emerald-600">{s.smartScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* Weak skills */}
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-2xl border p-5"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2 text-amber-700">
                  <TrendingDown className="w-4 h-4" /> Needs Practice
                </h3>
                {((overview as any).weakSkills ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">All practiced skills are on track!</p>
                ) : (
                  <div className="space-y-2">
                    {((overview as any).weakSkills ?? []).map((s: any) => (
                      <div key={s.skillCode} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <span className="text-sm flex-1 truncate">{s.skillCode}</span>
                        <span className="text-xs font-semibold text-amber-600">{s.smartScore}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            {/* At-home tip */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
              className="bg-gradient-to-r from-rose-50 to-purple-50 border border-rose-100 rounded-2xl p-5"
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-rose-700">
                <Heart className="w-4 h-4" /> How to Support at Home
              </h3>
              <p className="text-sm text-slate-700 leading-relaxed">{tip}</p>
            </motion.div>

            {/* Recent sessions */}
            {((overview as any).recentSessions ?? []).length > 0 && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-white rounded-2xl border p-5"
              >
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-400" /> Recent Practice Sessions
                </h3>
                <div>
                  {((overview as any).recentSessions ?? []).map((s: any) => (
                    <SessionRow key={s.id} session={s} />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Student code */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
              className="bg-white rounded-2xl border p-5"
            >
              <h3 className="font-semibold mb-2 flex items-center gap-2 text-slate-500">
                <Star className="w-4 h-4" /> Student Code
              </h3>
              <p className="text-xs text-muted-foreground mb-2">Share this code with another family member to give them access to view progress.</p>
              <div className="font-mono text-2xl font-bold tracking-widest text-slate-700 bg-slate-50 rounded-xl px-4 py-3 text-center border">
                {student.studentCode}
              </div>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
