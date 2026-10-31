path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove CSS-animation-based motion rules for sigil
# (these are now driven by GSAP in SigilGSAP.tsx)
blocks_to_remove = [
    # hover CSS overrides for animation-duration (now GSAP handles it)
    '''.hero-brand-sigil:hover .sigil-orbit-outer {
  animation-duration: 16s;
}
.hero-brand-sigil:hover .sigil-orbit-inner {
  animation-duration: 10s;
}''',
    # data-motion CSS animations
    '''.landing[data-motion='on'] .sigil-emblem-wrap {
  animation: sigil-levitate 6.5s ease-in-out infinite alternate;
}
.landing[data-motion='on'] .sigil-glow-pulse {
  animation: sigil-pulse-expand 4.2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite;
}
.landing[data-motion='on'] .sigil-orbit-outer {
  animation: sigil-spin-clockwise 32s linear infinite;
}
.landing[data-motion='on'] .sigil-orbit-inner {
  animation: sigil-spin-counter 20s linear infinite;
}''',
    # keyframes
    '''@keyframes sigil-levitate {
  0% { transform: translateY(0) rotateX(0deg) rotateY(0deg); }
  50% { transform: translateY(-10px) rotateX(4deg) rotateY(-5deg); }
  100% { transform: translateY(4px) rotateX(-2deg) rotateY(4deg); }
}
@keyframes sigil-pulse-expand {
  0% { transform: scale(0.85); opacity: 0.15; }
  50% { opacity: 0.65; }
  100% { transform: scale(1.3); opacity: 0; }
}
@keyframes sigil-spin-clockwise {
  to { transform: rotate(360deg); }
}
@keyframes sigil-spin-counter {
  to { transform: rotate(-360deg); }
}''',
]

removed = 0
for block in blocks_to_remove:
    if block in content:
        content = content.replace(block, '')
        removed += 1
        print(f'Removed block {removed}')
    else:
        print(f'Block {removed+1} NOT found - trying stripped version')

# Update sigil-emblem-wrap: remove CSS transition (GSAP handles it)
old_emblem = '''.sigil-emblem-wrap {
  position: relative;
  z-index: 2;
  cursor: pointer;
  transform-style: preserve-3d;
  transition: transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.45s var(--ease-out);
}'''
new_emblem = '''.sigil-emblem-wrap {
  position: relative;
  z-index: 2;
  cursor: pointer;
  transform-style: preserve-3d;
  /* transform driven by GSAP — no CSS transition to avoid conflict */
  will-change: transform;
}'''
if old_emblem in content:
    content = content.replace(old_emblem, new_emblem)
    print('emblem-wrap updated')

# Remove hover CSS overrides for emblem (GSAP quickTo handles them)
old_hover_emblem = '''.hero-brand-sigil:hover .sigil-emblem-wrap {
  transform: translateY(-12px) scale(1.07) rotateX(6deg) rotateY(-8deg);
}
.hero-brand-sigil:hover .sigil-emblem-img {
  filter: drop-shadow(0 0 35px #771be8ee) drop-shadow(0 0 75px #bc93f380) drop-shadow(0 25px 45px #000000ee);
}'''
if old_hover_emblem in content:
    content = content.replace(old_hover_emblem, '/* hover tilt handled by GSAP quickTo in SigilGSAP.tsx */')
    print('hover overrides removed')

# Add second pulse ring style
if '.sigil-glow-pulse-2' not in content:
    content = content.replace(
        '.sigil-glow-pulse {',
        '.sigil-glow-pulse {'
    )
    # Add after the closing of sigil-glow-pulse block
    old_pulse_end = '''  background: radial-gradient(circle, #771be814 0%, transparent 75%);
  pointer-events: none;
}'''
    new_pulse_end = '''  background: radial-gradient(circle, #771be814 0%, transparent 75%);
  pointer-events: none;
}
.sigil-glow-pulse-2 {
  width: 220px;
  height: 220px;
  background: radial-gradient(circle, #9d5cf710 0%, transparent 70%);
  border-color: #9d5cf720;
}'''
    if old_pulse_end in content:
        content = content.replace(old_pulse_end, new_pulse_end)
        print('Added sigil-glow-pulse-2 style')

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('CSS written OK')
