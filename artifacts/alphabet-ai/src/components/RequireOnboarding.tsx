import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetStudentProfile, getGetStudentProfileQueryKey } from "@workspace/api-client-react";

export default function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();

  const { data: profile, isLoading } = useGetStudentProfile({
    query: {
      queryKey: getGetStudentProfileQueryKey(),
      retry: false,
    },
  });

  const isComplete = !!profile && !!(profile as any).preAssessmentCompleted;

  useEffect(() => {
    if (isLoading) return;
    if (!isComplete) {
      setLocation("/onboarding");
    }
  }, [isLoading, isComplete, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isComplete) return null;

  return <>{children}</>;
}
