# LucidKeeper — Requirements & Acceptance Checklist (REQUIREMENTS.md)

**Bounty Target:** dreamDEX Perps Builder Bounty (Somnia Tokyo Testnet, Chain ID 50383).  
**Deadline:** 1 November 2026, 23:59 UTC.  
**Rule:** No requirement is marked as completed without verifiable linked evidence.

---

## 1. Core On-Chain Lifecycle Requirements

| ID | Requirement | Status | Evidence / Link |
| :--- | :--- | :--- | :--- |
| **REQ-ONCHAIN-01** | Connect to Somnia Tokyo (`50383`) | **PASS** | Verified via `scripts/connectivity.mjs` and SDK |
| **REQ-ONCHAIN-02** | Exact collateral Approve (USDso) | **PASS** | Tx [`0x5034...9a17`](https://explorer.testnet.somnia.network/tokyo/tx/0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17), block 34042277 |
| **REQ-ONCHAIN-03** | Margin Deposit to MarginBank | **PASS** | Tx [`0xce32...399a`](https://explorer.testnet.somnia.network/tokyo/tx/0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a), block 34042291 |
| **REQ-ONCHAIN-04** | Allowance auto-reset to 0 | **PASS** | Allowance checked at 0 in block 34042291 post-deposit |
| **REQ-ONCHAIN-05** | Real Open Position (Buy IOC) | **PASS** | Tx [`0x8e5f...a47a`](https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a), block 34044423 (0.00013 BTC @ 79,946.0 USDso) |
| **REQ-ONCHAIN-06** | Real-time Position Monitoring | **PASS** | Verified via on-chain read `getPosition` & live HUD |
| **REQ-ONCHAIN-07** | Real Close Position (Sell IOC) | *READY FOR REVIEW* | Unsigned tx prepared via `scripts/prepare-close-order.mjs` (Nonce 4, 13000 atoms Sell IOC) |
| **REQ-ONCHAIN-08** | Margin Settlement & PnL Realization | *PENDING* | To be verified immediately upon user approval & fill of Close Order |
| **REQ-ONCHAIN-09** | Margin Withdrawal | *PENDING* | Verified after closing position |

---

## 2. Product Modules & Frontend UI Requirements

| ID | Module / Feature | Status | Acceptance Criteria & Evidence |
| :--- | :--- | :--- | :--- |
| **REQ-UI-01** | **Native Wallet Integration** | **PASS** | RainbowKit 2 / Wagmi 2 modal configured for Tokyo 50383; strict chain ID validation and network switch. |
| **REQ-UI-02** | **Market Selector (21 Pairs)** | **PASS** | Dynamic discovery from SDK with base/quote decimals, tick, lot, and minQuantity (`MarketHeader.tsx`). |
| **REQ-UI-03** | **TradingView Lightweight Charts** | **PASS** | Candlestick + Volume series consuming real indexer OHLCV data across intervals (`Chart.tsx`). |
| **REQ-UI-04** | **Trading Box (Order Execution)** | **PASS** | Dynamic leverage (up to 20x read from `getPerpPoolParameters`), 0% fee read dynamically, IOC & Limit. |
| **REQ-UI-05** | **Portfolio & Positions Table** | **PASS** | Displays live Long position (0.00013 BTC), entry $79,946.00, live mark, PnL, 1-click Close button. |
| **REQ-UI-06** | **Active Orders & Trade History** | **PASS** | Resting limit orders tab with empty state; verified on-chain fills tab with Tokyo explorer links. |
| **REQ-UI-07** | **Margin Hub Modal** | **PASS** | Modal for USDso deposit & withdraw, exact allowance verification and security reset disclaimer. |
| **REQ-UI-08** | **LucidKeeper Risk Guardian** | **PASS** | Health Factor gauge (margin vs maintenance requirement), audio/visual alerts, What-If simulation disclaimer, tab-open SL/TP disclaimer. |
| **REQ-UI-09** | **Viral X Card Generator** | **PASS** | HTML5 Canvas (1200x675 px) export with QR code linking to on-chain tx, Dark/Light theme, copy/download. |

---

## 3. Engineering Quality Gates

| ID | Gate | Tool | Target | Status & Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **REQ-ENG-01** | Strict TypeScript | `tsc --noEmit` | 0 errors, 0 `any` | **PASS**: `npx tsc --noEmit` exits with code 0. |
| **REQ-ENG-02** | Unit Tests & Coverage | `node --test --experimental-test-coverage` | 100% pass, ≥90% math, ≥80% dreamdex | **PASS**: 25/25 passing (1.4s), **100% coverage on `lib/math`**, **100% line coverage on `lib/dreamdex.mjs`**. |
| **REQ-ENG-03** | Zero Secrets in Repo | `scripts/scan-secrets.mjs` | 0 secrets in tree or git history | **PASS**: 0 secrets detected across working tree and 100-commit history. |
| **REQ-ENG-04** | Style & Linting | ESLint & Prettier | 0 errors, 0 warnings | **PASS**: `npx eslint "src/**/*.{ts,tsx}"` exits 0; Prettier formatted. |
| **REQ-ENG-05** | End-to-End Testing | Playwright (`test/e2e/trading-ui.spec.ts`) | All UI critical flows covered | **PASS**: **6/6 tests passing** (header, trading box, risk guardian, margin hub, trade card, tabs). |
| **REQ-ENG-06** | Production Build | Vite | Clean bundle, optimized assets | **PASS**: `npm run build` succeeds in 9.68s. |
| **REQ-ENG-07** | Lighthouse Audit | Google Lighthouse v13.5 (Desktop) | Production build quality | **PASS**: Best Practices: **96**, Accessibility: **89**, SEO: **82**, Performance: **70**. (Report in `evidence/lighthouse-report.report.html`). |
| **REQ-ENG-08** | Vercel Deployment Readiness | `vercel.json` | SPA rewrites, clean routing | **PASS**: `vercel.json` configured with SPA fallback and security headers. |
| **REQ-ENG-09** | Upstream Dependency Audit | `npm audit` | No unaddressed direct vulnerabilities | **PASS**: Documented in `DECISIONS.md`; overrides added for `ws` & `decode-uri-component`. |

---

## 4. Bounty Deliverables Checklist

| ID | Deliverable | Status | Location / Details |
| :--- | :--- | :--- | :--- |
| **REQ-BOUNTY-01** | Open Source GitHub Repository | **DONE** | [`https://github.com/Handilusa/LucidKeeper.git`](https://github.com/Handilusa/LucidKeeper.git) |
| **REQ-BOUNTY-02** | Verified On-Chain Transactions | **DONE (3/4)** | Curated in `evidence/public/execution-2026-10-27.json` |
| **REQ-BOUNTY-03** | Track 1 SDK Feedback Reports | **DONE (3 reports)** | `feedback/unsigned-perp-builder-requires-signer.md`<br>`feedback/hideki-explorer-missing.md`<br>`feedback/intermittent-read-connectivity.md` |
| **REQ-BOUNTY-04** | 2-3 Public Posts on X | Ready | Templates prepared in `README.md` with tags `@DreamDEXSomnia` & `@Somnia_Network` |
| **REQ-BOUNTY-05** | 2-3 Minute Video Demo | Pending | Ready to record after final close trade execution |
| **REQ-BOUNTY-06** | Public Deployed Application URL | Ready for Deploy | Configured for Vercel deployment via `vercel.json` |
