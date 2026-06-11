import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useListClassStudents,
  useGetClassHeatmap,
  useListTeacherClasses,
  getListClassStudentsQueryKey,
  getGetClassHeatmapQueryKey,
} from "@workspace/api-client-react";
import { Users, TrendingUp, AlertTriangle, CheckCircle, RefreshCw, Share2, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS, HEATMAP_COLOR } from "@/lib/constants";
import Layout from "@/components/Layout";
import { useSelectedClass } from "@/contexts/SelectedClassContext";

const FILTERS = ["All", "On Track", "Intervention", "Not Tested"] as const;
type Filter = typeof FILTERS[number];

export default function TeacherRoster() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<Filter>("All");
  const { selectedClassId, setSelectedClassId } = useSelectedClass();

  const { data: classes, isLoading: classesLoading } = useListTeacherClasses();

  const classId = selectedClassId ?? classes?.[0]?.id ?? "";
  const activeClass = (classes ?? []).find((c) => c.id === classId) ?? classes?.[0] ?? null;

  const { data: students, isLoading: studentsLoading, dataUpdatedAt } = useListClassStudents(classId, {
    query: {
      queryKey: getListClassStudentsQueryKey(classId),
      enabled: !!classId,
      refetchInterval: 30_000,
    },
  });
  const { data: heatmap } = useGetClassHeatmap(classId, {
    query: {
      queryKey: getGetClassHeatmapQueryKey(classId),
      enabled: !!classId,
      refetchInterval: 30_000,
    },
  });

  const isLoading = classesLoading || studentsLoading;

  const filtered = (students ?? []).filter((s) => {
    if (filter === "All") return true;
    if (filter === "On Track") return (s as any).status === "on_track";
    if (filter === "Intervention") return (s as any).status === "intervention";
    if (filter === "Not Tested") return (s as any).status === "not_tested";
    return true;
  });

  const domains = (heatmap as any)?.domains ?? Object.keys(DOMAIN_COLORS);

  const updatedLabel = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
    </Layout>
  );

  const hasNoStudents = !!classId && students !== undefined && students.length === 0;
  const hasStudentsButFilterEmpty = !!classId && (students?.length ?? 0) > 0 && filtered.length === 0;

  return (
    <Layout>
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold mb-1">Class Roster</h1>
            <p className="text-sm text-muted-foreground">Standards mastery heatmap and student performance overview.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {updatedLabel && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">
                <RefreshCw className="w-3 h-3" />
                Updated {updatedLabel}
              </div>
            )}
          </div>
        </div>

        {/* Class selector — only shown when teacher has more than one class */}
        {(classes?.length ?? 0) > 1 && (
          <div className="mb-5">
            <Select
              value={classId}
              onValueChange={(v) => { setSelectedClassId(v); setFilter("All"); }}
            >
              <SelectTrigger className="w-72" data-testid="select-class">
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

        {/* Filter chips */}
        {!!classId && !hasNoStudents && (
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
        )}

        {/* No class created yet */}
        {!classId ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground font-medium">No class created yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create a class from the Teacher Dashboard to get started.</p>
          </div>

        /* Class exists but no students enrolled yet */
        ) : hasNoStudents ? (
          <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
              <Share2 className="w-7 h-7 text-indigo-500" />
            </div>
            <p className="text-base font-semibold text-indigo-900 mb-1">No students yet</p>
            <p className="text-sm text-indigo-700 mb-4">
              Share your class join code with students so they can enroll.
            </p>
            {activeClass?.classCode && (
              <div className="inline-flex items-center gap-3 bg-white border border-indigo-200 rounded-xl px-5 py-3 shadow-sm">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest">Join Code</p>
                  <p className="text-2xl font-mono font-bold text-indigo-700 tracking-widest" data-testid="class-join-code">
                    {activeClass.classCode}
                  </p>
                </div>
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-4">
              Students enter this code during onboarding to join {activeClass?.className ?? "your class"}.
            </p>
          </div>

        /* Students exist but none match the active filter */
        ) : hasStudentsButFilterEmpty ? (
          <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">No students match the &ldquo;{filter}&rdquo; filter.</p>
          </div>

        /* Normal table view */
        ) : (
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
                {filtered.map((student, i) => {
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
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer"
                      data-testid={`student-row-${s.studentId}`}
                      onClick={() => s.studentId && setLocation(`/teacher/students/${s.studentId}`)}
                    >
                      <td className="px-4 py-3 sticky left-0 bg-white group-hover:bg-indigo-50/40">
                        <div className="flex items-center gap-1">
                          <p className="font-medium truncate">{s.displayName}</p>
                          <ChevronRight className="w-3 h-3 text-indigo-400 opacity-0 group-hover:opacity-100 shrink-0 ml-auto" />
                        </div>
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
        )}
      </div>
    </Layout>
  );
}
