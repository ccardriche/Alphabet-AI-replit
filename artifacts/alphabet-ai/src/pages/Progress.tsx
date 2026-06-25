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
import { TrendingUp, Award, Target, Zap, GraduationCap, CheckCircle2, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Layout from "@/components/Layout";
import { DOMAIN_COLORS } from "@/lib/constants";

const GRADE_ORDER = ["K","1st","2nd","3rd","4th","5th","6th","7th","8th"];

function gradeGapMessage(enrolled: string, diagnosed: string | null | undefined): { text: string; positive: boolean } {
  if (!diagnosed || diagnosed === enrolled) {
    return { text: "OPERATING AT REQUIRED LEVEL", positive: true };
  }
  const eIdx = GRADE_ORDER.indexOf(enrolled);
  const dIdx = GRADE_ORDER.indexOf(diagnosed);
  if (dIdx === -1 || eIdx === -1) return { text: "CALIBRATING LEVEL...", positive: true };
  if (dIdx >= eIdx) return { text: "PERFORMANCE EXCEEDS REQUIREMENTS", positive: true };
  const gap = eIdx - dIdx;
  return {
    text: `LEVEL GAP DETECTED: ${gap} STAGE${gap > 1 ? "S" : ""}. CLOSING GAP.`,
    positive: false,
  };
}

const containerVars = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVars = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
} as const;

