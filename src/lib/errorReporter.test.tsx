import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  consoleErrorReporter,
  reportError,
  setErrorReporter,
  useErrorReporting,
  type ErrorBoundaryName,
  type ErrorReport,
} from './errorReporter';

function ReportingHarness({
  error,
  boundary,
}: {
  error: Error & { digest?: string };
  boundary: ErrorBoundaryName;
}) {
  useErrorReporting(error, boundary);
  return <div>reporting harness</div>;
}

describe('errorReporter', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    setErrorReporter(consoleErrorReporter);
  });

  afterEach(() => {
    setErrorReporter(consoleErrorReporter);
    vi.restoreAllMocks();
  });

  it('logs on the console and makes no network request by default', () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const error = Object.assign(new Error('boom'), { digest: 'digest-1' });

    reportError(error, 'route');

    expect(console.error).toHaveBeenCalledWith(error);
    expect(console.error).toHaveBeenCalledWith('[StreamGive route error]', {
      name: 'Error',
      digest: 'digest-1',
      boundary: 'route',
    });
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it('passes only whitelisted fields to a plugged-in reporter', () => {
    const reports: ErrorReport[] = [];
    setErrorReporter({ report: (report) => reports.push(report) });
    const sensitive = Object.assign(
      new Error('lookup failed for GABC… with email donor@example.com'),
      { digest: 'digest-2' },
    );

    reportError(sensitive, 'global');

    expect(reports).toHaveLength(1);
    expect(reports[0]).toEqual({
      name: 'Error',
      digest: 'digest-2',
      boundary: 'global',
    });
    expect(JSON.stringify(reports[0])).not.toContain('GABC');
    expect(JSON.stringify(reports[0])).not.toContain('donor@example.com');
    expect(JSON.stringify(reports[0])).not.toContain('lookup failed');
    // The full error is still available locally for debugging.
    expect(console.error).toHaveBeenCalledWith(sensitive);
  });

  it('omits the digest when the error has none', () => {
    const report = vi.fn<(value: ErrorReport) => void>();
    setErrorReporter({ report });

    reportError(new TypeError('boom'), 'route');

    expect(report).toHaveBeenCalledWith({ name: 'TypeError', boundary: 'route' });
  });

  it('restores the console reporter when set back to the default', () => {
    const custom = vi.fn<(value: ErrorReport) => void>();
    setErrorReporter({ report: custom });
    reportError(new Error('custom'), 'route');
    expect(custom).toHaveBeenCalledTimes(1);

    setErrorReporter(consoleErrorReporter);
    reportError(new Error('default'), 'route');

    expect(custom).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('[StreamGive route error]', {
      name: 'Error',
      boundary: 'route',
    });
  });

  it('reports once per error instance from a boundary effect', () => {
    const report = vi.fn<(value: ErrorReport) => void>();
    setErrorReporter({ report });
    const first = new Error('first');
    const second = new Error('second');

    const { rerender, unmount } = render(
      <ReportingHarness error={first} boundary="route" />,
    );
    expect(screen.getByText('reporting harness')).toBeInTheDocument();
    expect(report).toHaveBeenCalledTimes(1);

    rerender(<ReportingHarness error={first} boundary="route" />);
    expect(report).toHaveBeenCalledTimes(1);

    rerender(<ReportingHarness error={second} boundary="global" />);
    expect(report).toHaveBeenCalledTimes(2);
    expect(report).toHaveBeenLastCalledWith({
      name: 'Error',
      boundary: 'global',
    });

    unmount();
    expect(report).toHaveBeenCalledTimes(2);
  });
});
