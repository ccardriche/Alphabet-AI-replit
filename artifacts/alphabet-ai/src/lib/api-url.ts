import { resolveApiUrl } from "@workspace/api-client-react";

/**
 * Build an absolute URL for a hand-written `fetch` against the API.
 *
 * When `VITE_API_URL` is configured (see `main.tsx`), the configured base is
 * prepended so these calls hit the same remote API host as the generated
 * client hooks. Otherwise the relative path is returned unchanged for
 * same-origin requests (the default / Vercel-proxy setup).
 */
export function apiUrl(path: string): string {
  return resolveApiUrl(path);
}
