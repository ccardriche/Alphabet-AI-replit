import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetSkillTree,
  useListMastery,
  useGetStudentDashboard,
  getGetSkillTreeQueryKey,
} from "@workspace/api-client-react";
import { Search, Lock, CheckCircle2, Zap, Star, PlayCircle, ChevronRight, Target } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, DOMAIN_COLORS, MASTERY_COLORS, MASTERY_LABELS } from "@/lib/constants";
import Layout from "@/components/Layout";
import SmartScoreRing from "@/components/SmartScoreRing";

const DOMAIN_ICONS: Record<string, string> = {
  RL: "📖", RI: "🔬", RF: "🔤", W: "✏️", SL: "🗣️", L: "🌐",
};

type FilterType = "all" | "not_started" | "in_progress" | "mastered";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",         label: "All" },
  { id: "not_started", label: "Not Started" },
  { id: "in_progress", label: "In Progress" },
  { id: "mastered",    label: "Mastered" },
];

function MasteryStatePill({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    mastered:    "bg-emerald-100 text-emerald-700 border-emerald-200",
    proficient:  "bg-blue-100 text-blue-700 border-blue-200",
    developing:  "bg-amber-100 text-amber-700 border-amber-200",
    beginning:   "bg-orange-100 text-orange-700 border-orange-200",
    not_started: "bg-gray-100 text-gray-500 border-gray-200",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border", colorMap[level] ?? colorMap.not_started)}>
      {MASTERY_LABELS[level] ?? "Not Started"}
    </span>
  );
}

