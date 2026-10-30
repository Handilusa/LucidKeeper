# Landing claims and evidence

Reviewed 30 October 2026. Network design claims are attributed to Somnia, not independently measured application performance.

| Claim | Official source | Scope |
| --- | --- | --- |
| EVM-compatible real-time L1, sub-second finality | [Somnia overview](https://docs.somnia.network/readme) | Design claim; not a Tokyo latency guarantee |
| Independent validator data chains and a consensus chain ordering their heads | [MultiStream](https://docs.somnia.network/concepts/somnia-blockchain/multistream-consensus) | Original conceptual illustration; not network telemetry |
| Frequently used EVM contracts compiled to x86; interpreter fallback | [Accelerated sequential execution](https://docs.somnia.network/concepts/somnia-blockchain/accelerated-sequential-execution) | Parallel data chains do not imply parallel EVM execution |
| Gas depends on the transaction and network fee model | [Gas fees](https://docs.somnia.network/concepts/tokenomics/gas-fees) | No sub-cent or dollar conversion claim. Generic testnet configuration is not Tokyo configuration |
| Tokyo 50383, SDK 0.32.1, USDso, MarginBank and market units | [dreamDEX testnet developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) · [SDK perps reference](https://prd.smk.somnia.host/docs/typescript/perps) | Existing verified integration; Tokyo STT pays gas |

## Product and receipt provenance

- [`public/assets/product/terminal.jpg`](../public/assets/product/terminal.jpg) is an actual local production terminal capture. [Capture metadata](../public/assets/product/capture.json) records its time and disconnected public-account scope. Balances/prices are historical, not live. Capture code uses public services without financial response replacements.
- 30 October deposit: **2 USDso**, transaction `0xf0308d749b0401b9fa0f31149af3dbbaaf9ff5e22ff6d25cf056819d01b89fc9`, block **37388613**; Transfer and Deposited events.
- 30 October DOGE execution: **120 DOGE sold at 0.07525 USDso**, transaction `0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c`, block **37392617**. Owner-relayed, independently audited **FOK (1)**, not IOC (2), and not demonstrated execution through this UI. [Complete audit](audit/012-owner-relayed-fok-ioc-mismatch.md).
- Historical BTC close: `0x1cb959157297e2bfb7ee3c8f8b8a53e6b460d3d0f0be20b8f41785f8f69587f6`, recorded in [STATE](STATE.md). It does not close DOGE; no new independent close audit was performed for the landing.
- [STATUS](../STATUS.md) retains receipt timestamps, execution stages, costs and audit limitations. Explorer links use `https://explorer.testnet.somnia.network/tokyo/tx/`.

## Deliberate limits

No invented user counts, volume, returns, testimonials, partner endorsements, leaderboard or mainnet readiness. Feature comparison describes an order-entry-only scope, not a named competitor. Guardian monitoring requires an active tab, fresh reads and wallet approval. Confirmed transactions do not certify fills. Collateral is held by dreamDEX MarginBank; LucidKeeper does not promise on-chain privacy or custody protection. USDso is not USDC. No Arena funding/claims.
