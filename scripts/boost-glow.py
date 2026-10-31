path = 'src/features/landing/AtmosphereCanvas.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Boost plasma blob opacity (center and mid stops)
c = c.replace(
    'g.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},0.13)`);',
    'g.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},0.30)`);'
)
c = c.replace(
    'g.addColorStop(0.45, `rgba(${b.r},${b.g},${b.b},0.06)`);',
    'g.addColorStop(0.45, `rgba(${b.r},${b.g},${b.b},0.14)`);'
)

# Boost node halo opacity (was 0.35 multiplier)
c = c.replace(
    'halo.addColorStop(0, `rgba(${r},${g},${b},${node.alpha * 0.35})`);',
    'halo.addColorStop(0, `rgba(${r},${g},${b},${node.alpha * 0.55})`);'
)

# Make the node halo radius a bit bigger for more spread
c = c.replace(
    'ctx.arc(node.x, node.y, node.r * 4, 0, Math.PI * 2);',
    'ctx.arc(node.x, node.y, node.r * 5.5, 0, Math.PI * 2);'
)
c = c.replace(
    'const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 4);',
    'const halo = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.r * 5.5);'
)

# Slightly larger blob radii for more atmospheric coverage
old_blobs = '''      { ox: 0.72, oy: 0.07, cx: 0, cy: 0, ax: 0.08, ay: 0.065, fx: 1.0,   fy: 1.618, px: 0,            py: Math.PI/2.3, rw: 420, rh: 340, r: 119, g:  27, b: 232, blur: 70 },
      { ox: 0.84, oy: 0.30, cx: 0, cy: 0, ax: 0.06, ay: 0.09,  fx: 2.414, fy: 1.0,   px: Math.PI/1.7,  py: 0,           rw: 380, rh: 280, r: 188, g: 147, b: 243, blur: 90 },
      { ox: 0.57, oy: 0.55, cx: 0, cy: 0, ax: 0.10, ay: 0.07,  fx: 1.0,   fy: 2.732, px: Math.PI,      py: Math.PI/3,   rw: 520, rh: 380, r:  85, g:  15, b: 165, blur: 110 },
      { ox: 0.67, oy: 0.78, cx: 0, cy: 0, ax: 0.07, ay: 0.055, fx: 3.141, fy: 1.732, px: 0,            py: Math.PI*0.7, rw: 300, rh: 240, r: 157, g:  92, b: 247, blur: 75 },'''
new_blobs = '''      { ox: 0.72, oy: 0.07, cx: 0, cy: 0, ax: 0.08, ay: 0.065, fx: 1.0,   fy: 1.618, px: 0,            py: Math.PI/2.3, rw: 560, rh: 440, r: 119, g:  27, b: 232, blur: 65 },
      { ox: 0.84, oy: 0.30, cx: 0, cy: 0, ax: 0.06, ay: 0.09,  fx: 2.414, fy: 1.0,   px: Math.PI/1.7,  py: 0,           rw: 500, rh: 360, r: 188, g: 147, b: 243, blur: 80 },
      { ox: 0.57, oy: 0.55, cx: 0, cy: 0, ax: 0.10, ay: 0.07,  fx: 1.0,   fy: 2.732, px: Math.PI,      py: Math.PI/3,   rw: 640, rh: 480, r:  85, g:  15, b: 165, blur: 100 },
      { ox: 0.67, oy: 0.78, cx: 0, cy: 0, ax: 0.07, ay: 0.055, fx: 3.141, fy: 1.732, px: 0,            py: Math.PI*0.7, rw: 400, rh: 320, r: 157, g:  92, b: 247, blur: 70 },'''

if old_blobs in c:
    c = c.replace(old_blobs, new_blobs)
    print('Blobs resized OK')
else:
    print('Blobs not found')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
