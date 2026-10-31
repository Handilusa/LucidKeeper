import sys

path = 'src/features/landing/landing.css'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

idx = content.find('.landing-atmosphere')
print(repr(content[idx:idx+500]))
