import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('API_URL configuration', () => {
  it('uses localhost when the URL is missing in development', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
    vi.resetModules();

    const { API_URL } = await import('./config');
    expect(API_URL).toBe('http://localhost:3000');
  });

  it('fails clearly when the URL is missing in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
    vi.stubEnv('GITHUB_ACTIONS', undefined);
    vi.resetModules();

    await expect(import('./config')).rejects.toThrow(
      'NEXT_PUBLIC_API_URL must be set outside development.',
    );
  });

  it('allows the GitHub Actions verification build without an API URL', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_API_URL', undefined);
    vi.stubEnv('GITHUB_ACTIONS', 'true');
    vi.resetModules();

    const { API_URL } = await import('./config');
    expect(API_URL).toBe('http://localhost:3000');
  });
});

async function loadConfig(env: Record<string, string | undefined>) {
  vi.stubEnv('NODE_ENV', 'development');
  for (const [name, value] of Object.entries(env)) {
    vi.stubEnv(name, value);
  }
  vi.resetModules();
  return import('./config');
}

describe('API_URL values', () => {
  it('uses the configured value, trimmed', async () => {
    const { API_URL } = await loadConfig({ NEXT_PUBLIC_API_URL: '  https://api.example.org  ' });
    expect(API_URL).toBe('https://api.example.org');
  });

  it('falls back to localhost when the value is empty', async () => {
    const { API_URL } = await loadConfig({ NEXT_PUBLIC_API_URL: '' });
    expect(API_URL).toBe('http://localhost:3000');
  });
});

describe('APP_URL', () => {
  it('uses the configured value', async () => {
    const { APP_URL } = await loadConfig({ NEXT_PUBLIC_APP_URL: 'https://app.example.org' });
    expect(APP_URL).toBe('https://app.example.org');
  });

  it('falls back to localhost when unset', async () => {
    const { APP_URL } = await loadConfig({ NEXT_PUBLIC_APP_URL: undefined });
    expect(APP_URL).toBe('http://localhost:3001');
  });

  it('keeps an empty value as empty', async () => {
    const { APP_URL } = await loadConfig({ NEXT_PUBLIC_APP_URL: '' });
    expect(APP_URL).toBe('');
  });
});

describe('PLATFORM_ADMIN_ADDRESS', () => {
  const ADMIN = 'G' + 'A'.repeat(55);

  it('uses the configured value', async () => {
    const { PLATFORM_ADMIN_ADDRESS } = await loadConfig({ NEXT_PUBLIC_ADMIN_ADDRESS: ADMIN });
    expect(PLATFORM_ADMIN_ADDRESS).toBe(ADMIN);
  });

  it('is an empty string when unset', async () => {
    const { PLATFORM_ADMIN_ADDRESS } = await loadConfig({ NEXT_PUBLIC_ADMIN_ADDRESS: undefined });
    expect(PLATFORM_ADMIN_ADDRESS).toBe('');
  });

  it('is an empty string when empty', async () => {
    const { PLATFORM_ADMIN_ADDRESS } = await loadConfig({ NEXT_PUBLIC_ADMIN_ADDRESS: '' });
    expect(PLATFORM_ADMIN_ADDRESS).toBe('');
  });
});