export default function SkillTree() {
  const [, setLocation] = useLocation();
  const [grade, setGrade] = useState("5th");
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [activeDomain, setActiveDomain] = useState<string | null>(null);

  const { data: tree, isLoading } = useGetSkillTree(
    { gradeLevel: grade },
    { query: { queryKey: getGetSkillTreeQueryKey({ gradeLevel: grade }) } }
  );
  const { data: masteryList } = useListMastery();
  const { data: dashboard } = useGetStudentDashboard();

  const masteryMap = useMemo(
    () => new Map(masteryList?.map((m) => [m.skillCode, m]) ?? []),
    [masteryList]
  );

  const recommendedCodes = useMemo(
    () => new Set((dashboard?.nextSkills ?? []).map((s: any) => s.skillCode)),
    [dashboard]
  );

  const domains = useMemo(() => (tree as any)?.domains ?? [], [tree]);

  // Set default active domain once tree loads
  const currentDomain = activeDomain ?? domains[0]?.domainCode ?? null;

  const domainWithStats = useMemo(() =>
    domains.map((d: any) => {
      const mastered = d.skills.filter((s: any) => masteryMap.get(s.skillCode)?.masteryLevel === "mastered").length;
      const practiced = d.skills.filter((s: any) => masteryMap.has(s.skillCode)).length;
      return { ...d, mastered, practiced };
    }),
    [domains, masteryMap]
  );

  const activeDomainData = domainWithStats.find((d: any) => d.domainCode === currentDomain);

  const filteredSkills = useMemo(() => {
    if (!activeDomainData) return [];
    return activeDomainData.skills.filter((s: any) => {
      const mastery = masteryMap.get(s.skillCode);
      const level = mastery?.masteryLevel ?? "not_started";
      const matchesSearch = !search || s.skillName.toLowerCase().includes(search.toLowerCase()) || s.skillCode.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = activeFilter === "all" ||
        (activeFilter === "not_started" && level === "not_started") ||
        (activeFilter === "in_progress" && level !== "not_started" && level !== "mastered") ||
        (activeFilter === "mastered" && level === "mastered");
      return matchesSearch && matchesFilter;
    });
  }, [activeDomainData, masteryMap, search, activeFilter]);

  const handlePractice = (skillCode: string) => {
    setLocation(`/practice?skill=${encodeURIComponent(skillCode)}`);
  };

  return (
    <Layout>
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-0.5">ELA Skill Tree</h1>
          <p className="text-sm text-muted-foreground">Track mastery across every ELA standard. Click Practice to drill any skill.</p>
        </div>

        {/* Grade + Search row */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 flex-wrap">
            {GRADE_OPTIONS.map((g) => (
              <button
                key={g}
                onClick={() => setGrade(g)}
                className={cn(
                  "px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all",
                  grade === g ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-600 hover:border-indigo-300"
                )}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}</div>
        ) : (
          <div className="flex gap-6">
            {/* Domain sidebar */}
            <div className="hidden sm:flex flex-col gap-1.5 w-44 shrink-0">
              {domainWithStats.map((d: any) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const isActive = d.domainCode === currentDomain;
                const pct = d.skills.length > 0 ? Math.round((d.mastered / d.skills.length) * 100) : 0;
                return (
                  <button
                    key={d.domainCode}
                    onClick={() => setActiveDomain(d.domainCode)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all",
                      isActive ? "bg-white shadow-sm border-indigo-200 ring-1 ring-indigo-200" : "border-transparent hover:bg-white hover:border-gray-200"
                    )}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: color }}>
                        {d.domainCode}
                      </div>
                      <span className="text-xs font-medium truncate flex-1">{d.domain}</span>
                    </div>
                    <div className="h-1 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{d.mastered}/{d.skills.length} mastered</p>
                  </button>
                );
              })}
            </div>

            {/* Mobile domain tabs */}
            <div className="sm:hidden mb-4 -mt-1 flex gap-2 overflow-x-auto pb-1 w-full">
              {domainWithStats.map((d: any) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const isActive = d.domainCode === currentDomain;
                return (
                  <button
                    key={d.domainCode}
                    onClick={() => setActiveDomain(d.domainCode)}
                    className={cn("flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border shrink-0 transition-all",
                      isActive ? "bg-white shadow-sm border-indigo-200" : "border-gray-100 bg-gray-50")}
                  >
                    <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: color }}>
                      {d.domainCode}
                    </div>
                    <span className="text-[9px] text-muted-foreground">{d.mastered}/{d.skills.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Skill grid */}
            <div className="flex-1 min-w-0">
              {activeDomainData && (
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm" style={{ backgroundColor: DOMAIN_COLORS[activeDomainData.domainCode] ?? "#6b7280" }}>
                      {DOMAIN_ICONS[activeDomainData.domainCode] ?? activeDomainData.domainCode}
                    </div>
                    <div>
                      <h2 className="font-semibold text-sm">{activeDomainData.domain}</h2>
                      <p className="text-xs text-muted-foreground">{activeDomainData.mastered} mastered · {activeDomainData.practiced} practiced · {activeDomainData.skills.length} total</p>
                    </div>
                  </div>

                  {/* Filter chips */}
                  <div className="flex gap-1 flex-wrap">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all",
                          activeFilter === f.id ? "bg-indigo-600 text-white border-indigo-600" : "border-gray-200 text-gray-500 hover:border-indigo-300")}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredSkills.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No skills match</p>
                  <p className="text-sm">Try a different filter or search term.</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDomain + grade + activeFilter}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="grid sm:grid-cols-2 gap-3"
                  >
                    {filteredSkills.map((skill: any, i: number) => {
                      const mastery = masteryMap.get(skill.skillCode);
                      const level = mastery?.masteryLevel ?? "not_started";
                      const smartScore = mastery?.smartScore ?? 0;
                      const isRecommended = recommendedCodes.has(skill.skillCode);
                      const isMastered = level === "mastered";
                      const isNotStarted = level === "not_started";

                      return (
                        <motion.div
                          key={skill.skillCode}
                          initial={{ opacity: 0, scale: 0.97 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.03 }}
                          className={cn(
                            "relative bg-white rounded-2xl border p-4 transition-all hover:shadow-md group",
                            isMastered ? "border-emerald-200 bg-emerald-50/30" :
                            isRecommended ? "border-indigo-200 ring-1 ring-indigo-100" :
                            "border-gray-200"
                          )}
                        >
                          {isRecommended && (
                            <div className="absolute -top-2 -right-2 w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center shadow-sm">
                              <Star className="w-2.5 h-2.5 text-white fill-white" />
                            </div>
                          )}

                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              {isNotStarted ? (
                                <div className="w-10 h-10 rounded-full border-2 border-dashed border-gray-200 flex items-center justify-center">
                                  <Lock className="w-4 h-4 text-gray-300" />
                                </div>
                              ) : (
                                <SmartScoreRing score={smartScore} size={40} strokeWidth={4} />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 mb-1">
                                <p className="text-sm font-medium leading-tight line-clamp-2">{skill.skillName}</p>
                                {isMastered && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />}
                              </div>

                              <div className="flex items-center gap-2 flex-wrap mb-2">
                                <span className="text-[10px] text-muted-foreground font-mono">{skill.skillCode}</span>
                                <MasteryStatePill level={level} />
                                {isRecommended && (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-medium border border-indigo-100">
                                    <Target className="w-2.5 h-2.5" /> Recommended
                                  </span>
                                )}
                              </div>

                              {mastery && (
                                <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-2">
                                  <span className="flex items-center gap-0.5"><Zap className="w-3 h-3 text-amber-400" />{mastery.practiceCount} sessions</span>
                                  <span>{Math.round(smartScore)} pts</span>
                                </div>
                              )}

                              {skill.description && (
                                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{skill.description}</p>
                              )}
                            </div>
                          </div>

                          {skill.nextSkillCodes && skill.nextSkillCodes.length > 0 && (
                            <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground">
                              <ChevronRight className="w-3 h-3" />
                              <span>Unlocks: {(skill.nextSkillCodes as string[]).slice(0, 3).join(", ")}</span>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={() => handlePractice(skill.skillCode)}
                              className={cn(
                                "h-7 text-xs gap-1.5 flex-1",
                                isMastered
                                  ? "bg-emerald-600 hover:bg-emerald-700"
                                  : isRecommended
                                    ? "bg-indigo-600 hover:bg-indigo-700"
                                    : "bg-gray-800 hover:bg-gray-900"
                              )}
                            >
                              <PlayCircle className="w-3 h-3" />
                              {isMastered ? "Review" : isNotStarted ? "Start" : "Practice"}
                            </Button>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
