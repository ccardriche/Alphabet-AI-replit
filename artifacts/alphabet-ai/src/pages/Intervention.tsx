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
          <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          <Tooltip
            contentStyle={{ display: "none" }}
          />
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
    <div className="bg-white rounded-2xl shadow-sm border p-6">
      <div className="flex items-center justify-between mb-4">
        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">
          {phaseLabel}
        </span>
        <span className="text-xs text-muted-foreground">{progressLabel}</span>
      </div>

      <h2 className="text-base font-semibold leading-snug mb-5">{q.questionText}</h2>

      <div className="space-y-2.5">
        {q.options.map((opt) => {
          const isSelected = selected === opt.id;
          const isCorrectOpt = opt.id === q.correctOptionId;
          let cls = "border-gray-200 hover:border-indigo-300";
          if (questionPhase === "feedback") {
            if (isCorrectOpt) cls = "border-green-400 bg-green-50 text-green-800";
            else if (isSelected) cls = "border-red-400 bg-red-50 text-red-800";
          } else if (isSelected) {
            cls = "border-indigo-500 bg-indigo-50 text-indigo-800";
          }
          return (
            <button
              key={opt.id}
              onClick={() => questionPhase === "active" && setSelected(opt.id)}
              disabled={questionPhase === "feedback"}
              className={cn(
                "w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                cls,
              )}
            >
              {opt.text}
            </button>
          );
        })}
      </div>

      {questionPhase === "feedback" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className={cn("flex items-start gap-2 p-3 rounded-lg text-sm mb-3", isCorrect ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700")}>
            {isCorrect ? <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 shrink-0 mt-0.5" />}
            <span>{q.explanation}</span>
          </div>
          <Button onClick={handleNext} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
            Continue
          </Button>
        </motion.div>
      )}

      {questionPhase === "active" && (
        <Button
          onClick={handleSubmit}
          disabled={!selected}
          className="w-full mt-5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
        >
          Check Answer
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
      <div className="space-y-4 py-6 text-center">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Generating your personalized micro-lesson…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="py-8 text-center">
        <AlertTriangle className="w-8 h-8 mx-auto mb-3 text-red-400" />
        <p className="text-sm text-muted-foreground mb-4">Failed to generate lesson. Please try again.</p>
        <Button onClick={handleStartLesson} variant="outline">Retry</Button>
      </div>
    );
  }

  // ── Not yet started ────────────────────────────────────────────────────────
  if (!lesson) {
    return (
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border p-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Micro-Lesson: {skill.skillName}</h2>
          <p className="text-sm text-muted-foreground mb-1">3 activities • ~5 minutes</p>
          <div className="flex justify-center gap-6 mt-4 mb-6">
            {[
              { label: "Explain", icon: "📖" },
              { label: "Practice", icon: "✏️" },
              { label: "Check", icon: "✅" },
            ].map(({ label, icon }) => (
              <div key={label} className="text-center">
                <div className="text-2xl mb-1">{icon}</div>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            We'll try a different approach to help this skill click. Score 2/3 to clear the reteaching flag.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
            <Button onClick={handleStartLesson} className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2" data-testid="btn-start-reteach">
              <Sparkles className="w-4 h-4" /> Start Lesson
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── Progress bar (phases 1–3 of 3) ────────────────────────────────────────
  const phaseIndex = { explain: 0, guided1: 1, guided2: 1, check: 2, complete: 3 }[phase];

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      {phase !== "complete" && (
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 flex-1">
            {["Explain", "Practice", "Check"].map((label, i) => (
              <div
                key={label}
                className={cn(
                  "h-1.5 rounded-full flex-1 transition-colors",
                  i < phaseIndex ? "bg-indigo-600" : i === phaseIndex ? "bg-indigo-400" : "bg-gray-200",
                )}
              />
            ))}
          </div>
          <span className="text-xs text-muted-foreground">{["Explain", "Practice", "Practice", "Check", "Done"][phaseIndex]}</span>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── Explain phase ── */}
        {phase === "explain" && (
          <motion.div key="explain" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="bg-white rounded-2xl shadow-sm border p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">Concept</span>
                <span className="text-xs text-muted-foreground">{lesson.skillName}</span>
              </div>
              <h2 className="text-base font-semibold mb-3">Let's try a new approach</h2>
              <div className="bg-indigo-50 rounded-xl p-4 text-sm text-indigo-900 leading-relaxed border border-indigo-100 mb-5">
                {lesson.explanation}
              </div>
              <Button
                onClick={() => setPhase("guided1")}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                data-testid="btn-reteach-continue-explain"
              >
                Got it! Let's Practice <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Guided question 1 ── */}
        {phase === "guided1" && (
          <motion.div key="guided1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <QuestionCard
              q={lesson.guidedQuestions[0]}
              phaseLabel="Guided Practice"
              progressLabel="Question 1 of 2"
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
              phaseLabel="Guided Practice"
              progressLabel="Question 2 of 2"
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
              phaseLabel="Check for Understanding"
              progressLabel="Final check"
              onCorrect={handleCheckCorrect}
              onIncorrect={handleCheckIncorrect}
            />
          </motion.div>
        )}

        {/* ── Complete ── */}
        {phase === "complete" && (
          <motion.div key="complete" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="bg-white rounded-2xl shadow-sm border p-8 text-center">
              <div className={cn("w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5", passed ? "bg-green-100" : "bg-amber-100")}>
                {passed ? <Trophy className="w-8 h-8 text-green-500" /> : <RefreshCcw className="w-8 h-8 text-amber-500" />}
              </div>
              <h2 className="text-xl font-bold mb-2">{passed ? "Great Job!" : "Keep Going!"}</h2>
              <p className="text-sm text-muted-foreground mb-1">
                Score: {correctCount}/3
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {passed
                  ? `You've shown improvement on "${skill.skillName}". The reteaching flag has been cleared!`
                  : `Keep practicing "${skill.skillName}" — you're making progress!`}
              </p>
              {completeError && (
                <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 text-left">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Could not save your progress. Please check your connection and try again.</span>
                </div>
              )}
              <Button onClick={onClose} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                Back to Intervention List
              </Button>
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
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      </Layout>
    );
  }

  // Active reteach session view
  if (activeSkill) {
    return (
      <Layout>
        <div className="p-6 max-w-lg mx-auto">
          <button
            onClick={() => setActiveSkill(null)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-5 transition-colors"
            data-testid="btn-reteach-back"
          >
            ← Intervention List
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
        <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-5">
              <PartyPopper className="w-10 h-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">You're All Caught Up! 🎉</h2>
            <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
              No skills are currently flagged for reteaching. Keep up the great work!
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => setLocation("/practice")}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                data-testid="btn-try-new-skill"
              >
                <Sparkles className="w-4 h-4" /> Try Something New
              </Button>
              <Button variant="outline" onClick={() => setLocation("/skill-tree")}>
                View Skill Tree
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
      <div className="p-6 max-w-3xl mx-auto">
        <div className="mb-5">
          <h1 className="text-2xl font-bold mb-1">Intervention</h1>
          <p className="text-sm text-muted-foreground">
            {totalFlagged} skill{totalFlagged !== 1 ? "s" : ""} need{totalFlagged === 1 ? "s" : ""} reteaching. Complete each micro-lesson to clear the flag.
          </p>
        </div>

        <div className="space-y-6">
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
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: domainColor }} />
                  <h2 className="text-sm font-semibold">{domainLabel}</h2>
                  <span className="text-xs text-muted-foreground">({group.skills.length})</span>
                </div>

                <div className="space-y-3">
                  {group.skills.map((skill) => (
                    <div
                      key={skill.skillCode}
                      className="bg-white rounded-2xl border shadow-sm p-4"
                    >
                      <div className="flex items-center gap-3">
                        <SmartScoreRing score={skill.smartScore} size={44} strokeWidth={4} />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{skill.skillName}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                              <AlertTriangle className="w-3 h-3" />
                              {skill.consecutiveErrors} consecutive error{skill.consecutiveErrors !== 1 ? "s" : ""}
                            </span>
                          </div>
                        </div>

                        {/* Sparkline trend */}
                        <div className="shrink-0">
                          <ScoreSparkline scores={skill.recentScores} color={domainColor} />
                        </div>
                      </div>

                      {/* Error pattern hint */}
                      <div className="mt-3 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
                        Common pattern: {skill.consecutiveErrors >= 3
                          ? "Repeated errors suggest a conceptual gap — a different explanation may help."
                          : "Recent errors detected — a quick review should get you back on track."}
                      </div>

                      <Button
                        onClick={() => setActiveSkill(skill)}
                        className="w-full mt-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                        data-testid={`btn-start-reteach-${skill.skillCode}`}
                      >
                        <BookOpen className="w-4 h-4" /> Start Reteaching
                      </Button>
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
