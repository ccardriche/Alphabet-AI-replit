import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import App from "./App";
import "./index.css";

// When the API server lives on a different origin than this static frontend
// (e.g. the frontend on Vercel, the API on Replit), point every API call —
// generated hooks and hand-written fetches alike — at that absolute base.
// Unset by default, so the app keeps calling same-origin relative `/api/*`.
const apiBaseUrl = import.meta.env.VITE_API_URL?.trim();
if (apiBaseUrl) {
  setBaseUrl(apiBaseUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
