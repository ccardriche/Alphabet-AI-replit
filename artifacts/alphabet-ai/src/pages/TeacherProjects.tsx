import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  useListTeacherProjects,
  useCreateProject,
  useGetTeacherProject,
  useCreateProjectGroup,
  useSaveGroupFeedback,
  useUpdateProject,
  useListTeacherClasses,
  useListClassStudents,
  getListTeacherProjectsQueryKey,
  getGetTeacherProjectQueryKey,
  getListClassStudentsQueryKey,
} from "@workspace/api-client-react";
import type { GroupProject, ProjectGroupWithMembers } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { useSelectedClass } from "@/contexts/SelectedClassContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Plus, PenLine, BookOpen, Search, MessageCircle, ChevronRight,
  Users, Check, X, AlertCircle, Loader2, FolderOpen, Calendar,
  Star, MessageSquare, GraduationCap,
} from "lucide-react";

const TYPE_META: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  writing:    { icon: PenLine,       color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", label: "Writing" },
  reading:    { icon: BookOpen,      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",         label: "Reading" },
  research:   { icon: Search,        color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", label: "Research" },
  discussion: { icon: MessageCircle, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", label: "Discussion" },
};

const STATUS_CHIP: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  draft:  "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  closed: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300",
};

const GROUP_COLORS = ["#ef4444","#f97316","#eab308","#22c55e","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

function formatDue(dt: string | null | undefined) {
  if (!dt) return null;
  return new Date(dt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function TeacherProjects() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "new-project" | "add-group" | "feedback">("none");
  const [feedbackGroupId, setFeedbackGroupId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");

  // New project form state
  const [npForm, setNpForm] = useState({ title: "", type: "writing", prompt: "", description: "", rubric: "", dueDate: "", gradeLevel: "", status: "active" });

  // New group form state
  const [ngName, setNgName] = useState("");
  const [ngColor, setNgColor] = useState(GROUP_COLORS[0]);
  const [ngSelectedStudents, setNgSelectedStudents] = useState<string[]>([]);

  const { data: projects = [], isLoading } = useListTeacherProjects();
  const { data: detail, isLoading: detailLoading } = useGetTeacherProject(selectedId ?? "", {
    query: { queryKey: getGetTeacherProjectQueryKey(selectedId ?? ""), enabled: !!selectedId },
  });
  const { data: classes = [] } = useListTeacherClasses();
  const { selectedClassId, setSelectedClassId } = useSelectedClass();
  const classId = selectedClassId ?? (classes as any[])[0]?.id ?? "";
  const { data: students = [] } = useListClassStudents(classId, {
    query: { queryKey: getListClassStudentsQueryKey(classId), enabled: !!classId },
  });

  const createProject = useCreateProject();
  const createGroup = useCreateProjectGroup();
  const saveFeedback = useSaveGroupFeedback();
  const updateProject = useUpdateProject();

  const invalidateProjects = () => qc.invalidateQueries({ queryKey: getListTeacherProjectsQueryKey() });
  const invalidateDetail = () => selectedId && qc.invalidateQueries({ queryKey: getGetTeacherProjectQueryKey(selectedId) });

  async function handleCreateProject() {
    if (!npForm.title.trim() || !npForm.prompt.trim()) {
      toast({ title: "Title and prompt are required", variant: "destructive" }); return;
    }
    try {
      const p = await createProject.mutateAsync({ data: { ...npForm, classId: classId || undefined } as any });
      await invalidateProjects();
      setSelectedId((p as GroupProject).id);
      setPanel("none");
      setNpForm({ title: "", type: "writing", prompt: "", description: "", rubric: "", dueDate: "", gradeLevel: "", status: "active" });
      toast({ title: "Project created!" });
    } catch { toast({ title: "Failed to create project", variant: "destructive" }); }
  }

  async function handleCreateGroup() {
    if (!selectedId || !ngName.trim() || ngSelectedStudents.length === 0) {
      toast({ title: "Name and at least one student required", variant: "destructive" }); return;
    }
    try {
      await createGroup.mutateAsync({ projectId: selectedId, data: { name: ngName, color: ngColor, studentIds: ngSelectedStudents } });
      await invalidateDetail();
      setPanel("none");
      setNgName(""); setNgSelectedStudents([]);
      toast({ title: "Group added!" });
    } catch { toast({ title: "Failed to add group", variant: "destructive" }); }
  }

  async function handleSaveFeedback() {
    if (!selectedId || !feedbackGroupId || !feedbackText.trim()) return;
    try {
      await saveFeedback.mutateAsync({ projectId: selectedId, groupId: feedbackGroupId, data: { feedback: feedbackText } });
      await invalidateDetail();
      setPanel("none"); setFeedbackText(""); setFeedbackGroupId(null);
      toast({ title: "Feedback saved!" });
    } catch { toast({ title: "Failed to save feedback", variant: "destructive" }); }
  }

  async function toggleStatus(p: GroupProject) {
    const next = p.status === "active" ? "closed" : "active";
    await updateProject.mutateAsync({ projectId: p.id, data: { status: next } });
    await invalidateProjects();
    await invalidateDetail();
  }

  const selectedProject = detail?.project;
  const groups: ProjectGroupWithMembers[] = (detail?.groups ?? []) as ProjectGroupWithMembers[];

  return (
    <Layout>
      <div className="flex h-full min-h-screen">
        {/* LEFT: project list */}
        <aside className="w-72 shrink-0 border-r border-border bg-background flex flex-col">
          <div className="p-4 border-b border-border space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-sm">Group Projects</h2>
              <Button size="sm" className="gap-1.5 h-7 text-xs" onClick={() => { setPanel("new-project"); }}>
                <Plus className="w-3 h-3" /> New
              </Button>
            </div>
            {(classes as any[]).length > 1 && (
              <Select
                value={classId}
                onValueChange={(v) => setSelectedClassId(v)}
              >
                <SelectTrigger className="h-8 text-xs w-full" data-testid="select-class-projects">
                  <GraduationCap className="w-3.5 h-3.5 mr-1.5 shrink-0 text-muted-foreground" />
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {(classes as any[]).map((cls: any) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs">
                      {cls.className}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading && (
              <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
            )}
            {!isLoading && (projects as GroupProject[]).length === 0 && (
              <div className="text-center py-10 px-4">
                <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">No projects yet. Create one to get started.</p>
              </div>
            )}
            {(projects as GroupProject[]).map((p) => {
              const meta = TYPE_META[p.type] ?? TYPE_META.writing;
              const Icon = meta.icon;
              return (
                <button
                  key={p.id}
                  onClick={() => { setSelectedId(p.id); setPanel("none"); }}
                  className={`w-full text-left rounded-lg px-3 py-2.5 transition-colors hover:bg-accent/60 ${selectedId === p.id ? "bg-accent" : ""}`}
                >
                  <div className="flex items-start gap-2.5">
                    <span className={`mt-0.5 w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${meta.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.title}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_CHIP[p.status]}`}>{p.status}</span>
                        {formatDue(p.dueDate) && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Calendar className="w-2.5 h-2.5" /> {formatDue(p.dueDate)}
                          </span>
                        )}
                      </div>
                    </div>
                    {selectedId === p.id && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT: detail + panels */}
        <main className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* New Project Form */}
            {panel === "new-project" && (
              <motion.div key="new-project" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">New Group Project</h1>
                    <Button variant="ghost" size="sm" onClick={() => setPanel("none")}><X className="w-4 h-4" /></Button>
                  </div>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2 space-y-1.5">
                          <Label>Project Title *</Label>
                          <Input placeholder="e.g. Narrative Writing: My Story" value={npForm.title} onChange={(e) => setNpForm(f => ({ ...f, title: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Type</Label>
                          <Select value={npForm.type} onValueChange={(v) => setNpForm(f => ({ ...f, type: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="writing">Writing</SelectItem>
                              <SelectItem value="reading">Reading</SelectItem>
                              <SelectItem value="research">Research</SelectItem>
                              <SelectItem value="discussion">Discussion</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Grade Level</Label>
                          <Select value={npForm.gradeLevel} onValueChange={(v) => setNpForm(f => ({ ...f, gradeLevel: v }))}>
                            <SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger>
                            <SelectContent>
                              {["K","1","2","3","4","5","6","7","8"].map((g) => (
                                <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Due Date</Label>
                          <Input type="date" value={npForm.dueDate} onChange={(e) => setNpForm(f => ({ ...f, dueDate: e.target.value }))} />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Status</Label>
                          <Select value={npForm.status} onValueChange={(v) => setNpForm(f => ({ ...f, status: v }))}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="active">Active</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Prompt *</Label>
                          <Textarea rows={4} placeholder="Write a personal narrative about a time when you showed courage..." value={npForm.prompt} onChange={(e) => setNpForm(f => ({ ...f, prompt: e.target.value }))} />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label>Rubric <span className="text-muted-foreground text-xs">(optional)</span></Label>
                          <Textarea rows={3} placeholder="Strong opening, clear events, descriptive language, conclusion..." value={npForm.rubric} onChange={(e) => setNpForm(f => ({ ...f, rubric: e.target.value }))} />
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleCreateProject} disabled={createProject.isPending} className="gap-1.5">
                          {createProject.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Create Project
                        </Button>
                        <Button variant="outline" onClick={() => setPanel("none")}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Add Group Form */}
            {panel === "add-group" && selectedId && (
              <motion.div key="add-group" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <div className="max-w-lg mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Add Group</h1>
                    <Button variant="ghost" size="sm" onClick={() => setPanel("none")}><X className="w-4 h-4" /></Button>
                  </div>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-6 space-y-4">
                      <div className="space-y-1.5">
                        <Label>Group Name</Label>
                        <Input placeholder="e.g. Team Phoenix" value={ngName} onChange={(e) => setNgName(e.target.value)} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Group Color</Label>
                        <div className="flex gap-2 flex-wrap">
                          {GROUP_COLORS.map((c) => (
                            <button
                              key={c}
                              onClick={() => setNgColor(c)}
                              className={`w-7 h-7 rounded-full border-2 transition-transform ${ngColor === c ? "scale-125 border-foreground" : "border-transparent"}`}
                              style={{ backgroundColor: c }}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Select Students ({ngSelectedStudents.length} selected)</Label>
                        <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                          {(students as any[]).length === 0 && (
                            <p className="text-xs text-muted-foreground p-3">No students in class yet.</p>
                          )}
                          {(students as any[]).map((s: any) => (
                            <label key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={ngSelectedStudents.includes(s.id)}
                                onChange={(e) => setNgSelectedStudents(prev =>
                                  e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                                )}
                                className="rounded"
                              />
                              <span className="text-sm">{s.displayName}</span>
                              <span className="text-xs text-muted-foreground ml-auto">Grade {s.grade}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button onClick={handleCreateGroup} disabled={createGroup.isPending} className="gap-1.5">
                          {createGroup.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                          Create Group
                        </Button>
                        <Button variant="outline" onClick={() => setPanel("none")}>Cancel</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}

            {/* Feedback Form */}
            {panel === "feedback" && feedbackGroupId && (
              <motion.div key="feedback" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}>
                <div className="max-w-2xl mx-auto">
                  <div className="flex items-center justify-between mb-6">
                    <h1 className="text-xl font-bold">Give Feedback</h1>
                    <Button variant="ghost" size="sm" onClick={() => setPanel("none")}><X className="w-4 h-4" /></Button>
                  </div>
                  {(() => {
                    const grp = groups.find((g) => g.id === feedbackGroupId);
                    const sub = (grp as any)?.submission;
                    return (
                      <div className="space-y-4">
                        {sub?.content ? (
                          <Card className="border-0 shadow-sm">
                            <CardHeader className="pb-2"><CardTitle className="text-sm">Group Submission — {grp?.name}</CardTitle></CardHeader>
                            <CardContent>
                              <p className="text-sm whitespace-pre-wrap leading-relaxed">{sub.content}</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <Card className="border-0 shadow-sm bg-muted/30">
                            <CardContent className="p-4 flex gap-2 items-center text-muted-foreground">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              <p className="text-sm">This group hasn't submitted anything yet.</p>
                            </CardContent>
                          </Card>
                        )}
                        <Card className="border-0 shadow-sm">
                          <CardContent className="p-4 space-y-3">
                            <Label>Your Feedback</Label>
                            <Textarea
                              rows={5}
                              placeholder="Great use of descriptive language in your opening paragraph! Consider adding more details to your conclusion..."
                              value={feedbackText}
                              onChange={(e) => setFeedbackText(e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Button onClick={handleSaveFeedback} disabled={saveFeedback.isPending || !feedbackText.trim()} className="gap-1.5">
                                {saveFeedback.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <Check className="w-3.5 h-3.5" /> Save Feedback
                              </Button>
                              <Button variant="outline" onClick={() => setPanel("none")}>Cancel</Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            )}

            {/* Project Detail */}
            {panel === "none" && selectedId && (
              <motion.div key={`detail-${selectedId}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {detailLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : selectedProject ? (
                  <div className="max-w-3xl mx-auto space-y-5">
                    {/* Project header */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {(() => { const m = TYPE_META[selectedProject.type] ?? TYPE_META.writing; const I = m.icon; return (
                            <span className={`w-6 h-6 rounded-md flex items-center justify-center ${m.color}`}><I className="w-3.5 h-3.5" /></span>
                          )})()}
                          <h1 className="text-xl font-bold">{selectedProject.title}</h1>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_CHIP[selectedProject.status]}`}>{selectedProject.status}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {selectedProject.gradeLevel && <span>Grade {selectedProject.gradeLevel}</span>}
                          {formatDue(selectedProject.dueDate) && <><span>·</span><span className="flex items-center gap-0.5"><Calendar className="w-3 h-3" /> Due {formatDue(selectedProject.dueDate)}</span></>}
                          <span>·</span><span>{groups.length} {groups.length === 1 ? "group" : "groups"}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" onClick={() => toggleStatus(selectedProject)}>
                          {selectedProject.status === "active" ? "Close Project" : "Reopen"}
                        </Button>
                        <Button size="sm" className="gap-1.5" onClick={() => { setNgName(""); setNgSelectedStudents([]); setPanel("add-group"); }}>
                          <Plus className="w-3.5 h-3.5" /> Add Group
                        </Button>
                      </div>
                    </div>

                    {/* Prompt + Rubric */}
                    <Card className="border-0 shadow-sm">
                      <CardContent className="p-5 space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Prompt</p>
                          <p className="text-sm leading-relaxed">{selectedProject.prompt}</p>
                        </div>
                        {selectedProject.rubric && (
                          <div>
                            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Rubric</p>
                            <p className="text-sm text-muted-foreground leading-relaxed">{selectedProject.rubric}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Groups */}
                    <div>
                      <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Groups
                        {groups.length === 0 && <span className="text-xs font-normal text-muted-foreground">— no groups yet</span>}
                      </h2>
                      <div className="space-y-3">
                        {groups.map((grp) => {
                          const sub = (grp as any).submission;
                          const hasContent = !!(sub?.content?.trim());
                          const hasFeedback = !!(sub?.feedback);
                          return (
                            <Card key={grp.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: grp.color ?? "#8b5cf6" }} />
                                    <div>
                                      <p className="text-sm font-semibold">{grp.name}</p>
                                      <p className="text-xs text-muted-foreground">{grp.memberIds.length} member{grp.memberIds.length !== 1 ? "s" : ""}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {hasContent ? (
                                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Check className="w-3 h-3" /> Submitted
                                      </span>
                                    ) : (
                                      <span className="text-xs bg-gray-100 text-gray-500 dark:bg-gray-800 px-2 py-0.5 rounded-full">No submission</span>
                                    )}
                                    {hasFeedback && (
                                      <span className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                                        <Star className="w-3 h-3" /> Feedback given
                                      </span>
                                    )}
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs gap-1"
                                      onClick={() => {
                                        setFeedbackGroupId(grp.id);
                                        setFeedbackText(sub?.feedback ?? "");
                                        setPanel("feedback");
                                      }}
                                    >
                                      <MessageSquare className="w-3 h-3" />
                                      {hasFeedback ? "Edit Feedback" : "Give Feedback"}
                                    </Button>
                                  </div>
                                </div>
                                {hasContent && (
                                  <div className="mt-3 pt-3 border-t border-border">
                                    <p className="text-xs text-muted-foreground line-clamp-3">{sub.content}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                        {groups.length === 0 && (
                          <div className="rounded-xl border-2 border-dashed border-border p-8 text-center">
                            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">No groups yet. Add groups to get started.</p>
                            <Button size="sm" variant="outline" onClick={() => { setNgName(""); setNgSelectedStudents([]); setPanel("add-group"); }}>
                              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add First Group
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </motion.div>
            )}

            {/* Empty state */}
            {panel === "none" && !selectedId && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center">
                <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center mb-4">
                  <FolderOpen className="w-8 h-8 text-violet-500" />
                </div>
                <h2 className="text-lg font-semibold mb-1">Group Projects</h2>
                <p className="text-sm text-muted-foreground max-w-xs mb-6">Create collaborative writing and reading projects for your class, assign students to groups, and give feedback on submissions.</p>
                <Button onClick={() => setPanel("new-project")} className="gap-2">
                  <Plus className="w-4 h-4" /> Create First Project
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </Layout>
  );
}
