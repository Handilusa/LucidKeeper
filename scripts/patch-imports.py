import sys

path = 'src/features/landing/Landing.tsx'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

old = "import { WorkflowGraphic, type FlowNodeId } from './WorkflowGraphic';\nimport { HeroCockpit } from './HeroCockpit';\nimport './landing.css';"
new = "import { WorkflowGraphic, type FlowNodeId } from './WorkflowGraphic';\nimport { HeroCockpit } from './HeroCockpit';\nimport { AtmosphereCanvas } from './AtmosphereCanvas';\nimport './landing.css';"

if old in content:
    content = content.replace(old, new)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print('REPLACED OK')
else:
    print('NOT FOUND')
    # show area around HeroCockpit import
    idx = content.find('HeroCockpit')
    print(repr(content[idx-20:idx+120]))
