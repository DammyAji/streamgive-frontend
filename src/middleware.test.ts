import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';

import { getThemeInitScriptHash, middleware } from './middleware';

function requestFor(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, 'https://example.com'));
}

describe('security headers middleware', () => {
  it('blocks framing on a non-embed route', async () => {
    const response = await middleware(requestFor('/dashboard'));

    expect(response.headers.get('X-Frame-Options')).toBe('DENY');
  });

  it('leaves /embed routes frameable for NGO sites', async () => {
    const response = await middleware(requestFor('/embed/ngo-1'));

    expect(response.headers.get('X-Frame-Options')).toBeNull();
  });

  it("sets a CSP with frame-ancestors 'none' on a non-embed route", async () => {
    const csp = (await middleware(requestFor('/dashboard'))).headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
  });

  it('omits frame-ancestors from the CSP on /embed so NGO sites can frame it', async () => {
    const csp = (await middleware(requestFor('/embed/ngo-1'))).headers.get('Content-Security-Policy');

    expect(csp).toContain("default-src 'self'");
    expect(csp).not.toContain('frame-ancestors');
  });

  it('allows the configured API and Soroban RPC origins in connect-src', async () => {
    const csp = (await middleware(requestFor('/dashboard'))).headers.get('Content-Security-Policy');
    const connectSrc = csp?.split('; ').find((d) => d.startsWith('connect-src '));

    expect(connectSrc).toContain("'self'");
    expect(connectSrc).toContain('http://localhost:3000');
    expect(connectSrc).toContain('https://soroban-testnet.stellar.org');
  });

  it('sets HSTS and a restrictive Permissions-Policy on every route, embed included', async () => {
    for (const path of ['/dashboard', '/embed/ngo-1']) {
      const response = await middleware(requestFor(path));

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

  it('sets X-Content-Type-Options and Referrer-Policy on every route, embed included', async () => {
    for (const path of ['/dashboard', '/embed/ngo-1']) {
      const response = await middleware(requestFor(path));

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    }
  });

  it("drops 'unsafe-inline' from script-src and uses a theme script hash plus per-request nonce", async () => {
    const first = await middleware(requestFor('/dashboard'));
    const second = await middleware(requestFor('/embed/ngo-1'));
    const themeHash = await getThemeInitScriptHash();

    for (const response of [first, second]) {
      const csp = response.headers.get('Content-Security-Policy');
      const scriptSrc = csp?.split('; ').find((d) => d.startsWith('script-src '));

      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc).toContain(themeHash);
      expect(scriptSrc).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
      expect(scriptSrc).not.toContain("'unsafe-inline'");
    }

    const firstNonce = first.headers
      .get('Content-Security-Policy')
      ?.match(/'nonce-([^']+)'/)?.[1];
    const secondNonce = second.headers
      .get('Content-Security-Policy')
      ?.match(/'nonce-([^']+)'/)?.[1];

    expect(firstNonce).toBeTruthy();
    expect(secondNonce).toBeTruthy();
    expect(firstNonce).not.toBe(secondNonce);
    expect(first.headers.get('x-middleware-request-x-nonce')).toBe(firstNonce);
  });
});
