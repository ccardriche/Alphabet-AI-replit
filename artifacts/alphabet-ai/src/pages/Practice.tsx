import { useState } from "react";
import { useLocation } from "wouter";
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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Zap, CheckCircle, XCircle, Trophy, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { DOMAIN_COLORS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import Layout from "@/components/Layout";
import TTSButton from "@/components/TTSButton";

const ACTIVITY_LABELS: Record<string, string> = {
  listen_repeat: "Listen & Repeat",
  see_tap: "See & Tap",
  say_it: "Say It",
  write_it: "Write It",
  read_it: "Read It",
  multiple_choice: "Multiple Choice",
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
      const session = await startSession.mutateAsync({ data: {} });
      setSessionId(session.id);
      setActivityNum(0);
      setScore({ correct: 0, total: 0, xp: 0 });
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

    try {
      await submitAnswer.mutateAsync({
        sessionId,
        data: {
          questionId: q.id,
          selectedOptionId: selected,
          correct: cor,
          skillCode: (activity as any).skillCode,
        },
      });
    } catch {/* swallow */}
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
    } catch {/* swallow */}
    setPhase("complete");
  }

  const q = (activity as any)?.question;
  const isListenRepeat = q?.activityType === "listen_repeat";

  return (
    <Layout>
      <div className="min-h-full p-6 flex items-center justify-center">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {phase === "ready" && (
              <motion.div key="ready" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-6">
                    <Zap className="w-8 h-8 text-indigo-600" />
                  </div>
                  <h1 className="text-2xl font-bold mb-3">Daily Practice</h1>
                  <p className="text-muted-foreground mb-8">5 adaptive activities personalized to your level. Earn XP for every correct answer!</p>
                  <div className="grid grid-cols-5 gap-2 mb-8">
                    {["Listen & Repeat", "See & Tap", "Say It", "Write It", "Read It"].map((label, i) => (
                      <div key={label} className="text-center">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center mx-auto mb-1">{i + 1}</div>
                        <p className="text-[10px] text-muted-foreground leading-tight">{label}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    onClick={handleStart}
                    disabled={startSession.isPending}
                    className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-10"
                    data-testid="btn-begin-practice"
                  >
                    {startSession.isPending ? "Starting..." : "Begin Practice"}
                  </Button>
                </div>
              </motion.div>
            )}

            {(phase === "activity" || phase === "feedback") && activity && q && (
              <motion.div key={`activity-${activityNum}`} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className={cn("h-1.5 w-8 rounded-full transition-colors", i <= activityNum ? "bg-indigo-600" : "bg-gray-200")} />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground ml-auto">{activityNum + 1}/5</span>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: domainColor }}>
                      {ACTIVITY_LABELS[q.activityType ?? ""] ?? "Practice"}
                    </div>
                    <span className="text-xs text-muted-foreground">{(activity as any).skillName}</span>
                  </div>

                  {q.passage && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed border border-gray-100">
                      <div className="flex items-start gap-2">
                        <span className="flex-1">{q.passage}</span>
                        {audioEnabled && (
                          <TTSButton
                            text={q.passage}
                            autoPlay={isListenRepeat && phase === "activity"}
                            showReplay={isListenRepeat}
                          />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 mb-5">
                    <h2 className="text-base font-semibold leading-snug flex-1">{q.questionText}</h2>
                    {audioEnabled && !q.passage && (
                      <TTSButton
                        text={q.questionText}
                        autoPlay={isListenRepeat && phase === "activity" && !q.passage}
                        showReplay={isListenRepeat}
                      />
                    )}
                    {audioEnabled && q.passage && (
                      <TTSButton text={q.questionText} />
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {q.options?.map((opt: { id: string; text: string }) => {
                      const isSelected = selected === opt.id;
                      const isCorrectOpt = opt.id === q.correctOptionId;
                      let cls = "border-gray-200 hover:border-indigo-300";
                      if (phase === "feedback") {
                        if (isCorrectOpt) cls = "border-green-400 bg-green-50 text-green-800";
                        else if (isSelected) cls = "border-red-400 bg-red-50 text-red-800";
                      } else if (isSelected) {
                        cls = "border-indigo-500 bg-indigo-50 text-indigo-800";
                      }
                      return (
                        <button
                          key={opt.id}
                          onClick={() => phase === "activity" && setSelected(opt.id)}
                          disabled={phase === "feedback"}
                          data-testid={`practice-option-${opt.id}`}
                          className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all", cls)}
                        >
                          {opt.text}
                        </button>
                      );
                    })}
                  </div>

                  {phase === "feedback" && (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm mb-3", isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                        {isCorrect ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                        <span className="font-medium">{isCorrect ? `+10 XP! Great job!` : "Not quite. Keep going!"}</span>
                      </div>
                      <Button onClick={handleNext} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white" data-testid="btn-next-activity">
                        {activityNum >= 4 ? "Finish Session" : "Next Activity"}
                      </Button>
                    </motion.div>
                  )}

                  {phase === "activity" && (
                    <Button
                      onClick={handleSubmit}
                      disabled={!selected}
                      className="w-full mt-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
                      data-testid="btn-submit-practice"
                    >
                      Submit
                    </Button>
                  )}
                </div>
              </motion.div>
            )}

            {phase === "complete" && (
              <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
                  <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-6">
                    <Trophy className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
                  <div className="grid grid-cols-3 gap-4 mb-8 mt-6">
                    {[
                      { label: "Questions", value: score.total },
                      { label: "Correct", value: score.correct },
                      { label: "XP Earned", value: score.xp },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-gray-50 rounded-xl p-4">
                        <p className="text-2xl font-bold text-foreground">{value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <Button variant="outline" onClick={handleStart} className="flex-1 gap-2" data-testid="btn-practice-again">
                      <RotateCcw className="w-4 h-4" /> Practice Again
                    </Button>
                    <Button onClick={() => setLocation("/dashboard")} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white" data-testid="btn-back-dashboard">
                      Dashboard
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
