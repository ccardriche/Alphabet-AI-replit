import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useSaveIdentityQuest, useGetStudentProfile, getGetStudentProfileQueryKey, getGetStudentDashboardQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronRight, ChevronLeft, Sparkles, Check, Zap } from "lucide-react";
import {
  PRONOUN_OPTIONS,
  AVATAR_OPTIONS,
  EXTENDED_INTEREST_OPTIONS,
  CULTURAL_CONTEXT_OPTIONS,
  MUSIC_OPTIONS,
  LEARNING_STYLE_OPTIONS,
  GOAL_OPTIONS,
} from "@/lib/constants";

const LANGUAGE_OPTIONS = [
  "English", "Spanish", "Mandarin", "Cantonese", "Vietnamese", "Tagalog",
  "Arabic", "Hindi", "Portuguese", "French", "Korean", "Somali", "Haitian Creole", "Other",
];

interface QuestState {
  avatar: string;
  pronouns: string;
  homeLanguage: string;
  culturalContext: string[];
  interests: string[];
  musicPreference: string;
  learningStyle: string;
  goals: string[];
}

const TOTAL_STEPS = 6;

function ProgressDots({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center mb-8">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          "rounded-full transition-all duration-300",
          i < current ? "w-4 h-2 bg-indigo-400" : i === current ? "w-6 h-2 bg-white" : "w-2 h-2 bg-white/20"
        )} />
      ))}
    </div>
  );
}

function SelectChip({ active, onClick, children, emoji }: { active: boolean; onClick: () => void; children: React.ReactNode; emoji?: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-medium transition-all",
        active
          ? "bg-indigo-500/30 border-indigo-400 text-indigo-200 ring-1 ring-indigo-400"
          : "bg-white/5 border-white/15 text-slate-300 hover:bg-white/10 hover:border-white/30"
      )}
    >
      {emoji && <span>{emoji}</span>}
      {children}
      {active && <Check className="w-3 h-3 text-indigo-300 ml-0.5" />}
    </button>
  );
}

