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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import TTSButton from "@/components/TTSButton";

type Phase = "intro" | "question" | "result";

const TARGET_QUESTIONS = 12;

const ITEM_TYPE_META: Record<string, { label: string; icon: typeof BookOpen }> = {
  multiple_choice: { label: "Reading", icon: BookOpen },
  comprehension: { label: "Reading", icon: BookOpen },
  vocabulary: { label: "Vocabulary", icon: Lightbulb },
  fill_blank: { label: "Fill the Blank", icon: PenLine },
};

const ENCOURAGEMENTS = [
  "Nice work — keep it going!",
  "You're doing great!",
  "Way to stay focused!",
  "Excellent thinking!",
  "Keep up the momentum!",
];

const LEVEL_META: Record<
  string,
  { label: string; bar: string; chip: string; text: string }
> = {
  strength: { label: "Strength", bar: "bg-green-500", chip: "bg-green-100 text-green-700", text: "text-green-700" },
  on_track: { label: "On track", bar: "bg-indigo-500", chip: "bg-indigo-100 text-indigo-700", text: "text-indigo-700" },
  gap: { label: "Focus area", bar: "bg-amber-500", chip: "bg-amber-100 text-amber-700", text: "text-amber-700" },
  not_assessed: { label: "Not assessed", bar: "bg-gray-300", chip: "bg-gray-100 text-gray-500", text: "text-gray-500" },
};

