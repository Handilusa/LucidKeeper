path = 'src/features/landing/MultiStreamDiagram.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Move the consensus line OUTSIDE the chains-row div
old_jsx = '''        {/* Consensus chain line — absolute, overlays top row */}
        <div className="ms-consensus-line" aria-hidden="true" />
      </div>

      {/* Consensus chain label */}
      <div className="ms-consensus-label">Cross datachain consensus chain</div>'''

new_jsx = '''      </div>

      {/* Consensus line sits between chains-row and the label */}
      <div className="ms-consensus-line" aria-hidden="true" />
      <div className="ms-consensus-label">Cross datachain consensus chain</div>'''

if old_jsx in c:
    c = c.replace(old_jsx, new_jsx)
    print('JSX fixed OK')
else:
    print('NOT FOUND')
    idx = c.find('ms-consensus-line')
    print(repr(c[idx-50:idx+200]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
