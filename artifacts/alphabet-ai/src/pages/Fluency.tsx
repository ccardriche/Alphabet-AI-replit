import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetFluencyPassage,
  useGetFluencyHistory,
  useSaveFluencySession,
  getGetFluencyHistoryQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Layout from "@/components/Layout";
import { Timer, ChevronRight, RotateCcw, History, Play, Minus, Plus, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBenchmarkWPM, getWPMLabel } from "@/lib/passages";

const TIMER_SECONDS = 60;

type Step = "intro" | "countdown" | "reading" | "mark" | "errors" | "result" | "history";

function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const progress = (seconds / total) * circ;
  const danger = seconds <= 10;
  return (
    <div className="relative w-24 h-24 mx-auto">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
        <circle
          cx="48" cy="48" r={r} fill="none" strokeWidth="6" strokeLinecap="round"
          stroke={danger ? "#f43f5e" : "#6366f1"}
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          style={{ transition: "stroke-dashoffset 1s linear" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className={cn("text-2xl font-bold tabular-nums", danger && "text-rose-500")}>{seconds}</span>
      </div>
    </div>
  );
}

function WordMarker({
  text,
  onSelect,
  selectedIndex,
}: {
  text: string;
  onSelect: (idx: number) => void;
  selectedIndex: number;
}) {
  const words = text.split(/\s+/);
  return (
    <div className="leading-9 text-base select-none">
      {words.map((word, i) => (
        <span key={i}>
          <button
            onClick={() => onSelect(i)}
            className={cn(
              "px-0.5 rounded transition-colors cursor-pointer",
              i <= selectedIndex
                ? "bg-indigo-500 text-white"
                : "hover:bg-indigo-100 dark:hover:bg-indigo-900/40"
            )}
          >
            {word}
          </button>{" "}
        </span>
      ))}
    </div>
  );
}

function WPMGauge({ wpm, gradeLevel }: { wpm: number; gradeLevel: string }) {
  const benchmark = getBenchmarkWPM(gradeLevel);
  const { label, color } = getWPMLabel(wpm, gradeLevel);
  const pct = Math.min(100, Math.round((wpm / (benchmark * 1.5)) * 100));

  return (
    <div className="text-center">
      <div className={cn("text-6xl font-extrabold tabular-nums", color)}>{wpm}</div>
      <p className="text-sm text-muted-foreground mt-1">words per minute</p>
      <div className="mt-4 h-3 rounded-full bg-muted overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", wpm >= benchmark ? "bg-indigo-500" : "bg-amber-500")}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground mt-1">
        <span>0</span>
        <span>Benchmark: {benchmark} WPM</span>
        <span>{Math.round(benchmark * 1.5)}+</span>
      </div>
      <div className={cn("mt-3 text-sm font-semibold", color)}>{label}</div>
    </div>
  );
}

