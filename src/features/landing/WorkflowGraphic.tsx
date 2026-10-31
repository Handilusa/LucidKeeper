import { useState } from 'react';
import { Activity, Braces, CheckCircle2, Pause, Play, ShieldCheck, Wallet, Zap, Sparkles } from 'lucide-react';
import './workflow.css';

export type FlowNodeId = 'wallet' | 'guardian' | 'sdk' | 'chain';

interface NodeSpec {
  id: FlowNodeId;
  title: string;
  subtitle: string;
  tag: string;
  specs: [string, string][];
  hint: string;
}

const NODE_SPECS: Record<FlowNodeId, NodeSpec> = {
  wallet: {
    id: 'wallet',
    title: 'Trader Web3 Wallet',
    subtitle: 'Non-Custodial Signer (EOA)',
    tag: 'Client Signer',
    specs: [
      ['Network', 'Somnia Tokyo (50383)'],
      ['Custody', 'Zero keys on disk or agent'],
      ['Approval', 'Human review per action'],
    ],
    hint: 'No autonomous bots or silent auto-pulls. Every parameter is signed by you.',
  },
  guardian: {
    id: 'guardian',
    title: 'LucidKeeper Risk Guardian',
    subtitle: 'Browser-Local Risk Monitor',
    tag: 'In-Memory Sentinel',
    specs: [
      ['Isolation', 'Browser-local client only'],
      ['Health Buffer', 'Live cross-margin delta'],
      ['Protection', 'SL / TP guard triggers'],
    ],
    hint: 'Evaluates position health locally in your browser tab at 60fps.',
  },
  sdk: {
    id: 'sdk',
    title: 'dreamDEX TypeScript SDK',
    subtitle: 'High-Throughput Chain Feeds',
    tag: 'Tokyo RPC Gateway',
    specs: [
      ['Transport', 'Tokyo RPC WebSocket / HTTP'],
      ['Data Source', 'CLOB book tops & oracle'],
      ['Integrity', '100% verified on-chain'],
    ],
    hint: 'Feeds live book tops and mark prices directly from Somnia Tokyo contracts.',
  },
  chain: {
    id: 'chain',
    title: 'dreamDEX Core Contracts',
    subtitle: 'Somnia Tokyo Settlement',
    tag: 'MarginBank & PerpPools',
    specs: [
      ['MarginBank', '0x4787…1394'],
      ['Execution', 'Atomic IOC order matching'],
      ['Evidence', 'Immutable receipt & block'],
    ],
    hint: 'Atomic settlement on Somnia with sub-second finality and cryptographic receipts.',
  },
};

