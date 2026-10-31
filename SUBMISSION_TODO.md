# Submission checklist

Updated **31 October 2026** · Builder Bounty, not Perps Arena · Deadline **1 November 2026, 23:59 UTC** (user-provided).

## Main verification path for judges without funds

- [ ] **record the full-flow demo video and show tx hashes** — a 2–3 minute real-flow recording of Approve → Deposit → Open → Monitor → Close → Settle, with unsigned review, successful canonical receipts, actual fills, remaining position and MarginBank settlement. Include Tokyo explorer links; do not imply confirmation alone is a fill.
- [ ] Add the video URL to the README/submission. Until recorded, do not claim it exists or that historical owner-relayed FOK proves execution through this UI.
- [x] Link the explicit [Live test account (read-only)](https://lucid-keeper.vercel.app/app/profile/0x1420cF8Bb9D92C3fDb674ECc5A57295c59078fDA) in the local landing hero and README; never select it as a default signer. Verify deployed route after owner publication.
- [x] Link real [deposit](https://explorer.testnet.somnia.network/tokyo/tx/0xf0308d749b0401b9fa0f31149af3dbbaaf9ff5e22ff6d25cf056819d01b89fc9) and [DOGE short](https://explorer.testnet.somnia.network/tokyo/tx/0x023d5bc0ab40df5a96ae322b36115b1889847ed4112c031be4077c862cab4e4c) proof with owner-relayed/FOK attribution.
- [ ] Add the **DOGE close** hash only after an actual, separately authorized and verified close. No close preparation, signature or broadcast is authorized by this checklist.

Trading on Tokyo testnet needs STT (gas) and USDso collateral distributed by the bounty program to whitelisted wallets. Any wallet holding those funds can connect and trade with LucidKeeper. Wallets without funds can explore in read-only mode.

**Known limitation: independent-wallet trading requires program-distributed funds. Do not use Arena funds.** Unfunded judges can inspect public profile/history/docs and real receipt proof without signing. Guardian stress preview requires a real fresh position; otherwise only the controls can be inspected.

## Owner delivery (still pending)

- [ ] Publish the reviewed branch/build; verify effective deployed routes, asset parity and headers. Agent does not push or deploy.
- [ ] Complete real funded-wallet QA separately. No simulated production prices, balances, fills or PnL.
- [ ] Publish 2–3 X posts mentioning **@DreamDEXSomnia** and **@Somnia_Network**; replace README drafts with real URLs.
- [ ] Deliver [feedback](feedback/README.md) and submit the bounty/DoraHacks materials before the deadline.
- [ ] Review [security](docs/SECURITY_NOTES.md), [financial](docs/DISCOVERIES.md) and [capacity](docs/SCALABILITY.md) limitations. Local automated checks are not real-wallet or deployment certification.
