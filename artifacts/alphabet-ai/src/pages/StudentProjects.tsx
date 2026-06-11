import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListStudentProjects,
  useGetStudentProject,
  useSaveStudentSubmission,
  getGetStudentProjectQueryKey,
} from "@workspace/api-client-react";
import type { GroupProject, StudentProjectSummary } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, PenLine, BookOpen, Search, MessageCircle,
  Users, Calendar, CheckCircle, MessageSquare, Loader2,
  Save, Send, Star, FolderOpen, Clock,
} from "lucide-react";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; bg: string; label: string }> = {
  writing:    { icon: PenLine,       color: "text-violet-600 dark:text-violet-400",  bg: "bg-violet-50 dark:bg-violet-900/20",    label: "Writing" },
  reading:    { icon: BookOpen,      color: "text-blue-600 dark:text-blue-400",      bg: "bg-blue-50 dark:bg-blue-900/20",        label: "Reading" },
  research:   { icon: Search,        color: "text-emerald-600 dark:text-emerald-400",bg: "bg-emerald-50 dark:bg-emerald-900/20",  label: "Research" },
  discussion: { icon: MessageCircle, color: "text-orange-600 dark:text-orange-400",  bg: "bg-orange-50 dark:bg-orange-900/20",    label: "Discussion" },
};

