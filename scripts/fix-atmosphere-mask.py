path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    c = f.read()

# Remove the mask-image that was cutting off the glow too early
# and make the atmosphere cover more height
old_atm = '''.landing-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  /* canvas handles compositing; soft fade at page bottom */
  mask-image: linear-gradient(to bottom, #000 60%, transparent 100%);
}'''

new_atm = '''.landing-atmosphere {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
  /* Very subtle fade only at the very bottom so glow covers the full page */
  mask-image: linear-gradient(to bottom, #000 80%, transparent 100%);
}'''

if old_atm in c:
    c = c.replace(old_atm, new_atm)
    print('Atmosphere CSS updated')
else:
    print('NOT FOUND')
    idx = c.find('landing-atmosphere')
    print(repr(c[idx:idx+300]))

with open(path, 'w', encoding='utf-8') as f:
    f.write(c)
print('Done')
