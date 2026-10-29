# LucidKeeper — Architectural & Technical Decisions (DECISIONS.md)

---

### DEC-001: Native Greenfield Architecture for dreamDEX & Somnia Tokyo
- **Date:** 26 October 2026
- **Decision:** Build LucidKeeper natively from the ground up for dreamDEX on Somnia Tokyo testnet (Chain ID 50383), strictly utilizing official dreamDEX SDKs, ABIs, and GraphQL indexers.
- **Reason:** Avoids architectural technical debt and guarantees that all accounting, liquidation math, and order routing match the Somnia Tokyo perpetual engine with 100% genuine on-chain data.
- **Alternatives Discarded:** Reusing generic boilerplate or older multi-chain perp templates (rejected due to incompatible oracles, outdated dependency trees, and non-canonical accounting).

---

### DEC-002: Technology Stack: Pure Client SPA (Vite + React 19 + TypeScript + Wagmi 2 + Viem 2)
- **Date:** 27 October 2026
- **Decision:** Build LucidKeeper as a pure client-side SPA using Vite, React 19, strict TypeScript, Wagmi 2, Viem 2, RainbowKit 2, TanStack Query v5, Tailwind CSS v4, and TradingView Lightweight Charts.
- **Reason:** A trading terminal requires instant client-side responsiveness, real-time WebSocket ticks, and zero SSR latency. Vite provides sub-second HMR and clean production builds without Node server overhead.
- **Alternatives Discarded:**
  - Next.js 14/15: SSR is unnecessary for a Web3 authenticated trading terminal and adds deployment complexity.
  - Plain HTML/Vanilla JS: Good for early proof-of-concept, but unmaintainable and uncompetitive for a 21-market terminal with charts, order books, and dynamic modals.

---

### DEC-003: Pure Math & Domain Logic Decoupled from React
- **Date:** 27 October 2026
- **Decision:** Keep `src/lib/dreamdex/` and `src/lib/math/` completely free of React dependencies.
- **Reason:** Ensures identical execution logic across command-line validation scripts, automated Vitest unit tests, and the browser UI. Any change in fee, liquidation, or PnL calculation is automatically consistent everywhere.
- **Alternatives Discarded:** Embedding calculations inside React hooks or component state.

---

### DEC-004: Strict EOA Model and Zero Key Persistence
- **Date:** 26 October 2026
- **Decision:** Operate exclusively with the whitelisted bounty EOA (`0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`). Strictly prohibit any keys in files, commits, `.env` files in git, or browser bundles.
- **Reason:** Security and strict bounty rules prohibiting smart wallets or cross-account funding with Perps Arena.
- **Alternatives Discarded:** Hardcoded signer, custodian backend, or browser local storage key storage.

---

### DEC-005: Exact Margin Allowance & Auto-Reset to Zero
- **Date:** 26 October 2026
- **Decision:** Approve strictly the exact amount of USDso to be deposited into MarginBank, and immediately verify/reset residual allowance to 0.
- **Reason:** Prevents unauthorized auto-pulls or contract draining, adhering to the highest DeFi security standards.
- **Alternatives Discarded:** Infinite (`maxUint256`) allowance approvals.

---

### DEC-006: Lightweight Charts Powered by Real SDK Candles
- **Date:** 27 October 2026
- **Decision:** Utilize TradingView's `lightweight-charts` library fed directly by the dreamDEX SDK's `getCandles` function (querying the official GraphQL indexer), supplemented by real-time mark price updates via WebSocket.
- **Reason:** Delivers institutional-grade visual charting with genuine historical candles across 6 intervals (1m, 5m, 15m, 1h, 4h, 1d) without synthetic fallback.
- **Alternatives Discarded:** Re-implementing a custom SVG chart or using mocked candle generators.

---

### DEC-007: Node.js 24 Native Test Runner with Experimental Strip Types & Coverage
- **Date:** 27 October 2026
- **Decision:** Use Node.js 24 native test runner (`node --experimental-strip-types --test --experimental-test-coverage`) for the unit tests and coverage metrics.
- **Reason:** Node 24 natively strips TypeScript types at execution time, running the test suite in under 1.5 seconds with 0 external dependencies, zero transpile overhead, and 100% coverage on `lib/math` and `lib/dreamdex`.
- **Alternatives Discarded:** Vitest (compatible, but introduces additional test runner overhead without runtime benefits).

