# ⚡ PerfDebugger - Chrome Extension

Frontend performance debugger. Measures Core Web Vitals, detects component re-renders (React/Vue/Angular), flags slow resources, and tracks memory usage in real-time. Free and 100% local.

## 🚀 Installation (Developer Mode)

To try the extension locally:

1. Open Chrome and go to `chrome://extensions/`
2. Enable **"Developer mode"** (top-right toggle)
3. Click **"Load unpacked"**
4. Select this project's folder
5. The extension will appear in your toolbar

## 🧪 How to test

1. Open any website (e.g. https://github.com, https://news.ycombinator.com)
2. Click the extension icon (⚡)
3. You'll see the metrics in real-time (updates stream in as they're collected)
4. On a React/Vue/Angular app, interact with the page to see re-render counts
5. Click 📈 for the dashboard, ⚙️ for settings

## 📁 Project structure

```
.
├── manifest.json               # Extension config (MV3)
├── icons/                      # 16/48/128px icons
├── src/
│   ├── shared/
│   │   ├── settings.js         # Defaults, thresholds, storage + export helpers
│   │   └── page.css            # Styles for full-page views
│   ├── content/
│   │   ├── content.js          # Collects metrics from the page (isolated world)
│   │   └── render-tracker.js   # React/Vue/Angular re-render detection (MAIN world)
│   ├── popup/                  # Toolbar popup
│   ├── dashboard/              # Full-page dashboard (all tracked pages)
│   ├── options/                # Settings page (thresholds, retention, toggles)
│   └── background/
│       └── background.js       # Service worker (retention cleanup)
├── store-assets/               # Chrome Web Store screenshots + promo tile
├── PAGE.html                   # Project page for monydevelop.me
├── PRIVACY_POLICY.html         # Privacy policy for monydevelop.me
├── STORE_LISTING.md            # Copy for the Web Store listing
├── PUBLISHING_GUIDE.md         # Step-by-step submission guide
└── scripts/publish.sh          # Builds dist/perf-debugger-<version>.zip
```

## 📊 Features (v1.0)

- ✅ **LCP / FCP / CLS / INP / TTFB** — real-time Core Web Vitals
- ✅ **Memory** — JS heap usage (Chrome only) + sustained-growth leak alerts
- ✅ **Slow resources** — network requests above a configurable cutoff (default 1s)
- ✅ **Re-render detection** — per-component re-render counts for React (16+), Vue 2/3 and Angular (dev builds)
- ✅ **History** — per-URL sparklines over the retention window
- ✅ **Dashboard** — every tracked page with trends, median and p75, sort/filter, per-page delete
- ✅ **Export** — JSON and CSV, per page (popup) or all pages (dashboard)
- ✅ **Settings** — thresholds, slow-request cutoff, retention (1–30 days), re-render toggle

### How re-render detection works

`render-tracker.js` runs in the page's MAIN world (Chrome 111+) and posts per-component deltas to `content.js` once per second via `window.postMessage`.

- **React** — finds fiber roots from DOM elements (`__reactFiber$…`), detects commits by polling `root.current` once per frame, and counts components with the `PerformedWork` flag (skipping bailed-out subtrees, like React DevTools). It deliberately does **not** install `__REACT_DEVTOOLS_GLOBAL_HOOK__`, so React DevTools keeps working. Works in production builds.
- **Vue 3** — attaches an `updated` hook to each component instance (`instance.u`), found from `container._vnode`. **Vue 2** — subscribes to `hook:updated` on each instance. Both work in production builds.
- **Angular** — uses the dev-mode profiler (`ng.ɵsetProfiler`, `TemplateUpdateStart`). Production builds strip it; the popup says so.

## 🗺️ Roadmap

### v0.2 — shipped
- [x] Local history, sparkline charts, memory-leak alerts, JSON export

### v0.3 — shipped
- [x] Re-render detection (React/Vue/Angular)
- [x] CSV export
- [x] Configurable thresholds

### v1.0 — current
- [x] Dashboard (local, inside the extension — no backend)
- [x] Chrome Web Store ready (see [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md))

### Separate project
- AI-powered performance suggestions will ship as a **separate free extension**.

## 💰 Pricing

**Free — everything.** No account, no premium tier.

## 📦 Packaging

```bash
./scripts/publish.sh --clean   # → dist/perf-debugger-<version>.zip
```

Then follow [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md).

## 🐛 Debugging

If something isn't working:

1. Go to `chrome://extensions/`
2. Find PerfDebugger
3. Click "Errors" (if any)
4. Click "service worker" to see background logs
5. Right-click the popup → "Inspect" to see popup logs

## 📝 Technical notes

- **Manifest V3** - Latest version (required by Chrome)
- **Minimum Chrome:** 111 (MAIN-world content scripts)
- **No backend** - Metrics in `chrome.storage.local`, settings in `chrome.storage.sync`
- **No external dependencies** - Pure vanilla JS, no remote code
- **Permissions:** `storage`, `alarms`, host access (`<all_urls>`)

## 📄 License

[MIT](LICENSE) © 2026 Monica Avila

## 📬 Support

support@monydevelop.me
