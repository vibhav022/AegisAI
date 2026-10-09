import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { STATES, SENDER_STATE, STATE_ALIASES } from './data/states'
import { page } from './page'
import { manifest, icon, serviceWorker } from './pwa'

type Bindings = { GOOGLE_MAPS_API_KEY?: string }
const app = new Hono<{ Bindings: Bindings }>()
app.use('/api/*', cors())

const UA = 'AegisAI-DisasterIntelligence/2.0 (public safety dashboard)'

// ---------- edge cache helper (Cloudflare Cache API, no-op if unavailable) ----------
// Every fresh result is also stored under a long-lived "stale" key, so if a source goes down
// we can keep serving the last good copy and tell the user how old it is.
const cacheReq = (k: string) => new Request('https://cache.aegis.local/' + encodeURIComponent(k))
async function cachePut(cache: Cache | undefined, key: string, data: unknown, ttl: number) {
  if (!cache) return
  try {
    await cache.put(cacheReq(key), new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${ttl}` } }))
  } catch {}
}
async function cachedWithStale(key: string, ttl: number, producer: () => Promise<unknown>): Promise<{ data: any; stale: boolean; error?: string }> {
  const cache = (globalThis as any).caches?.default as Cache | undefined
  if (cache) {
    try { const hit = await cache.match(cacheReq(key)); if (hit) return { data: await hit.json(), stale: false } } catch {}
  }
  try {
    const data = await producer()
    await Promise.all([cachePut(cache, key, data, ttl), cachePut(cache, 'stale-' + key, data, 86400 * 2)])
    return { data, stale: false }
  } catch (e: any) {
    if (cache) {
      try { const old = await cache.match(cacheReq('stale-' + key)); if (old) return { data: await old.json(), stale: true, error: String(e?.message || e) } } catch {}
    }
    throw e
  }
}
async function cached(key: string, ttl: number, producer: () => Promise<unknown>) {
  return (await cachedWithStale(key, ttl, producer)).data
}

async function getJSON(url: string, init: RequestInit = {}, timeout = 15000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, headers: { 'User-Agent': UA, Accept: 'application/json', ...(init.headers || {}) } })
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`)
    return await r.json()
  } finally { clearTimeout(t) }
}
async function getText(url: string, timeout = 15000) {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeout)
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'Mozilla/5.0 ' + UA } })
    if (!r.ok) throw new Error(`${r.status} from ${new URL(url).host}`)
    return await r.text()
  } finally { clearTimeout(t) }
}

