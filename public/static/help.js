/* AegisAI — Get Help: nearby facilities, routing & turn-by-turn, Google navigation, helplines */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A
  const HI = () => window.AegisI18n.lang === 'hi'

  const KINDS = [
    { id: 'hospital', get name() { return HI() ? 'अस्पताल' : 'Hospitals' }, icon: 'fa-hospital', color: '#dc2626', q: 'hospital' },
    { id: 'police', get name() { return HI() ? 'पुलिस' : 'Police' }, icon: 'fa-shield-halved', color: '#1d4ed8', q: 'police station' },
    { id: 'fire', get name() { return HI() ? 'फायर' : 'Fire' }, icon: 'fa-fire-extinguisher', color: '#ea580c', q: 'fire station' },
    { id: 'shelter', get name() { return HI() ? 'आश्रय' : 'Shelters' }, icon: 'fa-house-flag', color: '#16a34a', q: 'relief shelter community centre' },
    { id: 'pharmacy', get name() { return HI() ? 'दवा दुकान' : 'Pharmacy' }, icon: 'fa-prescription-bottle-medical', color: '#7c3aed', q: 'pharmacy' },
  ]
  const HL = [
    ['112', 'All emergencies (Police, Fire, Ambulance)', 'सभी आपात स्थितियाँ (पुलिस, फायर, एम्बुलेंस)'], ['108', 'Ambulance / medical emergency', 'एम्बुलेंस / चिकित्सा आपातकाल'], ['100', 'Police', 'पुलिस'], ['101', 'Fire', 'फायर'],
    ['1078', 'NDMA disaster helpline', 'NDMA आपदा हेल्पलाइन'], ['1070', 'State disaster control room', 'राज्य आपदा नियंत्रण कक्ष'], ['1077', 'District disaster control room', 'ज़िला आपदा नियंत्रण कक्ष'],
    ['1091', 'Women helpline', 'महिला हेल्पलाइन'], ['1098', 'Child helpline', 'बाल हेल्पलाइन'], ['14567', 'Senior citizens (Elder line)', 'वरिष्ठ नागरिक (एल्डर लाइन)'], ['1554', 'Coast Guard (sea rescue)', 'तटरक्षक (समुद्री बचाव)'], ['139', 'Railway helpline', 'रेलवे हेल्पलाइन'],
  ]
  Object.defineProperty(A, 'HELPLINES', { get: () => HL.map(h => [h[0], HI() ? h[2] : h[1]]) })
  const S = (en, hi) => (HI() ? hi : en)

  A.views.help = params => {
    let kind = params.get('type') || 'hospital', items = [], sel = null, mode = 'car', view = 'route', req = 0
    $('#main').innerHTML = `
      <div class="page">
        <div class="page-head"><div><span class="eyebrow">${t('help.eyebrow')}</span><h1>${t('help.title')}</h1><p>${t('help.sub')}</p></div>
          <div class="head-actions"><button class="btn btn-danger" type="button" onclick="Aegis.openEmergency()"><i class="fa-solid fa-kit-medical" aria-hidden="true"></i>${t('em.title')}</button><button class="btn btn-light" type="button" id="help-loc"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span id="help-loc-label"></span></button></div></div>
        <section class="card" id="helplines-section" style="margin-bottom:18px"><div class="card-head"><h2><i class="fa-solid fa-phone-volume" style="color:var(--action)" aria-hidden="true"></i> ${t('help.numbers')}</h2><span class="muted small">${t('help.tap')}</span></div>
          <div class="helplines">${A.HELPLINES.map(([n, d]) => `<a class="helpline" href="tel:${n}" aria-label="${n}: ${esc(d)}"><b>${n}</b><span>${esc(d)}</span></a>`).join('')}</div></section>
        <div class="help-layout">
          <section class="card" id="facility-section">
            <div class="facility-tabs" role="tablist">${KINDS.map(k => `<button type="button" role="tab" aria-selected="${k.id === kind}" data-kind="${k.id}" class="${k.id === kind ? 'active' : ''}"><i class="fa-solid ${k.icon}" aria-hidden="true"></i>${k.name}</button>`).join('')}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><span class="muted small" id="facility-count"></span>
              <select class="input" id="facility-radius" aria-label="Radius" style="padding:6px 10px;font-size:13px"><option value="3000">3 km</option><option value="6000" selected>6 km</option><option value="12000">12 km</option><option value="20000">20 km</option></select></div>
            <div class="facility-list" id="facility-list"></div>
            <a class="btn btn-light btn-sm btn-block" id="gsearch" target="_blank" rel="noopener" style="margin-top:10px"><i class="fa-brands fa-google" aria-hidden="true"></i>${S('Search on Google Maps instead', 'Google Maps पर खोजें')}</a>
          </section>
          <section class="nav-panel" id="nav-panel">
            <div class="card" style="padding:14px">
              <div class="nav-summary" id="nav-summary"><span class="muted">${S('Choose a place from the list to see the route.', 'रास्ता देखने के लिए सूची से कोई जगह चुनें।')}</span></div>
              <div style="display:flex;gap:8px;margin:12px 0;flex-wrap:wrap;align-items:center">
                <div class="mode-toggle" id="mode-toggle"><button type="button" data-mode="car" class="active"><i class="fa-solid fa-car" aria-hidden="true"></i> ${S('Drive', 'गाड़ी')}</button><button type="button" data-mode="foot"><i class="fa-solid fa-person-walking" aria-hidden="true"></i> ${S('Walk', 'पैदल')}</button></div>
                <div class="mode-toggle" id="view-toggle"><button type="button" data-view="route" class="active">${S('Route map', 'रूट मैप')}</button><button type="button" data-view="google"><i class="fa-brands fa-google" aria-hidden="true"></i> Google</button></div>
              </div>
              <div class="nav-map"><div id="nav-map" style="position:absolute;inset:0"></div><iframe id="nav-gframe" title="Google directions" style="position:absolute;inset:0;width:100%;height:100%;border:0;display:none;z-index:500" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>
              <div id="nav-actions" style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"></div>
            </div>
            <div class="card" id="steps-card" hidden><div class="card-head" style="margin-bottom:6px"><h2>${S('Directions', 'दिशा-निर्देश')}</h2><span class="muted small">OSRM · OpenStreetMap</span></div><ol class="steps" id="steps"></ol></div>
          </section>
        </div>
      </div>`
    const map = A.newMap('nav-map', { zoomSnap: 0.5 })
    const poi = L.layerGroup().addTo(map), routeLayer = L.layerGroup().addTo(map), me = L.layerGroup().addTo(map)
    const K = () => KINDS.find(k => k.id === kind)

    function locUI() {
      const l = A.store.loc; $('#help-loc-label').textContent = l ? l.label : t('hdr.setloc')
      me.clearLayers(); if (l) { L.marker([l.lat, l.lon], { icon: A.meIcon(), zIndexOffset: 2000 }).addTo(me).bindTooltip('You'); map.setView([l.lat, l.lon], 13) } else map.setView([22.8, 82.5], 4.5)
      $('#gsearch').href = l ? A.google.search(K().q, l.lat, l.lon) : '#'
    }
    $('#help-loc').onclick = () => A.openLocationPicker()

    async function load() {
      const l = A.store.loc
      if (!l) {
        $('#facility-count').textContent = ''
        $('#facility-list').innerHTML = A.emptyState({ icon: 'fa-location-dot', title: t('help.noLoc'), sub: t('help.noLocSub'), extra: `<button class="btn btn-primary btn-sm" type="button" id="help-set-loc" style="margin-top:10px"><i class="fa-solid fa-location-crosshairs" aria-hidden="true"></i>${t('status.btnLoc')}</button>` })
        $('#help-set-loc').onclick = () => A.openLocationPicker()
        return
      }
      const my = ++req, radius = $('#facility-radius').value
      sel = null; clearRoute(); poi.clearLayers()
      $('#facility-count').textContent = t('ob.searching')
      $('#facility-list').innerHTML = A.skeletonRows(6, 58)
      try {
        const d = await A.api(`/api/nearby?lat=${l.lat}&lon=${l.lon}&type=${kind}&radius=${radius}`)
        if (my !== req || !$('#facility-list')) return
        items = d.items.map(x => ({ ...x, d: A.haversine(l.lat, l.lon, x.lat, x.lon) })).sort((a, b) => (b.emergency - a.emergency) * 0 + a.d - b.d)
        // Unnamed facilities go last
        items = [...items.filter(x => x.name), ...items.filter(x => !x.name)].slice(0, 60)
        renderList()
      } catch (e) {
        if (my !== req || !$('#facility-list')) return
        $('#facility-count').textContent = ''
        $('#facility-list').innerHTML = A.emptyState({ icon: 'fa-satellite-dish', title: esc(e.message), extra: `<button class="btn btn-light btn-sm" type="button" id="retry" style="margin-top:10px">${t('misc.retry')}</button>` })
        $('#retry').onclick = load
      }
    }
    function renderList() {
      const k = K()
      $('#facility-count').textContent = `${items.length} · ${k.name}`
      poi.clearLayers()
      items.forEach((x, i) => L.marker([x.lat, x.lon], { icon: A.poiIcon(k.color, k.icon) }).addTo(poi).bindTooltip(esc(x.name || k.name.replace(/s$/, ''))).on('click', () => pick(i)))
      if (items.length) map.fitBounds(L.featureGroup([...poi.getLayers(), ...me.getLayers()]).getBounds(), { padding: [30, 30], maxZoom: 15 })
      $('#facility-list').innerHTML = items.length ? items.map((x, i) => `
        <button type="button" class="facility ${sel === i ? 'selected' : ''}" data-i="${i}">
          <span class="type-icon" style="background:${k.color}1a;color:${k.color}" aria-hidden="true"><i class="fa-solid ${k.icon}"></i></span>
          <span style="flex:1;min-width:0"><span class="name">${esc(x.name || 'Unnamed ' + k.name.toLowerCase().replace(/s$/, ''))}</span>
            <span class="addr" style="display:block">${esc(x.address || x.kind?.replace(/_/g, ' ') || '')}${x.emergency ? ' · <b style="color:var(--action)">24×7 ' + S('emergency', 'आपातकालीन') + '</b>' : ''}${x.phone ? ' · ' + esc(x.phone.split(';')[0]) : ''}</span></span>
          <span class="dist">${A.km(x.d)}</span>
        </button>`).join('') : A.emptyState({ icon: 'fa-magnifying-glass-location', title: S(`No ${k.name.toLowerCase()} mapped within this distance.`, `इस दूरी में कोई ${k.name} नहीं मिला।`), sub: S('Try a larger radius or search on Google Maps.', 'बड़ी दूरी चुनें या Google Maps पर खोजें।') })
      $$('.facility', $('#facility-list')).forEach(b => b.onclick = () => pick(+b.dataset.i))
    }

    function clearRoute() {
      routeLayer.clearLayers(); $('#steps-card').hidden = true
      $('#nav-summary').innerHTML = `<span class="muted">${S('Choose a place from the list to see the route.', 'रास्ता देखने के लिए सूची से कोई जगह चुनें।')}</span>`
      $('#nav-actions').innerHTML = ''
    }
    async function pick(i) {
      sel = i; const x = items[i], l = A.store.loc, k = K()
      $$('.facility').forEach(b => b.classList.toggle('selected', +b.dataset.i === i))
      const gmode = mode === 'foot' ? 'walking' : 'driving'
      $('#nav-actions').innerHTML = `
        <a class="btn btn-primary" href="${A.google.navigate(l, x, gmode)}" target="_blank" rel="noopener"><i class="fa-solid fa-diamond-turn-right"></i>${S('Start navigation', 'नेविगेशन शुरू करें')}</a>
        ${x.phone ? `<a class="btn btn-danger" href="tel:${esc(x.phone.split(';')[0].replace(/\s/g, ''))}"><i class="fa-solid fa-phone"></i>Call</a>` : ''}
        <a class="btn btn-light" href="${A.google.open(x.lat, x.lon)}" target="_blank" rel="noopener"><i class="fa-brands fa-google"></i>${S('Open in Maps', 'मैप में खोलें')}</a>
        <button class="btn btn-light" type="button" id="share-btn"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i>${S('Share', 'साझा करें')}</button>`
      $('#share-btn').onclick = async () => {
        const text = `${x.name || k.name}: ${A.google.open(x.lat, x.lon)}`
        try { navigator.share ? await navigator.share({ title: x.name || k.name, text }) : (await navigator.clipboard.writeText(text), A.toast(S('Link copied', 'लिंक कॉपी हुआ'), 'fa-copy')) } catch {}
      }
      $('#nav-summary').innerHTML = `<div style="flex:1;min-width:0"><b style="display:block">${esc(x.name || k.name)}</b><span class="muted small">${A.km(x.d)} ${S('straight-line · finding road route…', 'सीधी दूरी · सड़क का रास्ता खोज रहे हैं…')}</span></div><span class="spinner"></span>`
      if (view === 'google') $('#nav-gframe').src = A.google.directions(l, x, gmode)
      const my = ++req
      try {
        const r = await A.api(`/api/route?from=${l.lat},${l.lon}&to=${x.lat},${x.lon}&mode=${mode}`)
        if (my !== req || !$('#nav-summary')) return
        routeLayer.clearLayers()
        const line = L.geoJSON(r.geometry, { style: { color: '#2563eb', weight: 6, opacity: 0.85 } }).addTo(routeLayer)
        L.circleMarker([x.lat, x.lon], { radius: 9, color: '#fff', weight: 3, fillColor: k.color, fillOpacity: 1 }).addTo(routeLayer)
        map.fitBounds(line.getBounds(), { padding: [30, 30] })
        $('#nav-summary').innerHTML = `<div class="big">${A.mins(r.duration)}</div><div style="flex:1;min-width:0"><b style="display:block">${esc(x.name || k.name)}</b><span class="muted small">${A.km(r.distance)} ${S((mode === 'foot' ? 'walking' : 'by road') + ' · estimate, traffic not included', (mode === 'foot' ? 'पैदल' : 'सड़क से') + ' · अनुमान, ट्रैफ़िक शामिल नहीं')}</span></div>`
        $('#steps').innerHTML = r.steps.map(s => `<li>${esc(s.text)}<span>${s.distance ? A.km(s.distance) : ''}</span></li>`).join('')
        $('#steps-card').hidden = false
      } catch {
        if (my !== req || !$('#nav-summary')) return
        routeLayer.clearLayers()
        L.polyline([[l.lat, l.lon], [x.lat, x.lon]], { color: '#2563eb', dashArray: '6 8', weight: 4 }).addTo(routeLayer)
        map.fitBounds([[l.lat, l.lon], [x.lat, x.lon]], { padding: [30, 30] })
        $('#nav-summary').innerHTML = `<div style="flex:1"><b style="display:block">${esc(x.name || k.name)}</b><span class="muted small">${A.km(x.d)} ${S('straight-line. Road route unavailable — use “Start navigation”.', 'सीधी दूरी। सड़क का रास्ता उपलब्ध नहीं — “नेविगेशन शुरू करें” इस्तेमाल करें।')}</span></div>`
      }
    }

    $$('.facility-tabs button').forEach(b => b.onclick = () => { $$('.facility-tabs button').forEach(x => x.classList.toggle('active', x === b)); kind = b.dataset.kind; locUI(); load() })
    $('#facility-radius').onchange = load
    $$('#mode-toggle button').forEach(b => b.onclick = () => { $$('#mode-toggle button').forEach(x => x.classList.toggle('active', x === b)); mode = b.dataset.mode; sel != null && pick(sel) })
    $$('#view-toggle button').forEach(b => b.onclick = () => {
      $$('#view-toggle button').forEach(x => x.classList.toggle('active', x === b)); view = b.dataset.view
      const f = $('#nav-gframe'), l = A.store.loc
      if (view === 'google') { f.style.display = 'block'; f.src = sel != null ? A.google.directions(l, items[sel], mode === 'foot' ? 'walking' : 'driving') : A.google.place(l.lat, l.lon, 14, K().q) }
      else { f.style.display = 'none'; setTimeout(() => map.invalidateSize(), 50) }
    })
    A.on('location', () => { locUI(); load() })
    locUI(); load()
  }
})()
