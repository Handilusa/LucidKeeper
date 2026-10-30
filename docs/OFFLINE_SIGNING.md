# Offline signing contract

## Current operational state — 30 October 2026: wallet-scoped HOLD release

The earlier general execution permission did not release HOLD. The owner's subsequent explicit written confirmation on **2026-10-30** states that dreamDEX permits these funds as margin for **`0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA` on Tokyo 50383 only**. Runtime release requires that explicit wallet/network context; missing/foreign context is rejected before transport. This is owner-reported permission, not independently verified team or wallet-history evidence; `[screenshot/date]` was a placeholder. [Full record](../STATUS.md#owner-authorization--2026-10-30). No live transaction executed in this update.

The application supports the user's connected browser wallet or separate offline signer; OpenCode does not inspect signer secrets or configure another wallet. Both transports obey the same sole-EOA/chain/HOLD/allowlist rules. Historical receipts do not authorize transactions. Cancel, withdraw, limit orders and claims remain outside the currently reviewed runtime allowlist; adding UI controls does not authorize those actions. No Arena funding or wallet-to-wallet transfer is allowed.

**Agent-led signing remains a user-mediated offline handoff**, with the user's separate signer; OpenCode does not use a signing key or operate a browser wallet. The implemented browser review/gates describe application capability, not authorization for agent browser signing. Earlier explicit authorization covered the completed push/deployment checks through `0dce074`; newly supplied local instructions reserve further publication to the user, with no agent push/login or credential inspection. The scoped HOLD release does not approve any individual transaction.

That written margin-permission condition is now satisfied by the owner's explicit confirmation. First live run small; show exact action/market/size/wallet and full unsigned JSON before each separate approval, stop on any error and never reuse expired preparations. Any restored HOLD must stop approvals, deposits and orders that could auto-pull collateral. No CLI/environment bypass exists. Preparation CLIs remain fail-closed because complete wallet-bound envelope integration is unfinished, not because other wallets gained permission.

The earlier `evidence/prepared-*.json` files are **historical, incomplete drafts**. They lack the complete nonce/gas/fee envelope, and the order drafts expire. They are not approved signing requests. They remain local and are excluded from Git.

## Roles

1. **OpenCode — principal and sole preparer:** performs public reads, validates the official contracts and market parameters, and prepares complete unsigned JSON only after the hold is released and the user requests the action. From the owner's **30 October 2026** decision, the separate signer does not prepare transactions.
2. **User:** reviews every exact action/market/size/wallet and complete unsigned JSON before any live execution; approves each action explicitly. First run small; stop on any error/mismatch. Offline handoffs remain user-mediated.
3. **Separate offline signer — signing only:** signs only the exact runtime-allowed envelope after explicit user approval. Never prepares, changes calldata/type/size/expiry/nonce/gas/fees or broadcasts. If it cannot sign the unchanged envelope, stop and return the issue to OpenCode for fresh preparation and new review. The application's browser transport is a separate capability, not the agent-led workflow. No secrets are written or inspected by this workflow.
4. **User → OpenCode:** returns only the signed raw transaction. OpenCode checks it against the exact reviewed JSON; validation does not authorize sending. Only after separate explicit broadcast approval and successful fresh preflight does OpenCode broadcast via the official Tokyo RPC and record the hash and canonical receipt.

This specification does not use signing secrets in OpenCode or add a signing page. For agent-led live work, show the complete unsigned JSON in chat and wait for explicit approval. The official dapp origin remains `https://app.testnet.dreamdex.io`; verify the effective browser URL before any official-dapp signature. Fetching documentation does not verify a browser tab. No claims are authorized.

## Unsigned handoff format

One transaction per JSON file under `evidence/unsigned/`. [The JSON schema](unsigned-transaction.schema.json) defines the required transport fields. It is a format specification, not a complete policy validator or permission to execute.

