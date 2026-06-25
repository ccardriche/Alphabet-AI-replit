import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetSkillTree,
  useListMastery,
  useGetStudentDashboard,
  getGetSkillTreeQueryKey,
} from "@workspace/api-client-react";
import { Search, Lock, CheckCircle2, Zap, Star, PlayCircle, ChevronRight, Target, BookOpen, Microscope, Type, PenTool, Mic, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, DOMAIN_COLORS, MASTERY_COLORS, MASTERY_LABELS } from "@/lib/constants";
import Layout from "@/components/Layout";
import SmartScoreRing from "@/components/SmartScoreRing";

const DOMAIN_ICONS: Record<string, React.ElementType> = {
  RL: BookOpen, RI: Microscope, RF: Type, W: PenTool, SL: Mic, L: Globe,
};

type FilterType = "all" | "not_started" | "in_progress" | "mastered";

const FILTERS: { id: FilterType; label: string }[] = [
  { id: "all",         label: "ALL" },
  { id: "not_started", label: "LOCKED / NEW" },
  { id: "in_progress", label: "ACTIVE" },
  { id: "mastered",    label: "MASTERED" },
];

function MasteryStatePill({ level }: { level: string }) {
  const colorMap: Record<string, string> = {
    mastered:    "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    proficient:  "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    developing:  "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    beginning:   "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
    not_started: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border shadow-sm", colorMap[level] ?? colorMap.not_started)}>
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
      <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col h-full min-h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight text-foreground">Sector Map</h1>
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest mt-1">Review operational objectives across all networks.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search directives..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card border-2 border-border font-bold rounded-xl h-10 shadow-sm focus-visible:ring-primary focus-visible:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Grade Selector */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {GRADE_OPTIONS.map((g) => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all bouncy-hover shrink-0",
                grade === g ? "game-gradient text-white border-transparent shadow-[0_4px_15px_rgba(139,92,246,0.3)]" : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground bg-card shadow-sm"
              )}
            >
              LVL {g}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-2xl bg-muted/50" />)}</div>
        ) : (
          <div className="flex flex-col md:flex-row gap-6 lg:gap-8 flex-1">
            {/* Domain sidebar */}
            <div className="hidden md:flex flex-col gap-3 w-56 shrink-0">
              {domainWithStats.map((d: any) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const isActive = d.domainCode === currentDomain;
                const pct = d.skills.length > 0 ? Math.round((d.mastered / d.skills.length) * 100) : 0;
                const Icon = DOMAIN_ICONS[d.domainCode] ?? Target;
                return (
                  <button
                    key={d.domainCode}
                    onClick={() => setActiveDomain(d.domainCode)}
                    className={cn(
                      "w-full text-left p-4 rounded-2xl border-2 transition-all bouncy-hover overflow-hidden relative group",
                      isActive ? "bg-primary/5 border-primary shadow-[0_4px_20px_rgba(139,92,246,0.15)]" : "border-border hover:border-primary/50 hover:bg-muted/50 bg-card"
                    )}
                  >
                    {isActive && <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-md" style={{ backgroundColor: color }} />}
                    <div className="flex items-center gap-3 mb-3 relative z-10">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm" style={{ backgroundColor: color }}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <span className="text-xs font-black uppercase tracking-wider truncate block">{d.domainCode}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mt-0.5 truncate">{d.domain}</span>
                      </div>
                    </div>
                    <div className="h-2.5 bg-muted rounded-full overflow-hidden shadow-inner border border-border/50 relative z-10">
                      <div className="h-full rounded-full transition-all duration-700 relative" style={{ width: `${pct}%`, backgroundColor: color }}>
                         <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                      </div>
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground mt-2 uppercase tracking-widest text-right relative z-10">{d.mastered}/{d.skills.length} SECURED</p>
                  </button>
                );
              })}
            </div>

            {/* Mobile domain tabs */}
            <div className="md:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none">
              {domainWithStats.map((d: any) => {
                const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                const isActive = d.domainCode === currentDomain;
                const Icon = DOMAIN_ICONS[d.domainCode] ?? Target;
                return (
                  <button
                    key={d.domainCode}
                    onClick={() => setActiveDomain(d.domainCode)}
                    className={cn("flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 shrink-0 transition-all bouncy-hover min-w-[80px]",
                      isActive ? "bg-primary/10 border-primary shadow-sm" : "border-border bg-card hover:bg-muted")}
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider">{d.domainCode}</span>
                    <span className="text-[9px] font-bold text-muted-foreground">{d.mastered}/{d.skills.length}</span>
                  </button>
                );
              })}
            </div>

            {/* Skill grid */}
            <div className="flex-1 min-w-0">
              {activeDomainData && (
                <div className="mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card border-2 border-border p-4 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: DOMAIN_COLORS[activeDomainData.domainCode] ?? "#6b7280" }}>
                      {DOMAIN_ICONS[activeDomainData.domainCode] ? (() => { const I = DOMAIN_ICONS[activeDomainData.domainCode]; return <I className="w-6 h-6" />; })() : activeDomainData.domainCode}
                    </div>
                    <div>
                      <h2 className="font-heading font-black uppercase tracking-wide text-lg text-foreground">{activeDomainData.domain}</h2>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">
                        {activeDomainData.mastered} SECURED · {activeDomainData.practiced} ACTIVE · {activeDomainData.skills.length} TOTAL
                      </p>
                    </div>
                  </div>

                  {/* Filter chips */}
                  <div className="flex gap-2 flex-wrap">
                    {FILTERS.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilter(f.id)}
                        className={cn("px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border-2 transition-all bouncy-hover",
                          activeFilter === f.id ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground hover:border-foreground hover:text-foreground bg-muted/50")}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {filteredSkills.length === 0 ? (
                <div className="hud-card rounded-3xl p-12 text-center flex flex-col items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                    <Search className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-xl font-heading font-black uppercase tracking-wide text-foreground mb-2">No Directives Found</p>
                  <p className="text-sm font-medium text-muted-foreground">Adjust your filters or search parameters to locate targets.</p>
                </div>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentDomain + grade + activeFilter}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="grid sm:grid-cols-2 xl:grid-cols-2 gap-4 pb-8"
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
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: i * 0.04, type: "spring", stiffness: 300, damping: 25 }}
                          className={cn(
                            "relative hud-card rounded-2xl border-2 p-5 transition-all group overflow-hidden flex flex-col h-full",
                            isMastered ? "border-emerald-500/50 bg-emerald-500/5 hover:border-emerald-500" :
                            isRecommended ? "border-primary/50 bg-primary/5 hover:border-primary shadow-[0_0_15px_rgba(139,92,246,0.1)]" :
                            "border-border hover:border-foreground/30 hover:bg-muted/30"
                          )}
                        >
                          {isRecommended && !isMastered && (
                            <div className="absolute top-0 right-0">
                               <div className="bg-primary text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                  <Target className="w-3 h-3" /> Priority
                               </div>
                            </div>
                          )}
                          {isMastered && (
                             <div className="absolute top-0 right-0">
                               <div className="bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-sm">
                                  <CheckCircle2 className="w-3 h-3" /> Secured
                               </div>
                            </div>
                          )}

                          <div className="flex items-start gap-4 mb-4">
                            <div className="shrink-0 mt-1">
                              {isNotStarted ? (
                                <div className="w-12 h-12 rounded-xl border-2 border-dashed border-muted-foreground/30 bg-muted/20 flex items-center justify-center">
                                  <Lock className="w-5 h-5 text-muted-foreground/50" />
                                </div>
                              ) : (
                                <div className="bg-card rounded-full p-1 shadow-sm border border-border">
                                  <SmartScoreRing score={smartScore} size={48} strokeWidth={5} />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 min-w-0 pr-8">
                              <p className="text-sm md:text-base font-bold leading-tight text-foreground mb-2 line-clamp-2">{skill.skillName}</p>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="text-[10px] text-muted-foreground font-black bg-muted px-2 py-0.5 rounded-md border border-border">{skill.skillCode}</span>
                                <MasteryStatePill level={level} />
                              </div>
                            </div>
                          </div>

                          <div className="flex-1">
                            {skill.description && (
                              <p className="text-xs font-medium text-muted-foreground line-clamp-2 mb-4 leading-relaxed">{skill.description}</p>
                            )}
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-border/50">
                            <div className="flex items-center justify-between mb-4">
                              {mastery ? (
                                <div className="flex items-center gap-4 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                  <span className="flex items-center gap-1.5"><Zap className="w-3.5 h-3.5 text-amber-500" />{mastery.practiceCount} RUNS</span>
                                  <span className="flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-primary" />{Math.round(smartScore)} PTS</span>
                                </div>
                              ) : (
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">NO DATA COMPILED</span>
                              )}
                            </div>

                            <Button
                              onClick={() => handlePractice(skill.skillCode)}
                              className={cn(
                                "w-full h-12 text-sm font-black uppercase tracking-widest gap-2 rounded-xl bouncy-hover border-b-[4px]",
                                isMastered
                                  ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-700"
                                  : isRecommended
                                    ? "game-gradient text-white border-black/20"
                                    : "bg-foreground hover:bg-foreground/90 text-background border-foreground/50 dark:border-background/50"
                              )}
                            >
                              {isMastered ? <><CheckCircle2 className="w-4 h-4" /> REVIEW DIRECTIVE</> 
                               : isNotStarted ? <><PlayCircle className="w-4 h-4" /> INITIATE</> 
                               : <><PlayCircle className="w-4 h-4" /> CONTINUE RUN</>}
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
