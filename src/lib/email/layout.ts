// The look every Heartwell email shares: a wine header with the gold name, a
// white card on stone, Arial body text and pill buttons. Plain, table-based
// HTML with inline styles, so it reads well in Gmail, Outlook and phone apps.

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

export const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

export const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? name

export const C = { velvet: '#8E1B2E', wine: '#4A0D17', gold: '#E9CC7B', ink: '#22171A', slate: '#5E4F52', line: '#E5DADB', stone: '#F5F1EF' }
export const FONT = "font-family:Arial,'Helvetica Neue',Helvetica,sans-serif"
/** WhatsApp's own green, for the shop's "message them" buttons. */
export const WHATSAPP_GREEN = '#1F8F4A'

export function layout(title: string, body: string, preheader: string): string {
  return `<!doctype html><html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:${C.stone}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.stone}"><tr><td align="center" style="padding:16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:${C.wine};padding:18px 24px;border-bottom:3px solid #B58A2F"><span style="font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;color:${C.gold}">Heartwell</span></td></tr>
<tr><td style="padding:24px;${FONT};font-size:16px;line-height:1.5;color:${C.ink}">${body}</td></tr>
</table></td></tr></table></body></html>`
}

export const p = (html: string, extra = '') => `<p style="margin:0 0 14px;${extra}">${html}</p>`
export const h = (text: string) => `<h1 style="margin:0 0 14px;font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.25;color:${C.ink}">${escapeHtml(text)}</h1>`
export const button = (href: string, label: string, colour = C.velvet) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:6px 0 18px"><tr><td style="border-radius:999px;background:${colour}"><a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;${FONT};font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;border-radius:999px">${escapeHtml(label)}</a></td></tr></table>`
export const link = (href: string, label: string) => `<a href="${escapeHtml(href)}" style="color:${C.velvet}">${escapeHtml(label)}</a>`
/** Text the shop can copy, in a grey box. */
export const pre = (text: string) => `<pre style="margin:0 0 18px;padding:12px;background:${C.stone};border-radius:8px;font-size:13px;line-height:1.5;white-space:pre-wrap">${escapeHtml(text)}</pre>`
