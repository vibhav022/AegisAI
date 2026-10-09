/* AegisAI — My safety plan: household contacts, medical notes, kit and state guides. Stored only on this device. */
(function () {
  const A = window.Aegis, { $, $$, esc, t } = A
  const KEY = 'aegis.plan'
  const get = () => Object.assign({ contacts: [], blood: '', conditions: '', meds: '', allergies: '', meeting: '', notes: '' }, A.load(KEY, {}))

  A.views.plan = () => {
    const plan = get()
    const st = A.store.loc?.state, sname = st ? A.store.stateByCode[st]?.name : null
    const topics = st ? A.topicsForState(st) : Object.keys(A.GUIDES)
    const hazardCount = st ? (A.store.stateByCode[st]?.hazards || []).length : 0
    const field = (k, label, ph = '', multi) => `<label class="field"><span>${label}</span>${multi ? `<textarea class="input" data-f="${k}" rows="2" placeholder="${esc(ph)}">${esc(plan[k])}</textarea>` : `<input class="input" data-f="${k}" value="${esc(plan[k])}" placeholder="${esc(ph)}" />`}</label>`
    $('#main').innerHTML = `
      <div class="page">
        <div class="page-head"><div><span class="eyebrow"><i class="fa-solid fa-lock" aria-hidden="true"></i> ${t('plan.eyebrow')}</span><h1>${t('plan.title')}</h1><p>${t('plan.sub')}</p></div>
          <div class="head-actions"><button class="btn btn-light btn-sm" id="plan-share" type="button"><i class="fa-solid fa-share-nodes" aria-hidden="true"></i>${t('plan.share')}</button><button class="btn btn-light btn-sm" id="plan-print" type="button"><i class="fa-solid fa-print" aria-hidden="true"></i>${t('plan.print')}</button></div></div>
        <div class="plan-grid">
          <section class="card" aria-labelledby="pc-h">
            <div class="card-head"><h2 id="pc-h"><i class="fa-solid fa-address-book" aria-hidden="true"></i> ${t('plan.contacts')}</h2></div>
            <div id="contact-list"></div>
            <form class="contact-form" id="contact-form" autocomplete="off">
              <label class="field"><span>${t('plan.name')}</span><input class="input" name="name" required /></label>
              <label class="field"><span>${t('plan.relation')}</span><input class="input" name="relation" /></label>
              <label class="field"><span>${t('plan.phone')}</span><input class="input" name="phone" type="tel" inputmode="tel" required /></label>
              <button class="btn btn-primary" type="submit"><i class="fa-solid fa-plus" aria-hidden="true"></i>${t('plan.add')}</button>
            </form>
          </section>
          <section class="card" aria-labelledby="pm-h">
            <div class="card-head"><h2 id="pm-h"><i class="fa-solid fa-notes-medical" aria-hidden="true"></i> ${t('plan.medical')}</h2><span class="saved-tag" id="saved-tag" aria-live="polite"></span></div>
            <div class="field-grid">
              <label class="field"><span>${t('plan.blood')}</span><select class="input" data-f="blood">${['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(b => `<option ${plan.blood === b ? 'selected' : ''}>${b}</option>`).join('')}</select></label>
              ${field('allergies', t('plan.allergies'))}
            </div>
            ${field('conditions', t('plan.conditions'))}
            ${field('meds', t('plan.meds'))}
            ${field('meeting', t('plan.meeting'), t('plan.meetingPh'))}
            ${field('notes', t('plan.notes'), t('plan.notesPh'), true)}
          </section>
        </div>
        <section class="section card" aria-labelledby="pk-h">
          <div class="card-head"><h2 id="pk-h"><i class="fa-solid fa-kit-medical" style="color:var(--safe)" aria-hidden="true"></i> ${t('plan.kit')}</h2></div>
          <div id="plan-kit"></div>
        </section>
        <section class="section card" aria-labelledby="pg-h">
          <div class="card-head"><h2 id="pg-h"><i class="fa-solid fa-book-medical" aria-hidden="true"></i> ${sname ? t('plan.guides', { s: esc(sname) }) : t('plan.guidesAll')}</h2><span class="offline-tag" id="offline-tag"></span></div>
          ${hazardCount ? `<p class="muted small" style="margin:-6px 0 12px">${t('plan.hazardsHint')}</p>` : ''}
          <div class="plan-guides">${topics.map((k, i) => { const g = A.GUIDES[k]; return `<a class="plan-guide ${i < hazardCount ? 'primary' : ''}" href="#/guide/${k}">${A.typeIcon(g.type)}<span><b>${esc(A.guideName(k))}</b><small>${esc(A.guideList(k, 'during')[0])}</small></span></a>` }).join('')}</div>
        </section>
      </div>`

    // contacts
    const drawContacts = () => {
      const p = get()
      $('#contact-list').innerHTML = p.contacts.length ? `<ul class="contact-list">${p.contacts.map((c, i) => `
        <li><span class="avatar" aria-hidden="true">${esc((c.name || '?').trim()[0]?.toUpperCase() || '?')}</span>
          <span class="grow"><b>${esc(c.name)}</b><small>${esc(c.relation || '')}${c.relation ? ' · ' : ''}${esc(c.phone)}</small></span>
          <a class="btn btn-light btn-sm" href="tel:${esc(c.phone.replace(/[^\d+]/g, ''))}" aria-label="${t('em.call')} ${esc(c.name)}"><i class="fa-solid fa-phone" aria-hidden="true"></i></a>
          <button class="btn btn-ghost btn-sm" type="button" data-rm="${i}" aria-label="${t('plan.remove')} ${esc(c.name)}"><i class="fa-solid fa-trash-can" aria-hidden="true"></i></button></li>`).join('')}</ul>`
        : A.emptyState({ icon: 'fa-user-plus', title: t('plan.noContacts') })
      $$('[data-rm]').forEach(b => b.onclick = () => { const p2 = get(); p2.contacts.splice(+b.dataset.rm, 1); A.save(KEY, p2); drawContacts() })
    }
    $('#contact-form').onsubmit = e => {
      e.preventDefault()
      const f = new FormData(e.target), name = String(f.get('name') || '').trim(), phone = String(f.get('phone') || '').trim()
      if (!name || phone.replace(/\D/g, '').length < 3) return A.toast(t('plan.invalidPhone'), 'fa-triangle-exclamation')
      const p = get(); p.contacts.push({ name, relation: String(f.get('relation') || '').trim(), phone }); A.save(KEY, p)
      e.target.reset(); drawContacts(); e.target.querySelector('input').focus(); A.announce(t('plan.saved'))
    }
    drawContacts()

    // fields autosave
    let tm
    $$('[data-f]').forEach(el => el.addEventListener('input', () => {
      const p = get(); p[el.dataset.f] = el.value; A.save(KEY, p)
      clearTimeout(tm); const tag = $('#saved-tag'); tag.innerHTML = `<i class="fa-solid fa-check" aria-hidden="true"></i> ${t('plan.saved')}`; tm = setTimeout(() => tag && (tag.textContent = ''), 1800)
    }))
    A.renderKit($('#plan-kit'))

    // offline availability
    const tag = $('#offline-tag')
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) tag.innerHTML = `<i class="fa-solid fa-circle-check" aria-hidden="true"></i> ${t('plan.offline')}`
    else tag.innerHTML = `<span class="muted small">${t('plan.offlineSoon')}</span>`

    // share / print
    const summary = () => {
      const p = get(), lines = [t('plan.title') + ' — AegisAI']
      if (p.contacts.length) lines.push('', t('plan.contacts') + ':', ...p.contacts.map(c => `• ${c.name}${c.relation ? ' (' + c.relation + ')' : ''}: ${c.phone}`))
      const med = [[t('plan.blood'), p.blood], [t('plan.conditions'), p.conditions], [t('plan.meds'), p.meds], [t('plan.allergies'), p.allergies]].filter(x => x[1])
      if (med.length) lines.push('', t('plan.medical') + ':', ...med.map(([a, b]) => `• ${a}: ${b}`))
      if (p.meeting) lines.push('', t('plan.meeting') + ': ' + p.meeting)
      if (p.notes) lines.push('', t('plan.notes') + ': ' + p.notes)
      lines.push('', 'Emergency: 112 · Ambulance: 108 · Disaster helpline: 1078')
      return lines.join('\n')
    }
    $('#plan-share').onclick = async () => {
      const text = summary()
      try { if (navigator.share) await navigator.share({ title: t('plan.title'), text }); else { await navigator.clipboard.writeText(text); A.toast(t('em.copied').replace(/location link|स्थान का लिंक/i, '✓'), 'fa-copy') } } catch {}
    }
    $('#plan-print').onclick = () => window.print()
  }
})()
