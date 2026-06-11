import { useParams, useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { useGetTeacherStudentProgress, getGetTeacherStudentProgressQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Star,
  Flame,
  CheckCircle,
  AlertTriangle,
  Clock,
  TrendingUp,
  Zap,
  BookOpen,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS } from "@/lib/constants";
import Layout from "@/components/Layout";

const MASTERY_COLORS: Record<string, string> = {
  mastered: "bg-emerald-100 text-emerald-700 border-emerald-200",
  proficient: "bg-green-100 text-green-700 border-green-200",
  developing: "bg-amber-100 text-amber-700 border-amber-200",
  beginning: "bg-orange-100 text-orange-700 border-orange-200",
  not_started: "bg-gray-100 text-gray-500 border-gray-200",
};

const MASTERY_LABEL: Record<string, string> = {
  mastered: "Mastered",
  proficient: "Proficient",
  developing: "Developing",
  beginning: "Beginning",
  not_started: "Not Started",
};

const PATHWAY_LABEL: Record<string, string> = {
  foundation: "Foundation",
  developing: "Developing",
  proficient: "Proficient",
  advanced: "Advanced",
};

function ScorePill({ score }: { score: number }) {
  const color =
    score >= 87
      ? "bg-emerald-100 text-emerald-700"
      : score >= 70
        ? "bg-green-100 text-green-700"
        : score >= 50
          ? "bg-amber-100 text-amber-700"
          : "bg-red-100 text-red-700";
  return (
    <span className={cn("inline-flex items-center justify-center w-12 h-6 rounded-full text-xs font-semibold", color)}>
      {Math.round(score)}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "on_track") return <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full"><CheckCircle className="w-3 h-3" />On Track</span>;
  if (status === "intervention") return <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full"><AlertTriangle className="w-3 h-3" />Intervention</span>;
  return <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full"><Clock className="w-3 h-3" />Not Tested</span>;
}

export default function StudentProgressDetail() {
  const params = useParams<{ studentId: string }>();
  const studentId = params.studentId ?? "";
  const [, setLocation] = useLocation();

  const { data, isLoading, isError } = useGetTeacherStudentProgress(studentId, {
    query: {
      queryKey: getGetTeacherStudentProgressQueryKey(studentId),
      enabled: !!studentId,
      staleTime: 30_000,
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <div className="grid lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
          </div>
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (isError || !data) {
    return (
      <Layout>
        <div className="p-6 max-w-5xl mx-auto text-center py-20">
          <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-red-400" />
          <p className="font-semibold text-lg">Student not found</p>
          <p className="text-sm text-muted-foreground mt-1">This student may not be in any of your classes.</p>
          <button onClick={() => setLocation("/teacher/roster")} className="mt-4 text-sm text-indigo-600 hover:underline">
            Back to Roster
          </button>
        </div>
      </Layout>
    );
  }

  const s = data as any;

  const domains = ["RL", "RI", "RF", "W", "SL", "L"];
  const radarData = domains.map((d) => {
    const ds = (s.domainScores ?? []).find((x: any) => x.domainCode === d);
    return { domain: d, score: ds ? Math.round(ds.score) : 0, fullMark: 100 };
  });

  const masteredSkills = (s.skills ?? []).filter((sk: any) => sk.masteryLevel === "mastered");
  const inProgressSkills = (s.skills ?? []).filter((sk: any) => sk.masteryLevel !== "mastered" && sk.practiceCount > 0);
  const approachingSkills = (s.skills ?? []).filter((sk: any) => sk.approachingMastery);
  const needsReteachingSkills = (s.skills ?? []).filter((sk: any) => sk.needsReteaching);

  const skillsByDomain = domains.reduce<Record<string, any[]>>((acc, d) => {
    acc[d] = (s.skills ?? []).filter((sk: any) => sk.domain === d);
    return acc;
  }, {});

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/teacher/roster")}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-muted-foreground"
            data-testid="btn-back-to-roster"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate" data-testid="student-name">{s.displayName}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">Grade {s.grade}</span>
              {s.diagnosedGradeLevel && s.diagnosedGradeLevel !== s.grade && (
                <span className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-2 py-0.5 rounded-full">
                  Reading at {s.diagnosedGradeLevel}
                </span>
              )}
              {s.placementPathway && (
                <span className="text-xs bg-indigo-50 border border-indigo-200 text-indigo-700 px-2 py-0.5 rounded-full capitalize">
                  {PATHWAY_LABEL[s.placementPathway] ?? s.placementPathway} Pathway
                </span>
              )}
              {s.status && <StatusBadge status={s.status} />}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-2xl font-bold text-indigo-600">{Math.round(s.avgSmartScore ?? 0)}</p>
            <p className="text-xs text-muted-foreground">Avg SmartScore</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: Star, label: "Total XP", value: s.totalXp?.toLocaleString() ?? "0", color: "text-amber-500", bg: "bg-amber-50" },
            { icon: Flame, label: "Day Streak", value: s.currentStreak ?? 0, color: "text-orange-500", bg: "bg-orange-50" },
            { icon: CheckCircle, label: "Mastered", value: masteredSkills.length, color: "text-emerald-600", bg: "bg-emerald-50" },
            { icon: TrendingUp, label: "In Progress", value: inProgressSkills.length, color: "text-blue-600", bg: "bg-blue-50" },
          ].map(({ icon: Icon, label, value, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Radar chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">SmartScore by Domain</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis
                    dataKey="domain"
                    tick={({ payload, x, y, cx, cy, ...rest }) => {
                      const color = DOMAIN_COLORS[payload.value as string] ?? "#6b7280";
                      return (
                        <text {...rest} x={x} y={y} fill={color} fontSize={11} fontWeight={700} textAnchor="middle">
                          {payload.value}
                        </text>
                      );
                    }}
                  />
                  <Radar
                    name="SmartScore"
                    dataKey="score"
                    stroke="#6366f1"
                    fill="#6366f1"
                    fillOpacity={0.18}
                    strokeWidth={2}
                  />
                  <Tooltip
                    formatter={(val: number) => [`${val}`, "SmartScore"]}
                    contentStyle={{ borderRadius: 10, border: "1px solid #e5e7eb", fontSize: 12 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Approaching mastery + needs reteaching */}
          <div className="space-y-4">
            {approachingSkills.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-500" />
                    Approaching Mastery
                    <span className="ml-auto text-xs text-muted-foreground font-normal">one session away</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {approachingSkills.slice(0, 5).map((sk: any) => (
                    <div key={sk.skillCode} className="flex items-center gap-3 p-2 rounded-xl bg-amber-50 border border-amber-100">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: DOMAIN_COLORS[sk.domain] ?? "#6b7280" }}
                      >
                        {sk.domain}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{sk.skillName}</p>
                        <p className="text-[10px] text-muted-foreground">{sk.skillCode}</p>
                      </div>
                      <ScorePill score={sk.smartScore} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {needsReteachingSkills.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    Needs Reteaching
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {needsReteachingSkills.slice(0, 5).map((sk: any) => (
                    <div key={sk.skillCode} className="flex items-center gap-3 p-2 rounded-xl bg-red-50 border border-red-100">
                      <div
                        className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                        style={{ backgroundColor: DOMAIN_COLORS[sk.domain] ?? "#6b7280" }}
                      >
                        {sk.domain}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{sk.skillName}</p>
                        <p className="text-[10px] text-muted-foreground">{sk.consecutiveErrors ?? 0} consecutive errors</p>
                      </div>
                      <ScorePill score={sk.smartScore} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {approachingSkills.length === 0 && needsReteachingSkills.length === 0 && (
              <Card className="border-0 shadow-sm h-full">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <CheckCircle className="w-10 h-10 text-green-400 mb-3" />
                  <p className="text-sm font-medium">No urgent interventions</p>
                  <p className="text-xs text-muted-foreground mt-1 text-center">This student has no skills that need immediate attention.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Skill list by domain */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-4 h-4" /> Skills by Domain
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {domains.map((d) => {
              const dSkills = skillsByDomain[d] ?? [];
              if (dSkills.length === 0) return null;
              return (
                <div key={d}>
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: DOMAIN_COLORS[d] ?? "#6b7280" }}
                    >
                      {d}
                    </div>
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {d === "RL" ? "Reading Literature" : d === "RI" ? "Reading Informational" : d === "RF" ? "Reading Foundational" : d === "W" ? "Writing" : d === "SL" ? "Speaking & Listening" : "Language"}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">{dSkills.length} skill{dSkills.length !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-1.5 px-2 font-medium text-muted-foreground">Skill</th>
                          <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Score</th>
                          <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Level</th>
                          <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Practice</th>
                          <th className="text-center py-1.5 px-2 font-medium text-muted-foreground">Last Practiced</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {dSkills.map((sk: any) => (
                          <tr key={sk.skillCode} className="hover:bg-gray-50">
                            <td className="py-2 px-2">
                              <p className="font-medium">{sk.skillName}</p>
                              <p className="text-[10px] text-muted-foreground">{sk.skillCode}</p>
                            </td>
                            <td className="py-2 px-2 text-center">
                              <ScorePill score={sk.smartScore} />
                            </td>
                            <td className="py-2 px-2 text-center">
                              <span className={cn("px-1.5 py-0.5 rounded-full border text-[10px] font-medium", MASTERY_COLORS[sk.masteryLevel] ?? "bg-gray-100 text-gray-500")}>
                                {MASTERY_LABEL[sk.masteryLevel] ?? sk.masteryLevel}
                              </span>
                            </td>
                            <td className="py-2 px-2 text-center text-muted-foreground">
                              {sk.practiceCount > 0 ? `${sk.correctCount}/${sk.practiceCount}` : "—"}
                            </td>
                            <td className="py-2 px-2 text-center text-muted-foreground">
                              {sk.lastPracticed
                                ? new Date(sk.lastPracticed).toLocaleDateString([], { month: "short", day: "numeric" })
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
            {(s.skills ?? []).length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No skills practiced yet.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent sessions */}
        {(s.recentSessions ?? []).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(s.recentSessions as any[]).map((session: any) => {
                  const accuracy = session.totalQuestions > 0
                    ? Math.round((session.correctAnswers / session.totalQuestions) * 100)
                    : 0;
                  return (
                    <div key={session.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", session.type === "placement" ? "bg-purple-100" : "bg-indigo-100")}>
                        {session.type === "placement"
                          ? <TrendingUp className="w-4 h-4 text-purple-600" />
                          : <BookOpen className="w-4 h-4 text-indigo-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium capitalize">
                          {session.type === "placement" ? "Placement Assessment" : `Practice${session.focusDomain ? ` · ${session.focusDomain}` : ""}`}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(session.completedAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                          {session.durationMin != null && ` · ${Math.round(session.durationMin)}m`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-semibold">{accuracy}% accuracy</p>
                        <p className="text-[10px] text-muted-foreground">+{session.xpEarned} XP</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
