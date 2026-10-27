# LucidKeeper — Permanent Context (CONTEXT.md)

**Project:** LucidKeeper (DreamSentinel) — Autonomous On-Chain Risk Sentinel & Trading Terminal for dreamDEX Perps on Somnia Tokyo.  
**Network:** Somnia Tokyo (Testnet, Chain ID `50383`).  
**Author:** @Miguel / Engineering Lead.  
**Last updated:** 27 October 2026.

---

## 1. Mission and Standard of Quality

LucidKeeper is a production-grade perpetual futures trading terminal and autonomous risk sentinel built on top of dreamDEX on the Somnia Tokyo testnet. It is submitted for the **dreamDEX Perps Builder Bounty** (Tracks: MVP Potential, On-chain Evidence, Viral Loop, Track 1 Feedback).

The standard is measured by four non-negotiable criteria:
1. **100% Real Data:** Prices, candles, positions, PnL, fees, and execution receipts originate strictly from dreamDEX on-chain contracts and official indexers. Zero mocks, zero synthetic PRNG candles, zero simulated PnL.
2. **End-to-End Browser Flow:** Connecting wallet, depositing margin, executing orders, monitoring live risk, closing positions, and withdrawing margin directly from a Web3 browser wallet (MetaMask, Rabby).
3. **Tier-1 UI/UX:** Terminal UX on par with Hyperliquid, dYdX, and GMX; wallet connection modal following RainbowKit best practices.
4. **Autonomous Judge Verification:** A bounty judge can open the deployed URL, connect their own wallet, and trade/monitor with zero manual scripts or intervention.

---

## 2. Confirmed Facts & Verified On-Chain Baseline

| Item | Verified Value | Evidence / Source |
| :--- | :--- | :--- |
| **Network** | Somnia Tokyo (Hideki v2, Chain ID `50383`) | RPC `https://api.hideki2.infra.testnet.somnia.network` |
| **Bounty EOA** | `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` | Whitelisted bounty address; exclusive account for this bounty |
| **Excluded Account** | Smart wallet `0x6DbDB8A34d6Eab91be2d8C733A86428a1c9F45F4` | Never use for bounty; no funds transfer between EOA and Arena |
| **Collateral Token** | `USDso` (`0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`), 18 decimals | Verified against MarginBank system config |
| **MarginBank** | `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` | System MarginBank on Tokyo |
| **Perp Pool (BTC)** | `0x4181dd08e73bbcdd1ba3e615a18f6abd941b94c0` | 8 base decimals, 18 quote decimals, tick 0.1 USDso, lot 0.00001 BTC |
| **Markets Indexed** | 21 perp markets | Verified via `@somnia-chain/markets-sdk` |
| **Indexer Endpoint** | `https://hideki-dev.smk.somnia.host/v1/graphql` | GraphQL indexer for candles, orders, and stats |
| **Explorer** | `https://explorer.testnet.somnia.network/tokyo` | Official Somnia Tokyo block explorer |
| **HOLD Status** | Released by user written confirmation on 27 Oct 2026 | Margin authorized for perps trading |
| **Approve Tx** | `0x50342ddedec388240ce2ee8054c17a694b90ecfcfc0eb779eff8f2975f739a17` | Block 34042277 (Approved 2.0 USDso) |
| **Deposit Tx** | `0xce3214b4a7af9a200d485cc1822a71e4dea13f5bf64399e1de92c0514833399a` | Block 34042291 (Deposited 2.0 USDso) |
| **Order & Fill Tx** | `0x8e5f867136920a55b9b93fca85fa7373a386a22158b33c031d0866c24a77a47a` | Block 34044423 (Bought 0.00013 BTC @ 79,946.0 USDso) |
| **Active Position** | Long 0.00013 BTC @ 79,946.0 USDso | Verified on-chain in MarginBank and pool logs |
| **Deadline** | 1 November 2026, 23:59 UTC (2 Nov 00:59 Madrid) | DoraHacks builder bounty submission |

---

## 3. Non-Negotiable Rules

1. **Real Data Only:**
   - Absolute ban on hardcoded fake prices, PRNG random walk candles, simulated PnL figures, and fake demo modes.
   - If an API or network call is in flight or fails, render explicit states: `loading` (skeleton), `stale` (amber indicator with timestamp), `error` / `disconnected` (informative banner), or `no data` (empty state).
2. **Security & Key Management:**
   - Zero private keys in frontend bundles, repositories, git history, or `VITE_` variables.
   - All user transactions are signed through Wagmi / Viem via browser wallets.
   - Exact allowance approvals only; auto-reset allowance to 0 after deposit.
   - Simulate transactions with `simulateContract` before dispatching.
   - Enforce Tokyo chain ID `50383`; block actions and prompt network switch on any other chain.
3. **UI Honesty:**
   - Permanent "Testnet" badge visible at all times.
   - Live transaction states with hashes linked directly to the Tokyo explorer.
   - If Stop-Loss / Take-Profit is client-executed, state clearly that it requires the browser tab to remain open.
4. **Architectural Purity:**
   - Client-side Single Page Application (SPA): Vite + React 19 + TypeScript (strict mode, zero `any`).
   - Pure domain libraries: `lib/dreamdex` and `lib/math` do NOT import React. Both the UI and CLI/tests consume the exact same underlying logic.
   - Typed ABIs with `as const` and runtime validation via Zod.
