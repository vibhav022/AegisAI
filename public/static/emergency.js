/* AegisAI — Emergency mode: full-screen, high-contrast panel available on every page.
   Works offline: calls, saved nearest places, saved contacts and saved instructions. */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A
  const KEY_NEAR = 'aegis.emNearest'
  const KINDS = [
    { id: 'hospital', label: 'em.hospital', icon: 'fa-hospital', color: '#ef4444' },
    { id: 'police', label: 'em.policeSt', icon: 'fa-shield-halved', color: '#60a5fa' },
    { id: 'fire', label: 'em.fireSt', icon: 'fa-fire-extinguisher', color: '#fb923c' },
  ]
  let open = false, closeFn = null

  const mapsLink = l => `https://maps.google.com/?q=${l.lat.toFixed(5)},${l.lon.toFixed(5)}`
  const phoneOf = x => (x.phone || '').split(/[;,]/)[0].replace(/[^\d+]/g, '')

  async function shareLocation(kind) {
    const msgKey = kind === 'safe' ? 'em.msgSafe' : 'em.msgHelp'
    let loc = A.store.loc
    A.toast(t('em.locating'), 'fa-location-crosshairs')
    try { const p = await A.getPosition({ timeout: 8000 }); loc = { ...loc, lat: p.lat, lon: p.lon } } catch {}
    if (!loc) return A.toast(t('em.noLoc'), 'fa-triangle-exclamation')
    const text = t(msgKey, { link: mapsLink(loc) })
    if (navigator.share) { try { await navigator.share({ text }); return } catch (e) { if (e.name === 'AbortError') return } }
    // Fallback: open SMS composer (works on phones), and copy to clipboard
    try { await navigator.clipboard.writeText(text); A.toast(t('em.copied'), 'fa-copy') } catch {}
    location.href = 'sms:?&body=' + encodeURIComponent(text)
  }

  function guideSteps() {
    const r = A.locRisk(), topic = r ? A.actionFor(r).topic : null
    const g = topic && A.GUIDES?.[topic]
    const general = [t('em.gen1'), t('em.gen2'), t('em.gen3'), t('em.gen4')]
    return { title: g ? A.guideName(topic) : t('em.general'), icon: g ? (A.TYPE[g.type] || A.TYPE.Weather).icon : 'fa-person-shelter', steps: g ? A.guideList(topic, 'during').slice(0, 4) : general, general: g ? general.slice(0, 2) : [] }
  }

  function nearestHTML(data) {
    const l = A.store.loc
    if (!l) return `<div class="em-note"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${t('em.noLoc')}</span><button type="button" class="em-btn-sm" id="em-gps">${t('em.useGps')}</button></div>`
    if (!data) return `<p class="em-muted"><span class="spinner light"></span> ${t('em.finding')}</p>`
    const age = data.saved ? `<p class="em-muted small">${t('em.saved', { t: A.ago(data.at) })}</p>` : ''
    return age + KINDS.map(k => {
      const x = data.items?.[k.id]
      if (!x) return `<div class="em-place"><span class="em-place-icon" style="color:${k.color}" aria-hidden="true"><i class="fa-solid ${k.icon}"></i></span><span class="grow"><b>${t(k.label)}</b><span>${t('em.none')}</span></span></div>`
      const ph = phoneOf(x)
      return `<div class="em-place">
        <span class="em-place-icon" style="color:${k.color}" aria-hidden="true"><i class="fa-solid ${k.icon}"></i></span>
        <span class="grow"><b>${esc(x.name || t(k.label))}</b><span>${t(k.label)} · ${A.km(A.haversine(l.lat, l.lon, x.lat, x.lon))}</span></span>
        ${ph ? `<a class="em-btn-sm call" href="tel:${esc(ph)}" aria-label="${t('em.call')} ${esc(x.name || '')}"><i class="fa-solid fa-phone" aria-hidden="true"></i></a>` : ''}
        <a class="em-btn-sm" href="${A.google.navigate(l, x)}" target="_blank" rel="noopener" aria-label="${t('em.go')} ${esc(x.name || '')}"><i class="fa-solid fa-diamond-turn-right" aria-hidden="true"></i><span>${t('em.go')}</span></a>
      </div>`
    }).join('')
  }

  async function loadNearest(render) {
    const l = A.store.loc; if (!l) return render(null)
    const saved = A.load(KEY_NEAR, null)
    const usable = saved && A.haversine(saved.lat, saved.lon, l.lat, l.lon) < 5000
    if (usable) render({ ...saved, saved: true })
    if (A.isOffline()) return usable ? null : render({ items: {}, saved: true, at: null })
    const items = {}
    await Promise.all(KINDS.map(async k => {
      try {
        const d = await A.api(`/api/nearby?lat=${l.lat}&lon=${l.lon}&type=${k.id}&radius=10000`)
        const best = d.items.filter(x => x.name).map(x => ({ ...x, d: A.haversine(l.lat, l.lon, x.lat, x.lon) })).sort((a, b) => (k.id === 'hospital' ? (b.emergency - a.emergency) * 800 : 0) + a.d - b.d)[0]
        if (best) items[k.id] = { name: best.name, lat: best.lat, lon: best.lon, phone: best.phone }
      } catch { if (usable) items[k.id] = saved.items[k.id] }
    }))
    const rec = { lat: l.lat, lon: l.lon, at: new Date().toISOString(), items }
    A.save(KEY_NEAR, rec)
    render(rec)
  }

  A.openEmergency = () => {
    if (open) return
    open = true
    const root = $('#emergency-root'), opener = document.activeElement
    const plan = A.load('aegis.plan', {}), contacts = (plan.contacts || []).filter(c => c.phone)
    const g = guideSteps()
    const med = [plan.blood && `${t('plan.blood')}: ${plan.blood}`, plan.conditions, plan.meds && `${t('plan.meds')}: ${plan.meds}`, plan.allergies && `${t('plan.allergies')}: ${plan.allergies}`].filter(Boolean)
    root.innerHTML = `
      <div class="em-overlay" role="dialog" aria-modal="true" aria-labelledby="em-title">
        <div class="em-inner">
          <div class="em-head">
            <div><h1 id="em-title"><i class="fa-solid fa-kit-medical" aria-hidden="true"></i>${t('em.title')}</h1><p>${t('em.sub')}</p></div>
            <button type="button" class="em-close" id="em-close" aria-label="${t('em.close')}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </div>
          ${A.isOffline() ? `<div class="em-note warn"><i class="fa-solid fa-plug-circle-xmark" aria-hidden="true"></i><span>${t('em.offline')}</span></div>` : ''}
          <a class="em-112" href="tel:112"><i class="fa-solid fa-phone" aria-hidden="true"></i><span><b>${t('em.call112')}</b><small>${t('em.call112s')}</small></span></a>
          <div class="em-quick">
            <a href="tel:108"><b>108</b><span>${t('em.amb')}</span></a>
            <a href="tel:101"><b>101</b><span>${t('em.fire')}</span></a>
            <a href="tel:100"><b>100</b><span>${t('em.police')}</span></a>
            <a href="tel:1078"><b>1078</b><span>${t('em.disaster')}</span></a>
          </div>
          <div class="em-share">
            <button type="button" id="em-share-help"><i class="fa-solid fa-location-arrow" aria-hidden="true"></i>${t('em.share')}</button>
            <button type="button" id="em-share-safe"><i class="fa-solid fa-hand" aria-hidden="true"></i>${t('em.safe')}</button>
          </div>
          <section class="em-section" aria-labelledby="em-near-h"><h2 id="em-near-h">${t('em.nearest')}</h2><div id="em-nearest"></div></section>
          ${contacts.length ? `<section class="em-section" aria-labelledby="em-c-h"><h2 id="em-c-h">${t('em.contacts')}</h2><div class="em-contacts">${contacts.map(c => `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}"><i class="fa-solid fa-user" aria-hidden="true"></i><span><b>${esc(c.name)}</b><small>${esc(c.relation || '')} · ${esc(c.phone)}</small></span><i class="fa-solid fa-phone" aria-hidden="true"></i></a>`).join('')}</div></section>` : `<p class="em-muted small"><a href="#/plan" id="em-plan-link">${t('em.addContacts')}</a></p>`}
          ${med.length ? `<section class="em-section" aria-labelledby="em-m-h"><h2 id="em-m-h">${t('em.medical')}</h2><ul class="em-steps">${med.map(x => `<li>${esc(x)}</li>`).join('')}</ul></section>` : ''}
          <section class="em-section" aria-labelledby="em-g-h"><h2 id="em-g-h"><i class="fa-solid ${g.icon}" aria-hidden="true"></i> ${t('em.whatNow')} · ${esc(g.title)}</h2>
            <ol class="em-steps">${[...g.steps, ...g.general].map(x => `<li>${esc(x)}</li>`).join('')}</ol></section>
        </div>
      </div>`
    document.body.classList.add('modal-open', 'em-open')
    const ov = $('.em-overlay', root)
    const render = d => { const box = $('#em-nearest'); if (!box) return; box.innerHTML = nearestHTML(d); const b = $('#em-gps'); b && (b.onclick = async () => { b.innerHTML = '<span class="spinner light"></span>'; try { await A.useGPS(); loadNearest(render) } catch (e) { A.toast(e.message, 'fa-triangle-exclamation'); b.textContent = t('em.useGps') } }) }
    render(A.store.loc ? undefined : null); loadNearest(render)
    $('#em-share-help').onclick = () => shareLocation('help')
    $('#em-share-safe').onclick = () => shareLocation('safe')
    const close = () => {
      if (!open) return; open = false; root.innerHTML = ''; document.body.classList.remove('modal-open', 'em-open')
      document.removeEventListener('keydown', onKey); opener?.focus?.()
    }
    closeFn = close
    $('#em-close').onclick = close
    const pl = $('#em-plan-link'); pl && pl.addEventListener('click', close)
    const onKey = e => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab') {
        const f = $$('a[href], button:not([disabled])', ov); if (!f.length) return
        if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus() }
        else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    setTimeout(() => $('.em-112', root)?.focus(), 30)
  }
  A.closeEmergency = () => closeFn && closeFn()

  window.addEventListener('DOMContentLoaded', () => {
    $('#emergency-fab').onclick = A.openEmergency
    if (location.hash === '#/emergency') setTimeout(A.openEmergency, 400)
  })
  // Pre-fetch nearest places once the location is known so they work offline later
  A.onAlways('location', () => { if (A.store.loc && !A.isOffline()) setTimeout(() => loadNearest(() => {}), 4000) })
})()
