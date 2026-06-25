import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetReteachingSkills,
  useGenerateReteachLesson,
  useCompleteReteaching,
  useGetStudentProfile,
  getGetReteachingSkillsQueryKey,
} from "@workspace/api-client-react";
import type { ReteachingSkill, ReteachLesson, ReteachQuestion } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle,
  XCircle,
  Trophy,
  Sparkles,
  ChevronRight,
  RefreshCcw,
  PartyPopper,
  PenTool,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";
import SmartScoreRing from "@/components/SmartScoreRing";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const DOMAIN_LABELS: Record<string, string> = {
  RL: "Reading: Literature",
  RI: "Reading: Informational",
  RF: "Reading: Foundational",
  W: "Writing",
  SL: "Speaking & Listening",
  L: "Language",
};

const DOMAIN_COLORS: Record<string, string> = {
  RL: "#6366f1",
  RI: "#0ea5e9",
  RF: "#10b981",
  W: "#f59e0b",
  SL: "#ec4899",
  L: "#8b5cf6",
};

// ─── Sparkline ────────────────────────────────────────────────────────────────
function ScoreSparkline({ scores, color }: { scores: number[]; color: string }) {
  if (scores.length < 2) return null;
  const data = scores.map((v, i) => ({ i, v }));
  return (
    <div className="w-16 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line type="stepAfter" dataKey="v" stroke={color} strokeWidth={2.5} dot={{ r: 2, fill: "var(--color-card)", stroke: color, strokeWidth: 1.5 }} />
          <Tooltip contentStyle={{ display: "none" }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Question card (shared by guided + check phases) ─────────────────────────
type QuestionPhase = "active" | "feedback";

function QuestionCard({
  q,
  phaseLabel,
  progressLabel,
  onCorrect,
  onIncorrect,
}: {
  q: ReteachQuestion;
  phaseLabel: string;
  progressLabel: string;
  onCorrect: () => void;
  onIncorrect: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [questionPhase, setQuestionPhase] = useState<QuestionPhase>("active");
  const isCorrect = selected === q.correctOptionId;

  function handleSubmit() {
    if (!selected) return;
    setQuestionPhase("feedback");
  }

  function handleNext() {
    if (isCorrect) onCorrect();
    else onIncorrect();
  }

  return (
    <div className="hud-card rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-primary/20 text-primary border border-primary/30">
          {phaseLabel}
        </span>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{progressLabel}</span>
      </div>

      <h2 className="text-lg md:text-xl font-bold leading-relaxed mb-6 text-foreground">{q.questionText}</h2>

      <div className="space-y-3">
        {q.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrectOpt = opt.id === q.correctOptionId;
          let cls = "border-border hover:border-primary/50 hover:bg-muted/50";
          if (questionPhase === "feedback") {
            if (isCorrectOpt) cls = "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
            else if (isSelected) cls = "border-destructive bg-destructive/10 text-destructive";
          } else if (isSelected) {
            cls = "border-primary bg-primary/10 text-foreground shadow-[0_0_15px_rgba(139,92,246,0.15)]";
          }
          return (
            <button
              key={opt.id}
              onClick={() => questionPhase === "active" && setSelected(opt.id)}
              disabled={questionPhase === "feedback"}
              className={cn(
                "w-full text-left px-5 py-4 rounded-xl border-2 text-sm font-bold transition-all bouncy-hover",
                cls,
              )}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {questionPhase === "feedback" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6">
          <div className={cn("flex items-start gap-3 p-4 rounded-xl text-sm font-medium mb-6 border-2", 
            isCorrect ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30" : "bg-destructive/10 text-destructive border-destructive/30"
          )}>
            {isCorrect ? <CheckCircle className="w-5 h-5 shrink-0" /> : <XCircle className="w-5 h-5 shrink-0" />}
            <span className="leading-relaxed">{q.explanation}</span>
          </div>
          <Button onClick={handleNext} className="w-full h-14 game-gradient text-white font-black uppercase tracking-widest rounded-xl bouncy-hover border-b-[4px] border-black/20 shadow-xl">
            CONTINUE MISSION <ChevronRight className="w-5 h-5 ml-1" />
          </Button>
        </motion.div>
      )}

      {questionPhase === "active" && (
        <Button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full mt-6 h-14 bg-foreground text-background font-black uppercase tracking-widest rounded-xl bouncy-hover border-b-[4px] border-foreground/50 shadow-lg"
        >
          VERIFY ANSWER
        </Button>
      )}
    </div>
  );
}

// ─── ReteachSession — 3-phase micro-lesson ────────────────────────────────────
type SessionPhase = "explain" | "guided1" | "guided2" | "check" | "complete";

function ReteachSession({
  skill,
  gradeLevel,
  interests,
  onClose,
}: {
  skill: ReteachingSkill;
  gradeLevel: string;
  interests: string[];
  onClose: () => void;
}) {
  const [phase, setPhase] = useState<SessionPhase>("explain");
  const [correctCount, setCorrectCount] = useState(0);
  const [lesson, setLesson] = useState<ReteachLesson | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [completeError, setCompleteError] = useState(false);

  const generateLesson = useGenerateReteachLesson();
  const completeReteaching = useCompleteReteaching();
  const queryClient = useQueryClient();

  async function handleStartLesson() {
    setIsLoading(true);
    setLoadError(false);
    try {
      const result = await generateLesson.mutateAsync({
        data: {
          skillCode: skill.skillCode,
          skillName: skill.skillName,
          gradeLevel,
          interests,
          consecutiveErrors: skill.consecutiveErrors,
        },
      });
      setLesson(result);
      setPhase("explain");
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleComplete(finalCorrectCount: number) {
    const total = 3;
    setCorrectCount(finalCorrectCount);
    setCompleteError(false);
    try {
      await completeReteaching.mutateAsync({
        skillCode: skill.skillCode,
        data: { correctCount: finalCorrectCount, totalCount: total },
      });
      queryClient.invalidateQueries({ queryKey: getGetReteachingSkillsQueryKey() });
      setPhase("complete");
    } catch {
      setCompleteError(true);
    }
  }

  function handleGuided1Correct() { setCorrectCount((c) => c + 1); setPhase("guided2"); }
  function handleGuided1Incorrect() { setPhase("guided2"); }
  function handleGuided2Correct() { setCorrectCount((c) => c + 1); setPhase("check"); }
  function handleGuided2Incorrect() { setPhase("check"); }
  function handleCheckCorrect() { handleComplete(correctCount + 1); }
  function handleCheckIncorrect() { handleComplete(correctCount); }

  const passed = correctCount >= 2;

  // ── Loading state ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-4 py-12 text-center flex flex-col items-center">
        <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-primary uppercase tracking-widest animate-pulse">GENERATING TACTICAL PROTOCOL...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-12 text-center hud-card rounded-3xl">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-destructive" />
        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest mb-6">Failed to initialize protocol.</p>
        <Button onClick={handleStartLesson} variant="outline" className="font-black uppercase tracking-widest border-2 bouncy-hover h-12 px-8">RETRY INITIALIZATION</Button>
      </div>
    );
  }

  // ── Not yet started ────────────────────────────────────────────────────────
  if (!lesson) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
        <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-20 pointer-events-none" />
          <div className="relative z-10">
            <div className="w-20 h-20 rounded-3xl game-gradient flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/20">
              <BookOpen className="w-10 h-10 text-white" />
            </div>
            <h2 className="text-2xl md:text-3xl font-heading font-black uppercase text-foreground mb-2">Tactical Review</h2>
            <p className="text-sm font-bold text-primary uppercase tracking-widest mb-8">{skill.skillName}</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-8 mt-4 mb-8">
              {[
                { label: "ANALYZE", icon: BookOpen },
                { label: "EXECUTE", icon: PenTool },
                { label: "VERIFY", icon: CheckCircle },
              ].map(({ label, icon: Icon }) => (
                <div key={label} className="text-center bg-card border-2 border-border rounded-xl p-4 shadow-sm flex flex-col items-center">
                  <Icon className="w-6 h-6 text-foreground mb-2" />
                  <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{label}</p>
                </div>
              ))}
            </div>
            
            <p className="text-xs font-medium text-muted-foreground mb-8 max-w-sm mx-auto leading-relaxed">
              Target lock required. Complete 3 phases with 2/3 accuracy to clear intervention flag.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-4">
              <Button variant="outline" onClick={onClose} className="w-full sm:w-auto h-14 font-black uppercase tracking-widest text-xs border-2 border-border gap-2 bouncy-hover">
                ABORT
              </Button>
              <Button onClick={handleStartLesson} className="flex-1 h-14 game-gradient text-white font-black uppercase tracking-widest text-sm rounded-xl bouncy-hover border-b-[4px] border-black/20 shadow-xl" data-testid="btn-start-reteach">
                <Sparkles className="w-5 h-5 mr-2 fill-white" /> INITIATE PROTOCOL
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Progress bar (phases 1–3 of 3) ────────────────────────────────────────
  const phaseIndex = { explain: 0, guided1: 1, guided2: 1, check: 2, complete: 3 }[phase];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {phase !== "complete" && (
        <div className="flex items-center gap-4 bg-card border-2 border-border p-3 rounded-2xl shadow-sm">
          <div className="flex gap-2 flex-1">
            {["Analyze", "Execute", "Verify"].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "h-2 rounded-full flex-1 transition-all duration-500",
                  i < phaseIndex ? "bg-primary" : i === phaseIndex ? "game-gradient shadow-[0_0_10px_rgba(139,92,246,0.5)]" : "bg-muted",
                )}
              />
            ))}
          </div>
          <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest w-16 text-right">
            {["PHASE 1", "PHASE 2", "PHASE 2", "PHASE 3", "DONE"][phaseIndex]}
          </span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Explain phase ── */}
        {phase === "explain" && (
          <motion.div key="explain" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="hud-card rounded-3xl p-6 md:p-8">
              <div className="flex items-center gap-3 mb-6">
                <span className="px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest bg-blue-500/20 text-blue-500 border border-blue-500/30">
                  TACTICAL BRIEFING
                </span>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{lesson.skillName}</span>
              </div>
              <h2 className="text-xl md:text-2xl font-heading font-black uppercase tracking-tight mb-4 text-foreground">Alternate Perspective</h2>
              <div className="bg-muted border-2 border-border rounded-2xl p-6 text-sm md:text-base text-foreground leading-relaxed font-medium mb-8 shadow-inner">
                {lesson.explanation}
              </div>
              <Button
                onClick={() => setPhase("guided1")}
                className="w-full h-14 game-gradient text-white font-black uppercase tracking-widest rounded-xl bouncy-hover border-b-[4px] border-black/20 shadow-xl"
                data-testid="btn-reteach-continue-explain"
              >
                PROCEED TO EXECUTION <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Guided question 1 ── */}
        {phase === "guided1" && (
          <motion.div key="guided1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              q={lesson.guidedQuestions[0]}
              phaseLabel="GUIDED EXECUTION"
              progressLabel="TARGET 1 OF 2"
              onCorrect={handleGuided1Correct}
              onIncorrect={handleGuided1Incorrect}
            />
          </motion.div>
        )}

        {/* ── Guided question 2 ── */}
        {phase === "guided2" && (
          <motion.div key="guided2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              q={lesson.guidedQuestions[1]}
              phaseLabel="GUIDED EXECUTION"
              progressLabel="TARGET 2 OF 2"
              onCorrect={handleGuided2Correct}
              onIncorrect={handleGuided2Incorrect}
            />
          </motion.div>
        )}

        {/* ── Check for understanding ── */}
        {phase === "check" && (
          <motion.div key="check" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              q={lesson.checkQuestion}
              phaseLabel="VERIFICATION SCAN"
              progressLabel="FINAL TARGET"
              onCorrect={handleCheckCorrect}
              onIncorrect={handleCheckIncorrect}
            />
          </motion.div>
        )}

        {/* ── Complete ── */}
        {phase === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
               <div className={cn("absolute inset-0 pattern-grid-lg opacity-20 pointer-events-none", passed ? "bg-emerald-500/5" : "bg-amber-500/5")} />
              
               <div className="relative z-10">
                <div className={cn("w-20 h-20 rounded-3xl border-2 flex items-center justify-center mx-auto mb-6 shadow-inner", 
                  passed ? "bg-emerald-500/20 border-emerald-500/30" : "bg-amber-500/20 border-amber-500/30"
                )}>
                  {passed ? <Trophy className="w-10 h-10 text-emerald-500" /> : <RefreshCcw className="w-10 h-10 text-amber-500" />}
                </div>
                
                <h2 className="text-3xl font-heading font-black uppercase tracking-tight mb-2 text-foreground">
                  {passed ? "PROTOCOL SECURED" : "PROTOCOL INCOMPLETE"}
                </h2>
                
                <p className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded border inline-block mb-6 bg-muted">
                  SCORE: <span className={passed ? "text-emerald-500" : "text-amber-500"}>{correctCount}/3</span>
                </p>
                
                <p className="text-sm font-medium text-muted-foreground mb-8 max-w-sm mx-auto">
                  {passed
                    ? `You've demonstrated sufficient proficiency in "${skill.skillName}". Flag cleared.`
                    : `Additional reinforcement required for "${skill.skillName}". Continue operations.`}
                </p>
                
                {completeError && (
                  <div className="flex items-center gap-3 p-4 mb-6 rounded-xl bg-destructive/10 border-2 border-destructive/30 text-xs font-black uppercase tracking-widest text-destructive text-left">
                    <AlertTriangle className="w-5 h-5 shrink-0" />
                    <span>Communication failure. System unable to log results.</span>
                  </div>
                )}
                
                <Button onClick={onClose} className={cn("w-full h-14 font-black uppercase tracking-widest rounded-xl bouncy-hover border-b-[4px] text-white shadow-xl",
                  passed ? "bg-emerald-500 hover:bg-emerald-600 border-emerald-700" : "game-gradient border-black/20"
                )}>
                  {passed ? "RETURN TO MISSION HUB" : "ACKNOWLEDGE & RETURN"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Intervention Page ────────────────────────────────────────────────────────
export default function Intervention() {
  const [, setLocation] = useLocation();
  const [activeSkill, setActiveSkill] = useState<ReteachingSkill | null>(null);
  const { data: groups, isLoading } = useGetReteachingSkills();
  const { data: profile } = useGetStudentProfile();

  const gradeLevel = (profile as any)?.grade ?? "5th";
  const interests: string[] = (profile as any)?.interests ?? [];

  if (isLoading) {
    return (
      <Layout>
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col h-full min-h-[calc(100vh-4rem)]">
           <div className="mb-8">
            <Skeleton className="h-10 w-64 rounded-xl bg-muted/50 mb-2" />
            <Skeleton className="h-4 w-48 rounded-md bg-muted/50" />
          </div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-3xl bg-muted/50" />)}
          </div>
        </div>
      </Layout>
    );
  }

  // Active reteach session view
  if (activeSkill) {
    return (
      <Layout>
        <div className="p-4 md:p-6 lg:p-8 max-w-3xl mx-auto flex flex-col h-full min-h-[calc(100vh-4rem)]">
          <button
            onClick={() => setActiveSkill(null)}
            className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground mb-8 transition-colors bg-card border-2 border-border px-4 py-2 rounded-lg self-start bouncy-hover"
            data-testid="btn-reteach-back"
          >
            <ChevronRight className="w-4 h-4 rotate-180" /> ABORT PROTOCOL
          </button>
          <ReteachSession
            skill={activeSkill}
            gradeLevel={gradeLevel}
            interests={interests}
            onClose={() => setActiveSkill(null)}
          />
        </div>
      </Layout>
    );
  }

  const totalFlagged = (groups ?? []).reduce((sum, g) => sum + g.skills.length, 0);

  // Empty state — nothing needs reteaching
  if (!groups || groups.length === 0 || totalFlagged === 0) {
    return (
      <Layout>
        <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="hud-card rounded-3xl p-12 md:p-16 max-w-2xl w-full">
            <div className="w-24 h-24 rounded-3xl bg-emerald-500/20 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-8 shadow-inner">
              <CheckCircle className="w-12 h-12 text-emerald-500" />
            </div>
            <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-4 text-foreground">ALL SYSTEMS NOMINAL</h2>
            <p className="text-sm font-medium text-muted-foreground max-w-sm mx-auto mb-10 leading-relaxed">
              No directives currently require tactical review. Operations proceeding optimally.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => setLocation("/practice")}
                className="h-14 game-gradient text-white font-black uppercase tracking-widest text-sm px-8 rounded-xl bouncy-hover border-b-[4px] border-black/20 shadow-xl"
                data-testid="btn-try-new-skill"
              >
                <Sparkles className="w-4 h-4 mr-2 fill-white" /> NEW DIRECTIVE
              </Button>
              <Button variant="outline" onClick={() => setLocation("/skill-tree")} className="h-14 font-black uppercase tracking-widest text-sm px-8 rounded-xl bouncy-hover border-2 border-border">
                VIEW SECTOR MAP
              </Button>
            </div>
          </motion.div>
        </div>
      </Layout>
    );
  }

  // Main intervention list
  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-6xl mx-auto flex flex-col h-full min-h-[calc(100vh-4rem)] pb-24">
        <div className="mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight text-foreground mb-1">Tactical Review</h1>
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
            {totalFlagged} target{totalFlagged !== 1 ? "s" : ""} flagged. Execute micro-lessons to resolve discrepancies.
          </p>
        </div>

        <div className="space-y-8 md:space-y-10">
          {groups.map((group, gi) => {
            const domainColor = DOMAIN_COLORS[group.domain] ?? "#6366f1";
            const domainLabel = DOMAIN_LABELS[group.domain] ?? group.domain;
            return (
              <motion.div
                key={group.domain}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.07 }}
              >
                {/* Domain header */}
                <div className="flex items-center gap-3 mb-4 bg-card border-2 border-border p-3 rounded-xl shadow-sm inline-flex">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: domainColor }}>
                     <span className="text-[10px] font-black uppercase">{group.domain}</span>
                  </div>
                  <h2 className="text-xs font-black uppercase tracking-widest text-foreground pr-2">{domainLabel} <span className="text-muted-foreground ml-1">[{group.skills.length}]</span></h2>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {group.skills.map((skill) => (
                    <div
                      key={skill.skillCode}
                      className="hud-card rounded-2xl border-2 border-border hover:border-primary/50 transition-colors p-5 flex flex-col h-full group"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div className="bg-card rounded-full p-1 shadow-sm border border-border shrink-0">
                          <SmartScoreRing score={skill.smartScore} size={56} strokeWidth={5} />
                        </div>

                        <div className="flex-1 min-w-0 pr-4">
                          <p className="text-base font-bold text-foreground leading-tight mb-2">{skill.skillName}</p>
                          <div className="flex items-center gap-2">
                             <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border/50">{skill.skillCode}</span>
                             <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-destructive bg-destructive/10 border border-destructive/20 px-2 py-0.5 rounded">
                                <AlertTriangle className="w-3 h-3" />
                                {skill.consecutiveErrors} FAULTS
                             </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-end justify-between mt-auto pt-4 border-t border-border/50">
                         <div className="flex-1 mr-4">
                           <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2 leading-relaxed">
                             {skill.consecutiveErrors >= 3 ? "PERSISTENT DISCREPANCY. ALTERNATE PROTOCOL RECOMMENDED." : "RECENT ANOMALIES DETECTED. QUICK REVIEW SUGGESTED."}
                           </p>
                           <ScoreSparkline scores={skill.recentScores} color={domainColor} />
                         </div>

                        <Button
                          onClick={() => setActiveSkill(skill)}
                          className="h-12 bg-foreground text-background font-black uppercase tracking-widest text-xs rounded-xl bouncy-hover border-b-[4px] border-foreground/50 shadow-lg shrink-0 px-6"
                          data-testid={`btn-start-reteach-${skill.skillCode}`}
                        >
                          INITIATE
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