/** Renders passage text, bolding any **word** the generator marked as a vocab target. */
function PassageText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <span className="flex-1">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <strong key={i} className="font-semibold text-indigo-700 underline decoration-indigo-300 underline-offset-2">
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
      toast({ title: "Could not start assessment", variant: "destructive" });
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
          correct: false, // server re-evaluates; client value is ignored
        },
      });
      // Trust the server's evaluation for correctness + which option was right.
      const serverCorrect = !!res.correct;
      setCorrect(serverCorrect);
      setRevealedCorrectId((res as any).correctOptionId ?? null);
      setStreak((s) => (serverCorrect ? s + 1 : 0));
      setQuestionCount((c) => c + 1);
      if (res.complete) {
        localStorage.setItem(PLACEMENT_COMPLETED_KEY, "true");
        queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
        setTimeout(() => setPhase("result"), 1400);
      }
    } catch {
      setRevealed(false);
      toast({ title: "Error submitting answer", variant: "destructive" });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-6">
      <div className={cn("w-full", phase === "result" ? "max-w-2xl" : "max-w-xl")}>
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Alphabet AI · Placement</span>
          {phase === "question" && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {Math.min(questionCount + 1, TARGET_QUESTIONS)} of ~{TARGET_QUESTIONS}
              </span>
              <Progress value={progressPct} className="w-24 h-1.5" />
            </div>
          )}
        </div>

        <AnimatePresence mode="wait">
          {phase === "intro" && (
            <motion.div key="intro" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
                  <Brain className="w-8 h-8 text-indigo-600" />
                </div>
                <h1 className="text-2xl font-bold mb-3">Let's find your reading level</h1>
                <p className="text-muted-foreground mb-6">
                  A short, smart check-in that adapts to you. There are no grades and no time limit — just answer your best.
                </p>
                <div className="grid grid-cols-3 gap-3 mb-8 text-left">
                  <div className="rounded-xl bg-indigo-50 p-3">
                    <BookOpen className="w-5 h-5 text-indigo-600 mb-1.5" />
                    <p className="text-xs font-semibold text-gray-800">Reading</p>
                    <p className="text-[11px] text-muted-foreground">Short passages</p>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-3">
                    <Lightbulb className="w-5 h-5 text-amber-600 mb-1.5" />
                    <p className="text-xs font-semibold text-gray-800">Vocabulary</p>
                    <p className="text-[11px] text-muted-foreground">Words in context</p>
                  </div>
                  <div className="rounded-xl bg-purple-50 p-3">
                    <PenLine className="w-5 h-5 text-purple-600 mb-1.5" />
                    <p className="text-xs font-semibold text-gray-800">Fill the blank</p>
                    <p className="text-[11px] text-muted-foreground">Complete the idea</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-6 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Questions adapt in real time — usually about {TARGET_QUESTIONS} of them.
                </p>
                <Button
                  onClick={handleStart}
                  disabled={startPlacement.isPending}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8"
                  data-testid="btn-start-assessment"
                >
                  {startPlacement.isPending ? "Starting..." : "Start Assessment"}
                </Button>
              </div>
            </motion.div>
          )}

          {phase === "question" && question != null && (
            <motion.div
              key={(question as any).id ?? "q"}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
            >
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {streak >= 2 && !revealed && (
                  <div className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                    <Sparkles className="w-3.5 h-3.5" /> {streak} in a row — you're on a roll!
                  </div>
                )}
                {(question as any).passage && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed border border-gray-100">
                    <div className="flex items-start gap-2">
                      <PassageText text={(question as any).passage} />
                      {audioEnabled && <TTSButton text={(question as any).passage} showReplay />}
                    </div>
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    <ItemIcon className="w-3 h-3" />
                    {itemMeta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">· {(question as any).skillName}</span>
                </div>
                <div className="flex items-start gap-2 mb-6">
                  <h2 className="text-lg font-semibold leading-snug flex-1">{(question as any).questionText}</h2>
                  {audioEnabled && <TTSButton text={(question as any).questionText} size="md" />}
                </div>
                <div className="space-y-3">
                  {(question as any).options?.map((opt: { id: string; text: string }) => {
                    const isSelected = selectedOption === opt.id;
                    const isCorrectOpt = opt.id === revealedCorrectId;
                    let cls = "border-gray-200 text-gray-700 hover:border-indigo-300";
                    if (revealed) {
                      if (isCorrectOpt) cls = "border-green-400 bg-green-50 text-green-800";
                      else if (isSelected && !isCorrectOpt) cls = "border-red-400 bg-red-50 text-red-800";
                    } else if (isSelected) {
                      cls = "border-indigo-500 bg-indigo-50 text-indigo-800";
                    }
                    return (
                      <button
                        key={opt.id}
                        onClick={() => !revealed && setSelectedOption(opt.id)}
                        disabled={revealed}
                        data-testid={`option-${opt.id}`}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all flex items-center gap-2",
                          cls,
                        )}
                      >
                        <span className="flex-1">{opt.text}</span>
                        {audioEnabled && !revealed && <TTSButton text={opt.text} />}
                      </button>
                    );
                  })}
                </div>

                {revealed && correct !== null && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <div
                      className={cn(
                        "flex items-start gap-2 p-3 rounded-lg text-sm",
                        correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700",
                      )}
                    >
                      {correct ? (
                        <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      )}
                      <span>
                        <strong>{correct ? "Correct!" : "Not quite."}</strong> {(question as any).explanation}
                      </span>
                    </div>
                    <Button
                      onClick={handleNext}
                      disabled={isLoadingQuestion}
                      className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      data-testid="btn-next-question"
                    >
                      {isLoadingQuestion ? "Loading…" : "Next Question"}
                    </Button>
                  </motion.div>
                )}

                {!revealed && (
                  <Button
                    onClick={handleSubmit}
                    disabled={!selectedOption || submitAnswer.isPending}
                    className="w-full mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                    data-testid="btn-submit-answer"
                  >
                    {submitAnswer.isPending ? "Checking…" : "Submit Answer"}
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
      <div className="text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <div className="flex items-center justify-center gap-2">
          <h2 className="text-2xl font-bold">Your Reading Report</h2>
          {audioEnabled && summaryText && <TTSButton text={summaryText} size="md" />}
        </div>
        <p className="text-sm text-muted-foreground mt-1">Here's where you're starting — and where you'll grow next.</p>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-indigo-50 rounded-xl p-4 text-center">
              <p className="text-xs text-indigo-600 font-medium">Reading Level</p>
              <p className="text-2xl font-bold text-indigo-700">{result.diagnosedGradeLevel}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <p className="text-xs text-purple-600 font-medium">Pathway</p>
              <p className="text-lg font-bold text-purple-700 capitalize mt-1">{result.placementPathway}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 text-center">
              <p className="text-xs text-emerald-600 font-medium">Accuracy</p>
              <p className="text-2xl font-bold text-emerald-700">{Math.round(result.accuracyPct ?? 0)}%</p>
            </div>
          </div>

          {breakdown.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-indigo-600" /> Skills breakdown
              </h3>
              <div className="space-y-3">
                {breakdown.map((d) => {
                  const meta = LEVEL_META[d.level] ?? LEVEL_META.on_track;
                  return (
                    <div key={d.domainCode}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-700">{d.domain}</span>
                        <span className="flex items-center gap-2">
                          <span className={cn("text-[11px] font-semibold rounded-full px-2 py-0.5", meta.chip)}>
                            {meta.label}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">{Math.round(d.accuracyPct)}%</span>
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(d.accuracyPct, 4)}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className={cn("h-full rounded-full", meta.bar)}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {(strengths.length > 0 || gaps.length > 0) && (
            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="rounded-xl border border-green-100 bg-green-50/50 p-4">
                <h4 className="text-sm font-semibold text-green-700 flex items-center gap-1.5 mb-2">
                  <TrendingUp className="w-4 h-4" /> Strengths
                </h4>
                {strengths.length ? (
                  <ul className="space-y-1">
                    {strengths.map((s) => (
                      <li key={s} className="text-xs text-gray-700">• {s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Building across all areas.</p>
                )}
              </div>
              <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
                <h4 className="text-sm font-semibold text-amber-700 flex items-center gap-1.5 mb-2">
                  <Target className="w-4 h-4" /> Focus areas
                </h4>
                {gaps.length ? (
                  <ul className="space-y-1">
                    {gaps.map((g) => (
                      <li key={g} className="text-xs text-gray-700">• {g}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">No major gaps — keep it up!</p>
                )}
              </div>
            </div>
          )}

          {steps.length > 0 && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-1.5">
                <ArrowRight className="w-4 h-4 text-indigo-600" /> Recommended next steps
              </h3>
              <ol className="space-y-2">
                {steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 rounded-xl bg-gray-50 p-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700 leading-snug">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {(result?.skillsMapped ?? 0) > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-600" />
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-indigo-700">
              Your personalized learning path is ready.
            </span>{" "}
            We mapped <span className="font-semibold">{result!.skillsMapped}</span> skills across your
            reading strands, each with a starting level based on this assessment. Practice updates
            them in real time.
          </p>
        </div>
      )}

      <Button
        onClick={onContinue}
        className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        data-testid="btn-go-to-dashboard"
      >
        Start Learning
      </Button>
    </div>
  );
}
