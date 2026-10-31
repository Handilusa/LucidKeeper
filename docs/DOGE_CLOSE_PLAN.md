# DOGE close plan — no executable preparation

**31 October 2026. Planning only.** No calldata, nonce, gas/fee quote, transaction envelope, signing request or send was prepared. A later **explicit go** and resolution of the expiry conflict below are prerequisites. Current verification permission is read-only; it does not authorize an agent to sign/broadcast or operate a wallet.

## Dated evidence, not an order intent

- [README historical proof](../README.md#historical-execution-evidence): owner-relayed **30 October DOGE FOK sell** `0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c`, block **37392617**, **120 DOGE @ 0.07525 USDso**, not IOC execution through the new UI. [FOK/IOC audit](audit/012-owner-relayed-fok-ioc-mismatch.md). No DOGE close is recorded there.
- Fresh **SDK 0.32.1 + public HTTP RPC** read at **2026-10-31T13:32:29.898Z**, Tokyo **50383**, bounty EOA `0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`.
- Pinned block **38002855**, hash `0x5901affd7090e02bde42a6934eb0216b8a99a5c547e03137d66507664afb215c`. `getPosition` returned **size `-12000000000` = −120 DOGE**, entry `75250000000000000` quote units. DOGE base decimals **8**, USDso quote decimals **18**.
- SDK-discovered and on-chain-cross-checked DOGE pool `0xC410012e39765Cd5f772e84BAcB19554AEC040Df`; pinned grid tick `10000000000000` (**0.00001 USDso**), lot `1000000000` (**10 DOGE**), minimum `12000000000` (**120 DOGE**).
- `tryGetMarkPrice` returned available; its price is a snapshot, **not an approved ceiling**. STT **89.80710555**, USDso allowance to MarginBank **0**. The account declares **DOGE and BTC active pools**; no BTC size/close was audited here. Cross-margin equity was **14.192861939645258264 USDso**, not a DOGE-isolated balance or settled profit.
- Local, ignored read evidence: `.git/lucidkeeper-audit/doge-position-2026-10-31T13-32-29-898Z.json`. Read command: `node --experimental-strip-types .git/lucidkeeper-audit/read-doge-position.mjs`. It invokes no trader, encoder, simulation, wallet client or send.

[STATE](STATE.md) still contains historical 30 October snapshots and expired preparation references. They are not current authority; do not execute them. This new read is not substituted into that preserved history during a docs-only review.

## Exact future human-reviewed procedure

1. **Resolve expiry and obtain explicit preparation permission first.** Verify owner identity, Tokyo 50383 and official contracts against the [developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet). Do not fund, approve or change leverage as part of closing; missing STT/margin is a stop condition, not permission to auto-pull collateral.
2. Disarm local Guardian and avoid concurrent position-changing operations from the extension, other tabs, bots or linked operators. Inspect resting orders. Cancelling one requires a separate review/approval; never silently batch it into this close. This reduces races but cannot create an on-chain reduce-only guarantee.
3. Freshly read the account, DOGE position, grid, decimals, mark availability and executable ask depth. Pin the relevant reads to a recorded block. Stop if flat, long, stale, missing or inconsistent with the previously reviewed short. **Use the newly read remaining raw size**, never this dated 120-DOGE number or a display-rounded value.
4. For a full short reduction, use the opposite side **buy**, `isBid=true`, **IOC `orderType=2`**, `userData=0`, `selfMatchingOption=0`, builder zero-address and builder fee **0**, native **value=0**, official pool's direct `placeOrder`. **Limit encoding remains `0` but is not selected for this close; FOK `1` is forbidden.** The historical FOK substitution must not recur.
5. Size with the existing `closeQuantity(reviewedSize, freshlyReadSize, 100, lotSize)` helper. Require its result to equal `abs(freshlyReadSize)` exactly and satisfy the current lot/minimum checks; never round up or add a new long. If a partial fill leaves a below-minimum residual, stop and seek a sourced protocol-supported solution rather than altering size/minimum rules.
6. Set the reviewed **buy price ceiling** with the unchanged raw helper: `buffered = floor(markRaw × 102 / 100)`; `priceRaw = floor(buffered / tickRaw) × tickRaw`. Despite the word *ceiling*, the helper **floors to tick**, not mathematical ceil-to-tick. Review the resulting maximum acceptable buy price and live ask depth; the 2% buffer does not guarantee a fill. Do not widen it automatically or use an unsourced quote.
7. Only after explicit go, obtain fresh pending nonce, gas estimate, EIP-1559 fees and successful simulation; require sufficient STT for the maximum cost. Do not introduce extra funding or an unlimited approval. Recheck zero allowance for historical offline tooling so an owner call cannot auto-pull USDso.
8. Show the **complete unsigned envelope** and independent decoded intent for explicit human approval. Review **chainId 50383; from authorized EOA; to verified DOGE pool; value 0; full data; nonce; explicit gas; type; maxFeePerGas/maxPriorityFeePerGas; English description; read block/hash/time; exact side, size, price and absolute expiry**. Assert decoded IOC **2** and canonical calldata equality. No silent nonce/fee/size/type/expiry changes. Any change requires a fresh review.
9. Immediately before dispatch, re-read exact signed position, nonce, grid/price availability and expiry. A changed position or expired review stops the flow. Human wallet/signing decisions remain separate; under current instructions the agent performs **no signing or broadcast**. An opposite-side size check is only an **application-level reduction intent**: the direct ABI has **no protocol reduce-only flag**, so a later concurrent change can still over-close/flip.
10. Record submission hash first. Wait for and verify the **canonical receipt** and block/hash/status. A revert is not a fill; a timeout is an uncertain send, not permission to resend. Match `OrderPlaced`/`OrderFilled` to this account's order and pool, then `PositionUpdated` and the fresh remaining position. Pool-wide fill logs alone are insufficient. Partial/no fill requires a new read and separate review, not an automatic retry.
11. Verify **MarginBank realized price PnL**, separately settled funding, fees/rebates, and resulting cross-margin balance/equity at the evidence block. Mark unavailable settlement components unavailable; do not call mark PnL realized profit or attribute BTC-wide equity changes solely to DOGE.

## Expiry conflict — must choose before preparing

The product/IOC helper and validators support **300 seconds only**. Browser expiry is `floor(Date.now()/1000)+300`, converted to nanoseconds; `buildUnsignedOrder` anchors its 300-second expiry to the supplied block timestamp. Record the actual anchor, absolute `expireTimestampNs`, clock/block skew and remaining inclusion time. IOC cancels the unfilled remainder at execution; this is an **inclusion window**, not five minutes of resting liquidity.

The historical [offline contract](OFFLINE_SIGNING.md#future-doge-close--only-when-requested) requests **720 seconds / 12 minutes**, but explicitly says that support must be implemented/tested first. It is **not supported now**. Do not extend a saved deadline, hand-edit calldata, bypass the guard or claim a 720-second envelope is executable.

**Safe proposal without construction changes:** agree on side/size policy/ceiling methodology in advance, then, **only if the owner explicitly accepts the 300-second window instead of 720**, prepare just in time with fresh inputs when the reviewer/signer is ready. If review/inclusion cannot complete with adequate time, abandon that preparation and start a fresh one with new reads and a new approval. Do not reuse a signed expired wire. If 12 minutes is mandatory, remain blocked and request a **separate scoped implementation/test task**; this review changes no financial helpers.

## Evidence destinations after a separately authorized real close

- Add a dated row to **README → Historical execution evidence**: real tx hash/explorer URL, block, IOC **2**, requested versus filled raw/base size, residual, and verified settlement components; identify whether execution was through the UI or owner-relayed.
- Append a dated canonical record to **`docs/STATE.md`**; retain all previous snapshots and corrections. Include block/hash/time, fresh remaining DOGE position and cross-margin/BTC caveat.
- Save receipts/decoded account-matched events/read evidence locally; only individually reviewed public evidence may be added to `evidence/public/` under existing ignore exceptions. **Never commit keys, seeds, signed wires, raw signatures or unsigned signing handoffs.**

**Waiting for explicit go. Nothing prepared.**