---

### DEC-008: Rebranding to LucidKeeper
- **Date:** 27 October 2026
- **Decision:** Renamed the risk module from "DreamSentinel Core" to "LucidKeeper" and updated all brand banners, titles, and headers.
- **Reason:** Consistency with the official product name and repository name requested by the user.

---

### DEC-009: Playwright E2E Integration Suite
- **Date:** 27 October 2026
- **Decision:** Implemented Playwright E2E tests (`test/e2e/trading-ui.spec.ts`) testing 6 critical user flows against the production build: header/chain verification, trading box controls, risk guardian HUD, margin hub modal, viral X trade card canvas, and portfolio tabs.
- **Reason:** Validates full browser hydration, accessibility roles, and interactive flows prior to user review and deployment.
- **Alternatives Discarded:** Cypress (heavier setup, slower runtime).

---

### DEC-010: Vercel SPA Deployment Configuration
- **Date:** 27 October 2026
- **Decision:** Provide a production-ready `vercel.json` with SPA route rewrites (`{"source": "/(.*)", "destination": "/index.html"}`) and strict security headers (`nosniff`, `DENY`, `1; mode=block`).
- **Reason:** The user chose Vercel for public hosting, requiring client-side single-page application routing support.

---

### DEC-011: Upstream Dependency Overrides for Transitive Packages
- **Date:** 27 October 2026
- **Decision:** Used npm `overrides` in `package.json` to pin `ws` to `^8.22.0` and `decode-uri-component` to `^0.5.1`. Avoided running `npm audit fix --force` which would break Wagmi 2 / RainbowKit 2 compatibility.
- **Reason:** Transitive dependencies inside `@walletconnect` and `@metamask/sdk` cannot force Wagmi 3 without breaking RainbowKit 2. Selective overrides patch known issues cleanly.

---

### DEC-012: Zero-Mock & Complete Protocol Data Integrity
- **Date:** 28 October 2026
- **Decision:** Eliminate every hardcoded mock, placeholder number, simulated PnL, fake tx hash, and synthetic balance across the entire codebase. When on-chain data is loading or absent, explicitly show `"--"` or empty states. All trade history, positions, mark prices, leverage, and margin are derived directly on-chain from Somnia Tokyo testnet.
- **Reason:** Absolute mandate for accuracy and compliance with dreamDEX Perps Builder Bounty rules. Deceiving users with fake prices or simulated PnL is strictly prohibited. Detailed in `docs/DATA_INTEGRITY_POLICY.md`.

---

### DEC-013: Source-backed design inventory and durable frontend checkpoints
- **Date:** 29 October 2026
- **Decision:** Maintain `docs/DESIGN.md` as an inventory of implemented working-tree tokens, layout, component boundaries and exceptions; maintain `docs/CHECKPOINT.md` as the exact resumption record. The complete `../prompt_frontend.txt` remains the unchanged frontend brief and is not copied into the repository.
- **Evidence:** Inspected `src/styles/globals.css`, app composition, rendered component presentation, chart/canvas options, providers, entry/fonts, numeric formatting and test configuration. Source inspection is not browser validation or proof of deployed behavior.
- **Reason:** Interrupted work must resume from its actual state, without discarding existing implementation, repeating historical claims or treating a proposed design as shipped.
- **Protocol:** Read brief/CHECKPOINT/DESIGN/latest STATE on restart; summarize in five lines; execute NEXT. Refresh CHECKPOINT after every meaningful change and roughly every ten minutes. Append dated history to STATE/DECISIONS/REQUIREMENTS. Commit each validated increment with its docs using explicit file paths; no push.
- **Scope:** Initial commit is documentation-only; inherited source/tests/config and the existing audit/plan remain outside it. No financial policy, signing authorization, dependencies or application behavior are changed. Machine-readable token export is a documentation artifact, not imported into the application.
- **Built-versus-proposed distinction:** Current compact navigation begins below 1024px, not the earlier plan's 768px. Shared color adoption and 150ms motion are incomplete in providers/risk/recovery UI; record these exceptions rather than silently changing code in a docs task.

### DEC-013 resumption evidence — 29 October 2026

- Retain the existing DESIGN and generated token export: current validation confirms their color/source/breakpoint mappings and preservation baseline. Finish the interrupted documentation commit before the inherited redesign's typecheck; no new visual direction or runtime token was chosen during resumption.
