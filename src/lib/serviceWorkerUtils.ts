export const CACHE_NAME = 'streamgive-offline-v1';
export const OFFLINE_URL = '/offline.html';

export interface RequestLike {
  method: string;
  mode?: string;
  url: string;
}

/**
 * Determines whether a request should be intercepted by the service worker
 * to provide the offline fallback page if navigation fails.
 *
 * Strict invariants:
 * - Non-GET requests are NEVER intercepted or cached.
 * - API routes (/api/*) are NEVER cached.
 * - Dynamic data routes (/_next/data/*) are NEVER cached.
 * - External origin requests (wallets, Horizon, RPC) are NEVER intercepted or cached.
 * - Only top-level navigation requests (mode === 'navigate') receive the offline fallback on network failure.
 */
export function shouldHandleWithOfflineFallback(
  request: RequestLike,
  origin: string,
): boolean {
  if (request.method !== 'GET') {
    return false;
  }

  try {
    const parsedUrl = new URL(request.url, origin);
    if (parsedUrl.origin !== origin) {
      return false;
    }
    if (
      parsedUrl.pathname.startsWith('/api/') ||
      parsedUrl.pathname.startsWith('/_next/data/')
    ) {
      return false;
    }
  } catch {
    return false;
  }

  return request.mode === 'navigate';
}
