# Owner-relayed DOGE trade labeled IOC actually encoded Fill-or-Kill

Classification: **Internal process note — 30 October 2026**, relocated from `feedback/012`; excluded from bounty feedback. [Project status](../../STATUS.md).

Process severity: Medium — verified deviation from the owner's stated reviewed order type; fully filled this time, but FOK/IOC have different partial-fill behavior.
Area: Execution handoff / signer reporting / evidence attribution. Not a demonstrated dreamDEX protocol bug or LucidKeeper frontend defect.

## Documentation check — no evidenced enum ambiguity

Official SDK **0.32.1**, `src/trade.ts:432–447`, explicitly documents **`FILL_OR_KILL: 1`** and **`MARKET: 2` (ImmediateOrCancel)**. The [official order documentation](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/orders.md), checked **30 October 2026**, describes FOK as whole-size-or-nothing and IOC as available-fill-then-cancel-remainder. That page explains behavior, not numeric values; the SDK supplies the explicit mapping. No conflicting enum evidence was found, so this is not a docs-gap report. Reading documentation does not verify a browser tab or authorize signing.

## Reproduction
1. Read transaction `0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c` and receipt from the official Tokyo RPC. No transaction replay/send is required.
2. Verify canonical block **37392617**, hash `0x80a4b1b009f1f88650311973abdb109c20ddf78df63e19c06257ad497387eb14`, timestamp **2026-10-30 20:35:06 UTC**, and cryptographically recover the sender from already-public mined data in memory.
3. Decode selector `0x4e978373` with the official SDK 0.32.1 `perpPoolWriteAbi`; compare the `orderType` to SDK `ORDER_TYPE` in `src/trade.ts:432–447`.

## Expected
Owner-stated intent: authorized bounty EOA/Tokyo, DOGE Sell **120 DOGE**, floor **0.07368 USDso**, `isBid=false`, **IOC (`2`)**, builder and builder fee zero. Full saved-envelope comparison must precede broadcast; current reads and explicit approval are separate requirements.

## Actual
- Owner reports their separate signer broadcast directly without principal validate-then-approve. On-chain `orderType=1` is **FillOrKill**, not IOC (`2`). The transaction fully filled; this does not make the parameter match.
- Sender `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`, official DOGE pool `0xC410012e39765Cd5f772e84BAcB19554AEC040Df`, chain **50383**, value **0**, `isBid=false`, price **73680000000000000** quote atoms, quantity **12000000000** base atoms, userData/selfMatchingOption **0**, builder zero address, builderFeeBpsTimes1k **0**.
- Expiry **1793392640016442112 ns**, exactly **20:37:20.016442112 UTC**, unexpired at inclusion. Nonce **19**, EIP-1559 gas limit **4,400,162**, max fee **7.2 gwei**, priority **0**, empty access list.
- Only funding envelopes exist under `evidence/unsigned/`; no original DOGE envelope/review is available there. Exact expiry/fees/gas/full calldata equality to that original review remains **unverified**, not assumed. Cause of the signer-side type change is unconfirmed; no signing reenactment performed.

## Every receipt event, in log order

All bank events below concern the official bank and DOGE pool. **Owner** is the bounty EOA; **maker** is `0xAb8B612548cc3F5F9f7e723823Be37058d0110b2`. Position funding index in both updates: **895526407911869141998440311562500**. Eight base decimals / eighteen quote decimals were checked against SDK metadata and chain state.

| Log | Event | Decoded outcome |
| --- | --- | --- |
| 20 | CollateralLocked | Owner: **1.08441998718 USDso** |
| 21 | CollateralUnlocked | Owner: **1.08441998718 USDso**, full lock released |
| 22 | CollateralUnlocked | Maker: **0.903 USDso** |
| 23 | PositionUpdated | Owner size **−120 DOGE** (`−12000000000`), entry **0.07525** (`75250000000000000`), realized PnL **0**, funding index above |
| 24 | FundingSettled | Maker **pays 0.7564891825571625 USDso** (`756489182557162500`); not owner funding |
| 25 | PositionUpdated | Maker size **+403410 DOGE** (`40341000000000`), entry **0.076200365458368133** (`76200365458368133`), realized PnL **0**, funding index above |
| 26 | OpenInterestUpdated | Total **2,030,780 DOGE** (`203078000000000` base atoms), not owner size |
| 27 | OrderFilled | Taker ID **184467440737099302424**, maker ID **18446744073713337877**; **120 DOGE @ 0.07525**, taker remainder **0**, maker remainder **86,210 DOGE** (`8621000000000`) |
| 28 | OrderPlaced | ID **184467440737099302424**, owner bounty EOA, `isBid=false`, userData **0**, price **0.07368**, full quantity **120 DOGE**, remainder **0**, expiry **1793392640016442112 ns** |

Placement comes after the fill in log order; matching its owner/order ID attributes the fill. No OrderRested, FundingUpdated, owner FundingSettled, FeeCharged, BuilderFeeCharged, RebatePaid, deposit, withdrawal or token Transfer log was present. **9/9 decoded, zero unknowns**.

