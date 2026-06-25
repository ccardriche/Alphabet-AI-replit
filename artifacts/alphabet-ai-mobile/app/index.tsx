import { LoadingScreen } from "@/components/LoadingScreen";
import { useAuth } from "@/contexts/AuthContext";
import { useGetStudentProfile } from "@workspace/api-client-react";
import { Redirect } from "expo-router";
import React from "react";

export default function Index() {
  const { token, isLoading } = useAuth();

  const {
    data: profile,
    isLoading: profileLoading,
    isError,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } = useGetStudentProfile({ query: { enabled: !!token, retry: false } as any });

  if (isLoading) return <LoadingScreen />;
  if (!token) return <Redirect href="/login" />;
  if (profileLoading) return <LoadingScreen message="Loading your profile…" />;
  if (isError || !profile) return <Redirect href="/onboarding" />;
  if (!profile.preAssessmentCompleted) return <Redirect href="/placement" />;
  return <Redirect href="/(tabs)" />;
}
