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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, login } = useAuth();
  const [location] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    login();
    return null;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding">{() => <ProtectedRoute component={Onboarding} />}</Route>
      <Route path="/placement">{() => <ProtectedRoute component={Placement} />}</Route>
      <Route path="/dashboard">{() => <ProtectedRoute component={StudentDashboard} />}</Route>
      <Route path="/practice">{() => <ProtectedRoute component={Practice} />}</Route>
      <Route path="/skill-tree">{() => <ProtectedRoute component={SkillTree} />}</Route>
      <Route path="/intervention">{() => <ProtectedRoute component={Intervention} />}</Route>
      <Route path="/progress">{() => <ProtectedRoute component={Progress} />}</Route>
      <Route path="/teacher">{() => <ProtectedRoute component={TeacherDashboard} />}</Route>
      <Route path="/teacher/roster">{() => <ProtectedRoute component={TeacherRoster} />}</Route>
      <Route path="/teacher/book-upload">{() => <ProtectedRoute component={BookUpload} />}</Route>
      <Route path="/teacher/exercises">{() => <ProtectedRoute component={ExerciseGenerator} />}</Route>
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
