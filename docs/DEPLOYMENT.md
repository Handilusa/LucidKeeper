# Deploy LucidKeeper — owner-operated

31 October 2026 · static Vite frontend · Tokyo 50383 only. The agent does not authenticate, push, deploy, connect a real wallet or sign. No frontend signer allowlist/execution env gate. Deadline (user-provided): **1 November 2026, 23:59 UTC**.

## 1. Validate the reviewed branch

Run from the **repository root** (`dream-sentinel/` locally). That directory's contents are the GitHub repository root; Vercel Root Directory is **blank/default**, not `dream-sentinel` and not the parent workspace.

```sh
git switch feat/landing-and-profile
git status --short
git log -8 --oneline
npm ci
npm run typecheck
npm run test:e2e:types
npm run lint
npm test
npx playwright install chromium
npm run test:e2e
npm run test:load -- after
node scripts/audit-release.mjs
```

Requires Node **24.x recommended** (package supports ≥22; Node 22.15+ for strip-types tests), npm and a free port **4174** for E2E. No keys/credentials for checks. `npm ci` warnings/advisories must be reviewed; do not use `npm audit fix --force` or blindly approve install scripts. [Residual dependency gate](SECURITY_NOTES.md). CI includes these functional checks but has not run on GitHub yet.

## 2. Environment (exact supported values)

| Variable | Required? | Meaning |
| --- | --- | --- |
| `VITE_WALLETCONNECT_PROJECT_ID` | Optional; recommended for your deployment | **Public** Reown/WalletConnect project ID from your own project. Built-in public fallback: `006c638cc6ec95a3982952a1ee86aa05`. Configure your actual deployment origins in Reown; rebuild/redeploy after changes. Injected wallets still work without a custom ID. This is not a signer/address override. |
| `E2E_BASE_URL` | Tests only | Optional **local** preview base URL; leave unset for the automatic 4174 server. Not a production setting. Do not aim mocked-wallet tests at a real funding site. |
| `AUDIT_URL` | Optional read-only standalone visual audits | Local 4175 preview by default. Not used by the deployed frontend/load runner. |
| `PORT` | Legacy server only | `scripts/ui-server.mjs` compatibility/read APIs; not Vite/Vercel frontend configuration. |

No RPC/indexer/chain/contract or execution variables are implemented. They are verified source configuration: HTTP `https://api.hideki2.infra.testnet.somnia.network`, WS `wss://api.hideki2.infra.testnet.somnia.network/ws`, GraphQL `https://hideki-dev.smk.somnia.host/v1/graphql`. Chain 50383, USDso/official contracts in README. Never put private keys, seeds, admin/indexer secrets or provider secrets into **any `VITE_*`**; build values are public. No `.env` file is required or inspected by the agent.

Optional public ID for a one-session local build (PowerShell):

```powershell
$env:VITE_WALLETCONNECT_PROJECT_ID = 'YOUR_PUBLIC_REOWN_PROJECT_ID'
npm run build
npm run preview -- --host 127.0.0.1 --port 4175 --strictPort
```

Open `http://127.0.0.1:4175`. In a second terminal/browser, check routes. `npm run dev` / `npm run ui` run the retained Node compatibility server (serves dist if present), **not Vite HMR and not the Vercel production backend**. Frontend development: `npx vite --host 127.0.0.1`. Static deployment needs no `/api/status` / `/api/evidence` service.

## 3. Publish and configure Vercel

Only the owner runs:

```sh
git push -u origin feat/landing-and-profile
```

Review the branch/CI, then merge it into `main` with your normal GitHub PR flow (no force-push/history rewrite). To deploy the branch before merging, select it explicitly in Vercel; default `main` still points to the earlier published version. Do not confuse a preview build with the demo's production URL.

Vercel GitHub project settings:

- Repository: `Handilusa/LucidKeeper`.
- Framework: **Vite**; Root Directory: **blank/default**.
- Node: **24.x**; Install Command: **`npm ci`**; Build Command: **`npm run build`**; Output Directory: **`dist`**.
- Production Branch: **`main`** after merging, or explicitly choose the feature branch if that is the intended temporary production source.
- Add only optional public `VITE_WALLETCONNECT_PROJECT_ID` to intended Production/Preview scopes. No signing/backend secrets. Reown origin configuration must match the actual public URL.
- Keep repository `vercel.json`: SPA fallback to `/index.html`; hashed `/assets/*` cache 1 year immutable; HTML/other paths revalidate (no-cache); existing anti-framing/nosniff headers. No strict CSP certification is claimed; test wallet connectors before imposing one.

Other static hosts: deploy **only `dist/`**, serve existing assets before SPA fallback, never return HTML for missing JS, configure equivalent headers and HTTPS. No Node signing/service process or handoff directories belong in the deployment.

## 4. Check the effective deployed artifact

Record exact Git commit/build URL and UTC time. Verify direct visits/reloads to `/`, `/app`, `/app/docs`, `/app/profile` and `/app/profile/<public-address>`, plus invalid-address/not-found states. Check asset HTTP 200 + JS MIME, HTML revalidation/hashed asset immutable headers in DevTools, no stale mixed chunks, testnet badge, wallet-origin configuration and no console errors. The agent's local measurements do not verify Vercel headers or deployed commit.

Run [MANUAL_QA](MANUAL_QA.md) yourself. Funding eligibility/actual receiving address, canonical hashes/fills/settlement and real wallet requests remain unverified for this release. Verify effective official browser origin `https://app.testnet.dreamdex.io` before any separately approved funding/claim; no agent claim is authorized. Missing STT/USDso: stop and obtain official/bounty support, never Arena funds. Public profile lookup does not choose a signer.

## 5. Bounty handoff

- GitHub repo and correct deployed demo URL, commit and limitations.
- Minimum real independent-wallet lifecycle evidence, only from human-approved actions: hash, canonical receipt, actual fills and resulting account state separately. Existing historical owner receipts are already linked; do not relabel fixture hashes or FOK as current UI IOC.
- README `X posts`: replace drafts with actual published URLs and required mentions.
- Record a 2–3 minute demo; deliver feedback Markdown and complete bounty/DoraHacks submission before **1 November, 23:59 UTC**.

Consult [PRE_PUSH_AUDIT](PRE_PUSH_AUDIT.md). Functional checks passing does not remove the security, human-QA, missing-finance, capacity or publication gates.
