import { useEffect } from 'react';

/** Which Next.js boundary caught the error. */
export type ErrorBoundaryName = 'route' | 'global';

/**
 * The only data a reporter implementation ever receives. Deliberately
 * excludes the Error object, message, stack, URL and any user input: error
 * messages in this app can embed wallet addresses (e.g. failed lookups) or
 * form values, so they must never be handed to an external service.
 * Use `digest` to correlate a report with the server logs instead.
 */
export type ErrorReport = {
  name: string;
  digest?: string;
  boundary: ErrorBoundaryName;
};

export interface ErrorReporter {
  report(report: ErrorReport): void;
}

/** Default sink: keeps the report in the browser console only. */
export const consoleErrorReporter: ErrorReporter = {
  report(report) {
    console.error(`[StreamGive ${report.boundary} error]`, report);
  },
};

let activeReporter: ErrorReporter = consoleErrorReporter;

/** Replace the default sink, e.g. from `instrumentation-client.ts`. See
 * docs/ERROR_REPORTING.md. */
export function setErrorReporter(reporter: ErrorReporter): void {
  activeReporter = reporter;
}

/**
 * Called by error boundaries. The full error stays local (console.error,
 * including its stack); only the whitelisted fields above reach the active
 * reporter, so a plugged-in service cannot leak wallet addresses or form
 * values even if an error message contains them.
 */
export function reportError(
  error: Error & { digest?: string },
  boundary: ErrorBoundaryName,
): void {
  console.error(error);
  activeReporter.report({
    name: error.name,
    ...(error.digest ? { digest: error.digest } : {}),
    boundary,
  });
}

/** Reports an error from a boundary effect, once per error instance. */
export function useErrorReporting(
  error: Error & { digest?: string },
  boundary: ErrorBoundaryName,
): void {
  useEffect(() => {
    reportError(error, boundary);
  }, [error, boundary]);
}
