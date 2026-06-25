import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateStudentProfile } from "@workspace/api-client-react";
import { GraduationCap, ChevronRight, ChevronLeft, Check, Users, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, INTEREST_OPTIONS, STUDENT_ID_KEY, DISPLAY_NAME_KEY } from "@/lib/constants";
import { apiUrl } from "@/lib/api-url";
import { useToast } from "@/hooks/use-toast";
import OnboardingIllustration, { type OnboardingIllustrationVariant } from "@/components/OnboardingIllustration";

const schema = z.object({
  displayName: z.string().min(1, "Name is required"),
  grade: z.string().min(1, "Grade is required"),
  homeLanguage: z.string().optional(),
  interests: z.array(z.string()).min(1, "Pick at least one interest"),
  culturalContext: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["IDENTIFICATION", "DIRECTIVES", "ORIGINS", "NETWORK LINK"];

const STEP_ILLUSTRATIONS: OnboardingIllustrationVariant[] = [
  "welcome",
  "reading",
  "coaching",
  "achievement",
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [classCode, setClassCode] = useState("");
  const [classJoinStatus, setClassJoinStatus] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [classJoinError, setClassJoinError] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const createProfile = useCreateStudentProfile();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { displayName: "", grade: "", homeLanguage: "", interests: [], culturalContext: [] },
  });

  const { watch, setValue, getValues } = form;
  const interests = watch("interests") ?? [];
  const grade = watch("grade");
  const culturalCtx = watch("culturalContext") ?? [];

  function toggleInterest(item: string) {
    const current = getValues("interests") ?? [];
    setValue("interests", current.includes(item) ? current.filter((i) => i !== item) : [...current, item]);
  }

  function toggleCultural(ctx: string) {
    const current = getValues("culturalContext") ?? [];
    setValue("culturalContext", current.includes(ctx) ? current.filter((c) => c !== ctx) : [...current, ctx]);
  }

  async function attemptJoinClass() {
    if (!classCode.trim()) return; // skipped
    setClassJoinStatus("joining");
    setClassJoinError("");
    try {
      const res = await fetch(apiUrl("/api/teacher/classes/join"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classCode: classCode.trim() }),
        credentials: "include",
      });
      if (res.ok) {
        setClassJoinStatus("joined");
      } else {
        const err = await res.json().catch(() => ({}));
        setClassJoinStatus("error");
        setClassJoinError((err as any).error ?? "Invalid join code. Please check with your Command Officer.");
      }
    } catch {
      setClassJoinStatus("error");
      setClassJoinError("Connection failed. Retrying required.");
    }
  }

  async function handleFinish() {
    const data = getValues();
    try {
      const profile = await createProfile.mutateAsync({
        data: {
          displayName: data.displayName,
          grade: data.grade,
          homeLanguage: data.homeLanguage,
          interests: data.interests,
          culturalContext: data.culturalContext ?? [],
        },
      });

      localStorage.setItem(STUDENT_ID_KEY, profile.id);
      localStorage.setItem(DISPLAY_NAME_KEY, data.displayName);

      // Attempt class join after profile creation (best effort)
      if (classCode.trim() && classJoinStatus !== "joined") {
        await attemptJoinClass();
      }

      setLocation("/placement");
    } catch {
      toast({ title: "System Error", description: "Initialization failed. Try again.", variant: "destructive" });
    }
  }

  function nextStep() {
    if (step < STEPS.length - 1) setStep(step + 1);
    else handleFinish();
  }

  function prevStep() {
    if (step > 0) setStep(step - 1);
  }

  const isLastStep = step === STEPS.length - 1;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4 md:p-8 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-primary/5 pattern-grid-lg opacity-30 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-fuchsia-500/10 blur-[100px] rounded-full pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        {/* Header */}
        <div className="text-center mb-10">
          <motion.div 
            initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}
            className="inline-flex w-16 h-16 rounded-2xl game-gradient items-center justify-center mb-6 shadow-[0_0_30px_rgba(139,92,246,0.3)]"
          >
            <GraduationCap className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl md:text-4xl font-heading font-black uppercase text-foreground tracking-tight mb-2">Agent Initialization</h1>
          <p className="text-[10px] font-black text-primary uppercase tracking-widest">
            PHASE {step + 1} OF {STEPS.length} // {STEPS[step]}
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8 bg-card border-2 border-border p-2 rounded-xl shadow-sm">
          {STEPS.map((_, i) => (
            <div key={i} className="flex-1 h-2 rounded-md overflow-hidden bg-muted">
               <motion.div 
                 className={cn("h-full", i < step ? "bg-primary" : i === step ? "game-gradient" : "bg-transparent")}
                 initial={{ width: i < step ? "100%" : 0 }}
                 animate={{ width: i <= step ? "100%" : 0 }}
                 transition={{ duration: 0.5 }}
               />
            </div>
          ))}
        </div>

        <div className="hud-card rounded-3xl p-6 md:p-10 relative overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-10 lg:items-center">
            {/* Kid-friendly visual for the current step (stacks on top on mobile) */}
            <div className="order-first">
              <AnimatePresence mode="wait">
                <OnboardingIllustration
                  key={STEP_ILLUSTRATIONS[step]}
                  variant={STEP_ILLUSTRATIONS[step]}
                  className="mx-auto max-w-[18rem] lg:max-w-none"
                />
              </AnimatePresence>
            </div>

            <div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, type: "spring", bounce: 0 }}
            >
              {step === 0 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="displayName" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Operative Designation (Name)</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter designation..."
                      {...form.register("displayName")}
                      className="h-14 bg-card border-2 border-border font-bold text-lg rounded-xl focus-visible:ring-primary focus-visible:border-primary shadow-inner"
                      data-testid="input-display-name"
                    />
                    {form.formState.errors.displayName && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-destructive mt-1 flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-destructive" /> {form.formState.errors.displayName.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Current Clearance Level (Grade)</Label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                      {GRADE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setValue("grade", g)}
                          data-testid={`btn-grade-${g}`}
                          className={cn(
                            "py-3 px-2 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all bouncy-hover",
                            grade === g
                              ? "bg-primary/10 text-primary border-primary shadow-[0_0_15px_rgba(139,92,246,0.2)]"
                              : "border-border text-muted-foreground hover:border-primary/50 hover:bg-muted bg-card shadow-sm"
                          )}
                        >
                          LVL {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-heading font-black uppercase text-foreground mb-2">Target Directives</h2>
                    <p className="text-sm font-medium text-muted-foreground">Select parameters for personalized mission generation. Minimum one required.</p>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {INTEREST_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        data-testid={`btn-interest-${item}`}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border-2 transition-all bouncy-hover",
                          interests.includes(item)
                            ? "bg-primary text-white border-primary shadow-md"
                            : "border-border bg-card text-foreground hover:border-primary/50 shadow-sm"
                        )}
                      >
                        {interests.includes(item) && <Check className="w-3.5 h-3.5" />}
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="homeLanguage" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Primary Local Comms (Language) - Optional</Label>
                    <Input
                      id="homeLanguage"
                      placeholder="e.g. Spanish, Haitian Creole, Somali"
                      {...form.register("homeLanguage")}
                      className="h-14 bg-card border-2 border-border font-bold text-base rounded-xl focus-visible:ring-primary shadow-inner"
                      data-testid="input-home-language"
                    />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Cultural Origin Parameters - Optional</Label>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Calibrates mission narrative context.</p>
                    <div className="flex flex-wrap gap-2.5">
                      {["African American", "Latino/Hispanic", "Asian American", "Indigenous", "Caribbean", "African"].map((ctx) => (
                        <button
                          key={ctx}
                          type="button"
                          onClick={() => toggleCultural(ctx)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all bouncy-hover",
                            culturalCtx.includes(ctx)
                              ? "bg-fuchsia-500/20 text-fuchsia-500 border-fuchsia-500"
                              : "border-border bg-card text-muted-foreground hover:border-fuchsia-500/50 shadow-sm"
                          )}
                        >
                          {culturalCtx.includes(ctx) && <Check className="w-3 h-3" />}
                          {ctx}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                  <div className="flex flex-col items-center justify-center text-center p-6 bg-muted/30 rounded-2xl border-2 border-border border-dashed">
                    <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
                      <Users className="w-8 h-8 text-indigo-500" />
                    </div>
                    <h2 className="text-xl font-heading font-black uppercase text-foreground mb-1">Establish Network Link</h2>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Connect to Command Officer (Optional)</p>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="classCode" className="text-xs font-black uppercase tracking-widest text-muted-foreground">Access Code</Label>
                    <Input
                      id="classCode"
                      placeholder="e.g. A3F9B2"
                      value={classCode}
                      onChange={(e) => {
                        setClassCode(e.target.value.toUpperCase());
                        setClassJoinStatus("idle");
                        setClassJoinError("");
                      }}
                      className="h-16 bg-card border-2 border-border font-mono font-bold tracking-[0.25em] text-center text-2xl uppercase rounded-xl focus-visible:ring-indigo-500 focus-visible:border-indigo-500 shadow-inner"
                      maxLength={8}
                      data-testid="input-class-code"
                    />
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider text-center">Acquire 6-character code from commanding officer.</p>
                  </div>

                  {classJoinStatus === "joined" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex items-center gap-3 text-emerald-600 bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl px-4 py-3">
                      <Check className="w-5 h-5 shrink-0" />
                      <span className="text-xs font-black uppercase tracking-widest">Link established successfully.</span>
                    </motion.div>
                  )}

                  {classJoinStatus === "error" && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-destructive bg-destructive/10 border-2 border-destructive/30 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest">
                      {classJoinError}
                    </motion.div>
                  )}

                  {classCode.trim() && (classJoinStatus === "idle" || classJoinStatus === "joining") && (
                    <Button
                      type="button"
                      disabled={classJoinStatus === "joining"}
                      className="w-full h-14 bg-indigo-500 hover:bg-indigo-600 text-white font-black uppercase tracking-widest text-sm rounded-xl bouncy-hover gap-2 border-b-4 border-indigo-700"
                      onClick={async () => {
                        setClassJoinStatus("joining");
                        try {
                          const res = await fetch(apiUrl("/api/teacher/classes/join"), {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ classCode: classCode.trim() }),
                            credentials: "include",
                          });
                          if (res.ok) {
                            setClassJoinStatus("joined");
                          } else {
                            const err = await res.json().catch(() => ({}));
                            setClassJoinStatus("error");
                            setClassJoinError((err as any).error ?? "Invalid code detected.");
                          }
                        } catch {
                          setClassJoinStatus("error");
                          setClassJoinError("Network failure. Retry required.");
                        }
                      }}
                      data-testid="btn-verify-code"
                    >
                      <Users className="w-4 h-4" />
                      {classJoinStatus === "joining" ? "VERIFYING..." : "VERIFY & LINK"}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 mt-12 pt-6 border-t border-border/50">
            <Button 
              variant="outline" 
              onClick={prevStep} 
              disabled={step === 0} 
              className={cn("w-full sm:w-auto h-12 font-black uppercase tracking-widest text-xs border-2 border-border gap-2 bouncy-hover", step === 0 && "opacity-0")}
            >
              <ChevronLeft className="w-4 h-4" /> PREVIOUS
            </Button>
            
            <div className="flex items-center gap-3 w-full sm:w-auto">
              {isLastStep && (
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                  disabled={createProfile.isPending}
                  className="font-black uppercase tracking-widest text-xs text-muted-foreground hover:text-foreground"
                  data-testid="btn-skip-class"
                >
                  BYPASS
                </Button>
              )}
              <Button
                onClick={nextStep}
                disabled={createProfile.isPending || (step === 0 && (!form.getValues("displayName") || !form.getValues("grade"))) || (step === 1 && interests.length === 0)}
                className="w-full sm:w-auto h-14 px-8 game-gradient text-white font-black uppercase tracking-widest text-sm rounded-xl bouncy-hover border-b-4 border-black/20 gap-2 shadow-lg"
                data-testid="btn-next-step"
              >
                {isLastStep ? (createProfile.isPending ? "INITIALIZING..." : <><Sparkles className="w-4 h-4" /> COMMENCE</>) : "CONTINUE"}
                {!isLastStep && <ChevronRight className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