const decode = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()
const tag = (xml: string, name: string) => { const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`)); return m ? decode(m[1]) : '' }

// ---------- alert classification (NDMA SACHET RSS has no severity/type fields) ----------
function classify(text: string) {
  const t = text.toLowerCase()
  const has = (...k: string[]) => k.some(x => t.includes(x))
  let type = 'Weather'
  if (has('earthquake', 'भूकंप')) type = 'Earthquake'
  else if (has('cyclone', 'चक्रवात', 'depression over')) type = 'Cyclone'
  else if (has('tsunami')) type = 'Tsunami'
  else if (has('landslide', 'भूस्खलन')) type = 'Landslide'
  else if (has('avalanche', 'हिमस्खलन')) type = 'Avalanche'
  else if (has('flood', 'river ', 'बाढ़', 'नदी', 'inundation', 'water level', 'বন্যা', 'নদী', 'వరద', 'पूर')) type = 'Flood'
  else if (has('sea surge', 'high waves', 'swell', 'అలల', 'fishermen', 'मछुआरे', 'మత్స్యకారు')) type = 'Sea / coastal'
  else if (has('heat wave', 'heatwave', 'hot ', 'लू', 'गर्म')) type = 'Heatwave'
  else if (has('cold wave', 'शीतलहर')) type = 'Cold wave'
  else if (has('fog', 'कोहरा')) type = 'Fog'
  else if (has('lightning', 'thunder', 'वज्रपात', 'गर्जन', 'बिजली', 'आंधी', 'పిడుగు', 'ఉరుము', 'বজ্র', 'विजां', 'मेघगर्जना')) type = 'Thunderstorm'
  else if (has('rain', 'बारिश', 'वर्षा', 'shower', 'వర్షం', 'বৃষ্টি', 'पाऊस', 'पावसा')) type = 'Heavy rain'
  else if (has('wind', 'हवा')) type = 'Strong wind'

  let severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' = 'Moderate'
  if (has('extreme', 'red alert', 'highest flood', 'unprecedented', 'very severe', 'extremely heavy', 'अत्यंत भारी')) severity = 'Extreme'
  else if (has('severe', 'heavy to very heavy', 'very heavy', 'गंभीर', 'अति तीव्र', 'তীব্র বন্যা', 'danger level', 'orange', 'gusty wind (50', '60 km', 'अति भारी', 'तेज़ बारिश')) severity = 'Severe'
  else if (has('light ', 'isolated', 'above normal', 'हल्की', 'कहीं-कहीं')) severity = 'Minor'
  if (type === 'Thunderstorm' && has('moderate thunderstorm', 'मध्यम दर्जे')) severity = 'Moderate'
  if (type === 'Flood' && has('severe flood')) severity = 'Severe'
  return { type, severity }
}

function detectStates(text: string, sender: string) {
  const found = new Set<string>()
  const t = text.toLowerCase()
  for (const [alias, code] of STATE_ALIASES) if (t.includes(alias)) found.add(code)
  // Issuing office (e.g. "IMD Patna", "Andhra Pradesh SDMA") also tells us the state
  const s = sender.toLowerCase()
  for (const [alias, code] of STATE_ALIASES) if (s.includes(alias)) found.add(code)
  for (const [city, code] of Object.entries(SENDER_STATE)) if (s.includes(city)) found.add(code)
  return [...found]
}

async function loadAlerts() {
  const xml = await getText('https://sachet.ndma.gov.in/cap_public_website/rss/rss_india.xml', 20000)
  const items = xml.split('<item>').slice(1).map(chunk => {
    const title = tag(chunk, 'title')
    const author = tag(chunk, 'author')
    const sender = (author.match(/\(([^)]+)\)/)?.[1] || author).trim()
    const id = tag(chunk, 'guid')
    const pub = tag(chunk, 'pubDate')
    const { type, severity } = classify(title)
    const english = !/[\u0900-\u0DFF]/.test(title)
    return { id, title, sender, type, severity, english, states: detectStates(title, sender), published: pub ? new Date(pub).toISOString() : null, source: 'NDMA SACHET (CAP)', link: `https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${id}` }
  })
  return { updated: new Date().toISOString(), count: items.length, items }
}

async function loadQuakes() {
  const start = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10)
  const d: any = await getJSON(`https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&minlatitude=5&maxlatitude=38&minlongitude=67&maxlongitude=98&minmagnitude=2.5&starttime=${start}&orderby=time`)
  return {
    updated: new Date().toISOString(),
    items: d.features.map((f: any) => ({
      id: f.id, mag: f.properties.mag, place: f.properties.place, time: new Date(f.properties.time).toISOString(),
      lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], depth: f.geometry.coordinates[2],
      url: f.properties.url, tsunami: f.properties.tsunami, felt: f.properties.felt, source: 'USGS',
    })),
  }
}

async function loadGdacs() {
  const to = new Date().toISOString().slice(0, 10)
  const from = new Date(Date.now() - 45 * 864e5).toISOString().slice(0, 10)
  const d: any = await getJSON(`https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH?eventlist=EQ;TC;FL;DR;WF;VO&fromDate=${from}&toDate=${to}&alertlevel=Green;Orange;Red`)
  const names: Record<string, string> = { EQ: 'Earthquake', TC: 'Cyclone', FL: 'Flood', DR: 'Drought', WF: 'Wildfire', VO: 'Volcano' }
  return {
    updated: new Date().toISOString(),
    items: (d.features || []).filter((f: any) => { const [x, y] = f.geometry.coordinates; return x > 60 && x < 100 && y > -5 && y < 40 }).map((f: any) => {
      const p = f.properties
      return { id: `${p.eventtype}-${p.eventid}`, type: names[p.eventtype] || p.eventtype, name: p.name, level: p.alertlevel, country: p.country, from: p.fromdate, to: p.todate, current: p.iscurrent === 'true' || p.iscurrent === true, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], severity: p.severitydata?.severitytext, url: p.url?.report, source: 'GDACS (UN/EC)' }
    }),
  }
}

async function loadStateWeather() {
  const lat = STATES.map(s => s.lat).join(',')
  const lon = STATES.map(s => s.lon).join(',')
  const [w, a]: any[] = await Promise.all([
    getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max&timezone=Asia%2FKolkata&forecast_days=3`),
    getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`).catch(() => null),
  ])
  const arr = Array.isArray(w) ? w : [w]
  const aq = a ? (Array.isArray(a) ? a : [a]) : []
  return {
    updated: new Date().toISOString(),
    items: STATES.map((s, i) => ({ code: s.code, current: arr[i]?.current, daily: arr[i]?.daily, aqi: aq[i]?.current || null })),
  }
}

// ---------------------------------- API ----------------------------------
app.get('/api/config', c => c.json({ googleMapsKey: c.env?.GOOGLE_MAPS_API_KEY || null }))
app.get('/api/states', c => c.json(STATES))

app.get('/api/overview', async c => {
  const settle = async (key: string, ttl: number, fn: () => Promise<unknown>) => {
    try {
      const r = await cachedWithStale(key, ttl, fn)
      return { ok: true, stale: r.stale, error: r.error, ttl, data: r.data }
    } catch (e: any) { return { ok: false, ttl, error: String(e?.message || e) } }
  }
  const [alerts, quakes, gdacs, weather] = await Promise.all([
    settle('alerts-v2', 180, loadAlerts), settle('quakes-v2', 300, loadQuakes), settle('gdacs-v2', 600, loadGdacs), settle('stateweather-v2', 600, loadStateWeather),
  ])
  c.header('Cache-Control', 'no-store')
  return c.json({ generated: new Date().toISOString(), alerts, quakes, gdacs, weather })
})

app.get('/api/alerts', async c => { try { return c.json(await cached('alerts-v2', 180, loadAlerts)) } catch (e: any) { return c.json({ error: e.message }, 502) } })
app.get('/api/earthquakes', async c => { try { return c.json(await cached('quakes-v2', 300, loadQuakes)) } catch (e: any) { return c.json({ error: e.message }, 502) } })

// Full CAP detail (severity, instructions, expiry, polygon) for one alert
async function capDetail(id: string, withPolygons: boolean) {
  const base = await cached('cap-' + id, 900, async () => {
    const xml = await getText(`https://sachet.ndma.gov.in/cap_public_website/FetchXMLFile?identifier=${id}`)
    const info = (xml.split('<cap:info>')[1] || '')
    const g = (n: string) => tag(info, 'cap:' + n)
    return {
      id, sender: tag(xml, 'cap:sender'), sent: tag(xml, 'cap:sent'), msgType: tag(xml, 'cap:msgType'), event: g('event'), urgency: g('urgency'), severity: g('severity'),
      certainty: g('certainty'), effective: g('effective'), onset: g('onset'), expires: g('expires'), headline: g('headline'), description: g('description'),
      instruction: g('instruction'), area: g('areaDesc'), language: g('language'),
    }
  })
  if (!withPolygons) return base
  const polygons = await cached('poly-' + id, 3600, async () => {
    try {
      const pxml = await getText(`https://sachet.ndma.gov.in/cap_public_website/FetchPolygonXMLFile?identifier=${id}`)
      return [...pxml.matchAll(/<polygon>([\s\S]*?)<\/polygon>/g)].slice(0, 40).map(m => {
        const pts = m[1].trim().split(/\s+/).map(p => p.split(',').map(Number))
        const step = Math.max(1, Math.floor(pts.length / 150)) // thin points to keep payload light
        return pts.filter((_, i) => i % step === 0).map(([la, lo]) => [Math.round(la * 1e4) / 1e4, Math.round(lo * 1e4) / 1e4])
      })
    } catch { return [] }
  })
  return { ...base, polygons }
}
app.get('/api/alert/:id', async c => {
  const id = c.req.param('id').replace(/[^0-9]/g, '')
  if (!id) return c.json({ error: 'bad id' }, 400)
  try { return c.json(await capDetail(id, true)) } catch (e: any) { return c.json({ error: e.message }, 502) }
})
// Batch: expiry / area / instructions for up to 20 alerts (used by the timeline). No polygons.
app.get('/api/alerts/details', async c => {
  const ids = (c.req.query('ids') || '').split(',').map(x => x.replace(/[^0-9]/g, '')).filter(Boolean).slice(0, 20)
  const out: Record<string, unknown> = {}
  await Promise.all(ids.map(async id => { try { out[id] = await capDetail(id, false) } catch { out[id] = null } }))
  return c.json(out)
})

