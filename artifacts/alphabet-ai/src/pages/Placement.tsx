import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { PLACEMENT_COMPLETED_KEY } from "@/lib/constants";
import { motion, AnimatePresence } from "framer-motion";
import {
  useStartPlacement,
  useGetNextPlacementQuestion,
  useSubmitPlacementAnswer,
  useGetPlacementResult,
  useGetStudentProfile,
  getGetStudentProfileQueryKey,
  getGetNextPlacementQuestionQueryKey,
  getGetPlacementResultQueryKey,
  type PlacementDomainScore,
  type PlacementResult,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  GraduationCap,
  CheckCircle,
  XCircle,
  Brain,
  Sparkles,
  BookOpen,
  Lightbulb,
  PenLine,
  Target,
  TrendingUp,
  ArrowRight,
  Shield,
  Activity,
  Zap,
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TTSButton from "@/components/TTSButton";

type Phase = "intro" | "question" | "result";

const TARGET_QUESTIONS = 12;

const ITEM_TYPE_META: Record<string, { label: string; icon: typeof BookOpen }> = {
  multiple_choice: { label: "READING SCAN", icon: BookOpen },
  comprehension: { label: "COMPREHENSION", icon: BookOpen },
  vocabulary: { label: "VOCABULARY", icon: Lightbulb },
  fill_blank: { label: "SYNTAX REPAIR", icon: PenLine },
};

const LEVEL_META: Record<
  string,
  { label: string; bar: string; chip: string; text: string }
> = {
  strength: { label: "STRENGTH", bar: "bg-green-500", chip: "bg-green-500/20 text-green-500 border border-green-500/30", text: "text-green-500" },
  on_track: { label: "ON TRACK", bar: "bg-primary", chip: "bg-primary/20 text-primary border border-primary/30", text: "text-primary" },
  gap: { label: "PRIORITY", bar: "bg-amber-500", chip: "bg-amber-500/20 text-amber-500 border border-amber-500/30", text: "text-amber-500" },
  not_assessed: { label: "PENDING", bar: "bg-muted-foreground/30", chip: "bg-muted text-muted-foreground border border-border", text: "text-muted-foreground" },
};

/** Renders passage text, bolding any **word** the generator marked as a vocab target. */
function PassageText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="flex-1">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-bold text-primary underline decoration-primary/40 underline-offset-4 bg-primary/5 px-1 rounded">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </span>
  );
}

