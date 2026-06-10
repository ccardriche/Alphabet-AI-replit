import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateLesson, useListLessons } from "@workspace/api-client-react";
import { Upload, BookOpen, MessageSquare, PenTool, BookMarked, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GRADE_OPTIONS, DOMAIN_LABELS } from "@/lib/constants";
import Layout from "@/components/Layout";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  text: z.string().min(50, "Please paste at least 50 characters of text"),
  gradeLevel: z.string().min(1),
  domain: z.string().min(1),
  standardCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export default function BookUpload() {
  const { toast } = useToast();
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);
  const generateLesson = useGenerateLesson();
  const { data: lessons } = useListLessons();

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", text: "", gradeLevel: "5th", domain: "RL", standardCode: "" },
  });

  async function onSubmit(data: FormData) {
    try {
      const lesson = await generateLesson.mutateAsync({ data });
      setGeneratedLesson(lesson);
      toast({ title: "Lesson generated successfully!" });
    } catch {
      toast({ title: "Failed to generate lesson", variant: "destructive" });
    }
  }

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Book Upload & Lesson Generator</h1>
          <p className="text-sm text-muted-foreground">Paste book or article text to generate a framing lesson, discussion questions, writing prompts, and vocabulary.</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-3">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Book / Article Title</Label>
                    <Input id="title" placeholder="e.g. Roll of Thunder, Hear My Cry" {...form.register("title")} className="mt-1.5" data-testid="input-book-title" />
                    {form.formState.errors.title && <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Grade Level</Label>
                      <Select onValueChange={(v) => form.setValue("gradeLevel", v)} defaultValue="5th">
                        <SelectTrigger className="mt-1.5" data-testid="select-grade">
                          <SelectValue placeholder="Grade" />
                        </SelectTrigger>
                        <SelectContent>
                          {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Domain</Label>
                      <Select onValueChange={(v) => form.setValue("domain", v)} defaultValue="RL">
                        <SelectTrigger className="mt-1.5" data-testid="select-domain">
                          <SelectValue placeholder="Domain" />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(DOMAIN_LABELS).map(([code, label]) => (
                            <SelectItem key={code} value={code}>{code} — {label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="standardCode">Standard Code (optional)</Label>
                    <Input id="standardCode" placeholder="e.g. ELAGSE5RL3" {...form.register("standardCode")} className="mt-1.5" />
                  </div>

                  <div>
                    <Label htmlFor="text">Book / Article Text</Label>
                    <Textarea
                      id="text"
                      placeholder="Paste the relevant passage or chapter here..."
                      {...form.register("text")}
                      className="mt-1.5 min-h-[180px] font-mono text-sm"
                      data-testid="input-book-text"
                    />
                    {form.formState.errors.text && <p className="text-xs text-destructive mt-1">{form.formState.errors.text.message}</p>}
                  </div>

                  <Button
                    type="submit"
                    disabled={generateLesson.isPending}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                    data-testid="btn-generate-lesson"
                  >
                    {generateLesson.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating Lesson...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Generate Lesson</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Output */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence>
              {generatedLesson && (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check className="w-4 h-4" /> Lesson Generated
                  </div>

                  {generatedLesson.framingLesson && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" /> Framing Lesson</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{generatedLesson.framingLesson}</p>
                      </CardContent>
                    </Card>
                  )}

                  {generatedLesson.discussionQuestions?.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="w-4 h-4 text-cyan-500" /> Discussion Questions</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ol className="space-y-1.5 list-decimal list-inside">
                          {generatedLesson.discussionQuestions.map((q: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground">{q}</li>
                          ))}
                        </ol>
                      </CardContent>
                    </Card>
                  )}

                  {generatedLesson.writingPrompts?.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2"><PenTool className="w-4 h-4 text-emerald-500" /> Writing Prompts</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-1.5">
                          {generatedLesson.writingPrompts.map((p: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2"><span className="text-emerald-500 shrink-0">•</span>{p}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {generatedLesson.vocabularyList?.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center gap-2"><BookMarked className="w-4 h-4 text-purple-500" /> Vocabulary</CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {generatedLesson.vocabularyList.map((word: string) => (
                            <span key={word} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100">{word}</span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!generatedLesson && (
              <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center">
                <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                <p className="text-sm text-muted-foreground">Your generated lesson will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
