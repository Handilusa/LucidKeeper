# Landing and portfolio delivery report

31 October 2026 · local delivery complete on `feat/landing-and-profile` · base `c4d343c`.

## Delivered routes

| Route | Delivered |
| --- | --- |
| `/` | Evidence-led product story, lifecycle, differentiation, Somnia architecture/sources, Tokyo receipt trail, security/limits, roadmap, FAQ and portfolio invitation |
| `/app` | Existing terminal with shared palette, navigation, number/interaction polish |
| `/app/profile` | Read-only current account/positions, local alias, time windows, six sortable tables, bounded PnL/volume charts, CSV and share PNG |
| `/app/docs` | Funding/lifecycle/operating field guide |

All Launch App links target `/app`. Every route displays **Testnet – no real funds**. New landing and portfolio delivery is local; the last independently checked production version remains `0dce074`. No push or new deployment was performed.

## Commits

| Stage | Commit | Scope |
| --- | --- | --- |
| P0 | `c11faba` | Evidence-led landing, app routes and guide |
| P1 | `7a21676` | Sourced read-only portfolio and exports |
| A | `f9cc58c` | Navy/violet/cyan/magenta surfaces and atmosphere |
| B | `521220f` | Optional Motion/Lenis choreography, pause/reduced-motion and responsive image correction |
| C | `2448a83` | Actual-value animations, PnL colors, tabs/loading/rows/dialogs/toasts and mobile identity correction |

The final refinement/documentation commit follows these stages and contains the portfolio invitation, final link assertions, this report, the English README and the [reusable README prompt](README_PROMPT.md). Obtain its exact hash with `git log -1 --format=%H -- docs/LANDING_PROFILE_QUALITY.md`.

## Checks and evidence

Checks use a local **production Vite build** with public Tokyo data. Screenshots are dated observations; values naturally differ between captures. Browser audits block transaction/signing/mutation requests and recorded **zero attempted writes**. No wallet was connected, Guardian armed, transaction prepared, signed or broadcast.

| Check | Result |
| --- | --- |
| `npm run build` | Pass; inherited Rollup annotation / trading-chunk size warnings remain |
| `npm run lint` | Pass |
| `npm run typecheck` | Pass |
| Offline 13-file subset | **57 passed / 20 skipped / 0 failed**; excludes real-service `dreamdex.test.mjs` |
| Existing read-only Playwright suite | **15 passed / 16 preserved skips / 0 failed**; `/app` and brand selectors updated for routing |
| C normal-motion route/width audit | **16 states**, zero axe WCAG A/AA violations, overflow, console/page errors or writes |
| C corrected profile audit | **4 widths**, zero axe/overflow/errors/writes |
| Final reduced-motion route/width audit | **16 states**, zero axe WCAG A/AA violations, overflow, console/page errors or writes; every Launch App and the hero portfolio destination checked |
| Profile interaction audit | Local alias validation/persistence/removal, six tables, four windows, sorted **15-fill CSV**, pagination, actual **1200×630 PNG**, read abort/error/retry recovery pass |
| App interactions | Four widths: keyboard tabs, animated collateral dialog focus trap/Escape/return, actual public-position PNG and success toast, runtime reduced-motion switching pass |
| Landing motion | Four widths: pause/resume, system reduced-motion switching, desktop Lenis teardown/tilt, lifecycle reveal and accessible receipt values pass; observed running properties only transform/opacity |
| Final portfolio invitation | Visually inspected at **375/768/1280/1920**; readable stacked/mobile and inline/desktop layouts, contained CTA, correct destination, zero overflow/errors/writes |

The terminal suite compares displayed portfolio health/positions against actual decoded responses grouped by block. Its existing wallet/fill/race skips remain explicit; passing read-only checks does not certify transaction execution. The separate app audit now covers real-position export/toast behavior without changing those inherited registrations.

### Lighthouse

Lighthouse **12.8.2**, Playwright Chromium, default mobile simulated throttling, `http://127.0.0.1:4175/`:

| Run | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
| --- | ---: | ---: | ---: | ---: | --- | --- | --- |
| Initial B | 83 | 100 | 100 | 92 | 3.8s | 0.022 | 0ms |
| Corrected B, 30 Oct 23:07 UTC | **87** | **100** | **100** | **100** | 3.3s | 0.022 | 0ms |
| Final, 30 Oct 23:24:39 UTC | **87** | **100** | **100** | **100** | 3.3s | 0.022 | 0ms |

Target: performance **≥85**, accessibility **≥95**. The final build meets both. Lab scores vary; these are not production, real-device, measured network-latency or guaranteed-60fps claims. Responsive derivatives reduce the screenshot from **150,010 bytes** to **16,474 / 51,318 / 103,066 bytes** at 480/960/1440px; the original capture remains available.

## Screenshot and artifact index

All audit artifacts are local/ignored under **`.git/lucidkeeper-audit/landing-profile/`**. Widths: **375, 768, 1280, 1920**, viewport height 1000 unless a test names another height.