// Point weather + air quality
app.get('/api/weather', async c => {
  const lat = Number(c.req.query('lat')), lon = Number(c.req.query('lon'))
  if (!isFinite(lat) || !isFinite(lon)) return c.json({ error: 'lat/lon required' }, 400)
  const k = `${lat.toFixed(2)},${lon.toFixed(2)}`
  try {
    return c.json(await cached('wx-' + k, 600, async () => {
      const [w, a]: any[] = await Promise.all([
        getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_gusts_10m&hourly=precipitation_probability,precipitation,temperature_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_gusts_10m_max,uv_index_max&timezone=Asia%2FKolkata&forecast_days=5&forecast_hours=24`),
        getJSON(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10&timezone=Asia%2FKolkata`).catch(() => null),
      ])
      return { ...w, aqi: a?.current || null }
    }))
  } catch (e: any) { return c.json({ error: e.message }, 502) }
})

// Nearby emergency facilities (OpenStreetMap via Overpass, with mirror fallback)
const FACILITY: Record<string, string> = {
  hospital: 'nwr["amenity"~"^(hospital|clinic)$"]',
  police: 'nwr["amenity"="police"]',
  fire: 'nwr["amenity"="fire_station"]',
  shelter: 'nwr["emergency"="assembly_point"];nwr["amenity"~"^(shelter|community_centre|social_facility)$"];nwr["social_facility"="shelter"]',
  pharmacy: 'nwr["amenity"="pharmacy"]',
}
app.get('/api/nearby', async c => {
  const lat = Number(c.req.query('lat')), lon = Number(c.req.query('lon'))
  const type = c.req.query('type') || 'hospital'
  const radius = Math.min(Number(c.req.query('radius')) || 6000, 20000)
  if (!isFinite(lat) || !isFinite(lon) || !FACILITY[type]) return c.json({ error: 'lat, lon, type required' }, 400)
  const sel = FACILITY[type].split(';').map(s => `${s}(around:${radius},${lat},${lon});`).join('')
  const q = `[out:json][timeout:20];(${sel});out center tags 120;`
  const mirrors = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter', 'https://overpass.private.coffee/api/interpreter']
  try {
    const data: any = await cached(`near-${type}-${lat.toFixed(3)},${lon.toFixed(3)}-${radius}`, 3600, async () => {
      let last: any
      for (const m of mirrors) {
        try {
          const d: any = await getJSON(m, { method: 'POST', body: 'data=' + encodeURIComponent(q), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }, 22000)
          return d.elements.map((e: any) => {
            const la = e.lat ?? e.center?.lat, lo = e.lon ?? e.center?.lon, t = e.tags || {}
            const addr = [t['addr:housenumber'], t['addr:street'], t['addr:suburb'] || t['addr:district'], t['addr:city']].filter(Boolean).join(', ')
            return { id: `${e.type}/${e.id}`, name: t.name || t['name:en'] || null, lat: la, lon: lo, phone: t.phone || t['contact:phone'] || t['emergency:phone'] || null, address: addr || null, emergency: t.emergency === 'yes', beds: t.beds || null, kind: t.amenity || t.emergency || t.social_facility, website: t.website || t['contact:website'] || null, hours: t.opening_hours || null }
          }).filter((x: any) => x.lat && x.lon)
        } catch (e) { last = e }
      }
      throw last
    })
    return c.json({ items: data, source: 'OpenStreetMap contributors (Overpass API)' })
  } catch (e: any) { return c.json({ error: 'Nearby search is busy, please retry. ' + (e?.message || '') }, 502) }
})

