import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { shouldHandleWithOfflineFallback } from './serviceWorkerUtils';

describe('offline fallback (#457)', () => {
  const origin = 'https://streamgive.org';

  describe('shouldHandleWithOfflineFallback', () => {
    it('returns true for navigation GET requests on the same origin', () => {
      const allowed = shouldHandleWithOfflineFallback(
        {
          method: 'GET',
          mode: 'navigate',
          url: `${origin}/ngos/ngo-1`,
        },
        origin,
      );
      expect(allowed).toBe(true);
    });

    it('returns false for non-GET requests', () => {
      expect(
        shouldHandleWithOfflineFallback(
          { method: 'POST', mode: 'navigate', url: `${origin}/submit` },
          origin,
        ),
      ).toBe(false);

      expect(
        shouldHandleWithOfflineFallback(
          { method: 'DELETE', mode: 'navigate', url: `${origin}/stream/1` },
          origin,
        ),
      ).toBe(false);
    });

    it('returns false for API routes to never cache dynamic API endpoints', () => {
      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'navigate', url: `${origin}/api/ngos` },
          origin,
        ),
      ).toBe(false);

      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'navigate', url: `${origin}/api/streams` },
          origin,
        ),
      ).toBe(false);
    });

    it('returns false for external origins such as RPCs and wallet providers', () => {
      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'navigate', url: 'https://soroban-testnet.stellar.org' },
          origin,
        ),
      ).toBe(false);

      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'navigate', url: 'https://horizon-testnet.stellar.org' },
          origin,
        ),
      ).toBe(false);
    });

    it('returns false for non-navigation assets', () => {
      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'cors', url: `${origin}/logo.svg` },
          origin,
        ),
      ).toBe(false);

      expect(
        shouldHandleWithOfflineFallback(
          { method: 'GET', mode: 'no-cors', url: `${origin}/styles.css` },
          origin,
        ),
      ).toBe(false);
    });
  });

  describe('public assets', () => {
    it('includes a valid offline.html page with retry button and accessibility markup', () => {
      const htmlPath = join(process.cwd(), 'public', 'offline.html');
      const content = readFileSync(htmlPath, 'utf8');

      expect(content).toContain('Offline');
      expect(content).toContain('Try again');
      expect(content).toContain('window.location.reload()');
      expect(content).toContain('role="main"');
      expect(content).toContain('prefers-color-scheme');
    });

    it('includes a service worker sw.js that precaches offline.html and avoids API caching', () => {
      const swPath = join(process.cwd(), 'public', 'sw.js');
      const content = readFileSync(swPath, 'utf8');

      expect(content).toContain('/offline.html');
      expect(content).toContain('request.method !== \'GET\'');
      expect(content).toContain('/api/');
      expect(content).toContain('request.mode === \'navigate\'');
    });
  });
});
