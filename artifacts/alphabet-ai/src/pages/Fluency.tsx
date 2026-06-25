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
import { Timer, ChevronRight, RotateCcw, History, Play, Minus, Plus, TrendingUp, BookOpen, Target, Crosshair, Zap, Activity, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBenchmarkWPM, getWPMLabel } from "@/lib/passages";

const TIMER_SECONDS = 60;

type Step = "intro" | "countdown" | "reading" | "mark" | "errors" | "result" | "history";

function CircularTimer({ seconds, total }: { seconds: number; total: number }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const progress = (seconds / total) * circ;
  const danger = seconds <= 10;
  return (
    <div className="relative w-32 h-32 mx-auto">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
        <circle
          cx="60" cy="60" r={r} fill="none" strokeWidth="8" strokeLinecap="round"
          stroke={danger ? "var(--color-destructive)" : "var(--color-primary)"}
          strokeDasharray={circ}
          strokeDashoffset={circ - progress}
          style={{ transition: "stroke-dashoffset 1s linear" }}
          className={cn(danger && "drop-shadow-[0_0_8px_rgba(225,29,72,0.8)]")}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("text-4xl font-heading font-black tabular-nums leading-none", danger && "text-destructive animate-pulse")}>{seconds}</span>
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">SECONDS</span>
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
    <div className="leading-[2.5rem] text-lg font-medium text-foreground select-none">
      {words.map((word, i) => (
        <span key={i}>
          <button
            onClick={() => onSelect(i)}
            className={cn(
              "px-1 rounded-md transition-colors cursor-pointer border-b-2 font-bold",
              i <= selectedIndex
                ? "bg-primary/20 text-primary border-primary"
                : "border-transparent hover:bg-muted hover:border-border"
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
    <div className="text-center bg-card border-2 border-border rounded-3xl p-8 shadow-inner relative overflow-hidden">
      <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-20 pointer-events-none" />
      <div className="relative z-10">
         <div className={cn("text-7xl md:text-8xl font-heading font-black tabular-nums tracking-tighter leading-none mb-2", color)}>{wpm}</div>
         <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">WORDS CORRECT PER MINUTE</p>
         
         <div className="mt-8 relative">
           <div className="h-4 rounded-full bg-muted overflow-hidden border border-border shadow-inner relative">
             <motion.div
               className={cn("h-full rounded-full relative", wpm >= benchmark ? "bg-emerald-500" : "bg-amber-500")}
               initial={{ width: 0 }}
               animate={{ width: `${pct}%` }}
               transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
             >
                <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
             </motion.div>
             
             {/* Benchmark marker */}
             <div 
               className="absolute top-0 bottom-0 w-1 bg-foreground z-10"
               style={{ left: `${Math.round((benchmark / (benchmark * 1.5)) * 100)}%` }}
             >
               <div className="absolute -top-6 -translate-x-1/2 bg-foreground text-background text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider whitespace-nowrap">
                 Target: {benchmark}
               </div>
             </div>
           </div>
         </div>
         
         <div className="mt-6 inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-xl border-2 border-border">
           <Activity className={cn("w-4 h-4", color)} />
           <span className={cn("text-sm font-black uppercase tracking-widest", color)}>{label}</span>
         </div>
      </div>
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
        <div className="p-6 flex flex-col items-center justify-center h-64 gap-4">
          <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest animate-pulse">PREPARING TEXT...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto space-y-6 lg:space-y-8 min-h-[calc(100vh-4rem)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl game-gradient flex items-center justify-center shadow-lg">
              <Timer className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-heading font-black uppercase tracking-tight text-foreground">Fluency Sprint</h1>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mt-1">ORAL READING DIAGNOSTIC · 60s LIMIT</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setStep(step === "history" ? "intro" : "history")}
            className="gap-2 font-black uppercase tracking-widest border-2 border-border rounded-xl bouncy-hover"
          >
            <History className="w-4 h-4" />
            {step === "history" ? "RETURN TO SPRINT" : "VIEW LOGS"}
          </Button>
        </div>

        <div className="flex-1 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {/* ─── HISTORY ─────────────────────────────────── */}
          {step === "history" && (
            <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="hud-card rounded-3xl p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                   <History className="w-5 h-5 text-primary" />
                   <h2 className="font-heading font-black text-xl uppercase tracking-wide">Historical Logs</h2>
                </div>
                
                {historyLoading ? (
                  <div className="flex justify-center py-8"><div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" /></div>
                ) : history.length === 0 ? (
                  <div className="text-center py-12">
                    <History className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">No sprint data found.</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                    {history.map((s: any) => {
                      const { label, color } = getWPMLabel(s.wcpm, s.gradeLevel);
                      return (
                        <div key={s.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-card border-2 border-border gap-4 group hover:border-primary/50 transition-colors">
                          <div>
                            <p className="text-base font-bold text-foreground mb-1">{s.passageTitle}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-0.5 rounded uppercase">LVL {s.gradeLevel}</span>
                              <span className="text-[10px] font-bold text-muted-foreground">{s.wordsRead} WORDS</span>
                              <span className="text-[10px] font-bold text-muted-foreground">{s.accuracyPercent}% ACCURACY</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 bg-muted/50 px-4 py-2 rounded-xl sm:min-w-[140px] justify-between border border-border/50 group-hover:bg-background transition-colors">
                            <div className="text-right">
                              <p className={cn("text-2xl font-heading font-black tabular-nums leading-none", color)}>{s.wcpm}</p>
                              <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">WCPM</p>
                            </div>
                            <Activity className={cn("w-5 h-5", color)} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {history.length > 1 && (
                <div className="hud-card rounded-3xl p-6 md:p-8">
                   <div className="flex items-center gap-3 mb-6 border-b border-border/50 pb-4">
                     <TrendingUp className="w-5 h-5 text-emerald-500" />
                     <h2 className="font-heading font-black text-xl uppercase tracking-wide">Performance Trend</h2>
                   </div>
                   <div className="space-y-4">
                    {[...history].reverse().map((s: any, i: number) => {
                      const maxWcpm = Math.max(...history.map((x: any) => x.wcpm));
                      const pct = maxWcpm > 0 ? Math.round((s.wcpm / maxWcpm) * 100) : 0;
                      return (
                        <div key={s.id} className="flex items-center gap-4">
                          <span className="text-[10px] font-black text-muted-foreground w-6 shrink-0">#{i + 1}</span>
                          <div className="flex-1 h-5 rounded-full bg-muted overflow-hidden border border-border shadow-inner">
                            <motion.div
                              className="h-full rounded-full bg-emerald-500 relative"
                              initial={{ width: 0 }}
                              animate={{ width: `${pct}%` }}
                              transition={{ delay: i * 0.1, duration: 0.6, ease: "easeOut" }}
                            >
                               <div className="absolute inset-0 bg-white/20 w-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }} />
                            </motion.div>
                          </div>
                          <span className="text-sm font-black tabular-nums w-16 text-right text-foreground">{s.wcpm} WCPM</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ─── INTRO ─────────────────────────────────── */}
          {step === "intro" && passage && (
            <motion.div key="intro" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95, y: -20 }}>
              <div className="hud-card rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-20 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="w-20 h-20 rounded-3xl bg-card border-2 border-primary/30 flex items-center justify-center mx-auto mb-8 shadow-inner">
                    <BookOpen className="w-10 h-10 text-primary" />
                  </div>

                  <div className="bg-muted border-2 border-border rounded-2xl p-6 mb-8 inline-block text-left shadow-sm max-w-md w-full">
                    <p className="font-heading font-black text-xl mb-1 text-foreground">{passage.title}</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">LVL {passage.gradeLevel} · {passage.wordCount} WORDS</p>
                  </div>

                  <div className="space-y-4 mb-10 max-w-sm mx-auto text-left">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-center mb-4">Sprint Parameters</p>
                    {[
                      { icon: Play, text: "Read the text aloud for 60 seconds." },
                      { icon: Target, text: "Tap the last word read when time expires." },
                      { icon: Crosshair, text: "Input error count for accuracy calculation." },
                      { icon: Activity, text: "System outputs final WCPM rating." },
                    ].map((item, i) => (
                      <div key={i} className="flex items-center gap-3 bg-card p-3 rounded-xl border border-border">
                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                          <item.icon className="w-3 h-3 text-primary" />
                        </div>
                        <span className="text-xs font-bold text-foreground">{item.text}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={startCountdown}
                    className="w-full sm:w-auto min-w-[280px] game-gradient text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl hover:-translate-y-1 active:translate-y-1 transition-all shadow-[0_8px_0_rgba(0,0,0,0.3)] hover:shadow-[0_4px_0_rgba(0,0,0,0.3)] border-b-4 border-black/20 gap-3"
                    size="lg"
                    data-testid="btn-start-fluency"
                  >
                    <Play className="w-6 h-6 fill-white" /> INITIATE SPRINT
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── COUNTDOWN ─────────────────────────────── */}
          {step === "countdown" && (
            <motion.div key="countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="hud-card rounded-3xl p-16 flex flex-col items-center justify-center min-h-[400px]">
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-8 animate-pulse">PREPARE TO READ ALOUD</p>
                <motion.div
                  key={countdown}
                  initial={{ scale: 2, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="text-[150px] font-heading font-black text-primary tabular-nums leading-none drop-shadow-[0_0_20px_rgba(139,92,246,0.5)]"
                >
                  {countdown === 0 ? "GO!" : countdown}
                </motion.div>
              </div>
            </motion.div>
          )}

          {/* ─── READING ─────────────────────────────── */}
          {step === "reading" && passage && (
            <motion.div key="reading" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} transition={{ duration: 0.3 }}>
              <div className="hud-card rounded-3xl p-6 md:p-10">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 bg-card border-2 border-border p-4 rounded-2xl shadow-sm">
                  <div>
                     <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">ACTIVE TARGET</p>
                     <p className="font-heading font-black text-xl uppercase text-foreground">{passage.title}</p>
                  </div>
                  <CircularTimer seconds={timeLeft} total={TIMER_SECONDS} />
                </div>
                
                <div className="bg-card border-2 border-border rounded-2xl p-6 md:p-8 shadow-inner relative">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-primary rounded-l-2xl" />
                  <p className="text-xl md:text-2xl leading-[1.8] md:leading-[2] text-foreground font-medium">{passage.text}</p>
                </div>
                
                <div className="flex justify-center mt-8">
                  <Button variant="outline" onClick={stopEarly} className="gap-2 font-black uppercase tracking-widest border-2 border-border rounded-xl h-12 px-8 bouncy-hover bg-card hover:bg-muted text-muted-foreground hover:text-foreground">
                    TEXT COMPLETE (EARLY STOP)
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ─── MARK STOP WORD ──────────────────────── */}
          {step === "mark" && passage && (
            <motion.div key="mark" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
              <div className="hud-card rounded-3xl p-6 md:p-10">
                <div className="mb-8 text-center bg-card border-2 border-border p-6 rounded-2xl shadow-sm">
                  <Target className="w-10 h-10 text-primary mx-auto mb-3" />
                  <h2 className="text-2xl font-heading font-black uppercase text-foreground mb-2">Mark Final Word</h2>
                  <p className="text-sm font-medium text-muted-foreground">
                    Tap the last word successfully read before time expired.
                  </p>
                  {selectedWord >= 0 && (
                    <div className="inline-flex items-center gap-2 mt-4 bg-primary/10 border border-primary/30 px-4 py-2 rounded-xl text-primary font-black uppercase tracking-widest text-sm">
                      <CheckCircle2 className="w-4 h-4" /> {selectedWord + 1} WORDS SELECTED
                    </div>
                  )}
                </div>
                
                <div className="border-2 border-border rounded-2xl p-6 bg-card shadow-inner max-h-[350px] overflow-y-auto scrollbar-thin">
                  <WordMarker
                    text={passage.text}
                    onSelect={handleWordSelect}
                    selectedIndex={selectedWord}
                  />
                </div>
                
                <Button
                  onClick={confirmMark}
                  disabled={selectedWord < 0}
                  size="lg"
                  className="mt-8 w-full game-gradient text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl bouncy-hover border-b-[6px] border-black/20 shadow-xl"
                >
                  CONFIRM SELECTION <ChevronRight className="w-6 h-6 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── ERROR COUNT ─────────────────────────── */}
          {step === "errors" && (
            <motion.div key="errors" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}>
              <div className="hud-card rounded-3xl p-8 md:p-12 flex flex-col items-center gap-8">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                    <Crosshair className="w-8 h-8 text-amber-500" />
                  </div>
                  <h2 className="text-3xl font-heading font-black uppercase text-foreground mb-2">Input Error Count</h2>
                  <p className="text-sm font-medium text-muted-foreground max-w-xs mx-auto">
                    Record any skipped or mispronounced words for accuracy calibration.
                  </p>
                </div>
                
                <div className="flex items-center justify-center gap-6 bg-card border-2 border-border p-6 rounded-3xl shadow-sm w-full max-w-sm">
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl w-16 h-16 border-2 border-border bouncy-hover"
                    onClick={() => setErrors((e) => Math.max(0, e - 1))}
                  >
                    <Minus className="w-8 h-8 text-foreground" />
                  </Button>
                  
                  <div className="w-24 text-center">
                    <span className="text-6xl font-heading font-black tabular-nums text-primary">{errors}</span>
                  </div>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="rounded-2xl w-16 h-16 border-2 border-border bouncy-hover"
                    onClick={() => setErrors((e) => Math.min(selectedWord + 1, e + 1))}
                  >
                    <Plus className="w-8 h-8 text-foreground" />
                  </Button>
                </div>
                
                <div className="bg-muted px-4 py-2 rounded-xl border border-border">
                   <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                     {errors === 0 ? "PERFECT EXECUTION. 0 ERRORS." : `${errors} ERROR${errors > 1 ? "S" : ""} RECORDED.`}
                   </p>
                </div>
                
                <Button
                  onClick={handleFinish}
                  disabled={saveSession.isPending}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xl uppercase tracking-widest h-16 rounded-2xl bouncy-hover border-b-[6px] border-emerald-700 shadow-xl shadow-emerald-500/20"
                  size="lg"
                >
                  {saveSession.isPending ? "PROCESSING..." : "CALCULATE RESULTS"}
                </Button>
              </div>
            </motion.div>
          )}

          {/* ─── RESULTS ─────────────────────────────── */}
          {step === "result" && result && passage && (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0 }}>
              <div className="hud-card rounded-3xl p-6 md:p-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
                
                <div className="text-center mb-8 relative z-10">
                  <div className="inline-flex items-center gap-2 bg-muted/50 border border-border px-3 py-1 rounded-lg mb-4">
                     <Activity className="w-4 h-4 text-primary" />
                     <span className="text-[10px] font-black uppercase tracking-widest text-foreground">Sprint Complete</span>
                  </div>
                  <h2 className="text-4xl font-heading font-black uppercase text-foreground">Diagnostic Report</h2>
                </div>

                <div className="max-w-md mx-auto mb-8 relative z-10">
                  <WPMGauge wpm={result.wcpm} gradeLevel={passage.gradeLevel} />
                </div>

                <div className="grid grid-cols-3 gap-3 md:gap-6 mb-10 relative z-10 max-w-2xl mx-auto">
                  {[
                    { label: "WORDS READ", value: result.wordsRead, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-500/30" },
                    { label: "ERRORS", value: errors, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/30" },
                    { label: "RAW WPM", value: result.wpm, color: "text-slate-500", bg: "bg-slate-500/10", border: "border-slate-500/30" },
                  ].map(({ label, value, color, bg, border }) => (
                    <div key={label} className={`rounded-2xl p-4 md:p-5 border-2 ${border} ${bg} text-center shadow-sm`}>
                      <p className={`text-2xl md:text-3xl font-heading font-black ${color} mb-1`}>{value}</p>
                      <p className="text-[9px] md:text-[10px] font-bold text-foreground uppercase tracking-widest">{label}</p>
                    </div>
                  ))}
                </div>

                <div className="grid sm:grid-cols-2 gap-4 max-w-xl mx-auto relative z-10">
                  <Button variant="outline" onClick={tryAnother} className="h-14 font-black uppercase tracking-widest gap-2 border-2 border-border rounded-xl bouncy-hover bg-card">
                    <RotateCcw className="w-4 h-4" /> RETRY SPRINT
                  </Button>
                  <Button onClick={() => setStep("history")} className="h-14 bg-foreground hover:bg-foreground/90 text-background font-black uppercase tracking-widest gap-2 rounded-xl bouncy-hover shadow-lg">
                    <History className="w-4 h-4" /> VIEW LOGS
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
