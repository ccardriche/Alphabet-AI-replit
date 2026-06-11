import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@workspace/replit-auth-web";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Onboarding from "@/pages/Onboarding";
import Placement from "@/pages/Placement";
import StudentDashboard from "@/pages/StudentDashboard";
import Practice from "@/pages/Practice";
import SkillTree from "@/pages/SkillTree";
import Intervention from "@/pages/Intervention";
import Progress from "@/pages/Progress";
import TeacherDashboard from "@/pages/TeacherDashboard";
import TeacherRoster from "@/pages/TeacherRoster";
import BookUpload from "@/pages/BookUpload";
import ExerciseGenerator from "@/pages/ExerciseGenerator";
import ClassAnalytics from "@/pages/ClassAnalytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

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
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding">
        <AuthGuard><Onboarding /></AuthGuard>
      </Route>
      <Route path="/placement">
        <AuthGuard><Placement /></AuthGuard>
      </Route>
      <Route path="/dashboard">
        <AuthGuard><StudentDashboard /></AuthGuard>
      </Route>
      <Route path="/practice">
        <AuthGuard><Practice /></AuthGuard>
      </Route>
      <Route path="/skill-tree">
        <AuthGuard><SkillTree /></AuthGuard>
      </Route>
      <Route path="/intervention">
        <AuthGuard><Intervention /></AuthGuard>
      </Route>
      <Route path="/progress">
        <AuthGuard><Progress /></AuthGuard>
      </Route>
      <Route path="/teacher">
        <AuthGuard><TeacherDashboard /></AuthGuard>
      </Route>
      <Route path="/teacher/roster">
        <AuthGuard><TeacherRoster /></AuthGuard>
      </Route>
      <Route path="/teacher/book-upload">
        <AuthGuard><BookUpload /></AuthGuard>
      </Route>
      <Route path="/teacher/exercises">
        <AuthGuard><ExerciseGenerator /></AuthGuard>
      </Route>
      <Route path="/teacher/analytics">
        <AuthGuard><ClassAnalytics /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
