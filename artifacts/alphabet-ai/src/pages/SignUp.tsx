import { SignUp as ClerkSignUp } from "@clerk/react";
import { Sparkles } from "lucide-react";

// Kid-friendly, email-free account creation for summer school.
// Once the Clerk instance is set to username + password (email off), Clerk's
// SignUp renders exactly a username + password form. Name/grade are collected
// in onboarding (forceRedirectUrl below).
export default function SignUp() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-3">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create Your Login</h1>
        <p className="text-slate-400 text-sm mt-1">No email needed — just pick a username and password.</p>
      </div>
      <ClerkSignUp
        routing="path"
        path={`${base}/signup`}
        signInUrl={`${base}/signin`}
        forceRedirectUrl={`${base}/onboarding`}
      />
    </div>
  );
}
