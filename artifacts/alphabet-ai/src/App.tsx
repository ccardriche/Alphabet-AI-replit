import { lazy, Suspense } from "react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@workspace/replit-auth-web";
import { ErrorBoundary, FullPageErrorBoundary } from "@/components/ErrorBoundary";
import RequireOnboarding from "@/components/RequireOnboarding";

const NotFound = lazy(() => import("@/pages/not-found"));
const Landing = lazy(() => import("@/pages/Landing"));
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Placement = lazy(() => import("@/pages/Placement"));
const StudentDashboard = lazy(() => import("@/pages/StudentDashboard"));
const Practice = lazy(() => import("@/pages/Practice"));
const SkillTree = lazy(() => import("@/pages/SkillTree"));
const Intervention = lazy(() => import("@/pages/Intervention"));
const Progress = lazy(() => import("@/pages/Progress"));
const TeacherDashboard = lazy(() => import("@/pages/TeacherDashboard"));
const TeacherRoster = lazy(() => import("@/pages/TeacherRoster"));
const BookUpload = lazy(() => import("@/pages/BookUpload"));
const ExerciseGenerator = lazy(() => import("@/pages/ExerciseGenerator"));
const ClassAnalytics = lazy(() => import("@/pages/ClassAnalytics"));
const CaregiverOnboarding = lazy(() => import("@/pages/CaregiverOnboarding"));
const CaregiverDashboard = lazy(() => import("@/pages/CaregiverDashboard"));
const IdentityQuest = lazy(() => import("@/pages/IdentityQuest"));
const Fluency = lazy(() => import("@/pages/Fluency"));
const TeacherProjects = lazy(() => import("@/pages/TeacherProjects"));
const StudentProjects = lazy(() => import("@/pages/StudentProjects"));
const StudentProgressDetail = lazy(() => import("@/pages/StudentProgressDetail"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function PageSkeleton() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    const returnTo = encodeURIComponent(location);
    setLocation(`/?returnTo=${returnTo}`);
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/onboarding">
          <AuthGuard>
            <ErrorBoundary>
              <Onboarding />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/placement">
          <AuthGuard>
            <ErrorBoundary>
              <Placement />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/dashboard">
          <AuthGuard>
            <RequireOnboarding>
              <ErrorBoundary>
                <StudentDashboard />
              </ErrorBoundary>
            </RequireOnboarding>
          </AuthGuard>
        </Route>
        <Route path="/practice">
          <AuthGuard>
            <RequireOnboarding>
              <ErrorBoundary>
                <Practice />
              </ErrorBoundary>
            </RequireOnboarding>
          </AuthGuard>
        </Route>
        <Route path="/skill-tree">
          <AuthGuard>
            <RequireOnboarding>
              <ErrorBoundary>
                <SkillTree />
              </ErrorBoundary>
            </RequireOnboarding>
          </AuthGuard>
        </Route>
        <Route path="/intervention">
          <AuthGuard>
            <RequireOnboarding>
              <ErrorBoundary>
                <Intervention />
              </ErrorBoundary>
            </RequireOnboarding>
          </AuthGuard>
        </Route>
        <Route path="/progress">
          <AuthGuard>
            <RequireOnboarding>
              <ErrorBoundary>
                <Progress />
              </ErrorBoundary>
            </RequireOnboarding>
          </AuthGuard>
        </Route>
        <Route path="/teacher">
          <AuthGuard>
            <ErrorBoundary>
              <TeacherDashboard />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/roster">
          <AuthGuard>
            <ErrorBoundary>
              <TeacherRoster />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/book-upload">
          <AuthGuard>
            <ErrorBoundary>
              <BookUpload />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/exercises">
          <AuthGuard>
            <ErrorBoundary>
              <ExerciseGenerator />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/analytics">
          <AuthGuard>
            <ErrorBoundary>
              <ClassAnalytics />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/caregiver-onboarding">
          <AuthGuard>
            <ErrorBoundary>
              <CaregiverOnboarding />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/caregiver">
          <AuthGuard>
            <ErrorBoundary>
              <CaregiverDashboard />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/identity-quest">
          <AuthGuard>
            <ErrorBoundary>
              <IdentityQuest />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/fluency">
          <AuthGuard>
            <ErrorBoundary>
              <Fluency />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/projects">
          <AuthGuard>
            <ErrorBoundary>
              <StudentProjects />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/projects">
          <AuthGuard>
            <ErrorBoundary>
              <TeacherProjects />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route path="/teacher/students/:studentId">
          <AuthGuard>
            <ErrorBoundary>
              <StudentProgressDetail />
            </ErrorBoundary>
          </AuthGuard>
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <FullPageErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </FullPageErrorBoundary>
  );
}

export default App;
