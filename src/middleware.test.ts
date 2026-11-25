import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { middleware } from './middleware';

function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://example.com'));
}

describe('security headers middleware', () => {
  it('blocks framing on a non-embed route', () => {
    const response = middleware(requestFor('/dashboard'));

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('leaves /embed routes frameable for NGO sites', () => {
    const response = middleware(requestFor('/embed/ngo-1'));

    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it("sets a CSP with frame-ancestors 'none' on a non-embed route", () => {
    const csp = middleware(requestFor('/dashboard')).headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('omits frame-ancestors from the CSP on /embed so NGO sites can frame it', () => {
    const csp = middleware(requestFor('/embed/ngo-1')).headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('frame-ancestors');
  });

  it('allows the configured API and Soroban RPC origins in connect-src', () => {
    const csp = middleware(requestFor('/dashboard')).headers.get('Content-Security-Policy');
    const connectSrc = csp?.split('; ').find((d) => d.startsWith('connect-src '));

    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('http://localhost:3000');
    expect(connectSrc).toContain('https://soroban-testnet.stellar.org');
  });

  it('sets HSTS and a restrictive Permissions-Policy on every route, embed included', () => {
    for (const path of ['/dashboard', '/embed/ngo-1']) {
      const response = middleware(requestFor(path));

      expect(response.headers.get('Strict-Transport-Security')).toBe(
        'max-age=63072000; includeSubDomains',
      );

      const policy = response.headers.get('Permissions-Policy');
      expect(policy).toContain('camera=()');
      expect(policy).toContain('microphone=()');
      expect(policy).toContain('geolocation=()');
      expect(policy).toContain('payment=()');
    }
  });

  it('sets X-Content-Type-Options and Referrer-Policy on every route, embed included', () => {
    for (const path of ['/dashboard', '/embed/ngo-1']) {
      const response = middleware(requestFor(path));

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    }
  });
});

describe('Content-Security-Policy directives', () => {
  // Every directive except connect-src, whose origins come from env config.
  const SHARED_DIRECTIVES = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "frame-src 'self' https://verify.walletconnect.com https://verify.walletconnect.org",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  function cspFor(pathname: string): string {
    // 'unsafe-eval' is added for React Refresh outside production only.
    vi.stubEnv('NODE_ENV', 'production');
    return middleware(requestFor(pathname)).headers.get('Content-Security-Policy') ?? '';
  }

  function directivesWithoutConnectSrc(csp: string): string[] {
    return csp.split('; ').filter((directive) => !directive.startsWith('connect-src '));
  }

  it('has exactly the expected directives for a normal page', () => {
    const csp = cspFor('/dashboard');

    expect(directivesWithoutConnectSrc(csp)).toEqual([
      ...SHARED_DIRECTIVES,
      "frame-ancestors 'none'",
    ]);
    expect(csp).not.toContain('unsafe-eval');
  });

  it('has exactly the expected directives for an embed page', () => {
    const csp = cspFor('/embed/ngo-1');

    expect(directivesWithoutConnectSrc(csp)).toEqual(SHARED_DIRECTIVES);
    expect(csp).not.toContain('unsafe-eval');
  });
});
