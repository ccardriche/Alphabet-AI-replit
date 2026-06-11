import { motion } from "framer-motion";
import {
  useGetStudentProgress,
  useGetStudentAnalytics,
  useGetMasterySummary,
  useGetStudentDashboard,
  useGetWeeklyXp,
  useGetMasteryTimeline,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { TrendingUp, Award, Target, Zap, GraduationCap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { DOMAIN_COLORS } from "@/lib/constants";

const GRADE_ORDER = ["K","1st","2nd","3rd","4th","5th","6th","7th","8th"];

function gradeGapMessage(enrolled: string, diagnosed: string | null | undefined): { text: string; positive: boolean } {
  if (!diagnosed || diagnosed === enrolled) {
    return { text: "Reading at grade level — great work!", positive: true };
  }
  const eIdx = GRADE_ORDER.indexOf(enrolled);
  const dIdx = GRADE_ORDER.indexOf(diagnosed);
  if (dIdx === -1 || eIdx === -1) return { text: "Assessment complete — keep practicing!", positive: true };
  if (dIdx >= eIdx) return { text: "Reading at or above grade level — excellent!", positive: true };
  const gap = eIdx - dIdx;
  return {
    text: `You're ${gap} grade level${gap > 1 ? "s" : ""} away from your enrolled grade — and you're closing the gap every day!`,
    positive: false,
  };
}

export default function Progress() {
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress();
  const { data: analytics } = useGetStudentAnalytics();
  const { data: summary } = useGetMasterySummary();
  const { data: dashboard } = useGetStudentDashboard();
  const { data: weeklyXpData } = useGetWeeklyXp();
  const { data: masteryEvents } = useGetMasteryTimeline();

  if (progressLoading) return (
    <Layout>
      <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
    </Layout>
  );

  // Build radar data from domain progress (dashboard) or mastery summary (summary)
  const radarData = (dashboard?.domainProgress ?? []).map((d) => ({
    domain: d.domainCode,
    score: d.avgScore,
    fullMark: 100,
  }));

  const gp = progress?.gradeProgress;
  const gradeMsg = gp ? gradeGapMessage(gp.enrolledGrade, gp.diagnosedGrade) : null;

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold mb-1">Progress</h1>
          <p className="text-sm text-muted-foreground">Track your growth across all ELA domains.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Skills Mastered", value: summary?.masteredSkills ?? 0, icon: Award, color: "text-green-600", bg: "bg-green-50" },
            { label: "Total Skills", value: summary?.totalSkills ?? 0, icon: Target, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Avg SmartScore", value: Math.round(summary?.overallSmartScore ?? 0), icon: TrendingUp, color: "text-purple-600", bg: "bg-purple-50" },
            { label: "Growth", value: analytics?.onTrack ? "On Track" : "Keep Going", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", isText: true },
          ].map(({ label, value, icon: Icon, color, bg, isText }) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className={`font-bold ${isText ? "text-lg" : "text-2xl"} text-foreground`}>{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weekly XP Chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">XP This Week</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyXpData && weeklyXpData.some((d) => d.xp > 0) ? (
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={weeklyXpData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: any) => [`${v} XP`, "XP"]}
                    />
                    <Bar dataKey="xp" fill="url(#xpGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                  Practice this week to see your XP chart!
                </div>
              )}
            </CardContent>
          </Card>

          {/* Domain Radar Chart */}
          {radarData.length > 0 ? (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Domain SmartScores</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={radarData} margin={{ top: 4, right: 20, left: 20, bottom: 4 }}>
                    <PolarGrid stroke="#e5e7eb" />
                    <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fontWeight: 600 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                    <Radar
                      name="SmartScore"
                      dataKey="score"
                      stroke="#6366f1"
                      fill="#6366f1"
                      fillOpacity={0.25}
                      strokeWidth={2}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                      formatter={(v: any) => [`${Math.round(v)}`, "SmartScore"]}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Domain SmartScores</CardTitle>
              </CardHeader>
              <CardContent className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                Complete your placement to see your domain radar.
              </CardContent>
            </Card>
          )}
        </div>

        {/* Mastery Timeline — driven by /progress/timeline endpoint */}
        {masteryEvents && masteryEvents.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skills Mastered Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={masteryEvents} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                    formatter={(v: any, _name: any, props: any) => [
                      `${v} skill${v !== 1 ? "s" : ""} mastered`,
                      props?.payload?.skillName ?? "Mastered",
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="masteredCount"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#6366f1" }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Domain Breakdown */}
        {summary?.domains && summary.domains.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Domain Breakdown</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {summary.domains.map((d) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const pct = d.totalSkills > 0 ? Math.round((d.masteredSkills / d.totalSkills) * 100) : 0;
                return (
                  <div key={d.domainCode}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <span className="text-sm font-medium">{d.domain}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>SmartScore: <strong className="text-foreground">{Math.round(d.avgSmartScore)}</strong></span>
                        <span>{d.masteredSkills}/{d.totalSkills}</span>
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
        )}

        {/* Grade Progress */}
        {gp && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-muted-foreground" />
                <CardTitle className="text-base">Grade Level Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Enrolled Grade", value: gp.enrolledGrade, color: "text-blue-600", bg: "bg-blue-50" },
                  { label: "Diagnosed Level", value: gp.diagnosedGrade ?? "—", color: "text-purple-600", bg: "bg-purple-50" },
                  { label: "Current Estimate", value: gp.currentEstimatedGrade ?? "—", color: "text-green-600", bg: "bg-green-50" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`${bg} rounded-xl p-4`}>
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
                  </div>
                ))}
              </div>
              {gradeMsg && (
                <div className={`flex items-start gap-2 rounded-lg px-4 py-3 text-sm ${
                  gradeMsg.positive ? "bg-green-50 text-green-800" : "bg-amber-50 text-amber-800"
                }`}>
                  <span className="text-base leading-none mt-0.5">{gradeMsg.positive ? "✨" : "💪"}</span>
                  <p>{gradeMsg.text}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