export function WorkflowGraphic({
  paused,
  reducedMotion,
  onToggle,
  activeNode: externalActiveNode,
  onSelectNode,
}: {
  paused: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
  activeNode?: FlowNodeId | null;
  onSelectNode?: (node: FlowNodeId | null) => void;
}) {
  const [internalActiveNode, setInternalActiveNode] = useState<FlowNodeId | null>('wallet');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState<number>(-1);

  const activeNode = externalActiveNode !== undefined ? externalActiveNode : internalActiveNode;
  const selectNode = (id: FlowNodeId | null) => {
    setInternalActiveNode(id);
    onSelectNode?.(id);
  };

  const handleSimulate = () => {
    if (isSimulating) return;
    setIsSimulating(true);
    setSimStep(0);
    selectNode('wallet');

    setTimeout(() => {
      setSimStep(1);
      selectNode('guardian');
    }, 700);

    setTimeout(() => {
      setSimStep(2);
      selectNode('chain');
    }, 1500);

    setTimeout(() => {
      setSimStep(3);
      setIsSimulating(false);
    }, 2400);
  };

  const activeSpec = activeNode ? NODE_SPECS[activeNode] : null;

  return (
    <figure
      className="architecture-map topology-glass-mesh"
      data-flow
      aria-label="Interactive LucidKeeper architecture topology: Trader wallet connects through local Guardian and dreamDEX SDK to Somnia Tokyo contracts"
    >
      {/* Top HUD Console Bar */}
      <figcaption className="flow-caption topology-toolbar">
        <div className="topology-title-group">
          <span className="topology-beacon-dot" aria-hidden="true" />
          <div className="topology-title-texts">
            <span className="topology-kicker">LUCIDKEEPER MESH // SOMNIA TOKYO</span>
            <span className="topology-compliance">illustrative workflow</span>
          </div>
        </div>

        <div className="topology-actions">
          <button
            type="button"
            className={`topology-btn topology-sim-btn ${isSimulating ? 'active' : ''}`}
            onClick={handleSimulate}
            disabled={isSimulating}
            title="Simulate live order flow through the architecture"
          >
            <Zap size={12} className={isSimulating ? 'sim-pulse' : ''} aria-hidden="true" />
            <span>{isSimulating ? 'Simulating…' : 'Simulate Flow'}</span>
          </button>

          <button
            type="button"
            className="flow-toggle topology-toggle-btn"
            onClick={onToggle}
            disabled={reducedMotion}
            aria-label={
              reducedMotion
                ? 'Workflow motion off (system)'
                : paused
                  ? 'Resume workflow animation'
                  : 'Pause workflow animation'
            }
          >
            {paused || reducedMotion ? (
              <Play size={12} aria-hidden="true" />
            ) : (
              <Pause size={12} aria-hidden="true" />
            )}
            <span>{reducedMotion ? 'Off' : paused ? 'Resume' : 'Live'}</span>
          </button>
        </div>
      </figcaption>

      {/* Main Interactive Topology Stage */}
      <div className="topology-canvas">
        {/* SVG Laser / Particle Conduits */}
        <svg
          className="topology-conduits"
          viewBox="0 0 540 340"
          preserveAspectRatio="none"
          fill="none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="conduit-grad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bc93f3" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#771be8" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#bc93f3" stopOpacity="0.9" />
            </linearGradient>

            <filter id="glow-conduit" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Conduit 1: Wallet to Guardian */}
          <path
            className={`conduit-path ${isSimulating && (simStep === 0 || simStep === 1) ? 'surging' : ''}`}
            d="M 270 50 C 270 95, 145 95, 145 140"
          />

          {/* Conduit 2: Wallet to SDK */}
          <path
            className={`conduit-path ${isSimulating && (simStep === 0 || simStep === 1) ? 'surging' : ''}`}
            d="M 270 50 C 270 95, 395 95, 395 140"
          />

          {/* Conduit 3: Guardian to dreamDEX Tokyo */}
          <path
            className={`conduit-path ${isSimulating && (simStep === 1 || simStep === 2) ? 'surging' : ''}`}
            d="M 145 190 C 145 235, 270 235, 270 270"
          />

          {/* Conduit 4: SDK to dreamDEX Tokyo */}
          <path
            className={`conduit-path ${isSimulating && (simStep === 1 || simStep === 2) ? 'surging' : ''}`}
            d="M 395 190 C 395 235, 270 235, 270 270"
          />

          {/* Central Return Beam: Cryptographic Receipts returning to Wallet */}
          <line
            className="conduit-return-beam"
            x1="270"
            y1="270"
            x2="270"
            y2="50"
            strokeDasharray="4 8"
          />

          {/* Flowing animated photons along conduits */}
          {!paused && !reducedMotion && (
            <>
              <circle r="4" className="conduit-photon photon-left">
                <animateMotion
                  path="M 270 50 C 270 95, 145 95, 145 140"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="4" className="conduit-photon photon-right">
                <animateMotion
                  path="M 270 50 C 270 95, 395 95, 395 140"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="0.3s"
                />
              </circle>
              <circle r="4" className="conduit-photon photon-left-merge">
                <animateMotion
                  path="M 145 190 C 145 235, 270 235, 270 270"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="1.2s"
                />
              </circle>
              <circle r="4" className="conduit-photon photon-right-merge">
                <animateMotion
                  path="M 395 190 C 395 235, 270 235, 270 270"
                  dur="2.4s"
                  repeatCount="indefinite"
                  begin="1.4s"
                />
              </circle>
              <circle r="3.5" className="conduit-photon photon-return">
                <animateMotion
                  path="M 270 270 L 270 50"
                  dur="3.2s"
                  repeatCount="indefinite"
                  begin="1.8s"
                />
              </circle>
            </>
          )}
        </svg>

        {/* Node Pods */}
        <div className="topology-nodes">
          {/* Node 1: Wallet (Top) */}
          <div className="node-wrapper node-pos-top">
            <button
              type="button"
              className={`topology-pod pod-wallet ${activeNode === 'wallet' ? 'pod-active' : ''}`}
              onClick={() => selectNode(activeNode === 'wallet' ? null : 'wallet')}
              onMouseEnter={() => selectNode('wallet')}
            >
              <div className="pod-avatar">
                <Wallet size={18} aria-hidden="true" />
              </div>
              <div className="pod-content">
                <span className="pod-title">Your Web3 Wallet</span>
                <span className="pod-sub">Review & sign intent</span>
              </div>
              <span className="pod-pill">Client EOA</span>
            </button>
          </div>

          {/* Node 2 & 3: Middle Dual Row */}
          <div className="node-row-middle">
            {/* Node 2: Guardian (Left) */}
            <div className="node-wrapper">
              <button
                type="button"
                className={`topology-pod pod-guardian ${activeNode === 'guardian' ? 'pod-active' : ''}`}
                onClick={() => selectNode(activeNode === 'guardian' ? null : 'guardian')}
                onMouseEnter={() => selectNode('guardian')}
              >
                <div className="pod-avatar avatar-guardian">
                  <ShieldCheck size={18} aria-hidden="true" />
                </div>
                <div className="pod-content">
                  <span className="pod-title">Risk Guardian</span>
                  <span className="pod-sub">In-memory safety calc</span>
                </div>
                <span className="pod-pill">60fps Tab</span>
              </button>
            </div>

            {/* Node 3: SDK (Right) */}
            <div className="node-wrapper">
              <button
                type="button"
                className={`topology-pod pod-sdk ${activeNode === 'sdk' ? 'pod-active' : ''}`}
                onClick={() => selectNode(activeNode === 'sdk' ? null : 'sdk')}
                onMouseEnter={() => selectNode('sdk')}
              >
                <div className="pod-avatar avatar-sdk">
                  <Braces size={18} aria-hidden="true" />
                </div>
                <div className="pod-content">
                  <span className="pod-title">dreamDEX SDK</span>
                  <span className="pod-sub">Realtime market reads</span>
                </div>
                <span className="pod-pill">Tokyo RPC</span>
              </button>
            </div>
          </div>

          {/* Node 4: On-Chain Core (Bottom) */}
          <div className="node-wrapper node-pos-bottom">
            <button
              type="button"
              className={`topology-pod pod-chain ${activeNode === 'chain' ? 'pod-active' : ''}`}
              onClick={() => selectNode(activeNode === 'chain' ? null : 'chain')}
              onMouseEnter={() => selectNode('chain')}
            >
              <div className="pod-avatar avatar-chain">
                <Activity size={18} aria-hidden="true" />
              </div>
              <div className="pod-content">
                <span className="pod-title">dreamDEX on Somnia Tokyo</span>
                <span className="pod-sub">MarginBank · PerpPools · Instant Receipts</span>
              </div>
              <span className="pod-pill">Chain 50383</span>
            </button>
          </div>
        </div>
      </div>

      {/* Dynamic Spec Inspector HUD Drawer */}
      <div className="topology-inspector">
        {activeSpec ? (
          <div className="inspector-card">
            <div className="inspector-head">
              <div className="inspector-badge-row">
                <span className="inspector-tag">{activeSpec.tag}</span>
                <strong className="inspector-title">{activeSpec.title}</strong>
              </div>
              <span className="inspector-subtitle">{activeSpec.subtitle}</span>
            </div>

            <div className="inspector-specs-grid">
              {activeSpec.specs.map(([label, val]) => (
                <div key={label} className="inspector-spec-item">
                  <span className="spec-label">{label}</span>
                  <span className="spec-val" title={label === 'MarginBank' ? '0x478769E1177C0773c43A593DCCc4Ad15F15F1394' : val}>{val}</span>
                </div>
              ))}
            </div>

            <p className="inspector-hint">{activeSpec.hint}</p>
          </div>
        ) : (
          <div className="inspector-empty">
            <Sparkles size={14} className="empty-sparkle" aria-hidden="true" />
            <span>Hover or click any node to inspect execution boundaries & security guarantees</span>
          </div>
        )}
      </div>

      {/* Footer Legend */}
      <div className="topology-legend">
        <span className="legend-item legend-intent">
          <span className="legend-dot" /> Intent & Calldata Flow
        </span>
        <span className="legend-item legend-receipt">
          <span className="legend-dot dot-purple" /> Verified On-Chain Receipts
        </span>
        <span className="legend-item legend-active">
          <CheckCircle2 size={11} aria-hidden="true" /> Tokyo 50383 Active
        </span>
      </div>
    </figure>
  );
}
