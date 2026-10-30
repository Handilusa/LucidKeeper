import { useState } from 'react';
import {
  ArrowUpRight,
  ArrowRight,
  Check,
  ShieldCheck,
  Eye,
  Wallet,
  Braces,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { Brand, TestnetBadge } from '@/components/Brand';
import { PROJECT, PROOF, SOMNIA_SOURCES } from '@/content/project';
import { ReceiptValue, Reveal, useLandingMotion, useMotionPreference } from './LandingMotion';
import './landing.css';

const steps = [
  ['Approve', 'Review the exact USDso allowance.'],
  ['Deposit', 'Wait for confirmation, then fund margin.'],
  ['Open', 'Review the order. Verify the actual fill.'],
  ['Monitor', 'Watch margin, mark price and risk.'],
  ['Close', 'Review an exit. Check remaining size.'],
  ['Settle', 'Verify realized PnL in MarginBank.'],
];
const faq = [
  [
    'Is this real-money trading?',
    'No. LucidKeeper runs on Somnia Tokyo testnet (50383). STT pays testnet gas and USDso is test collateral. This build does not support mainnet funds.',
  ],
  [
    'Will the Guardian close a position while I am away?',
    'No. The Guardian is browser-local. Keep the tab active and connected, and approve the wallet request when a trigger fires. Closing the tab stops monitoring. A trigger, a confirmed transaction and an actual fill are different events.',
  ],
  [
    'Can any wallet trade?',
    'Anyone can inspect the public demo. This bounty build only permits execution from the configured bounty EOA on Tokyo. Connecting another wallet does not authorize it to trade.',
  ],
  [
    'Where do I get test collateral?',
    'Request bounty USDso and Tokyo STT through the official dreamDEX/Somnia support channels. Confirm the network and token before funding. Arena credit and other wallets are not funding sources for this build.',
  ],
  [
    'Does a confirmed order mean I have a position?',
    'Not necessarily. An IOC order can partially fill or cancel its unfilled remainder. Inspect fill events and the updated position, not just the transaction receipt.',
  ],
  [
    'Can the Guardian prevent all liquidations?',
    'No. Stale data, browser suspension, wallet approval delays, price gaps and insufficient liquidity can prevent an exit. Cross-margin collateral is shared across positions. Risk estimates are not guarantees.',
  ],
];

function Launch({ large = false }: { large?: boolean }) {
  return (
    <a className={`button button-primary launch-button ${large ? 'launch-large' : ''}`} href="/app">
      Launch App <ArrowUpRight size={17} aria-hidden="true" />
    </a>
  );
}
export default function Landing() {
  const reducedMotion = useMotionPreference();
  const [paused, setPaused] = useState(false);
  const root = useLandingMotion(reducedMotion || paused);
  const features = ['On-chain market reads', 'Cross-margin visibility', 'Reviewable transactions', 'Evidence over promises'];
  return (
    <div className="landing" ref={root}>
      <div className="landing-atmosphere" aria-hidden="true">
        <span className="aurora aurora-violet" />
        <span className="aurora aurora-cyan" />
        <span className="aurora aurora-magenta" />
      </div>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="landing-header">
        <div className="landing-nav wrap">
          <Brand />
          <nav aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <a href="#different">Why different</a>
            <a href="#somnia">Why Somnia</a>
            <a href="#faq">FAQ</a>
          </nav>
          <Launch />
        </div>
        <div className="landing-network">
          <TestnetBadge />
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="hero wrap" aria-labelledby="hero-title">
          <div className="hero-copy">
            <div className="guardian-insignia" aria-hidden="true">
              <svg viewBox="0 0 320 320" fill="none">
                <circle className="insignia-orbit" cx="160" cy="160" r="145" />
                <circle cx="160" cy="160" r="114" strokeDasharray="2 12" />
                <path className="insignia-crosshair" d="M160 0v30m0 260v30M0 160h30m260 0h30" />
                <path className="insignia-shield" d="M103 96l57-20 57 20v70c0 34-32 64-57 83-25-19-57-49-57-83V96Z" />
                <path className="insignia-monogram" d="M137 120v73h52m-27-73v47h27" />
              </svg>
              <span>HUMAN INTENT. ON-CHAIN EVIDENCE.</span>
            </div>
            <p className="section-kicker">
              <span className="signal-dot" /> DREAMDEX PERPS · BUILT WITH A GUARDIAN
            </p>
            <h1 id="hero-title" aria-label="Trade with intent. Keep risk in sight.">
              <span className="hero-line" aria-hidden="true">
                {'Trade with intent.'.split(' ').map((word) => <span key={word}><span className="hero-word">{word}</span>{' '}</span>)}
              </span>
              <span className="hero-line hero-accent" aria-hidden="true">
                {'Keep risk in sight.'.split(' ').map((word) => <span key={word}><span className="hero-word">{word}</span>{' '}</span>)}
              </span>
            </h1>
            <p className="hero-description">
              Your perps terminal and risk guardian, on one screen. Review each action, watch your
              margin and follow the evidence from order to settlement.
            </p>
            <div className="hero-actions">
              <Launch large />
              <a className="text-link" href="/app/profile">
                Explore portfolio <ArrowRight size={17} aria-hidden="true" />
              </a>
            </div>
            <p className="hero-footnote">
              Somnia Tokyo testnet · Browser-local guard · Wallet approval required
            </p>
          </div>
          <div className="product-stage">
          <figure className="product-window">
            <div className="product-caption">
              <span>
                <span className="signal-dot" /> THE WORKING TERMINAL
              </span>
              <span>Real UI capture · 30 Oct 2026</span>
            </div>
            <a
              href="/assets/product/terminal.jpg"
              target="_blank"
              rel="noreferrer"
              aria-label="View full-size historical terminal screenshot"
            >
              <img
                src="/assets/product/terminal-1440.webp"
                srcSet="/assets/product/terminal-480.webp 480w, /assets/product/terminal-960.webp 960w, /assets/product/terminal-1440.webp 1440w"
                sizes="(max-width: 767px) calc(100vw - 42px), (max-width: 1344px) calc(100vw - 66px), 1278px"
                width="1440"
                height="1000"
                fetchPriority="high"
                alt="LucidKeeper terminal with actual Tokyo market reads, margin health, chart, order review and positions. Historical snapshot, not live balances."
              />
            </a>
            <figcaption>
              <ShieldCheck size={16} aria-hidden="true" />
              <span>Know what you hold. Know what you are about to sign.</span>
              <a href="#proof">
                Inspect the receipts <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </figcaption>
          </figure>
          </div>
          <div className="hero-strip">
            <div className="feature-marquee">
              <div className="marquee-track">
                <div className="marquee-group">{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
                <div className="marquee-group marquee-copy" aria-hidden="true">{features.map((feature) => <span key={feature}>{feature}</span>)}</div>
              </div>
            </div>
            <button className="motion-toggle" disabled={reducedMotion} onClick={() => setPaused(!paused)}>
              {reducedMotion ? 'Motion off (system)' : paused ? 'Resume motion' : 'Pause motion'}
            </button>
          </div>
        </section>

        <section className="landing-section wrap problem" aria-labelledby="problem-title">
          <Reveal>
            <p className="section-kicker">THE SPACE BETWEEN ENTRY AND EXIT</p>
            <h2 id="problem-title">
              Opening a trade is easy.
              <br />
              <span>Staying deliberate takes work.</span>
            </h2>
            <div className="problem-grid">
              <article>
                <span className="problem-symbol" aria-hidden="true">
                  ↘
                </span>
                <h3>Margin moves with the market.</h3>
                <p>
                  Leverage can turn a small move into a large change in your margin buffer. An entry
                  price alone does not tell the whole story.
                </p>
              </article>
              <article>
                <Eye aria-hidden="true" />
                <h3>A plan needs attention.</h3>
                <p>
                  A stop-loss written in your notes cannot request an exit. Browser-local triggers
                  need an active tab and your wallet approval.
                </p>
              </article>
              <article>
                <Activity aria-hidden="true" />
                <h3>Fast decisions need clear context.</h3>
                <p>
                  When price moves, see the position, available collateral and estimated risk
                  together—before deciding what to do.
                </p>
              </article>
            </div>
          </Reveal>
        </section>

        <section
          className="landing-section lifecycle-section"
          id="how-it-works"
          aria-labelledby="lifecycle-title"
        >
          <div className="wrap">
            <Reveal>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">THE FULL TRADE, NOT JUST THE ENTRY</p>
                  <h2 id="lifecycle-title">
                    One lifecycle.
                    <br />
                    <span>Every step accountable.</span>
                  </h2>
                </div>
                <p>
                  Submission is not confirmation.
                  <br />
                  Confirmation is not a fill.
                  <br />
                  LucidKeeper keeps those distinctions visible.
                </p>
              </div>
              <ol className="lifecycle">
                {steps.map(([title, detail], index) => (
                  <li key={title}>
                    <span className="step-node">{String(index + 1).padStart(2, '0')}</span>
                    <h3>{title}</h3>
                    <p>{detail}</p>
                  </li>
                ))}
              </ol>
              <div className="architecture-grid">
                <div className="architecture-copy">
                  <p className="section-kicker">HOW IT WORKS</p>
                  <h3>
                    A clear view.
                    <br />A human decision.
                    <br />
                    An on-chain result.
                  </h3>
                  <p>
                    The SDK and public chain reads bring market and account state into the terminal.
                    The Guardian compares current risk with your browser-local settings. You review
                    and approve executable actions in your wallet.
                  </p>
                  <p className="limit-note">
                    Active tab required. The Guardian is not an always-on keeper, and it cannot
                    guarantee a fill.
                  </p>
                </div>
                <div
                  className="architecture-map"
                  aria-label="Wallet review connects the terminal and browser Guardian to dreamDEX contracts; receipts return on-chain results"
                >
                  <div>
                    <Wallet aria-hidden="true" />
                    <strong>Your wallet</strong>
                    <span>Review & approve</span>
                  </div>
                  <span className="map-connector" aria-hidden="true">
                    ↓
                  </span>
                  <div className="architecture-pair">
                    <div>
                      <Braces aria-hidden="true" />
                      <strong>dreamDEX SDK</strong>
                      <span>Markets & account reads</span>
                    </div>
                    <div>
                      <ShieldCheck aria-hidden="true" />
                      <strong>Risk Guardian</strong>
                      <span>Local monitoring</span>
                    </div>
                  </div>
                  <span className="map-connector" aria-hidden="true">
                    ↓
                  </span>
                  <div>
                    <Activity aria-hidden="true" />
                    <strong>dreamDEX on Tokyo</strong>
                    <span>MarginBank · PerpPools · receipts</span>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-section wrap" id="different" aria-labelledby="different-title">
          <Reveal>
            <p className="section-kicker">WHY LUCIDKEEPER</p>
            <h2 id="different-title">
              A trading screen.
              <br />
              <span>With the context to use it.</span>
            </h2>
            <p className="section-intro">
              A feature-scope comparison with a basic order-entry screen, not a claim about another
              exchange.
            </p>
            <div
              className="comparison-scroll"
              role="region"
              aria-label="Feature comparison"
              tabIndex={0}
            >
              <table className="comparison">
                <thead>
                  <tr>
                    <th scope="col">What you need</th>
                    <th scope="col">Order-entry only</th>
                    <th scope="col">LucidKeeper</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Place an order', 'Side, price and size', 'Market IOC with review'],
                    ['Understand exposure', 'Selected order', 'Cross-margin health + positions'],
                    [
                      'Keep an exit plan visible',
                      'Manual monitoring',
                      'Browser-local SL / TP triggers',
                    ],
                    ['Inspect execution', 'Submission feedback', 'Receipt links + indexed fills'],
                    [
                      'Recognize missing data',
                      'Implementation-dependent',
                      'Loading, stale and unavailable states',
                    ],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <th scope="row">{row[0]}</th>
                      <td>{row[1]}</td>
                      <td>
                        <Check size={15} aria-hidden="true" />
                        {row[2]}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <aside className="portfolio-invite" aria-label="Read-only trader portfolio">
              <div>
                <p className="section-kicker">THE RECORD AFTER THE TRADE</p>
                <h3>Your activity. With the source attached.</h3>
                <p>Inspect pinned account reads, filter indexed history and export the evidence. Missing return inputs stay visible as missing.</p>
              </div>
              <a className="button" href="/app/profile">
                View read-only portfolio <ArrowUpRight size={17} aria-hidden="true" />
              </a>
            </aside>
          </Reveal>
        </section>

        <section
          className="landing-section somnia-section"
          id="somnia"
          aria-labelledby="somnia-title"
        >
          <div className="wrap">
            <Reveal>
              <div className="section-heading">
                <div>
                  <p className="section-kicker">WHY SOMNIA</p>
                  <h2 id="somnia-title">
                    Risk does not wait
                    <br />
                    <span>for the next block.</span>
                  </h2>
                </div>
                <p>
                  According to Somnia, its EVM-compatible L1 is designed for real-time applications
                  with sub-second finality. That is a relevant foundation for an execution-and-risk
                  workspace.{' '}
                  <a href={SOMNIA_SOURCES.overview} target="_blank" rel="noreferrer">
                    Read the source ↗
                  </a>
                </p>
              </div>
              <div className="somnia-bento">
                <article className="consensus-card">
                  <div className="card-top">
                    <h3>Parallel data. Shared consensus.</h3>
                    <img
                      src="/assets/somnia-logomark.svg"
                      width="48"
                      height="36"
                      alt="Somnia"
                      loading="lazy"
                    />
                  </div>
                  <div
                    className="stream-visual"
                    aria-label="Conceptual MultiStream diagram: independent validator data chains feed a consensus chain"
                  >
                    <div className="data-streams">
                      {['Validator A', 'Validator B', 'Validator C'].map((label) => (
                        <div key={label}>
                          <span>{label}</span>
                          <i />
                          <i />
                          <i />
                          <b aria-hidden="true">→</b>
                        </div>
                      ))}
                    </div>
                    <div className="consensus-node">
                      Consensus
                      <br />
                      <span>One ordered stream</span>
                    </div>
                  </div>
                  <p>
                    According to Somnia’s MultiStream documentation, validators publish independent
                    data chains. A separate consensus chain agrees their heads and produces a
                    globally ordered stream.
                  </p>
                  <a
                    className="source-link"
                    href={SOMNIA_SOURCES.consensus}
                    target="_blank"
                    rel="noreferrer"
                  >
                    MultiStream consensus ↗
                  </a>
                  <small>Conceptual diagram, not network telemetry.</small>
                </article>
                <article>
                  <span className="technical-label">EXECUTION</span>
                  <h3>
                    EVM bytecode.
                    <br />
                    Native machine code.
                  </h3>
                  <p>
                    According to Somnia, frequently called contracts can use EVM-to-x86 compilation;
                    other contracts fall back to interpretation. Parallel data chains do not mean
                    parallel EVM execution.
                  </p>
                  <a
                    className="source-link"
                    href={SOMNIA_SOURCES.execution}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Execution architecture ↗
                  </a>
                </article>
                <article>
                  <span className="technical-label">PRODUCT FIT</span>
                  <h3>
                    Less waiting.
                    <br />
                    More timely decisions.
                  </h3>
                  <p>
                    Quick confirmations shorten uncertainty after an exit request. Cost-efficient
                    execution makes small, reviewed adjustments more practical. Monitoring itself
                    uses read calls—it does not spend gas on every check.
                  </p>
                  <a
                    className="source-link"
                    href={SOMNIA_SOURCES.fees}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Somnia’s fee model ↗
                  </a>
                </article>
              </div>
              <div className="needs-grid">
                <div>
                  <h3>A guardian needs</h3>
                  <p>Fresh reads, timely confirmation and affordable position adjustments.</p>
                </div>
                <ArrowRight aria-hidden="true" />
                <div>
                  <h3>When a chain is slow or costly</h3>
                  <p>
                    Pending exits stay uncertain longer; frequent small adjustments become harder to
                    justify.
                  </p>
                </div>
              </div>
              <p className="source-note">
                Network characteristics above are attributed to Somnia, not measured LucidKeeper
                latency or guaranteed Tokyo execution times. Fees vary by transaction; no
                dollar-denominated fee claim is made.
              </p>
            </Reveal>
          </div>
        </section>

        <section className="landing-section wrap" id="proof" aria-labelledby="proof-title">
          <Reveal>
            <div className="section-heading">
              <div>
                <p className="section-kicker">WHY TOKYO TESTNET</p>
                <h2 id="proof-title">
                  A sandbox.
                  <br />
                  <span>With real receipts.</span>
                </h2>
              </div>
              <p>
                Test collateral, real contract execution. Tokyo lets us exercise dreamDEX perps,
                inspect the SDK’s units and trace what actually happened without mainnet funds.
              </p>
            </div>
            <div className="proof-grid">
              {PROOF.map((proof) => (
                <article className="proof-card" key={proof.hash}>
                  <p className="technical-label">{proof.label}</p>
                  <h3><ReceiptValue value={proof.value} /></h3>
                  <p>{proof.detail}</p>
                  <a
                    className="receipt-link numeric"
                    href={`${PROJECT.explorer}/tx/${proof.hash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {proof.hash.slice(0, 10)}…{proof.hash.slice(-6)}{' '}
                    <ArrowUpRight size={16} aria-hidden="true" />
                  </a>
                </article>
              ))}
            </div>
            <p className="source-note">
              Historical evidence for the bounty EOA. The deposit and DOGE execution were
              owner-relayed and subsequently audited; they are not proof of execution through this
              UI. No verified DOGE close is recorded here.{' '}
              <a href={`${PROJECT.github}/blob/main/STATUS.md`} target="_blank" rel="noreferrer">
                Audit context ↗
              </a>
            </p>
            <div className="learning-grid">
              <div>
                <h3>What building here taught us</h3>
                <ul>
                  <li>
                    Tick size, lot size and token decimals belong to each market. There is no
                    universal order grid.
                  </li>
                  <li>
                    Sparse execution candles are gaps in trading history, not permission to draw
                    invented fills.
                  </li>
                  <li>
                    An indexer can lag. A transaction hash, fill event and current position answer
                    different questions.
                  </li>
                </ul>
                <a
                  className="text-link"
                  href={`${PROJECT.github}/tree/main/feedback`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Read the SDK & app feedback <ArrowUpRight size={16} aria-hidden="true" />
                </a>
              </div>
              <aside>
                <Wallet aria-hidden="true" />
                <h3>Two testnet resources.</h3>
                <p>
                  <strong>STT</strong> pays Tokyo gas.
                  <br />
                  <strong>USDso</strong> funds dreamDEX margin.
                </p>
                <p>
                  Request bounty funding through official support. Generic Somnia faucets may target
                  a different testnet; verify Tokyo 50383. This app does not use USDC or Arena
                  credit as a substitute.
                </p>
                <a href="/app/docs#funding" className="text-link">
                  Funding guide <ArrowRight size={16} aria-hidden="true" />
                </a>
              </aside>
            </div>
          </Reveal>
        </section>

        <section className="landing-section trust-section">
          <div className="wrap">
            <Reveal>
              <p className="section-kicker">SECURITY & TRANSPARENCY</p>
              <h2>
                Your keys stay in your wallet.
                <br />
                <span>Your decisions stay yours.</span>
              </h2>
              <div className="trust-grid">
                <article>
                  <ShieldCheck aria-hidden="true" />
                  <h3>No app-held keys</h3>
                  <p>
                    LucidKeeper does not ask for your seed or private key. Deposited collateral sits
                    in dreamDEX’s MarginBank contract, not a LucidKeeper vault.
                  </p>
                </article>
                <article>
                  <Braces aria-hidden="true" />
                  <h3>Review before approval</h3>
                  <p>
                    Executable actions show an unsigned transaction review. The bounty build
                    restricts the wallet, network and permitted actions.
                  </p>
                </article>
                <article>
                  <Eye aria-hidden="true" />
                  <h3>Public, inspectable evidence</h3>
                  <p>
                    Source code and receipt links are public. Local aliases and hidden UI values do
                    not make on-chain activity private.
                  </p>
                </article>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-section wrap roadmap">
          <Reveal>
            <p className="section-kicker">A REALISTIC ROADMAP</p>
            <h2>
              Prove the loop.
              <br />
              <span>Then widen the scope.</span>
            </h2>
            <div className="roadmap-grid">
              <article>
                <span className="roadmap-state">NOW · TESTNET MVP</span>
                <h3>Inspect. Trade. Monitor.</h3>
                <p>
                  Real reads, reviewed IOC execution, browser-local risk controls and public
                  execution evidence.
                </p>
              </article>
              <article>
                <span className="roadmap-state">NEXT · VALIDATION</span>
                <h3>Close the evidence gaps.</h3>
                <p>
                  Verify remaining close/fill paths, improve history coverage and complete
                  connected-wallet testing.
                </p>
              </article>
              <article>
                <span className="roadmap-state">LATER · CONDITIONAL</span>
                <h3>Evaluate mainnet readiness.</h3>
                <p>
                  Independent security review, reliable monitoring and protocol readiness before any
                  mainnet decision. No launch date promised.
                </p>
              </article>
            </div>
          </Reveal>
        </section>

        <section className="landing-section wrap faq-section" id="faq" aria-labelledby="faq-title">
          <div>
            <p className="section-kicker">BEFORE YOU LAUNCH</p>
            <h2 id="faq-title">
              Clear answers.
              <br />
              <span>Clear limits.</span>
            </h2>
            <a href="/app/docs" className="text-link">
              Open the field guide <ArrowUpRight size={16} aria-hidden="true" />
            </a>
          </div>
          <div className="faq-list">
            {faq.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={18} aria-hidden="true" />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="final-cta wrap">
          <p className="section-kicker">YOUR NEXT TRADE STARTS WITH CONTEXT</p>
          <h2>
            Keep your head.
            <br />
            <span>Keep your margin in view.</span>
          </h2>
          <Launch large />
          <p>Explore the working testnet terminal. No wallet needed to look.</p>
        </section>
      </main>
      <footer className="landing-footer wrap">
        <div>
          <Brand />
          <p>Perps execution. Risk in sight.</p>
        </div>
        <nav aria-label="Footer resources">
          <a href={PROJECT.github} target="_blank" rel="noreferrer">
            GitHub ↗
          </a>
          <a href="/app/docs">Docs</a>
          <a href="/app/profile">Portfolio</a>
          <a href={PROJECT.dreamdex} target="_blank" rel="noreferrer">
            dreamDEX ↗
          </a>
          <a href={PROJECT.somnia} target="_blank" rel="noreferrer">
            Somnia ↗
          </a>
        </nav>
        <p className="footer-disclaimer">
          Testnet only. No real funds. Experimental software; risk estimates and browser-local
          triggers do not guarantee execution or prevent losses.
        </p>
      </footer>
    </div>
  );
}