// Geocoding (Nominatim, India only)
app.get('/api/geocode', async c => {
  const q = (c.req.query('q') || '').trim()
  if (q.length < 2) return c.json([])
  try {
    const isPin = /^\d{6}$/.test(q)
    const d: any = await cached('geo-' + q.toLowerCase(), 86400, async () => {
      const base = 'https://nominatim.openstreetmap.org/search?format=json&countrycodes=in&limit=6&addressdetails=1'
      const opts = { headers: { 'Accept-Language': 'en' } }
      if (isPin) {
        const r: any = await getJSON(`${base}&postalcode=${q}`, opts)
        if (r.length) return r
      }
      return getJSON(`${base}&q=${encodeURIComponent(q)}`, opts)
    })
    return c.json(d.map((r: any) => ({ name: r.display_name, short: (isPin ? (r.address?.suburb || r.address?.city || r.address?.town || r.address?.village || r.address?.county || q) + ' ' + q : r.name) || r.display_name.split(',')[0], lat: Number(r.lat), lon: Number(r.lon), state: r.address?.state || null })))
  } catch (e: any) { return c.json({ error: e.message }, 502) }
})
app.get('/api/reverse', async c => {
  const lat = Number(c.req.query('lat')), lon = Number(c.req.query('lon'))
  if (!isFinite(lat) || !isFinite(lon)) return c.json({ error: 'lat/lon required' }, 400)
  try {
    const r: any = await cached(`rev-${lat.toFixed(3)},${lon.toFixed(3)}`, 86400, () => getJSON(`https://nominatim.openstreetmap.org/reverse?format=json&zoom=14&addressdetails=1&lat=${lat}&lon=${lon}`, { headers: { 'Accept-Language': 'en' } }))
    const a = r.address || {}
    return c.json({ label: [a.suburb || a.neighbourhood || a.village || a.town, a.city || a.state_district || a.county].filter(Boolean).join(', ') || r.display_name, state: a.state || null, country: a.country_code })
  } catch (e: any) { return c.json({ error: e.message }, 502) }
})

