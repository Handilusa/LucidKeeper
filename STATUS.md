# Project status

Updated: **26 October 2026**. Update this file whenever the state changes.

**Project:** `dream-sentinel` (Lucidkeeper), **dreamDEX Perps Builder Bounty**, Somnia Tokyo testnet, **chain 50383**. Not Perps Arena.
**Submission deadline:** **1 November 2026, 23:59 UTC** (user-provided).

## Done

- Official docs and SDK **0.32.1** verified; EOA-only rules documented.
- Offline-signing model and [handoff specification](docs/OFFLINE_SIGNING.md) documented: OpenCode prepares unsigned transactions; the user reviews and relays them; the offline AI signs; OpenCode validates the returned raw transaction and broadcasts.
- Complete unsigned envelope, exact signed-raw validation and HOLD-gated broadcast library implemented offline.
- Offline tests (**26 October 2026**): **38/38 passing** using synthetic data and mocks; no signing or network sends.
- README with **X posts** section; **3 feedback reports** in `feedback/`.
- `.gitignore` hardened; publication-file scan (**26 October, 22:17 UTC**, 28 files): **zero secret findings**. Prior history scan was clean.
- Baseline commit: `e10d6774b72ee5eb4559118cc5ded842b5092c02`; this implementation and status are committed together (current hash: `git rev-parse HEAD`).
- EOA balances recorded **26 October, 17:05 UTC**, block **33821736**: **90 STT, 200 USDso, 0 margin** ([public evidence](evidence/public/connectivity-2026-10-26.json)).

## Blocked

- **Margin HOLD:** do not prepare or broadcast approvals/deposits to MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394` until the user confirms **in writing** that dreamDEX permits these funds as margin. No order auto-pull bypass.
- Live preparation-to-envelope integration and real end-to-end execution remain pending.
- **0.00013 BTC test order:** needs permitted margin, fresh market checks and offline signing. No order submitted or project order hash recorded.

## Human-only — agent must not attempt

Whitelist, Discord, GitHub push, X posts, DoraHacks submission, wallet and signer setup.

## Next — after written margin confirmation

1. Connect live preparation to the tested envelope library and save each reviewed handoff.
2. Prepare an exact **2 USDso unsigned approval**; review, offline-sign, validate and broadcast. After confirmation and fresh checks, repeat separately for the **2 USDso deposit**.
3. Regenerate and execute the reviewed test order; record hashes, receipts and actual fills/position. Confirmation alone is not a fill.
4. Build the MVP and add reproducible reports with evidence in `feedback/`.