export default function Progress() {
  const { data: progress, isLoading: progressLoading } = useGetStudentProgress();
  const { data: analytics } = useGetStudentAnalytics();
  const { data: summary } = useGetMasterySummary();
  const { data: dashboard } = useGetStudentDashboard();
  const { data: weeklyXpData } = useGetWeeklyXp();
  const { data: masteryEvents } = useGetMasteryTimeline();

  if (progressLoading) return (
    <Layout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 rounded-3xl bg-muted/50" />)}
      </div>
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
      <motion.div 
        className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto space-y-6 lg:space-y-8 pb-24"
        variants={containerVars}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVars}>
          <h1 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight text-foreground mb-1">Performance Matrix</h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Analyze tactical growth and sector dominance.</p>
        </motion.div>

        {/* Summary cards */}
        <motion.div variants={containerVars} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "DIRECTIVES SECURED", value: summary?.masteredSkills ?? 0, icon: Award, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
            { label: "TOTAL DIRECTIVES", value: summary?.totalSkills ?? 0, icon: Target, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
            { label: "AVG EFFICIENCY", value: Math.round(summary?.overallSmartScore ?? 0), icon: TrendingUp, color: "text-primary", bg: "bg-primary/10", border: "border-primary/30" },
            { label: "GROWTH TRAJECTORY", value: analytics?.onTrack ? "OPTIMAL" : "NEEDS FOCUS", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/30", isText: true },
          ].map(({ label, value, icon: Icon, color, bg, border, isText }) => (
            <motion.div key={label} variants={itemVars}>
              <div className={`hud-card rounded-2xl p-5 border-2 ${border} flex flex-col h-full relative overflow-hidden group`}>
                <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${bg} blur-2xl group-hover:scale-150 transition-transform duration-700`} />
                <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center mb-4 relative z-10 border border-white/5`}>
                  <Icon className={`w-5 h-5 ${color}`} />
                </div>
                <p className={`font-heading font-black mt-auto relative z-10 ${isText ? "text-xl leading-tight" : "text-3xl lg:text-4xl"} text-foreground`}>{value}</p>
                <p className="text-[10px] font-bold text-muted-foreground mt-1 uppercase tracking-widest relative z-10">{label}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Weekly XP Chart */}
          <motion.div variants={itemVars}>
            <div className="hud-card rounded-3xl h-full flex flex-col">
              <div className="p-5 border-b border-border/50 bg-muted/20 flex items-center justify-between">
                <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" /> Energy Output (7 Days)
                </h3>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center">
                {weeklyXpData && weeklyXpData.some((d) => d.xp > 0) ? (
                  <div className="h-[220px] w-full mt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyXpData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" vertical={false} />
                        <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} dy={10} />
                        <YAxis hide />
                        <Tooltip
                          cursor={{ fill: 'rgba(139,92,246,0.1)' }}
                          contentStyle={{ fontSize: 12, fontWeight: 800, borderRadius: 12, border: "2px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-foreground)", textTransform: "uppercase" }}
                          formatter={(v: any) => [`${v} XP`, "ENERGY YIELD"]}
                        />
                        <Bar dataKey="xp" fill="url(#xpGradient)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                        <defs>
                          <linearGradient id="xpGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="var(--color-primary)" />
                            <stop offset="100%" stopColor="#a855f7" />
                          </linearGradient>
                        </defs>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Zap className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No Energy Data</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Initiate missions to generate output.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Domain Radar Chart */}
          <motion.div variants={itemVars}>
            <div className="hud-card rounded-3xl h-full flex flex-col relative overflow-hidden">
              <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-20 pointer-events-none" />
              <div className="p-5 border-b border-border/50 bg-muted/20 relative z-10 flex items-center justify-between">
                <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                  <Target className="w-5 h-5 text-blue-500" /> Sector Analysis
                </h3>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-center relative z-10">
                {radarData.length > 0 ? (
                  <div className="h-[240px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 10, right: 30, left: 30, bottom: 10 }}>
                        <PolarGrid stroke="currentColor" className="text-border/60" />
                        <PolarAngleAxis dataKey="domain" tick={{ fontSize: 11, fontWeight: 900, fill: "currentColor" }} className="text-foreground" />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar
                          name="Efficiency"
                          dataKey="score"
                          stroke="var(--color-primary)"
                          fill="var(--color-primary)"
                          fillOpacity={0.3}
                          strokeWidth={3}
                        />
                        <Tooltip
                          contentStyle={{ fontSize: 12, fontWeight: 800, borderRadius: 12, border: "2px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-foreground)", textTransform: "uppercase" }}
                          formatter={(v: any) => [`${Math.round(v)} PTS`, "EFFICIENCY RATING"]}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-10">
                    <Target className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Awaiting Calibration</p>
                    <p className="text-xs font-medium text-muted-foreground mt-1">Complete placement scan to view sector analysis.</p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Skill Journey Chart */}
        {masteryEvents && masteryEvents.length > 0 && (() => {
          const masteredLine = masteryEvents
            .filter((e) => e.masteredCount !== undefined)
            .map((e) => ({ date: e.date, masteredCount: e.masteredCount! }));

          const LEVEL_RANK: Record<string, number> = {
            not_started: 0, introduced: 1, practicing: 2, approaching: 3, mastered: 4,
          };
          const LEVEL_LABELS: Record<string, string> = {
            not_started: "LOCKED", introduced: "INITIATED",
            practicing: "ACTIVE", approaching: "CRITICAL", mastered: "SECURED",
          };
          const LEVEL_COLORS: Record<string, string> = {
            not_started: "#6b7280", introduced: "#fbbf24", practicing: "#3b82f6",
            approaching: "#10b981", mastered: "#8b5cf6",
          };

          const recent = [...masteryEvents].slice(-10).reverse();

          return (
            <motion.div variants={itemVars}>
              <div className="hud-card rounded-3xl overflow-hidden">
                <div className="p-5 border-b border-border/50 bg-muted/20">
                  <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" /> Operational Timeline
                  </h3>
                </div>
                <div className="p-6 md:p-8 flex flex-col lg:flex-row gap-8 lg:gap-12">
                  
                  {masteredLine.length > 0 && (
                    <div className="flex-[3]">
                      <div className="flex items-center justify-between mb-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Total Directives Secured Over Time</p>
                      </div>
                      <div className="h-[240px] w-full bg-card rounded-2xl border-2 border-border p-4 shadow-inner">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={masteredLine} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border/40" vertical={false} />
                            <XAxis dataKey="date" tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} dy={10} />
                            <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: "currentColor" }} className="text-muted-foreground" tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                              contentStyle={{ fontSize: 12, fontWeight: 800, borderRadius: 12, border: "2px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-foreground)", textTransform: "uppercase" }}
                              formatter={(v: any) => [`${v} DIRECTIVE${v !== 1 ? "S" : ""}`, "SECURED"]}
                            />
                            <Line
                              type="stepAfter"
                              dataKey="masteredCount"
                              stroke="var(--color-primary)"
                              strokeWidth={4}
                              dot={{ r: 4, fill: "var(--color-background)", stroke: "var(--color-primary)", strokeWidth: 2 }}
                              activeDot={{ r: 7, fill: "var(--color-primary)", stroke: "var(--color-background)", strokeWidth: 2 }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  <div className="flex-[2] flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Recent Log Entries</p>
                    </div>
                    <div className="space-y-3 flex-1 overflow-y-auto max-h-[260px] pr-2 scrollbar-thin">
                      {recent.map((e, i) => {
                        const fromColor = LEVEL_COLORS[e.fromLevel] ?? "#6b7280";
                        const toColor = LEVEL_COLORS[e.toLevel] ?? "#8b5cf6";
                        const isPromotion = (LEVEL_RANK[e.toLevel] ?? 0) > (LEVEL_RANK[e.fromLevel] ?? 0);
                        return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-card border-2 border-border gap-2">
                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest shrink-0 w-12">{e.date}</span>
                              <span className="text-xs font-bold text-foreground leading-tight truncate">{e.skillName}</span>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-15 sm:ml-2">
                              <span
                                className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider"
                                style={{ backgroundColor: `${fromColor}15`, color: fromColor, borderColor: `${fromColor}40` }}
                              >
                                {LEVEL_LABELS[e.fromLevel] ?? e.fromLevel}
                              </span>
                              <span className={`text-[10px] font-black ${isPromotion ? "text-emerald-500" : "text-amber-500"}`}>
                                {isPromotion ? "→" : "↓"}
                              </span>
                              <span
                                className="text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-wider"
                                style={{ backgroundColor: `${toColor}15`, color: toColor, borderColor: `${toColor}40` }}
                              >
                                {LEVEL_LABELS[e.toLevel] ?? e.toLevel}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })()}

        <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Domain Breakdown */}
          {summary?.domains && summary.domains.length > 0 && (
            <motion.div variants={itemVars}>
              <div className="hud-card rounded-3xl h-full flex flex-col">
                <div className="p-5 border-b border-border/50 bg-muted/20">
                  <h3 className="font-heading font-black text-lg uppercase tracking-wide flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary" /> Sector Status
                  </h3>
                </div>
                <div className="p-6 space-y-5 flex-1 flex flex-col justify-center">
                  {summary.domains.map((d) => {
                    const color = DOMAIN_COLORS[d.domainCode] ?? "#6b7280";
                    const pct = d.totalSkills > 0 ? Math.round((d.masteredSkills / d.totalSkills) * 100) : 0;
                    return (
                      <div key={d.domainCode} className="group">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm" style={{ backgroundColor: color }}>
                               <span className="text-[10px] font-black uppercase">{d.domainCode}</span>
                            </div>
                            <div>
                               <span className="text-xs font-bold text-foreground uppercase tracking-widest">{d.domain}</span>
                               <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">EFFICIENCY: <span className="text-foreground">{Math.round(d.avgSmartScore)} PTS</span></p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-black uppercase tracking-widest" style={{ color }}>{pct}% SECURED</span>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-0.5">{d.masteredSkills}/{d.totalSkills} DIRECTIVES</p>
                          </div>
                        </div>
                        <div className="h-3 rounded-full bg-muted overflow-hidden border border-border/50 shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                            className="h-full rounded-full relative"
                            style={{ backgroundColor: color }}
                          >
                             <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                          </motion.div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Grade Progress */}
          {gp && (
            <motion.div variants={itemVars}>
              <div className="hud-card rounded-3xl h-full flex flex-col">
                <div className="p-5 border-b border-border/50 bg-muted/20">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-indigo-500" />
                    <h3 className="font-heading font-black text-lg uppercase tracking-wide">Level Advancement</h3>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col space-y-6 justify-center relative overflow-hidden">
                   <div className="absolute right-0 bottom-0 w-48 h-48 bg-indigo-500/5 rounded-tl-full pointer-events-none" />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 relative z-10">
                    {[
                      { label: "TARGET LEVEL", value: gp.enrolledGrade, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
                      { label: "INITIAL SCAN", value: gp.diagnosedGrade ?? "PENDING", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/30" },
                      { label: "CURRENT STATUS", value: gp.currentEstimatedGrade ?? "PENDING", color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
                    ].map(({ label, value, color, bg, border }) => (
                      <div key={label} className={`${bg} border-2 ${border} rounded-2xl p-5 text-center shadow-sm flex flex-col justify-center`}>
                        <p className={`text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2`}>{label}</p>
                        <p className={`text-3xl font-heading font-black uppercase ${color}`}>{value}</p>
                      </div>
                    ))}
                  </div>
                  {gradeMsg && (
                    <div className={`flex items-center gap-3 rounded-2xl border-2 px-5 py-4 relative z-10 shadow-sm ${
                      gradeMsg.positive ? "bg-emerald-500/10 border-emerald-500/30" : "bg-amber-500/10 border-amber-500/30"
                    }`}>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                         gradeMsg.positive ? "bg-emerald-500 text-white" : "bg-amber-500 text-white"
                      }`}>
                         {gradeMsg.positive ? <CheckCircle2 className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                      </div>
                      <div>
                         <p className={`text-xs font-black uppercase tracking-widest ${gradeMsg.positive ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"} mb-0.5`}>System Status</p>
                         <p className="text-sm font-bold text-foreground leading-tight">{gradeMsg.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