export default function Placement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("intro");
  const [sessionId, setSessionId] = useState<string>("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [correct, setCorrect] = useState<boolean | null>(null);
  const [revealedCorrectId, setRevealedCorrectId] = useState<string | null>(null);
  const [streak, setStreak] = useState(0);

  const { data: studentProfile } = useGetStudentProfile();
  const audioEnabled = (studentProfile as any)?.audioEnabled !== false;

  const startPlacement = useStartPlacement();
  const submitAnswer = useSubmitPlacementAnswer();
  const { data: question, refetch: refetchQuestion, isFetching: isLoadingQuestion } = useGetNextPlacementQuestion(
    sessionId,
    {
      query: {
        queryKey: getGetNextPlacementQuestionQueryKey(sessionId),
        enabled: false,
      },
    },
  );
  const { data: result } = useGetPlacementResult(sessionId, {
    query: {
      queryKey: getGetPlacementResultQueryKey(sessionId),
      enabled: phase === "result" && !!sessionId,
    },
  });

  const itemType = (question as any)?.activityType ?? "comprehension";
  const itemMeta = ITEM_TYPE_META[itemType] ?? ITEM_TYPE_META.comprehension;
  const ItemIcon = itemMeta.icon;

  async function handleStart() {
    try {
      const session = await startPlacement.mutateAsync({ data: {} });
      setSessionId(session.id);
      setPhase("question");
      setTimeout(() => refetchQuestion(), 100);
    } catch {
      toast({ title: "System error: Initialization failed", variant: "destructive" });
    }
  }

  async function handleSubmit() {
    if (!selectedOption || !question || !sessionId) return;
    setRevealed(true);

    try {
      const res = await submitAnswer.mutateAsync({
        sessionId,
        data: {
          questionId: (question as any).id,
          selectedOptionId: selectedOption,
          skillCode: (question as any).skillCode,
          correct: false, // server re-evaluates
        },
      });
      const serverCorrect = !!res.correct;
      setCorrect(serverCorrect);
      setRevealedCorrectId((res as any).correctOptionId ?? null);
      setStreak((s) => (serverCorrect ? s + 1 : 0));
      setQuestionCount((c) => c + 1);
      
      if (res.complete) {
        localStorage.setItem(PLACEMENT_COMPLETED_KEY, "true");
        queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
        setTimeout(() => setPhase("result"), 2000); // slightly longer for celebration
      }
    } catch {
      setRevealed(false);
      toast({ title: "Transmission failed. Retrying required.", variant: "destructive" });
    }
  }

  async function handleNext() {
    setSelectedOption(null);
    setRevealed(false);
    setCorrect(null);
    setRevealedCorrectId(null);
    await refetchQuestion();
  }

  const progressPct = Math.min((questionCount / TARGET_QUESTIONS) * 100, 100);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center py-8 px-4 md:px-6 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-fuchsia-500 to-primary" />
      <div className="absolute top-1/4 left-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-fuchsia-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className={cn("w-full relative z-10 transition-all duration-500", phase === "result" ? "max-w-3xl" : "max-w-2xl")}>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 md:mb-12 bg-card border-2 border-border p-3 rounded-2xl shadow-sm backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl game-gradient flex items-center justify-center shadow-inner">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-heading font-black text-foreground uppercase tracking-wide leading-none block">System Calibration</span>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">Initial Scan</span>
            </div>
          </div>
          
          {phase === "question" && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                SCAN PROGRESS {Math.min(questionCount + 1, TARGET_QUESTIONS)}/{TARGET_QUESTIONS}
              </span>
              <div className="w-32 h-2.5 rounded-full bg-muted overflow-hidden border border-border shadow-inner">
                <motion.div 
                  className="h-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ ease: "easeOut", duration: 0.5 }}
                />
              </div>
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}>
              <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center mx-auto mb-8 shadow-inner relative">
                  <div className="absolute inset-0 bg-primary/20 animate-ping rounded-3xl" />
                  <Activity className="w-12 h-12 text-primary" />
                </div>
                
                <h1 className="text-3xl md:text-5xl font-heading font-black mb-4 uppercase text-foreground">Initiate Neural Link</h1>
                <p className="text-muted-foreground mb-10 text-lg font-medium max-w-md mx-auto">
                  A rapid diagnostic scan to map your current proficiency. System adapts in real-time. No penalties applied.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
                  {[
                    { icon: BookOpen, title: "DATA INGEST", desc: "Process brief texts", color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/20" },
                    { icon: Lightbulb, title: "LEXICON", desc: "Identify definitions", color: "text-amber-500", bg: "bg-amber-500/10", border: "border-amber-500/20" },
                    { icon: PenLine, title: "SYNTAX", desc: "Repair sequences", color: "text-purple-500", bg: "bg-purple-500/10", border: "border-purple-500/20" }
                  ].map((item, i) => (
                    <div key={i} className={`rounded-2xl ${item.bg} border-2 ${item.border} p-4 text-center sm:text-left`}>
                      <item.icon className={`w-6 h-6 ${item.color} mb-3 mx-auto sm:mx-0`} />
                      <p className={`text-[10px] font-black uppercase tracking-widest ${item.color}`}>{item.title}</p>
                      <p className="text-xs font-medium text-foreground mt-1">{item.desc}</p>
                    </div>
                  ))}
                </div>
                
                <Button
                  onClick={handleStart}
                  disabled={startPlacement.isPending}
                  size="lg"
                  className="w-full sm:w-auto min-w-[240px] game-gradient text-white px-12 h-16 rounded-2xl font-black text-xl uppercase tracking-widest border-b-[6px] border-black/20 hover:border-black/40 bouncy-hover shadow-xl"
                  data-testid="btn-start-assessment"
                >
                  {startPlacement.isPending ? "INITIALIZING..." : "COMMENCE SCAN"}
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "question" && question != null && (
            <motion.div
              key={(question as any).id ?? "q"}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="hud-card rounded-3xl p-6 md:p-8">
                {streak >= 3 && !revealed && (
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="mb-6 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-2"
                  >
                    <Flame className="w-5 h-5 text-amber-500 animate-pulse" /> 
                    <span className="text-xs font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">{streak}x COMBO MULTIPLIER</span>
                  </motion.div>
                )}

                <div className="flex items-center gap-3 mb-6">
                  <div className="px-3 py-1.5 rounded-xl text-[10px] font-black text-primary bg-primary/10 border border-primary/20 shadow-sm tracking-wider flex items-center gap-2">
                    <ItemIcon className="w-3.5 h-3.5" />
                    {itemMeta.label}
                  </div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md border border-border">{(question as any).skillName}</span>
                </div>

                {(question as any).passage && (
                  <div className="bg-card border-2 border-border rounded-2xl p-5 mb-6 text-base md:text-lg text-foreground font-medium shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                    <div className="flex items-start gap-4">
                      <PassageText text={(question as any).passage} />
                      {audioEnabled && (
                        <div className="shrink-0 bg-background rounded-xl border border-border shadow-sm">
                          <TTSButton text={(question as any).passage} showReplay />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-4 mb-8">
                  <h2 className="text-2xl md:text-3xl font-heading font-bold leading-tight flex-1 text-foreground">
                    {(question as any).questionText}
                  </h2>
                  {audioEnabled && (
                    <div className="shrink-0 bg-muted rounded-xl p-1">
                      <TTSButton text={(question as any).questionText} size="md" />
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {(question as any).options?.map((opt: { id: string; text: string }, i: number) => {
                    const isSelected = selectedOption === opt.id;
                    const isCorrectOpt = opt.id === revealedCorrectId;
                    
                    let btnState = "idle";
                    if (revealed) {
                      if (isCorrectOpt) btnState = "correct";
                      else if (isSelected && !isCorrectOpt) btnState = "incorrect";
                      else btnState = "disabled";
                    } else if (isSelected) {
                      btnState = "selected";
                    }

                    return (
                      <button
                        key={opt.id}
                        onClick={() => !revealed && setSelectedOption(opt.id)}
                        disabled={revealed}
                        data-testid={`option-${opt.id}`}
                        className={cn(
                          "w-full text-left px-5 py-4 rounded-2xl border-[3px] text-lg font-bold transition-all relative overflow-hidden flex items-center gap-4",
                          btnState === "idle" && "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted bouncy-hover",
                          btnState === "selected" && "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02]",
                          btnState === "correct" && "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 scale-[1.02]",
                          btnState === "incorrect" && "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 opacity-80",
                          btnState === "disabled" && "border-border/50 bg-card/50 text-muted-foreground opacity-50"
                        )}
                      >
                        <div className={cn(
                          "w-8 h-8 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors",
                          btnState === "idle" && "border-border bg-background",
                          btnState === "selected" && "border-primary bg-primary text-white",
                          btnState === "correct" && "border-green-500 bg-green-500 text-white",
                          btnState === "incorrect" && "border-red-500 bg-red-500 text-white",
                          btnState === "disabled" && "border-border/50 bg-background"
                        )}>
                          {btnState === "correct" && <CheckCircle className="w-5 h-5" />}
                          {btnState === "incorrect" && <XCircle className="w-5 h-5" />}
                          {(btnState === "idle" || btnState === "selected" || btnState === "disabled") && 
                            <span className="text-xs font-black">{String.fromCharCode(65 + i)}</span>
                          }
                        </div>
                        <span className="flex-1">{opt.text}</span>
                        {audioEnabled && !revealed && (
                          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
                            <TTSButton text={opt.text} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {revealed && correct !== null && (
                    <motion.div initial={{ opacity: 0, height: 0, marginTop: 0 }} animate={{ opacity: 1, height: "auto", marginTop: 24 }} className="overflow-hidden">
                      <div className={cn(
                        "rounded-2xl p-4 border-2 flex items-start gap-4 relative overflow-hidden",
                        correct ? "bg-green-500/10 border-green-500/30" : "bg-card border-border shadow-inner"
                      )}>
                        <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm", 
                          correct ? "bg-green-500 text-white" : "bg-red-500 text-white"
                        )}>
                          {correct ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <p className={cn("font-heading font-black uppercase tracking-wide mb-1", correct ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                            {correct ? "DATA VERIFIED" : "INCORRECT CALIBRATION"}
                          </p>
                          <p className="text-sm font-medium text-muted-foreground">{(question as any).explanation}</p>
                        </div>
                      </div>
                      
                      <Button
                        onClick={handleNext}
                        disabled={isLoadingQuestion}
                        size="lg"
                        className="w-full mt-6 game-gradient text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl bouncy-hover shadow-[0_8px_0_rgba(0,0,0,0.2)] border-b-[6px] border-black/20"
                        data-testid="btn-next-question"
                      >
                        {isLoadingQuestion ? "PROCESSING..." : "CONTINUE SCAN"}
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!revealed && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOption || submitAnswer.isPending}
                    size="lg"
                    className="w-full mt-8 bg-foreground text-background font-black text-xl uppercase tracking-widest h-16 rounded-2xl hover:-translate-y-1 active:translate-y-1 transition-all disabled:opacity-50 border-b-4 border-black/30 dark:border-white/30"
                    data-testid="btn-submit-answer"
                  >
                    {submitAnswer.isPending ? "ANALYZING..." : "LOCK ANSWER"}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}>
              <ResultReport result={result} audioEnabled={audioEnabled} onContinue={() => setLocation("/dashboard")} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ResultReport({
  result,
  audioEnabled,
  onContinue,
}: {
  result: PlacementResult | undefined;
  audioEnabled: boolean;
  onContinue: () => void;
}) {
  const breakdown: PlacementDomainScore[] = (result?.domainBreakdown ?? []).filter((d) => d.questionsAnswered > 0);
  const steps = result?.recommendedNextSteps ?? [];
  const strengths = result?.strandStrengths ?? [];
  const gaps = result?.strandGaps ?? [];

  const summaryText = useMemo(() => {
    if (!result) return "";
    const parts = [
      `Your reading level is ${result.diagnosedGradeLevel}, on the ${result.placementPathway} pathway.`,
    ];
    if (strengths.length) parts.push(`Your strengths include ${strengths.join(", ")}.`);
    if (gaps.length) parts.push(`Areas to focus on: ${gaps.join(", ")}.`);
    return parts.join(" ");
  }, [result, strengths, gaps]);

  return (
    <div className="hud-card rounded-3xl p-8 md:p-12 relative overflow-hidden">
      {/* Celebration background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/20 blur-[80px] rounded-full" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-500/20 blur-[80px] rounded-full" />

      <div className="text-center mb-10 relative z-10">
        <motion.div 
          initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.2 }}
          className="w-20 h-20 rounded-3xl bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(34,197,94,0.4)] border-4 border-green-300"
        >
          <CheckCircle className="w-10 h-10 text-white" />
        </motion.div>
        <div className="flex items-center justify-center gap-3">
          <h2 className="text-3xl md:text-5xl font-heading font-black uppercase text-foreground tracking-tight">Calibration Complete</h2>
          {audioEnabled && summaryText && (
            <div className="bg-muted rounded-xl p-1 shrink-0">
              <TTSButton text={summaryText} size="md" />
            </div>
          )}
        </div>
        <p className="text-base text-muted-foreground font-bold uppercase tracking-widest mt-3">Neural Link Established</p>
      </div>

      {result && (
        <div className="relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-card border-2 border-primary/30 rounded-2xl p-5 text-center shadow-sm">
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Assessed Level</p>
              <p className="text-3xl md:text-4xl font-heading font-black text-foreground">{result.diagnosedGradeLevel}</p>
            </div>
            <div className="bg-card border-2 border-purple-500/30 rounded-2xl p-5 text-center shadow-sm">
              <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Assigned Pathway</p>
              <p className="text-xl md:text-2xl font-heading font-black text-foreground uppercase mt-2">{result.placementPathway}</p>
            </div>
            <div className="bg-card border-2 border-green-500/30 rounded-2xl p-5 text-center shadow-sm">
              <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Scan Accuracy</p>
              <p className="text-3xl md:text-4xl font-heading font-black text-foreground">{Math.round(result.accuracyPct ?? 0)}%</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-10">
            {breakdown.length > 0 && (
              <div>
                <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-primary" /> Sector Analysis
                </h3>
                <div className="space-y-4 bg-card border-2 border-border rounded-2xl p-5">
                  {breakdown.map((d, i) => {
                    const meta = LEVEL_META[d.level] ?? LEVEL_META.on_track;
                    return (
                      <motion.div key={d.domainCode} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-foreground uppercase tracking-wider">{d.domain}</span>
                          <div className="flex items-center gap-2">
                            <span className={cn("text-[9px] font-black px-2 py-0.5 rounded-md", meta.chip)}>
                              {meta.label}
                            </span>
                          </div>
                        </div>
                        <div className="h-2.5 rounded-full bg-muted overflow-hidden border border-border shadow-inner">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.max(d.accuracyPct, 4)}%` }}
                            transition={{ duration: 1, ease: "easeOut", delay: 0.6 }}
                            className={cn("h-full rounded-full", meta.bar)}
                          />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-4">
               <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest mb-0 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" /> Diagnostics
               </h3>
               <div className="flex-1 rounded-2xl border-2 border-green-500/20 bg-green-500/5 p-5">
                  <h4 className="text-[10px] font-black text-green-600 dark:text-green-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <TrendingUp className="w-3.5 h-3.5" /> Core Strengths
                  </h4>
                  {strengths.length ? (
                    <ul className="space-y-2">
                      {strengths.map((s) => (
                        <li key={s} className="text-xs font-bold text-foreground flex items-start gap-2">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1 shrink-0" />
                           {s}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-medium text-muted-foreground">Gathering sufficient data points.</p>
                  )}
                </div>
                <div className="flex-1 rounded-2xl border-2 border-amber-500/20 bg-amber-500/5 p-5">
                  <h4 className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-3">
                    <Target className="w-3.5 h-3.5" /> Primary Targets
                  </h4>
                  {gaps.length ? (
                    <ul className="space-y-2">
                      {gaps.map((g) => (
                        <li key={g} className="text-xs font-bold text-foreground flex items-start gap-2">
                           <div className="w-1.5 h-1.5 rounded-[4px] rotate-45 bg-amber-500 mt-1 shrink-0" />
                           {g}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs font-medium text-muted-foreground">No critical vulnerabilities detected.</p>
                  )}
                </div>
            </div>
          </div>

          {(result?.skillsMapped ?? 0) > 0 && (
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1 }}
              className="mb-8 flex items-center gap-5 rounded-2xl border-2 border-primary/30 game-gradient p-5 shadow-lg"
            >
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30 shadow-inner">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <p className="text-sm font-medium text-white/90 leading-relaxed">
                <strong className="font-black text-white uppercase tracking-wide block mb-1">
                  Personalized Mission Path Generated
                </strong>
                Mapped <span className="font-black bg-white/20 px-2 py-0.5 rounded text-white">{result!.skillsMapped}</span> discrete objectives across all sectors based on diagnostic data.
              </p>
            </motion.div>
          )}
        </div>
      )}

      <Button
        onClick={onContinue}
        size="lg"
        className="w-full game-gradient text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl bouncy-hover shadow-[0_8px_0_rgba(0,0,0,0.2)] hover:translate-y-1 active:translate-y-2 active:shadow-none border-b-[6px] border-black/20 z-10 relative"
        data-testid="btn-go-to-dashboard"
      >
        ENTER HUB
      </Button>
    </div>
  );
}
