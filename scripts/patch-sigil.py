import sys

path = 'src/features/landing/Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add SigilGSAP import
old_imp = "import { AtmosphereCanvas } from './AtmosphereCanvas';"
new_imp = "import { AtmosphereCanvas } from './AtmosphereCanvas';\nimport { SigilGSAP } from './SigilGSAP';"

if old_imp in content:
    content = content.replace(old_imp, new_imp)
    print('Import OK')
else:
    print('Import not found')

# Replace the entire sigil block in the JSX
old_jsx = '''            <div className="hero-brand-sigil" aria-hidden="true">
              <div className="sigil-stage">
                <div className="sigil-glow-core" />
                <div className="sigil-glow-pulse" />

                <svg className="sigil-orbit sigil-orbit-outer" viewBox="0 0 320 320" fill="none">
                  <circle cx="160" cy="160" r="140" stroke="currentColor" strokeWidth="1" strokeDasharray="4 8" opacity="0.3" />
                  <circle cx="160" cy="160" r="115" stroke="currentColor" strokeWidth="0.75" strokeDasharray="1 5" opacity="0.4" />
                  <circle cx="300" cy="160" r="4" fill="#bc93f3" />
                  <circle cx="20" cy="160" r="2.5" fill="#771be8" />
                </svg>

                <svg className="sigil-orbit sigil-orbit-inner" viewBox="0 0 280 280" fill="none">
                  <ellipse cx="140" cy="140" rx="125" ry="58" stroke="url(#sigil-grad)" strokeWidth="1.25" strokeDasharray="12 6 2 6" transform="rotate(-25 140 140)" />
                  <circle cx="255" cy="100" r="3.5" fill="#bc93f3" />
                  <defs>
                    <linearGradient id="sigil-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#bc93f3" stopOpacity="0.8" />
                      <stop offset="50%" stopColor="#771be8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#9d5cf7" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="sigil-emblem-wrap">
                  <img
                    src="/assets/brand/lucidkeeper-neon.png"
                    alt=""
                    aria-hidden="true"
                    className="sigil-emblem-img"
                    width={230}
                    height={187}
                    fetchPriority="high"
                  />
                </div>
              </div>

              <div className="sigil-hud">
                <div className="sigil-hud-status">
                  <span className="sigil-status-dot" />
                  <span>LUCIDKEEPER PROTOCOL // CORE ACTIVE</span>
                </div>
                <div className="sigil-hud-telemetry">
                  <span>SOMNIA TOKYO · 50383</span>
                  <span className="sigil-hud-sep">/</span>
                  <span>VERIFIED ON-CHAIN</span>
                </div>
              </div>
            </div>'''

new_jsx = '            <SigilGSAP />'

if old_jsx in content:
    content = content.replace(old_jsx, new_jsx)
    print('JSX replaced OK')
else:
    print('JSX block not found - checking area:')
    idx = content.find('hero-brand-sigil')
    print(repr(content[idx:idx+400]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print('File written')
