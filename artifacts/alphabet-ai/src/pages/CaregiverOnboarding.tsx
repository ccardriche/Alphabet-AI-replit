import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Heart, Link2, ChevronRight, AlertCircle, Loader2, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpsertCaregiverProfile } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const RELATIONSHIPS = [
  { id: "parent", label: "Parent" },
  { id: "guardian", label: "Guardian" },
  { id: "grandparent", label: "Grandparent" },
  { id: "other", label: "Other Family" },
];

export default function CaregiverOnboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<"relationship" | "link">("relationship");
  const [relationship, setRelationship] = useState("parent");
  const [studentCode, setStudentCode] = useState("");
  const [error, setError] = useState("");

  const upsert = useUpsertCaregiverProfile();

  async function handleRelationshipNext() {
    setStep("link");
  }

  async function handleLink() {
    setError("");
    const code = studentCode.trim();
    if (code.length < 6) {
      setError("Student code must be at least 6 characters.");
      return;
    }
    try {
      await upsert.mutateAsync({ data: { relationship, studentCode: code } });
      setLocation("/caregiver");
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? "Could not link student. Check the code and try again.";
      setError(msg);
    }
  }

  async function handleSkip() {
    try {
      await upsert.mutateAsync({ data: { relationship } });
      setLocation("/caregiver");
    } catch {
      toast({ title: "Could not save profile", variant: "destructive" });
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-950 via-purple-950 to-slate-950 text-white flex items-center justify-center p-6">
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: "radial-gradient(circle at 30% 20%, #f43f5e 0%, transparent 50%), radial-gradient(circle at 70% 80%, #8b5cf6 0%, transparent 50%)"
      }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-2.5 mb-10"
        >
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-400 to-purple-400 flex items-center justify-center">
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-lg">Alphabet AI</span>
        </motion.div>

        {step === "relationship" && (
          <motion.div
            key="rel"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center mb-5">
                <Heart className="w-7 h-7 text-rose-400" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2">Welcome, Family!</h1>
              <p className="text-slate-300">Help us personalize your experience. What is your relationship to the student?</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {RELATIONSHIPS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setRelationship(r.id)}
                  className={cn(
                    "py-4 rounded-xl border text-sm font-medium transition-all",
                    relationship === r.id
                      ? "bg-rose-500/20 border-rose-400 text-rose-300 ring-1 ring-rose-400"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <Button
              onClick={handleRelationshipNext}
              className="w-full bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white font-semibold gap-2"
              size="lg"
            >
              Continue <ChevronRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === "link" && (
          <motion.div
            key="link"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="mb-8">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center mb-5">
                <Link2 className="w-7 h-7 text-purple-400" />
              </div>
              <h1 className="text-3xl font-extrabold mb-2">Link Your Student</h1>
              <p className="text-slate-300">Enter the student's 8-character code — found in their Alphabet AI dashboard under their name.</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <Label className="text-slate-300 text-sm mb-1.5 block">Student Code</Label>
                <Input
                  placeholder="e.g. A3F91B2C"
                  value={studentCode}
                  onChange={(e) => { setStudentCode(e.target.value.toUpperCase()); setError(""); }}
                  className="bg-white/10 border-white/20 text-white placeholder:text-slate-500 text-center tracking-widest font-mono text-lg h-12 uppercase"
                  maxLength={12}
                  autoCapitalize="characters"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setStep("relationship")}
                className="border-white/20 text-slate-300 hover:bg-white/10 hover:text-white"
              >
                Back
              </Button>
              <Button
                onClick={handleLink}
                disabled={upsert.isPending || studentCode.trim().length < 6}
                className="flex-1 bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600 text-white font-semibold gap-2"
              >
                {upsert.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Linking…</> : <>Link Student <ChevronRight className="w-4 h-4" /></>}
              </Button>
            </div>

            <button
              onClick={handleSkip}
              className="w-full mt-4 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              Skip for now — I'll add the code later
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
