import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateExercise, useListSkills } from "@workspace/api-client-react";
import { Dumbbell, Loader2, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GRADE_OPTIONS, DOMAIN_COLORS } from "@/lib/constants";
import Layout from "@/components/Layout";

const schema = z.object({
  skillCode: z.string().min(1, "Select a skill"),
  gradeLevel: z.string().min(1),
  count: z.coerce.number().min(1).max(10),
});

type FormData = z.infer<typeof schema>;

export default function ExerciseGenerator() {
  const { toast } = useToast();
  const [exercises, setExercises] = useState<any[]>([]);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [gradeFilter, setGradeFilter] = useState("5th");

  const generateExercise = useGenerateExercise();
  const { data: skills, isLoading: skillsLoading } = useListSkills({ gradeLevel: gradeFilter });

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { skillCode: "", gradeLevel: "5th", count: 5 },
  });

  async function onSubmit(data: FormData) {
    try {
      const result = await generateExercise.mutateAsync({ data });
      setExercises(result);
      setRevealed({});
      toast({ title: `${result.length} exercises generated!` });
    } catch {
      toast({ title: "Failed to generate exercises", variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Exercise Generator</h1>
          <p className="text-sm text-muted-foreground">Generate AI-powered practice sets for any ELA skill.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Settings */}
          <Card className="border-0 shadow-sm lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <Label>Grade Filter</Label>
                  <Select onValueChange={(v) => { setGradeFilter(v); form.setValue("gradeLevel", v); }} defaultValue="5th">
                    <SelectTrigger className="mt-1.5" data-testid="select-exercise-grade">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Skill</Label>
                  <Select onValueChange={(v) => form.setValue("skillCode", v)} disabled={skillsLoading}>
                    <SelectTrigger className="mt-1.5" data-testid="select-skill">
                      <SelectValue placeholder={skillsLoading ? "Loading..." : "Select a skill"} />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {skills?.map((s) => {
                        const color = DOMAIN_COLORS[s.domainCode] ?? "#6b7280";
                        return (
                          <SelectItem key={s.skillCode} value={s.skillCode}>
                            <span className="flex items-center gap-2">
                              <span className="w-4 h-4 rounded text-white text-[9px] font-bold flex items-center justify-center shrink-0" style={{ backgroundColor: color }}>{s.domainCode}</span>
                              <span className="truncate">{s.skillName}</span>
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {form.formState.errors.skillCode && <p className="text-xs text-destructive mt-1">{form.formState.errors.skillCode.message}</p>}
                </div>

                <div>
                  <Label>Number of Exercises</Label>
                  <Input type="number" min={1} max={10} {...form.register("count")} className="mt-1.5" data-testid="input-exercise-count" />
                </div>

                <Button
                  type="submit"
                  disabled={generateExercise.isPending}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                  data-testid="btn-generate-exercises"
                >
                  {generateExercise.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Dumbbell className="w-4 h-4" /> Generate Exercises</>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Exercises */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {exercises.length === 0 ? (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                  <Dumbbell className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">Generated exercises will appear here</p>
                </div>
              ) : exercises.map((ex, i) => (
                <motion.div key={ex.id ?? i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                        <span className="text-xs text-indigo-600 font-medium">{ex.skillName}</span>
                        <span className="ml-auto text-xs text-muted-foreground">Diff: {ex.difficulty?.toFixed(1)}</span>
                      </div>

                      {ex.passage && (
                        <div className="bg-gray-50 rounded-lg p-3 mb-3 text-sm text-gray-700 leading-relaxed border border-gray-100">
                          {ex.passage}
                        </div>
                      )}

                      <p className="text-sm font-medium mb-3">{ex.questionText}</p>

                      <div className="space-y-1.5">
                        {ex.options?.map((opt: any) => {
                          const isCorrect = opt.id === ex.correctOptionId;
                          const isRevealedQ = revealed[ex.id ?? i];
                          return (
                            <div
                              key={opt.id}
                              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-colors ${
                                isRevealedQ
                                  ? isCorrect ? "border-green-400 bg-green-50 text-green-800" : "border-gray-100 text-gray-500"
                                  : "border-gray-100"
                              }`}
                            >
                              {isRevealedQ && isCorrect && <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />}
                              {isRevealedQ && !isCorrect && <XCircle className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                              {opt.text}
                            </div>
                          );
                        })}
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-3 text-xs"
                        onClick={() => setRevealed((r) => ({ ...r, [ex.id ?? i]: !r[ex.id ?? i] }))}
                        data-testid={`btn-reveal-${i}`}
                      >
                        {revealed[ex.id ?? i] ? "Hide" : "Show"} Answer
                      </Button>

                      {revealed[ex.id ?? i] && ex.explanation && (
                        <p className="mt-2 text-xs text-muted-foreground italic">{ex.explanation}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
