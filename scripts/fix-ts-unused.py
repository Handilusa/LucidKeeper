path = 'src/features/landing/MultiStreamDiagram.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()
c = c.replace(
    "    const chains   = root.querySelectorAll<HTMLElement>('.ms-chain');\n",
    ""
)
with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('OK')
