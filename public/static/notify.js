/* AegisAI — PWA registration, install prompt and new-alert notifications for the saved location */
(function () {
  const A = window.Aegis, { $, esc } = A
  const KEY_ON = 'aegis.notify', KEY_SEEN = 'aegis.seen'
  const SEV_RANK = { Extreme: 4, Severe: 3, Moderate: 2, Minor: 1 }

  // ---------- service worker (offline shell + cached last data) ----------
  let swReg = null
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').then(r => (swReg = r)).catch(() => {}))
  }
  window.addEventListener('online', () => { A.toast(A.t('fresh.refresh') + ' ✓', 'fa-wifi'); A.loadOverview() })
  window.addEventListener('offline', () => A.toast(A.t('fresh.offline'), 'fa-plug-circle-xmark'))

  // ---------- install prompt ----------
  let deferred = null
  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; document.body.classList.add('can-install') })
  A.install = async () => {
    if (!deferred) return A.toast('Use your browser menu → "Add to Home screen" to install', 'fa-mobile-screen')
    deferred.prompt(); await deferred.userChoice.catch(() => {}); deferred = null; document.body.classList.remove('can-install')
  }

  // ---------- notifications ----------
  A.notify = {
    supported: () => 'Notification' in window,
    enabled: () => A.notify.supported() && Notification.permission === 'granted' && localStorage.getItem(KEY_ON) === '1',
    async toggle() {
      if (!A.notify.supported()) return A.toast('Notifications are not supported in this browser', 'fa-bell-slash')
      if (A.notify.enabled()) { localStorage.setItem(KEY_ON, '0'); A.toast('Alert notifications turned off', 'fa-bell-slash'); return A.notify.refreshButtons() }
      const p = await Notification.requestPermission()
      if (p !== 'granted') { A.toast('Notifications are blocked. Allow them in your browser settings.', 'fa-bell-slash'); return A.notify.refreshButtons() }
      localStorage.setItem(KEY_ON, '1')
      markAllSeen()
      const s = A.store.loc?.state && A.store.stateByCode[A.store.loc.state]
      show('AegisAI notifications on', `We will alert you about new official warnings${s ? ' for ' + s.name : ''} while AegisAI is open or running in the background.`, '/#/alerts')
      A.notify.refreshButtons()
    },
    button: () => `<button class="btn btn-light btn-sm notify-btn" type="button" data-notify aria-pressed="false"><i class="fa-regular fa-bell" aria-hidden="true"></i><span>${A.t('notify.off')}</span></button>`,
    refreshButtons() {
      const on = A.notify.enabled()
      document.querySelectorAll('[data-notify]').forEach(b => {
        b.classList.toggle('on', on)
        b.setAttribute('aria-pressed', String(on))
        b.innerHTML = on ? `<i class="fa-solid fa-bell" aria-hidden="true"></i><span>${A.t('notify.on')}</span>` : `<i class="fa-regular fa-bell" aria-hidden="true"></i><span>${A.t('notify.off')}</span>`
        b.onclick = A.notify.toggle
      })
    },
  }

  const seen = () => new Set(JSON.parse(localStorage.getItem(KEY_SEEN) || '[]'))
  const saveSeen = s => localStorage.setItem(KEY_SEEN, JSON.stringify([...s].slice(-600)))
  function mineAlerts() { const st = A.store.loc?.state; return st && A.store.risk[st] ? A.store.risk[st].alerts : [] }
  function markAllSeen() { const s = seen(); mineAlerts().forEach(a => s.add(a.id)); saveSeen(s) }

  async function show(title, body, url) {
    const opts = { body, icon: '/icon.svg', badge: '/icon.svg', tag: url, data: { url } }
    try {
      const reg = swReg || (await navigator.serviceWorker?.getRegistration())
      if (reg?.showNotification) return reg.showNotification(title, opts)
    } catch {}
    try { const n = new Notification(title, opts); n.onclick = () => { window.focus(); location.hash = url.replace('/#', '#') } } catch {}
  }

  function check() {
    if (!A.store.overview?.alerts?.ok) return
    const s = seen(), fresh = mineAlerts().filter(a => !s.has(a.id))
    fresh.forEach(a => s.add(a.id)); saveSeen(s)
    if (!fresh.length || !A.notify.enabled()) return
    fresh.sort((a, b) => (SEV_RANK[b.severity] || 0) - (SEV_RANK[a.severity] || 0))
    const top = fresh[0], sname = A.store.stateByCode[A.store.loc.state]?.name || ''
    const title = fresh.length === 1 ? `${A.plainSummary(top)}` : A.t('notify.newAlerts', { n: fresh.length, s: sname })
    A.announce(title, top.severity === 'Extreme' || top.severity === 'Severe')
    show(title, A.todoFor(top.type), '/#/alerts?state=' + A.store.loc.state)
  }

  // Run the check after every live refresh, without depending on per-view event handlers
  let first = true
  const origLoad = A.loadOverview
  A.loadOverview = async () => {
    await origLoad()
    // On the first load after opening the app, only notify if notifications were already on
    if (first) { first = false; if (!localStorage.getItem(KEY_SEEN)) { markAllSeen(); return } }
    check()
    A.notify.refreshButtons()
  }
  // When the location changes, don't spam with the new state's existing alerts
  const origSet = A.setLocation
  A.setLocation = async (loc, quiet) => { await origSet(loc, quiet); if (A.store.overview) markAllSeen() }

  // ---------- translate helper for non-English CAP alerts ----------
  A.translateUrl = text => `https://translate.google.com/?sl=auto&tl=en&op=translate&text=${encodeURIComponent(text.slice(0, 1800))}`

  // keep buttons in sync after each route render
  window.addEventListener('hashchange', () => setTimeout(A.notify.refreshButtons, 0))
  window.addEventListener('DOMContentLoaded', () => setTimeout(A.notify.refreshButtons, 300))
  A.esc = A.esc || esc
})()
