# LucidKeeper

**Perps execution terminal & browser-local risk guardian for dreamDEX on Somnia Tokyo testnet.**

LucidKeeper provides real-time market telemetry, verifiable on-chain execution, interactive risk sentinels, and cryptographic execution evidence for the dreamDEX Perps Builder Bounty on Somnia Tokyo testnet (Chain ID 50383).

---

## Current status — 30 October 2026

Current frontend authority: [STATUS.md](STATUS.md), [checkpoint](docs/CHECKPOINT.md) and [validation](docs/LUCIDKEEPER_REDESIGN_VALIDATION.md).

- **Official SDK 0.32.1** installed; **21 perp markets** indexed and cross-checked on-chain.
- **Production, checked 30 October 15:43 UTC:** https://lucid-keeper.vercel.app/ . Public `main`/Vercel **`0dce074`**, cloud unit job successful; **180/180 local `dist/` files match production bytes**. Desktop/phone read-only smoke passed; no new live transactions or full production Playwright certification. [Details](STATUS.md#deployment).
- **Feedback 006 verified in production:** all six named chart/order groups appear in desktop and phone accessibility trees; scoped axe naming checks pass. Actual screen-reader testing remains pending.
- **Source:** six ordered fixes through `a88cf26`, scoped margin release `c49bdec`, and additive HOLD/boundary regressions `0dce074` published under earlier explicit authorization. Newly supplied local instructions reserve further publication to the user; no agent push/login or credential inspection.
- **Latest unit checks:** full suite at `c49bdec` **56 passed / 21 skipped / 0 failed**; with three new first-gate HOLD/boundary regressions **59 passed / 21 skipped / 0 failed**. Typecheck/lint/build pass. Previous real-service Playwright **14 passed / 16 skipped** is not a fresh browser result. [Sources and gaps](docs/TEST_DATA_SOURCES.md).
- **Implemented:** market/limit order UI, indexed activity, cancel orders, partial close, sequential approval/deposit, withdrawal and browser-local Guardian triggers. These do not have a fresh production transaction smoke test.
- **Historical execution:** the 27 October approval, deposit and first BTC fill are preserved below. The 0.00013 BTC long is **not a current-position claim**; 29 October read-only QA observed zero positions. No new position/receipt audit was performed in this documentation reconciliation.
- **Operational policy, 2026-10-30:** subsequent explicit written owner confirmation releases margin HOLD **only for the bounty EOA on Tokyo 50383**, with mandatory wallet/network context. Owner-reported provenance, not independently verified team/wallet-history evidence. Exact-2-USDso funding and separately reviewed IOC only; every live action still requires full unsigned review/approval. No live transactions in this policy update. [Confirmation and safeguards](STATUS.md#owner-authorization--2026-10-30).
- **Residual dependencies:** 27 runtime affected entries, 0 dev-only, three advisories; non-forced remediation made no dependency changes. Wallet-input reachability remains unresolved, not declared harmless. [Triage](docs/DEPENDENCY_TRIAGE.md).

---

## 🔍 Verified On-Chain Execution Evidence

Historical evidence recorded on 27 October for the authorized bounty EOA on Somnia Tokyo (Chain ID 50383). These receipts are not new permission to transact or evidence of a currently open position:

| Action | Transaction Hash | Block | Status | Verified Outcome |
| :--- | :--- | :--- | :--- | :--- |
| **1. Collateral Approve** | [`0x5034...9a17`](https://explorer.testnet.somnia.network/tokyo/tx/0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17) | 34042277 | `success` | Exact 2.0 USDso allowance granted to MarginBank |
| **2. Margin Deposit** | [`0xce32...399a`](https://explorer.testnet.somnia.network/tokyo/tx/0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a) | 34042291 | `success` | 2.0 USDso credited to EOA unlocked margin |
| **3. IOC Order & Fill** | [`0x8e5f...a47a`](https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a) | 34044423 | `success` | `OrderPlaced` (13,000 units), `OrderFilled` @ 79,946 USDso, `PositionUpdated` (0.00013 BTC Long) |

Curated execution evidence is preserved in [evidence/public/execution-2026-10-27.json](evidence/public/execution-2026-10-27.json).

---

## 🚀 Quickstart & Running the Terminal

Requires **Node.js 22+ or 24+** and npm.

### 1. Install Dependencies
```bash
npm ci
```

### 2. Run Test Suite
Runs pure/captured tests, isolated policy-state regressions and actual read-only SDK/RPC checks; requires Node 22.15+ or 24+ and public-service access. Latest full result: 59 passed, 21 explicit skips, zero failures. No signing or sending:
```bash
npm test
```

### 3. Check Live Connectivity & Account
Performs read-only inspection of Somnia Tokyo testnet, 21 perp markets, and current account position:
```bash
npm run check -- --address 0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA
```

### 4. Launch the active React/Vite frontend
Build and serve the production preview:
```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174 --strictPort
```
Open **`http://127.0.0.1:4174`**. For the real-service read-only browser suite, run `npm run test:e2e` with that port free; Playwright builds and starts its own preview. No injected wallet or response replacements; unavailable services fail checks rather than produce invented data.

`npm run ui` / `npm run dev` start the retained compatibility HTTP terminal, not the active React/Vite frontend.

The active frontend provides:
- **Live HUD:** Native STT gas balance, USDso wallet collateral, and MarginBank unlocked margin.
- **Position Monitor:** Account-scoped positions and PnL from real reads, or explicit empty/unavailable/stale states.
- **Risk Guardian:** Labeled stress/liquidation scenarios and client-side triggers. An active browser tab and wallet approval are required; execution and fills are not guaranteed.
- **Execution Chart:** Native OHLCV candles, separate Last/Mark references, reversible robust scale and explicit read states.
- **Activity:** Indexed orders/history and transaction links; confirmation remains distinct from fill and position.
- **Share Card:** Canvas position snapshot, explicitly not proof of realized PnL or independent transaction verification.

---

## 🏛️ Architecture & Bounty Safeguards

```text
LucidKeeper/
├── src/app/                     # Active React application and portfolio reads
├── src/features/                # Terminal, trade, portfolio, margin, Guardian and share UI
├── src/lib/
│   ├── dreamdex.mjs             # Network clients, 21 market reads, ABI definitions, event parsers
│   ├── funding.mjs              # Exact-amount funding calldata builders (approve / deposit)
│   ├── operating-policy.mjs     # Allowlist rules and margin hold controller
│   ├── offline-transactions.mjs # Pure envelope builders, cryptographic sender recovery, allowlists
│   └── broadcast.mjs           # RPC preflight checks, non-retryable broadcast, receipt canonicalization
├── scripts/
│   ├── connectivity.mjs         # Public read-only market and account inspector
│   ├── prepare-margin.mjs       # Fail-closed preview; complete envelope integration pending
│   ├── prepare-order.mjs        # Fail-closed IOC preview; not a signing handoff
│   ├── verify-order.mjs         # Verification of canonical on-chain receipt and fills
│   └── ui-server.mjs            # Retained compatibility HTTP terminal
├── public/
│   ├── assets/                  # Local licensed token assets
│   └── index.html               # Compatibility terminal; active SPA entry is root index.html
├── evidence/public/             # Reviewed, verifiable public execution records
│   ├── connectivity-2026-10-26.json
│   └── execution-2026-10-27.json
└── test/                        # Sourced captures, pure tests and real read-only service checks
```

### Data integrity and operating boundaries
1. **No fabricated financial data:** Live PnL, equity and fills use contracts/indexer data. Hypothetical stress/liquidation scenarios are labeled; test captures retain source/time/block and are historical, not current balances. Controlled outcomes without real evidence stay skipped.
2. **Dedicated Bounty Account:** Exclusively uses EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` on Somnia Tokyo (Chain 50383).
3. **Scoped signing authorization:** Margin HOLD is released only for the authorized EOA/Tokyo after written owner confirmation. Missing/foreign wallet/network contexts remain rejected; any restored HOLD cannot be bypassed. Every action requires exact unsigned review. No secret inspection, Arena funding or wallet-to-wallet transfers.
4. **Funding safeguards:** Exact-amount approval and receipt sequencing are implemented. A complete unsigned2USDso approval was prepared from real reads/simulation at15:59UTC; allowance0 was observed, not guaranteed indefinitely. No signing/deposit occurred. [Review/expiry](STATUS.md#remaining-blockers--limitations). The offline broadcaster requires zero allowance for orders to prevent auto-pull.

---

## 🌐 Network & Verified Contracts

| Parameter | Verified Tokyo Value |
| :--- | :--- |
| **Chain** | Somnia Tokyo / Hideki v2 (`50383`) |
| **RPC** | `https://api.hideki2.infra.testnet.somnia.network` |
| **Indexer** | `https://hideki-dev.smk.somnia.host/v1/graphql` |
| **Explorer** | `https://explorer.testnet.somnia.network/tokyo` |
| **MarginBank** | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` |
| **Collateral (USDso)** | `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72` (18 decimals) |
| **BTC PerpPool** | `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` (8 base / 18 quote) |

---

## 📢 X Posts (Builder Bounty Deliverables)

Required mentions of **`@DreamDEXSomnia`** and **`@Somnia_Network`**:

**Drafts only; no published post URLs recorded.** The user must publish 2–3 posts with real evidence, record the 2–3 minute video, deliver feedback and complete the bounty/DoraHacks submission before **1 November 2026, 23:59 UTC** (user-provided deadline).

| # | Topic | Proposed Post Copy | Evidence Link |
| :- | :--- | :--- | :--- |
| **1** | **Build Introduction** | *"Building #LucidKeeper for the @DreamDEXSomnia Perps Builder Bounty on @Somnia_Network Tokyo: a perps terminal with real market/account reads and labeled risk scenarios. Source: https://github.com/Handilusa/LucidKeeper #dreamDEX #Somnia"* | [GitHub Repo](https://github.com/Handilusa/LucidKeeper) |
| **2** | **Historical Real Execution** | *"On 27 October, #LucidKeeper filled 0.00013 BTC long at 79,946 USDso on @DreamDEXSomnia / @Somnia_Network Tokyo testnet after a 2 USDso deposit. Historical fill, not a current-position claim. Receipt: https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a"* | [Tx 0x8e5f...a47a](https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a) |
| **3** | **MVP Terminal & Demo** | *"Explore #LucidKeeper for @DreamDEXSomnia on @Somnia_Network Tokyo: native execution candles, cross-margin health, labeled stress scenarios and shareable position snapshots. Browser-local Guardian requests wallet approval; fills depend on liquidity. https://lucid-keeper.vercel.app/"* | [Public Terminal](https://lucid-keeper.vercel.app/) |

---

## 📚 Official References

- [dreamDEX Testnet Docs](https://app.testnet.dreamdex.io/docs/developers/perps-testnet)
- [dreamdex-bot-kit](https://github.com/somnia-chain/dreamdex-bot-kit)
- [Somnia Markets TypeScript SDK](https://prd.smk.somnia.host/docs/typescript/perps)
- [Somnia Tokyo Explorer](https://explorer.testnet.somnia.network/tokyo)
