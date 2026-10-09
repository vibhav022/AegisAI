export const page = () => `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<title>AegisAI · Live Disaster Alerts & Safety for India</title>
<meta name="description" content="Live disaster alerts, weather, earthquakes and nearby emergency help for every Indian state — in plain language." />
<meta name="theme-color" content="#0f172a" />
<link rel="manifest" href="/manifest.webmanifest" />
<link rel="apple-touch-icon" href="/icon.svg" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<script>
  // Apply saved display preferences before first paint (no flash)
  try { var p = JSON.parse(localStorage.getItem('aegis.prefs') || '{}'), h = document.documentElement;
    if (p.large) h.classList.add('large-text'); if (p.contrast) h.classList.add('high-contrast');
    if (p.motion || (!localStorage.getItem('aegis.prefs') && matchMedia('(prefers-reduced-motion: reduce)').matches)) h.classList.add('reduce-motion');
    if (p.lang === 'hi') h.lang = 'hi' } catch (e) {}
</script>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Devanagari:wght@400;500;600;700&display=swap" rel="stylesheet" />
<link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.2/css/all.min.css" rel="stylesheet" />
<link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet" />
<link href="https://unpkg.com/leaflet.markercluster@1.5.3/dist/MarkerCluster.css" rel="stylesheet" />
<link href="/static/style.css?v=7" rel="stylesheet" />
</head>
<body>
<a class="skip-link" href="#main" data-i18n="hdr.skip">Skip to content</a>
<div id="sr-polite" class="sr-only" aria-live="polite" aria-atomic="true"></div>
<div id="sr-assertive" class="sr-only" aria-live="assertive" aria-atomic="true"></div>

<header id="top-bar">
  <div class="top-inner">
    <a href="#/" class="brand" aria-label="AegisAI home">
      <span class="brand-mark" aria-hidden="true"><i class="fa-solid fa-shield-halved"></i></span>
      <span class="brand-text">Aegis<b>AI</b></span>
    </a>
    <button id="live-pill" class="live-pill" type="button" aria-haspopup="dialog">
      <span class="live-dot wait" aria-hidden="true"></span><span id="live-text">Connecting…</span><i class="fa-solid fa-chevron-down small" aria-hidden="true"></i>
    </button>
    <div class="top-actions">
      <button id="location-chip" class="location-chip" type="button" data-i18n-label="ob.change" aria-label="Change your location">
        <i class="fa-solid fa-location-dot" aria-hidden="true"></i><span id="location-label">Set location</span><i class="fa-solid fa-chevron-down small" aria-hidden="true"></i>
      </button>
      <button id="settings-btn" class="icon-btn" type="button" data-i18n-label="hdr.settings" data-i18n-title="hdr.settings" aria-label="Display & language"><i class="fa-solid fa-universal-access" aria-hidden="true"></i></button>
      <button id="install-btn" class="icon-btn install-btn" type="button" data-i18n-label="hdr.install" aria-label="Install app" onclick="Aegis.install()"><i class="fa-solid fa-download" aria-hidden="true"></i></button>
      <a href="tel:112" class="sos-button" aria-label="SOS: call 112 emergency"><i class="fa-solid fa-phone" aria-hidden="true"></i><span>SOS 112</span></a>
    </div>
  </div>
  <nav id="main-nav" aria-label="Main">
    <div class="nav-inner">
      <a href="#/" data-route="home"><i class="fa-solid fa-house" aria-hidden="true"></i><span data-i18n="nav.home">Home</span></a>
      <a href="#/alerts" data-route="alerts"><i class="fa-solid fa-bell" aria-hidden="true"></i><span data-i18n="nav.alerts">Alerts</span><em id="nav-alert-count"></em></a>
      <a href="#/map" data-route="map"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i><span data-i18n="nav.map">Live Map</span></a>
      <a href="#/help" data-route="help"><i class="fa-solid fa-hand-holding-medical" aria-hidden="true"></i><span data-i18n="nav.help">Get Help</span></a>
      <a href="#/plan" data-route="plan"><i class="fa-solid fa-clipboard-list" aria-hidden="true"></i><span data-i18n="nav.plan">My Plan</span></a>
      <a href="#/states" data-route="states" class="nav-extra"><i class="fa-solid fa-flag" aria-hidden="true"></i><span data-i18n="nav.states">States</span></a>
      <a href="#/guide" data-route="guide" class="nav-extra"><i class="fa-solid fa-book-medical" aria-hidden="true"></i><span data-i18n="nav.guide">Safety Guide</span></a>
    </div>
  </nav>
</header>

<main id="main" tabindex="-1"></main>

<button id="emergency-fab" class="emergency-fab" type="button" aria-haspopup="dialog">
  <i class="fa-solid fa-kit-medical" aria-hidden="true"></i><span data-i18n="hdr.emergency">Emergency</span>
</button>

<footer id="site-footer">
  <div class="footer-inner">
    <div data-i18n="footer.note">AegisAI shows official public data in simple language. In an emergency always follow instructions from your local authorities and call 112.</div>
    <div class="sources">Data: NDMA SACHET (IMD, CWC, SDMAs) · USGS · GDACS · Open-Meteo · RainViewer · © OpenStreetMap contributors · Google Maps</div>
  </div>
</footer>

<div id="modal-root"></div>
<div id="emergency-root"></div>
<div id="toast-root" aria-live="polite"></div>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js"></script>
<script src="/static/i18n.js?v=1"></script>
<script src="/static/core.js?v=6"></script>
<script src="/static/notify.js?v=2"></script>
<script src="/static/emergency.js?v=1"></script>
<script src="/static/app.js?v=5"></script>
<script src="/static/map.js?v=5"></script>
<script src="/static/help.js?v=5"></script>
<script src="/static/guide.js?v=5"></script>
<script src="/static/plan.js?v=1"></script>
</body>
</html>`
