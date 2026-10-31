path = 'src/features/landing/SigilGSAP.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

c = c.replace('outerAngle += 0.38 + Math.cos(t * 0.31) * 0.18;', 'outerAngle += 0.18 + Math.cos(t * 0.31) * 0.06;')
c = c.replace('innerAngle -= 0.58 + Math.cos(t * 0.19) * 0.24;', 'innerAngle -= 0.28 + Math.cos(t * 0.19) * 0.08;')

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK')
