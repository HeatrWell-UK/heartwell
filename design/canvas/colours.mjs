import fs from 'node:fs'
const f = 'StyleGuide.dc.html'
let s = fs.readFileSync(f, 'utf8')
const start = s.indexOf('colours: [')
const end = s.indexOf('scale: [')
const block = `colours: [
        { name: 'Velvet red', fill: '#8E1B2E', hex: '#8E1B2E', role: 'Links, selected rings, the sofa and wordmark in the logo' },
        { name: 'Velvet sheen', fill: 'linear-gradient(180deg,#A3243A 0%,#7E1627 100%)', hex: '#A3243A to #7E1627', role: 'Primary buttons, so they read like real velvet' },
        { name: 'Wine', fill: '#4A0D17', hex: '#4A0D17', role: 'Announcement bar, dark sections, footer' },
        { name: 'Gold gradient', fill: 'linear-gradient(135deg,#94701F 0%,#E9CC7B 35%,#B58A2F 60%,#F2DC9C 85%,#9E7626 100%)', hex: '#94701F to #F2DC9C', role: 'Finishing touches: step numbers, logo on wine, headings on wine, rules. Never behind small text' },
        { name: 'Gold', fill: '#B58A2F', hex: '#B58A2F', role: 'Gold lines and icons on white (graphics only)' },
        { name: 'Pale gold', fill: '#E9CC7B', hex: '#E9CC7B', role: 'Gold text on wine; offer badges with wine text' },
        { name: 'Gold tint', fill: '#F4E7C6', hex: '#F4E7C6', role: 'Selected options and product badges' },
        { name: 'White', fill: '#FFFFFF', hex: '#FFFFFF', role: 'Page background' },
        { name: 'Stone', fill: '#F5F1EF', hex: '#F5F1EF', role: 'Section grounds and image placeholders' },
        { name: 'Ink', fill: '#22171A', hex: '#22171A', role: 'Main text' },
        { name: 'Slate', fill: '#5E4F52', hex: '#5E4F52', role: 'Secondary and help text' },
        { name: 'Error', fill: '#B42318', hex: '#B42318', role: 'Form errors, always with words' }
      ],
      `
s = s.slice(0, start) + block + s.slice(end)
fs.writeFileSync(f, s)
console.log(s.includes("name: 'Rose'") ? 'rose still present' : 'colours replaced')