| Field | Meaning |
| --- | --- |
| `chainId` | Integer `50383` |
| `from` | Exact checksummed bounty EOA |
| `to` | Verified allowlisted contract |
| `value` | Decimal string in wei; `"0"` for the currently supported calls |
| `data` | Complete ABI-encoded calldata |
| `nonce` | Integer read from the EOA's pending nonce immediately before review |
| `gas` | Explicit gas limit as a decimal string, based on simulation/estimation |
| `type` | `"eip1559"` |
| `fees.maxFeePerGas` | Explicit maximum fee per gas in wei as a decimal string |
| `fees.maxPriorityFeePerGas` | Explicit maximum priority fee in wei as a decimal string |
| `description` | Plain-English action, amount, recipient/spender and expected effect |

The signer maps `fees` into the EIP-1559 transaction fields and uses `from` only to verify its signing identity. No fees, gas limit or nonce may be silently changed. A change requires a new review. Include a separate evidence record of the read block, official-source checks, decoded arguments, simulation and expiry; these are not substitutes for the complete transaction fields.

Prepare one dependent action at a time. A deposit follows a successful approval receipt and fresh allowance check. An order follows confirmed usable margin and fresh market/nonce/fee checks. Do not sign multiple speculative future nonces or reuse an expired draft.

## Future DOGE close — only when requested

No close preparation is authorized now. On a later explicit close request:

- Freshly read the bounty EOA's remaining DOGE short and official pool/grid/price/depth; buy **exactly its remaining base-unit size**, not the historical 120-DOGE snapshot. Stop if flat, flipped, changed or incompatible with the live lot/minimum; do not round up or open a new position.
- Use **IOC `orderType=2`, `isBid=true`**, zero builder/fee/user data, and a user-reviewed **tick-aligned buy price ceiling**. Explicitly assert decoded `orderType===2` in the preparation/readback checks and require full canonical calldata equality with the independent intent. `validateUnsignedEnvelope` already encodes literal `2`, rejecting FOK (`1`) and other substitutions.
- Set and record a fixed **12-minute (720-second) on-chain window**, binding the exact preparation-time anchor and `expireTimestampNs` in the saved intent/readback. This is an inclusion window, not an order resting for twelve minutes: IOC cancels any unfilled remainder immediately when executed. Record the separate off-chain review deadline; neither deadline may be extended on an existing preparation.
- **Runtime prerequisite:** `assertReviewFresh` currently caps IOC review and on-chain expiry at **300 seconds**. Tested support for the requested 720-second on-chain window must be implemented before future preparation; do not bypass the guard or claim that support already exists. Approval/deposit limits remain unchanged; this request does not itself change the off-chain review limit.
- Save the complete unsigned envelope and separate intent/read-block/grid/decoded-argument/simulation/expiry evidence under ignored `evidence/unsigned/`, verify readback, and show the full JSON before explicit user approval and user-mediated signing. The signer only signs; any field change requires OpenCode to prepare a new envelope and the user to review it anew.
- Validate every returned signed field and recovered EOA, refresh exact remaining size before separately approved broadcast, avoid concurrent position-changing orders, and verify canonical receipt, actual fills and remaining position afterward. This direct call has no protocol reduce-only flag; revalidation cannot guarantee against a later concurrent change. A partial/no fill does not authorize an automatic retry.

The [FOK/IOC audit](audit/012-owner-relayed-fok-ioc-mismatch.md) is an internal process record, not bounty feedback or an evidenced SDK enum docs gap.

## Allowlist

- Network: **Somnia Tokyo / Hideki v2**, chain ID **50383** only.
- Sender: **`0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA`** only.
- USDso `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`: `approve` only, spender `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, **exactly 2 USDso** in the current implementation, no unlimited approval. A different funding amount requires a policy change and new review.
- MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`: `deposit` only, exactly **2 USDso** credited to the sending EOA after confirmed allowance.
- Perps: user-reviewed test orders to official PerpPool addresses discovered through the SDK/indexer and verified on chain against the pinned bank/collateral. A fetched address alone is not sufficient.
- All other targets/actions, wallet-to-wallet transfers, unexpected native value, arbitrary messages, authorizations and claims are rejected.

