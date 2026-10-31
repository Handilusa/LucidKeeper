import sys

path = 'src/features/landing/Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Add import
old_imp = "import { SigilGSAP } from './SigilGSAP';"
new_imp = "import { SigilGSAP } from './SigilGSAP';\nimport { MultiStreamDiagram } from './MultiStreamDiagram';"
if old_imp in c:
    c = c.replace(old_imp, new_imp)
    print('Import OK')
else:
    print('Import not found')

# Replace the stream-visual block
old_jsx = '''                  <div
                    className="stream-visual"
                    aria-label="Conceptual MultiStream diagram: independent validator data chains feed a consensus chain"
                  >
                    <div className="data-streams">
                      {['Validator A', 'Validator B', 'Validator C'].map((label) => (
                        <div key={label}>
                          <span>{label}</span>
                          <i />
                          <i />
                          <i />
                          <b aria-hidden="true">\u2192</b>
                        </div>
                      ))}
                    </div>
                    <div className="consensus-node">
                      Consensus
                      <br />
                      <span>One ordered stream</span>
                    </div>
                  </div>'''

new_jsx = '                  <MultiStreamDiagram />'

if old_jsx in c:
    c = c.replace(old_jsx, new_jsx)
    print('JSX replaced OK')
else:
    # try without escaped arrow
    old_jsx2 = old_jsx.replace('\u2192', '\\u2192')
    if old_jsx2 in c:
        c = c.replace(old_jsx2, new_jsx)
        print('JSX replaced (escaped) OK')
    else:
        # search for the stream-visual block
        idx = c.find('stream-visual')
        print('NOT FOUND, snippet:')
        print(repr(c[idx:idx+600]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('File written')
