# Offline signing contract

## Current state: HOLD

The user must first confirm **in writing** that the dreamDEX team permits these funds to be used as margin. Until then, no approval or deposit is prepared or broadcast. Owner-order preparation is also blocked because it can auto-pull approved wallet collateral into margin. The hold has no CLI/environment bypass.

The earlier `evidence/prepared-*.json` files are **historical, incomplete drafts**. They lack the complete nonce/gas/fee envelope, and the order drafts expire. They are not approved signing requests. They remain local and are excluded from Git.

## Roles

1. **OpenCode — principal:** performs public reads, validates the official contracts and market parameters, and prepares unsigned JSON only after the hold is released.
2. **User:** reviews every complete unsigned transaction before it goes anywhere and personally hands it to the separate offline local AI.
3. **Offline local AI — sole signer:** checks the allowlist and signs. It alone has access to signing secrets.
4. **User → OpenCode:** returns only the signed raw transaction. OpenCode checks it against the exact reviewed JSON, then broadcasts via the official Tokyo RPC and records the hash and receipt.

OpenCode never handles a private key, seed phrase or keystore, including test keys. There is no signing page, browser wallet integration or automatic signature. The official dapp origin remains `https://app.testnet.dreamdex.io`. Fetching documentation does not prove the URL of a browser tab.

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
- USDso `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`: `approve` only, spender `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, **exact user-reviewed amount**, no unlimited approval.
- MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`: `deposit` only, a small user-reviewed test amount credited to the sending EOA.
- Perps: user-reviewed test orders to official PerpPool addresses discovered through the SDK/indexer and verified on chain against the pinned bank/collateral. A fetched address alone is not sufficient.
- All other targets/actions, wallet-to-wallet transfers, unexpected native value, arbitrary messages, authorizations and claims are rejected.

## Signed raw transaction checks and evidence

Before broadcasting, recover the sender without a key and compare chain, type, destination, value, calldata, nonce, gas and both fees with the reviewed unsigned file. Recheck the hold, user authorization, decoded allowlist, pending nonce, expiry, balances and simulation. Reject mismatches; do not rewrite or re-sign them.

Record the locally computed transaction hash and send outcome. An RPC timeout does not prove failure: query that same hash before considering any retry, and never create a replacement transaction without review. Save the canonical receipt even for a revert. A successful approval/deposit is not an order; a confirmed order transaction is not automatically a fill or position.

Unsigned handoffs and signed raw payloads stay outside Git. Publish hashes, receipts and narrowly scoped read evidence only after review. No live broadcast command or full-envelope preparation is implemented yet: the current legacy preparation CLIs are deliberately held, and must be upgraded to this contract before release. No signing or broadcasting has occurred in this project.
