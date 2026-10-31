path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Find the .landing-atmosphere block and the .aurora blocks and replace them
old_block = '''.landing-atmosphere {
  position: absolute;
  inset: 0 0 auto;
  height: 1500px;
  overflow: hidden;
  pointer-events: none;
  z-index: -1;
  mask-image: linear-gradient(#000 70%, transparent);
}
/* math notebook grid removed */
.aurora {
  position: absolute;
  width: 850px;
  height: 850px;
  border-radius: 50%;
}
.aurora-violet {
  background: radial-gradient(ellipse, #771be844, transparent 67%);
  right: -120px;
  top: -150px;
}
.aurora-cyan {
  background: radial-gradient(ellipse, #9d5cf72c, transparent 65%);
  right: 10%;
  top: 340px;
}
.aurora-magenta {
  background: radial-gradient(ellipse, #5b10b828, transparent 67%);
  left: -300px;
  top: 520px;
}'''

new_block = '''.landing-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  /* canvas handles compositing; soft fade at page bottom */
  mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
}
/* aurora divs removed — AtmosphereCanvas handles background rendering */'''

if old_block in content:
    content = content.replace(old_block, new_block)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('CSS REPLACED OK')
else:
    print('NOT FOUND - searching manually')
    idx = content.find('.aurora-magenta')
    print(repr(content[idx:idx+200]))
