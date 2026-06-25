import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { useGenerateLesson, useListLessons } from "@workspace/api-client-react";
import {
  Upload, BookOpen, MessageSquare, PenTool, BookMarked, Loader2, Check,
  ClipboardCopy, CheckCheck, FileText, HelpCircle, FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GRADE_OPTIONS, DOMAIN_LABELS } from "@/lib/constants";
import { apiUrl } from "@/lib/api-url";
import Layout from "@/components/Layout";

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  text: z.string().min(50, "Please paste or upload at least 50 characters of text"),
  gradeLevel: z.string().min(1),
  domain: z.string().min(1),
  standardCode: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }
  return (
    <button
      onClick={handleCopy}
      title={`Copy ${label ?? "to clipboard"}`}
      className="text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <ClipboardCopy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function BookUpload() {
  const { toast } = useToast();
  const [generatedLesson, setGeneratedLesson] = useState<any>(null);
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({});
  const [parsingFile, setParsingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
      setRevealedAnswers({});
      toast({ title: "Lesson generated successfully!" });
    } catch {
      toast({ title: "Failed to generate lesson", variant: "destructive" });
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isTxt = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPdf && !isTxt) {
      toast({
        title: "Unsupported file type",
        description: "Please upload a PDF (.pdf) or plain text (.txt) file.",
        variant: "destructive",
      });
      return;
    }

    if (isTxt) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const content = ev.target?.result as string;
        form.setValue("text", content, { shouldValidate: true });
        if (!form.getValues("title") && file.name) {
          form.setValue("title", file.name.replace(/\.txt$/i, "").replace(/[-_]/g, " "));
        }
        toast({ title: `Loaded "${file.name}"` });
      };
      reader.readAsText(file);
      return;
    }

    // PDF: send to server for text extraction
    setParsingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(apiUrl("/api/llm/parse-pdf"), {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to parse PDF" }));
        throw new Error(err.error ?? "Failed to parse PDF");
      }
      const { text } = await res.json();
      form.setValue("text", text, { shouldValidate: true });
      if (!form.getValues("title") && file.name) {
        form.setValue("title", file.name.replace(/\.pdf$/i, "").replace(/[-_]/g, " "));
      }
      toast({ title: `Extracted text from "${file.name}"`, description: `${text.length.toLocaleString()} characters loaded.` });
    } catch (err: any) {
      toast({
        title: "PDF extraction failed",
        description: err?.message ?? "Try copying and pasting the text directly.",
        variant: "destructive",
      });
    } finally {
      setParsingFile(false);
    }
  }

  const practiceQs: any[] = generatedLesson?.practiceQuestions ?? [];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Book Upload &amp; Lesson Generator</h1>
          <p className="text-sm text-muted-foreground">
            Upload a .txt file or paste text to generate a framing lesson, discussion questions, writing prompts, vocabulary, and 5 aligned practice questions.
          </p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <Label htmlFor="title">Book / Article Title</Label>
                    <Input
                      id="title"
                      placeholder="e.g. Roll of Thunder, Hear My Cry"
                      {...form.register("title")}
                      className="mt-1.5"
                      data-testid="input-book-title"
                    />
                    {form.formState.errors.title && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.title.message}</p>
                    )}
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
                    <Input
                      id="standardCode"
                      placeholder="e.g. ELAGSE5RL3"
                      {...form.register("standardCode")}
                      className="mt-1.5"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label htmlFor="text">Book / Article Text</Label>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={parsingFile}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50"
                        data-testid="btn-upload-file"
                      >
                        {parsingFile
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Extracting PDF...</>
                          : <><FileUp className="w-3.5 h-3.5" /> Upload PDF or .txt</>
                        }
                      </button>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.txt,application/pdf,text/plain"
                      className="hidden"
                      onChange={handleFileChange}
                      data-testid="input-file-upload"
                    />
                    <Textarea
                      id="text"
                      placeholder="Paste a passage or chapter here — or click 'Upload PDF or .txt' above to load a file directly."
                      {...form.register("text")}
                      className="min-h-[180px] font-mono text-sm"
                      data-testid="input-book-text"
                    />
                    {form.formState.errors.text && (
                      <p className="text-xs text-destructive mt-1">{form.formState.errors.text.message}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    disabled={generateLesson.isPending}
                    className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
                    data-testid="btn-generate-lesson"
                  >
                    {generateLesson.isPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                    ) : (
                      <><Upload className="w-4 h-4" /> Generate Lesson</>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Past lessons sidebar */}
            {lessons && lessons.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Recent Lessons</p>
                <div className="space-y-1">
                  {lessons.slice(0, 5).map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setGeneratedLesson(l)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-muted/50 transition-colors border border-transparent hover:border-gray-200"
                    >
                      <p className="font-medium truncate">{l.title}</p>
                      <p className="text-xs text-muted-foreground">{l.gradeLevel} · {l.domain}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Output */}
          <div className="lg:col-span-3 space-y-4">
            <AnimatePresence>
              {generatedLesson ? (
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                  <div className="flex items-center gap-2 text-green-600 text-sm font-medium">
                    <Check className="w-4 h-4" /> Lesson Generated — {generatedLesson.title}
                  </div>

                  {generatedLesson.framingLesson && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><BookOpen className="w-4 h-4 text-blue-500" /> Framing Lesson</span>
                          <CopyButton text={generatedLesson.framingLesson} label="framing lesson" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground leading-relaxed">{generatedLesson.framingLesson}</p>
                      </CardContent>
                    </Card>
                  )}

                  {generatedLesson.discussionQuestions?.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-cyan-500" /> Discussion Questions</span>
                          <CopyButton text={generatedLesson.discussionQuestions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")} label="discussion questions" />
                        </CardTitle>
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
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><PenTool className="w-4 h-4 text-emerald-500" /> Writing Prompts</span>
                          <CopyButton text={generatedLesson.writingPrompts.map((p: string, i: number) => `${i + 1}. ${p}`).join("\n")} label="writing prompts" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <ul className="space-y-1.5">
                          {generatedLesson.writingPrompts.map((p: string, i: number) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-emerald-500 shrink-0">•</span>{p}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {generatedLesson.vocabularyList?.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2"><BookMarked className="w-4 h-4 text-purple-500" /> Vocabulary</span>
                          <CopyButton text={generatedLesson.vocabularyList.join(", ")} label="vocabulary" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          {generatedLesson.vocabularyList.map((word: string) => (
                            <span key={word} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full text-xs font-medium border border-purple-100">
                              {word}
                            </span>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Practice Questions */}
                  {practiceQs.length > 0 && (
                    <Card className="border-0 shadow-sm">
                      <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="flex items-center gap-2">
                            <HelpCircle className="w-4 h-4 text-indigo-500" />
                            Aligned Practice Questions ({practiceQs.length})
                          </span>
                          <CopyButton
                            text={practiceQs.map((q: any, i: number) =>
                              `${i + 1}. ${q.questionText}\n${(q.options ?? []).map((o: any) => `   ${o.id.toUpperCase()}. ${o.text}`).join("\n")}\nAnswer: ${q.correctOptionId?.toUpperCase()}\n${q.explanation}`
                            ).join("\n\n")}
                            label="practice questions"
                          />
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-4 pb-4 space-y-4">
                        {practiceQs.map((q: any, i: number) => (
                          <div key={i} className="border border-gray-100 rounded-xl p-3">
                            <p className="text-sm font-medium mb-2">{i + 1}. {q.questionText}</p>
                            <div className="space-y-1 mb-2">
                              {(q.options ?? []).map((opt: any) => {
                                const isCorrect = opt.id === q.correctOptionId;
                                const revealed = revealedAnswers[i];
                                return (
                                  <div
                                    key={opt.id}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                                      revealed
                                        ? isCorrect
                                          ? "border-green-300 bg-green-50 text-green-800"
                                          : "border-gray-100 text-gray-400"
                                        : "border-gray-100"
                                    }`}
                                  >
                                    <span className="font-bold w-4 shrink-0">{opt.id.toUpperCase()}.</span>
                                    {opt.text}
                                  </div>
                                );
                              })}
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-xs h-7 px-2"
                                onClick={() => setRevealedAnswers((r) => ({ ...r, [i]: !r[i] }))}
                              >
                                {revealedAnswers[i] ? "Hide" : "Show"} Answer
                              </Button>
                              {revealedAnswers[i] && q.explanation && (
                                <p className="text-xs text-muted-foreground italic flex-1">{q.explanation}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </motion.div>
              ) : (
                <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-12 text-center">
                  <BookOpen className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground">Your generated lesson will appear here</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Includes framing lesson, discussion questions, writing prompts, vocabulary, and 5 practice questions
                  </p>
                </div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Layout>
  );
}
