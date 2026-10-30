import { assertOnchainActionAllowed } from '../src/lib/operating-policy.mjs';

// Compatibility entry point retained, not a stale hardcoded BTC signing request.
// Fresh raw-position close preflight lives in the active close/Guardian UI.
// No complete wallet-bound offline envelope: scoped release does not enable this CLI.
assertOnchainActionAllowed('order');
throw new Error('Legacy close preview retired: use the fresh-position reviewed IOC flow. Offline complete-envelope integration is still pending.');
