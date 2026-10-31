path = 'src/features/landing/AtmosphereCanvas.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# 1. Spread blobs across full canvas - add left-side blobs, cover whole page
old_blobs = '''      { ox: 0.72, oy: 0.07, cx: 0, cy: 0, ax: 0.08, ay: 0.065, fx: 1.0,   fy: 1.618, px: 0,            py: Math.PI/2.3, rw: 560, rh: 440, r: 119, g:  27, b: 232, blur: 65 },
      { ox: 0.84, oy: 0.30, cx: 0, cy: 0, ax: 0.06, ay: 0.09,  fx: 2.414, fy: 1.0,   px: Math.PI/1.7,  py: 0,           rw: 500, rh: 360, r: 188, g: 147, b: 243, blur: 80 },
      { ox: 0.57, oy: 0.55, cx: 0, cy: 0, ax: 0.10, ay: 0.07,  fx: 1.0,   fy: 2.732, px: Math.PI,      py: Math.PI/3,   rw: 640, rh: 480, r:  85, g:  15, b: 165, blur: 100 },
      { ox: 0.67, oy: 0.78, cx: 0, cy: 0, ax: 0.07, ay: 0.055, fx: 3.141, fy: 1.732, px: 0,            py: Math.PI*0.7, rw: 400, rh: 320, r: 157, g:  92, b: 247, blur: 70 },'''

new_blobs = '''      // Right side — near sigil
      { ox: 0.72, oy: 0.08, cx: 0, cy: 0, ax: 0.07, ay: 0.06,  fx: 1.0,   fy: 1.618, px: 0,            py: Math.PI/2.3, rw: 620, rh: 500, r: 119, g:  27, b: 232, blur: 60 },
      { ox: 0.88, oy: 0.35, cx: 0, cy: 0, ax: 0.05, ay: 0.08,  fx: 2.414, fy: 1.0,   px: Math.PI/1.7,  py: 0,           rw: 500, rh: 380, r: 188, g: 147, b: 243, blur: 75 },
      // Centre
      { ox: 0.50, oy: 0.42, cx: 0, cy: 0, ax: 0.09, ay: 0.07,  fx: 1.0,   fy: 2.732, px: Math.PI,      py: Math.PI/3,   rw: 700, rh: 520, r:  85, g:  15, b: 165, blur: 90 },
      // Left side
      { ox: 0.15, oy: 0.20, cx: 0, cy: 0, ax: 0.08, ay: 0.07,  fx: 1.618, fy: 1.0,   px: Math.PI/3,    py: Math.PI/1.5, rw: 580, rh: 440, r: 119, g:  27, b: 232, blur: 80 },
      { ox: 0.05, oy: 0.60, cx: 0, cy: 0, ax: 0.06, ay: 0.09,  fx: 2.732, fy: 1.414, px: Math.PI*0.8,  py: Math.PI/4,   rw: 500, rh: 360, r: 157, g:  92, b: 247, blur: 85 },
      // Bottom sweep
      { ox: 0.40, oy: 0.85, cx: 0, cy: 0, ax: 0.10, ay: 0.05,  fx: 3.141, fy: 1.732, px: 0,            py: Math.PI*0.7, rw: 600, rh: 380, r: 188, g: 147, b: 243, blur: 70 },'''

if old_blobs in c:
    c = c.replace(old_blobs, new_blobs)
    print('Blobs replaced OK')
else:
    print('NOT FOUND')

# 2. Boost opacity more aggressively — center stop and mid stop
c = c.replace(
    'g.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},0.30)`);',
    'g.addColorStop(0,    `rgba(${b.r},${b.g},${b.b},0.38)`);'
)
c = c.replace(
    'g.addColorStop(0.45, `rgba(${b.r},${b.g},${b.b},0.14)`);',
    'g.addColorStop(0.45, `rgba(${b.r},${b.g},${b.b},0.18)`);'
)

# 3. Nodes — spread them across full width, not biased right
old_node_bias = '''      // Weight towards right half where the sigil lives
      const xBias = Math.random() < 0.65 ? 0.45 + Math.random() * 0.60 : Math.random() * 0.50;
      nodes.push({
        x: W * xBias,'''
new_node_bias = '''      // Spread across full width with slight right bias for sigil area
      const xBias = Math.random() < 0.45 ? 0.42 + Math.random() * 0.60 : Math.random() * 0.45;
      nodes.push({
        x: W * xBias,'''

if old_node_bias in c:
    c = c.replace(old_node_bias, new_node_bias)
    print('Node bias updated')
else:
    print('Node bias NOT FOUND')

# 4. Increase node count slightly
c = c.replace('const NODE_COUNT = 52;', 'const NODE_COUNT = 68;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
