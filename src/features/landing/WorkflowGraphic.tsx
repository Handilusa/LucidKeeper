import { Activity, Braces, Pause, Play, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';
import './workflow.css';

function FlowNode({ icon: Icon, title, detail, kind }: {
  icon: LucideIcon;
  title: string;
  detail: string;
  kind: 'wallet' | 'sdk' | 'guardian' | 'chain';
}) {
  return <div className={`flow-node flow-${kind}`}>
    <span className="flow-node-glow flow-animated" aria-hidden="true" />
    <span className="flow-icon" aria-hidden="true">
      <span className="flow-ripple flow-animated" />
      <svg className="flow-orbit flow-animated" viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="29" strokeDasharray="24 13 3 13" />
        <circle cx="32" cy="3" r="2.5" className="orbit-point" />
      </svg>
      <Icon className="flow-symbol flow-animated" size={25} />
    </span>
    <strong>{title}</strong>
    <span className="flow-detail">{detail}</span>
    <span className="flow-ticks" aria-hidden="true">
      <i className="flow-animated" /><i className="flow-animated" /><i className="flow-animated" />
    </span>
  </div>;
}

// Decorative packets illustrate the workflow; they are never driven by account activity.
function FlowJunction({ merge = false }: { merge?: boolean }) {
  return <svg className={`flow-junction ${merge ? 'flow-merge' : 'flow-fork'}`}
    viewBox="0 0 600 72" preserveAspectRatio="none" fill="none" aria-hidden="true">
    <path className="flow-wire" d={merge ? 'M150 0V36H300V72M450 0V36H300' : 'M300 0V36H150V72M300 36H450V72'} />
    <path className="flow-arrow" d={merge ? 'm295 64 5 6 5-6' : 'm145 64 5 6 5-6m290 0 5 6 5-6'} />
    {['left', 'right'].map((side) => <g key={side} className={`flow-packet flow-animated packet-${side}`}>
      <circle r="12" opacity=".12" /><circle r="5" />
    </g>)}
    {merge && <g className="flow-packet flow-animated packet-return">
      <circle r="12" opacity=".16" /><circle r="4" />
    </g>}
  </svg>;
}

export function WorkflowGraphic({ paused, reducedMotion, onToggle }: {
  paused: boolean;
  reducedMotion: boolean;
  onToggle: () => void;
}) {
  return <figure className="architecture-map" data-flow
    aria-label="Wallet review connects the terminal and browser Guardian to dreamDEX contracts; receipts return on-chain results">
    <figcaption className="flow-caption">
      <span>illustrative workflow</span>
      <button className="flow-toggle" onClick={onToggle} disabled={reducedMotion}
        aria-label={reducedMotion ? 'Workflow motion off (system)' : paused ? 'Resume workflow animation' : 'Pause workflow animation'}>
        {paused || reducedMotion ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
        {reducedMotion ? 'Motion off' : paused ? 'Resume' : 'Pause'}
      </button>
    </figcaption>
    <div className="flow-scene">
      <FlowNode icon={Wallet} title="Your wallet" detail="Review & approve" kind="wallet" />
      <FlowJunction />
      <div className="architecture-pair">
        <FlowNode icon={Braces} title="dreamDEX SDK" detail="Markets & account reads" kind="sdk" />
        <FlowNode icon={ShieldCheck} title="Risk Guardian" detail="Local monitoring" kind="guardian" />
      </div>
      <FlowJunction merge />
      <FlowNode icon={Activity} title="dreamDEX on Tokyo" detail="MarginBank · PerpPools · receipts" kind="chain" />
    </div>
    <p className="flow-legend"><span>Review flow</span><span>Reads & receipts</span></p>
  </figure>;
}
