# Second-wallet manual QA — Tokyo 50383

Status: **not executed by the agent**, 31 October 2026. Automated wallets and hashes are test-only; they are not on-chain evidence. The human user performs every approval/signature. Do not share keys, seed phrases or signing credentials.

## Environment and evidence

- Record deployment URL, branch/commit, UTC date, browser/wallet version and public account address. Use a fresh wallet that is not the bounty EOA or an Arena account. Do not move funds between the Arena wallet and bounty EOA.
- Tokyo **50383**, STT gas, USDso `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`, MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`.
- Verify the effective browser origin is **https://app.testnet.dreamdex.io** before official funding/claim/signature. Start with [official perps](https://app.testnet.dreamdex.io/perps) and [developer guidance](https://app.testnet.dreamdex.io/docs/developers/perps-testnet). This document does not approve a claim or transaction.
- Check receiving address, eligibility, credit market restrictions and whether USDso is credited to margin rather than wallet assets. If STT or eligible collateral is missing, stop and request official support/bounty USDso through Discord. Do not substitute Arena credit.

## Required checks

| Check | Expected | Human result / evidence |
| --- | --- | --- |
| Visit `/app` disconnected | Public markets; no selected account, balances, positions or history | Pending |
| Connect the independent wallet | Only its address/data; not the bounty account | Pending |
| Switch away from Tokyo; switch/add back | Writes blocked off-network; wallet shows verified 50383/RPC/STT configuration | Pending |
| Funding guidance | Correct STT/USDso state; effective official URL and actual receiving address verified | Pending |
| Reject unsigned review and wallet request | No submission hash; actionable rejection; approval rejection never starts deposit | Pending |
| Choose a small exact deposit supported by your balance | Review exact approval to MarginBank; successful canonical receipt before a separate deposit review; margin actually credited | Pending: approval hash, receipt, deposit hash, deposit event |
| Review and open a minimum/grid-valid IOC | From your wallet, value zero, official pool, IOC enum **2**, reviewed **300-second** expiry; signed only after inspection | Pending: transaction hash, receipt, fill events, resulting position |
| Review a limit and cancellation | Limit enum **0**, same expiry; resting order distinct from fill; cancel refreshes ownership/status | Pending: placement/cancel hashes and actual remaining order |
| Configure/arm Guardian | Account/pool settings; active-tab and wallet-approval limits disclosed; reload disarms | Pending |
| Guardian trigger | Exactly one review/request; human decides whether to sign; verify partial/no fills and remaining position separately | Pending: trigger/review and any approved hash/events |
| Partial and full close | Fresh opposite-side size, lot/minimum valid; no claim of guaranteed protocol reduce-only; verify actual remainder | Pending: reviewed size, hashes, fills, refreshed position |
| Protocol-permitted withdrawal | Exact reviewed amount; health/paper-credit restrictions honored | Pending: hash, receipt, actual transfer; rejection if restricted |
| Switch/disconnect during review/pending approval | No dependent deposit, old hash/toast/draft/dialog/armed state on new account; already-submitted tx may still mine | Pending |
| Switch A→B→A and reload | Scoped preferences/data; armed state never restored; transaction evidence remains under its sender | Pending |
| Temporarily offline/slow RPC | Explicit stale/unavailable data and recovery; check submitted hash before retry | Pending |

Record failure details in one `feedback/` Markdown per issue: severity, area, reproduction, expected/actual, public evidence, SDK/network/address. A confirmation is not a fill; a screenshot is not verified profit.

## Automated coverage and remaining gaps

`npm run test:e2e` exercises two injected test-only addresses, account/network/disconnect cleanup, exact funding/reverted receipts, rejection/gas, IOC success/no-fill/revert, partial/full close, Guardian trigger/reload, chart/history failures, exports and pinned reads. `npm run test:e2e:types` checks the harness too. Unknown external hosts are blocked; the mock EIP-1193 provider never signs or broadcasts.

Still human/unverified: actual second-wallet credit eligibility/receiving account, real receipts/fills/settlement, wallet-extension UX outside Chromium, liquidity-driven partial fills, protocol races after preflight, inactive-tab monitoring, long outages/receipt timeouts, full history/funding/cohort inputs, deployment parity and capacity. Historical offline signing/broadcast test skips do not certify browser execution or authorize sends.
