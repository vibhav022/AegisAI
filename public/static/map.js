/* AegisAI — Live map: clustering, near-me filter, bottom sheet, legend toggle, Google Maps option */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A

  // ---------- Google Maps JS API loader (only when key configured) ----------
  let gmapsPromise
  A.loadGoogleMaps = () => {
    const key = A.google.key()
    if (!key) return Promise.reject(new Error('no key'))
    if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)
    if (gmapsPromise) return gmapsPromise
    gmapsPromise = new Promise((res, rej) => {
      window.__aegisGmapsReady = () => res(window.google.maps)
      window.gm_authFailure = () => { A.store.config.googleMapsKey = null; rej(new Error('Google Maps key rejected')); A.toast('Google Maps key was rejected — using free map instead', 'fa-triangle-exclamation') }
      const s = document.createElement('script')
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__aegisGmapsReady&loading=async&v=weekly`
      s.async = true; s.onerror = () => { gmapsPromise = null; rej(new Error('Google Maps failed to load')) }
      document.head.appendChild(s)
    })
    return gmapsPromise
  }

  const LAYERS = [
    { id: 'states', icon: 'fa-flag', on: true },
    { id: 'quakes', icon: 'fa-house-crack', on: true },
    { id: 'events', icon: 'fa-hurricane', on: true },
    { id: 'radar', icon: 'fa-cloud-rain', on: false },
    { id: 'me', icon: 'fa-location-dot', on: true },
  ]
  const RADII = [50, 150, 300]

  A.views.map = () => {
    const hasKey = !!A.google.key()
    const prefs = A.load('aegis.mapPrefs', {})
    const enabled = Object.fromEntries(LAYERS.map(l => [l.id, prefs.layers?.[l.id] ?? l.on]))
    let scope = prefs.scope || 'all', radius = prefs.radius || 150, legendOpen = prefs.legend ?? window.innerWidth > 760
    const savePrefs = () => A.save('aegis.mapPrefs', { layers: enabled, scope, radius, legend: legendOpen })

    $('#main').innerHTML = `
      <div class="map-page">
        <div class="map-toolbar" id="map-toolbar">
          <div class="map-search"><label class="search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><span class="sr-only">${t('map.search')}</span><input id="map-q" placeholder="${t('map.search')}" autocomplete="off" /></label><div class="suggestions" id="map-sugg" hidden></div></div>
          <div class="toolbar-row">
            <div class="seg" role="radiogroup" aria-label="${t('map.show')}">
              <button type="button" role="radio" data-scope="all">${t('map.allIndia')}</button>
              <button type="button" role="radio" data-scope="near"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i><span id="near-label"></span></button>
            </div>
            <select class="input input-sm" id="near-radius" aria-label="Radius">${RADII.map(r => `<option value="${r}" ${r === radius ? 'selected' : ''}>${r} km</option>`).join('')}</select>
          </div>
          <div class="layer-chips" role="group" aria-label="${t('map.layers')}">${LAYERS.map(l => `<button type="button" class="chip layer-chip" data-layer="${l.id}" aria-pressed="${enabled[l.id]}"><i class="fa-solid ${l.icon}" aria-hidden="true"></i>${t('map.l.' + l.id)}<em id="count-${l.id}"></em></button>`).join('')}</div>
          <div class="toolbar-row">
            <div class="seg seg-sm" role="radiogroup" aria-label="${t('map.base')}" id="base-chips"><button type="button" role="radio" data-base="Streets" class="active" aria-checked="true">${t('map.streets')}</button><button type="button" role="radio" data-base="Satellite" aria-checked="false">${t('map.satellite')}</button><button type="button" role="radio" data-base="Terrain" aria-checked="false">${t('map.terrain')}</button></div>
            <button type="button" class="chip" id="legend-toggle" aria-expanded="${legendOpen}" aria-controls="map-legend"><i class="fa-solid fa-circle-info" aria-hidden="true"></i>${t('map.legend')}</button>
          </div>
          <section class="incident-list" aria-labelledby="inc-h"><h2 class="side-section-title" id="inc-h"></h2><div id="incidents"></div></section>
        </div>
        <section class="map-wrap" id="map-wrap" aria-label="${t('map.title')}">
          <div class="map-tabs" role="tablist">
            <button type="button" role="tab" class="active" aria-selected="true" data-engine="leaflet"><i class="fa-solid fa-layer-group" aria-hidden="true"></i>${t('map.live')}</button>
            <button type="button" role="tab" aria-selected="false" data-engine="google"><i class="fa-brands fa-google" aria-hidden="true"></i>${t('map.google')}</button>
          </div>
          <div id="live-map"></div>
          <div id="google-js-map" style="position:absolute;inset:0;display:none;z-index:500"></div>
          <iframe id="google-map-frame" title="Google Maps" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
          <div class="map-legend" id="map-legend" ${legendOpen ? '' : 'hidden'}>
            <div><b>${t('map.risk')}</b><div class="legend-items">${A.LEVELS.map(l => `<span><i class="sw" style="background:${l.fill}" aria-hidden="true"></i><i class="fa-solid ${l.icon}" aria-hidden="true" style="color:${l.color}"></i>${l.short}</span>`).join('')}</div></div>
            <div><b>${t('map.quakeMag')}</b><div class="legend-items">${[2.5, 4, 5, 6].map(m => `<span><i class="sw round" style="background:${A.quakeColor(m)}" aria-hidden="true"></i>M${m}+</span>`).join('')}</div></div>
          </div>
          <div class="map-fab"><button type="button" id="fab-locate" aria-label="${t('map.l.me')}"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i></button><button type="button" id="fab-india" aria-label="${t('map.allIndia')}"><i class="fa-solid fa-earth-asia" aria-hidden="true"></i></button></div>
          <div class="radar-bar" id="radar-bar"><button type="button" id="radar-play" aria-label="Play or pause radar"><i class="fa-solid fa-pause" aria-hidden="true"></i></button><span id="radar-time">Radar</span></div>
          <div class="map-sheet" id="map-sheet" hidden role="region" aria-live="polite" aria-label="Selected">
            <button type="button" class="sheet-close" id="sheet-close" aria-label="${t('map.close')}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
            <div id="sheet-body"></div>
          </div>
        </section>
      </div>`

    const map = A.newMap('live-map', { zoomSnap: 0.25, zoomControl: false })
    L.control.zoom({ position: 'topright' }).addTo(map)
    map.setView([22.8, 82.5], 4.75)
    const clusterIcon = color => c => { const n = c.getChildCount(), s = n < 10 ? 34 : n < 50 ? 40 : 48; return L.divIcon({ className: '', html: `<div class="cluster" style="width:${s}px;height:${s}px;background:${color}">${n}</div>`, iconSize: [s, s] }) }
    const groups = { states: L.layerGroup(), quakes: A.cluster({ iconCreateFunction: clusterIcon('#b91c1c') }), events: A.cluster({ iconCreateFunction: clusterIcon('#334155') }), radar: L.layerGroup(), me: L.layerGroup() }
    const nearRing = L.layerGroup().addTo(map), searchMarker = L.layerGroup().addTo(map)
    let base = 'Streets', engine = 'leaflet', gmap = null, gOverlays = []

    // ---------- bottom sheet ----------
    const sheet = $('#map-sheet')
    const openSheet = html => { $('#sheet-body').innerHTML = html; sheet.hidden = false; A.flash(sheet, 'rise-in') }
    $('#sheet-close').onclick = () => (sheet.hidden = true)
    const escSheet = e => { if (e.key === 'Escape' && !sheet.hidden && !document.body.classList.contains('modal-open')) sheet.hidden = true }
    document.addEventListener('keydown', escSheet)

    function stateSheet(code) {
      const s = A.store.stateByCode[code], r = A.store.risk[code]; if (!s || !r) return
      const act = A.actionFor(r)
      openSheet(`
        <div class="sheet-head"><h2>${esc(s.name)}</h2>${A.lvlBadge(r.level)}</div>
        <p class="sheet-action">${esc(act.text)}</p>
        ${r.reasons.length ? `<ul class="reason-list small">${r.reasons.slice(0, 3).map(x => `<li>${esc(x.text)}</li>`).join('')}</ul>` : ''}
        <div class="kv kv-3"><div><span>${t('states.alerts')}</span><b>${r.alerts.length}</b></div><div><span>${t('states.temp')}</span><b>${r.wx?.current ? Math.round(r.wx.current.temperature_2m) + '°' : '—'}</b></div><div><span>AQI</span><b>${r.wx?.aqi?.us_aqi ?? '—'}</b></div></div>
        <div class="btn-row"><a class="btn btn-primary btn-sm" href="#/states/${code}">${t('status.state')}</a><a class="btn btn-light btn-sm" href="#/alerts?state=${code}">${t('nav.alerts')}</a>${act.topic ? `<a class="btn btn-light btn-sm" href="#/guide/${act.topic}">${t('btn.guide')}</a>` : ''}</div>`)
    }
    function quakeSheet(q) {
      const l = A.store.loc, d = l ? A.haversine(l.lat, l.lon, q.lat, q.lon) : null
      openSheet(`
        <div class="sheet-head"><h2>${A.typeIcon('Earthquake')} M${q.mag.toFixed(1)} · ${A.tType('Earthquake')}</h2></div>
        <p class="muted small">${esc(q.place)}<br>${A.timeIST(q.time)} IST · ${A.ago(q.time)} · ${Math.round(q.depth)} km${d != null ? ' · ' + A.km(d) : ''}</p>
        <p class="sheet-action">${esc(A.todoFor('Earthquake'))}</p>
        <div class="btn-row"><a class="btn btn-light btn-sm" href="${esc(q.url)}" target="_blank" rel="noopener">USGS</a><a class="btn btn-primary btn-sm" href="#/guide/earthquake">${t('btn.guide')}</a></div>`)
    }
    function eventSheet(e) {
      openSheet(`
        <div class="sheet-head"><h2>${A.typeIcon(e.type)} ${esc(e.name || A.tType(e.type))}</h2><span class="lvl gd-${esc(e.level)}">${esc(e.level)}</span></div>
        <p class="muted small">${esc(A.tType(e.type))} · ${esc(e.country || '')} · ${new Date(e.from).toLocaleDateString(A.locale())}</p>
        ${e.severity ? `<p class="small">${esc(e.severity)}</p>` : ''}
        <p class="sheet-action">${esc(A.todoFor(e.type))}</p>
        <div class="btn-row">${e.url ? `<a class="btn btn-light btn-sm" href="${esc(e.url)}" target="_blank" rel="noopener">GDACS</a>` : ''}${A.guideFor(e.type) ? `<a class="btn btn-primary btn-sm" href="#/guide/${A.guideFor(e.type)}">${t('btn.guide')}</a>` : ''}</div>`)
    }

    // ---------- scope (All India vs near me) ----------
    const inScope = (lat, lon) => scope !== 'near' || !A.store.loc || A.haversine(A.store.loc.lat, A.store.loc.lon, lat, lon) <= radius * 1000
    function syncScopeUI() {
      $('#near-label').textContent = t('map.near', { k: radius })
      $$('[data-scope]').forEach(b => { const on = b.dataset.scope === scope; b.classList.toggle('active', on); b.setAttribute('aria-checked', String(on)) })
      $('#near-radius').hidden = scope !== 'near'
    }
    $$('[data-scope]').forEach(b => b.onclick = () => {
      if (b.dataset.scope === 'near' && !A.store.loc) { A.toast(t('map.needLoc'), 'fa-location-dot'); A.openLocationPicker(); return }
      scope = b.dataset.scope; savePrefs(); syncScopeUI(); draw(true)
    })
    $('#near-radius').onchange = e => { radius = +e.target.value; savePrefs(); syncScopeUI(); draw(true) }

    function draw(fit) {
      Object.values(groups).forEach(g => g.clearLayers()); nearRing.clearLayers()
      const loc = A.store.loc
      if (A.store.geo && A.store.overview) groups.states.addLayer(A.stateLayer((code, layer) => { stateSheet(code); map.fitBounds(layer.getBounds(), { maxZoom: 7, padding: [30, 30] }) }))
      const qs = A.quakesAll().filter(q => inScope(q.lat, q.lon))
      qs.forEach(q => groups.quakes.addLayer(L.marker([q.lat, q.lon], { icon: A.quakeIcon(q), zIndexOffset: Math.round(q.mag * 100), title: `M${q.mag.toFixed(1)} ${q.place}`, keyboard: true }).on('click', () => quakeSheet(q))))
      const ev = (A.store.overview?.gdacs.ok ? A.store.overview.gdacs.data.items : []).filter(e => inScope(e.lat, e.lon))
      ev.forEach(e => {
        const ty = A.TYPE[e.type] || A.TYPE.Weather, col = e.level === 'Red' ? '#b91c1c' : e.level === 'Orange' ? '#c2410c' : '#15803d'
        groups.events.addLayer(L.marker([e.lat, e.lon], { title: e.name || e.type, keyboard: true, icon: L.divIcon({ className: '', html: `<div class="gdacs-marker" style="background:${col}"><i class="fa-solid ${ty.icon}"></i></div>`, iconSize: [30, 30], iconAnchor: [15, 15] }) }).on('click', () => eventSheet(e)))
      })
      if (loc) groups.me.addLayer(L.marker([loc.lat, loc.lon], { icon: A.meIcon(), zIndexOffset: 2000, title: loc.label }))
      if (scope === 'near' && loc) {
        const c = L.circle([loc.lat, loc.lon], { radius: radius * 1000, color: '#2563eb', weight: 1.5, dashArray: '5 6', fillOpacity: 0.04, interactive: false }).addTo(nearRing)
        if (fit) map.fitBounds(c.getBounds(), { padding: [20, 20] })
      } else if (fit) map.setView([22.8, 82.5], 4.75)
      $('#count-quakes').textContent = qs.length || ''
      $('#count-events').textContent = ev.length || ''
      $('#count-states').textContent = Object.values(A.store.risk).filter(r => r.level >= 2).length || ''
      renderIncidents(qs, ev)
      if (enabled.radar) startRadar()
      apply()
      if (engine === 'google' && gmap) drawGoogle()
    }
    function renderIncidents(qs, ev) {
      const loc = A.store.loc
      $('#inc-h').textContent = scope === 'near' && loc ? t('map.incidents') : t('map.incidentsAll')
      const items = [...qs.map(q => ({ kind: 'q', ref: q, time: q.time, type: 'Earthquake', title: `M${q.mag.toFixed(1)} · ${q.place}` })), ...ev.map(e => ({ kind: 'e', ref: e, time: e.from, type: e.type, title: e.name || e.type }))]
        .sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8)
      $('#incidents').innerHTML = items.length ? `<div class="list">${items.map((x, i) => `<button type="button" class="list-row" data-inc="${i}">${A.typeIcon(x.type)}<span class="grow"><span class="title">${esc(x.title)}</span><span class="meta">${A.ago(x.time)}${loc ? ' · ' + A.km(A.haversine(loc.lat, loc.lon, x.ref.lat, x.ref.lon)) : ''}</span></span></button>`).join('')}</div>`
        : A.emptyState({ icon: 'fa-shield-heart', tone: 'safe', title: t('map.noIncidents') })
      $$('[data-inc]').forEach(b => b.onclick = () => {
        const x = items[+b.dataset.inc]; map.setView([x.ref.lat, x.ref.lon], 8); x.kind === 'q' ? quakeSheet(x.ref) : eventSheet(x.ref)
        if (window.innerWidth <= 760) $('#map-wrap').scrollIntoView({ behavior: A.prefs.motion ? 'auto' : 'smooth' })
      })
    }
    function apply() { for (const [k, g] of Object.entries(groups)) enabled[k] ? g.addTo(map) : map.removeLayer(g) }

    // ---------- radar (RainViewer) ----------
    let frames = [], fi = 0, timer = null, playing = !A.prefs.motion, radarLayers = []
    async function startRadar() {
      try {
        if (!frames.length) {
          const d = await fetch('https://api.rainviewer.com/public/weather-maps.json').then(r => r.json())
          frames = (d.radar?.past || []).slice(-8).map(f => ({ time: f.time, url: `${d.host}${f.path}/256/{z}/{x}/{y}/4/1_1.png` }))
        }
        if (!frames.length) throw 0
        groups.radar.clearLayers()
        radarLayers = frames.map(f => L.tileLayer(f.url, { opacity: 0, zIndex: 400, maxNativeZoom: 7, maxZoom: 19, attribution: 'Radar © RainViewer' }))
        radarLayers.forEach(l => groups.radar.addLayer(l))
        fi = frames.length - 1; showFrame()
        $('#radar-bar').style.display = 'flex'
        $('#radar-play').innerHTML = `<i class="fa-solid fa-${playing ? 'pause' : 'play'}" aria-hidden="true"></i>`
        clearInterval(timer); timer = setInterval(() => { if (playing) { fi = (fi + 1) % frames.length; showFrame() } }, 900)
      } catch { A.toast('Rain radar is unavailable right now', 'fa-cloud') }
    }
    function showFrame() {
      radarLayers.forEach((l, i) => l.setOpacity(i === fi ? 0.7 : 0))
      $('#radar-time').textContent = t('map.l.radar') + ' · ' + new Date(frames[fi].time * 1000).toLocaleTimeString(A.locale(), { hour: '2-digit', minute: '2-digit' })
    }
    function stopRadar() { clearInterval(timer); timer = null; const b = $('#radar-bar'); b && (b.style.display = 'none') }
    $('#radar-play').onclick = () => { playing = !playing; $('#radar-play').innerHTML = `<i class="fa-solid fa-${playing ? 'pause' : 'play'}" aria-hidden="true"></i>` }

    $$('[data-layer]').forEach(b => b.onclick = () => {
      const id = b.dataset.layer; enabled[id] = !enabled[id]; b.setAttribute('aria-pressed', String(enabled[id])); savePrefs()
      if (id === 'radar') enabled.radar ? startRadar() : stopRadar()
      apply(); if (engine === 'google' && gmap) drawGoogle()
    })
    $$('#base-chips [data-base]').forEach(b => b.onclick = () => {
      $$('#base-chips [data-base]').forEach(x => { x.classList.toggle('active', x === b); x.setAttribute('aria-checked', String(x === b)) })
      map.removeLayer(map._baseLayers[base]); base = b.dataset.base; map._baseLayers[base].addTo(map).bringToBack()
      if (gmap) gmap.setMapTypeId(base === 'Satellite' ? 'hybrid' : base === 'Terrain' ? 'terrain' : 'roadmap')
    })
    $('#legend-toggle').onclick = e => { legendOpen = !legendOpen; $('#map-legend').hidden = !legendOpen; e.currentTarget.setAttribute('aria-expanded', String(legendOpen)); savePrefs() }

    // ---------- Google engine ----------
    function centerNow() { if (engine === 'google' && gmap) { const c = gmap.getCenter(); return { lat: c.lat(), lon: c.lng(), z: gmap.getZoom() } } const c = map.getCenter(); return { lat: c.lat, lon: c.lng, z: Math.round(map.getZoom()) } }
    function drawGoogle() {
      const g = window.google.maps
      gOverlays.forEach(o => o.setMap && o.setMap(null)); gOverlays = []
      gmap.data.forEach(f => gmap.data.remove(f))
      if (enabled.states && A.store.geo) {
        gmap.data.addGeoJson(A.store.geo)
        gmap.data.setStyle(f => { const l = A.store.risk[f.getProperty('code')]?.level || 0; return { fillColor: A.LEVELS[l].fill, fillOpacity: l ? 0.55 : 0.3, strokeColor: '#ffffff', strokeWeight: 1 } })
      }
      if (enabled.quakes) A.quakesAll().filter(q => inScope(q.lat, q.lon)).forEach(q => {
        const c = new g.Circle({ map: gmap, center: { lat: q.lat, lng: q.lon }, radius: 6000 + (q.mag - 2.5) * 9000, fillColor: A.quakeColor(q.mag), fillOpacity: 0.75, strokeColor: '#fff', strokeWeight: 1.5, clickable: true })
        c.addListener('click', () => quakeSheet(q)); gOverlays.push(c)
      })
      if (enabled.me && A.store.loc) gOverlays.push(new g.Marker({ map: gmap, position: { lat: A.store.loc.lat, lng: A.store.loc.lon }, title: 'You', icon: { path: g.SymbolPath.CIRCLE, scale: 8, fillColor: '#2563eb', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 } }))
    }
    async function setEngine(e) {
      const c = centerNow()
      engine = e
      $$('.map-tabs button').forEach(b => { const on = b.dataset.engine === e; b.classList.toggle('active', on); b.setAttribute('aria-selected', String(on)) })
      const frame = $('#google-map-frame'), js = $('#google-js-map')
      frame.style.display = 'none'; js.style.display = 'none'
      if (e === 'leaflet') { map.setView([c.lat, c.lon], c.z); setTimeout(() => map.invalidateSize(), 50); return }
      if (A.google.key()) {
        try {
          const g = await A.loadGoogleMaps()
          js.style.display = 'block'
          if (!gmap) {
            gmap = new g.Map(js, { center: { lat: c.lat, lng: c.lon }, zoom: c.z, mapTypeId: base === 'Satellite' ? 'hybrid' : base === 'Terrain' ? 'terrain' : 'roadmap', streetViewControl: false, fullscreenControl: false, mapTypeControl: false })
            gmap.data.addListener('click', ev => stateSheet(ev.feature.getProperty('code')))
          } else { gmap.setCenter({ lat: c.lat, lng: c.lon }); gmap.setZoom(c.z) }
          drawGoogle(); return
        } catch { /* fall back to embed */ }
      }
      frame.src = A.google.place(c.lat, c.lon, c.z)
      frame.style.display = 'block'
    }
    $$('.map-tabs button').forEach(b => b.onclick = () => setEngine(b.dataset.engine))

    // ---------- search + fabs ----------
    A.attachGeocoder($('#map-q'), $('#map-sugg'), r => {
      searchMarker.clearLayers()
      L.marker([r.lat, r.lon], { title: r.short }).addTo(searchMarker)
      map.setView([r.lat, r.lon], 10)
      if (engine === 'google') setEngine('google')
      const code = A.stateAt(r.lat, r.lon)
      if (code) stateSheet(code); else openSheet(`<div class="sheet-head"><h2>${esc(r.short)}</h2></div>`)
      $('#sheet-body').insertAdjacentHTML('beforeend', `<div class="btn-row"><button class="btn btn-light btn-sm" type="button" id="sheet-setloc"><i class="fa-solid fa-location-dot" aria-hidden="true"></i>${t('states.setLoc')}: ${esc(r.short)}</button></div>`)
      $('#sheet-setloc').onclick = () => A.setLocation({ lat: r.lat, lon: r.lon, label: r.short + (r.state ? ', ' + r.state : ''), source: 'search' })
    })
    $('#fab-locate').onclick = async () => {
      try { await A.useGPS() } catch (e) { if (!A.store.loc) return A.toast(e.message, 'fa-triangle-exclamation') }
      const l = A.store.loc; map.setView([l.lat, l.lon], 10); if (engine === 'google') setEngine('google')
    }
    $('#fab-india').onclick = () => { map.setView([22.8, 82.5], 4.75); if (engine === 'google') setEngine('google') }

    syncScopeUI()
    A.on('data', () => draw(false)); A.on('location', () => draw(scope === 'near'))
    draw(scope === 'near')
    if (!hasKey) $('.map-tabs [data-engine="google"]').title = 'Google Maps embed (add GOOGLE_MAPS_API_KEY for full Google layers)'
    A.cleanup = () => { stopRadar(); gmap = null; document.removeEventListener('keydown', escSheet) }
  }
})()
