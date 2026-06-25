import { useState, useMemo } from "react";
import { useLocation, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useStartPracticeSession,
  useGetNextActivity,
  useSubmitActivityAnswer,
  useCompletePracticeSession,
  useGetStudentProfile,
  getGetStudentDashboardQueryKey,
  getGetMasterySummaryQueryKey,
  getGetPracticeHistoryQueryKey,
  getGetNextActivityQueryKey,
  getGetMyBadgesQueryKey,
  type BadgeStatus,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle, XCircle, Trophy, RotateCcw, ChevronDown, ChevronUp, Star, FastForward, Play } from "lucide-react";
import BadgeCelebration from "@/components/BadgeCelebration";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import TTSButton from "@/components/TTSButton";

type RecapItem = {
  num: number;
  skillName: string;
  questionText: string;
  correct: boolean;
  selectedAnswerText: string | null;
  correctAnswerText: string | null;
  explanation: string | null;
};

const ACTIVITY_LABELS: Record<string, string> = {
  listen_repeat: "LISTEN & REPEAT",
  see_tap: "SEE & TAP",
  say_it: "SAY IT",
  write_it: "WRITE IT",
  read_it: "READ IT",
  multiple_choice: "MULTIPLE CHOICE",
};

type Phase = "ready" | "activity" | "feedback" | "complete";

