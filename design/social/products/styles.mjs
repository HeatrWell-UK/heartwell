// The three looks for range posts (owner, 24 October 2026: "A for one, then B
// for the second, C for the third, then A again"), so the Instagram grid
// alternates. Each style makes the same slides from the same context:
// cover, details (close-ups), sizes (every size drawn to one scale), one slide
// per size (velvet, editorial) or per piece (bold), fabrics and ordering.
//
//   velvet     A: velvet-red ground, gold foil, the photo in a gold arch, a gold medallion
//   bold       B: full photos, labels on the sofa, a stitched red price sticker
//   editorial  C: light magazine pages in a panel frame, gold offset outlines
//
// Words stay between 45 px and 1395 px from the top (Facebook's 4:5 trim).

import {
  page, esc, money, plan, sharedScale, full, band, closeUp, icon, promiseChips, swatchFill,
  STEPS, SITE, PHONE, LOGO_ON_DARK, LOGO_ON_LIGHT,
} from './lib.mjs'

const detailImage = (ctx, d, w) => closeUp(ctx.photoOf(d.photo, d.colour), d, w)
const n = (ctx) => ctx.groups.length
/** Escaped, with hyphenated words kept whole ("Armed U-shape" never breaks after "U-"). */
const nb = (s) => esc(s).replace(/(\S+-\S+)/g, '<span style="white-space:nowrap">$1</span>')
/** "Ashton · size 2 of 5", or "Harrison · made to order" when there's one size. */
const sizeKicker = (ctx, i) => `${esc(ctx.range.name)} · ${n(ctx) > 1 ? `size ${i} of ${n(ctx)}` : ctx.madeToOrder ? 'made to order' : 'ready made'}`
/** A long measurement line leaves no room for the delivery chip beside it (the cover and ordering slides say it anyway). */
const footChips = (g) => `<span class="chip">${icon.ruler}${esc(g.common)}</span>${g.common.length > 44 ? '' : `<span class="chip">${icon.truck}Free delivery</span>`}`

// ---------------------------------------------------------------- shared: sizes drawn to scale

function sizesGrid(ctx, t) {
  const groups = ctx.groups.slice(0, 8)
  const rows = Math.ceil(groups.length / 2)
  const top = t.top ?? 420
  const rowH = Math.min(320, Math.floor((1372 - top - (rows - 1) * 24) / rows))
  // Plans without labels here: the headline measurement is written beside each, and every plan gets more room.
  const bw = 214
  const bh = rowH - 44
  const scale = sharedScale(groups.map((g) => g.layout), bw, bh, 0, false)
  const cells = groups.map(
    (g) => `<div class="sz"><div class="pl">${plan(g.layout, { w: bw, h: bh, line: t.line, fill: t.fill, text: t.text, scale, labels: false })}</div>
    <div class="tx"><p class="nm">${nb(g.label)}</p><p class="hd">${esc(g.headline)}</p><p class="fr"><span>from</span> <b class="serif ${t.priceClass ?? ''}">${money(g.from)}</b></p></div></div>`,
  )
  if (groups.length % 2) {
    const note = ctx.allBacks ? 'Every size comes with a high back or a scattered back.' : ctx.madeToOrder ? `Made to order in the UK, in any of our ${ctx.fabrics.count} fabrics.` : 'Free delivery to most of mainland Britain.'
    cells.push(`<div class="sz note">${icon.heart}<p>${esc(note)}</p></div>`)
  }
  return {
    html: `<div class="grid">${cells.join('')}</div>`,
    css: `.grid{position:absolute;left:60px;right:60px;top:${top}px;display:grid;grid-template-columns:1fr 1fr;gap:24px 30px}
    .sz{height:${rowH}px;border-radius:24px;display:flex;align-items:center;gap:18px;padding:16px 22px 16px 14px;${t.card}}
    .pl{flex:none;width:${bw}px;height:${bh}px;display:grid;place-items:center}
    .tx{min-width:0}
    .nm{font:600 28px/1.15 Figtree,sans-serif;color:${t.name}}
    .hd{margin-top:8px;font:500 22px/1.3 Figtree,sans-serif;color:${t.dim}}
    .fr{margin-top:${rowH > 260 ? 16 : 8}px;color:${t.dim};font:500 22px/1 Figtree,sans-serif}
    .fr b{font-size:${rowH > 260 ? 58 : 46}px;line-height:1;color:${t.price}}
    .note{flex-direction:column;justify-content:center;text-align:center;padding:24px 34px;gap:14px;color:${t.name}}
    .note svg{width:44px;height:44px;color:${t.accent}}
    .note p{font:500 28px/1.35 Figtree,sans-serif}`,
  }
}

const sizesSub = (ctx) =>
  ['Drawn to the same scale, so you can compare them.', ctx.allBacks ? 'Each in high back or scattered back.' : ctx.backs > 1 ? 'Most come in high back or scattered back.' : null].filter(Boolean).join(' ')

// ---------------------------------------------------------------- A: velvet luxe

