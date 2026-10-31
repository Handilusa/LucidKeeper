import sys

path = 'src/features/landing/Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = '      <div className="landing-atmosphere" aria-hidden="true">\n        <span className="aurora aurora-violet" />\n        <span className="aurora aurora-cyan" />\n        <span className="aurora aurora-magenta" />\n      </div>'
new = '      <div className="landing-atmosphere" aria-hidden="true">\n        <AtmosphereCanvas />\n      </div>'

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('JSX REPLACED OK')
else:
    print('NOT FOUND')
    idx = content.find('landing-atmosphere')
    print(repr(content[idx:idx+300]))
