# Deposit collateral cannot be found from the terminal

Severity: P0 UX blocker — a funded wallet with zero margin cannot discover how to start trading.
Area: LucidKeeper application UI; not a verified dreamDEX protocol/SDK defect.

## Steps to reproduce
1. At source baseline `a8bbf99`, run the React/Vite application locally and connect the isolated test wallet `0x1111111111111111111111111111111111111111` with 200 USDso, 10 STT and zero MarginBank margin.
2. Inspect `/app` at 1440×1000 and 375×1000, starting on the mobile Chart tab.
3. Search for a visible text button labeled Deposit collateral.

## Expected
An explicit Deposit collateral action is available without opening a disclosure or switching tabs. The shared tested flow waits for a successful approval receipt before a separate deposit.

## Actual
No Deposit collateral button exists. Desktop uses a 16px plus icon (`TradingBox.tsx`, baseline lines 554–560) or generic Manage collateral in Account funds. Mobile hides Trade and Account panels on the default Chart tab (`globals.css`, baseline lines 1244–1247). The funding-guide entry is inside a closed details element and disabled by `!!notice` (`FundingGuide.tsx`, baseline lines 22–27).

The modal/flow still exists in `src/features/margin/MarginHubModal.tsx` (baseline lines 53–157). `git log -S` identifies `0e7550e` for the icon entry and `efbf92d` for the shared modal; the deposit logic was not removed.

## Evidence
Reproduced locally 31 October 2026 with the isolated EIP-1193/RPC harness; zero test writes during diagnosis. Local ignored records: `deposit-diagnosis.json`, `deposit-before-375.png`, `deposit-before-1440.png` under the original repository's `.git/lucidkeeper-audit/`.

Regression source: `test/e2e/deposit-collateral.spec.ts`. Browser captures cover both widths, discoverability, Max, approval/deposit pending/confirmed/failed, funding/read/network states and connected-vs-watched identity. All hashes in these tests are fabricated test-only receipt identifiers, not on-chain evidence. No signing, wallet operation or broadcast occurred.

## Resolution
Explicit Deposit collateral/Withdraw actions above mobile tabs, in Trade, Account funds and connected Portfolio funds reuse the existing modal and transaction sequence. Step-specific states/hashes, free/locked margin, Max, Unavailable reads and funding/network/gas guidance are added. Order construction, IOC2/limit0, pricing/grid/sizing/close helpers, 300-second expiry, chain config and dependencies are unchanged. Local-only fix; not deployed or submitted to the bounty.

Accepted local rerun **31 October, 22:31 UTC**: complete Chromium **121/121**, including all **22 collateral cases**; unit/service **112 passed / 19 historical skipped / 0 failed**; app/E2E types, lint/build and publication/protected-execution checks pass. Final 375/1440 px captures reviewed. Real-extension and on-chain deposit/withdraw acceptance remain human QA, not claims from fabricated receipts.

## Environment
- SDK: `@somnia-chain/markets-sdk` 0.32.1 (unchanged)
- Network: Somnia Tokyo testnet 50383; all browser financial responses intercepted
- Public test addresses: `0x1111111111111111111111111111111111111111`, `0x2222222222222222222222222222222222222222` (no real wallets)
- Runtime: Node 24.19.0, Windows, Playwright Chromium
- Real chain transactions: none
