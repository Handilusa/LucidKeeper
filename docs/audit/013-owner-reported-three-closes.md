# Three owner-reported closes — independently verified

Verified **31 October 2026, 20:42:57 UTC**, read-only. Local documentation update; no agent wallet connection, preparation, signing, send, commit, push or deployment.

Account **`0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`** · **Somnia Tokyo 50383** · dreamDEX SDK **0.32.1**. The owner reported closing three operations and requested hash discovery/documentation. The latest matching closes are BTC, DOGE and AVAX; this report verifies chain execution, not the submitting UI.

## Canonical execution

All three successful transactions decode to **`placeOrder`, IOC `orderType=2`** at verified factory-deployed PerpPools. Each filled the exact prior position size in the opposite direction, with **zero order remainder** and **zero position after the close**.

| Closed position | UTC on 31 Oct 2026 | Block | Closing fill | Filled notional (USDso, not margin) | Explorer |
| --- | --- | ---: | --- | ---: | --- |
| BTC short, **0.00093 BTC** | **20:39:52** | **38259218** | Buy **0.00093 BTC at 77,654.2 USDso** | **72.218406** | [0x948d…b0b4](https://explorer.testnet.somnia.network/tokyo/tx/0x948dc39bc4e32e0a5f6246b50d243813ea42cc6c398c9a7c746c1b8af027b0b4) |
| DOGE short, **120 DOGE** | **20:40:11** | **38259415** | Buy **120 DOGE at 0.07574 USDso** | **9.0888** | [0xb7ae…311e](https://explorer.testnet.somnia.network/tokyo/tx/0xb7ae27d709d13cdea7bba3dac928b5392865b0852e6835081a401fd62d32311e) |
| AVAX long, **4.8 AVAX** | **20:40:30** | **38259598** | Sell **4.8 AVAX at 8.565 USDso** | **41.112** | [0xae9b…8b34](https://explorer.testnet.somnia.network/tokyo/tx/0xae9b6862f47f9e27a4f4cfa335e4b9cde4ff44018dea33a289a901237b3e8b34) |

## Verified position and price PnL

The pre-close positions were read at each transaction's parent block. Receipt `PositionUpdated` events and indexed `PerpPositionChange` rows agree with the pre-/post-block reads. The event's `realizedPnl` is **realized price PnL**, not net after funding, trading fees or STT gas.

| Market | Prior signed size | Prior average entry (USDso) | Event realized price PnL (USDso) | Size at close block | Size at later snapshot |
| --- | ---: | ---: | ---: | ---: | ---: |
| BTC | **−0.00093** | **76,856.1** | **−0.742233** | **0** | **0** |
| DOGE | **−120** | **0.07525** | **−0.0588** | **0** | **0** |
| AVAX | **+4.8** | **8.588** | **−0.1104** | **0** | **0** |

The later snapshot is pinned to **block 38261043**, hash **`0x48a0bba9496c8b8b1759d67173c0375615095fa514006511c6aa97b408c2fb1b`**. These are dated observations, not live balances or a guarantee that positions cannot reopen. All three receipts also contain account-specific **`FundingSettled`** events; funding amounts, trading fees, gas costs and overall net account PnL are deliberately not asserted here. No withdrawal or all-account settlement is certified.

## Independent evidence and provenance

- Sender, Tokyo chain ID, destination and zero native value checked from public transactions; no signature/raw transaction is saved.
- Official network/bank/collateral/factory verified against the freshly read [dreamDEX developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet). Market metadata is cross-checked against each pool, token decimals and factory membership; base units are BTC/DOGE **8 decimals**, AVAX **18 decimals**, USDso **18 decimals**.
- Canonical successful receipt/block, decoded IOC calldata, owner-specific `OrderPlaced`, matching `OrderFilled`, bank `PositionUpdated`/`FundingSettled`, indexed Fill/PerpPositionChange and pinned pre-/post-/later positions independently agree. Canonical hashes were rechecked after verification.
- New, preserved full local record: `.git/lucidkeeper-audit/three-closes-verification-2026-10-31T20-42-57-335Z.json`. Read-only script: `verify-three-closes-2026-10-31T20-41-21-493Z.mjs`. Historical audit JSON/logs were not overwritten. Explorer links above are the public evidence; the local Git-metadata record is not shipped.
- AVAX closes the owner-confirmed current-product **IOC** long opened at **18:26:46 UTC**. DOGE closes the **owner-relayed FOK (`1`)** short from 30 October; its historical opening attribution does not change. BTC closes the later **0.00093 BTC short**, not the earlier BTC close already listed in the historical Proof. That earlier close is not re-audited or relabeled here.
- This removes the verified AVAX/DOGE close-hash documentation gates only. The demo video, deployed parity, independent-wallet QA and bounty submission remain separate pending work.