// Road route (OSRM) for distance / ETA
app.get('/api/route', async c => {
  const { from, to } = c.req.query()
  const mode = c.req.query('mode') === 'foot' ? 'foot' : 'car'
  const ok = (s?: string) => !!s && /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/.test(s)
  if (!ok(from) || !ok(to)) return c.json({ error: 'from/to as lat,lon' }, 400)
  const [fl, fo] = from!.split(','), [tl, to2] = to!.split(',')
  try {
    const d: any = await getJSON(`https://routing.openstreetmap.de/routed-${mode}/route/v1/driving/${fo},${fl};${to2},${tl}?overview=full&geometries=geojson&steps=true`)
    const r = d.routes?.[0]
    if (!r) return c.json({ error: 'No route found' }, 404)
    const steps = r.legs[0].steps.filter((s: any) => s.distance > 30 || s.maneuver.type === 'arrive').slice(0, 25).map((s: any) => ({ text: describeStep(s), distance: s.distance }))
    return c.json({ distance: r.distance, duration: r.duration, geometry: r.geometry, steps, source: 'OSRM / OpenStreetMap' })
  } catch (e: any) { return c.json({ error: e.message }, 502) }
})
function describeStep(s: any) {
  const m = s.maneuver, road = s.name ? ` onto ${s.name}` : ''
  if (m.type === 'depart') return `Start${s.name ? ' on ' + s.name : ''}`
  if (m.type === 'arrive') return 'Arrive at destination'
  if (m.type === 'roundabout' || m.type === 'rotary') return `At the roundabout take exit ${m.exit || ''}${road}`
  const mod = m.modifier ? m.modifier.replace('slight ', 'slightly ').replace('sharp ', 'sharply ') : ''
  if (m.type === 'turn' || m.type === 'end of road' || m.type === 'fork') return `Turn ${mod}${road}`.replace('Turn straight', 'Continue straight')
  if (m.type === 'new name' || m.type === 'continue') return `Continue${road}`
  if (m.type === 'merge' || m.type === 'on ramp') return `Merge ${mod}${road}`
  return `${m.type[0].toUpperCase() + m.type.slice(1)} ${mod}${road}`
}

app.get('/api/health', c => c.json({ ok: true, time: new Date().toISOString() }))
app.all('/api/*', c => c.json({ error: 'Not found' }, 404))

// ---------- PWA (installable app + offline shell) ----------
app.get('/manifest.webmanifest', c => c.body(JSON.stringify(manifest), 200, { 'Content-Type': 'application/manifest+json' }))
app.get('/icon.svg', c => c.body(icon, 200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' }))
app.get('/sw.js', c => c.body(serviceWorker, 200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }))

app.get('*', c => c.html(page()))

export default app
