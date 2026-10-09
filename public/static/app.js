/* AegisAI — router + Home, Alerts (timeline), States views */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A
  A.views = A.views || {}
  const main = () => $('#main')
  const SEV = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }
  const sevIcon = { Extreme: 'fa-person-running', Severe: 'fa-triangle-exclamation', Moderate: 'fa-eye', Minor: 'fa-circle-info' }

  // ---------------- shared bits ----------------
  A.alertsAll = () => (A.store.overview?.alerts.ok ? A.store.overview.alerts.data.items : [])
  A.quakesAll = () => (A.store.overview?.quakes.ok ? A.store.overview.quakes.data.items : [])
  A.sevBadge = s => `<span class="sev sev-${s}"><i class="fa-solid ${sevIcon[s] || 'fa-circle-info'}" aria-hidden="true"></i>${A.tSev(s)}</span>`
  A.alertCard = a => `
    <button type="button" class="alert-card s-${a.severity} ${A.store.freshIds?.has(a.id) ? 'is-fresh' : ''}" data-alert="${esc(a.id)}">
      <div class="row"><span class="type-tag">${A.typeIcon(a.type)}${esc(A.tType(a.type))}</span>${A.sevBadge(a.severity)}</div>
      <h3>${esc(a.title.length > 200 ? a.title.slice(0, 200) + '…' : a.title)}</h3>
      <div class="meta"><span><i class="fa-regular fa-building" aria-hidden="true"></i> ${esc(a.sender)}</span><span><i class="fa-regular fa-clock" aria-hidden="true"></i> ${A.ago(a.published)}</span>${a.states.length ? `<span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(A.stateNames(a.states).slice(0, 2).join(', '))}</span>` : ''}</div>
    </button>`
  A.bindAlertCards = root => $$('[data-alert]', root).forEach(b => b.onclick = () => A.openAlert(b.dataset.alert))
  A.skeletonRows = (n = 4, h = 54) => Array.from({ length: n }, () => `<div class="skeleton" style="height:${h}px;margin-bottom:10px" aria-hidden="true"></div>`).join('')
  A.quakeRow = q => `
    <a class="list-row" href="${esc(q.url)}" target="_blank" rel="noopener">
      <span class="mag" style="background:${A.quakeColor(q.mag)}1a;color:${A.quakeColor(q.mag)}" aria-label="Magnitude ${q.mag.toFixed(1)}">${q.mag.toFixed(1)}</span>
      <span class="grow"><span class="title">${esc(q.place)}</span><span class="meta">${A.ago(q.time)} · ${Math.round(q.depth)} km${q.state ? ' · ' + esc(A.store.stateByCode[q.state]?.name || '') : ''}</span></span>
      <i class="fa-solid fa-arrow-up-right-from-square muted small" aria-hidden="true"></i>
    </a>`
  const noWarnEmpty = (place) => A.emptyState({ icon: 'fa-shield-heart', tone: 'safe', title: t('empty.noWarn', { s: esc(place) }), sub: A.store.fetchedAt ? t('empty.lastChecked', { t: A.ago(A.store.fetchedAt) }) : '', link: '#/guide', linkText: t('empty.prep') })

  // ---------------- alert detail modal ----------------
  A.openAlert = id => {
    const a = A.alertsAll().find(x => x.id === id)
    if (!a) return
    const d0 = A.store.cap[id]
    A.modal(`
      <span class="eyebrow">${esc(a.source)}</span>
      <h2 style="margin-top:6px">${A.typeIcon(a.type)} <span style="vertical-align:middle">${esc(A.plainSummary(a, d0))}</span></h2>
      <div class="todo-box"><b><i class="fa-solid fa-person-running" aria-hidden="true"></i> ${t('tl.whatDo')}</b><p>${esc(A.todoFor(a.type))}</p></div>
      <details class="official" ${a.english ? 'open' : ''}><summary>${t('tl.official')}</summary><p lang="${a.english ? 'en' : ''}">${esc(a.title)}</p></details>
      <div id="alert-detail"><div class="skeleton" style="height:120px;margin-top:14px"></div></div>
      <div class="modal-actions">
        ${!a.english ? `<a class="btn btn-light btn-sm" href="${A.translateUrl(a.title)}" target="_blank" rel="noopener"><i class="fa-solid fa-language" aria-hidden="true"></i>${t('tl.translate')}</a>` : ''}
        <a class="btn btn-light btn-sm" href="${esc(a.link)}" target="_blank" rel="noopener"><i class="fa-solid fa-file-code" aria-hidden="true"></i>${t('al.cap')}</a>
        ${A.guideFor(a.type) ? `<a class="btn btn-primary btn-sm" href="#/guide/${A.guideFor(a.type)}"><i class="fa-solid fa-list-check" aria-hidden="true"></i>${t('btn.guide')}</a>` : ''}
        <a class="btn btn-light btn-sm" href="#/help"><i class="fa-solid fa-hand-holding-medical" aria-hidden="true"></i>${t('al.help')}</a>
      </div>`, async (m, close) => {
      $$('a[href^="#"]', m).forEach(x => x.addEventListener('click', close))
      const box = $('#alert-detail', m)
      try {
        const d = await A.api('/api/alert/' + encodeURIComponent(id))
        A.store.cap[id] = d
        const st = A.alertStatus(a, d)
        box.innerHTML = `
          <div class="detail-grid">
            <div><span>${t('tl.area')}</span><b>${esc(A.alertArea(a, d))}</b></div>
            <div><span>${st === 'expired' ? t('tl.ended') : t('tl.until')}</span><b>${d.expires ? A.timeIST(d.expires) : '—'} ${statusTag(st)}</b></div>
            <div><span>${t('al.from')}</span><b>${d.effective ? A.timeIST(d.effective) : '—'}</b></div>
            <div><span>${t('al.urgency')}</span><b>${esc(d.urgency || '—')} · ${A.sevBadge(a.severity)}</b></div>
            <div style="grid-column:1/-1"><span>${t('tl.issuedBy')}</span><b>${esc(d.sender || a.sender)}</b></div>
          </div>
          ${d.description && d.description !== d.headline && d.description !== a.title ? `<p class="muted" style="margin-top:12px">${esc(d.description)}</p>` : ''}
          ${d.instruction ? `<div class="instruction"><i class="fa-solid fa-bullhorn" style="margin-top:3px" aria-hidden="true"></i><div><b>${t('al.instr')}</b><br>${esc(d.instruction)}</div></div>` : ''}
          ${d.polygons?.length ? `<div class="modal-map" id="alert-map" role="img" aria-label="${t('tl.area')}"></div>` : ''}`
        if (d.polygons?.length && window.L) {
          const map = A.newMap($('#alert-map', m), { scroll: false })
          const g = L.featureGroup(d.polygons.map(p => L.polygon(p, { color: A.LEVELS[2].color, weight: 2, fillOpacity: 0.25 }))).addTo(map)
          if (A.store.loc) L.marker([A.store.loc.lat, A.store.loc.lon], { icon: A.meIcon() }).addTo(map).bindTooltip('You')
          map.fitBounds(g.getBounds(), { padding: [20, 20] })
        }
      } catch { box.innerHTML = `<div class="notice" style="margin-top:14px"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>${t('al.unavail')}</div>` }
    })
  }
  const statusTag = st => `<span class="tl-status st-${st}">${t('tl.' + st)}</span>`

  // ======================= HOME =======================
  A.views.home = () => {
    main().innerHTML = `
      <div class="page">
        <section class="hero" id="hero-section">
          <div id="status-card" class="status-card loading" aria-live="polite"></div>
          <div class="card weather-card" id="weather-card">${A.skeletonRows(4, 46)}</div>
        </section>
        <nav class="quick-actions" aria-label="Quick actions">
          <a class="qa" href="#/help"><span class="qa-icon" style="background:#fbeaea;color:#b91c1c" aria-hidden="true"><i class="fa-solid fa-truck-medical"></i></span><span><b>${t('qa.help')}</b><span>${t('qa.help.s')}</span></span></a>
          <a class="qa" href="#/alerts"><span class="qa-icon" style="background:#e8efff;color:#1d4ed8" aria-hidden="true"><i class="fa-solid fa-timeline"></i></span><span><b>${t('qa.alerts')}</b><span>${t('qa.alerts.s')}</span></span></a>
          <a class="qa" href="#/map"><span class="qa-icon" style="background:#eef1f5;color:#334155" aria-hidden="true"><i class="fa-solid fa-map-location-dot"></i></span><span><b>${t('qa.map')}</b><span>${t('qa.map.s')}</span></span></a>
          <a class="qa" href="#/plan"><span class="qa-icon" style="background:#e8f5ec;color:#15803d" aria-hidden="true"><i class="fa-solid fa-clipboard-list"></i></span><span><b>${t('qa.plan')}</b><span>${t('qa.plan.s')}</span></span></a>
        </nav>
        <section class="section home-grid">
          <div class="card" id="my-alerts-section"><div class="card-head"><h2 id="my-alerts-title">${t('home.latest')}</h2><span class="head-actions">${A.notify ? A.notify.button() : ''}<a href="#/alerts">${t('home.allAlerts')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></span></div><div id="my-alerts">${A.skeletonRows(2, 90)}</div></div>
          <aside class="card fresh-card" id="fresh-card" aria-labelledby="fresh-h"><div class="card-head"><h2 id="fresh-h"><i class="fa-solid fa-satellite-dish" aria-hidden="true"></i> ${t('fresh.title')}</h2><button class="link-btn" type="button" id="fresh-more">${t('status.why')}?</button></div><div id="fresh-body"></div></aside>
        </section>
        <section class="section india-grid" id="india-overview">
          <div class="card"><div class="card-head"><h2>${t('home.india')}</h2><a href="#/map">${t('home.openMap')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div>
            <div class="mini-map" id="home-map" role="img" aria-label="${t('home.india')}"></div>
            <div class="legend">${A.LEVELS.map((l, i) => `<span>${A.lvlBadge(i)}</span>`).join('')}</div>
          </div>
          <div class="card"><div class="card-head"><h2>${t('home.attention')}</h2><a href="#/states">${t('home.allStates')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div>
            <div class="level-counts" id="level-counts"></div>
            <div class="list" id="top-states">${A.skeletonRows(5, 44)}</div>
          </div>
        </section>
        <section class="section card" id="recent-quakes"><div class="card-head"><h2>${t('home.quakes')}</h2><span class="muted small">${t('home.quakesSrc')}</span></div><div class="list" id="quake-list">${A.skeletonRows(3, 44)}</div></section>
      </div>`
    $('#fresh-more').onclick = A.openFreshness
    let map
    const renderMap = () => {
      if (!A.store.geo || !window.L || !$('#home-map')) return
      if (!map) { map = A.newMap('home-map', { scroll: false, zoomSnap: 0.25 }); map.setView([22.5, 82], 4.25) }
      map._stateLayer && map.removeLayer(map._stateLayer)
      if (A.store.overview) map._stateLayer = A.stateLayer(code => (location.hash = '#/states/' + code)).addTo(map)
      map._me && map.removeLayer(map._me)
      if (A.store.loc) map._me = L.marker([A.store.loc.lat, A.store.loc.lon], { icon: A.meIcon() }).addTo(map).bindTooltip('You')
    }
    const render = () => { renderStatus(); renderWeather(); renderLists(); renderMap(); $('#fresh-body') && ($('#fresh-body').innerHTML = A.freshnessHTML(true)); A.notify && A.notify.refreshButtons() }
    A.on('data', render); A.on('location', render)
    render()
  }

  // ---- status card: one clear action + one primary button ----
  function renderStatus() {
    const el = $('#status-card'); if (!el) return
    const loc = A.store.loc, o = A.store.overview
    if (!loc) {
      el.className = 'status-card no-loc'
      el.innerHTML = `
        <div class="status-label"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${t('status.title')}</div>
        <div class="status-action">${t('status.noLoc')}</div>
        <p class="status-reason">${t('status.noLocSub')}</p>
        <div class="status-todo"><button class="btn btn-white btn-lg" id="status-primary" type="button"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>${t('status.btnLoc')}</button></div>`
      $('#status-primary').onclick = () => A.openLocationPicker({ first: true })
      return
    }
    if (!o) {
      el.className = 'status-card loading'
      el.innerHTML = `<div class="status-top"><button class="status-place" id="status-place" type="button"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${esc(loc.label)}</button></div>
        <div class="status-action"><span class="spinner light"></span></div><p class="status-reason">${t('status.loading')}</p>`
      $('#status-place').onclick = () => A.openLocationPicker(); return
    }
    const r = A.locRisk() || { level: 0, reasons: [], alerts: [] }, lvl = r.level, L0 = A.LEVELS[lvl]
    const sname = loc.state ? A.store.stateByCode[loc.state]?.name : null
    const act = A.actionFor(r)
    // one primary action; secondary as quiet links
    let primary
    if (lvl >= 2) primary = { href: act.topic ? '#/guide/' + act.topic : '#/guide', icon: 'fa-list-check', text: t('btn.guide') }
    else if (lvl === 1) primary = { href: act.topic ? '#/guide/' + act.topic : '#/alerts?state=' + loc.state, icon: 'fa-list-check', text: t('btn.guide') }
    else primary = { href: '#/plan', icon: 'fa-clipboard-list', text: t('btn.plan') }
    const secondary = []
    if (r.alerts.length) secondary.push(`<a href="#/alerts?state=${loc.state}"><i class="fa-solid fa-bell" aria-hidden="true"></i>${t('btn.alerts')} (${r.alerts.length})</a>`)
    if (lvl >= 2) secondary.push(`<a href="#/help"><i class="fa-solid fa-truck-medical" aria-hidden="true"></i>${t('status.help')}</a>`)
    if (loc.state) secondary.push(`<a href="#/states/${loc.state}"><i class="fa-solid fa-flag" aria-hidden="true"></i>${t('status.state')}</a>`)
    const why = r.reasons.slice(0, 3)
    const prevLvl = el.dataset.lvl
    el.className = 'status-card l' + lvl
    el.dataset.lvl = lvl
    el.innerHTML = `
      <div class="status-top">
        <button class="status-place" id="status-place" type="button" aria-label="${t('ob.change')}: ${esc(loc.label)}"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${esc(loc.label)}</button>
        <span class="status-time">${t('status.checked', { t: A.ago(A.store.fetchedAt || o.generated) })}</span>
      </div>
      <div class="status-label">${sname ? t('status.for', { s: esc(sname) }) : t('status.title')}</div>
      <div class="status-level"><span class="status-level-icon" aria-hidden="true"><i class="fa-solid ${L0.icon}"></i></span>${L0.name}</div>
      <div class="status-action">${esc(act.text)}</div>
      ${why.length ? `<ul class="status-why" aria-label="${t('status.why')}">${why.map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>` : `<p class="status-reason">${L0.advice}</p>`}
      <div class="status-todo">
        <a class="btn btn-white btn-lg" href="${primary.href}"><i class="fa-solid ${primary.icon}" aria-hidden="true"></i>${primary.text}</a>
        <div class="status-links">${secondary.join('')}</div>
      </div>`
    $('#status-place').onclick = () => A.openLocationPicker()
    // meaningful motion only: level change or escalation
    if ((prevLvl != null && prevLvl !== String(lvl)) || A.store.escalated || A.store.locChanged) { A.flash(el, lvl >= 2 ? 'escalate' : 'flash'); A.store.escalated = false; A.store.locChanged = false }
  }

  let wxReq = 0
  async function renderWeather() {
    const el = $('#weather-card'), loc = A.store.loc; if (!el) return
    if (!loc) { el.innerHTML = `<div class="card-head" style="margin:0"><h2>${t('wx.title')}</h2></div>` + A.emptyState({ icon: 'fa-cloud-sun', title: t('wx.noLoc') }); return }
    const my = ++wxReq
    try {
      const w = await A.api(`/api/weather?lat=${loc.lat}&lon=${loc.lon}`)
      if (my !== wxReq || !$('#weather-card')) return
      const c = w.current, [desc, icon, col] = A.WX(c.weather_code), aq = A.AQI(w.aqi?.us_aqi)
      const rainNext = Math.max(...(w.hourly?.precipitation_probability || [0]).slice(0, 12))
      el.innerHTML = `
        <div class="card-head" style="margin:0"><h2>${t('wx.title')}</h2><span class="aqi-pill" style="background:${aq.bg};color:${aq.color}" title="US AQI">AQI ${w.aqi?.us_aqi ?? '—'} · ${aq.label}</span></div>
        <div class="wx-now"><i class="fa-solid ${icon} wx-icon" style="color:${col}" aria-hidden="true"></i><div><div class="wx-temp">${Math.round(c.temperature_2m)}°</div><div class="wx-desc">${desc} · ${t('wx.feels', { t: Math.round(c.apparent_temperature) })}</div></div></div>
        <div class="wx-stats">
          <div class="wx-stat"><span>${t('wx.hum')}</span><b>${c.relative_humidity_2m}%</b></div>
          <div class="wx-stat"><span>${t('wx.wind')}</span><b>${Math.round(c.wind_speed_10m)} km/h</b></div>
          <div class="wx-stat"><span>${t('wx.gust')}</span><b>${Math.round(c.wind_gusts_10m)} km/h</b></div>
          <div class="wx-stat"><span>${t('wx.rain12')}</span><b>${rainNext}%</b></div>
        </div>
        <div class="wx-days">${w.daily.time.map((d, i) => { const [ds, ic, co] = A.WX(w.daily.weather_code[i]); return `<div class="wx-day" title="${ds}">${i === 0 ? t('wx.today') : new Date(d).toLocaleDateString(A.locale(), { weekday: 'short' })}<i class="fa-solid ${ic}" style="color:${co}" aria-hidden="true"></i><b>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°</b><span class="muted">${Math.round(w.daily.precipitation_sum[i])} mm</span></div>` }).join('')}</div>`
    } catch { el.innerHTML = A.emptyState({ icon: 'fa-cloud', title: t('wx.na') }) }
  }

  function renderLists() {
    const o = A.store.overview; if (!o || !$('#my-alerts')) return
    const loc = A.store.loc, r = A.locRisk(), sname = loc?.state ? A.store.stateByCode[loc.state]?.name : null
    $('#my-alerts-title').textContent = sname ? t('home.myAlerts', { s: sname }) : t('home.latest')
    let list = r ? r.alerts : A.alertsAll()
    list = [...list].sort((a, b) => (SEV[b.severity] - SEV[a.severity]) || (new Date(b.published) - new Date(a.published)))
    $('#my-alerts').innerHTML = list.length ? `<div class="alert-cards">${list.slice(0, 4).map(A.alertCard).join('')}</div>${list.length > 4 ? `<a class="btn btn-light btn-sm" style="margin-top:12px" href="#/alerts${loc?.state ? '?state=' + loc.state : ''}">${t('home.seeAll', { n: list.length })}</a>` : ''}`
      : noWarnEmpty(sname || loc?.label || t('empty.yourArea'))
    A.bindAlertCards($('#my-alerts'))

    const counts = [0, 0, 0, 0]; Object.values(A.store.risk).forEach(x => counts[x.level]++)
    $('#level-counts').innerHTML = A.LEVELS.map((l, i) => `<div class="level-count lvl-${i}"><i class="fa-solid ${l.icon}" aria-hidden="true"></i><b>${counts[i]}</b><span>${l.short}</span></div>`).join('')
    const top = A.store.states.map(s => ({ s, r: A.store.risk[s.code] })).filter(x => x.r).sort((a, b) => b.r.level - a.r.level || b.r.alerts.length - a.r.alerts.length).slice(0, 6)
    $('#top-states').innerHTML = top.map(({ s, r }) => `
      <a class="list-row" href="#/states/${s.code}">
        <span class="grow"><span class="title">${esc(s.name)}</span><span class="meta">${r.reasons[0] ? esc(r.reasons[0].text) : t('home.noActive')}${r.alerts.length ? ' · ' + r.alerts.length + ' ' + t('states.alerts') : ''}</span></span>
        ${A.lvlBadge(r.level)}
      </a>`).join('')
    const qs = A.quakesAll()
    $('#quake-list').innerHTML = qs.length ? qs.slice(0, 5).map(A.quakeRow).join('') : A.emptyState({ icon: 'fa-house-crack', tone: 'safe', title: t('home.noQuakes') })
  }

  // ======================= ALERTS (timeline + cards) =======================
  A.views.alerts = params => {
    const f = { q: '', type: '', sev: '', state: params.get('state') || '', english: false, status: 'all', view: A.load('aegis.alertView', 'timeline'), limit: 40 }
    main().innerHTML = `
      <div class="page">
        <div class="page-head"><div><span class="eyebrow">${t('alerts.eyebrow')}</span><h1>${t('alerts.title')}</h1><p>${t('alerts.sub')}</p></div>
          <div class="head-actions">${A.notify ? A.notify.button() : ''}<div class="seg" role="radiogroup" aria-label="View"><button type="button" role="radio" data-view="timeline"><i class="fa-solid fa-timeline" aria-hidden="true"></i>${t('tl.timeline')}</button><button type="button" role="radio" data-view="cards"><i class="fa-solid fa-grip" aria-hidden="true"></i>${t('tl.cards')}</button></div></div></div>
        <div class="filters" id="alert-filters">
          <label class="search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">${t('alerts.search')}</span><input id="alert-q" placeholder="${t('alerts.search')}" /></label>
          <select class="input" id="alert-type" aria-label="${t('alerts.allTypes')}"><option value="">${t('alerts.allTypes')}</option></select>
          <select class="input" id="alert-sev" aria-label="${t('alerts.anySev')}"><option value="">${t('alerts.anySev')}</option>${['Extreme', 'Severe', 'Moderate', 'Minor'].map(s => `<option value="${s}">${A.tSev(s)}</option>`).join('')}</select>
          <select class="input" id="alert-state" aria-label="${t('alerts.allStates')}"><option value="">${t('alerts.allStates')}</option>${A.store.states.slice().sort((a, b) => a.name.localeCompare(b.name)).map(s => `<option value="${s.code}">${esc(s.name)}</option>`).join('')}</select>
          <label class="toggle"><input type="checkbox" id="alert-en" /> ${t('alerts.english')}</label>
        </div>
        <div class="status-tabs" role="tablist" aria-label="Status" id="status-tabs"></div>
        <p class="muted small tl-help">${t('tl.statusHelp')}</p>
        <div id="alert-list" aria-live="polite">${A.skeletonRows(4, 120)}</div>
      </div>`
    $('#alert-state').value = f.state
    const syncView = () => $$('[data-view]').forEach(b => { const on = b.dataset.view === f.view; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)) })
    $$('[data-view]').forEach(b => b.onclick = () => { f.view = b.dataset.view; A.save('aegis.alertView', f.view); syncView(); render() })
    syncView()
    const bind = (id, key, ev = 'change', val = e => e.target.value) => $(id).addEventListener(ev, e => { f[key] = val(e); f.limit = 40; render() })
    bind('#alert-q', 'q', 'input'); bind('#alert-type', 'type'); bind('#alert-sev', 'sev'); bind('#alert-state', 'state'); bind('#alert-en', 'english', 'change', e => e.target.checked)

    let capReq = 0
    function filtered() {
      const q = f.q.toLowerCase()
      return A.alertsAll().filter(a => (!f.type || a.type === f.type) && (!f.sev || a.severity === f.sev) && (!f.state || a.states.includes(f.state)) && (!f.english || a.english) && (!q || (a.title + ' ' + a.sender + ' ' + (A.store.cap[a.id]?.area || '')).toLowerCase().includes(q)))
    }
    function render() {
      if (!A.store.overview) return
      const all = A.alertsAll()
      const types = [...new Set(all.map(a => a.type))].sort()
      const ts = $('#alert-type'); if (ts.options.length !== types.length + 1) { ts.innerHTML = `<option value="">${t('alerts.allTypes')}</option>` + types.map(x => `<option value="${esc(x)}">${esc(A.tType(x))}</option>`).join(''); ts.value = f.type }
      if (!A.store.overview.alerts.ok) { $('#alert-list').innerHTML = `<div class="notice"><i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>${t('alerts.feedDown')}</div>`; return }
      const base = filtered()
      const withSt = base.map(a => ({ a, st: A.alertStatus(a) }))
      const cnt = s => s === 'all' ? withSt.length : withSt.filter(x => x.st === s).length
      $('#status-tabs').innerHTML = ['all', 'new', 'updated', 'active', 'expired'].map(s => `<button type="button" role="tab" aria-selected="${f.status === s}" class="${f.status === s ? 'active' : ''} st-tab-${s}" data-st="${s}">${s === 'all' ? t('tl.all') : t('tl.' + s)}<em>${cnt(s)}</em></button>`).join('')
      $$('#status-tabs [data-st]').forEach(b => b.onclick = () => { f.status = b.dataset.st; f.limit = 40; render() })
      let list = withSt.filter(x => f.status === 'all' || x.st === f.status)
      if (!list.length) {
        $('#alert-list').innerHTML = base.length || f.q || f.type || f.sev || f.english ? A.emptyState({ icon: 'fa-filter-circle-xmark', title: t('alerts.noMatch') })
          : noWarnEmpty(f.state ? A.store.stateByCode[f.state]?.name : 'India')
        return
      }
      if (f.view === 'cards') {
        list.sort((x, y) => (SEV[y.a.severity] - SEV[x.a.severity]) || (new Date(y.a.published) - new Date(x.a.published)))
        $('#alert-list').innerHTML = `<div class="alert-cards">${list.slice(0, f.limit).map(x => A.alertCard(x.a)).join('')}</div>${more(list.length)}`
      } else {
        list.sort((x, y) => new Date(y.a.published) - new Date(x.a.published))
        const shown = list.slice(0, f.limit)
        let lastDay = ''
        $('#alert-list').innerHTML = `<ol class="timeline">${shown.map(({ a, st }) => {
          const day = a.published ? A.dayKey(a.published) : ''
          let head = ''
          if (day !== lastDay) { lastDay = day; head = `<li class="tl-day" aria-hidden="true"><span>${dayLabel(a.published)}</span></li>` }
          return head + tlItem(a, st)
        }).join('')}</ol>${more(list.length)}`
        // fetch CAP details for visible items, then refresh in place
        const need = shown.map(x => x.a.id).filter(id => !(id in A.store.cap))
        if (need.length) { const my = ++capReq; A.fetchCap(need).then(() => { if (my === capReq && $('#alert-list')) render() }) }
      }
      A.bindAlertCards($('#alert-list'))
      $$('[data-todo]', $('#alert-list')).forEach(b => b.onclick = e => { e.stopPropagation(); const box = b.nextElementSibling; const open = box.hidden; box.hidden = !open; b.setAttribute('aria-expanded', String(open)) })
      const lm = $('#load-more'); lm && (lm.onclick = () => { f.limit += 40; render() })
    }
    const more = n => n > f.limit ? `<button class="btn btn-light btn-block" id="load-more" type="button" style="margin-top:14px">${t('tl.loadMore')} (${n - f.limit})</button>` : ''
    const dayLabel = iso => {
      if (!iso) return ''
      const k = A.dayKey(iso), today = A.dayKey(new Date().toISOString()), yest = A.dayKey(new Date(Date.now() - 864e5).toISOString())
      return k === today ? t('tl.today') : k === yest ? t('tl.yesterday') : new Date(iso).toLocaleDateString(A.locale(), { weekday: 'long', day: 'numeric', month: 'short' })
    }
    function tlItem(a, st) {
      const d = A.store.cap[a.id], loading = d === undefined && a.id in A.store.cap
      const until = d?.expires ? `<span><i class="fa-regular fa-hourglass-half" aria-hidden="true"></i> ${st === 'expired' ? t('tl.ended') : t('tl.until')} ${A.timeIST(d.expires)}</span>` : loading ? `<span class="muted">${t('tl.loading')}</span>` : ''
      return `<li class="tl-item s-${a.severity} tls-${st} ${A.store.freshIds?.has(a.id) ? 'is-fresh' : ''}">
        <span class="tl-dot" aria-hidden="true">${A.typeIcon(a.type)}</span>
        <article class="tl-body">
          <header class="tl-top"><time datetime="${esc(a.published || '')}">${a.published ? A.clockIST(a.published) : ''}</time>${statusTag(st)}${A.sevBadge(a.severity)}<span class="type-tag">${esc(A.tType(a.type))}</span></header>
          <h3>${esc(A.plainSummary(a, d))}</h3>
          <div class="tl-meta"><span><i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${esc(A.alertArea(a, d))}</span>${until}<span><i class="fa-regular fa-building" aria-hidden="true"></i> ${esc(a.sender)}</span></div>
          <div class="tl-actions">
            <button type="button" class="btn btn-light btn-sm" data-todo aria-expanded="false"><i class="fa-solid fa-person-running" aria-hidden="true"></i>${t('tl.whatDo')}</button>
            <div class="todo-box" hidden><p>${esc(A.todoFor(a.type))}</p>${d?.instruction ? `<p class="small"><b>${t('al.instr')}:</b> ${esc(d.instruction)}</p>` : ''}</div>
            <button type="button" class="btn btn-ghost btn-sm" data-alert="${esc(a.id)}"><i class="fa-solid fa-map" aria-hidden="true"></i>${t('tl.details')}</button>
          </div>
          <details class="official"><summary>${t('tl.official')}</summary><p>${esc(a.title)}</p>${!a.english ? `<a class="small" href="${A.translateUrl(a.title)}" target="_blank" rel="noopener"><i class="fa-solid fa-language" aria-hidden="true"></i> ${t('tl.translate')}</a>` : ''}</details>
        </article>
      </li>`
    }
    A.on('data', render); render()
  }

  // ======================= STATES =======================
  A.views.states = () => {
    let q = '', lvl = -1
    main().innerHTML = `
      <div class="page">
        <div class="page-head"><div><span class="eyebrow">${t('states.eyebrow')}</span><h1>${t('states.title')}</h1><p>${t('states.sub')}</p></div></div>
        <div class="filters">
          <label class="search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">${t('states.search')}</span><input id="state-q" placeholder="${t('states.search')}" /></label>
          <div class="chip-row" id="lvl-chips" role="radiogroup"><button type="button" class="chip active" data-l="-1" aria-pressed="true">${t('states.all')}</button>${A.LEVELS.map((l, i) => `<button type="button" class="chip" data-l="${i}" aria-pressed="false"><i class="fa-solid ${l.icon}" aria-hidden="true"></i>${l.name}</button>`).join('')}</div>
        </div>
        <div class="state-grid" id="state-grid">${A.skeletonRows(6, 150)}</div>
      </div>`
    $('#state-q').oninput = e => { q = e.target.value.toLowerCase(); render() }
    $$('#lvl-chips .chip').forEach(b => b.onclick = () => { $$('#lvl-chips .chip').forEach(x => { x.classList.remove('active'); x.setAttribute('aria-pressed', 'false') }); b.classList.add('active'); b.setAttribute('aria-pressed', 'true'); lvl = +b.dataset.l; render() })
    function render() {
      if (!A.store.overview) return
      const list = A.store.states.map(s => ({ s, r: A.store.risk[s.code] || { level: 0, reasons: [], alerts: [], quakes: [] } }))
        .filter(({ s, r }) => (lvl < 0 || r.level === lvl) && (!q || s.name.toLowerCase().includes(q) || s.capital.toLowerCase().includes(q)))
        .sort((a, b) => b.r.level - a.r.level || a.s.name.localeCompare(b.s.name))
      $('#state-grid').innerHTML = list.length ? list.map(({ s, r }) => {
        const w = r.wx?.current
        return `<a class="state-card l${r.level}" href="#/states/${s.code}">
          <div class="state-card-top"><div><h3>${esc(s.name)}</h3><div class="sub">${s.type} · ${esc(s.capital)}</div></div>${A.lvlBadge(r.level)}</div>
          <div class="sub state-reason">${r.reasons[0] ? esc(r.reasons[0].text) : t('home.noActive')}</div>
          <div class="mini-stats"><div><b>${r.alerts.length}</b>${t('states.alerts')}</div><div><b>${w ? Math.round(w.temperature_2m) + '°' : '—'}</b>${w ? A.WX(w.weather_code)[0] : ''}</div><div><b>${r.wx?.aqi?.us_aqi ?? '—'}</b>AQI</div></div>
        </a>`
      }).join('') : `<div style="grid-column:1/-1">${A.emptyState({ icon: 'fa-magnifying-glass', title: t('states.none') })}</div>`
    }
    A.on('data', render); render()
  }

  A.views.state = (params, code) => {
    const s = A.store.stateByCode[code]
    if (!s) { main().innerHTML = `<div class="page">${A.emptyState({ icon: 'fa-flag', title: t('misc.notFound'), link: '#/states', linkText: t('states.back') })}</div>`; return }
    const r0 = () => A.store.risk[code] || { level: 0, reasons: [], alerts: [], quakes: [], events: [] }
    main().innerHTML = `
      <div class="page">
        <a class="back" href="#/states"><i class="fa-solid fa-arrow-left" aria-hidden="true"></i>${t('states.back')}</a>
        <div class="page-head"><div><span class="eyebrow">${s.type} · ${esc(s.capital)}</span><h1>${esc(s.name)}</h1></div><div id="state-lvl"></div></div>
        <section class="state-hero">
          <div class="card" id="state-summary"></div>
          <div class="card" style="padding:8px"><iframe class="gmap-frame" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Google Map of ${esc(s.name)}" src="${A.google.place(s.lat, s.lon, 7, s.name + ', India')}"></iframe></div>
        </section>
        <section class="section card"><div class="card-head"><h2>${t('states.active')}</h2><a href="#/alerts?state=${code}">${t('tl.timeline')} <i class="fa-solid fa-arrow-right" aria-hidden="true"></i></a></div><div id="state-alerts"></div></section>
        <section class="section card"><div class="card-head"><h2>${t('states.outlook', { c: esc(s.capital) })}</h2></div><div class="wx-days three" id="state-days"></div></section>
        <section class="section card"><div class="card-head"><h2>${t('states.quakes', { s: esc(s.name) })}</h2></div><div class="list" id="state-quakes"></div></section>
      </div>`
    function render() {
      if (!A.store.overview) return
      const r = r0(), w = r.wx, act = A.actionFor(r)
      $('#state-lvl').innerHTML = A.lvlBadge(r.level)
      $('#state-summary').innerHTML = `
        <h2>${t('states.situation')}</h2>
        <p class="state-action l${r.level}"><i class="fa-solid ${A.LEVELS[r.level].icon}" aria-hidden="true"></i>${esc(act.text)}</p>
        ${r.reasons.length ? `<ul class="reason-list">${r.reasons.slice(0, 5).map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>` : `<p class="muted" style="margin-bottom:14px">${A.LEVELS[r.level].advice}</p>`}
        <div class="kv">
          <div><span>${t('states.pop')}</span><b>${A.fmtPop(s.population)}</b></div>
          <div><span>${t('states.temp')}</span><b>${w?.current ? Math.round(w.current.temperature_2m) + '°C' : '—'}</b></div>
          <div><span>${t('states.aqi')}</span><b>${w?.aqi?.us_aqi ?? '—'} <small class="muted">${A.AQI(w?.aqi?.us_aqi).label}</small></b></div>
        </div>
        <div class="side-section-title" style="margin-top:16px">${t('states.hazards')}</div>
        <div class="hazard-list">${s.hazards.map(h => `<span class="chip">${A.typeIcon(h === 'Lightning' ? 'Thunderstorm' : h === 'Cloudburst' ? 'Heavy rain' : h)}${esc(I18nType(h))}</span>`).join('')}</div>
        <div class="btn-row">
          ${act.topic ? `<a class="btn btn-primary btn-sm" href="#/guide/${act.topic}"><i class="fa-solid fa-list-check" aria-hidden="true"></i>${t('btn.guide')}</a>` : ''}
          <a class="btn btn-light btn-sm" href="${esc(s.sdma)}" target="_blank" rel="noopener"><i class="fa-solid fa-building-shield" aria-hidden="true"></i>${t('states.sdma')}</a>
          <button class="btn btn-light btn-sm" id="set-state-loc" type="button"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${t('states.setLoc')}</button>
        </div>`
      $('#set-state-loc').onclick = () => A.setLocation({ lat: s.lat, lon: s.lon, label: `${s.capital}, ${s.name}`, source: 'state' })
      $('#state-alerts').innerHTML = r.alerts.length ? `<div class="alert-cards">${r.alerts.slice(0, 12).map(A.alertCard).join('')}</div>` : noWarnEmpty(s.name)
      A.bindAlertCards($('#state-alerts'))
      const d = w?.daily
      $('#state-days').innerHTML = d ? d.time.map((x, i) => { const [ds, ic, co] = A.WX(d.weather_code[i]); return `<div class="wx-day">${i === 0 ? t('wx.today') : new Date(x).toLocaleDateString(A.locale(), { weekday: 'long' })}<i class="fa-solid ${ic}" style="color:${co}" aria-hidden="true"></i><b>${Math.round(d.temperature_2m_max[i])}° / ${Math.round(d.temperature_2m_min[i])}°</b><span class="muted">${ds} · ${Math.round(d.precipitation_sum[i])} mm · ${d.precipitation_probability_max[i] ?? 0}%</span></div>` }).join('') : `<span class="muted">${t('wx.na')}</span>`
      $('#state-quakes').innerHTML = r.quakes.length ? r.quakes.slice(0, 8).map(A.quakeRow).join('') : A.emptyState({ icon: 'fa-house-crack', tone: 'safe', title: t('states.noQuakes') })
    }
    const I18nType = h => { const map = { Lightning: 'Thunderstorm', Cloudburst: 'Heavy rain' }; const k = map[h] || h; return window.AegisI18n.has('type.' + k) && window.AegisI18n.lang === 'hi' ? A.tType(k) : h }
    A.on('data', render); render()
  }

  // ======================= ROUTER =======================
  const ROUTES = { '': 'home', map: 'map', alerts: 'alerts', states: 'states', help: 'help', guide: 'guide', plan: 'plan', emergency: 'home' }
  function route() {
    const raw = location.hash.replace(/^#\/?/, '')
    const [path, qs] = raw.split('?'), parts = path.split('/').filter(Boolean)
    const params = new URLSearchParams(qs || '')
    let name = ROUTES[parts[0] || ''] || 'home'
    if (name === 'states' && parts[1]) name = 'state'
    A.off('data'); A.off('location'); A.destroyMaps(); A.cleanup && A.cleanup(); A.cleanup = null
    document.body.classList.toggle('map-mode', name === 'map')
    $$('#main-nav a').forEach(a => { const on = a.dataset.route === (name === 'state' ? 'states' : name); a.classList.toggle('active', on); on ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current') })
    const view = A.views[name]
    try { view ? view(params, parts[1]) : A.views.home(params) } catch (e) { console.error(e); main().innerHTML = `<div class="page">${A.emptyState({ icon: 'fa-bug', title: t('misc.error') })}</div>` }
    if (parts[0] === 'emergency') A.openEmergency()
    window.scrollTo(0, 0)
    // move focus to the page heading for screen-reader users (not on first load)
    if (A.store.routed) { const h = $('#main h1'); if (h) { h.setAttribute('tabindex', '-1'); h.focus({ preventScroll: true }) } }
    A.store.routed = true
  }
  A.rerender = route
  A.onAlways('data', () => A.updateLiveStrip())
  A.onAlways('location', () => A.updateLiveStrip())
  window.addEventListener('hashchange', route)
  window.addEventListener('DOMContentLoaded', async () => {
    A.translateChrome()
    $('#main').innerHTML = `<div class="page">${A.skeletonRows(1, 300)}${A.skeletonRows(3, 80)}</div>`
    try {
      const ready = A.init()
      await new Promise(res => { const tm = setInterval(() => { if (A.store.ready) { clearInterval(tm); res() } }, 50); ready.catch(res) })
      route()
      await ready
    } catch (e) {
      console.error(e)
      $('#main').innerHTML = `<div class="page">${A.emptyState({ icon: 'fa-plug-circle-xmark', title: t('misc.startErr') })}</div>`
    }
  })
})()