const velvet = {
  name: 'velvet',
  cover(ctx) {
    return page(
      `.logo{position:absolute;left:50%;top:56px;width:170px;transform:translateX(-50%)}
      h1{position:absolute;left:0;right:0;top:186px;text-align:center;font-size:184px;line-height:1;letter-spacing:-.015em;filter:drop-shadow(0 4px 14px rgb(0 0 0 / .45))}
      .tag{position:absolute;left:0;right:0;top:390px;text-align:center;font:500 30px/1 Figtree,sans-serif;color:#F2DCC8;letter-spacing:.05em}
      .frame{position:absolute;left:100px;top:450px;width:880px;height:800px;padding:9px;border-radius:440px 440px 34px 34px;box-shadow:0 30px 60px rgb(0 0 0 / .45)}
      .frame::after{content:"";position:absolute;inset:20px;border-radius:420px 420px 22px 22px;border:2px solid rgb(246 227 168 / .7)}
      .frame img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 58%;border-radius:431px 431px 26px 26px}
      .medal{position:absolute;left:770px;top:996px;width:256px;height:256px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#4A0D17;box-shadow:0 14px 30px rgb(0 0 0 / .45),inset 0 0 0 10px rgb(255 255 255 / .18),inset 0 0 0 13px rgb(122 88 22 / .55)}
      .medal .f{font:700 28px/1 Figtree,sans-serif;letter-spacing:.06em}
      .medal .p{font-size:${ctx.from >= 1000 ? 76 : 96}px;line-height:1;margin-top:4px}
      .chips{position:absolute;left:0;right:0;top:1300px;display:flex;justify-content:center;gap:40px}
      .chips svg{color:#E9CC7B}
      .swipe{position:absolute;right:-34px;top:760px;width:96px;height:96px;border-radius:50%;display:grid;place-items:center;color:#4A0D17;box-shadow:0 8px 20px rgb(0 0 0 / .4)}
      .swipe svg{width:40px;height:40px;margin-right:30px}`,
      `<img class="logo" src="${LOGO_ON_DARK}" alt="">
      <h1 class="serif foil">${esc(ctx.displayName)}</h1>
      <p class="tag">${esc(ctx.copy.tagline)}</p>
      <div class="frame goldbg"><img src="${full(ctx.coverImage, 900)}" alt=""></div>
      <div class="medal goldbg">${n(ctx) > 1 ? '<span class="f">FROM</span>' : ''}<span class="p serif">${money(ctx.from)}</span></div>
      <div class="chips">${promiseChips(ctx)}</div>
      <div class="swipe goldbg">${icon.arrow}</div>`,
      'velvet',
    )
  },
  details(ctx) {
    const d = ctx.copy.details
    const circle = (x, y, size, item) =>
      `<div class="c goldbg" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px"><img src="${detailImage(ctx, item, size)}" alt=""></div>
      <p class="lbl" style="left:${x + size / 2}px;top:${y + size - 30}px">${esc(item.label)}</p>`
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
      h2{position:absolute;left:66px;top:116px;font-size:110px;line-height:1;letter-spacing:-.01em;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
      .c{position:absolute;border-radius:50%;padding:8px;box-shadow:0 20px 40px rgb(0 0 0 / .45)}
      .c img{display:block;width:100%;height:100%;border-radius:50%;object-fit:cover}
      .lbl{position:absolute;transform:translateX(-50%);white-space:nowrap;padding:14px 26px;border-radius:999px;background:#3A0911;border:2px solid rgb(233 204 123 / .7);color:#F6E3A8;font:600 28px/1 Figtree,sans-serif}
      .line{position:absolute;left:70px;width:520px;top:${d.length > 2 ? 980 : 940}px;font:500 34px/1.4 Figtree,sans-serif;color:#F2E4E6}
      .chips{position:absolute;left:70px;right:70px;top:1300px;display:flex;justify-content:space-between}
      .chips svg{color:#E9CC7B}`,
      `<p class="k">${esc(ctx.range.name)}</p>
      <h2 class="serif foil">The details</h2>
      ${d[0] ? circle(60, 340, 540, d[0]) : ''}
      ${d[1] ? circle(650, 270, 370, d[1]) : ''}
      ${d[2] ? circle(650, 720, 370, d[2]) : ''}
      <p class="line">${esc(ctx.detailsLine)}</p>
      <div class="chips">${promiseChips(ctx)}</div>`,
      'velvet',
    )
  },
  sizes(ctx) {
    const g = sizesGrid(ctx, { card: 'background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .42)', name: '#F2E4E6', dim: '#E9CC7B', price: 'transparent', priceClass: 'foil', line: '#E9CC7B', fill: 'rgba(233,204,123,.12)', text: '#F2E4E6', accent: '#E9CC7B' })
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
      h2{position:absolute;left:66px;top:116px;font-size:84px;line-height:1.02;letter-spacing:-.01em;max-width:900px;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
      .sub{position:absolute;left:70px;top:322px;font:500 28px/1.35 Figtree,sans-serif;color:#EBDADD;max-width:900px}
      ${g.css}`,
      `<p class="k">${esc(ctx.range.name)} · ${n(ctx)} sizes</p>
      <h2 class="serif foil">Which size fits your room?</h2>
      <p class="sub">${esc(sizesSub(ctx))}</p>
      ${g.html}`,
      'velvet',
    )
  },
  size(ctx, g, i) {
    const two = g.options.length > 1
    const card = (o, top, h) => `<div class="card goldbg" style="top:${top}px;height:${h}px"><div class="in">
      <img src="${two ? band(o.image, 944, h - 12) : full(o.image, 944)}" alt="">
      ${o.note ? `<span class="note">${esc(o.note)}</span>` : ''}
      <span class="label">${esc(o.label)}${o.sub ? `<small>${esc(o.sub)}</small>` : ''}</span>
      <span class="tag goldbg"><span class="hole"></span><span class="serif">${money(o.price)}</span></span>
    </div></div>`
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
      h2{position:absolute;left:66px;top:116px;max-width:600px;font-size:96px;line-height:1;letter-spacing:-.01em;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
      .plan{position:absolute;right:64px;top:50px}
      .card{position:absolute;left:62px;width:956px;padding:6px;border-radius:30px;box-shadow:0 22px 44px rgb(0 0 0 / .45)}
      .card .in{position:relative;width:100%;height:100%;border-radius:25px;overflow:hidden}
      .card img{display:block;width:100%;height:100%;object-fit:cover}
      .label{position:absolute;left:22px;bottom:22px;display:flex;flex-direction:column;gap:8px;padding:16px 24px;border-radius:18px;background:rgb(58 9 17 / .84);color:#F2E4E6;font:600 32px/1 Figtree,sans-serif}
      .label small{font:500 24px/1 Figtree,sans-serif;color:#E9CC7B}
      .tag{position:absolute;right:22px;top:22px;display:flex;align-items:center;gap:16px;padding:14px 30px 14px 22px;color:#4A0D17;clip-path:polygon(22px 0,100% 0,100% 100%,22px 100%,0 50%);box-shadow:0 8px 18px rgb(0 0 0 / .35)}
      .tag .hole{width:16px;height:16px;border-radius:50%;border:3px solid #4A0D17;margin-left:8px;opacity:.8}
      .tag .serif{font-size:72px;line-height:1}
      .note{position:absolute;left:22px;top:22px;padding:10px 20px;border-radius:999px;background:rgb(34 23 26 / .72);color:#fff;font:500 24px/1.2 Figtree,sans-serif}
      .foot{position:absolute;left:62px;right:62px;top:1300px;display:flex;justify-content:space-between;align-items:center}
      .foot svg{color:#E9CC7B}`,
      `<p class="k">${sizeKicker(ctx, i)}</p>
      <h2 class="serif foil">${nb(g.label)}</h2>
      <div class="plan">${plan(g.layout, { w: 300, h: 250, line: '#E9CC7B', fill: 'rgba(233,204,123,.12)', text: '#F2E4E6', font: 24 })}</div>
      ${two ? card(g.options[0], 340, 446) + card(g.options[1], 812, 446) : card(g.options[0], 340, 918)}
      <div class="foot">${footChips(g)}</div>`,
      'velvet',
    )
  },
  fabrics(ctx) {
    const f = ctx.fabrics
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
      h2{position:absolute;left:66px;top:116px;max-width:700px;font-size:84px;line-height:1.02;letter-spacing:-.01em;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
      .lead{position:absolute;left:70px;top:316px;max-width:900px;font:500 32px/1.4 Figtree,sans-serif;color:#EBDADD}
      .seal{position:absolute;right:56px;top:56px;width:210px;height:210px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:#4A0D17;transform:rotate(8deg);box-shadow:0 14px 30px rgb(0 0 0 / .45),inset 0 0 0 9px rgb(255 255 255 / .18),inset 0 0 0 12px rgb(122 88 22 / .55)}
      .seal b{font:700 22px/1.1 Figtree,sans-serif;letter-spacing:.05em}
      .seal span{font:400 46px/1 Gloock,serif;margin-top:6px}
      .grid{position:absolute;left:66px;right:66px;top:446px;display:grid;grid-template-columns:repeat(4,1fr);gap:28px 24px;list-style:none;padding:0}
      .grid li{display:flex;flex-direction:column;align-items:center;gap:12px}
      .sw{width:208px;height:208px;display:grid;place-items:center}
      .sw i{display:block;width:196px;height:196px}
      .grid span{font:500 27px/1.2 Figtree,sans-serif;color:#F2E4E6}
      .more{position:absolute;left:0;right:0;top:1318px;text-align:center;font:600 30px/1 Figtree,sans-serif;color:#E9CC7B}`,
      `<p class="k">${esc(ctx.range.name)} · made to order</p>
      <h2 class="serif foil">Your ${esc(ctx.range.name)}, in your fabric</h2>
      ${f.samePrice ? `<div class="seal goldbg"><b>ANY FABRIC</b><span>same price</span></div>` : ''}
      <p class="lead">Shown in ${esc(f.shown)}. Made to order in the UK in any of our ${f.count} fabrics.</p>
      <ul class="grid">${f.picks(12)
        .map((s) => `<li><div class="sw goldbg pinked"><i class="pinked" style="${swatchFill(s, 214)}"></i></div><span>${esc(s.name)}</span></li>`)
        .join('')}</ul>
      <p class="more">See every fabric at ${SITE}/fabrics</p>`,
      'velvet',
    )
  },
  order(ctx) {
    return page(
      `.wrap{position:absolute;inset:76px 72px 76px;display:flex;flex-direction:column;align-items:center}
      .logo{width:250px}
      h2{margin-top:30px;font-size:76px;line-height:1.06;text-align:center;letter-spacing:-.01em;max-width:880px;filter:drop-shadow(0 3px 10px rgb(0 0 0 / .4))}
      .steps{list-style:none;margin:auto 0;padding:0;display:flex;flex-direction:column;gap:46px;position:relative;width:100%}
      .steps::before{content:"";position:absolute;left:39px;top:40px;bottom:40px;width:3px;background:linear-gradient(180deg,#94701F,#F2DC9C 50%,#94701F)}
      .steps li{display:flex;align-items:center;gap:34px;font:500 36px/1.35 Figtree,sans-serif}
      .num{position:relative;flex:none;width:80px;height:80px;border-radius:50%;display:grid;place-items:center;font-size:42px;color:#4A0D17;box-shadow:0 6px 16px rgb(0 0 0 / .35)}
      .contact{text-align:center}
      .wa{display:inline-flex;align-items:center;gap:14px;font:700 40px/1 Figtree,sans-serif;color:#F6E3A8}
      .wa svg{width:44px;height:44px}
      .visit{margin-top:16px;font:400 28px/1.3 Figtree,sans-serif;color:#EBDADD}`,
      `<div class="wrap">
        <img class="logo" src="${LOGO_ON_DARK}" alt="">
        <h2 class="serif foil">Nothing to pay until it’s in your room</h2>
        <ol class="steps">${STEPS.map((s, i) => `<li><span class="num serif goldbg">${i + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>
        <div class="contact"><p class="wa">${icon.chat}WhatsApp ${esc(PHONE)}</p><p class="visit">Showroom in Burnley, by appointment · ${SITE}</p></div>
      </div>`,
      'velvet',
    )
  },
}

// ---------------------------------------------------------------- B: bold showroom

const STICKER = `display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:50%;color:#fff;transform:rotate(-9deg);background:radial-gradient(circle at 35% 30%,#C0304A,#8E1B2E 60%,#6A1222);box-shadow:0 14px 30px rgb(0 0 0 / .35)`
const STICKER_CSS = `.sticker{position:absolute;${STICKER}}
  .sticker::before{content:"";position:absolute;inset:12px;border-radius:50%;border:3px dashed rgb(255 255 255 / .6)}
  .sticker .f{font:700 26px/1 Figtree,sans-serif;letter-spacing:.06em}
  .sticker .s{margin-top:6px;font:600 22px/1 Figtree,sans-serif;opacity:.9}`

const bold = {
  name: 'bold',
  perPiece: true,
  cover(ctx) {
    const calls = ctx.copy.callouts ?? []
    return page(
      `.photo{position:absolute;left:0;top:0;width:1080px;height:1080px}
      .fade{position:absolute;left:0;right:0;top:720px;height:360px;background:linear-gradient(180deg,rgba(74,13,23,0),rgba(74,13,23,.75) 60%,#4A0D17)}
      ${STICKER_CSS}
      .sticker .p{font-size:${ctx.from >= 1000 ? 84 : 104}px;line-height:1}
      .call{position:absolute;padding:12px 22px;border-radius:999px;background:#fff;color:#22171A;font:600 26px/1 Figtree,sans-serif;box-shadow:0 6px 16px rgb(0 0 0 / .25);white-space:nowrap}
      .dot{position:absolute;width:18px;height:18px;margin:-9px 0 0 -9px;border-radius:50%;background:#fff;box-shadow:0 0 0 6px rgb(255 255 255 / .35)}
      svg.lines{position:absolute;left:0;top:0}
      h1{position:absolute;left:60px;top:1000px;font-size:178px;line-height:1;letter-spacing:-.015em}
      .meta{position:absolute;left:64px;top:1196px;font:600 32px/1.3 Figtree,sans-serif;color:#F2E4E6}
      .row{position:absolute;left:64px;right:64px;top:1288px;display:flex;justify-content:space-between;align-items:center;padding-top:26px;border-top:2px solid rgb(233 204 123 / .35)}
      .row svg{color:#E9CC7B}
      .go{position:absolute;right:64px;top:1080px;display:flex;align-items:center;gap:12px;padding:20px 30px;border-radius:999px;color:#4A0D17;font:700 30px/1 Figtree,sans-serif}
      .go svg{width:34px;height:34px}`,
      `<img class="photo" src="${full(ctx.coverImage)}" alt="">
      <div class="fade"></div>
      <svg class="lines" width="1080" height="1080"><g stroke="#fff" stroke-width="3">${calls.map((c) => `<line x1="${c.dot[0]}" y1="${c.dot[1]}" x2="${c.pill[0] + 40}" y2="${c.pill[1] + 25}"/>`).join('')}</g></svg>
      ${calls.map((c) => `<span class="dot" style="left:${c.dot[0]}px;top:${c.dot[1]}px"></span><span class="call" style="left:${c.pill[0]}px;top:${c.pill[1]}px">${esc(c.label)}</span>`).join('')}
      <div class="sticker" style="right:56px;top:70px;width:270px;height:270px">${n(ctx) > 1 ? '<span class="f">FROM</span>' : ''}<span class="p serif">${money(ctx.from)}</span></div>
      <h1 class="serif foil">${esc(ctx.displayName)}</h1>
      <p class="meta">${esc(ctx.metaLine)}</p>
      <span class="go goldbg">Swipe ${icon.arrow}</span>
      <div class="row">${promiseChips(ctx)}</div>`,
      'wine',
    )
  },
  details(ctx) {
    const d = ctx.copy.details
    const tile = (item, x, y, w, h) => `<div class="t" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><img src="${detailImage(ctx, item, Math.max(w, h))}" alt=""><span>${esc(item.label)}</span></div>`
    return page(
      `.k{position:absolute;left:64px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.04em}
      h2{position:absolute;left:60px;top:114px;font-size:120px;line-height:1;letter-spacing:-.015em}
      .t{position:absolute;border-radius:28px;overflow:hidden;box-shadow:0 18px 36px rgb(0 0 0 / .4);border:3px solid rgb(233 204 123 / .55)}
      .t img{display:block;width:100%;height:100%;object-fit:cover}
      .t span{position:absolute;left:18px;bottom:18px;padding:12px 22px;border-radius:999px;background:#fff;color:#22171A;font:600 28px/1 Figtree,sans-serif;box-shadow:0 6px 16px rgb(0 0 0 / .25)}
      .line{position:absolute;left:64px;right:64px;top:1312px;display:flex;align-items:center;gap:14px;font:600 30px/1.2 Figtree,sans-serif;color:#F2E4E6}
      .line svg{width:38px;height:38px;color:#E9CC7B;flex:none}`,
      `<p class="k">${esc(ctx.range.name)}</p>
      <h2 class="serif foil">Up close</h2>
      ${d[0] ? tile(d[0], 60, 280, 960, 560) : ''}
      ${d[1] ? tile(d[1], 60, 870, d[2] ? 465 : 960, 400) : ''}
      ${d[2] ? tile(d[2], 555, 870, 465, 400) : ''}
      <p class="line">${icon.heart}${esc(ctx.detailsLine)}</p>`,
      'wine',
    )
  },
  sizes(ctx) {
    const g = sizesGrid(ctx, { card: 'background:#fff;box-shadow:0 12px 28px rgb(0 0 0 / .3)', name: '#22171A', dim: '#5E4F52', price: '#8E1B2E', line: '#8E1B2E', fill: 'rgba(142,27,46,.07)', text: '#5E4F52', accent: '#8E1B2E', top: 400 })
    return page(
      `h2{position:absolute;left:60px;top:76px;font-size:96px;line-height:1.02;letter-spacing:-.015em;max-width:960px}
      .sub{position:absolute;left:64px;top:300px;font:500 28px/1.35 Figtree,sans-serif;color:#EBDADD;max-width:940px}
      ${g.css}`,
      `<h2 class="serif foil">Which size fits your room?</h2>
      <p class="sub">${esc(sizesSub(ctx))}</p>
      ${g.html}`,
      'wine',
    )
  },
  piece(ctx, g, o) {
    return page(
      `.photo{position:absolute;left:0;top:0;width:1080px;height:1080px}
      .fade{position:absolute;left:0;right:0;top:820px;height:260px;background:linear-gradient(180deg,rgba(74,13,23,0),#4A0D17)}
      .title{position:absolute;left:56px;top:56px;max-width:690px;padding:22px 30px 26px;border-radius:24px;background:rgb(255 255 255 / .92);box-shadow:0 10px 26px rgb(0 0 0 / .18)}
      .title p{font:600 26px/1 Figtree,sans-serif;color:#8E1B2E;letter-spacing:.03em}
      .title h2{margin-top:10px;font-size:68px;line-height:1;color:#22171A}
      ${STICKER_CSS}
      .sticker .p{font-size:${o.price >= 1000 ? 70 : 88}px;line-height:1}
      .note{position:absolute;right:56px;top:740px;padding:10px 22px;border-radius:999px;background:rgb(34 23 26 / .75);color:#fff;font:500 26px/1.2 Figtree,sans-serif}
      .inset{position:absolute;left:56px;top:1010px;width:360px;height:330px;border-radius:24px;background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .45);display:grid;place-items:center}
      .info{position:absolute;left:452px;right:56px;top:1036px}
      .info .k{font:600 26px/1 Figtree,sans-serif;color:#E9CC7B;letter-spacing:.03em}
      .info .d{margin-top:16px;font:500 32px/1.4 Figtree,sans-serif}
      .info .chips{margin-top:24px;display:flex;flex-direction:column;gap:16px}
      .info .chips svg{color:#E9CC7B}`,
      `<img class="photo" src="${full(o.image)}" alt="">
      <div class="fade"></div>
      <div class="title"><p>${esc([ctx.range.name, g.options.length > 1 ? o.label.toLowerCase() : null, o.extra].filter(Boolean).join(' · '))}</p><h2 class="serif">${nb(g.label)}</h2></div>
      <div class="sticker" style="right:56px;top:56px;width:236px;height:236px"><span class="p serif">${money(o.price)}</span><span class="s">${o.set ? 'both sofas' : 'free delivery'}</span></div>
      ${o.note ? `<span class="note">${esc(o.note)}</span>` : ''}
      <div class="inset">${plan(g.layout, { w: 300, h: 270, line: '#E9CC7B', fill: 'rgba(233,204,123,.12)', text: '#F2E4E6', font: 24 })}</div>
      <div class="info"><p class="k">Size and fit</p><p class="d">${esc(o.dims[0])}<br>${esc(o.dims.slice(1).join(' · '))}</p>
      <div class="chips"><span class="chip">${icon.truck}Free delivery</span><span class="chip">${icon.pound}Pay when it’s in your room</span></div></div>`,
      'wine',
    )
  },
  fabrics(ctx) {
    const f = ctx.fabrics
    return page(
      `h2{position:absolute;left:60px;top:76px;max-width:760px;font-size:92px;line-height:1.02;letter-spacing:-.015em}
      .lead{position:absolute;left:64px;top:300px;max-width:940px;font:500 30px/1.4 Figtree,sans-serif;color:#EBDADD}
      ${STICKER_CSS}
      .sticker b{font:400 50px/1 Gloock,serif}
      .grid{position:absolute;left:60px;right:60px;top:420px;display:grid;grid-template-columns:repeat(3,1fr);gap:24px 30px;list-style:none;padding:0}
      .grid li{display:flex;flex-direction:column;align-items:center;gap:12px}
      .grid i{display:block;width:270px;height:220px;box-shadow:0 10px 24px rgb(0 0 0 / .35)}
      .grid span{font:600 28px/1 Figtree,sans-serif}
      .go{position:absolute;left:50%;top:1300px;transform:translateX(-50%);padding:20px 34px;border-radius:999px;color:#4A0D17;font:700 30px/1 Figtree,sans-serif;white-space:nowrap}`,
      `<h2 class="serif foil">${f.count} fabrics to choose from</h2>
      ${f.samePrice ? `<div class="sticker" style="right:60px;top:60px;width:230px;height:230px"><span class="f">ANY FABRIC</span><b>same</b><b>price</b></div>` : ''}
      <p class="lead">Every ${esc(ctx.range.name)} is made to order in the UK. Shown in ${esc(f.shown)}; pick any colour you like.</p>
      <ul class="grid">${f.picks(9).map((s) => `<li><i class="pinked" style="${swatchFill(s, 280)}"></i><span>${esc(s.name)}</span></li>`).join('')}</ul>
      <span class="go goldbg">See them all at ${SITE}/fabrics</span>`,
      'wine',
    )
  },
  order(ctx) {
    return page(
      `.photo{position:absolute;left:0;top:0;width:1080px;height:560px;object-fit:cover}
      .fade{position:absolute;left:0;right:0;top:300px;height:262px;background:linear-gradient(180deg,rgba(74,13,23,0),#4A0D17)}
      h2{position:absolute;left:60px;right:60px;top:440px;font-size:80px;line-height:1.04;letter-spacing:-.015em}
      .steps{position:absolute;left:60px;right:60px;top:660px;display:grid;grid-template-columns:1fr 1fr;gap:24px;list-style:none;padding:0}
      .steps li{padding:26px 28px;border-radius:24px;background:rgb(255 255 255 / .06);border:2px solid rgb(233 204 123 / .35);font:500 30px/1.35 Figtree,sans-serif;min-height:250px}
      .steps b{display:block;font:400 64px/1 Gloock,serif;margin-bottom:12px}
      .wa{position:absolute;left:60px;top:1240px;display:flex;align-items:center;gap:14px;padding:22px 34px;border-radius:999px;color:#4A0D17;font:700 36px/1 Figtree,sans-serif}
      .wa svg{width:42px;height:42px}
      .visit{position:absolute;left:64px;right:60px;top:1350px;font:400 26px/1.2 Figtree,sans-serif;color:#EBDADD}`,
      `<img class="photo" src="${band(ctx.coverImage, 1080, 560, 0.45)}" alt="">
      <div class="fade"></div>
      <h2 class="serif foil">Nothing to pay until it’s in your room</h2>
      <ol class="steps">${STEPS.map((s, i) => `<li><b class="foil">${i + 1}</b>${esc(s)}</li>`).join('')}</ol>
      <span class="wa goldbg">${icon.chat}WhatsApp ${esc(PHONE)}</span>
      <p class="visit">Showroom in Burnley, by appointment · ${SITE}</p>`,
      'wine',
    )
  },
}

// ---------------------------------------------------------------- C: editorial

const editorial = {
  name: 'editorial',
  cover(ctx) {
    const d = ctx.copy.details?.[0]
    const other = ctx.coverTile
    return page(
      `.logo{position:absolute;right:66px;top:66px;width:150px}
      h1{position:absolute;left:66px;top:64px;max-width:760px;font-size:${ctx.displayName.length > 9 ? 124 : 168}px;line-height:1;letter-spacing:-.02em}
      .sub{position:absolute;left:70px;top:246px;font:500 30px/1.3 Figtree,sans-serif;color:#5E4F52}
      .big{position:absolute;left:70px;top:322px;width:940px;height:640px}
      .big::before{content:"";position:absolute;left:18px;top:18px;right:-18px;bottom:-18px;border-radius:470px 470px 26px 26px;border:3px solid #B58A2F}
      .big img{position:relative;display:block;width:100%;height:100%;object-fit:cover;object-position:50% 60%;border-radius:470px 470px 26px 26px}
      .price{position:absolute;right:46px;top:840px;padding:22px 34px;border-radius:24px;background:#8E1B2E;color:#fff;text-align:center;box-shadow:0 14px 30px rgb(74 13 23 / .35)}
      .price span{display:block;font:600 26px/1 Figtree,sans-serif;color:#F4E7C6}
      .price b{display:block;font:400 92px/1 Gloock,serif}
      .tile{position:absolute;top:1010px;width:455px;height:270px;border-radius:24px;overflow:hidden;box-shadow:0 10px 24px rgb(34 23 26 / .12)}
      .tile img{display:block;width:100%;height:100%;object-fit:cover}
      .tile span{position:absolute;left:16px;bottom:16px;padding:10px 18px;border-radius:999px;background:rgb(255 255 255 / .92);font:600 24px/1 Figtree,sans-serif}
      .chips{position:absolute;left:70px;right:70px;top:1314px;display:flex;justify-content:space-between}
      .chips svg{color:#8E1B2E}`,
      `<img class="logo" src="${LOGO_ON_LIGHT}" alt="">
      <h1 class="serif">${esc(ctx.displayName)}</h1>
      <p class="sub">${esc(ctx.copy.sub ?? ctx.copy.tagline)}</p>
      <div class="big"><img src="${full(ctx.coverImage, 960)}" alt=""></div>
      <div class="price"><span>${n(ctx) > 1 ? `${n(ctx)} sizes from` : esc(ctx.groups[0].label)}</span><b>${money(ctx.from)}</b></div>
      ${d ? `<div class="tile" style="left:70px;${other ? '' : 'width:940px'}"><img src="${other ? detailImage(ctx, d, 460) : detailImage(ctx, d, 940)}" alt="" style="${other ? '' : 'object-position:50% 50%'}"><span>${esc(d.label)}</span></div>` : ''}
      ${other ? `<div class="tile" style="left:${d ? 555 : 70}px;${d ? '' : 'width:940px'}"><img src="${band(other.image, d ? 460 : 940, 270)}" alt=""><span>${esc(other.label)}</span></div>` : ''}
      <div class="chips">${promiseChips(ctx)}</div>`,
      'stone',
    )
  },
  details(ctx) {
    const d = ctx.copy.details
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#8E1B2E;letter-spacing:.03em}
      h2{position:absolute;left:66px;top:118px;font-size:96px;line-height:1;letter-spacing:-.015em}
      .arch{position:absolute;left:70px;top:290px;width:470px;height:620px}
      .arch::before{content:"";position:absolute;left:16px;top:16px;right:-16px;bottom:-16px;border-radius:235px 235px 22px 22px;border:3px solid #B58A2F}
      .arch img{position:relative;display:block;width:100%;height:100%;object-fit:cover;border-radius:235px 235px 22px 22px}
      .sq{position:absolute;left:70px;top:950px;width:470px;height:330px;border-radius:22px;overflow:hidden;box-shadow:0 10px 24px rgb(34 23 26 / .12)}
      .sq img{display:block;width:100%;height:100%;object-fit:cover}
      .cap{position:absolute;left:16px;bottom:16px;padding:10px 18px;border-radius:999px;background:rgb(255 255 255 / .92);font:600 24px/1 Figtree,sans-serif}
      ol{position:absolute;left:600px;right:70px;top:300px;list-style:none;padding:0;display:flex;flex-direction:column;gap:34px}
      li{display:flex;gap:20px;align-items:flex-start;font:500 32px/1.3 Figtree,sans-serif}
      li b{flex:none;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;background:#8E1B2E;color:#fff;font:400 30px/1 Gloock,serif;margin-top:-6px}
      .chips{position:absolute;left:70px;right:70px;top:1314px;display:flex;justify-content:space-between}
      .chips svg{color:#8E1B2E}`,
      `<p class="k">${esc(ctx.range.name)}</p>
      <h2 class="serif">Why it’s worth a look</h2>
      ${d[0] ? `<div class="arch"><img src="${detailImage(ctx, d[0], 620)}" alt=""><span class="cap">${esc(d[0].label)}</span></div>` : ''}
      ${d[2] ?? d[1] ? `<div class="sq"><img src="${detailImage(ctx, d[2] ?? d[1], 470)}" alt=""><span class="cap">${esc((d[2] ?? d[1]).label)}</span></div>` : ''}
      ${d[2] && d[1] ? `<div class="sq" style="left:600px;top:${ctx.highlights.length > 4 ? 920 : 860}px;width:410px;height:${ctx.highlights.length > 4 ? 360 : 420}px"><img src="${detailImage(ctx, d[1], 420)}" alt=""><span class="cap">${esc(d[1].label)}</span></div>` : ''}
      <ol>${ctx.highlights.slice(0, 5).map((h, i) => `<li><b>${i + 1}</b><span>${esc(h)}</span></li>`).join('')}</ol>
      <div class="chips">${promiseChips(ctx)}</div>`,
      'stone',
    )
  },
  sizes(ctx) {
    const g = sizesGrid(ctx, { card: 'background:#fff;box-shadow:0 10px 26px rgb(34 23 26 / .08);outline:2px solid #EFE7E7', name: '#22171A', dim: '#5E4F52', price: '#8E1B2E', line: '#8E1B2E', fill: 'rgba(142,27,46,.06)', text: '#5E4F52', accent: '#B58A2F', top: 420 })
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#8E1B2E;letter-spacing:.03em}
      h2{position:absolute;left:66px;top:118px;font-size:88px;line-height:1.02;letter-spacing:-.015em;max-width:900px}
      .sub{position:absolute;left:70px;top:322px;font:500 28px/1.35 Figtree,sans-serif;color:#5E4F52;max-width:940px}
      ${g.css}`,
      `<p class="k">${esc(ctx.range.name)} · ${n(ctx)} sizes</p>
      <h2 class="serif">Which size fits your room?</h2>
      <p class="sub">${esc(sizesSub(ctx))}</p>
      ${g.html}`,
      'stone',
    )
  },
  size(ctx, g, i) {
    const two = g.options.length > 1
    const imgH = two ? 340 : 820
    const card = (o, top) => `<div class="cc" style="top:${top}px"><div class="ph"><img src="${two ? band(o.image, 900, imgH) : full(o.image, 900)}" alt="">${o.note ? `<span class="note">${esc(o.note)}</span>` : ''}</div>
      <div class="row"><div><b>${esc(o.label)}</b>${o.sub ? `<span>${esc(o.sub)}</span>` : ''}</div><p class="serif">${money(o.price)}</p></div></div>`
    return page(
      `.k{position:absolute;left:70px;top:76px;font:600 28px/1 Figtree,sans-serif;color:#8E1B2E;letter-spacing:.03em}
      h2{position:absolute;left:66px;top:118px;max-width:640px;font-size:${g.label.length > 14 ? 80 : 92}px;line-height:1;letter-spacing:-.015em}
      .plan{position:absolute;right:62px;top:50px}
      .cc{position:absolute;left:70px;width:940px;padding:20px;border-radius:28px;background:#fff;box-shadow:0 14px 34px rgb(34 23 26 / .1)}
      .cc::before{content:"";position:absolute;left:14px;top:14px;right:-14px;bottom:-14px;border-radius:30px;border:3px solid #B58A2F;z-index:-1}
      .ph{position:relative}
      .ph img{display:block;width:900px;height:${imgH}px;border-radius:18px;object-fit:cover}
      .note{position:absolute;left:16px;top:16px;padding:10px 20px;border-radius:999px;background:rgb(34 23 26 / .72);color:#fff;font:500 24px/1.2 Figtree,sans-serif}
      .row{display:flex;justify-content:space-between;align-items:center;padding:18px 8px 2px}
      .row b{display:block;font:600 36px/1.1 Figtree,sans-serif}
      .row span{display:block;margin-top:6px;font:400 26px/1.2 Figtree,sans-serif;color:#5E4F52}
      .row p{font-size:84px;line-height:1;color:#8E1B2E}
      .wrap{position:absolute;left:0;top:0;width:1080px;height:1440px;isolation:isolate}
      .foot{position:absolute;left:70px;right:70px;top:1322px;display:flex;justify-content:space-between}
      .foot svg{color:#8E1B2E}`,
      `<p class="k">${sizeKicker(ctx, i)}</p>
      <h2 class="serif">${nb(g.label)}</h2>
      <div class="plan">${plan(g.layout, { w: 250, h: 210, line: '#8E1B2E', fill: 'rgba(142,27,46,.06)', text: '#5E4F52', font: 22 })}</div>
      <div class="wrap">${two ? card(g.options[0], 286) + card(g.options[1], 796) : card(g.options[0], 286)}</div>
      <div class="foot">${footChips(g)}</div>`,
      'stone',
    )
  },
  fabrics(ctx) {
    const f = ctx.fabrics
    return page(
      `.panel{position:absolute;inset:84px 66px;display:flex;flex-direction:column;align-items:center;text-align:center}
      h2{font-size:80px;line-height:1.04;letter-spacing:-.015em;max-width:900px;text-wrap:balance}
      .lead{margin-top:24px;font:400 34px/1.4 Figtree,sans-serif;color:#5E4F52;max-width:900px;text-wrap:balance}
      .grid{list-style:none;margin:auto 0;padding:0;display:grid;grid-template-columns:repeat(4,216px);gap:34px 32px}
      .grid li{display:flex;flex-direction:column;align-items:center;gap:14px}
      .grid i{display:block;width:216px;height:216px}
      .grid span{font:500 28px/1.2 Figtree,sans-serif;color:#3E2F32}
      .more{font:600 30px/1.3 Figtree,sans-serif;color:#8E1B2E}`,
      `<div class="panel">
        <h2 class="serif">Your ${esc(ctx.range.name)}, in your fabric</h2>
        <p class="lead">Shown in ${esc(f.shown)}. Made to order in the UK in any of our ${f.count} fabrics${f.samePrice ? ', all at the same price' : ''}.</p>
        <ul class="grid">${f.picks(12).map((s) => `<li><i class="pinked" style="${swatchFill(s, 216)}"></i><span>${esc(s.name)}</span></li>`).join('')}</ul>
        <p class="more">See every fabric at ${SITE}/fabrics</p>
      </div>`,
      'stone',
    )
  },
  order(ctx) {
    return page(
      `.wrap{position:absolute;inset:80px 72px 76px;display:flex;flex-direction:column;align-items:center}
      .logo{width:230px}
      h2{margin-top:30px;font-size:74px;line-height:1.06;text-align:center;letter-spacing:-.015em;max-width:880px}
      .steps{list-style:none;margin:auto 0;padding:0;display:flex;flex-direction:column;gap:44px;position:relative;width:100%}
      .steps::before{content:"";position:absolute;left:37px;top:40px;bottom:40px;width:3px;background:#B58A2F}
      .steps li{display:flex;align-items:center;gap:32px;font:500 34px/1.35 Figtree,sans-serif}
      .num{position:relative;flex:none;width:76px;height:76px;border-radius:50%;display:grid;place-items:center;font-size:38px;color:#fff;background:#8E1B2E;box-shadow:0 0 0 6px #F5F1EF,0 0 0 8px #B58A2F}
      .contact{width:100%;padding:28px 34px;border-radius:24px;background:#8E1B2E;color:#fff;display:flex;justify-content:space-between;align-items:center}
      .wa{display:flex;align-items:center;gap:14px;font:700 36px/1 Figtree,sans-serif}
      .wa svg{width:42px;height:42px}
      .visit{font:500 24px/1.35 Figtree,sans-serif;color:#F4E7C6;text-align:right}`,
      `<div class="wrap">
        <img class="logo" src="${LOGO_ON_LIGHT}" alt="">
        <h2 class="serif">Nothing to pay until it’s in your room</h2>
        <ol class="steps">${STEPS.map((s, i) => `<li><span class="num serif">${i + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>
        <div class="contact"><p class="wa">${icon.chat}${esc(PHONE)}</p><p class="visit">Showroom in Burnley<br>by appointment</p></div>
      </div>`,
      'stone',
    )
  },
}

export const STYLES = { velvet, bold, editorial }
/** Posting order: the first range's post is velvet, the second bold, the third editorial, then round again. */
export const ROTATION = ['velvet', 'bold', 'editorial']
