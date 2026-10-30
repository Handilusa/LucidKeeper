# LucidKeeper

**Verified perps execution terminal & autonomous risk sentinel for dreamDEX Perps on Somnia Tokyo testnet.**

LucidKeeper provides real-time market telemetry, verifiable on-chain execution, interactive risk sentinels, and cryptographic execution evidence for the dreamDEX Perps Builder Bounty on Somnia Tokyo testnet (Chain ID 50383).

---

## ⚡ Current Status — 27 October 2026

**Live on-chain execution verified with real Somnia Tokyo testnet transaction hashes and active BTC perp position.**

- **Official SDK 0.32.1** installed; **21 perp markets** indexed and cross-checked on-chain.
- **HOLD released** following explicit written confirmation that testnet bounty funds are authorized for perps margin.
- **Collateral Approve & Deposit executed:** 2.0 USDso approved and deposited to MarginBank.
- **First Real IOC Order & Fill confirmed on-chain:**
  - Bought **0.00013 BTC** @ **79,946.0 USDso** limit fill.
  - Taker Order ID `8061227160211082042424` matched against Maker `15587498742284579101740`.
  - Active long position recorded in MarginBank and pool `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0`.
- **Interactive UI Terminal (`npm run ui`)** implemented with live telemetry, risk stress-testing, and X PnL card generator.
- **38 offline tests pass** covering envelope validation, cryptographic recovery, allowlist, and RPC preflight checks.

---

## 🔍 Verified On-Chain Execution Evidence

All transactions were executed using the authorized bounty EOA on Somnia Tokyo (Chain ID 50383). Every receipt and event log has been verified against canonical blocks on the official Somnia Tokyo explorer:

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
Runs all 38 offline cryptographic and transaction policy tests:
```bash
npm test
```

### 3. Check Live Connectivity & Account
Performs read-only inspection of Somnia Tokyo testnet, 21 perp markets, and current account position:
```bash
npm run check -- --address 0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA
```

### 4. Launch the LucidKeeper Interactive UI
Starts the local Web3 terminal server on port 3000:
```bash
npm run ui
```
Open **`http://localhost:3000`** in any browser to access:
- **Live HUD:** Native STT gas balance, USDso wallet collateral, and MarginBank unlocked margin.
- **Active Position Monitor:** Real-time PnL tracking for the 0.00013 BTC long position against live mark price.
- **Interactive Risk Sentinel:** Drag the price stress-test slider to simulate liquidation risk, margin ratios, and reactive trigger thresholds.
- **CLOB Book:** Top-of-book bids, asks, and spreads for Tokyo perp pools.
- **Audit Panel:** Clickable links to Somnia Tokyo Explorer for all 3 execution receipts.
- **Viral X PnL Card Generator:** High-resolution HTML5 Canvas trade card ready for export and sharing with `@DreamDEXSomnia`.

---

## 🏛️ Architecture & Bounty Safeguards

```text
LucidKeeper/
├── src/lib/
│   ├── dreamdex.mjs             # Network clients, 21 market reads, ABI definitions, event parsers
│   ├── funding.mjs              # Exact-amount funding calldata builders (approve / deposit)
│   ├── operating-policy.mjs     # Allowlist rules and margin hold controller
│   ├── offline-transactions.mjs # Pure envelope builders, cryptographic sender recovery, allowlists
│   └── broadcast.mjs           # RPC preflight checks, non-retryable broadcast, receipt canonicalization
├── scripts/
│   ├── connectivity.mjs         # Public read-only market and account inspector
│   ├── prepare-margin.mjs       # CLI for margin deposit envelope generation
│   ├── prepare-order.mjs        # CLI for IOC order envelope generation
│   ├── verify-order.mjs         # Verification of canonical on-chain receipt and fills
│   └── ui-server.mjs            # Production HTTP server for the LucidKeeper Terminal
├── public/
│   └── index.html               # Cyberpunk-styled interactive trader terminal & PnL card generator
├── evidence/public/             # Reviewed, verifiable public execution records
│   ├── connectivity-2026-10-26.json
│   └── execution-2026-10-27.json
└── test/                        # 38 isolated offline tests (100% passing)
```

### Golden Rules Followed (Judges' Directives)
1. **Zero Simulation:** All PnL, margin equity, and fills originate strictly from on-chain contracts and official indexers.
2. **Dedicated Bounty Account:** Exclusively uses EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` on Somnia Tokyo (Chain 50383).
3. **No Key Persistence:** Private keys are handled strictly in memory during approved signing sessions and never written to disk, Git, logs, or evidence.
4. **Auto-Pull Protection:** Allowances are strictly capped at exact deposit amounts and reset to 0 to prevent unauthorized protocol pulls.

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

| # | Topic | Proposed Post Copy | Evidence Link |
| :- | :--- | :--- | :--- |
| **1** | **Build Introduction** | *"Building #LucidKeeper for the @DreamDEXSomnia Perps Builder Bounty on @Somnia_Network Tokyo! An autonomous risk sentinel & execution terminal with zero simulation and 100% verified on-chain accounting. Check out the open-source repo: https://github.com/Handilusa/LucidKeeper 🚀 #dreamDEX #Somnia"* | [GitHub Repo](https://github.com/Handilusa/LucidKeeper) |
| **2** | **First Real Execution** | *"First real perps execution on @DreamDEXSomnia Tokyo testnet confirmed! ⚡ Approved collateral, deposited 2 USDso margin, and filled 0.00013 BTC long @ 79,946 USDso. Check the on-chain fill receipt: https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a 🛡️ #LucidKeeper #SomniaTokyo"* | [Tx 0x8e5f...a47a](https://explorer.testnet.somnia.network/tokyo/tx/0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a) |
| **3** | **MVP Terminal & Demo** | *"Explore the LucidKeeper terminal for @DreamDEXSomnia! Live CLOB depths, automated risk health factor, price stress testing, and viral shareable PnL cards. Test orders, protect your margin, and trade verified on @Somnia_Network. Run `npm run ui`! 📈 #LucidKeeper #DeFi #dreamDEX"* | [Terminal Public Record](evidence/public/execution-2026-10-27.json) |

---

## 📚 Official References

- [dreamDEX Testnet Docs](https://app.testnet.dreamdex.io/docs/developers/perps-testnet)
- [dreamdex-bot-kit](https://github.com/somnia-chain/dreamdex-bot-kit)
- [Somnia Markets TypeScript SDK](https://prd.smk.somnia.host/docs/typescript/perps)
- [Somnia Tokyo Explorer](https://explorer.testnet.somnia.network/tokyo)
