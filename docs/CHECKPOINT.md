# Frontend checkpoint

- **Timestamp:** 2026-10-29T14:42:41+01:00
- **Current task:** Implement the user's screenshot corrections and Guardian-first Somnia styling.
- **Repository:** This app folder is the Git root; branch `main`, starting HEAD `968746b`.
- **Source of truth:** Read all of `../prompt_frontend.txt` first; never edit or copy it into the repository.
- **Files touched in this step:** `STATUS.md`, `docs/CHECKPOINT.md`, `docs/STATE.md`, `docs/DECISIONS.md`, `docs/REQUIREMENTS.md`; local ignored `docs/CODEX_MEMORY.md`. Application edits not started yet.

## DONE

- Documentation baseline complete (`7266e4b`, `968746b`); read the full immutable brief and current checkpoint/state again. Existing DESIGN remains the built inventory.
- **Current `npm run typecheck` PASS.** Inspected App, TradingBox, Chart, AccountSummary, MarketHeader, AppHeader, RiskGuardian, ABIs and existing terminal tests. Refetched Web Interface Guidelines and official dreamDEX testnet developer documentation.
- Reproduced in code: balances are deliberately nulled on errors/age, liquidation preview is static Unavailable, execution axis lacks Last title, leverage lies low inside the scroll region, Guardian is collapsed. User screenshots are reported evidence; actual browser reproduction is next.

## IN PROGRESS

`src/features/trade/TradingBox.tsx` preview / `src/app/App.tsx` query-derived display state: dependency and protocol research before implementation. No function edited yet.

## Numbered plan

1. [x] Resume and typecheck inherited redesign; record this correction checklist.
2. [ ] Verify official liquidation/funding/fee units, Somnia brand assets and local token-logo licensing; run remaining inherited baseline gates and preserve a working source commit.
3. [ ] Implement input-driven liquidation estimates, visible leverage, retained stale account values and explicit parameter freshness; test financial calculations and stale/account switching.
4. [ ] Implement reversible robust chart scale, exact outlier disclosure, Last/Mark labels, position overlays, cursor tooltip and timestamped feed state; test unchanged OHLC.
5. [ ] Apply verified Somnia accent, three surface levels, local token logos and always-visible custom Guardian gauge; update DESIGN/export with actual values.
6. [ ] Add state-driven price/estimate/transaction motion, purposeful empty states and bounded loading feedback; honor reduced motion.
7. [ ] Run unit/type/lint/build/E2E and rendered desktop/mobile QA, inspect production build and deployed site read-only, document differences and commit each working increment. No push.

## NEXT — exact first step

Read `test/e2e/terminal-fixture.ts`, `playwright.config.ts`, the pure risk math and official margin/funding docs; run `npm test`, `npm run lint` and `npm run test:e2e` as the inherited baseline. Research brand kit in parallel. Do not reuse the old documentation preservation validator after intentional source edits.

## Commands to run/test

Run here. `rtk` is unavailable; use native commands without installing it.
- `npm run typecheck` passed in this task. Next baseline: `npm test`, `npm run lint`, `npm run test:e2e` (build included).
- `git diff --check`, `git diff --cached --check`; explicit paths per commit. Browser screenshots/research artifacts stay under `.git/lucidkeeper-audit/`.

## Open problems

- Inherited uncommitted redesign: 16 modified source/config/test files and 11 untracked files. Review and validate before committing this source baseline; preserve it rather than starting over.
- Historical STATE claims `00d1852` shipped; local starting HEAD is `dc49658`. Earlier deployment/test claims are not current verification. Shared-token adoption, tiny labels/touch targets, formatting, motion and browser QA remain in DESIGN.
- Liquidation in cross margin is portfolio-dependent. Show a clearly labeled sizing scenario driven by typed size/leverage plus verified maintenance/fees, and distinguish any actual portfolio estimate. An outlier candle count cannot be represented as an exact fill count without execution-level data.
- Official Somnia kit, actual funding window, fee reads, production parity and browser results are not yet verified. Production cannot receive these local changes without the user's push/deploy.
- No keys, secrets, personal notes, unrelated project material or fake market data in the repo. No on-chain actions without explicit approval. No push.

## Restart protocol

Read the complete brief, CHECKPOINT, DESIGN and STATE; summarize in five lines, then execute NEXT. Refresh CHECKPOINT after every meaningful file/component/fix and at least roughly every ten minutes; write a numbered plan before long tasks. Update DESIGN with built design changes; append STATE/DECISIONS/REQUIREMENTS. Commit each working step with its docs using explicit paths.