export default function Practice() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("ready");
  const [sessionId, setSessionId] = useState<string>("");
  const [selected, setSelected] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [activityNum, setActivityNum] = useState(0);
  const [score, setScore] = useState({ correct: 0, total: 0, xp: 0 });
  const [pendingBadges, setPendingBadges] = useState<BadgeStatus[]>([]);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [correctAnswerText, setCorrectAnswerText] = useState<string | null>(null);
  const [recap, setRecap] = useState<RecapItem[]>([]);
  const [expandedRecapIdx, setExpandedRecapIdx] = useState<number | null>(null);

  const search = useSearch();
  const focusSkillCode = useMemo(() => new URLSearchParams(search).get("skill") ?? undefined, [search]);

  const { data: profile } = useGetStudentProfile();
  const audioEnabled = (profile as any)?.audioEnabled !== false;

  const startSession = useStartPracticeSession();
  const { data: activity, refetch: refetchActivity } = useGetNextActivity(sessionId, {
    query: {
      queryKey: getGetNextActivityQueryKey(sessionId),
      enabled: false,
    },
  });
  const submitAnswer = useSubmitActivityAnswer();
  const completeSession = useCompletePracticeSession();

  const domainColor = activity ? (DOMAIN_COLORS[(activity as any).domainCode ?? (activity as any).domain] ?? "#6366f1") : "#6366f1";

  async function handleStart() {
    try {
      const session = await startSession.mutateAsync({ data: { focusSkillCode } });
      setSessionId(session.id);
      setActivityNum(0);
      setScore({ correct: 0, total: 0, xp: 0 });
      setRecap([]);
      setExpandedRecapIdx(null);
      setPhase("activity");
      setTimeout(() => refetchActivity(), 100);
    } catch {
      toast({ title: "Could not start practice", variant: "destructive" });
    }
  }

  async function handleSubmit() {
    if (!selected || !sessionId) return;
    const q = (activity as any)?.question;
    if (!q) return;
    const cor = selected === q.correctOptionId;
    setIsCorrect(cor);
    setPhase("feedback");
    setScore((s) => ({ correct: s.correct + (cor ? 1 : 0), total: s.total + 1, xp: s.xp + (cor ? 10 : 2) }));

    const selectedOptText = (q.options as { id: string; text: string }[])?.find((o) => o.id === selected)?.text ?? null;
    const skillNameForRecap = (activity as any).skillName ?? "";
    const questionTextForRecap = q.questionText ?? "";

    try {
      const result = await submitAnswer.mutateAsync({
        sessionId,
        data: {
          questionId: q.id,
          selectedOptionId: selected,
          correct: cor,
          skillCode: (activity as any).skillCode,
        },
      });
      const expln = result?.explanation ?? null;
      const correctText = result?.correctAnswerText ?? null;
      if (expln) setExplanation(expln);
      if (correctText) setCorrectAnswerText(correctText);
      if (result?.newBadges && result.newBadges.length > 0) {
        setPendingBadges(result.newBadges);
        queryClient.invalidateQueries({ queryKey: getGetMyBadgesQueryKey() });
      }
      setRecap((prev) => [
        ...prev,
        {
          num: prev.length + 1,
          skillName: skillNameForRecap,
          questionText: questionTextForRecap,
          correct: cor,
          selectedAnswerText: selectedOptText,
          correctAnswerText: correctText,
          explanation: cor ? null : expln,
        },
      ]);
    } catch {
      toast({ title: "Communication Error: Answer not logged. Check connection.", variant: "destructive" });
      setRecap((prev) => [
        ...prev,
        {
          num: prev.length + 1,
          skillName: skillNameForRecap,
          questionText: questionTextForRecap,
          correct: cor,
          selectedAnswerText: selectedOptText,
          correctAnswerText: null,
          explanation: null,
        },
      ]);
    }
  }

  async function handleNext() {
    const newNum = activityNum + 1;
    if (newNum >= 5) {
      await handleComplete();
      return;
    }
    setActivityNum(newNum);
    setSelected(null);
    setIsCorrect(null);
    setExplanation(null);
    setCorrectAnswerText(null);
    setPhase("activity");
    await refetchActivity();
  }

  async function handleComplete() {
    try {
      await completeSession.mutateAsync({
        sessionId,
        data: { totalQuestions: score.total, correctAnswers: score.correct },
      });
      queryClient.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetMasterySummaryQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetPracticeHistoryQueryKey() });
    } catch {
      toast({ title: "Could not save session results — your XP will sync next time.", variant: "destructive" });
    }
    setPhase("complete");
  }

  const q = (activity as any)?.question;
  const isListenRepeat = q?.activityType === "listen_repeat";

  return (
    <Layout>
      {pendingBadges.length > 0 && (
        <BadgeCelebration
          badges={pendingBadges}
          onDismiss={() => setPendingBadges([])}
        />
      )}
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 flex items-center justify-center">
        <div className="w-full max-w-2xl relative">
          <AnimatePresence mode="wait">
            {phase === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}>
                <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
                  
                  <div className="w-24 h-24 rounded-3xl game-gradient flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-purple-500/30 transform -rotate-6">
                    <Play className="w-12 h-12 text-white fill-white ml-2" />
                  </div>
                  
                  {focusSkillCode ? (
                    <>
                      <div className="inline-block px-4 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 font-black text-[10px] uppercase tracking-widest mb-4">
                        Targeted Mission
                      </div>
                      <h1 className="text-3xl md:text-4xl font-heading font-black mb-4 uppercase text-foreground">{focusSkillCode}</h1>
                      <p className="text-muted-foreground mb-10 text-lg font-medium">Focused training engaged. All objectives will target <span className="font-bold text-foreground">{focusSkillCode}</span>.</p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-3xl md:text-5xl font-heading font-black mb-4 uppercase text-foreground">Daily Mission</h1>
                      <p className="text-muted-foreground mb-10 text-lg font-medium">5 adaptive challenges calibrated for you. Earn XP, rank up.</p>
                    </>
                  )}
                  
                  <div className="grid grid-cols-5 gap-3 mb-10">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <div key={num} className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-muted border-2 border-border flex items-center justify-center font-black text-muted-foreground">
                          {num}
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    onClick={handleStart}
                    disabled={startSession.isPending}
                    size="lg"
                    className="w-full sm:w-auto min-w-[240px] game-gradient text-white px-12 h-16 rounded-2xl font-black text-xl uppercase tracking-widest border-b-[6px] border-black/20 hover:border-black/40 hover:-translate-y-1 transition-all shadow-[0_10px_30px_rgba(139,92,246,0.4)]"
                    data-testid="btn-begin-practice"
                  >
                    {startSession.isPending ? "INITIALIZING..." : "ENGAGE"}
                  </Button>
                </div>
              </motion.div>
            )}

            {(phase === "activity" || phase === "feedback") && activity && q && (
              <motion.div key={`activity-${activityNum}`} initial={{ opacity: 0, x: 50, scale: 0.98 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.98 }} transition={{ type: "spring", stiffness: 300, damping: 25 }}>
                
                {/* Progress HUD */}
                <div className="mb-6 flex items-center justify-between bg-card border-2 border-border p-3 rounded-2xl shadow-sm">
                  <div className="flex gap-2 flex-1 mr-4">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex-1 h-3 rounded-full bg-muted overflow-hidden">
                        {i <= activityNum && (
                          <motion.div 
                            initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ duration: 0.5 }}
                            className={cn("h-full rounded-full shadow-inner", i < activityNum ? "bg-green-500" : "game-gradient")} 
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="bg-muted px-3 py-1 rounded-lg font-black text-muted-foreground text-sm uppercase tracking-wider">
                    {activityNum + 1} / 5
                  </div>
                </div>

                <div className="hud-card rounded-3xl p-6 md:p-8">
                  {/* Question Header */}
                  <div className="flex items-center gap-3 mb-6">
                    <div className="px-3 py-1.5 rounded-xl text-[10px] font-black text-white shadow-sm tracking-wider" style={{ backgroundColor: domainColor }}>
                      {ACTIVITY_LABELS[q.activityType ?? ""] ?? "PRACTICE"}
                    </div>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest bg-muted px-2 py-1 rounded-md">{(activity as any).skillName}</span>
                  </div>

                  {q.passage && (
                    <div className="bg-card border-2 border-border rounded-2xl p-5 mb-6 text-base md:text-lg text-foreground font-medium shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                      <div className="flex items-start gap-4">
                        <span className="flex-1 leading-relaxed">{q.passage}</span>
                        {audioEnabled && (
                          <div className="shrink-0 bg-background rounded-xl shadow-sm border border-border">
                            <TTSButton
                              text={q.passage}
                              autoPlay={isListenRepeat && phase === "activity"}
                              showReplay={isListenRepeat}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-4 mb-8">
                    <h2 className="text-2xl md:text-3xl font-heading font-bold leading-tight flex-1 text-foreground">
                      {q.questionText}
                    </h2>
                    <div className="shrink-0">
                       {audioEnabled && !q.passage && (
                         <div className="bg-muted rounded-xl p-1">
                           <TTSButton
                             text={q.questionText}
                             autoPlay={isListenRepeat && phase === "activity" && !q.passage}
                             showReplay={isListenRepeat}
                             size="md"
                           />
                         </div>
                       )}
                       {audioEnabled && q.passage && (
                         <div className="bg-muted rounded-xl p-1">
                           <TTSButton text={q.questionText} size="md" />
                         </div>
                       )}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="space-y-3">
                    {q.options?.map((opt: { id: string; text: string }, i: number) => {
                      const isSelected = selected === opt.id;
                      const isCorrectOpt = opt.id === q.correctOptionId;
                      
                      let btnState = "idle"; // idle, selected, correct, incorrect, disabled
                      if (phase === "feedback") {
                        if (isCorrectOpt) btnState = "correct";
                        else if (isSelected) btnState = "incorrect";
                        else btnState = "disabled";
                      } else if (isSelected) {
                        btnState = "selected";
                      }

                      return (
                        <motion.button
                          key={opt.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => phase === "activity" && setSelected(opt.id)}
                          disabled={phase === "feedback"}
                          data-testid={`practice-option-${opt.id}`}
                          className={cn(
                            "w-full text-left px-5 py-4 rounded-2xl border-[3px] text-lg font-bold transition-all relative overflow-hidden",
                            btnState === "idle" && "border-border bg-card text-foreground hover:border-primary/50 hover:bg-muted bouncy-hover",
                            btnState === "selected" && "border-primary bg-primary/10 text-primary shadow-[0_0_15px_rgba(139,92,246,0.2)] scale-[1.02]",
                            btnState === "correct" && "border-green-500 bg-green-500/10 text-green-600 dark:text-green-400 scale-[1.02] shadow-[0_0_20px_rgba(34,197,94,0.3)]",
                            btnState === "incorrect" && "border-red-500 bg-red-500/10 text-red-600 dark:text-red-400 opacity-80",
                            btnState === "disabled" && "border-border/50 bg-card/50 text-muted-foreground opacity-50"
                          )}
                        >
                          <div className="flex items-center gap-4 relative z-10">
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
                          </div>
                          
                          {/* Celebration flash effect */}
                          {btnState === "correct" && (
                            <motion.div 
                              initial={{ opacity: 1, scale: 0.8 }} animate={{ opacity: 0, scale: 2 }} transition={{ duration: 0.6 }}
                              className="absolute inset-0 bg-green-400 z-0" 
                            />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>

                  <AnimatePresence>
                    {phase === "feedback" && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                        animate={{ opacity: 1, height: "auto", marginTop: 24 }} 
                        className="overflow-hidden"
                      >
                        <div className={cn(
                          "rounded-2xl p-5 border-2 relative overflow-hidden",
                          isCorrect ? "bg-green-500/10 border-green-500/30" : "bg-card border-border shadow-inner"
                        )}>
                          
                          {isCorrect && (
                            <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 blur-3xl rounded-full" />
                          )}

                          <div className="flex items-center gap-4 mb-4 relative z-10">
                            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-lg", 
                              isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
                            )}>
                              {isCorrect ? <Star className="w-6 h-6 fill-white" /> : <XCircle className="w-6 h-6" />}
                            </div>
                            <div>
                              <h3 className={cn("text-xl font-heading font-black uppercase tracking-wide", isCorrect ? "text-green-600 dark:text-green-400" : "text-red-500")}>
                                {isCorrect ? "MISSION SUCCESS" : "INCORRECT"}
                              </h3>
                              <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                {isCorrect ? "+10 XP GRANTED" : "NO XP AWARDED"}
                              </p>
                            </div>
                          </div>

                          {!isCorrect && correctAnswerText && (
                            <div className="bg-card border-2 border-green-500/30 rounded-xl p-4 mb-4 flex items-start gap-3">
                              <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-[10px] uppercase tracking-widest text-green-600 dark:text-green-400 mb-1">Target Answer</p>
                                <p className="font-bold text-foreground">{correctAnswerText}</p>
                              </div>
                            </div>
                          )}

                          {explanation && (
                            <div className="bg-card border-2 border-primary/20 rounded-xl p-4 flex items-start gap-3">
                              <div className="flex-1">
                                <p className="font-bold text-[10px] uppercase tracking-widest text-primary mb-1">Debrief</p>
                                <p className="font-medium text-muted-foreground leading-relaxed">{explanation}</p>
                              </div>
                              {audioEnabled && (
                                <TTSButton text={explanation} className="shrink-0 bg-muted rounded-lg" />
                              )}
                            </div>
                          )}

                          <Button 
                            onClick={handleNext} 
                            size="lg"
                            className={cn(
                              "w-full mt-5 font-black text-lg uppercase tracking-widest h-14 rounded-xl bouncy-hover",
                              isCorrect 
                                ? "bg-green-500 hover:bg-green-600 text-white shadow-[0_4px_0_rgb(21,128,61)] hover:translate-y-1 hover:shadow-none" 
                                : "game-gradient text-white border-b-4 border-black/20"
                            )} 
                            data-testid="btn-next-activity"
                          >
                            {activityNum >= 4 ? "COMPLETE MISSION" : "NEXT TARGET"} <FastForward className="w-5 h-5 ml-2" />
                          </Button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {phase === "activity" && (
                    <Button
                      onClick={handleSubmit}
                      disabled={!selected}
                      size="lg"
                      className="w-full mt-8 game-gradient text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl shadow-[0_8px_0_rgba(0,0,0,0.2)] hover:translate-y-2 hover:shadow-none active:translate-y-2 active:shadow-none transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                      data-testid="btn-submit-practice"
                    >
                      SUBMIT
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}>
                <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                  
                  {/* Celebration background elements */}
                  <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-400/20 blur-3xl rounded-full" />
                  <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/20 blur-3xl rounded-full" />

                  <motion.div 
                    initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.2 }}
                    className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-300 to-yellow-600 flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-yellow-200"
                  >
                    <Trophy className="w-12 h-12 text-white fill-white drop-shadow-md" />
                  </motion.div>
                  
                  <h2 className="text-4xl md:text-5xl font-heading font-black mb-2 uppercase text-foreground">MISSION ACCOMPLISHED</h2>
                  <p className="text-lg text-muted-foreground font-bold uppercase tracking-widest mb-8">Performance Summary</p>
                  
                  <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10">
                    {[
                      { label: "TARGETS", value: score.total, color: "text-blue-500", border: "border-blue-500/30", bg: "bg-blue-500/10" },
                      { label: "HITS", value: score.correct, color: "text-green-500", border: "border-green-500/30", bg: "bg-green-500/10" },
                      { label: "XP", value: score.xp, color: "text-amber-500", border: "border-amber-500/30", bg: "bg-amber-500/10" },
                    ].map(({ label, value, color, border, bg }, i) => (
                      <motion.div 
                        key={label} 
                        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 + (i * 0.1) }}
                        className={`rounded-2xl p-4 border-2 ${border} ${bg} relative overflow-hidden`}
                      >
                        <p className={`text-3xl md:text-4xl font-heading font-black ${color} mb-1 drop-shadow-sm`}>{value}</p>
                        <p className="text-[10px] md:text-xs font-bold text-foreground uppercase tracking-widest">{label}</p>
                      </motion.div>
                    ))}
                  </div>

                  {recap.length > 0 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="mb-8 text-left bg-card border-2 border-border rounded-2xl overflow-hidden">
                      <div className="bg-muted px-5 py-3 border-b-2 border-border">
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" /> After Action Report
                        </p>
                      </div>
                      <div className="divide-y-2 divide-border max-h-[300px] overflow-y-auto">
                        {recap.map((item, idx) => {
                          const isExpanded = expandedRecapIdx === idx;
                          const canExpand = !item.correct && (item.explanation || item.correctAnswerText);
                          return (
                            <div key={idx} className={cn("transition-colors", item.correct ? "bg-card" : "bg-red-500/5")}>
                              <button
                                type="button"
                                onClick={() => canExpand && setExpandedRecapIdx(isExpanded ? null : idx)}
                                className={cn("w-full flex items-center gap-4 px-5 py-4 text-left group", canExpand && "cursor-pointer hover:bg-muted/50")}
                              >
                                <div className="shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center bg-background">
                                  {item.correct
                                    ? <CheckCircle className="w-5 h-5 text-green-500" />
                                    : <XCircle className="w-5 h-5 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-foreground leading-snug line-clamp-2 text-sm">
                                    {item.questionText}
                                  </p>
                                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{item.skillName}</p>
                                </div>
                                {canExpand && (
                                  <div className="shrink-0 text-muted-foreground bg-muted p-1 rounded-md group-hover:bg-border transition-colors">
                                    {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                                  </div>
                                )}
                              </button>

                              <AnimatePresence>
                                {canExpand && isExpanded && (
                                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                                    <div className="px-5 pb-5 pt-1 space-y-3 pl-16">
                                      {item.selectedAnswerText && (
                                        <div className="bg-card border-2 border-red-500/20 rounded-xl p-3">
                                          <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Your Entry</p>
                                          <p className="text-sm font-bold text-foreground">{item.selectedAnswerText}</p>
                                        </div>
                                      )}
                                      {item.correctAnswerText && (
                                        <div className="bg-card border-2 border-green-500/20 rounded-xl p-3">
                                          <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">Target Entry</p>
                                          <p className="text-sm font-bold text-foreground">{item.correctAnswerText}</p>
                                        </div>
                                      )}
                                      {item.explanation && (
                                        <div className="bg-primary/10 border-2 border-primary/20 rounded-xl p-3">
                                          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">Analysis</p>
                                          <p className="text-sm font-medium text-foreground">{item.explanation}</p>
                                        </div>
                                      )}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={handleStart} className="flex-1 font-black uppercase tracking-widest h-14 rounded-xl border-2 border-border bouncy-hover gap-2" data-testid="btn-practice-again">
                      <RotateCcw className="w-5 h-5" /> RE-ENGAGE
                    </Button>
                    <Button onClick={() => setLocation("/dashboard")} className="flex-[2] game-gradient text-white font-black uppercase tracking-widest h-14 rounded-xl shadow-lg bouncy-hover" data-testid="btn-back-dashboard">
                      RETURN TO HUB
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}