export default function Fluency() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [step, setStep] = useState<Step>("intro");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [selectedWord, setSelectedWord] = useState(-1);
  const [errors, setErrors] = useState(0);
  const [result, setResult] = useState<{ wpm: number; wcpm: number; wordsRead: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: passage, isLoading: passageLoading, refetch: refetchPassage } = useGetFluencyPassage();
  const { data: history = [], isLoading: historyLoading } = useGetFluencyHistory();
  const saveSession = useSaveFluencySession();

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => () => clearTimer(), [clearTimer]);

  function startCountdown() {
    setStep("countdown");
    setCountdown(3);
    let c = 3;
    timerRef.current = setInterval(() => {
      c -= 1;
      if (c <= 0) {
        clearTimer();
        setStep("reading");
        startReadingTimer();
      } else {
        setCountdown(c);
      }
    }, 1000);
  }

  function startReadingTimer() {
    let t = TIMER_SECONDS;
    let e = 0;
    setTimeLeft(TIMER_SECONDS);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      t -= 1;
      e += 1;
      setTimeLeft(t);
      setElapsed(e);
      if (t <= 0) {
        clearTimer();
        setElapsed(TIMER_SECONDS);
        setStep("mark");
        setSelectedWord(-1);
      }
    }, 1000);
  }

  function stopEarly() {
    clearTimer();
    setStep("mark");
    setSelectedWord(-1);
  }

  function handleWordSelect(idx: number) {
    setSelectedWord(idx);
  }

  function confirmMark() {
    if (selectedWord < 0) {
      toast({ title: "Tap the last word you read", variant: "destructive" });
      return;
    }
    setStep("errors");
  }

  async function handleFinish() {
    if (!passage) return;
    const words = passage.text.split(/\s+/);
    const wordsRead = selectedWord + 1;
    const actualDuration = elapsed > 0 ? elapsed : TIMER_SECONDS;
    const rawWPM = Math.round((wordsRead / actualDuration) * 60);
    const wcpm = Math.max(0, Math.round(((wordsRead - errors) / actualDuration) * 60));
    const accuracyPct = wordsRead > 0 ? Math.round(((wordsRead - errors) / wordsRead) * 100) : 100;

    setResult({ wpm: rawWPM, wcpm, wordsRead });
    setStep("result");

    try {
      await saveSession.mutateAsync({
        data: {
          passageKey: passage.key,
          passageTitle: passage.title,
          gradeLevel: passage.gradeLevel,
          totalWords: words.length,
          wordsRead,
          errors,
          durationSeconds: actualDuration,
          wpm: rawWPM,
          wcpm,
          accuracyPercent: accuracyPct,
        },
      });
      await qc.invalidateQueries({ queryKey: getGetFluencyHistoryQueryKey() });
    } catch {
      toast({ title: "Could not save your session", variant: "destructive" });
    }
  }

  function tryAnother() {
    clearTimer();
    setStep("intro");
    setSelectedWord(-1);
    setErrors(0);
    setResult(null);
    refetchPassage();
  }

  if (passageLoading) {
    return (
      <Layout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
              <Timer className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Reading Fluency</h1>
              <p className="text-xs text-muted-foreground">Oral Reading Fluency (ORF) · 60 seconds</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(step === "history" ? "intro" : "history")}
            className="gap-1.5"
          >
            <History className="w-3.5 h-3.5" />
            {step === "history" ? "Back" : "History"}
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {/* ─── HISTORY ─────────────────────────────────── */}
          {step === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Past Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <p className="text-sm text-muted-foreground">Loading…</p>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No sessions yet. Complete your first reading!</p>
                  ) : (
                    <div className="space-y-2">
                      {history.map((s: any) => {
                        const { label, color } = getWPMLabel(s.wcpm, s.gradeLevel);
                        return (
                          <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                            <div>
                              <p className="text-sm font-medium">{s.passageTitle}</p>
                              <p className="text-xs text-muted-foreground">
                                Grade {s.gradeLevel} · {s.wordsRead} words · {s.accuracyPercent}% accuracy
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={cn("text-lg font-bold tabular-nums", color)}>{s.wcpm}</p>
                              <p className="text-xs text-muted-foreground">WCPM · {label}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
              {history.length > 1 && (
                <Card className="border-0 shadow-sm mt-4">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-500" /> Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5">
                      {[...history].reverse().map((s: any, i: number) => {
                        const maxWcpm = Math.max(...history.map((x: any) => x.wcpm));
                        const pct = maxWcpm > 0 ? Math.round((s.wcpm / maxWcpm) * 100) : 0;
                        return (
                          <div key={s.id} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-12">#{i + 1}</span>
                            <div className="flex-1 h-4 rounded-full bg-muted overflow-hidden">
                              <motion.div
                                className="h-full rounded-full bg-indigo-500"
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ delay: i * 0.06, duration: 0.5 }}
                              />
                            </div>
                            <span className="text-sm font-semibold tabular-nums w-14 text-right">{s.wcpm} WCPM</span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}

          {/* ─── INTRO ─────────────────────────────────── */}
          {step === "intro" && passage && (
            <motion.div key="intro" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-indigo-50 dark:bg-indigo-900/20">
                    <span className="text-3xl">📖</span>
                    <div>
                      <p className="font-semibold">{passage.title}</p>
                      <p className="text-xs text-muted-foreground">Grade {passage.gradeLevel} · {passage.wordCount} words</p>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">How it works:</p>
                    <ul className="space-y-1.5 list-none">
                      {[
                        "📍 Read the passage aloud for 60 seconds",
                        "🖱️ When time's up, tap the last word you read",
                        "✏️ Tell us how many mistakes you made",
                        "📊 See your Words Correct Per Minute (WCPM)",
                      ].map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span>{item.slice(0, 2)}</span>
                          <span>{item.slice(3)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button
                    onClick={startCountdown}
                    className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold gap-2"
                    size="lg"
                    data-testid="btn-start-fluency"
                  >
                    <Play className="w-4 h-4" /> Start Reading
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── COUNTDOWN ─────────────────────────────── */}
          {step === "countdown" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-10 flex flex-col items-center gap-4">
                  <p className="text-sm text-muted-foreground">Get ready to read aloud…</p>
                  <motion.div
                    key={countdown}
                    initial={{ scale: 1.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-8xl font-extrabold text-indigo-500 tabular-nums"
                  >
                    {countdown === 0 ? "Go!" : countdown}
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── READING ─────────────────────────────── */}
          {step === "reading" && passage && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-5">
                    <p className="font-semibold">{passage.title}</p>
                    <CircularTimer seconds={timeLeft} total={TIMER_SECONDS} />
                  </div>
                  <p className="text-lg leading-9 text-foreground">{passage.text}</p>
                  <Button variant="outline" onClick={stopEarly} className="mt-6 w-full gap-2">
                    I finished early
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── MARK STOP WORD ──────────────────────── */}
          {step === "mark" && passage && (
            <motion.div key="mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h2 className="font-semibold mb-1">Tap the last word you read</h2>
                    <p className="text-sm text-muted-foreground">
                      Tap the word where you stopped. Words you read will be highlighted.
                      {selectedWord >= 0 && (
                        <span className="font-medium text-indigo-600 ml-1">{selectedWord + 1} words selected</span>
                      )}
                    </p>
                  </div>
                  <div className="border rounded-xl p-4 bg-muted/30 max-h-64 overflow-y-auto">
                    <WordMarker
                      text={passage.text}
                      onSelect={handleWordSelect}
                      selectedIndex={selectedWord}
                    />
                  </div>
                  <Button
                    onClick={confirmMark}
                    disabled={selectedWord < 0}
                    className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold gap-2"
                  >
                    Confirm <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── ERROR COUNT ─────────────────────────── */}
          {step === "errors" && (
            <motion.div key="errors" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 flex flex-col items-center gap-6">
                  <div className="text-center">
                    <h2 className="font-semibold mb-1">How many mistakes did you make?</h2>
                    <p className="text-sm text-muted-foreground">
                      Count skipped words, mispronounced words, or words you needed help with.
                    </p>
                  </div>
                  <div className="flex items-center gap-6">
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-12 h-12"
                      onClick={() => setErrors((e) => Math.max(0, e - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="text-5xl font-extrabold tabular-nums text-foreground w-16 text-center">{errors}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-full w-12 h-12"
                      onClick={() => setErrors((e) => Math.min(selectedWord + 1, e + 1))}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {errors === 0 ? "Great — zero mistakes!" : `${errors} error${errors > 1 ? "s" : ""} noted`}
                  </p>
                  <Button
                    onClick={handleFinish}
                    disabled={saveSession.isPending}
                    className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold"
                    size="lg"
                  >
                    {saveSession.isPending ? "Saving…" : "See My Results"}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* ─── RESULTS ─────────────────────────────── */}
          {step === "result" && result && passage && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6 space-y-6">
                  <h2 className="font-bold text-center text-lg">Your Results</h2>

                  <WPMGauge wpm={result.wcpm} gradeLevel={passage.gradeLevel} />

                  <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                      { label: "Words Read", value: result.wordsRead },
                      { label: "Errors", value: errors },
                      { label: "Raw WPM", value: result.wpm },
                    ].map(({ label, value }) => (
                      <div key={label} className="rounded-xl bg-muted/40 p-3">
                        <p className="text-xl font-bold">{value}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-center text-muted-foreground">
                    WCPM = Words Correct Per Minute · Benchmark for Grade {passage.gradeLevel}: {getBenchmarkWPM(passage.gradeLevel)} WCPM
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={tryAnother} className="gap-2">
                      <RotateCcw className="w-3.5 h-3.5" /> Try Another
                    </Button>
                    <Button onClick={() => setStep("history")} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white">
                      <History className="w-3.5 h-3.5" /> View History
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
