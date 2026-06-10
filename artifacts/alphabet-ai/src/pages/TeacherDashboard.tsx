import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  useGetTeacherDashboard,
  useListTeacherAlerts,
  useListTeacherClasses,
} from "@workspace/api-client-react";
import { Users, AlertTriangle, CheckCircle, BookOpen, TrendingUp, ChevronRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import Layout from "@/components/Layout";

const ALERT_COLORS: Record<string, string> = {
  needs_reteaching: "bg-red-50 border-red-200 text-red-800",
  grade_gap: "bg-amber-50 border-amber-200 text-amber-800",
  low_engagement: "bg-orange-50 border-orange-200 text-orange-800",
  mastery_achieved: "bg-green-50 border-green-200 text-green-800",
};

export default function TeacherDashboard() {
  const [, setLocation] = useLocation();
  const { data: dashboard, isLoading } = useGetTeacherDashboard();
  const { data: alerts } = useListTeacherAlerts();
  const { data: classes } = useListTeacherClasses();

  if (isLoading) return (
    <Layout>
      <div className="p-6 space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Class overview and intervention alerts</p>
          </div>
          <Button
            onClick={() => setLocation("/teacher/book-upload")}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white gap-2"
            data-testid="btn-upload-book"
          >
            <BookOpen className="w-4 h-4" /> Upload Book
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: dashboard?.totalStudents ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "On Track", value: dashboard?.onTrackCount ?? 0, icon: CheckCircle, color: "text-green-600", bg: "bg-green-50" },
            { label: "Need Intervention", value: dashboard?.interventionCount ?? 0, icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
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
                  <p className="text-sm text-muted-foreground">No classes yet.</p>
                </div>
              ) : classes.map((cls) => (
                <div key={cls.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{cls.className}</p>
                    <p className="text-xs text-muted-foreground">Grade {cls.gradeLevel} · {cls.studentCount} students · Code: {cls.classCode}</p>
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
                {alerts && alerts.filter((a) => !a.resolved).length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500 text-white text-xs font-bold">
                    {alerts.filter((a) => !a.resolved).length}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {!alerts || alerts.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-400" />
                  <p className="text-sm text-muted-foreground">No alerts. All students are on track.</p>
                </div>
              ) : alerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className={cn("border rounded-xl px-3 py-2.5 text-sm", ALERT_COLORS[alert.alertType] ?? "bg-gray-50 border-gray-200")}>
                  <p className="font-medium">{alert.studentName}</p>
                  <p className="text-xs mt-0.5 opacity-80">{alert.message}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Quick nav */}
        <div className="grid sm:grid-cols-3 gap-4">
          {[
            { label: "Class Roster & Heatmap", desc: "Student performance by standard", href: "/teacher/roster", icon: TrendingUp },
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