## Signed raw transaction checks and evidence

Before broadcasting, recover the sender without a key and compare chain, type, destination, value, calldata, nonce, gas and both fees with the reviewed unsigned file. Recheck the hold, user authorization, decoded allowlist, pending nonce, expiry, balances and simulation. Reject mismatches; do not rewrite or re-sign them.

Record the locally computed transaction hash and send outcome. An RPC timeout does not prove failure: query that same hash before considering any retry, and never create a replacement transaction without review. Save the canonical receipt even for a revert. A successful approval/deposit is not an order; a confirmed order transaction is not automatically a fill or position.

Unsigned handoffs and signed raw payloads stay outside Git. Publish hashes, receipts and narrowly scoped read evidence only after review. No signing/broadcasting occurs while HOLD is active.

## Implemented offline library

- `src/lib/offline-transactions.mjs`:
  - `buildUnsignedEnvelope({ call, nonce, gas, fees, description }, intent)` builds a JSON-safe envelope in memory. The call supplies `chainId/from/to/value/data`; value, gas and fee inputs are bigint. It never fetches values, creates a handoff file or supplies defaults for nonce/fees.
  - `validateUnsignedEnvelope(envelope, intent)` checks the schema fields, numeric bounds and exact canonical allowlisted calldata. Funding intent is `{ action: 'approve' | 'deposit', amount }`, with the amount as a base-unit decimal string. Order intent is `{ action: 'order', pool, isBid, price, quantity, expireTimestampNs }`, with numeric amounts as decimal strings. Orders are IOC, with zero user data and builder fees.
  - `validateSignedTransaction(raw, envelope, intent)` requires canonical signed EIP-1559, valid low-S signature fields, no added access list, the exact reviewed payload/nonce/gas/fees and a cryptographically recovered bounty EOA. It returns only hash, sender and action. Pure validation is not authorization to transmit.
- `src/lib/broadcast.mjs`: `broadcastSignedTransaction({ raw, envelope, intent, expiresAt })` checks the active runtime policy as its first action, with no caller-supplied policy or RPC. `expiresAt` is the fixed reviewed Unix-seconds deadline kept with review evidence outside the envelope schema. At the owner's request on 30 October, approval reviews may last up to one hour and **deposit reviews up to fifteen minutes**; IOC review/calldata expiry remains limited to five minutes. The deposit review ending **17:07:07 UTC** was explicitly rejected and remains historical, unchanged. An expired review cannot be extended or reused. Every live preflight still checks current state; the longer human review is not a guarantee of unchanged nonce, allowance, fees or simulation. Approval and deposit calldata have no on-chain expiry: keep any signed wire private and do not send it after its review deadline. Funding regeneration requests are historical; the latest process-note update authorizes no preparation, signing or broadcast.
  - After release, it uses only the official Tokyo RPC with transport retries disabled. It rechecks chain, pending nonce, EOA code, gas balance, fees, bank/collateral, balance/allowance and gas simulation. Orders also require official factory membership, the pool's pinned bank, current grid, deposited margin and zero allowance to prevent auto-pull.
  - It snapshots inputs, records the computed hash before sending, and rechecks HOLD/expiry/nonce immediately before the single send attempt. An uncertain result is queried by that same hash; it is never automatically resent.
  - Returned states distinguish `pending`, `send-uncertain`, `receipt-unverified`, `confirmed` and `reverted`. Canonical receipts, including reverts, are stored locally. Confirmation does not verify fills; order-event verification remains a separate step. RPC failure details and raw payloads are not written to evidence.

`npm test` uses sourced public captures, actual read-only SDK/RPC/mined-transaction recovery and the real filesystem; no mocked responses or signer secrets. Scope regressions reject absent/foreign wallet/network context, including the broadcaster's first gate. Incomplete preparation CLIs remain fail-closed before network/evidence. [Sources and preserved coverage gaps](TEST_DATA_SOURCES.md). The wallet-scoped release does not turn preview-only CLIs into complete signing handoffs or authorize live sends in tests.
