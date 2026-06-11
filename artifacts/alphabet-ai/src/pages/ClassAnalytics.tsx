import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useGetClassAnalytics,
  useListTeacherClasses,
  getGetClassAnalyticsQueryKey,
} from "@workspace/api-client-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from "recharts";
import { ArrowLeft, Users, TrendingUp, CheckCircle, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, HEATMAP_COLOR } from "@/lib/constants";
import Layout from "@/components/Layout";
import { useSelectedClass } from "@/contexts/SelectedClassContext";

const MASTERY_COLORS: Record<string, string> = {
  Advanced:   "#4f46e5",
  Proficient: "#22c55e",
  Developing: "#f59e0b",
  Foundation: "#ef4444",
};

const DOMAIN_FULL: Record<string, string> = {
  RL: "Reading Lit", RI: "Reading Info", RF: "Foundational",
  W: "Writing", SL: "Speaking", L: "Language",
};

export default function ClassAnalytics() {
  const [, setLocation] = useLocation();
  const { data: classes, isLoading: classesLoading } = useListTeacherClasses();
  const { selectedClassId, setSelectedClassId } = useSelectedClass();

  const classId = selectedClassId ?? classes?.[0]?.id ?? "";
  const activeClass = (classes ?? []).find((c) => c.id === classId) ?? classes?.[0] ?? null;

  const { data, isLoading: analyticsLoading } = useGetClassAnalytics(classId, {
    query: {
      queryKey: getGetClassAnalyticsQueryKey(classId),
      enabled: !!classId,
    },
  });

  const isLoading = classesLoading || (!!classId && analyticsLoading);

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)}
      </div>
    </Layout>
  );

  const stats = [
    { label: "Class Average", value: data?.avgScore ?? 0, suffix: "pts", icon: TrendingUp, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "On Track", value: `${data?.onTrackPct ?? 0}%`, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
    { label: "Needs Support", value: `${data?.interventionPct ?? 0}%`, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
    { label: "Not Yet Tested", value: `${data?.notTestedPct ?? 0}%`, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Total Students", value: data?.totalStudents ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  ];

  const domainData = (data?.domainAverages ?? []).map((d) => ({
    name: DOMAIN_FULL[d.domainCode] ?? d.domainCode,
    code: d.domainCode,
    score: d.score,
    fill: DOMAIN_COLORS[d.domainCode] ?? "#6366f1",
  }));

  const pieData = (data?.masteryDistribution ?? []).filter((d) => d.count > 0);

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3">
          <button
            onClick={() => setLocation("/teacher")}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Class Analytics</h1>
            <p className="text-sm text-muted-foreground">{activeClass?.className ?? "My Class"} · {data?.totalStudents ?? 0} students</p>
          </div>
        </motion.div>

        {/* Class selector — only shown when teacher has more than one class */}
        {(classes?.length ?? 0) > 1 && (
          <div>
            <Select
              value={classId}
              onValueChange={(v) => setSelectedClassId(v)}
            >
              <SelectTrigger className="w-72" data-testid="select-class-analytics">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.className} · Grade {cls.gradeLevel}
                    {(cls.studentCount ?? 0) > 0 && ` · ${cls.studentCount} students`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {stats.map(({ label, value, suffix, icon: Icon, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold">{value}{suffix ?? ""}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Domain averages bar chart */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Domain Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={domainData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                    <XAxis dataKey="code" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v: number) => [`${v} pts`, "Avg Score"]}
                      labelFormatter={(label) => DOMAIN_FULL[label] ?? label}
                      contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                    />
                    <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                      {domainData.map((d, i) => (
                        <Cell key={i} fill={d.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>

                {/* Reference line labels */}
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-400 inline-block" />70+ on track</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400 inline-block" />&lt;70 needs support</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Mastery distribution pie */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Mastery Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No assessment data yet</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="count"
                        nameKey="level"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        label={({ level, pct }) => `${level} ${pct}%`}
                        labelLine={false}
                      >
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={MASTERY_COLORS[d.level] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [`${v} students`, name]}
                        contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Score distribution histogram */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Score Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={data?.scoreDistribution ?? []} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    formatter={(v: number) => [`${v} students`, "Count"]}
                    contentStyle={{ borderRadius: 10, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {(data?.scoreDistribution ?? []).map((d, i) => {
                      const midScore = parseInt(d.bucket.split("–")[1] ?? "50");
                      return <Cell key={i} fill={midScore >= 75 ? "#22c55e" : midScore >= 60 ? "#f59e0b" : "#ef4444"} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Skills needing attention */}
        {(data?.skillsNeedingAttention ?? []).length > 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Skills Needing Attention
                  <span className="text-xs font-normal text-muted-foreground ml-1">lowest average scores</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {(data?.skillsNeedingAttention ?? []).map((skill, i) => (
                    <motion.div
                      key={skill.skillCode}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.25 + i * 0.05 }}
                      className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-muted/50"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: DOMAIN_COLORS[skill.domain] ?? "#6366f1" }}
                      >
                        {skill.domain}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{skill.skillName}</p>
                        <p className="text-xs text-muted-foreground">{skill.studentCount} student{skill.studentCount !== 1 ? "s" : ""} tested</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={cn("text-sm font-bold", HEATMAP_COLOR(skill.avgScore), "px-2.5 py-1 rounded-lg")}>
                          {skill.avgScore}
                        </div>
                      </div>
                      <div className="w-24 shrink-0">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${skill.avgScore}%`,
                              backgroundColor: skill.avgScore >= 70 ? "#22c55e" : skill.avgScore >= 50 ? "#f59e0b" : "#ef4444",
                            }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
