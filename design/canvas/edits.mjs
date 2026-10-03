import fs from 'node:fs'
const GOLD = 'linear-gradient(135deg,#94701F 0%,#E9CC7B 35%,#B58A2F 60%,#F2DC9C 85%,#9E7626 100%)'
const MARK = '/_blob/24ba8ed14e952000205ea0124178e2c2', WORD = '/_blob/5e139761526215f8bb14ab791345efd3'
const MARK_R = '/_blob/bf76a52477ed141082a7f1a5bd9f14f7', WORD_R = '/_blob/748b307fca4b2e1536b477e456462d06', LOGO_R = '/_blob/3cbd1050b2e6dc7a51c7bdfcc7864956'
const headerOld = `<img src="/_blob/3eb081328c7a72c65b161b89833929d3" alt="" style="width: 40px; height: 28px; display: block;">
      <span style="font-family: Besley, Georgia, serif; font-weight: 700; font-size: 24px; letter-spacing: -0.015em; color: #8E1B2E;">Heartwell</span>`
const headerNew = `<img src="${MARK}" alt="" style="width: 44px; height: 31px; display: block;">
      <img src="${WORD}" alt="Heartwell" style="width: 120px; height: 24px; display: block;">`
const annOld = `<div style="background: #4A0D17; color: #FFFFFF; font-size: 13px; font-weight: 500; text-align: center; padding: 10px 16px;">`
const annNew = `<div style="background: #4A0D17; color: #FFFFFF; font-size: 13px; font-weight: 500; text-align: center; padding: 10px 16px 8px; border-bottom: 2px solid #B58A2F; border-image: linear-gradient(90deg,#94701F,#F2DC9C 50%,#94701F) 1;">`
const edits = {
  'Home.dc.html': [
    [headerOld, headerNew, 1], [annOld, annNew, 1],
    [`background: #8E1B2E; color: #FFFFFF; font-family: Besley`, `background: ${GOLD}; color: #4A0D17; font-family: Besley`, 3],
    [`object-position: 38% 62%;`, `object-position: 50% 72%;`, 1],
    [`in a bright living room with sage green walls`, `in a bright living room with white panelled walls`, 1],
    [`letter-spacing: -0.01em; color: #FFFFFF;">Your sofa, in your fabric</h2>`, `letter-spacing: -0.01em; color: #E9CC7B; background: ${GOLD}; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;">Your sofa, in your fabric</h2>`, 1],
    [`background: #FFFFFF; color: #4A0D17; font-weight: 600; font-size: 17px;`, `background: ${GOLD}; color: #4A0D17; font-weight: 700; font-size: 17px;`, 1],
    [`<img src="/_blob/d45b90e0becb8006950a69da93f58a90" alt="" style="width: 46px; height: 32px; display: block;">
      <span style="font-family: Besley, Georgia, serif; font-weight: 700; font-size: 28px; letter-spacing: -0.015em;">Heartwell</span>`,
     `<img src="${LOGO_R}" alt="Heartwell Sofa" style="width: 190px; height: 130px; display: block;">`, 1],
  ],
  'Product.dc.html': [
    [headerOld, headerNew, 1], [annOld, annNew, 1],
    [`stroke="#8E1B2E" stroke-width="1.5"`, `stroke="#B58A2F" stroke-width="1.5"`, 6],
    [`<img src="/_blob/d45b90e0becb8006950a69da93f58a90" alt="" style="width: 40px; height: 28px; display: block;">
      <span style="font-family: Besley, Georgia, serif; font-weight: 700; font-size: 24px;">Heartwell</span>`,
     `<img src="${MARK_R}" alt="" style="width: 44px; height: 31px; display: block;">
      <img src="${WORD_R}" alt="Heartwell" style="width: 120px; height: 24px; display: block;">`, 1],
  ],
  'StyleGuide.dc.html': [
    [`<img src="/_blob/3eb081328c7a72c65b161b89833929d3" alt="" style="width: 54px; height: 38px; display: block;">
      <span style="font-family: Besley, Georgia, serif; font-weight: 700; font-size: 32px; letter-spacing: -0.015em; color: #8E1B2E;">Heartwell</span>`,
     `<img src="${MARK}" alt="" style="width: 62px; height: 44px; display: block;">
      <img src="${WORD}" alt="Heartwell" style="width: 170px; height: 34px; display: block;">`, 1],
    [`Daylight and Velvet: bright rooms in the photos, deep velvet green for every action, rose for the heart of the brand. Designed for phones first.`,
     `Red Velvet and Gold: deep velvet red for every action, metallic gold for the finishing touches, white and soft stone behind everything. Designed for phones first.`, 1],
    [`background: #8E1B2E; color: #FFFFFF;">Chalk on Velvet 12.0 : 1</span>`, `background: #8E1B2E; color: #FFFFFF;">White on Velvet red 9.0 : 1</span>`, 1],
    [`background: #8E1B2E; color: #FFFFFF;">White on Rose 5.1 : 1</span>`, `background: #E9CC7B; color: #4A0D17;">Wine on Gold 10.0 : 1</span>`, 1],
    [`Slate on Chalk 6.9 : 1`, `Slate on White 7.7 : 1`, 1],
    [`Slate on Sage mist 6.0 : 1`, `Slate on Stone 6.8 : 1`, 1],
    [`grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 16px;">
      <sc-for list="{{colours}}"`, `grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 16px;">
      <sc-for list="{{colours}}"`, 1],
    [`<div style="height: 104px; background: {{c.hex}};"></div>`, `<div style="height: 104px; background: {{c.fill}};"></div>`, 1],
    [`hint-placeholder-count="10">
        <div style="display: flex; flex-direction: column; border-radius: 20px;`, `hint-placeholder-count="12">
        <div style="display: flex; flex-direction: column; border-radius: 20px;`, 1],
    [`in a sage green living room`, `in a white panelled living room`, 1],
    [`Every main photo: the same bright room. Sage panelled walls, light oak floor, soft morning daylight.`, `Every main photo: the same bright room. Soft white panelled walls, light oak floor, a brass lamp, morning daylight.`, 1],
    [`background: #FFFFFF; color: #4A0D17; font: inherit; font-weight: 600; font-size: 17px;">Browse the fabrics`, `background: ${GOLD}; color: #4A0D17; font: inherit; font-weight: 700; font-size: 17px;">Browse the fabrics`, 1],
    [`font-size: 13px; font-weight: 600; color: #FFFFFF; background: #8E1B2E; padding: 5px 11px; border-radius: 999px;">£30 off with your code`, `font-size: 13px; font-weight: 700; color: #4A0D17; background: #E9CC7B; padding: 5px 11px; border-radius: 999px;">£30 off with your code`, 1],
    [`border-radius: 999px; background: #8E1B2E; display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF"`, `border-radius: 999px; background: ${GOLD}; display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4A0D17"`, 1],
  ],
}
for (const [f, list] of Object.entries(edits)) {
  let s = fs.readFileSync(f, 'utf8')
  for (const [a, b, n] of list) {
    const count = s.split(a).length - 1
    if (count !== n) console.log(`!! ${f}: expected ${n}, found ${count}: ${a.slice(0, 70).replace(/\n/g, ' ')}`)
    s = s.split(a).join(b)
  }
  fs.writeFileSync(f, s)
}
console.log('done')
