/** Only public HTTP reads use this transport; wallet writes keep the user's connector. */
export const TOKYO_HTTP_OPTIONS = {
  batch: { wait: 10, batchSize: 50 }, timeout: 8000, retryCount: 1, retryDelay: 500,
} as const;
