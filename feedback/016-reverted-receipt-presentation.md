# Reverted order receipt remained pending

- **Severity:** P1
- **Area:** Browser trading, closes and Guardian receipt presentation
- **Date:** 31 October 2026
- **Reproduction:** Run the controlled reverted-order scenario in `test/e2e/multi-wallet.spec.ts` on the pre-fix build. The injected provider returns a test hash; intercepted Tokyo RPC returns a canonical receipt with status `0x0`.
- **Expected:** Display a confirmed revert, never successful execution or fill.
- **Actual:** wagmi's `waitForTransactionReceipt` action throws on a reverted receipt and attempts replay for a reason. The component expects `receipt.data.status === 'reverted'`, which that action never returns; it initially stays pending and can later report a generic receipt error.
- **Fix:** `src/lib/useTokyoReceipt.ts` uses the pinned Tokyo public client's canonical receipt action, preserving both success and revert. RPC failure stays separate; Guardian displays an unavailable-receipt warning with its hash.
- **Evidence:** Initial failure `.git/lucidkeeper-audit/task2-close/`; seven-case successful rerun `task2-receipt/`; full final suite recorded in STATUS. Financial outcomes and hashes here are **test-only**; no live send or signer used. Source confirms wagmi action throws on `receipt.status === 'reverted'`.
- **Environment:** Chromium Playwright; viem/wagmi from lockfile; official guide SDK reference 0.32.1; modeled Tokyo 50383; fake public address `0x1111111111111111111111111111111111111111`. Production/live-wallet impact not independently reproduced on-chain.
