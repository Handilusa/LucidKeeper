# Reusable README prompt

Use this prompt when refreshing the judge-facing README. Give the assistant access to the current repository and public sources.

```text
Act as a technical product writer preparing LucidKeeper for the dreamDEX Perps
Builder Bounty. Write a concise, persuasive English README.md from verified
repository evidence. Start by reading package.json, STATUS.md, src/main.tsx,
src/content/project.ts, docs/LANDING_SOURCES.md, docs/PORTFOLIO_DATA.md,
docs/OFFLINE_SIGNING.md and the latest quality report. Do not read secrets.

Lead with: “Perps execution. Risk in sight.” Explain the problem, audience and
product in plain English. Link the demo and source. Include a historical product
screenshot, explicitly dated and never presented as live account data.

Required sections:
1. What it does and why it stands out: order review, cross-margin visibility,
   browser-local Guardian, receipt/fill distinction and sourced portfolio.
2. A 60-second read-only judge tour: /, /app, /app/profile, /app/docs.
3. Lifecycle: approve → deposit → open → monitor → close → settle.
4. Why Somnia / why Tokyo: attribute architectural claims to exact official
   docs.somnia.network URLs. Explain the product fit; do not invent comparative
   benchmarks, sub-cent fees or guaranteed execution times.
5. Architecture and actual local setup commands from package.json. Distinguish
   the active React/Vite app from the retained compatibility HTTP terminal.
6. Historical evidence with explorer links, blocks, observed outcomes and
   provenance. The 30 October 120 DOGE fill is owner-relayed, independently
   audited FOK (orderType=1), not IOC or proof that this UI executed it.
7. Portfolio methodology: pinned current reads, bounded indexed history,
   local alias, CSV and share image. Price PnL excludes fees/funding. Requested
   ROI = PnL / max(100, starting account value + max net deposits), ×100 for
   percent. If starting equity/full cash flows/window PnL are missing, show
   unavailable. Do not invent win rate, an equity curve or a leaderboard.
8. Security and limits: Testnet – no real funds; chain 50383; STT gas / USDso
   collateral; active tab and wallet approval required; no app-held keys;
   deposited funds sit in dreamDEX MarginBank; no privacy guarantee; current
   runtime action/wallet restrictions and incomplete validation stated honestly.
9. Quality: only actual dated commands/results, failures/skips and artifact
   paths. Local Lighthouse is a lab result, not a production or device claim.
10. Roadmap and “X posts”. Preserve required @DreamDEXSomnia and @Somnia_Network
    mentions. Keep drafts labeled as drafts until real published URLs exist.
11. Official sources, feedback and a link back to this reusable prompt.

Tone: confident through specificity, not hype. No fabricated activity, returns,
testimonials, partnerships, audit certification, mainnet dates or deployment
claims. Keep historical facts, live observations and future work distinct.
Preserve transaction hashes and existing evidence. Where facts conflict, cite
the newest independently verified record and explain the limitation. Do not
sign, prepare or send transactions, connect a wallet, or publish to GitHub.
```
