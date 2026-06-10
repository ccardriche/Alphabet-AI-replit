import { motion } from "framer-motion";
import {
  useGetStudentProgress,
  useGetStudentAnalytics,
  useGetMasterySummary,
} from "@workspace/api-client-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from "recharts";
import { TrendingUp, Award, Target, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { DOMAIN_COLORS } from "@/lib/constants";

export default function Progress() {
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress();
  const { data: analytics } = useGetStudentAnalytics();
  const { data: summary } = useGetMasterySummary();

  if (progressLoading) return (
    <Layout>
      <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-xl" />)}</div>
    </Layout>
  );

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
            { label: "Growth Rate", value: analytics?.onTrack ? "On Track" : "Needs Attn", icon: Zap, color: "text-amber-600", bg: "bg-amber-50", isText: true },
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

        {/* Weekly XP Chart */}
        {progress?.weeklyXp && progress.weeklyXp.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Weekly XP</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={progress.weeklyXp}>
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Bar dataKey="xp" fill="url(#xpGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Mastery Timeline */}
        {progress?.masteryTimeline && progress.masteryTimeline.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Skills Mastered Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={progress.masteryTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }} />
                  <Line type="monotone" dataKey="masteredCount" stroke="#6366f1" strokeWidth={2} dot={{ r: 3, fill: "#6366f1" }} />
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
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Grade Progress */}
        {progress?.gradeProgress && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Grade Level Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                {[
                  { label: "Enrolled Grade", value: progress.gradeProgress.enrolledGrade },
                  { label: "Diagnosed Level", value: progress.gradeProgress.diagnosedGrade ?? "—" },
                  { label: "Current Estimate", value: progress.gradeProgress.currentEstimatedGrade ?? "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xl font-bold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{label}</p>
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