function formatDue(dt: string | null | undefined) {
  if (!dt) return null;
  const d = new Date(dt);
  const diff = Math.ceil((d.getTime() - Date.now()) / 86400000);
  if (diff < 0) return `Overdue (${new Date(dt).toLocaleDateString(undefined, { month: "short", day: "numeric" })})`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `Due ${new Date(dt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

function WordCount({ text }: { text: string }) {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return <span className="text-xs text-muted-foreground">{words} word{words !== 1 ? "s" : ""}</span>;
}

export default function StudentProjects() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: projectList = [], isLoading } = useListStudentProjects();
  const { data: detail, isLoading: detailLoading } = useGetStudentProject(selectedId ?? "", {
    query: { queryKey: getGetStudentProjectQueryKey(selectedId ?? ""), enabled: !!selectedId },
  });
  const saveSubmission = useSaveStudentSubmission();

  // When we load a project detail, populate draft with the current submission content
  useEffect(() => {
    if (detail) {
      const sub = (detail.group as any)?.submission;
      setDraft(sub?.content ?? "");
      setLastSaved(null);
    }
  }, [detail?.group?.id]);

  // Auto-save with 2s debounce
  useEffect(() => {
    if (!selectedId || !detail) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    const sub = (detail.group as any)?.submission;
    if (draft === (sub?.content ?? "") && !lastSaved) return; // unchanged from server
    autoSaveRef.current = setTimeout(() => handleSave(false), 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [draft]);

  async function handleSave(isSubmit: boolean) {
    if (!selectedId) return;
    setIsSaving(true);
    try {
      await saveSubmission.mutateAsync({ projectId: selectedId, data: { content: draft, submitted: isSubmit || undefined } });
      await qc.invalidateQueries({ queryKey: getGetStudentProjectQueryKey(selectedId) });
      setLastSaved(new Date());
      if (isSubmit) {
        toast({ title: "Submitted! 🎉", description: "Your teacher will review your work." });
        setShowSubmitConfirm(false);
      }
    } catch {
      if (isSubmit) toast({ title: "Submit failed", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  }

  const projects = projectList as StudentProjectSummary[];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {/* Project Detail / Writing Workspace */}
          {selectedId && (
            <motion.div key={`workspace-${selectedId}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => { setSelectedId(null); setDraft(""); setLastSaved(null); }}>
                <ArrowLeft className="w-4 h-4" /> Back to Projects
              </Button>

              {detailLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : detail ? (
                <div className="space-y-5">
                  {/* Project header */}
                  {(() => {
                    const p = detail.project as GroupProject;
                    const meta = TYPE_META[p.type] ?? TYPE_META.writing;
                    const Icon = meta.icon;
                    const sub = (detail.group as any)?.submission;
                    const isSubmitted = !!(sub?.submittedAt);
                    const hasFeedback = !!(sub?.feedback);
                    return (
                      <>
                        <div className={`rounded-2xl p-5 ${meta.bg}`}>
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`w-7 h-7 rounded-lg flex items-center justify-center bg-white/60 dark:bg-black/20 ${meta.color}`}>
                                  <Icon className="w-4 h-4" />
                                </span>
                                <h1 className="text-lg font-bold">{p.title}</h1>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                                <span>{meta.label}</span>
                                {p.gradeLevel && <><span>·</span><span>Grade {p.gradeLevel}</span></>}
                                {formatDue(p.dueDate) && <><span>·</span><span className={`flex items-center gap-0.5 ${formatDue(p.dueDate)?.startsWith("Overdue") ? "text-red-500" : ""}`}><Calendar className="w-3 h-3" />{formatDue(p.dueDate)}</span></>}
                                <span>·</span>
                                <span className="flex items-center gap-0.5"><Users className="w-3 h-3" /> {detail.group.name}</span>
                              </div>
                            </div>
                            <div className="flex gap-1.5 shrink-0">
                              {isSubmitted && (
                                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  <CheckCircle className="w-3 h-3" /> Submitted
                                </span>
                              )}
                              {hasFeedback && (
                                <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                                  <Star className="w-3 h-3" /> Feedback
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Prompt card */}
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-5">
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Prompt</p>
                            <p className="text-sm leading-relaxed">{p.prompt}</p>
                            {p.rubric && (
                              <details className="mt-3">
                                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors">View rubric</summary>
                                <p className="mt-2 text-xs text-muted-foreground leading-relaxed">{p.rubric}</p>
                              </details>
                            )}
                          </CardContent>
                        </Card>

                        {/* Group members */}
                        {(detail.groupMemberNames as string[]).length > 0 && (
                          <div className="flex items-center gap-2">
                            <Users className="w-3.5 h-3.5 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">
                              Your group: <span className="font-medium text-foreground">{(detail.groupMemberNames as string[]).join(", ")}</span>
                            </p>
                          </div>
                        )}

                        {/* Teacher Feedback */}
                        {hasFeedback && (
                          <Card className="border-0 shadow-sm border-l-4 border-l-blue-400">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-1.5 mb-2">
                                <MessageSquare className="w-4 h-4 text-blue-500" />
                                <p className="text-sm font-semibold">Teacher Feedback</p>
                              </div>
                              <p className="text-sm leading-relaxed text-muted-foreground">{sub.feedback}</p>
                            </CardContent>
                          </Card>
                        )}

                        {/* Writing area */}
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Your Group's Response</p>
                              <div className="flex items-center gap-3">
                                <WordCount text={draft} />
                                {isSaving && <span className="text-xs text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving…</span>}
                                {!isSaving && lastSaved && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" /> Saved {lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                              </div>
                            </div>
                            <Textarea
                              rows={14}
                              className="resize-none font-[var(--font-serif,Georgia,serif)] text-sm leading-relaxed"
                              placeholder="Start writing your group's response here. Your work is auto-saved as you type…"
                              value={draft}
                              onChange={(e) => setDraft(e.target.value)}
                              disabled={p.status === "closed"}
                            />
                            {p.status === "closed" ? (
                              <p className="text-xs text-muted-foreground text-center">This project is closed. Submissions are no longer accepted.</p>
                            ) : (
                              <div className="flex items-center gap-2 justify-end">
                                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => handleSave(false)} disabled={isSaving}>
                                  <Save className="w-3.5 h-3.5" /> Save Draft
                                </Button>
                                {!showSubmitConfirm ? (
                                  <Button size="sm" className="gap-1.5" onClick={() => setShowSubmitConfirm(true)} disabled={!draft.trim()}>
                                    <Send className="w-3.5 h-3.5" /> Submit
                                  </Button>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <p className="text-xs text-muted-foreground">Submit for your whole group?</p>
                                    <Button size="sm" className="gap-1 bg-green-600 hover:bg-green-700 text-white h-7 text-xs" onClick={() => handleSave(true)} disabled={isSaving}>
                                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle className="w-3 h-3" />} Yes, Submit
                                    </Button>
                                    <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowSubmitConfirm(false)}>No</Button>
                                  </div>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">Project not found.</div>
              )}
            </motion.div>
          )}

          {/* Project List */}
          {!selectedId && (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-1">My Projects</h1>
                <p className="text-sm text-muted-foreground">Collaborative assignments from your teacher</p>
              </div>

              {isLoading && (
                <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              )}

              {!isLoading && projects.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                    <FolderOpen className="w-8 h-8 text-violet-500" />
                  </div>
                  <h2 className="text-lg font-semibold mb-1">No projects yet</h2>
                  <p className="text-sm text-muted-foreground max-w-xs">Your teacher will assign group projects here. Check back soon!</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((item) => {
                  const p = item.project as GroupProject;
                  const meta = TYPE_META[p.type] ?? TYPE_META.writing;
                  const Icon = meta.icon;
                  const sub = (item.group as any)?.submission;
                  const isSubmitted = !!(sub?.submittedAt);
                  const hasFeedback = item.hasFeedback;
                  const due = formatDue(p.dueDate);
                  const isOverdue = due?.startsWith("Overdue");

                  return (
                    <motion.div key={p.id} whileHover={{ y: -2 }} transition={{ duration: 0.15 }}>
                      <Card
                        className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full"
                        onClick={() => setSelectedId(p.id)}
                      >
                        <CardContent className="p-5 flex flex-col h-full gap-3">
                          <div className="flex items-start gap-3">
                            <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                              <Icon className="w-4.5 h-4.5" />
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold leading-snug">{p.title}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{meta.label}{p.gradeLevel ? ` · Grade ${p.gradeLevel}` : ""}</p>
                            </div>
                          </div>

                          <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{p.prompt}</p>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isSubmitted ? (
                              <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800 gap-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Submitted
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] gap-1">
                                <PenLine className="w-2.5 h-2.5" /> In Progress
                              </Badge>
                            )}
                            {hasFeedback && (
                              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800 gap-1">
                                <Star className="w-2.5 h-2.5" /> Feedback
                              </Badge>
                            )}
                            {due && (
                              <span className={`text-[10px] ml-auto flex items-center gap-0.5 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                                <Calendar className="w-2.5 h-2.5" /> {due}
                              </span>
                            )}
                          </div>

                          {item.group && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground border-t border-border pt-2.5">
                              <Users className="w-3 h-3" />
                              <span>{item.group.name} · {item.group.memberIds.length} members</span>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