export default function IdentityQuest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [newBadges, setNewBadges] = useState<any[]>([]);

  const { data: profile } = useGetStudentProfile({
    query: { queryKey: getGetStudentProfileQueryKey() },
  });
  const saveIdentity = useSaveIdentityQuest();

  const [state, setState] = useState<QuestState>({
    avatar: (profile as any)?.avatar ?? "",
    pronouns: (profile as any)?.pronouns ?? "",
    homeLanguage: (profile as any)?.homeLanguage ?? "",
    culturalContext: (profile as any)?.culturalContext ?? [],
    interests: (profile as any)?.interests ?? [],
    musicPreference: (profile as any)?.musicPreference ?? "",
    learningStyle: (profile as any)?.learningStyle ?? "",
    goals: (profile as any)?.goals ?? [],
  });

  function update<K extends keyof QuestState>(key: K, value: QuestState[K]) {
    setState((prev) => ({ ...prev, [key]: value }));
  }

  function toggleArray(key: "interests" | "culturalContext" | "goals", id: string) {
    setState((prev) => {
      const arr = prev[key] as string[];
      return { ...prev, [key]: arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id] };
    });
  }

  async function handleFinish() {
    try {
      const result = await saveIdentity.mutateAsync({ data: state as any });
      setXpAwarded((result as any).xpAwarded ?? 0);
      setNewBadges((result as any).newBadges ?? []);
      await queryClient.invalidateQueries({ queryKey: getGetStudentProfileQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetStudentDashboardQueryKey() });
      setDone(true);
    } catch {
      toast({ title: "Could not save your profile", variant: "destructive" });
    }
  }

  const stepTitles = [
    "Pick your avatar",
    "What should we call you?",
    "Your roots",
    "What fires you up?",
    "Your vibe",
    "Your mission",
  ];

  const canAdvance = [
    state.avatar !== "",                     // step 0: avatar required
    true,                                     // step 1: pronouns optional
    true,                                     // step 2: culture optional
    state.interests.length >= 1,             // step 3: at least 1 interest
    true,                                     // step 4: music/learning optional
    state.goals.length >= 1,                 // step 5: at least 1 goal
  ];

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white flex items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.4 }}
          className="text-center max-w-sm"
        >
          <div className="text-7xl mb-4">{state.avatar || "🌟"}</div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h1 className="text-3xl font-extrabold mb-2">Quest Complete!</h1>
            <p className="text-slate-300 mb-6">
              Your learning experience is now personalized just for you. Every question will reflect who you are.
            </p>

            {xpAwarded > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold text-lg mb-4"
              >
                <Zap className="w-5 h-5" />
                +{xpAwarded} XP earned!
              </motion.div>
            )}

            {newBadges.map((b: any, i: number) => (
              <motion.div
                key={b.code}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.7 + i * 0.15 }}
                className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 mb-3 text-left"
              >
                <span className="text-2xl">{b.icon}</span>
                <div>
                  <p className="font-semibold text-sm">{b.title}</p>
                  <p className="text-xs text-slate-400">{b.desc}</p>
                </div>
              </motion.div>
            ))}

            <Button
              className="mt-4 w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold"
              size="lg"
              onClick={() => setLocation("/dashboard")}
            >
              Go to Dashboard <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950 text-white p-6 flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs text-indigo-300 font-medium uppercase tracking-wide">Identity Quest</p>
            <p className="text-sm text-slate-300">{stepTitles[step]}</p>
          </div>
        </div>

        <ProgressDots current={step} total={TOTAL_STEPS} />

        <div className="flex-1">
          <AnimatePresence mode="wait">
            {/* Step 0: Avatar */}
            {step === 0 && (
              <motion.div key="avatar" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">Pick your avatar</h2>
                <p className="text-slate-400 text-sm mb-6">This represents you across Alphabet AI.</p>
                <div className="grid grid-cols-8 gap-2">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => update("avatar", emoji)}
                      className={cn(
                        "w-full aspect-square rounded-xl text-2xl flex items-center justify-center transition-all",
                        state.avatar === emoji
                          ? "bg-indigo-500/30 border-2 border-indigo-400 scale-110"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      )}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 1: Pronouns */}
            {step === 1 && (
              <motion.div key="pronouns" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">What should we call you?</h2>
                <p className="text-slate-400 text-sm mb-6">Your pronouns help us address you respectfully in your learning journey.</p>
                <div className="flex flex-wrap gap-2">
                  {PRONOUN_OPTIONS.map((p) => (
                    <SelectChip key={p.id} active={state.pronouns === p.id} onClick={() => update("pronouns", state.pronouns === p.id ? "" : p.id)}>
                      {p.label}
                    </SelectChip>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 2: Culture & Language */}
            {step === 2 && (
              <motion.div key="culture" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">Your roots</h2>
                <p className="text-slate-400 text-sm mb-5">We use this to make your reading materials culturally meaningful. All optional.</p>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Cultural background</p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {CULTURAL_CONTEXT_OPTIONS.map((c) => (
                    <SelectChip key={c.id} active={state.culturalContext.includes(c.id)} onClick={() => toggleArray("culturalContext", c.id)} emoji={c.emoji}>
                      {c.label}
                    </SelectChip>
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Language spoken at home</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectChip key={lang} active={state.homeLanguage === lang} onClick={() => update("homeLanguage", state.homeLanguage === lang ? "" : lang)}>
                      {lang}
                    </SelectChip>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 3: Interests */}
            {step === 3 && (
              <motion.div key="interests" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">What fires you up?</h2>
                <p className="text-slate-400 text-sm mb-5">Pick everything that excites you. Your reading passages will connect to these topics.</p>
                <div className="flex flex-wrap gap-2">
                  {EXTENDED_INTEREST_OPTIONS.map((opt) => (
                    <SelectChip key={opt.id} active={state.interests.includes(opt.id)} onClick={() => toggleArray("interests", opt.id)} emoji={opt.emoji}>
                      {opt.label}
                    </SelectChip>
                  ))}
                </div>
                {state.interests.length === 0 && (
                  <p className="text-xs text-rose-400 mt-3">Pick at least one interest to continue.</p>
                )}
              </motion.div>
            )}

            {/* Step 4: Music + Learning Style */}
            {step === 4 && (
              <motion.div key="vibe" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">Your vibe</h2>
                <p className="text-slate-400 text-sm mb-5">This helps us match the tone and style of your activities.</p>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Favorite music style</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {MUSIC_OPTIONS.map((m) => (
                    <SelectChip key={m.id} active={state.musicPreference === m.id} onClick={() => update("musicPreference", state.musicPreference === m.id ? "" : m.id)} emoji={m.emoji}>
                      {m.label}
                    </SelectChip>
                  ))}
                </div>

                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">How do you learn best?</p>
                <div className="flex flex-col gap-2">
                  {LEARNING_STYLE_OPTIONS.map((ls) => (
                    <button
                      key={ls.id}
                      onClick={() => update("learningStyle", state.learningStyle === ls.id ? "" : ls.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
                        state.learningStyle === ls.id
                          ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <span className="text-lg">{ls.emoji}</span>
                      <span>{ls.label}</span>
                      {state.learningStyle === ls.id && <Check className="w-4 h-4 text-indigo-300 ml-auto" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Goals */}
            {step === 5 && (
              <motion.div key="goals" initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}>
                <h2 className="text-2xl font-bold mb-2">Your mission</h2>
                <p className="text-slate-400 text-sm mb-5">What do you want to achieve? Pick everything that matters to you.</p>
                <div className="flex flex-col gap-2">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleArray("goals", g.id)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl border text-sm text-left transition-all",
                        state.goals.includes(g.id)
                          ? "bg-indigo-500/20 border-indigo-400 text-indigo-200"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      )}
                    >
                      <span className="text-lg">{g.emoji}</span>
                      <span className="flex-1">{g.label}</span>
                      {state.goals.includes(g.id) && <Check className="w-4 h-4 text-indigo-300" />}
                    </button>
                  ))}
                </div>
                {state.goals.length === 0 && (
                  <p className="text-xs text-rose-400 mt-3">Pick at least one goal to complete your quest.</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex items-center gap-3">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4 mr-1" /> Back
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance[step]}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-semibold gap-1"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance[step] || saveIdentity.isPending}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold gap-2"
            >
              {saveIdentity.isPending ? "Saving…" : <><Sparkles className="w-4 h-4" /> Complete Quest</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
