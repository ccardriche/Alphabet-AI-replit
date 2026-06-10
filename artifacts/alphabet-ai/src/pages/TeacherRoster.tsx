import { useState } from "react";
import { motion } from "framer-motion";
import {
  useListClassStudents,
  useGetClassHeatmap,
  useListTeacherClasses,
  getListClassStudentsQueryKey,
  getGetClassHeatmapQueryKey,
} from "@workspace/api-client-react";
import { Users, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, HEATMAP_COLOR } from "@/lib/constants";
import Layout from "@/components/Layout";

const FILTERS = ["All", "On Track", "Intervention", "Not Tested"] as const;
type Filter = typeof FILTERS[number];

export default function TeacherRoster() {
  const [filter, setFilter] = useState<Filter>("All");

  const { data: classes } = useListTeacherClasses();
  const classId = classes?.[0]?.id ?? "demo-class";

  const { data: students, isLoading } = useListClassStudents(classId, {
    query: {
      queryKey: getListClassStudentsQueryKey(classId),
      enabled: !!classId,
    },
  });
  const { data: heatmap } = useGetClassHeatmap(classId, {
    query: {
      queryKey: getGetClassHeatmapQueryKey(classId),
      enabled: !!classId,
    },
  });

  const filtered = students?.filter((s) => {
    if (filter === "All") return true;
    if (filter === "On Track") return (s as any).status === "on_track";
    if (filter === "Intervention") return (s as any).status === "intervention";
    if (filter === "Not Tested") return (s as any).status === "not_tested";
    return true;
  }) ?? [];

  const domains = (heatmap as any)?.domains ?? Object.keys(DOMAIN_COLORS);

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Class Roster</h1>
          <p className="text-sm text-muted-foreground">Standards mastery heatmap and student performance overview.</p>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`btn-filter-${f.toLowerCase().replace(/\s+/g, "-")}`}
              className={cn(
                "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                filter === f ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"
              )}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-sm text-muted-foreground self-center">{filtered.length} students</span>
        </div>

        {/* Heatmap table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground w-48 sticky left-0 bg-white">Student</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Grade</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Score</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Status</th>
                {domains.map((d: string) => (
                  <th key={d} className="text-center px-3 py-3" style={{ minWidth: 56 }}>
                    <div
                      className="mx-auto w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white"
                      style={{ backgroundColor: DOMAIN_COLORS[d] ?? "#6b7280" }}
                    >
                      {d}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4 + domains.length} className="text-center py-12 text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p>No students found</p>
                  </td>
                </tr>
              ) : filtered.map((student, i) => {
                const s = student as any;
                const statusIcon = s.status === "on_track"
                  ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  : s.status === "intervention"
                    ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                    : <TrendingUp className="w-3.5 h-3.5 text-gray-400" />;
                return (
                  <motion.tr
                    key={s.studentId ?? i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50 transition-colors"
                    data-testid={`student-row-${s.studentId}`}
                  >
                    <td className="px-4 py-3 sticky left-0 bg-white">
                      <p className="font-medium truncate">{s.displayName}</p>
                      {s.gradeGap != null && s.gradeGap > 0 && (
                        <p className="text-xs text-red-500">-{s.gradeGap} grade gap</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center text-xs">{s.grade}</td>
                    <td className="px-3 py-3 text-center font-semibold">{Math.round(s.avgSmartScore ?? 0)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {statusIcon}
                        <span className="text-xs capitalize hidden sm:inline">{s.status?.replace(/_/g, " ")}</span>
                      </div>
                    </td>
                    {domains.map((d: string) => {
                      const ds = s.domainScores?.find((ds: any) => ds.domainCode === d);
                      const score = ds?.score ?? 0;
                      return (
                        <td key={d} className="px-3 py-3 text-center">
                          <div className={cn("mx-auto w-9 h-9 rounded-lg flex items-center justify-center text-xs font-semibold", HEATMAP_COLOR(score))}>
                            {score > 0 ? Math.round(score) : "—"}
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
