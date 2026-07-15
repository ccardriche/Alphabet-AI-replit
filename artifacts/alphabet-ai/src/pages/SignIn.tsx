import { SignIn as ClerkSignIn } from "@clerk/react";
import { BookOpen } from "lucide-react";

// Kid-friendly username + password login (no email).
export default function SignIn() {
  const base = import.meta.env.BASE_URL.replace(/\/$/, "");
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 gap-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-3">
          <BookOpen className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
        <p className="text-slate-400 text-sm mt-1">Log in with your username and password.</p>
      </div>
      <ClerkSignIn
        routing="path"
        path={`${base}/signin`}
        signUpUrl={`${base}/signup`}
        forceRedirectUrl={`${base}/`}
      />
    </div>
  );
}
