path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

old = '''/* Consensus line overlay — horizontal bar at head-block level */
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
}'''

new = '''/* Consensus line — sits BELOW the chains-row as its own row element */
.ms-consensus-line {
  display: block;
  width: 100%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #4d6fff 8%, #6d88ff 50%, #4d6fff 92%, transparent 100%);
  box-shadow: 0 0 14px #4d6fff90;
  border-radius: 2px;
  margin-top: 8px;
}'''

if old in c:
    c = c.replace(old, new)
    print('CSS fixed OK')
else:
    print('NOT FOUND')
    idx = c.find('ms-consensus-line')
    print(repr(c[idx:idx+300]))

# Also remove position: relative from ms-chains-row since line is no longer absolute
c = c.replace(
    '.ms-chains-row {\n  position: relative;\n  display: grid;',
    '.ms-chains-row {\n  display: grid;'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
