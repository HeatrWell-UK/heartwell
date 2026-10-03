import fs from 'node:fs'
const map = [
  ['#1E3A2F', '#8E1B2E'], ['#142820', '#4A0D17'], ['#DCE6DF', '#F4E7C6'], ['#C23B5E', '#8E1B2E'],
  ['#EC9AAE', '#E9CC7B'], ['#F8E6EB', '#F6ECD3'], ['#6E3242', '#6B4E12'], ['#E9EEE8', '#F5F1EF'],
  ['#FBFCFA', '#FFFFFF'], ['#17221C', '#22171A'], ['#4D5C53', '#5E4F52'], ['#D3DBD4', '#E5DADB'],
  ['#E3E9E4', '#EFE7E7'], ['#B8C6BC', '#CDBFC1'], ['#C6D1C9', '#DCCFD0'], ['#34433A', '#3E2F32'],
  ['#C9D6CD', '#EBDADD'], ['#DDE7E0', '#F2E4E6'], ['#B9C9BE', '#DCC6CA'], ['#2E5543', '#A3283D'],
  ['#F3F7F4', '#FBF4E6'], ['#6B7A71', '#8A7B7E'], ['#DCE3DE', '#EEE6E7'],
  ['rgba(20,40,32,.82)', 'rgba(58,10,19,.84)'], ['rgba(20,40,32,.55)', 'rgba(40,8,14,.55)'],
  ['rgba(23,34,28,', 'rgba(34,23,26,'], ['rgba(251,252,250,', 'rgba(255,255,255,'],
  // photos: sage rooms -> white panelled rooms
  ['4974ea2530577fbb65b4a065eb6908ce', '28b59cd7da19b980563e5c8b95f31d23'],
  ['de643c1835f1746fba9198919b19098b', '886eaf8ca434f44ce94ec18f70b99528'],
  ['42714c0de0a750ebe640ce38324728b5', '0428f75cd87b7df17b3d7582383e431f'],
  ['673249ad87badfb4dc85c720677bad61', '70e63e224052d3ca8a5bba73482cf1fb'],
  ['b41d6cc3afbb5f383ff46edc9f1d6f36', '037d06704b915b81248a3f985fdc197c'],
  ['438f9493c5ac9c376d643b0865e7340a', 'fc2acbe5ebd8132cda6ad8437012341b'],
  ['f872eaab57f740f516bc77ef0c960f97', '985eaacfcd32fe311def0bf716f13fca'],
]
const VELVET_GRAD = 'linear-gradient(180deg,#A3243A 0%,#7E1627 100%)'
for (const f of ['Home.dc.html', 'Product.dc.html', 'StyleGuide.dc.html']) {
  let s = fs.readFileSync(f, 'utf8')
  for (const [a, b] of map) s = s.split(a).join(b).split(a.toLowerCase()).join(b)
  // velvet sheen on solid primary buttons
  s = s.split('background: #8E1B2E; color: #FFFFFF; font: inherit;').join(`background: ${VELVET_GRAD}; color: #FFFFFF; font: inherit;`)
  s = s.split('background: #8E1B2E; color: #FFFFFF; font-weight: 600;').join(`background: ${VELVET_GRAD}; color: #FFFFFF; font-weight: 600;`)
  fs.writeFileSync(f, s)
  const left = ['#1E3A2F','#C23B5E','#E9EEE8','#FBFCFA','#17221C'].filter(h => s.includes(h))
  console.log(f, 'leftover old colours:', left.join(',') || 'none')
}
