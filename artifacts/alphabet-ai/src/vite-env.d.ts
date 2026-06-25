/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Absolute base URL of the API server (e.g. `https://api.example.com`).
   * Leave unset to call the API same-origin via relative `/api/*` paths
   * (the default, and what the Vercel `/api` proxy rewrite relies on).
   */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
