path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Replace the old stream-visual / data-streams / consensus-node CSS
# with the new ms-diagram CSS
old_stream_css = '''.stream-visual {
  display: flex;
  align-items: center;
  margin: 48px 0;
  gap: 20px;
  font: 11px var(--font-mono);
}
.data-streams {
  display: grid;
  gap: 24px;
  flex: 1;
}
.data-streams > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
.data-streams span {
  width: 84px;
  flex-shrink: 0;
  color: var(--muted);
}
.data-streams i {
  display: block;
  width: 24px;
  height: 24px;
  border: 1px solid #bc93f360;
  background: #771be825;
  border-radius: 4px;
}
.data-streams b {
  color: var(--color-cyan);
  margin-left: auto;
}
.consensus-node {
  padding: 26px 14px;
  border: 1px solid #bc93f380;
  border-radius: 8px;
  text-align: center;
  color: var(--color-cyan);
  background: #771be818;
  line-height: 2;
}
.consensus-node span {
  color: var(--muted);
  font-size: 9px;
}'''

new_stream_css = '''/* ── MultiStream Diagram ─────────────────────────────────────── */
.ms-diagram {
  position: relative;
  margin: 36px 0 24px;
  font: 10px/1.3 var(--font-mono);
  letter-spacing: 0.8px;
  user-select: none;
}
.ms-chains-row {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  padding-bottom: 4px;
}
.ms-chain {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.ms-chain-label {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 1px;
  white-space: nowrap;
  opacity: 0.7;
}
.ms-blocks-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: center;
  width: 100%;
}
.ms-block {
  width: 100%;
  padding: 7px 0;
  text-align: center;
  font: 700 10px var(--font-mono);
  letter-spacing: 1px;
  color: #fff;
  background: linear-gradient(135deg, #d81bce 0%, #a015e0 100%);
  border-radius: 6px;
  box-shadow: 0 2px 10px #d81bce40, 0 0 0 1px #e040fb30;
  will-change: transform, box-shadow;
}
/* head block (top = being agreed on) slightly brighter */
.ms-block-head {
  background: linear-gradient(135deg, #f020e0 0%, #bc15f5 100%);
  box-shadow: 0 0 12px #f020e060, 0 0 0 1px #f040fb50;
}
/* Consensus line overlay — horizontal bar at head-block level */
.ms-consensus-line {
  position: absolute;
  top: 30px; /* aligns with head blocks */
  left: -6px;
  right: -6px;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #4d6fff 10%, #6d88ff 50%, #4d6fff 90%, transparent 100%);
  box-shadow: 0 0 12px #4d6fff80;
  border-radius: 2px;
  pointer-events: none;
}
.ms-consensus-label {
  text-align: right;
  color: #8ba4ff;
  font-size: 9px;
  letter-spacing: 0.8px;
  margin-top: 6px;
  padding-right: 4px;
  opacity: 0.75;
}
/* Arrows up from validators */
.ms-arrows-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-top: 10px;
}
.ms-arrow {
  text-align: center;
  color: var(--muted);
  font-size: 14px;
  opacity: 0.5;
}
/* Validators */
.ms-validators-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}
.ms-validator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 7px 0;
  background: #1a3a8f;
  border: 1px solid #2a50bf;
  border-radius: 6px;
  color: #8ba4ff;
  font: 700 9px var(--font-mono);
  letter-spacing: 0.8px;
  white-space: nowrap;
}
.ms-validator-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #4d6fff;
  box-shadow: 0 0 6px #4d6fff;
  flex-shrink: 0;
}
/* Consensus output badge */
.ms-consensus-badge {
  margin-top: 16px;
  padding: 12px 18px;
  border: 1px solid #4d6fff40;
  border-left: 3px solid #4d6fff;
  border-radius: 6px;
  background: #0a1a4a;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.ms-badge-label {
  color: #8ba4ff;
  font: 700 11px var(--font-mono);
  letter-spacing: 1px;
}
.ms-badge-sub {
  color: var(--muted);
  font-size: 9px;
  letter-spacing: 0.6px;
  opacity: 0.7;
}'''

if old_stream_css in c:
    c = c.replace(old_stream_css, new_stream_css)
    print('CSS replaced OK')
else:
    print('NOT FOUND trying line search...')
    idx = c.find('.stream-visual {')
    print(repr(c[idx:idx+100]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
