import { useEffect } from "react";
import { useLocation } from "wouter";
import { useGetStudentProfile, getGetStudentProfileQueryKey } from "@workspace/api-client-react";
import { STUDENT_ID_KEY, PLACEMENT_COMPLETED_KEY } from "@/lib/constants";
import { getRole } from "@/lib/role";

export default function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  // Admins previewing the student view have no student profile — skip the
  // onboarding/placement gate so they can see the dashboard shell.
  const isAdmin = getRole() === "admin";

  const { data: profile, isLoading } = useGetStudentProfile({
    query: {
      queryKey: getGetStudentProfileQueryKey(),
      retry: false,
    },
  });

  // Trust the localStorage flag as a fast-path: Placement.tsx writes it the
  // moment the server confirms completion, before the profile query refetches.
  const placementLocalFlag = localStorage.getItem(PLACEMENT_COMPLETED_KEY) === "true";
  const isComplete = !!profile && (!!(profile as any).preAssessmentCompleted || placementLocalFlag);

  useEffect(() => {
    if (isLoading || isAdmin) return;
    if (isComplete) {
      if (!localStorage.getItem(STUDENT_ID_KEY)) {
        localStorage.setItem(STUDENT_ID_KEY, (profile as any).id);
      }
    } else {
      // Profile exists but placement not done → send to placement.
      // No profile at all → send to onboarding.
      setLocation(profile ? "/placement" : "/onboarding");
    }
  }, [isLoading, isComplete, profile, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isAdmin) return <>{children}</>;
  if (!isComplete) return null;

  return <>{children}</>;
}
