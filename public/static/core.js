/* AegisAI — core helpers, i18n, preferences, data loading, risk engine, location, a11y */
(function () {
  const A = (window.Aegis = {})
  const I = window.AegisI18n
  A.t = (k, v) => I.t(k, v)

  // ---------------- utils ----------------
  A.$ = (s, r = document) => r.querySelector(s)
  A.$$ = (s, r = document) => [...r.querySelectorAll(s)]
  A.esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
  const { t, esc } = A
  A.fmtNum = n => (n == null ? '—' : Number(n).toLocaleString('en-IN'))
  A.fmtPop = n => n >= 1e7 ? (n / 1e7).toFixed(1) + ' Cr' : n >= 1e5 ? (n / 1e5).toFixed(1) + ' L' : A.fmtNum(n)
  A.ago = iso => {
    if (!iso) return ''
    const s = (Date.now() - new Date(iso).getTime()) / 1000
    if (s < 60) return t('ago.now')
    if (s < 3600) return t('ago.min', { n: Math.floor(s / 60) })
    if (s < 86400) return t('ago.hr', { n: Math.floor(s / 3600) })
    const d = Math.floor(s / 86400); return d === 1 ? t('ago.day1') : t('ago.days', { n: d })
  }
  A.locale = () => (I.lang === 'hi' ? 'hi-IN' : 'en-IN')
  A.timeIST = iso => new Date(iso).toLocaleString(A.locale(), { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
  A.clockIST = iso => new Date(iso).toLocaleTimeString(A.locale(), { timeZone: 'Asia/Kolkata', hour: 'numeric', minute: '2-digit' })
  A.dayKey = iso => new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  A.km = m => m < 1000 ? Math.round(m) + ' m' : (m / 1000).toFixed(m < 10000 ? 1 : 0) + ' km'
  A.mins = s => { const m = Math.round(s / 60); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' hr ' + (m % 60) + ' min' }
  A.haversine = (a, b, c, d) => { const R = 6371e3, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)) }
  A.api = async (path, opts) => { const r = await fetch(path, opts); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'Request failed'); return j }
  A.load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
  A.save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }

  // ---------------- screen-reader announcements + meaningful motion ----------------
  A.announce = (msg, urgent) => {
    const el = A.$(urgent ? '#sr-assertive' : '#sr-polite'); if (!el) return
    el.textContent = ''; setTimeout(() => (el.textContent = msg), 60)
  }
  A.flash = (el, cls = 'flash') => { if (!el || A.prefs.motion) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); setTimeout(() => el.classList.remove(cls), 1600) }
  A.toast = (msg, icon = 'fa-circle-info') => {
    const el = document.createElement('div'); el.className = 'toast'; el.setAttribute('role', 'status')
    el.innerHTML = `<i class="fa-solid ${icon}" aria-hidden="true"></i>${esc(msg)}`
    A.$('#toast-root').appendChild(el); setTimeout(() => el.remove(), 4200)
  }

  // ---------------- modal / sheet / full-screen (focus-trapped) ----------------
  let modalSeq = 0
  A.modal = (html, onMount, opts = {}) => {
    const root = A.$('#modal-root'), opener = document.activeElement, id = 'dlg-title-' + ++modalSeq
    const variant = opts.variant || 'dialog'
    root.innerHTML = `<div class="modal-backdrop v-${variant}"><div class="modal ${opts.className || ''}" role="dialog" aria-modal="true" aria-labelledby="${id}" tabindex="-1">
      ${opts.noClose ? '' : `<button class="modal-close" type="button" aria-label="${esc(opts.closeLabel || t('map.close'))}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`}${html}</div></div>`
    const dlg = A.$('.modal', root)
    const h = A.$('h1, h2', dlg); if (h) h.id = id
    document.body.classList.add('modal-open')
    const focusables = () => A.$$('a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])', dlg).filter(x => x.offsetParent !== null)
    const onKey = e => {
      if (e.key === 'Escape' && !opts.noEscape) { e.preventDefault(); close() }
      if (e.key === 'Tab') {
        const f = focusables(); if (!f.length) return
        const first = f[0], last = f[f.length - 1]
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
    }
    let closed = false
    function close() {
      if (closed) return; closed = true
      root.innerHTML = ''; document.removeEventListener('keydown', onKey); document.body.classList.remove('modal-open')
      opts.onClose && opts.onClose()
      if (opener && opener.focus && document.contains(opener)) opener.focus()
    }
    document.addEventListener('keydown', onKey)
    const btn = A.$('.modal-close', root); btn && (btn.onclick = close)
    A.$('.modal-backdrop', root).onclick = e => { if (e.target.classList.contains('modal-backdrop') && !opts.noBackdropClose) close() }
    onMount && onMount(dlg, close)
    setTimeout(() => { const f = opts.focus ? A.$(opts.focus, dlg) : null; (f || dlg).focus() }, 30)
    return close
  }
  A.sheet = (html, onMount, opts = {}) => A.modal(html, onMount, { ...opts, variant: 'sheet' })

  // ---------------- preferences (a11y + language) ----------------
  A.prefs = Object.assign({ lang: I.lang, large: false, contrast: false, motion: false }, A.load('aegis.prefs', {}))
  if (!A.load('aegis.prefs') && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) A.prefs.motion = true
  A.applyPrefs = () => {
    const h = document.documentElement
    h.classList.toggle('large-text', !!A.prefs.large)
    h.classList.toggle('high-contrast', !!A.prefs.contrast)
    h.classList.toggle('reduce-motion', !!A.prefs.motion)
    h.lang = A.prefs.lang === 'hi' ? 'hi' : 'en'
    I.lang = A.prefs.lang
  }
  A.setPref = (k, v) => {
    const langChanged = k === 'lang' && v !== A.prefs.lang
    A.prefs[k] = v; A.save('aegis.prefs', A.prefs); A.applyPrefs()
    if (langChanged) { A.translateChrome(); A.computeRisk(); A.updateLiveStrip(); A.rerender && A.rerender() }
  }
  A.applyPrefs()

  // Translate static page chrome (header, nav, footer) via data-i18n attributes
  A.translateChrome = () => {
    A.$$('[data-i18n]').forEach(el => (el.textContent = t(el.dataset.i18n)))
    A.$$('[data-i18n-label]').forEach(el => el.setAttribute('aria-label', t(el.dataset.i18nLabel)))
    A.$$('[data-i18n-title]').forEach(el => el.setAttribute('title', t(el.dataset.i18nTitle)))
    const l = A.store?.loc; const lab = A.$('#location-label'); if (lab) lab.textContent = l ? l.label : t('hdr.setloc')
  }

  A.openSettings = () => {
    const row = (k, title, sub, icon) => `<label class="setting-row"><span class="setting-icon"><i class="fa-solid ${icon}" aria-hidden="true"></i></span><span class="grow"><b>${title}</b><span>${sub}</span></span>
      <input type="checkbox" role="switch" class="switch" data-pref="${k}" ${A.prefs[k] ? 'checked' : ''} /></label>`
    A.sheet(`
      <h2>${t('set.title')}</h2>
      <div class="setting-group">
        <div class="side-section-title">${t('ob.lang')}</div>
        <div class="seg" role="radiogroup" aria-label="${t('ob.lang')}">${I.languages.map(([c, n]) => `<button type="button" role="radio" aria-checked="${A.prefs.lang === c}" data-lang="${c}" class="${A.prefs.lang === c ? 'active' : ''}" lang="${c}">${n}</button>`).join('')}</div>
      </div>
      <div class="setting-group">
        ${row('large', t('set.large'), t('set.largeS'), 'fa-text-height')}
        ${row('contrast', t('set.contrast'), t('set.contrastS'), 'fa-circle-half-stroke')}
        ${row('motion', t('set.motion'), t('set.motionS'), 'fa-person-walking')}
        ${A.notify?.supported() ? `<label class="setting-row"><span class="setting-icon"><i class="fa-solid fa-bell" aria-hidden="true"></i></span><span class="grow"><b>${t('set.notify')}</b><span>${t('set.notifyS')}</span></span><input type="checkbox" role="switch" class="switch" id="pref-notify" ${A.notify.enabled() ? 'checked' : ''} /></label>` : ''}
      </div>`, (m, close) => {
      A.$$('[data-pref]', m).forEach(cb => cb.onchange = () => A.setPref(cb.dataset.pref, cb.checked))
      A.$$('[data-lang]', m).forEach(b => b.onclick = () => { A.setPref('lang', b.dataset.lang); close(); A.openSettings() })
      const n = A.$('#pref-notify', m); n && (n.onchange = async () => { await A.notify.toggle(); n.checked = A.notify.enabled() })
    })
  }

  // ---------------- levels (IMD-style colour code + distinct icon + label) ----------------
  const LVL_ICON = ['fa-shield-heart', 'fa-eye', 'fa-triangle-exclamation', 'fa-person-running']
  const LVL_COLOR = [['#15803d', '#22c55e'], ['#a16207', '#facc15'], ['#c2410c', '#fb923c'], ['#b91c1c', '#ef4444']]
  A.LEVELS = [0, 1, 2, 3].map(i => ({
    get name() { return t('lvl' + i) }, get short() { return t('lvl' + i + 's') }, get advice() { return t('adv' + i) },
    icon: LVL_ICON[i], color: LVL_COLOR[i][0], fill: LVL_COLOR[i][1],
  }))
  A.lvlBadge = l => `<span class="lvl lvl-${l}"><i class="fa-solid ${LVL_ICON[l]}" aria-hidden="true"></i>${A.LEVELS[l].name}</span>`
  A.tType = ty => t('type.' + ty)
  A.tSev = s => t('sev.' + s)

  A.TYPE = {
    Flood: { icon: 'fa-water', color: '#2563eb', bg: '#e8efff' },
    'Heavy rain': { icon: 'fa-cloud-showers-heavy', color: '#0e7490', bg: '#e0f2f7' },
    Thunderstorm: { icon: 'fa-cloud-bolt', color: '#6d28d9', bg: '#efe9fd' },
    Cyclone: { icon: 'fa-hurricane', color: '#be185d', bg: '#fbe7f0' },
    Earthquake: { icon: 'fa-house-crack', color: '#92400e', bg: '#f7efe4' },
    Landslide: { icon: 'fa-hill-rockslide', color: '#78350f', bg: '#f5ede4' },
    Heatwave: { icon: 'fa-temperature-high', color: '#b91c1c', bg: '#fbeaea' },
    'Cold wave': { icon: 'fa-snowflake', color: '#0369a1', bg: '#e3f0fa' },
    Fog: { icon: 'fa-smog', color: '#475569', bg: '#eef1f5' },
    Tsunami: { icon: 'fa-water', color: '#0f766e', bg: '#e1f3f1' },
    Avalanche: { icon: 'fa-mountain', color: '#475569', bg: '#eef1f5' },
    'Strong wind': { icon: 'fa-wind', color: '#0f766e', bg: '#e1f3f1' },
    'Sea / coastal': { icon: 'fa-anchor', color: '#075985', bg: '#e3eef7' },
    Wildfire: { icon: 'fa-fire', color: '#c2410c', bg: '#fbede3' },
    Drought: { icon: 'fa-sun-plant-wilt', color: '#854d0e', bg: '#f7f1e1' },
    Volcano: { icon: 'fa-volcano', color: '#991b1b', bg: '#fbeaea' },
    Air: { icon: 'fa-lungs', color: '#475569', bg: '#eef1f5' },
    Weather: { icon: 'fa-cloud-sun-rain', color: '#475569', bg: '#eef1f5' },
  }
  A.typeIcon = ty => { const x = A.TYPE[ty] || A.TYPE.Weather; return `<span class="type-icon" style="background:${x.bg};color:${x.color}" aria-hidden="true"><i class="fa-solid ${x.icon}"></i></span>` }

  // WMO weather codes
  A.WX = c => {
    const L = I.lang === 'hi'
    if (c === 0) return [L ? 'साफ़ आसमान' : 'Clear sky', 'fa-sun', '#d97706']
    if (c <= 2) return [L ? 'आंशिक बादल' : 'Partly cloudy', 'fa-cloud-sun', '#d97706']
    if (c === 3) return [L ? 'बादल छाए' : 'Overcast', 'fa-cloud', '#64748b']
    if (c <= 48) return [L ? 'कोहरा' : 'Fog', 'fa-smog', '#94a3b8']
    if (c <= 57) return [L ? 'बूंदाबांदी' : 'Drizzle', 'fa-cloud-rain', '#0e7490']
    if (c <= 67) return [L ? 'बारिश' : 'Rain', 'fa-cloud-showers-heavy', '#2563eb']
    if (c <= 77) return [L ? 'बर्फ़' : 'Snow', 'fa-snowflake', '#0369a1']
    if (c <= 82) return [L ? 'बौछारें' : 'Rain showers', 'fa-cloud-sun-rain', '#2563eb']
    if (c <= 86) return [L ? 'बर्फ़ की बौछारें' : 'Snow showers', 'fa-snowflake', '#0369a1']
    return [L ? 'आंधी-तूफ़ान' : 'Thunderstorm', 'fa-cloud-bolt', '#6d28d9']
  }
  A.AQI = v => {
    const L = I.lang === 'hi'
    if (v == null) return { label: 'n/a', color: '#64748b', bg: '#eef1f5' }
    if (v <= 50) return { label: L ? 'अच्छी' : 'Good', color: '#15803d', bg: '#e8f5ec' }
    if (v <= 100) return { label: L ? 'मध्यम' : 'Moderate', color: '#854d0e', bg: '#f7f1e1' }
    if (v <= 150) return { label: L ? 'संवेदनशील के लिए अस्वस्थ' : 'Unhealthy for sensitive', color: '#c2410c', bg: '#fbede3' }
    if (v <= 200) return { label: L ? 'अस्वस्थ' : 'Unhealthy', color: '#b91c1c', bg: '#fbeaea' }
    if (v <= 300) return { label: L ? 'बहुत अस्वस्थ' : 'Very unhealthy', color: '#7e22ce', bg: '#f3e8ff' }
    return { label: L ? 'खतरनाक' : 'Hazardous', color: '#7f1d1d', bg: '#fde2e2' }
  }

  // ---------------- rich empty states ----------------
  A.emptyState = ({ icon = 'fa-circle-info', tone = 'neutral', title, sub, link, linkText, extra = '' }) => `
    <div class="empty-state tone-${tone}">
      <span class="empty-icon" aria-hidden="true"><i class="fa-solid ${icon}"></i></span>
      <div><b>${title}</b>${sub ? `<span>${sub}</span>` : ''}${link ? `<a href="${link}">${linkText} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a>` : ''}${extra}</div>
    </div>`

  // ---------------- global store ----------------
  A.store = { overview: null, states: [], stateByCode: {}, geo: null, risk: {}, config: {}, loc: null, lastError: null, fetchedAt: null, cap: {} }

  // ---------------- geo helpers ----------------
  function inRing(x, y, ring) {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1]
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
    }
    return inside
  }
  A.stateAt = (lat, lon) => {
    const g = A.store.geo; if (!g) return null
    for (const f of g.features) {
      const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates
      for (const p of polys) if (inRing(lon, lat, p[0])) {
        let code = f.properties.code
        if (code === 'JK' && lon >= 75.9 && lat >= 32.3) code = 'LA' // Ladakh UT (boundary file pre-dates 2019)
        return code
      }
    }
    let best = null, bd = 1e12
    for (const s of A.store.states) { const d = A.haversine(lat, lon, s.lat, s.lon); if (d < bd) { bd = d; best = s.code } }
    return bd < 150000 ? best : null
  }

  // ---------------- risk engine (transparent, rule-based) ----------------
  // Every reason keeps its kind/type so the UI can turn it into a concrete action.
  const SEV_LVL = { Extreme: 3, Severe: 2, Moderate: 1, Minor: 1 }
  A.computeRisk = () => {
    const o = A.store.overview; if (!o) return
    const alerts = o.alerts.ok ? o.alerts.data.items : []
    const quakes = o.quakes.ok ? o.quakes.data.items : []
    const gdacs = o.gdacs.ok ? o.gdacs.data.items : []
    const wx = o.weather.ok ? Object.fromEntries(o.weather.data.items.map(w => [w.code, w])) : {}
    const risk = {}
    for (const s of A.store.states) risk[s.code] = { level: 0, reasons: [], alerts: [], quakes: [], events: [], wx: wx[s.code] || null }
    const bump = (code, lvl, kind, type, text, ref) => {
      const r = risk[code]; if (!r) return
      if (lvl > r.level) r.level = lvl
      if (!r.reasons.some(x => x.text === text)) r.reasons.push({ lvl, kind, type, text, ref })
    }
    const tl = ty => A.tType(ty).toLowerCase()
    for (const a of alerts) for (const code of a.states) {
      if (!risk[code]) continue
      risk[code].alerts.push(a)
      const key = a.severity === 'Extreme' ? 'r.alertExtreme' : a.severity === 'Severe' ? 'r.alertSevere' : 'r.alert'
      bump(code, SEV_LVL[a.severity] || 1, 'alert', a.type, t(key, { type: tl(a.type) }), a.id)
    }
    const now = Date.now()
    for (const q of quakes) {
      const code = A.stateAt(q.lat, q.lon); q.state = code
      if (!code || !risk[code]) continue
      risk[code].quakes.push(q)
      const hrs = (now - new Date(q.time)) / 36e5, m = q.mag.toFixed(1)
      if (q.mag >= 6 && hrs < 72) bump(code, 3, 'quake', 'Earthquake', t('r.quakeStrong', { m }))
      else if (q.mag >= 5 && hrs < 72) bump(code, 2, 'quake', 'Earthquake', t('r.quake3d', { m }))
      else if (q.mag >= 4 && hrs < 24) bump(code, 1, 'quake', 'Earthquake', t('r.quakeToday', { m }))
    }
    for (const e of gdacs) {
      const code = A.stateAt(e.lat, e.lon); e.state = code
      if (!code || !risk[code]) continue
      risk[code].events.push(e)
      if (e.current) bump(code, e.level === 'Red' ? 3 : e.level === 'Orange' ? 2 : 1, 'gdacs', e.type, t('r.gdacs', { lvl: e.level, type: tl(e.type) }))
    }
    for (const [code, r] of Object.entries(risk)) {
      const w = r.wx; if (!w?.daily) continue
      const rain = w.daily.precipitation_sum?.[0] ?? 0, tmax = w.daily.temperature_2m_max?.[0] ?? 0, gust = w.daily.wind_gusts_10m_max?.[0] ?? 0, aqi = w.aqi?.us_aqi
      const v = x => Math.round(x)
      if (rain >= 115.6) bump(code, 3, 'rain', 'Heavy rain', t('r.rainVH', { v: v(rain) }))
      else if (rain >= 64.5) bump(code, 2, 'rain', 'Heavy rain', t('r.rainH', { v: v(rain) }))
      else if (rain >= 35) bump(code, 1, 'rain', 'Heavy rain', t('r.rainM', { v: v(rain) }))
      if (tmax >= 45) bump(code, 3, 'heat', 'Heatwave', t('r.heatS', { v: v(tmax) }))
      else if (tmax >= 40) bump(code, 2, 'heat', 'Heatwave', t('r.heat', { v: v(tmax) }))
      if (gust >= 90) bump(code, 3, 'wind', 'Strong wind', t('r.windD', { v: v(gust) }))
      else if (gust >= 62) bump(code, 2, 'wind', 'Strong wind', t('r.wind', { v: v(gust) }))
      if (aqi >= 300) bump(code, 3, 'aqi', 'Air', t('r.aqiH', { v: aqi }))
      else if (aqi >= 200) bump(code, 2, 'aqi', 'Air', t('r.aqiVU', { v: aqi }))
      else if (aqi >= 150) bump(code, 1, 'aqi', 'Air', t('r.aqiU', { v: aqi }))
    }
    // Highest level first; within a level, official alerts before derived signals
    const kindRank = { alert: 0, gdacs: 1, quake: 2, rain: 3, wind: 4, heat: 5, aqi: 6 }
    for (const r of Object.values(risk)) r.reasons.sort((a, b) => b.lvl - a.lvl || kindRank[a.kind] - kindRank[b.kind])
    A.store.risk = risk
  }

  // Turn a risk into one clear action line + the best guide topic
  const GUIDE_FOR = { Flood: 'flood', 'Heavy rain': 'flood', Thunderstorm: 'thunderstorm', 'Strong wind': 'thunderstorm', Cyclone: 'cyclone', 'Sea / coastal': 'cyclone',
    Earthquake: 'earthquake', Landslide: 'landslide', Avalanche: 'landslide', Heatwave: 'heatwave', 'Cold wave': 'coldwave', Fog: 'fog', Tsunami: 'tsunami', Air: 'air' }
  A.guideFor = type => GUIDE_FOR[type] || null
  A.actionFor = r => {
    if (!r || !r.level || !r.reasons.length) return { text: t('act.safe'), topic: null, reason: null }
    const top = r.reasons[0]
    const k = { quake: 'act.quake', rain: 'act.rain', heat: 'act.heat', wind: 'act.wind', aqi: 'act.aqi' }[top.kind]
    let text = k ? t(k) : I.has('act.' + top.type) ? t('act.' + top.type) : t('act.gdacs')
    return { text, topic: A.guideFor(top.type), reason: top }
  }
  A.todoFor = type => (I.has('todo.' + type) ? t('todo.' + type) : t('todo.Weather'))

  // ---------------- alert status + plain-language summary ----------------
  A.alertStatus = (a, d = A.store.cap[a.id]) => {
    const now = Date.now()
    if (d?.expires && new Date(d.expires).getTime() < now) return 'expired'
    if (d?.msgType === 'Update') return 'updated'
    if (a.published && now - new Date(a.published).getTime() < 6 * 36e5) return 'new'
    return 'active'
  }
  A.alertArea = (a, d = A.store.cap[a.id]) => {
    if (d?.area) { const parts = d.area.split(/,\s*/).filter(Boolean); return parts.length > 6 ? parts.slice(0, 6).join(', ') + ' +' + (parts.length - 6) : d.area }
    return A.stateNames(a.states).join(', ') || '—'
  }
  A.stateNames = codes => codes.map(c => A.store.stateByCode[c]?.name || c)
  A.plainSummary = (a, d = A.store.cap[a.id]) => {
    const area = d?.area ? A.alertArea(a, d) : (A.stateNames(a.states).slice(0, 3).join(', ') || (I.lang === 'hi' ? 'आपके क्षेत्र' : 'your area'))
    return t('plain.tpl', { sev: A.tSev(a.severity), type: A.tType(a.type).toLowerCase(), area })
  }
  // Fetch CAP details (expiry, area, msgType, instruction) in batches of 20
  A.fetchCap = async ids => {
    const need = ids.filter(id => !(id in A.store.cap))
    for (let i = 0; i < need.length; i += 20) {
      const batch = need.slice(i, i + 20)
      batch.forEach(id => (A.store.cap[id] = A.store.cap[id] ?? undefined))
      try { Object.assign(A.store.cap, await A.api('/api/alerts/details?ids=' + batch.join(','))) } catch { batch.forEach(id => delete A.store.cap[id]) }
    }
  }

  // ---------------- events ----------------
  // View handlers are cleared on every route change; "always" handlers persist (header, emergency, notify).
  const handlers = {}, always = {}
  A.on = (ev, fn) => (handlers[ev] = handlers[ev] || []).push(fn)
  A.onAlways = (ev, fn) => (always[ev] = always[ev] || []).push(fn)
  A.off = ev => { handlers[ev] = [] }
  A.emit = ev => [...(always[ev] || []), ...(handlers[ev] || [])].forEach(fn => { try { fn() } catch (e) { console.error(e) } })

  // ---------------- location + first-use onboarding ----------------
  A.setLocation = async (loc, quiet) => {
    loc.state = A.stateAt(loc.lat, loc.lon)
    A.store.loc = loc
    A.save('aegis.loc', loc); A.save('aegis.onboarded', 1)
    A.$('#location-label').textContent = loc.label || t('hdr.setloc')
    if (!quiet) {
      A.toast(t('ob.set', { l: loc.label }), 'fa-location-dot')
      const r = A.locRisk(); A.announce(t('loc.announce', { l: loc.label, lvl: A.LEVELS[r ? r.level : 0].name }))
      A.store.locChanged = true
    }
    A.emit('location')
  }
  A.clearLocation = () => { A.store.loc = null; localStorage.removeItem('aegis.loc'); A.save('aegis.onboarded', 1); A.$('#location-label').textContent = t('hdr.setloc'); A.emit('location') }
  A.locRisk = () => { const s = A.store.loc?.state; return s ? A.store.risk[s] : null }
  A.getPosition = (opts = {}) => new Promise((res, rej) => {
    if (!navigator.geolocation) return rej(new Error(t('ob.gpsErr')))
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }),
      e => rej(new Error(e.code === 1 ? t('ob.denied') : t('ob.gpsErr'))), { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000, ...opts })
  })
  A.useGPS = async () => {
    const p = await A.getPosition()
    let label = I.lang === 'hi' ? 'मेरी लोकेशन' : 'My location'
    try { const r = await A.api(`/api/reverse?lat=${p.lat}&lon=${p.lon}`); label = r.label || label } catch {}
    await A.setLocation({ lat: p.lat, lon: p.lon, label, source: 'gps' })
  }
  A.openLocationPicker = (opts = {}) => {
    const first = !!opts.first
    const st = A.store.states.slice().sort((a, b) => a.name.localeCompare(b.name))
    A.modal(`
      ${first ? `<div class="ob-brand"><span class="brand-mark" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></span><div><h2>${t('ob.title')}</h2><p class="muted">${t('ob.sub')}</p></div></div>
        <div class="seg ob-lang" role="radiogroup" aria-label="${t('ob.lang')}">${I.languages.map(([c, n]) => `<button type="button" role="radio" aria-checked="${A.prefs.lang === c}" data-lang="${c}" class="${A.prefs.lang === c ? 'active' : ''}" lang="${c}">${n}</button>`).join('')}</div>
        <h3 class="ob-q">${t('ob.q')}</h3>` : `<h2>${t('ob.change')}</h2>`}
      <div class="loc-options">
        <button class="btn btn-primary btn-lg btn-block" id="loc-gps" type="button"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>${t('ob.gps')}</button>
        <div class="or-sep"><span>${t('ob.or')}</span></div>
        <div class="map-search">
          <label class="search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">${t('ob.search')}</span><input id="loc-q" placeholder="${t('ob.search')}" autocomplete="off" inputmode="search" /></label>
          <div class="suggestions" id="loc-sugg" hidden></div>
        </div>
        <p class="privacy-note"><i class="fa-solid fa-lock" aria-hidden="true"></i>${t('ob.privacy')}</p>
        <details class="state-picker"><summary>${t('ob.state')}</summary>
          <div class="loc-state-grid">${st.map(s => `<button type="button" data-code="${s.code}">${esc(s.name)}</button>`).join('')}</div></details>
        ${first ? `<button class="btn btn-ghost btn-block" id="loc-skip" type="button">${t('ob.skip')}</button>` : ''}
      </div>`, (m, close) => {
      A.$$('[data-lang]', m).forEach(b => b.onclick = () => { A.setPref('lang', b.dataset.lang); close(); A.openLocationPicker(opts) })
      A.$('#loc-gps', m).onclick = async e => {
        const b = e.currentTarget; b.disabled = true; b.innerHTML = `<span class="spinner light"></span> ${t('ob.finding')}`
        try { await A.useGPS(); close() } catch (err) { A.toast(err.message, 'fa-triangle-exclamation'); b.disabled = false; b.innerHTML = `<i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>${t('ob.gps')}`; A.$('#loc-q', m).focus() }
      }
      A.$$('.loc-state-grid button', m).forEach(b => b.onclick = () => { const s = A.store.stateByCode[b.dataset.code]; A.setLocation({ lat: s.lat, lon: s.lon, label: `${s.capital}, ${s.name}`, source: 'state' }); close() })
      A.attachGeocoder(A.$('#loc-q', m), A.$('#loc-sugg', m), r => { A.setLocation({ lat: r.lat, lon: r.lon, label: r.short + (r.state ? ', ' + r.state : ''), source: 'search' }); close() })
      const sk = A.$('#loc-skip', m); sk && (sk.onclick = () => { A.save('aegis.onboarded', 1); close() })
    }, { className: first ? 'onboarding' : '', noBackdropClose: first, focus: first ? '#loc-gps' : '#loc-q', onClose: () => first && A.save('aegis.onboarded', 1) })
  }
  A.attachGeocoder = (input, box, onPick) => {
    let tm, last = [], idx = -1
    input.setAttribute('role', 'combobox'); input.setAttribute('aria-autocomplete', 'list'); input.setAttribute('aria-expanded', 'false')
    box.setAttribute('role', 'listbox'); box.id = box.id || 'sugg-' + Math.random().toString(36).slice(2); input.setAttribute('aria-controls', box.id)
    const show = v => { box.hidden = !v; input.setAttribute('aria-expanded', String(!!v)) }
    input.addEventListener('input', () => {
      clearTimeout(tm)
      const q = input.value.trim()
      if (q.length < 3) { show(false); return }
      tm = setTimeout(async () => {
        show(true); box.innerHTML = `<button type="button" disabled><span class="spinner"></span> ${t('ob.searching')}</button>`
        try {
          last = await A.api('/api/geocode?q=' + encodeURIComponent(q)); idx = -1
          box.innerHTML = last.length ? last.map((r, i) => `<button type="button" role="option" data-i="${i}"><b>${esc(r.short)}</b><small>${esc(r.name)}</small></button>`).join('') : `<button type="button" disabled>${t('ob.noPlaces')}</button>`
          A.$$('button[data-i]', box).forEach(b => b.onclick = () => { show(false); input.value = last[b.dataset.i].short; onPick(last[b.dataset.i]) })
        } catch { box.innerHTML = `<button type="button" disabled>${t('ob.searchErr')}</button>` }
      }, /^\d{6}$/.test(q) ? 50 : 350)
    })
    input.addEventListener('keydown', e => {
      const opts = A.$$('button[data-i]', box)
      if (e.key === 'ArrowDown' && opts.length) { e.preventDefault(); idx = (idx + 1) % opts.length; opts[idx].focus() }
      if (e.key === 'Enter' && last[0]) { e.preventDefault(); show(false); onPick(last[Math.max(0, idx)]) }
    })
    box.addEventListener('keydown', e => {
      const opts = A.$$('button[data-i]', box); const i = opts.indexOf(document.activeElement)
      if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length]?.focus() }
      if (e.key === 'ArrowUp') { e.preventDefault(); i <= 0 ? input.focus() : opts[i - 1].focus() }
      if (e.key === 'Escape') { show(false); input.focus() }
    })
    document.addEventListener('click', e => { if (!box.contains(e.target) && e.target !== input) show(false) })
  }

  // ---------------- data loading ----------------
  A.loadOverview = async () => {
    const prevLvl = A.locRisk()?.level ?? null
    const prevIds = new Set(A.alertsAll ? A.alertsAll().map(a => a.id) : [])
    try {
      A.store.overview = await A.api('/api/overview')
      A.store.fetchedAt = new Date().toISOString()
      A.save('aegis.lastOk', A.store.fetchedAt)
      A.computeRisk()
      A.store.lastError = null
      // remember which alerts appeared in this refresh (for "new" motion)
      A.store.freshIds = prevIds.size ? new Set(A.alertsAll().map(a => a.id).filter(id => !prevIds.has(id))) : new Set()
      const r = A.locRisk(), lvl = r?.level ?? null
      if (prevLvl != null && lvl != null && lvl > prevLvl) {
        A.store.escalated = true
        A.announce(t('esc.announce', { lvl: A.LEVELS[lvl].name, s: A.store.stateByCode[A.store.loc.state]?.name || '' }), true)
      }
    } catch (e) { A.store.lastError = e.message }
    A.updateLiveStrip()
    A.emit('data')
  }
  A.isOffline = () => navigator.onLine === false
  A.sourceStatus = () => {
    const o = A.store.overview; if (!o) return []
    return ['alerts', 'quakes', 'gdacs', 'weather'].map(k => {
      const s = o[k] || {}
      return { key: k, name: t('fresh.src.' + k), by: t('fresh.src.' + k + '.by'), state: !s.ok ? 'down' : s.stale ? 'stale' : 'live', updated: s.data?.updated || null, ttl: s.ttl || 300 }
    })
  }
  A.updateLiveStrip = () => {
    const o = A.store.overview, pill = A.$('#live-pill'); if (!pill) return
    const dot = A.$('.live-dot', pill), txt = A.$('#live-text')
    if (!o) {
      dot.className = 'live-dot ' + (A.store.lastError ? 'err' : 'wait')
      txt.textContent = A.store.lastError ? t('live.unavailable') : t('live.connecting'); return
    }
    const src = A.sourceStatus(), bad = src.filter(s => s.state !== 'live')
    const offline = A.isOffline() || (A.store.lastError && A.store.fetchedAt)
    dot.className = 'live-dot ' + (offline ? 'off' : bad.length ? 'warn' : 'ok')
    const nA = o.alerts.ok ? o.alerts.data.items.length : 0
    txt.innerHTML = `<b>${t('live.alerts', { n: nA })}</b><span class="sep">·</span>${offline ? t('live.offline') : bad.length ? t('live.delayed') : t('live.updated', { t: A.ago(A.store.fetchedAt || o.generated) })}`
    pill.setAttribute('aria-label', `${t('live.alerts', { n: nA })}. ${offline ? t('live.offline') : t('live.updated', { t: A.ago(A.store.fetchedAt || o.generated) })}. ${t('fresh.title')}`)
    const navCount = A.$('#nav-alert-count'), mine = A.locRisk()?.alerts.length || 0
    navCount.textContent = mine ? String(mine) : ''
  }
  A.freshnessHTML = (compact) => {
    const o = A.store.overview
    if (!o) return `<p class="muted">${t('live.connecting')}</p>`
    const src = A.sourceStatus(), offline = A.isOffline()
    const nA = o.alerts.ok ? o.alerts.data.items.length : 0, nQ = o.quakes.ok ? o.quakes.data.items.length : 0
    const nS = Object.values(A.store.risk).filter(r => r.level >= 2).length
    const icon = { live: 'fa-circle-check', stale: 'fa-clock-rotate-left', down: 'fa-circle-xmark' }
    return `
      ${offline ? `<div class="notice info"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i><span>${t('fresh.offline')}</span></div>` : ''}
      ${compact ? '' : `<p class="muted small fresh-counts">${t('fresh.counts', { a: nA, s: nS, q: nQ })}</p>`}
      <ul class="fresh-list">${src.map(s => `
        <li class="fresh-${s.state}">
          <i class="fa-solid ${icon[s.state]}" aria-hidden="true"></i>
          <span class="grow"><b>${s.name}</b><span>${esc(s.by)}${compact ? '' : ' · ' + t('fresh.every', { m: Math.max(1, Math.round(s.ttl / 60)) })}</span>
            ${s.state === 'stale' ? `<em>${t('fresh.fallback')}</em>` : s.state === 'down' ? `<em>${t('fresh.downNote')}</em>` : ''}</span>
          <span class="fresh-time"><span class="fresh-tag">${t('fresh.' + s.state)}</span>${s.updated ? `<small>${A.ago(s.updated)}</small>` : ''}</span>
        </li>`).join('')}</ul>`
  }
  A.openFreshness = () => A.sheet(`
    <h2>${t('fresh.title')}</h2><p class="muted" style="margin:4px 0 14px">${t('fresh.sub')}</p>
    <div id="fresh-body">${A.freshnessHTML()}</div>
    <button class="btn btn-light btn-block" id="fresh-refresh" type="button" style="margin-top:14px"><i class="fa-solid fa-rotate" aria-hidden="true"></i>${t('fresh.refresh')}</button>`, m => {
    A.$('#fresh-refresh', m).onclick = async e => { e.currentTarget.innerHTML = '<span class="spinner"></span>'; await A.loadOverview(); A.$('#fresh-body', m) && (A.$('#fresh-body', m).innerHTML = A.freshnessHTML()); e.currentTarget.innerHTML = `<i class="fa-solid fa-rotate" aria-hidden="true"></i>${t('fresh.refresh')}` }
  })

  A.init = async () => {
    const [states, geo, config] = await Promise.all([
      A.api('/api/states'), fetch('/static/geo/india-states.json').then(r => r.json()), A.api('/api/config').catch(() => ({})),
    ])
    A.store.states = states
    A.store.stateByCode = Object.fromEntries(states.map(s => [s.code, s]))
    A.store.geo = geo
    A.store.config = config
    const saved = A.load('aegis.loc', null)
    if (saved) await A.setLocation(saved, true)
    A.store.ready = true
    A.$('#location-chip').onclick = () => A.openLocationPicker()
    A.$('#live-pill').onclick = A.openFreshness
    A.$('#settings-btn').onclick = A.openSettings
    A.translateChrome()
    if (!saved && !A.load('aegis.onboarded', 0)) setTimeout(() => A.openLocationPicker({ first: true }), 200)
    await A.loadOverview()
    setInterval(A.loadOverview, 180000)
    setInterval(A.updateLiveStrip, 30000)
    window.addEventListener('online', A.updateLiveStrip); window.addEventListener('offline', A.updateLiveStrip)
  }

  // ---------------- Google Maps helpers ----------------
  A.google = {
    key: () => A.store.config.googleMapsKey,
    place: (lat, lon, zoom = 13, q) => {
      const k = A.google.key()
      if (k) return q ? `https://www.google.com/maps/embed/v1/search?key=${k}&q=${encodeURIComponent(q)}&center=${lat},${lon}&zoom=${zoom}` : `https://www.google.com/maps/embed/v1/view?key=${k}&center=${lat},${lon}&zoom=${zoom}`
      return `https://maps.google.com/maps?q=${q ? encodeURIComponent(q) + '&sll=' + lat + ',' + lon : lat + ',' + lon}&ll=${lat},${lon}&z=${zoom}&output=embed`
    },
    directions: (from, to, mode = 'driving') => {
      const k = A.google.key()
      if (k) return `https://www.google.com/maps/embed/v1/directions?key=${k}&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&mode=${mode}`
      return `https://maps.google.com/maps?saddr=${from.lat},${from.lon}&daddr=${to.lat},${to.lon}&dirflg=${mode === 'walking' ? 'w' : 'd'}&output=embed`
    },
    navigate: (from, to, mode = 'driving') => `https://www.google.com/maps/dir/?api=1${from ? `&origin=${from.lat},${from.lon}` : ''}&destination=${to.lat},${to.lon}&travelmode=${mode}&dir_action=navigate`,
    open: (lat, lon) => `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`,
    search: (q, lat, lon) => `https://www.google.com/maps/search/${encodeURIComponent(q)}/@${lat},${lon},14z`,
  }

  // ---------------- Leaflet helpers ----------------
  A.maps = []
  A.newMap = (el, opts = {}) => {
    const m = L.map(el, { zoomControl: opts.zoomControl ?? true, attributionControl: true, scrollWheelZoom: opts.scroll ?? true, ...opts })
    const street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' })
    street.addTo(m)
    m._baseLayers = {
      Streets: street,
      Satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, attribution: 'Imagery © Esri' }),
      Terrain: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, attribution: '© OpenTopoMap (CC-BY-SA)' }),
    }
    A.maps.push(m)
    return m
  }
  A.destroyMaps = () => { A.maps.forEach(m => { try { m.remove() } catch {} }); A.maps = [] }
  A.cluster = (opts = {}) => (L.markerClusterGroup ? L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 45, spiderfyOnMaxZoom: true, ...opts }) : L.layerGroup())
  A.meIcon = () => L.divIcon({ className: '', html: '<div class="me-marker"></div>', iconSize: [18, 18], iconAnchor: [9, 9] })
  A.poiIcon = (color, icon) => L.divIcon({ className: '', html: `<div class="poi-marker" style="background:${color}"><i class="fa-solid ${icon}"></i></div>`, iconSize: [30, 30], iconAnchor: [15, 30], popupAnchor: [0, -28] })
  A.quakeColor = m => (m >= 6 ? '#7f1d1d' : m >= 5 ? '#b91c1c' : m >= 4 ? '#c2410c' : '#a16207')
  A.quakeIcon = q => { const s = Math.round(18 + (q.mag - 2.5) * 7); return L.divIcon({ className: '', html: `<div class="quake-marker" style="width:${s}px;height:${s}px;background:${A.quakeColor(q.mag)}">${q.mag >= 4 ? q.mag.toFixed(1) : ''}</div>`, iconSize: [s, s], iconAnchor: [s / 2, s / 2] }) }
  A.stateLayer = (onClick) => L.geoJSON(A.store.geo, {
    style: f => { const r = A.store.risk[f.properties.code]; const l = r ? r.level : 0; return { color: '#fff', weight: 1, fillColor: A.LEVELS[l].fill, fillOpacity: l === 0 ? 0.3 : 0.6, dashArray: l === 3 ? '4 3' : null } },
    onEachFeature: (f, layer) => {
      const s = A.store.stateByCode[f.properties.code], r = A.store.risk[f.properties.code]
      if (!s) return
      layer.bindTooltip(`<b>${esc(s.name)}</b><br>${A.lvlBadge(r?.level || 0)}${r?.alerts.length ? ' · ' + r.alerts.length + ' ' + t('states.alerts') : ''}`, { sticky: true })
      layer.on('mouseover', () => layer.setStyle({ weight: 2.5, color: '#0f172a' }))
      layer.on('mouseout', () => layer.setStyle({ weight: 1, color: '#fff' }))
      layer.on('click', () => onClick && onClick(f.properties.code, layer))
    },
  })
})()
