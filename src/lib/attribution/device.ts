// A visit's device in a few words ("iPhone, Instagram app"), so staff can ask
// a caller "were you on your iPhone, in Instagram?" and pick the right visit.
// Only this label is kept; the browser's full user-agent string never is.

function deviceOf(ua: string): string | null {
  if (/iPhone/i.test(ua)) return 'iPhone'
  if (/iPad/i.test(ua)) return 'iPad'
  if (/Android/i.test(ua)) {
    if (/SM-[A-Z]|Samsung/i.test(ua)) return 'Samsung'
    if (/Pixel/i.test(ua)) return 'Google Pixel'
    return 'Android'
  }
  if (/CrOS/.test(ua)) return 'Chromebook'
  if (/Windows/i.test(ua)) return 'Windows computer'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'Mac'
  if (/Linux/i.test(ua)) return 'Linux computer'
  return null
}

function appOf(ua: string): string | null {
  // In-app browsers first: they also say Safari or Chrome.
  if (/Instagram/i.test(ua)) return 'Instagram app'
  if (/Barcelona|Threads/i.test(ua)) return 'Threads app'
  if (/FBAN\/Messenger|MessengerForiOS|FB_IAB\/MESSENGER/i.test(ua)) return 'Messenger'
  if (/FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)) return 'Facebook app'
  if (/TikTok|musical_ly|BytedanceWebview/i.test(ua)) return 'TikTok app'
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet'
  if (/EdgA?\/|EdgiOS/i.test(ua)) return 'Edge'
  if (/FxiOS|Firefox\//i.test(ua)) return 'Firefox'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/CriOS|Chrome\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua)) return 'Safari'
  return null
}

/** "iPhone, Instagram app", "Samsung, Chrome", "Windows computer, Edge"; null when unknown. */
export function deviceLabel(userAgent: string | null | undefined): string | null {
  const ua = (userAgent ?? '').slice(0, 1000)
  if (!ua) return null
  const label = [deviceOf(ua), appOf(ua)].filter(Boolean).join(', ')
  return label ? label.slice(0, 60) : null
}
