# Offline signing contract

## Current operational state — 30 October 2026: BLOCKED

Instructions retain **HOLD**, but `src/lib/operating-policy.mjs` currently sets `MARGIN_HOLD.active = false` and describes a 27 October release. Historical documents also disagree on the signer model. **Do not prepare, sign or broadcast any live transaction until the user resolves funding permission and the signer model explicitly in writing.** No policy/runtime change or new signing authorization is made by this documentation correction.

The offline roles/transport below describe the existing handoff specification, not a newly unified operational model. The active React frontend now includes RainbowKit/Wagmi browser-wallet integration; the old statement that the entire project has no browser integration is obsolete. Historical approval/deposit/fill receipts exist in the [README](../README.md#-verified-on-chain-execution-evidence); their existence does not release the present operational block.

The user must first confirm **in writing** that the dreamDEX team permits these funds to be used as margin. Until then, no approval or deposit is prepared or broadcast. Owner-order preparation is also blocked because it can auto-pull approved wallet collateral into margin. The hold has no CLI/environment bypass.

The earlier `evidence/prepared-*.json` files are **historical, incomplete drafts**. They lack the complete nonce/gas/fee envelope, and the order drafts expire. They are not approved signing requests. They remain local and are excluded from Git.

## Roles

1. **OpenCode — principal:** performs public reads, validates the official contracts and market parameters, and prepares unsigned JSON only after the hold is released.
2. **User:** reviews every complete unsigned transaction before it goes anywhere and personally hands it to the separate offline local AI.
3. **Offline local AI — sole signer:** checks the allowlist and signs. It alone has access to signing secrets.
4. **User → OpenCode:** returns only the signed raw transaction. OpenCode checks it against the exact reviewed JSON, then broadcasts via the official Tokyo RPC and records the hash and receipt.

This handoff specification does not use signing secrets in OpenCode or add a signing page. Browser-wallet UI is a separate implemented flow, not authorization to use it in this task. The official dapp origin remains `https://app.testnet.dreamdex.io`. Fetching documentation does not prove the URL of a browser tab.

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

Unsigned handoffs and signed raw payloads stay outside Git. Publish hashes, receipts and narrowly scoped read evidence only after review. Historical real execution is recorded in the README; no signing/broadcasting occurs in this 30 October read-only QA/documentation task.

## Implemented offline library

- `src/lib/offline-transactions.mjs`:
  - `buildUnsignedEnvelope({ call, nonce, gas, fees, description }, intent)` builds a JSON-safe envelope in memory. The call supplies `chainId/from/to/value/data`; value, gas and fee inputs are bigint. It never fetches values, creates a handoff file or supplies defaults for nonce/fees.
  - `validateUnsignedEnvelope(envelope, intent)` checks the schema fields, numeric bounds and exact canonical allowlisted calldata. Funding intent is `{ action: 'approve' | 'deposit', amount }`, with the amount as a base-unit decimal string. Order intent is `{ action: 'order', pool, isBid, price, quantity, expireTimestampNs }`, with numeric amounts as decimal strings. Orders are IOC, with zero user data and builder fees.
  - `validateSignedTransaction(raw, envelope, intent)` requires canonical signed EIP-1559, valid low-S signature fields, no added access list, the exact reviewed payload/nonce/gas/fees and a cryptographically recovered bounty EOA. It returns only hash, sender and action. Pure validation is not authorization to transmit.
- `src/lib/broadcast.mjs`: `broadcastSignedTransaction({ raw, envelope, intent, expiresAt })` checks runtime policy as its first action, with no caller-supplied policy or RPC. **The current inactive runtime HOLD does not enforce the instruction-level block; do not invoke it.** `expiresAt` is a reviewed Unix-seconds deadline within five minutes, kept with review evidence outside the envelope schema.
  - After release, it uses only the official Tokyo RPC with transport retries disabled. It rechecks chain, pending nonce, EOA code, gas balance, fees, bank/collateral, balance/allowance and gas simulation. Orders also require official factory membership, the pool's pinned bank, current grid, deposited margin and zero allowance to prevent auto-pull.
  - It snapshots inputs, records the computed hash before sending, and rechecks HOLD/expiry/nonce immediately before the single send attempt. An uncertain result is queried by that same hash; it is never automatically resent.
  - Returned states distinguish `pending`, `send-uncertain`, `receipt-unverified`, `confirmed` and `reverted`. Canonical receipts, including reverts, are stored locally. Confirmation does not verify fills; order-event verification remains a separate step. RPC failure details and raw payloads are not written to evidence.

`npm test` uses synthetic wire fields, mocked recovery/RPC/filesystem boundaries, and a separate real-recovery rejection test. No test signs, uses signing secrets, writes handoffs or contacts a network. The current CLI regression runs preparation entry points **without required arguments**, failing before RPC creation or calldata preparation. There is no broadcast CLI; preparation-to-envelope integration and real handoff verification remain pending. Runtime HOLD is inactive, instruction-level live work is blocked pending written resolution; these must not be conflated.
