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
    <div className="flex items-center gap-2 justify-center mb-8 bg-black/20 p-2 rounded-full">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={cn(
          "rounded-full transition-all duration-500",
          i < current ? "w-6 h-2 bg-primary shadow-[0_0_8px_rgba(139,92,246,0.8)]" : i === current ? "w-10 h-2 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-2 h-2 bg-white/20"
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
        "flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-black uppercase tracking-wider transition-all bouncy-hover",
        active
          ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)] scale-[1.02]"
          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/30"
      )}
    >
      {emoji && <span className="text-xl leading-none">{emoji}</span>}
      {children}
      {active && <Check className="w-4 h-4 text-primary ml-1" />}
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
      toast({ title: "System Error: Data sync failed", variant: "destructive" });
    }
  }

  const stepTitles = [
    "SELECT AVATAR",
    "DESIGNATION (PRONOUNS)",
    "ORIGIN PARAMETERS",
    "ENGAGEMENT TARGETS",
    "OPERATIONAL STYLE",
    "MISSION OBJECTIVES",
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
      <div className="min-h-[100dvh] bg-[#0a0a1a] text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
         {/* Background effects */}
         <div className="absolute inset-0 bg-primary/10 pattern-grid-lg opacity-30 pointer-events-none" />
         <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/20 blur-[100px] rounded-full pointer-events-none" />

        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.5 }}
          className="text-center max-w-md w-full relative z-10 bg-black/40 border-2 border-white/10 p-8 rounded-3xl backdrop-blur-xl shadow-2xl"
        >
          <div className="w-32 h-32 mx-auto bg-white/10 rounded-full border-4 border-primary/50 flex items-center justify-center text-7xl mb-8 shadow-[0_0_40px_rgba(139,92,246,0.4)]">
             {state.avatar ? <span>{state.avatar}</span> : <Sparkles className="w-16 h-16 text-primary" />}
          </div>
          
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h1 className="text-4xl font-heading font-black mb-3 uppercase tracking-tight text-white drop-shadow-md">Quest Complete</h1>
            <p className="text-sm font-medium text-slate-300 mb-8 uppercase tracking-widest">
              Profile parameters fully synced. Interface personalized.
            </p>

            {xpAwarded > 0 && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.5, type: "spring" }}
                className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl bg-amber-500/20 border-2 border-amber-500/50 text-amber-400 font-black text-xl uppercase tracking-widest mb-6 shadow-[0_0_20px_rgba(245,158,11,0.2)]"
              >
                <Zap className="w-6 h-6 fill-amber-400" />
                +{xpAwarded} XP AWARDED
              </motion.div>
            )}

            <div className="space-y-3 mb-8">
               {newBadges.map((b: any, i: number) => (
                 <motion.div
                   key={b.code}
                   initial={{ scale: 0, opacity: 0, x: -20 }}
                   animate={{ scale: 1, opacity: 1, x: 0 }}
                   transition={{ delay: 0.7 + i * 0.15, type: "spring" }}
                   className="flex items-center gap-4 bg-gradient-to-r from-white/10 to-transparent border border-white/20 rounded-2xl px-5 py-4 text-left"
                 >
                   <span className="text-4xl filter drop-shadow-md">{b.icon}</span>
                   <div>
                     <p className="font-black text-sm uppercase tracking-wider text-white">{b.title}</p>
                     <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mt-0.5">{b.desc}</p>
                   </div>
                   <Check className="w-5 h-5 text-green-400 ml-auto" />
                 </motion.div>
               ))}
            </div>

            <Button
              className="w-full h-16 game-gradient text-white font-black text-xl uppercase tracking-widest rounded-2xl bouncy-hover border-b-[6px] border-black/30 shadow-xl"
              onClick={() => setLocation("/dashboard")}
            >
              ENTER HUB <ChevronRight className="w-6 h-6 ml-2" />
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a1a] text-white flex flex-col relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      
      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col p-4 md:p-8 relative z-10">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between bg-black/40 border border-white/10 p-4 rounded-2xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl game-gradient flex items-center justify-center shrink-0 shadow-lg">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-0.5">Identity Sync</p>
              <p className="text-sm font-bold text-slate-200 uppercase tracking-wider">{stepTitles[step]}</p>
            </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">PROGRESS</span>
             <p className="font-heading font-black text-xl leading-none text-white">{step + 1}<span className="text-muted-foreground text-sm">/{TOTAL_STEPS}</span></p>
          </div>
        </div>

        <ProgressDots current={step} total={TOTAL_STEPS} />

        <div className="flex-1 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            {/* Step 0: Avatar */}
            {step === 0 && (
              <motion.div key="avatar" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Select Visual ID</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">This entity represents you across the network.</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 md:gap-4 max-h-[40vh] overflow-y-auto pr-2 scrollbar-thin">
                  {AVATAR_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => update("avatar", emoji)}
                      className={cn(
                        "w-full aspect-square rounded-2xl text-4xl flex items-center justify-center transition-all bouncy-hover border-2",
                        state.avatar === emoji
                          ? "bg-primary/20 border-primary shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-110 z-10"
                          : "bg-white/5 border-white/10 hover:bg-white/15 hover:border-white/30"
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
              <motion.div key="pronouns" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Designation Config</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">Establish preferred communication pronouns.</p>
                <div className="flex flex-wrap gap-3">
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
              <motion.div key="culture" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Origin Parameters</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">Used to calibrate narrative context. (Optional)</p>

                <p className="text-[10px] font-black text-primary border border-primary/30 bg-primary/10 px-3 py-1 rounded-md inline-block uppercase tracking-widest mb-4">Cultural Background</p>
                <div className="flex flex-wrap gap-3 mb-8">
                  {CULTURAL_CONTEXT_OPTIONS.map((c) => (
                    <SelectChip key={c.id} active={state.culturalContext.includes(c.id)} onClick={() => toggleArray("culturalContext", c.id)} emoji={c.emoji}>
                      {c.label}
                    </SelectChip>
                  ))}
                </div>

                <p className="text-[10px] font-black text-fuchsia-400 border border-fuchsia-400/30 bg-fuchsia-400/10 px-3 py-1 rounded-md inline-block uppercase tracking-widest mb-4">Primary Local Comms</p>
                <div className="flex flex-wrap gap-3 max-h-[150px] overflow-y-auto pr-2 scrollbar-thin">
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
              <motion.div key="interests" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Engagement Targets</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">Select vectors of interest. Calibrates content themes.</p>
                <div className="flex flex-wrap gap-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                  {EXTENDED_INTEREST_OPTIONS.map((opt) => (
                    <SelectChip key={opt.id} active={state.interests.includes(opt.id)} onClick={() => toggleArray("interests", opt.id)} emoji={opt.emoji}>
                      {opt.label}
                    </SelectChip>
                  ))}
                </div>
                {state.interests.length === 0 && (
                  <div className="mt-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 inline-flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                     <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Minimum 1 target required.</p>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Music + Learning Style */}
            {step === 4 && (
              <motion.div key="vibe" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Operational Style</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">Calibrates system tone and instructional delivery.</p>

                <p className="text-[10px] font-black text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 rounded-md inline-block uppercase tracking-widest mb-4">Auditory Preferences</p>
                <div className="flex flex-wrap gap-3 mb-10">
                  {MUSIC_OPTIONS.map((m) => (
                    <SelectChip key={m.id} active={state.musicPreference === m.id} onClick={() => update("musicPreference", state.musicPreference === m.id ? "" : m.id)} emoji={m.emoji}>
                      {m.label}
                    </SelectChip>
                  ))}
                </div>

                <p className="text-[10px] font-black text-blue-400 border border-blue-400/30 bg-blue-400/10 px-3 py-1 rounded-md inline-block uppercase tracking-widest mb-4">Input Processing Method</p>
                <div className="flex flex-col gap-3">
                  {LEARNING_STYLE_OPTIONS.map((ls) => (
                    <button
                      key={ls.id}
                      onClick={() => update("learningStyle", state.learningStyle === ls.id ? "" : ls.id)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all bouncy-hover",
                        state.learningStyle === ls.id
                          ? "bg-primary/20 border-primary text-primary shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/30"
                      )}
                    >
                      <span className="text-3xl leading-none">{ls.emoji}</span>
                      <span className="font-black uppercase tracking-wide text-sm">{ls.label}</span>
                      {state.learningStyle === ls.id && <Check className="w-5 h-5 text-primary ml-auto" />}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Step 5: Goals */}
            {step === 5 && (
              <motion.div key="goals" initial={{ opacity: 0, x: 50, scale: 0.95 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: -50, scale: 0.95 }} className="bg-black/40 border-2 border-white/10 rounded-3xl p-6 md:p-10 backdrop-blur-xl">
                <h2 className="text-3xl md:text-4xl font-heading font-black uppercase tracking-tight mb-2">Mission Objectives</h2>
                <p className="text-slate-400 font-medium text-sm md:text-base uppercase tracking-widest mb-8">What are your primary goals for this system?</p>
                <div className="flex flex-col gap-3">
                  {GOAL_OPTIONS.map((g) => (
                    <button
                      key={g.id}
                      onClick={() => toggleArray("goals", g.id)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl border-2 text-left transition-all bouncy-hover",
                        state.goals.includes(g.id)
                          ? "bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-400 shadow-[0_0_15px_rgba(217,70,239,0.3)]"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/30"
                      )}
                    >
                      <span className="text-2xl leading-none">{g.emoji}</span>
                      <span className="flex-1 font-black uppercase tracking-wide text-sm">{g.label}</span>
                      {state.goals.includes(g.id) && <Check className="w-5 h-5 text-fuchsia-400 shrink-0" />}
                    </button>
                  ))}
                </div>
                {state.goals.length === 0 && (
                   <div className="mt-6 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 inline-flex items-center gap-2">
                     <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                     <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Minimum 1 objective required.</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between gap-4">
          <Button
            variant="outline"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className={cn("h-14 px-6 border-2 border-white/20 text-slate-300 hover:bg-white/10 hover:text-white font-black uppercase tracking-widest text-xs rounded-xl bouncy-hover", step === 0 && "opacity-0 pointer-events-none")}
          >
            <ChevronLeft className="w-5 h-5 mr-2" /> PREVIOUS
          </Button>
          
          {step < TOTAL_STEPS - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance[step]}
              className="flex-1 sm:flex-none sm:min-w-[200px] h-14 bg-white text-black hover:bg-slate-200 font-black uppercase tracking-widest text-sm rounded-xl bouncy-hover border-b-[4px] border-slate-400 shadow-xl"
            >
              PROCEED <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              disabled={!canAdvance[step] || saveIdentity.isPending}
              className="flex-1 sm:flex-none sm:min-w-[240px] h-14 game-gradient text-white font-black uppercase tracking-widest text-sm rounded-xl bouncy-hover border-b-[4px] border-black/30 shadow-[0_0_20px_rgba(139,92,246,0.4)]"
            >
              {saveIdentity.isPending ? "SYNCING..." : <><Zap className="w-5 h-5 mr-2 fill-white" /> FINALIZE SYNC</>}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