| Stage | Directory | Contents |
| --- | --- | --- |
| Before | `before-vivid/` | Landing, terminal and guide at all four widths, including requested 375/1280 baselines |
| Portfolio before | `p1-fixed/` | Original portfolio and 16-state route audit |
| A | `pass-a/` | All four routes/four widths |
| B | `pass-b/` | Reduced-motion four-route/four-width audit |
| B normal, corrected | `pass-b-fixed-motion/` | Hero/lifecycle/proof at all four widths; motion report |
| C | `pass-c/` | Normal-motion four-route/four-width screenshots |
| C profile, corrected | `pass-c-profile-fixed/` | Final identity/metrics layout at all four widths |
| C app interactions | `pass-c-interactions-final/` | `collateral-{width}.png`, `share-toast-{width}.png`, actual exported position images |
| C profile interactions | `pass-c-profile/` | `fills.csv`, `portfolio.png`, interaction report |
| Terminal suite | `pass-c-e2e-fixed/` | Responsive captures, real pinned-portfolio attachments; sibling `.log` records results |
| Final routes | `final/` | All four routes/four widths with reduced motion; 16-state report |
| Final normal motion | `final-motion/` | Hero/lifecycle/proof at all four widths; pause/system-preference report |
| Final invitation | `final-invitation/` | `invitation-{width}.png` at all four widths; containment/destination report |
| Final Lighthouse | `final-lighthouse.report.json` / `.html` | Full final mobile lab result |

Route screenshot names: **`landing-{width}.png`**, **`app-{width}.png`**, **`profile-{width}.png`**, **`docs-{width}.png`**. Landing/profile/guide also have `-full.png`. Machine-readable checks are in each directory’s `report.json`; Lighthouse reports are sibling `.report.json` / `.report.html` files.

### Failures retained and resolved

1. A profile inline explorer link failed axe’s text-link distinction; an underline fixed it before P1 acceptance.
2. **Visual inspection caught invisible animated headline words** despite passing DOM/opacity checks. Moving gradient clipping onto each animated word fixed Chromium compositing. Failed `pass-b-motion/` screenshots remain; fixed renders were inspected at all four widths.
3. Initial Lighthouse could not find Chrome. The runner now selects Playwright Chromium. Its first completed result was 83; responsive WebP and a valid robots file produced the corrected scores above.
4. Mobile identity content crowded the avatar/address/copy action. Grid layout corrected it; both original and corrected captures remain.
5. The first terminal-suite launch met an occupied 4174 port. The successful run used `E2E_BASE_URL=http://127.0.0.1:4175`.
6. The app audit initially read `aria-selected` before React updated, then looked for the collateral trigger in the mobile Activity pane. It now waits for selection and uses the Trade pane. No app logic changes were needed for these harness errors.

## Honest visual critique

**Before:** strong typography and useful data, but nearly uniform black surfaces flattened hierarchy; the landing and app felt disconnected. The new portfolio was functional but its mobile identity card was crowded.

**After:** the Guardian insignia, violet/cyan headline, receipt treatment and layered navy surfaces establish a shared identity. Motion reinforces navigation, values and lifecycle steps; persistent controls and reduced motion retain access. Signed values, source notes and missing-data states remain readable.

**One post-pass refinement:** expose the portfolio directly in the hero/footer and explain its value alongside the comparison. The review found a real discovery gap, so the addition uses existing layout patterns and contains no invented metrics.

Final inspection confirms that the invitation's title, source explanation and CTA remain readable at all four widths. It stacks at 375px and fits inline from 768px upward. Final hero and portfolio screenshots also preserve the corrected heading and mobile identity layouts. This closes the discovery gap identified in passes B/C.

**Remaining tradeoffs:** the landing is deliberately long and text-heavy for judges; the large historical terminal screenshot is less legible on phones, where its full-size link matters. External font/data services still affect loading. Portfolio charts have bounded history, not complete account-return coverage. Further visual rounds would add less value than completing the owner’s delivery and genuine execution/assistive-technology validation, so no second post-pass redesign was made.

## Deliberate omissions and outstanding delivery

- ROI, historical equity curve, win rate and leaderboard: required complete inputs/cohort are unavailable; no substitute values are drawn.
- No verified DOGE close, new UI execution proof, connected-wallet transaction tests or on-chain operations in this task. Historical DOGE evidence remains owner-relayed, independently audited **FOK**, not IOC.
- GSAP omitted because no pinned/scrubbed section justified it. Lenis/tilt/highlights are desktop fine-pointer enhancements; system reduced motion disables effects.
- Actual screen-reader, real-device and full wallet/race testing remain pending; axe/keyboard checks are not substitutes.
- Publication, published X URLs, recorded demo and bounty submission remain owner delivery items. README posts are labeled drafts. Deadline supplied by the owner: **1 November, 23:59 UTC**.

## Reproduce

Start `npm run build` and `npm run preview -- --host 127.0.0.1 --port 4175 --strictPort` in separate steps. Install the Playwright browser with `npx playwright install chromium` if needed. Browser scans expect **axe-core 4.11.0** at `.git/lucidkeeper-audit/axe.min.js` (the reviewed audit copy); on a fresh clone, download that exact version from `https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.11.0/axe.min.js` after creating the directory.

```bash
node scripts/audit-pages.mjs review
node scripts/audit-pages.mjs review-normal --motion
node scripts/audit-profile.mjs review-profile
node scripts/audit-motion.mjs review-motion
node scripts/audit-app-motion.mjs review-app-motion
node scripts/audit-lighthouse.mjs review-lighthouse
```

`AUDIT_URL` overrides the standalone audit URL. `E2E_BASE_URL` overrides the existing Playwright suite’s preview; otherwise it starts port 4174. Financial observations are real and may change or become unavailable; the audits do not replace responses. Choose a new output name to preserve prior evidence.

Source review confirmed no changes from `c4d343c` in `src/lib`, `src/chain`, `src/features/trade`, `src/features/margin`, `src/features/sentinel` or `src/app/App.tsx`. `PositionsTable` changes are limited to the existing numeric display component. Native page navigation preserves the terminal’s existing unload behavior.
