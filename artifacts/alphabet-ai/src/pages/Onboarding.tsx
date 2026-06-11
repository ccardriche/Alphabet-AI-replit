import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateStudentProfile } from "@workspace/api-client-react";
import { GraduationCap, ChevronRight, ChevronLeft, Check, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS, INTEREST_OPTIONS, STUDENT_ID_KEY } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  displayName: z.string().min(1, "Name is required"),
  grade: z.string().min(1, "Grade is required"),
  homeLanguage: z.string().optional(),
  interests: z.array(z.string()).min(1, "Pick at least one interest"),
  culturalContext: z.array(z.string()).optional(),
});

type FormData = z.infer<typeof schema>;

const STEPS = ["Name & Grade", "Interests", "Language & Culture", "Join a Class"];

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
      const res = await fetch("/api/teacher/classes/join", {
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
        setClassJoinError((err as any).error ?? "Invalid join code. Please check with your teacher.");
      }
    } catch {
      setClassJoinStatus("error");
      setClassJoinError("Could not connect. Please try again.");
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

      // Attempt class join after profile creation (best effort)
      if (classCode.trim() && classJoinStatus !== "joined") {
        await attemptJoinClass();
      }

      setLocation("/placement");
    } catch {
      toast({ title: "Something went wrong", description: "Please try again.", variant: "destructive" });
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-white flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <GraduationCap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg">Alphabet AI</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Let's set up your profile</h1>
          <p className="text-sm text-muted-foreground">Step {step + 1} of {STEPS.length} — {STEPS[step]}</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-colors duration-300", i <= step ? "bg-indigo-600" : "bg-gray-200")} />
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              {step === 0 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="displayName">What's your name?</Label>
                    <Input
                      id="displayName"
                      placeholder="Enter your name"
                      {...form.register("displayName")}
                      className="mt-1.5"
                      data-testid="input-display-name"
                    />
                    {form.formState.errors.displayName && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.displayName.message}</p>
                    )}
                  </div>
                  <div>
                    <Label>What grade are you in?</Label>
                    <div className="grid grid-cols-4 gap-2 mt-1.5">
                      {GRADE_OPTIONS.map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => setValue("grade", g)}
                          data-testid={`btn-grade-${g}`}
                          className={cn(
                            "py-2 px-3 rounded-lg text-sm font-medium border transition-all",
                            grade === g
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "border-gray-200 text-gray-600 hover:border-indigo-300"
                          )}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="text-base font-semibold mb-1">What are your interests?</h2>
                  <p className="text-sm text-muted-foreground mb-4">Pick everything that you enjoy — we'll use this to personalize your questions.</p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => toggleInterest(item)}
                        data-testid={`btn-interest-${item}`}
                        className={cn(
                          "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                          interests.includes(item)
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-200 text-gray-600 hover:border-indigo-300"
                        )}
                      >
                        {interests.includes(item) && <Check className="w-3 h-3" />}
                        {item.charAt(0).toUpperCase() + item.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-5">
                  <div>
                    <Label htmlFor="homeLanguage">What language do you speak at home? (optional)</Label>
                    <Input
                      id="homeLanguage"
                      placeholder="e.g. Spanish, Haitian Creole, Somali"
                      {...form.register("homeLanguage")}
                      className="mt-1.5"
                      data-testid="input-home-language"
                    />
                  </div>
                  <div>
                    <Label>Cultural background (optional)</Label>
                    <p className="text-xs text-muted-foreground mb-2">This helps us create more relevant reading passages for you.</p>
                    <div className="flex flex-wrap gap-2">
                      {["African American", "Latino/Hispanic", "Asian American", "Indigenous", "Caribbean", "African"].map((ctx) => (
                        <button
                          key={ctx}
                          type="button"
                          onClick={() => toggleCultural(ctx)}
                          className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border transition-all",
                            culturalCtx.includes(ctx)
                              ? "bg-purple-600 text-white border-purple-600"
                              : "border-gray-200 text-gray-600 hover:border-purple-300"
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
                <div className="space-y-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Users className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold">Join your class</h2>
                      <p className="text-xs text-muted-foreground">Optional — you can skip this and join later</p>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="classCode">Class Join Code</Label>
                    <Input
                      id="classCode"
                      placeholder="e.g. A3F9B2"
                      value={classCode}
                      onChange={(e) => {
                        setClassCode(e.target.value.toUpperCase());
                        setClassJoinStatus("idle");
                        setClassJoinError("");
                      }}
                      className="mt-1.5 font-mono tracking-widest text-center text-lg uppercase"
                      maxLength={8}
                      data-testid="input-class-code"
                    />
                    <p className="text-xs text-muted-foreground mt-1.5">Ask your teacher for the 6-letter class code.</p>
                  </div>

                  {classJoinStatus === "joined" && (
                    <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-xl px-3 py-2.5 text-sm">
                      <Check className="w-4 h-4 shrink-0" />
                      Successfully joined! Your teacher can now see your progress.
                    </div>
                  )}

                  {classJoinStatus === "error" && (
                    <div className="text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm">
                      {classJoinError}
                    </div>
                  )}

                  {classCode.trim() && (classJoinStatus === "idle" || classJoinStatus === "joining") && (
                    <Button
                      type="button"
                      variant="outline"
                      disabled={classJoinStatus === "joining"}
                      className="w-full gap-2 border-indigo-300 text-indigo-700 hover:bg-indigo-50"
                      onClick={async () => {
                        setClassJoinStatus("joining");
                        try {
                          const res = await fetch("/api/teacher/classes/join", {
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
                            setClassJoinError((err as any).error ?? "Invalid join code.");
                          }
                        } catch {
                          setClassJoinStatus("error");
                          setClassJoinError("Could not connect. Please try again.");
                        }
                      }}
                      data-testid="btn-verify-code"
                    >
                      <Users className="w-4 h-4" />
                      {classJoinStatus === "joining" ? "Joining..." : "Verify & Join Class"}
                    </Button>
                  )}
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button variant="outline" onClick={prevStep} disabled={step === 0} className="gap-2">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
            <div className="flex items-center gap-2">
              {isLastStep && (
                <Button
                  variant="ghost"
                  onClick={handleFinish}
                  disabled={createProfile.isPending}
                  className="text-muted-foreground text-sm"
                  data-testid="btn-skip-class"
                >
                  Skip
                </Button>
              )}
              <Button
                onClick={nextStep}
                disabled={createProfile.isPending}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                data-testid="btn-next-step"
              >
                {isLastStep ? (createProfile.isPending ? "Setting up..." : "Start Learning") : "Continue"}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
