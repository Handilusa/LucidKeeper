# New-wallet funding: sourced verification

## Current product guidance — 31 October 2026

The owner's latest local docs/UI request supersedes the product-copy failure below; it is user-directed guidance, **not newly obtained independent team confirmation**:

Trading on Tokyo testnet needs STT (gas) and USDso collateral distributed by the bounty program to whitelisted wallets. Any wallet holding those funds can connect and trade with LucidKeeper. Wallets without funds can explore in read-only mode.

**Do not use Arena funds. Known limitation: independent-wallet trading requires program-distributed funds.** Current landing, funding state, field guide and README no longer suggest a public distribution endpoint or Arena credit. Ask official bounty support for missing funds. Profiles/history/docs and the explicit Live test account provide read-only exploration; Guardian stress preview requires a real fresh position. [Main demo-video verification checklist](../SUBMISSION_TODO.md).

The prior source observations and comparison below remain historical evidence for `755e6f3`; grant quotas, each judge's eligibility and actual receipt of funds remain unverified. No new team contact, claim, fund movement or close occurred in this docs/UI task.

## Historical read-only report

Observed **31 October 2026**. Documentation only: no claim, wallet connection, signature, transfer or funding preparation. **Builder Bounty, not Perps Arena.** Public documentation does not establish that a judge's independent wallet is funded or eligible for bounty collateral.

## What the official sources establish

- [dreamDEX developer guide](https://app.testnet.dreamdex.io/docs/developers/perps-testnet) ([raw source](https://app.testnet.dreamdex.io/docs/developers/perps-testnet/README.md)): Tokyo/Hideki chain **50383**, gas **STT**, MarginBank `0x478769E1177C0773c43A593DCCc4Ad15F15F1394`, perps collateral **USDso** `0xed7993A74dAe1e6656B704A424DcD8711aAf4F72`, **18 decimals**. Market base decimals vary; the SDK's generic `collateral` entry is not the perps token.
- Its **Get test funds** section describes signing into the official app and using **Link a Bot → Send it … for gas / Top up**. [Link a Bot](https://app.testnet.dreamdex.io/docs/trading/common/link-a-bot.md) describes a linked wallet/operator relationship. This is a description of their app workflow, **not a recommended funding route for this bounty**: the source account, receiving account, independent-wallet entitlement, top-up limit and non-Arena provenance have not been established.
- The same developer guide says an address with no perp positions/orders can claim **1,000 paper USDso once**, subject to `getPerpVoucherEligibility` and permitted markets. However, [Margin & Liquidations → Paper USDso](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/margin-and-liquidations.md#paper-usdso) explicitly identifies that credit as **Perps Arena's voucher**. The [perps overview](https://app.testnet.dreamdex.io/docs/trading/perps-testnet/README.md) also directs users to Arena. **Do not claim, use, transfer or recommend that voucher for the Builder Bounty.** Generic availability in a developer page is not bounty permission.
- That voucher page describes non-withdrawability, allowed-market restrictions, locked leverage settings, no builder fees and possible reclaim after 14 days while flat and without resting orders. These are **voucher rules**, not independently sourced Builder Bounty funding limits.
- [SDK → Get testnet funds](https://prd.smk.somnia.host/docs/typescript/how-to/get-testnet-funds) explicitly targets **Shannon**, not Tokyo. Its Somnia/Google/Stakely/Thirdweb faucets, public USDso mint and tUSDC binary faucet do **not** establish a Tokyo faucet, Tokyo mint or perps USDC support. Do not run those examples for this project.
- [dreamDEX docs index](https://app.testnet.dreamdex.io/docs) is general protocol documentation. It does not verify a judge's whitelist/email, a Tokyo faucet quota, or a Builder Bounty grant for a new address.

**UNVERIFIED:** a public, independent-wallet Tokyo STT faucet; its quota/cooldown; Builder Bounty USDso grant amount and per-address limits; exact whitelist/email procedure; whether every judge can obtain non-Arena collateral before the deadline. No confirmed source makes USDC/tUSDC an alternative collateral for these Tokyo perp pools.

## Safe human funding gate

1. Ask the official dreamDEX bounty team/support in Discord for **Tokyo 50383 STT and Builder Bounty USDso for the judge's own EOA**, including eligibility/whitelist/limits. This support step follows the owner's project policy, not a newly verified public faucet guarantee. Obtain a dated team answer; do not invent an invite link or assume an Arena claim is permitted.
2. Verify the actual official browser origin **`https://app.testnet.dreamdex.io`** and the exact receiving EOA before any official-app action. An HTTP documentation fetch does not verify a browser tab. Never use the Arena smart wallet or transfer between it and the bounty EOA.
3. Check STT on **50383**, USDso at the token above, and real MarginBank credit separately. A wallet balance and a margin-account balance are not interchangeable.
4. If STT or eligible bounty collateral is missing, **stop**. Do not substitute Arena credit, funds from another wallet, a different chain's faucet, or an unsourced mint.
5. Once funding is independently confirmed, follow the human-controlled exact approval → successful canonical receipt → separate deposit workflow in [MANUAL_QA](MANUAL_QA.md). No funding action is authorized by this document.

## Existing product/documentation comparison at `755e6f3`

`src/features/terminal/FundingGuide.tsx`, `src/app/TerminalRoutes.tsx` and [README](../README.md#the-full-lifecycle) link to the exact official app `/perps` and developer guide above. Their STT/50383/USDso, eligibility, market-restriction and receiving-address cautions are sourced; no invented Tokyo faucet/quota is displayed.

**FAIL — bounty-specific guidance:** they also suggest **paper USDso** without explicitly excluding the Arena-associated voucher or establishing a bounty-safe new-wallet path. [MANUAL_QA](MANUAL_QA.md) already says to stop and request bounty USDso through Discord and not substitute Arena credit, but that stronger distinction is missing from the funding screen/README lifecycle. No application or README edit was made in this read-only review. The owner must clarify this before advertising independent-wallet funding as turnkey.
