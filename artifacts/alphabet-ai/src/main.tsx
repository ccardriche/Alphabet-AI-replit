import { createRoot } from "react-dom/client";
import { ClerkProvider } from "@clerk/react";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When the API server lives on a different origin than this static frontend,
// point every API call at that absolute base. Unset by default, so the app
// keeps calling same-origin relative `/api/*` (the Vercel full-stack setup).
const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

createRoot(document.getElementById("root")!).render(
  <ClerkProvider publishableKey={publishableKey}>
    <App />
  </ClerkProvider>,
);
