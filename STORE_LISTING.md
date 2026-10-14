# Chrome Web Store Listing — PerfDebugger

Copy-paste this content directly into the Chrome Web Store developer console.

---

## Name

```
PerfDebugger — Real-time Web Performance
```

(Max 75 characters. Current: 40. Matches `name` in [manifest.json](manifest.json).)

---

## Summary (short description)

```
Real-time Core Web Vitals, re-render detection, slow-resource and memory-leak alerts for frontend developers. 100% local.
```

(Max 132 characters. Current: 121. Matches `description` in [manifest.json](manifest.json).)

---

## Description (long description)

```
PerfDebugger shows Core Web Vitals as you browse — instantly. No 60-second Lighthouse audits. No simulated devices. Just real metrics from your real browser, updated live.

Built for frontend developers who debug performance daily.

WHAT YOU GET
• Real-time Core Web Vitals: LCP, FCP, CLS, INP, TTFB — color-coded good / needs improvement / poor
• Re-render detection for React, Vue and Angular — see which components re-render and how often, live
• Automatic slow-resource detection (flags requests over 1 second — configurable)
• Live memory monitoring with JS heap tracking and memory-leak alerts
• Dashboard with every page you've tested: trends, median and p75, sortable and filterable
• Per-URL history with sparkline trend charts
• Export a single page or everything as CSV or JSON
• Configurable thresholds, slow-request cutoff and data retention
• Framework-agnostic — works on any website
• 100% local, no tracking, no servers, no account

RE-RENDER DETECTION
Interact with your app and PerfDebugger shows the components that re-render the most. React and Vue work on development and production builds; Angular requires a development build (ng serve). PerfDebugger reads framework internals without installing a DevTools hook, so React DevTools and Vue DevTools keep working normally.

WHY NOT LIGHTHOUSE?
Lighthouse is great for formal audits and CI pipelines — but it takes 30-60 seconds per run, uses simulated throttling, and doesn't measure real interactions in navigation mode. PerfDebugger is the opposite: instant results, real device data, always visible. Different tools for different jobs.

PRIVACY FIRST
All metrics are stored locally in your browser. Nothing leaves your machine. No analytics, no tracking, no accounts. Old data is deleted automatically (7 days by default).

PERMISSIONS
• storage — save metrics and your settings locally
• alarms — schedule automatic cleanup of old data
• Access to all websites — run the measurement script on the pages you visit (it only reads performance data, never page content)

Free and open source (MIT). No sign-up required.
Source code: https://github.com/MonicaAvilaAlcazar/PerfDebugger

Support: support@monydevelop.me
```

---

## Category

```
Developer Tools
```

---

## Language

```
English
```

---

## Keywords / search tags

Useful when filling in additional metadata fields:

```
web performance, core web vitals, LCP, FCP, CLS, INP, TTFB, re-render detection, react performance, vue performance, angular performance, frontend debugging, lighthouse alternative, memory leak detection, performance dashboard, CSV export, developer tools, privacy-first, open source
```

---

## Single-purpose description

(Required under Chrome's single-purpose policy.)

```
PerfDebugger measures and displays real-time web performance metrics — Core Web Vitals, component re-renders, memory usage and slow network requests — for the websites the user visits, to help frontend developers debug performance issues without running a separate audit tool.
```

---

## Permission justifications

Paste each of these into the corresponding field in the **Privacy practices** tab.

| Permission | Justification |
|------------|---------------|
| `storage` | Stores performance metrics and per-page history locally on the user's device (chrome.storage.local), and the user's settings such as metric thresholds (chrome.storage.sync). |
| `alarms` | Schedules an hourly cleanup that deletes stored metrics older than the user's retention period (7 days by default). |
| Host permissions (`<all_urls>`) | The extension's single purpose is measuring the performance of any website the developer is working on, including localhost, staging and production. Its content scripts must run on those pages to read Performance API entries (LCP, CLS, INP, resource timing) and framework render activity, and the popup needs the active tab's URL to show that page's metrics. No page content is read, and nothing is transmitted. |

**Remote code:** Select **"No, I am not using remote code."** All JavaScript is packaged in the extension; there are no external scripts, `eval`, or remotely-fetched code.

---

## Data usage disclosures

For the **Privacy practices → Data usage** section:

- **What user data do you collect?** Leave every category unchecked. The extension processes performance data and page URLs only on the user's device; nothing is transmitted to the developer or any third party, so nothing is "collected" under the Chrome Web Store definition.
- Check all three certifications:
  - I do not sell or transfer user data to third parties, outside of the approved use cases
  - I do not use or transfer user data for purposes that are unrelated to my item's single purpose
  - I do not use or transfer user data to determine creditworthiness or for lending purposes

---

## Privacy Policy URL

```
https://monydevelop.me/projects/perf-debugger/privacy-policy
```

Source: [PRIVACY_POLICY.html](PRIVACY_POLICY.html). Upload it to the personal site at that path before submitting (see Step 2 of [PUBLISHING_GUIDE.md](PUBLISHING_GUIDE.md)).

---

## Homepage URL

```
https://monydevelop.me/projects/perf-debugger
```

Source: [PAGE.html](PAGE.html). Also set as `homepage_url` in [manifest.json](manifest.json).

---

## Support

| Field | Value |
|-------|-------|
| Support email | `support@monydevelop.me` |
| Support URL (optional) | `https://monydevelop.me/projects/perf-debugger#contact` |

Make sure `support@monydevelop.me` is verified as the contact email in **Account → Contact email** of the developer console — Google sends review results there.

---

## Assets

| Field | File |
|-------|------|
| Icon (128×128) | [icons/icon128.png](icons/icon128.png) |
| Screenshot 1 (1280×800) | [store-assets/screenshot-1-hero.png](store-assets/screenshot-1-hero.png) |
| Screenshot 2 (1280×800) | [store-assets/screenshot-4-rerenders.png](store-assets/screenshot-4-rerenders.png) |
| Screenshot 3 (1280×800) | [store-assets/screenshot-5-dashboard.png](store-assets/screenshot-5-dashboard.png) |
| Screenshot 4 (1280×800) | [store-assets/screenshot-2-features.png](store-assets/screenshot-2-features.png) |
| Screenshot 5 (1280×800) | [store-assets/screenshot-3-comparison.png](store-assets/screenshot-3-comparison.png) |
| Small promo tile (440×280) | [store-assets/promo-tile-440x280.png](store-assets/promo-tile-440x280.png) |

All screenshots are 24-bit PNG without alpha, as the store requires. Upload them in the order above — the first one is the most visible.
