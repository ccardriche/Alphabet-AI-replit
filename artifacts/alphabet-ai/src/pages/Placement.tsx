import { useState } from "react";
import { useLocation } from "wouter";
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
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { GraduationCap, CheckCircle, XCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

type Phase = "intro" | "question" | "result";

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

  const { data: studentProfile } = useGetStudentProfile();
  const startPlacement = useStartPlacement();
  const submitAnswer = useSubmitPlacementAnswer();
  const { data: question, refetch: refetchQuestion } = useGetNextPlacementQuestion(sessionId, {
    query: {
      queryKey: getGetNextPlacementQuestionQueryKey(sessionId),
      enabled: false,
    },
  });
  const { data: result } = useGetPlacementResult(sessionId, {
    query: {
      queryKey: getGetPlacementResultQueryKey(sessionId),
      enabled: phase === "result" && !!sessionId,
    },
  });

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
    const isCorrect = selectedOption === question.correctOptionId;
    setCorrect(isCorrect);
    setRevealed(true);

    try {
      const res = await submitAnswer.mutateAsync({
        sessionId,
        data: {
          questionId: question.id,
          selectedOptionId: selectedOption,
          skillCode: question.skillCode,
          correct: isCorrect,
        },
      });
      setQuestionCount((c) => c + 1);
      if ((res as any).complete) {
        queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
        setTimeout(() => setPhase("result"), 1200);
      }
    } catch {
      toast({ title: "Error submitting answer", variant: "destructive" });
    }
  }

  async function handleNext() {
    setSelectedOption(null);
    setRevealed(false);
    setCorrect(null);
    await refetchQuestion();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-xl">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold">Alphabet AI · Placement</span>
          {phase === "question" && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Question {questionCount + 1}</span>
              <Progress value={Math.min((questionCount / 20) * 100, 100)} className="w-24 h-1.5" />
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
                <h1 className="text-2xl font-bold mb-3">Adaptive Placement</h1>
                <p className="text-muted-foreground mb-2">
                  We'll ask 10–20 questions across different ELA topics to find your reading level and personalize your experience.
                </p>
                <p className="text-sm text-muted-foreground mb-8">Questions adapt to your answers in real time. Just do your best!</p>
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
            <motion.div key={(question as any).id ?? "q"} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                {(question as any).passage && (
                  <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm text-gray-700 leading-relaxed border border-gray-100">
                    {(question as any).passage}
                  </div>
                )}
                <div className="mb-2 flex items-center gap-2">
                  <span className="text-xs font-medium text-indigo-600 uppercase tracking-wide">{(question as any).domain}</span>
                  <span className="text-xs text-muted-foreground">· {(question as any).skillName}</span>
                </div>
                <h2 className="text-lg font-semibold mb-6 leading-snug">{(question as any).questionText}</h2>
                <div className="space-y-3">
                  {(question as any).options?.map((opt: { id: string; text: string }) => {
                    const isSelected = selectedOption === opt.id;
                    const isCorrectOpt = opt.id === (question as any).correctOptionId;
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
                        className={cn("w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all", cls)}
                      >
                        {opt.text}
                      </button>
                    );
                  })}
                </div>

                {revealed && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                    <div className={cn("flex items-center gap-2 p-3 rounded-lg text-sm", correct ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
                      {correct ? <CheckCircle className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
                      <span>{correct ? "Correct!" : "Not quite."} {question.explanation}</span>
                    </div>
                    <Button onClick={handleNext} className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white" data-testid="btn-next-question">
                      Next Question
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
                    Submit Answer
                  </Button>
                )}
              </div>
            </motion.div>
          )}

          {phase === "result" && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Assessment Complete!</h2>
                {result && (
                  <div className="space-y-4 mb-8">
                    <div className="bg-indigo-50 rounded-xl p-4">
                      <p className="text-sm text-indigo-600 font-medium">Reading Level</p>
                      <p className="text-3xl font-bold text-indigo-700">{result.diagnosedGradeLevel}</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4">
                      <p className="text-sm text-purple-600 font-medium">Pathway</p>
                      <p className="text-xl font-bold text-purple-700 capitalize">{result.placementPathway}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">Accuracy: {Math.round(result.accuracyPct ?? 0)}%</p>
                  </div>
                )}
                <Button
                  onClick={() => setLocation("/dashboard")}
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8"
                  data-testid="btn-go-to-dashboard"
                >
                  Go to Dashboard
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
