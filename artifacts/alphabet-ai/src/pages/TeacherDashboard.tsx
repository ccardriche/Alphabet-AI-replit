import { useState } from "react";
import { useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  useGetTeacherDashboard,
  useListTeacherAlerts,
  useListTeacherClasses,
  useCreateTeacherClass,
  useResolveTeacherAlert,
  getListTeacherClassesQueryKey,
  getGetTeacherDashboardQueryKey,
  getListTeacherAlertsQueryKey,
} from "@workspace/api-client-react";
import { Users, AlertTriangle, CheckCircle, BookOpen, TrendingUp, ChevronRight, Bell, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GRADE_OPTIONS } from "@/lib/constants";
import Layout from "@/components/Layout";
import { useToast } from "@/hooks/use-toast";

const ALERT_COLORS: Record<string, string> = {
  needs_reteaching: "bg-red-50 border-red-200 text-red-800",
  grade_gap: "bg-amber-50 border-amber-200 text-amber-800",
  low_engagement: "bg-orange-50 border-orange-200 text-orange-800",
  mastery_achieved: "bg-green-50 border-green-200 text-green-800",
};

function CreateClassDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createClass = useCreateTeacherClass();
  const [className, setClassName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [schoolName, setSchoolName] = useState("");

  async function handleCreate() {
    if (!className.trim() || !gradeLevel) {
      toast({ title: "Class name and grade level are required", variant: "destructive" });
      return;
    }
    try {
      const cls = await createClass.mutateAsync({ data: { className: className.trim(), gradeLevel, schoolName: schoolName.trim() || undefined } });
      toast({
        title: "Class created!",
        description: `Join code: ${(cls as any).classCode} — share this with your students.`,
      });
      await queryClient.invalidateQueries({ queryKey: getListTeacherClassesQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetTeacherDashboardQueryKey() });
      onClose();
    } catch {
      toast({ title: "Failed to create class", variant: "destructive" });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold">Create a New Class</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="className">Class Name</Label>
            <Input
              id="className"
              placeholder="e.g. 5th Grade ELA — Period 2"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              className="mt-1.5"
              data-testid="input-class-name"
            />
          </div>

          <div>
            <Label>Grade Level</Label>
            <Select onValueChange={setGradeLevel}>
              <SelectTrigger className="mt-1.5" data-testid="select-class-grade">
                <SelectValue placeholder="Select a grade" />
              </SelectTrigger>
              <SelectContent>
                {GRADE_OPTIONS.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="schoolName">School Name (optional)</Label>
            <Input
              id="schoolName"
              placeholder="e.g. Roosevelt Elementary"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              className="mt-1.5"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleCreate}
            disabled={createClass.isPending}
            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white"
            data-testid="btn-confirm-create-class"
          >
            {createClass.isPending ? "Creating..." : "Create Class"}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-3">
          A 6-letter join code will be generated automatically for students to use.
        </p>
      </motion.div>
    </div>
  );
}

function AlertCard({ alert, onDismiss }: { alert: any; onDismiss: (id: string) => void }) {
  return (
    <div className={cn("border rounded-xl px-3 py-2.5 text-sm flex items-start justify-between gap-2", ALERT_COLORS[alert.alertType] ?? "bg-gray-50 border-gray-200")}>
      <div className="min-w-0">
        <p className="font-medium">{alert.studentName}</p>
        <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
      </div>
      <button
        onClick={() => onDismiss(alert.id)}
        className="shrink-0 opacity-60 hover:opacity-100 transition-opacity mt-0.5"
        title="Dismiss alert"
        data-testid={`btn-dismiss-alert-${alert.id}`}
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const [showCreateClass, setShowCreateClass] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: dashboard, isLoading } = useGetTeacherDashboard();
  const { data: alerts } = useListTeacherAlerts();
  const { data: classes } = useListTeacherClasses();
  const resolveAlert = useResolveTeacherAlert();

  async function handleDismissAlert(alertId: string) {
    try {
      await resolveAlert.mutateAsync({ alertId });
      await queryClient.invalidateQueries({ queryKey: getListTeacherAlertsQueryKey() });
      await queryClient.invalidateQueries({ queryKey: getGetTeacherDashboardQueryKey() });
    } catch {
      toast({ title: "Failed to dismiss alert", variant: "destructive" });
    }
  }

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
    </Layout>
  );

  const unresolvedAlerts = alerts?.filter((a) => !(a as any).resolved) ?? [];

  return (
    <Layout>
      {showCreateClass && <CreateClassDialog onClose={() => setShowCreateClass(false)} />}

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Class overview and intervention alerts</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateClass(true)}
              className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              data-testid="btn-create-class"
            >
              <Plus className="w-4 h-4" /> New Class
            </Button>
            <Button
              onClick={() => setLocation("/teacher/book-upload")}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
              data-testid="btn-upload-book"
            >
              <BookOpen className="w-4 h-4" /> Upload Book
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: dashboard?.totalStudents ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "On Track", value: dashboard?.onTrackCount ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Skills for Reteaching", value: (dashboard as any)?.needsReteachingCount ?? 0, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
            { label: "Not Tested", value: dashboard?.notTestedCount ?? 0, icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
          ].map(({ label, value, icon: Icon, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                  <p className="text-2xl font-bold">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Classes */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base">My Classes</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setLocation("/teacher/roster")} className="gap-1 text-xs">
                View Roster <ChevronRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {!classes || classes.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-40" />
                  <p className="text-sm text-muted-foreground mb-3">No classes yet.</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCreateClass(true)}
                    className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create your first class
                  </Button>
                </div>
              ) : classes.map((cls) => (
                <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">Grade {cls.gradeLevel} · {cls.studentCount ?? 0} students</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{cls.classCode}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Join code</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Alerts */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="w-4 h-4" /> Alerts
                {unresolvedAlerts.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {unresolvedAlerts.length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {unresolvedAlerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm text-muted-foreground">No alerts. All students are on track.</p>
                </div>
              ) : unresolvedAlerts.slice(0, 5).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  onDismiss={handleDismissAlert}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick nav */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Class Analytics", desc: "Charts, trends & skill gaps", href: "/teacher/analytics", icon: TrendingUp },
            { label: "Class Roster & Heatmap", desc: "Student performance by standard", href: "/teacher/roster", icon: Users },
            { label: "Book Upload", desc: "Generate lessons from texts", href: "/teacher/book-upload", icon: BookOpen },
            { label: "Exercise Generator", desc: "Create AI practice sets", href: "/teacher/exercises", icon: Users },
          ].map(({ label, desc, href, icon: Icon }) => (
            <button
              key={href}
              onClick={() => setLocation(href)}
              data-testid={`btn-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
              className="p-4 rounded-xl border border-gray-200 text-left hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group"
            >
              <Icon className="w-5 h-5 text-indigo-600 mb-2" />
              <p className="text-sm font-semibold text-foreground">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </button>
          ))}
        </div>
      </div>
    </Layout>
  );
}
