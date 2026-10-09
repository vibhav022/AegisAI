# AegisAI — Live Disaster Alerts & Safety for India

## Project Overview
- **Goal**: Official disaster warnings, weather, earthquakes and nearby emergency help for every Indian state and UT, in plain language, built for use during an emergency.
- **Stack**: Hono on Cloudflare Pages (edge API + HTML shell) · vanilla JS · Leaflet + MarkerCluster · Google Maps (optional key) · Font Awesome · Inter + Noto Sans Devanagari
- **Languages**: English, हिन्दी (all UI, guides, kit, status actions and alert summaries)

## Features
### Emergency & safety
- **Emergency mode** (red button on every page, or `#/emergency`): a full-screen, high-contrast panel with
  - a large **Call 112** button, plus 108 / 101 / 100 / 1078
  - **Share my location** and **Send “I am safe”** (Web Share, with SMS/clipboard fallback and a fresh GPS fix)
  - the **nearest hospital, police and fire station**, each with Call and Directions; cached on the device so they still show offline
  - your saved household contacts and medical info
  - "what to do now" steps for your state's current hazard (works offline)
- **SOS 112** in the header keeps its text label on mobile too.
- **My safety plan** (`#/plan`): household contacts, blood group, conditions, medicines, allergies, family meeting point, notes, the emergency kit checklist, and guides ordered by your state's hazards. Everything is stored only on the device; it can be shared and printed.

### Clarity
- **Actionable status card**: one clear action line (e.g. “AQI unhealthy — limit outdoor exertion today”), the reasons behind it, **one primary button** (View safety steps / Make your safety plan) and quiet secondary links.
- **Alert timeline** (`#/alerts`): a timeline view (default) or cards. Each alert has a **New / Updated / Active / Expired** tag with counts, a clear IST timestamp, severity, the affected area (from CAP), validity, the issuing office, a plain-language summary, a **“What should I do?”** box and the official text (with Translate for non-English alerts).
- **Data freshness**: a card on Home plus a details sheet from the header pill. It shows each source (NDMA SACHET, USGS, GDACS, Open-Meteo), whether it is Live, a Saved copy (fallback) or Unavailable, when it last updated, and how often it is checked.
- **Rich empty states**, e.g. “No active warnings in Delhi” with a green shield, “Last checked 1 min ago” and a link to preparedness steps.

### Onboarding & navigation
- **First-use onboarding**: language choice, “Use my current location”, or search by city or **6-digit PIN code**, plus a privacy note (location stays on the device). There is no silent New Delhi default.
- **Mobile header**: brand · location · accessibility · **SOS 112** on one row, and a tappable “99 alerts · Updated now” pill that opens the freshness sheet. The bottom tab bar holds Home, Alerts, Map, Help and My Plan.

### Map (`#/map`)
- **Marker clustering** for earthquakes and GDACS events
- **Bottom sheet** for the selected state or incident, showing its action line, reasons and buttons
- **All India / Near me (50 / 150 / 300 km)** filter with a radius ring, plus a list of events near you
- Layer chips with counts, a **legend toggle**, Streets / Satellite / Terrain, Google Maps tab, rain radar, and saved map preferences
- On mobile, the **controls come before the map** so they are easy to find

### Accessibility & design
- Settings sheet: **Large text**, **High contrast**, **Reduce motion** (follows the OS setting by default), language, notifications
- Each risk level has a **distinct icon and label** (shield = All clear, eye = Be aware, triangle = Be prepared, running person = Take action), so colour is never the only cue
- Screen-reader live regions announce location changes, new alerts and level escalations; focus-trapped dialogs restore focus when closed; skip link; visible keyboard focus rings; focus moves to the page heading on route change; ARIA roles on tabs, switches and radio groups
- Calm neutral palette, with yellow / orange / red used **only** for risk states
- Motion only for meaningful changes: new alerts pulse, the status card flashes on a location change and shakes on escalation, and the bottom sheet rises in
- Standardised cards, spacing and a 3-tier button hierarchy (primary / outline / text)

### Platform
- PWA: installable, offline shell (app, guides, plan, Leaflet and icons cached), last-good API responses kept, and online/offline notices
- Browser notifications for new warnings in your state (while the app is open or in the background)

## API (Hono, edge-cached, stale fallback)
| Path | Description |
|---|---|
| `GET /api/overview` | alerts + quakes + GDACS + weather; each source reports `ok`, `stale`, `ttl`, `updated` |
| `GET /api/alerts`, `/api/alert/:id` | SACHET RSS list / full CAP detail with polygons |
| `GET /api/alerts/details?ids=a,b,…` | batch CAP detail (expiry, area, msgType, instruction) for up to 20 alerts — powers the timeline |
| `GET /api/earthquakes` | USGS, India region, last 30 days |
| `GET /api/weather?lat&lon` | Open-Meteo forecast + air quality |
| `GET /api/nearby?lat&lon&type&radius` | hospital, police, fire, shelter or pharmacy (OSM Overpass) |
| `GET /api/route?from=lat,lon&to=lat,lon&mode=car\|foot` | OSRM route + steps |
| `GET /api/geocode?q` | Nominatim (India), including **6-digit PIN code** lookup; `/api/reverse?lat&lon` |
| `GET /api/states`, `/api/config`, `/api/health` | static data / maps key / health |
| `GET /manifest.webmanifest`, `/sw.js`, `/icon.svg` | PWA |

If a source fails, the API serves the last good copy (kept for 48 h) and marks it `stale: true`. The Data freshness card shows this.

## Data Architecture
- No database. Live public feeds are cached with the Cloudflare Cache API.
- Static data: `src/data/states.ts` (36 states/UTs, hazards, SDMA links) and `public/static/geo/india-states.json`.
- Risk engine (`core.js`): alert severity, earthquake magnitude and age, GDACS level, rain, heat, wind and AQI give one of 4 levels. Each reason keeps its kind, which becomes a specific action line and guide topic.
- Device storage (`localStorage`): `aegis.loc`, `aegis.prefs` (language/large/contrast/motion), `aegis.plan`, `aegis.kit`, `aegis.emNearest`, `aegis.notify`, `aegis.seen`, `aegis.mapPrefs`, `aegis.alertView`.

## Frontend files
`i18n.js` (EN/HI strings) · `core.js` (helpers, prefs, modal/sheet, onboarding, risk, freshness) · `emergency.js` · `notify.js` (PWA, notifications) · `app.js` (router, Home, Alerts timeline, States) · `map.js` · `help.js` · `guide.js` (bilingual guides + kit) · `plan.js` · `style.css`

## Development
```bash
npm install
cp .dev.vars.example .dev.vars   # optional: GOOGLE_MAPS_API_KEY
npm run build
pm2 start ecosystem.config.cjs   # wrangler pages dev on :3000
```

## Deploy
```bash
npx wrangler pages project create webapp --production-branch main
npm run build && npx wrangler pages deploy dist --project-name webapp
# optional: npx wrangler pages secret put GOOGLE_MAPS_API_KEY --project-name webapp
```

## Not yet implemented / next steps
- More state languages (Bengali, Telugu, Marathi, Tamil, Odia…): add a dictionary to `i18n.js`; the guide data supports more columns
- Server-sent Web Push / SMS when the app is fully closed (needs VAPID keys + a D1 subscription table)
- District-level choropleth using CAP polygons
- AI-written plain-language summaries of long CAP descriptions (would need an LLM API key)

## Deployment
- **Platform**: Cloudflare Pages · **Status**: running locally in the sandbox · **Last updated**: 2026-10-09
