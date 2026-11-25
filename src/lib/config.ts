/** Base URL of the `streamgive-backend` API every fetch call targets. */
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

if (
  !configuredApiUrl &&
  process.env.NODE_ENV !== 'development' &&
  process.env.NODE_ENV !== 'test' &&
  // GitHub Actions builds the app for verification without deploying it.
  process.env.GITHUB_ACTIONS !== 'true'
) {
  throw new Error('NEXT_PUBLIC_API_URL must be set outside development.');
}

export const API_URL = configuredApiUrl || 'http://localhost:3000';

/**
 * Server-render fallback for the app's own origin.
 *
 * In the browser the real origin is read from `window` instead (see
 * EmbedSnippet), so this value only ever appears in server-rendered HTML
 * before hydration. Deployments do not need to set NEXT_PUBLIC_APP_URL.
 */
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001';

/**
 * The wallet address allowed into /platform-admin. Not a secret — the
 * backend independently enforces this on every admin request — just used
 * here to decide whether the nav link is worth showing.
 */
export const PLATFORM_ADMIN_ADDRESS = process.env.NEXT_PUBLIC_ADMIN_ADDRESS ?? '';

/**
 * Whether the backend reports a PAUSED stream status. The Pause button is
 * only offered when this is on; Resume always shows for a paused stream.
 */
export const STREAM_PAUSE_SUPPORTED = process.env.NEXT_PUBLIC_STREAM_PAUSE_SUPPORTED === 'true';
