import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/placement" component={Placement} />
      <Route path="/dashboard" component={StudentDashboard} />
      <Route path="/practice" component={Practice} />
      <Route path="/skill-tree" component={SkillTree} />
      <Route path="/intervention" component={Intervention} />
      <Route path="/progress" component={Progress} />
      <Route path="/teacher" component={TeacherDashboard} />
      <Route path="/teacher/roster" component={TeacherRoster} />
      <Route path="/teacher/book-upload" component={BookUpload} />
      <Route path="/teacher/exercises" component={ExerciseGenerator} />
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