One fill gives exact VWAP **0.07525**, notional **9.03 USDso**. Owner actual gas **2,287,229 × 6,000,000,000 = 13,723,374,000,000,000 wei / 0.013723374 STT**. Receipt-block fee parameters are zero; owner settled trading/builder fees/funding/realized PnL are zero, bank collateral delta **0**, wallet USDso delta **0**. Temporary margin reservation and 9.03 notional are not expenses. Parent block **37392616** was flat; receipt-block position is **−120 DOGE @ 0.07525**, so this opened the short.

## Evidence
- Independent public reads **2026-10-30 20:39:31–20:39:37 UTC**. [Canonical transaction](https://explorer.testnet.somnia.network/tokyo/tx/0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c).
- Full canonical receipt: `.git/lucidkeeper-audit/owner-relayed-doge-2026-10-30T20-39-31-018Z.receipt.json`.
- Full decode/public transaction fields/known-intent mismatch/parent and resulting state/current pinned reads/SDK corroboration: matching `.verification.json`. Local/ignored, no serialized wire/signature persisted. Initial audit's IOC mismatch assertion is preserved separately, not deleted or called a transport failure.
- Current snapshot **37395299 / 20:39:34 UTC**, SDK **37395326**: **−120 DOGE**, entry **0.07525**, mark **0.07525139052**, uPnL **−0.0001668624 USDso**, accrued funding owed **0**; collateral **14.428353319904201956 USDso**, locked **0**, equity **14.428186457504201956**, Healthy. Estimated maintenance liquidation **0.186177407300826999 USDso**, SDK single-market cross-margin solve with funding/state held constant—not a stored/guaranteed liquidation trigger.

## Environment
- Classification: Internal process record only, not bounty feedback; not an evidenced SDK/docs gap.
- SDK: `@somnia-chain/markets-sdk` **0.32.1**; enum and event/write ABI checked against installed official package.
- Network: Somnia Tokyo / Hideki v2 testnet, chain **50383**.
- Public account: `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- Services: official `https://api.hideki2.infra.testnet.somnia.network` and SDK WebSocket; metadata from `https://hideki-dev.smk.somnia.host/v1/graphql`, factory membership/registration/bank/token verified on chain.
- Runtime / OS: Windows; read-only Node auditor.
- Status: Recorded locally, not submitted/published. No new order preparation, simulation, signing or broadcast.

### Official SDK Enum Reference (@somnia-chain/markets-sdk 0.32.1)
- **Package:** `@somnia-chain/markets-sdk@0.32.1`
- **File:** `node_modules/@somnia-chain/markets-sdk/dist/trade.d.ts`, lines 373–390:
  ```typescript
  export declare const ORDER_TYPE: {
      readonly LIMIT: 0;        // NormalOrder (limit)
      readonly FILL_OR_KILL: 1;  // FillOrKill
      readonly MARKET: 2;        // ImmediateOrCancel (IOC / market)
      readonly POST_ONLY: 3;     // PostOnly
  };
  ```
  Lines 196–200 (`TraderPlaceOrderParams.orderType`):
  > *"OrderBook OrderType (see ORDER_TYPE): 0 NormalOrder (rest), 1 FillOrKill, 2 ImmediateOrCancel, 3 PostOnly. Defaults to 0. A market order is an IOC (2) placed at the price extreme so it crosses immediately and cancels the remainder."*
- **Root Cause Confirmed:** The ad-hoc prompt script assigned `1` with a comment `# IOC`, passing Fill-or-Kill to the EVM contract. FOK executed completely due to available depth.
- **Enforcement for Closing Order:** The principal agent must prepare the Buy close order enforcing strictly `orderType === 2` (`ORDER_TYPE.MARKET` / `ImmediateOrCancel`), `isBid === true`, size exactly matching remaining short (120 DOGE), tick-aligned ceiling and a 12-minute review window.

## Process correction and conditional future close

**OpenCode alone prepares transactions; the separate offline signer only signs the exact user-approved envelope.** The signer must not prepare, amend or broadcast it. The user mediates handoff and returns only the signed raw transaction; OpenCode validates it before separate explicit broadcast approval. [Roles and future-close checks](../OFFLINE_SIGNING.md#roles).

Only when the user asks to close: freshly read the exact remaining DOGE short, prepare an IOC buy with **`isBid=true`, `orderType=2` asserted in envelope checks**, a reviewed tick-aligned price ceiling and a fixed **12-minute (720-second) on-chain window**, and save the complete unsigned envelope plus review evidence under ignored `evidence/unsigned/`. Do not reuse the dated 120-DOGE snapshot or round up a residual. Current canonical calldata validation already requires IOC (`2`), but `assertReviewFresh` still rejects order expiry beyond **300 seconds**; tested support for 720 seconds is required before preparation, never a bypass. On-chain expiry is distinct from the off-chain approval deadline. No direct-call protocol reduce-only flag: recheck size before broadcast, avoid concurrent orders, and verify fills/remaining position before any separately requested retry. **Nothing prepared now.**
