import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetStudentDashboard,
  useGetMasterySummary,
  useGetMyBadges,
} from "@workspace/api-client-react";
import { Zap, Flame, Trophy, BookOpen, ArrowRight, TrendingUp, Lock, CheckCircle2 } from "lucide-react";
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
          className={`w-5 h-5 transition-colors duration-300 ${isHot ? "text-orange-500 drop-shadow-sm" : "text-amber-400"}`}
        />
      </motion.div>
      {isHot && (
        <motion.div
          className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-yellow-300"
          animate={{ opacity: [0, 1, 0], scale: [0.5, 1, 0.5] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
        />
      )}
    </div>
  );
}

export default function StudentDashboard() {
  const [, setLocation] = useLocation();
  const { data, isLoading } = useGetStudentDashboard();
  const { data: summary } = useGetMasterySummary();
  const { data: allBadges = [] } = useGetMyBadges();

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
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
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Welcome back{profile?.displayName ? `, ${profile.displayName}` : ""}!
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {profile?.grade ? `Grade ${profile.grade}` : ""}
                {profile?.diagnosedGradeLevel ? ` · Reading at ${profile.diagnosedGradeLevel}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {/* Streak nudge */}
              <AnimatePresence>
                {streak > 0 && !practicedToday && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="hidden sm:flex items-center gap-1.5 bg-orange-50 border border-orange-200 text-orange-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                  >
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    Keep your streak! Practice today
                  </motion.div>
                )}
              </AnimatePresence>
              {/* Streak counter */}
              <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
                <FlameIcon streak={streak} />
                <div>
                  <p className="text-xs text-amber-600">Streak</p>
                  <p className="text-lg font-bold text-amber-700">{streak} {streak === 1 ? "day" : "days"}</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Questions Today", value: todayStats?.questionsAnswered ?? 0, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
            {
              label: "Correct Rate",
              value: (todayStats?.questionsAnswered ?? 0) > 0
                ? `${Math.round(((todayStats?.correctAnswers ?? 0) / todayStats!.questionsAnswered!) * 100)}%`
                : "—",
              icon: Trophy,
              color: "text-green-600",
              bg: "bg-green-50",
            },
            { label: "XP Today", value: todayStats?.xpEarned ?? 0, icon: Zap, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Total XP", value: data?.totalXp ?? 0, icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Start Practice CTA */}
        {!profile?.preAssessmentCompleted ? (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">Complete your placement assessment</h2>
                <p className="text-indigo-100 text-sm">Takes 10-20 questions — we'll find your reading level.</p>
              </div>
              <Button
                onClick={() => setLocation("/placement")}
                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold gap-2 shrink-0"
                data-testid="btn-start-placement"
              >
                Start <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold mb-1">
                  {practicedToday ? "Great work today! Keep going?" : "Ready for today's practice?"}
                </h2>
                <p className="text-indigo-100 text-sm">
                  {practicedToday
                    ? `${todayStats?.questionsAnswered} questions done · ${todayStats?.xpEarned} XP earned`
                    : "5 adaptive activities personalized just for you."}
                </p>
              </div>
              <Button
                onClick={() => setLocation("/practice")}
                className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold gap-2 shrink-0"
                data-testid="btn-start-practice"
              >
                Practice <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Domain Progress */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Domain Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {domainProgress.length === 0 ? (
                <p className="text-sm text-muted-foreground">Complete your placement to see domain progress.</p>
              ) : domainProgress.map((d) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const pct = d.totalCount > 0 ? Math.round((d.masteredCount / d.totalCount) * 100) : 0;
                return (
                  <div key={d.domainCode}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{d.domain}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>Avg: {d.avgScore}</span>
                        <span>{d.masteredCount}/{d.totalCount}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.7, ease: "easeOut" }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: color }}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Next Skills */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Up Next</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {nextSkills.length === 0 ? (
                <p className="text-sm text-muted-foreground">No upcoming skills yet — complete your placement first.</p>
              ) : nextSkills.slice(0, 4).map((skill) => {
                const color = DOMAIN_COLORS[skill.domainCode] ?? "#6b7280";
                return (
                  <div key={skill.skillCode} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                      {skill.domainCode}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{skill.skillName}</p>
                      <p className="text-xs text-muted-foreground">Grade {skill.gradeLevel}</p>
                    </div>
                  </div>
                );
              })}
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2"
                onClick={() => setLocation("/skill-tree")}
                data-testid="btn-view-skill-tree"
              >
                View Full Skill Tree
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Badges */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Badges</CardTitle>
          </CardHeader>
          <CardContent>
            {earnedBadges.length === 0 && (
              <p className="text-sm text-muted-foreground mb-3">Start practicing to earn your first badge!</p>
            )}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
              {earnedBadges.map((badge, i) => (
                <motion.div
                  key={badge.code}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.06, type: "spring", stiffness: 200 }}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gradient-to-b from-amber-50 to-yellow-50 border border-amber-200 text-center"
                  title={badge.desc}
                >
                  <span className="text-2xl">{badge.icon}</span>
                  <p className="text-xs font-semibold text-amber-800 leading-tight">{badge.title}</p>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                </motion.div>
              ))}
              {lockedBadges.slice(0, Math.max(0, 9 - earnedBadges.length)).map((badge) => (
                <div
                  key={badge.code}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-200 text-center opacity-50"
                  title={badge.desc}
                >
                  <span className="text-2xl grayscale">{badge.icon}</span>
                  <p className="text-xs font-medium text-gray-500 leading-tight">{badge.title}</p>
                  <Lock className="w-3 h-3 text-gray-400" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Mastery */}
        {recentMastery.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {recentMastery.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium">{m.skillName}</p>
                      <p className="text-xs text-muted-foreground">{m.domain} · SmartScore: {Math.round(m.smartScore)}</p>
                    </div>
                    <MasteryBadge level={m.masteryLevel} size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
