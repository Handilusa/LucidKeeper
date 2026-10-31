# Existing landing motion ignores pause and overallocates its canvas

Severity: P1 — accessibility and local browser responsiveness.
Area: LucidKeeper landing; not a reproduced dreamDEX/Somnia defect.

## Reproduction
At `a8bbf99`, open `/` at 375/768/1280/1920 px with motion enabled. Scroll to the architecture figure, then activate Pause workflow animation. Inspect its beacon's CSS animation and the GSAP/canvas drivers. The full local Chromium run also exercises this flow with tracing enabled.

## Expected
Pause, dynamic reduced-motion preference and hidden tabs stop all optional motion. Offscreen decorative components do not run, and the whole-page canvas uses a bounded bitmap.

## Actual
Independent local browser inspection shows `beaconPulse` still running after Pause, even though `data-motion` is absent and SMIL photons are removed. Newly inherited GSAP/canvas components check the system preference only at mount, ignore the user pause, and incompletely clean up repeating tweens. The canvas allocates its entire page height at up to 2× density. Traced animated-route checks slow down severely and time out; this recording is not a real-device performance benchmark.

## Evidence
31 October 2026: complete run `deposit-browser-full-v1`: 114 passed / 5 failed. Four inherited motion tests time out (DOM calls alone take multiple seconds); the fifth failure is an obsolete shared-theme expectation, not a terminal palette change. Failed traces and separate `diagnose-workflow.mjs` remain in local ignored `.git/lucidkeeper-audit/`. No real wallet requests or chain operations.

## Resolution
Narrow shared pause/intersection/tab-visibility gates for existing GSAP/canvas/SMIL, scoped GSAP cleanup, cancelable simulation and HUD timeout/interval timers, and CSS workflow gates. Canvas bitmap limited to 2 million pixels and 4096 px per dimension; six invariant blurred plasma sprites are cached instead of blurring whole-page surfaces each frame. Original node drift unchanged; no pending synthetic landing panels imported.

Accepted **31 October, 22:31 UTC**: complete Chromium **121 passed / 0 skipped / 0 failed**. `test/e2e/landing-motion.spec.ts` verifies the canvas actually changes while running and canvas/GSAP/HUD snapshots stay static under pause, dynamic preference and hidden tabs; inherited workflow keyboard/pause checks pass at 375/768/1280/1920. Historical 114/5 and 120/1 runs and the unsuccessful old-build diagnostic remain preserved. Local traced regression acceptance is not a real-device frame-budget benchmark.

## Environment
Windows, Node 24.19.0, Playwright Chromium, local production build. SDK 0.32.1 and Tokyo 50383 unchanged; test-only intercepted transport, no real wallets or live sends.
