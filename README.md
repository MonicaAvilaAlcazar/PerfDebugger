# ⚡ PerfDebugger - Chrome Extension

Frontend performance debugger. Measures Core Web Vitals, detects slow resources, and tracks memory usage in real-time.

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

## 📁 Project structure

```
.
├── manifest.json           # Extension config
├── icons/                  # 16/48/128px icons
├── src/
│   ├── content/
│   │   └── content.js      # Collects metrics from the page
│   ├── popup/
│   │   ├── popup.html      # Popup UI
│   │   ├── popup.css       # Styles
│   │   └── popup.js        # Popup logic
│   └── background/
│       └── background.js   # Service worker (cleanup)
```

## 📊 Current metrics (v0.1)

- ✅ **LCP** - Largest Contentful Paint
- ✅ **FCP** - First Contentful Paint
- ✅ **CLS** - Cumulative Layout Shift
- ✅ **INP** - Interaction to Next Paint
- ✅ **TTFB** - Time to First Byte
- ✅ **Memory** - JS Heap usage (Chrome only)
- ✅ **Slow Resources** - Network requests > 1s

## 🗺️ Roadmap

### v0.2 (coming weeks)
- [ ] Local history (last 7 days)
- [ ] Performance-over-time chart (Chart.js)
- [ ] Visual memory-leak alerts

### v0.3 (Premium tier)
- [ ] Re-render detection (React/Vue/Angular)
- [ ] Report export (JSON/CSV)
- [ ] Stripe integration for payments

### v1.0 (monetization)
- [ ] Publish to the Chrome Web Store ($5 one-time fee)
- [ ] Paywall for premium features
- [ ] Web dashboard (optional)

## 💰 Proposed business model

**Free:**
- Real-time Core Web Vitals
- Slow-resources detection
- 1 day of history

**Premium ($9/month):**
- Everything above
- 7 days of history
- Charts and trends
- Memory-leak alerts
- Data export

## 🛠️ Next development steps

1. **Test on real sites** - Install and try on different sites
2. **Iterate the UI** - Improve based on what's missing
3. **Add history** - Use chrome.storage to keep multiple sessions
4. **Chart.js** - Add visual charts
5. **Publish to the Chrome Web Store** - Validate the market

## 🐛 Debugging

If something isn't working:

1. Go to `chrome://extensions/`
2. Find PerfDebugger
3. Click "Errors" (if any)
4. Click "service worker" to see background logs
5. Right-click the popup → "Inspect" to see popup logs

## 📝 Technical notes

- **Manifest V3** - Latest version (required by Chrome)
- **No backend** - Everything local for now (chrome.storage.local)
- **No external dependencies** - Pure vanilla JS
- **Size:** ~20KB total (without icons)
