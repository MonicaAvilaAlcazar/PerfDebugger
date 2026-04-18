# PerfDebugger

**Real-time Web Performance for Developers**

Stop waiting 60 seconds for Lighthouse audits. Get instant Core Web Vitals and performance insights as you develop.

> 💡 **Available soon on Chrome Web Store** — currently in review

---

## 🎯 What it does

PerfDebugger is a lightweight Chrome extension that measures web performance in real-time. Perfect for frontend developers who need to debug performance issues without breaking their flow.

---

## ✨ Features

### ⚡ Real-time Core Web Vitals
- **LCP** — Largest Contentful Paint
- **FCP** — First Contentful Paint
- **CLS** — Cumulative Layout Shift
- **INP** — Interaction to Next Paint
- **TTFB** — Time to First Byte

### 💾 Memory Monitoring
Track JS heap usage and detect potential memory leaks.

### ⚠️ Slow Resource Detection
Automatically flags network requests taking over 1 second — sorted by impact.

### 🎨 Color-coded Status
Green/yellow/red indicators based on Google's official thresholds. Instant visual feedback.

---

## 🆚 Why not just use Lighthouse?

Lighthouse is great for formal audits, but it's slow (30-60s) and simulated. PerfDebugger gives you:

| | Lighthouse | PerfDebugger |
|---|---|---|
| **Speed** | 30-60 seconds | Instant |
| **Data** | Simulated device | Real device |
| **Scope** | Full audit | Just performance |
| **Best for** | CI/CD, formal audits | Daily debugging |

Think of it as: Lighthouse for audits, PerfDebugger for daily debugging.

---

## 👥 Who is it for?

- Frontend developers debugging performance issues
- Engineers optimizing Core Web Vitals for SEO
- QA engineers monitoring production sites
- Technical leads reviewing team projects

---

## 🔒 Privacy First

- **100% local** — all data stays on your device
- **No tracking**, no analytics, no external servers
- **No account required**
- Data auto-deleted after 7 days

---

## 🛠️ Framework Agnostic

Works with any website:
- React, Vue, Angular, Svelte
- Next.js, Nuxt, SvelteKit
- Static sites, SPAs, SSR
- Any framework — or no framework at all

---

## 🗺️ Roadmap

**v0.1** (current) — Core functionality
- ✅ Core Web Vitals
- ✅ Slow resources
- ✅ Memory monitoring

**v0.2** (coming soon)
- 📊 Historical performance graphs
- 🔔 Memory leak alerts
- 📥 Export reports

**v1.0** (future)
- 🔍 Re-render detection (React, Vue, Angular)
- 🤖 AI-powered performance suggestions

---

## 💬 Feedback

This is v0.1 — a minimal, free MVP. Actively developing based on user feedback.

Have a suggestion? Found a bug? [Contact me](mailto:avilamalcazar@gmail.com)

---

## 🔐 Privacy Policy

*Last updated: April 18, 2026*

### Overview
PerfDebugger is a Chrome extension that measures web performance metrics. Your privacy is important to us.

### Data Collection
PerfDebugger does **NOT** collect, transmit, or store any personal data outside of your local browser.

### What data is processed locally:
- Performance metrics (LCP, FCP, CLS, INP, TTFB)
- Memory usage of the pages you visit
- URLs and hostnames of pages you visit (for organization only)
- Resource loading times

### Where is the data stored?
All data is stored locally in your browser using the `chrome.storage.local` API. Nothing is transmitted to external servers.

### Data Retention
Metrics older than 7 days are automatically deleted.

### Third Parties
We do not use third-party analytics, tracking, or advertising services.

### Permissions Explained
- **`storage`** — To save metrics locally
- **`activeTab`** — To read performance data from the current tab
- **`alarms`** — To schedule cleanup of old data
- **`<all_urls>`** — To measure performance on any website

### Contact
Questions? Email: **avilamalcazar@gmail.com**

### Changes to this Policy
We may update this policy. Last update shown above.

---

## 📬 Contact

Made with ⚡ by :emoji de mujer desarrolladora.:

Email: avilamalcazar@gmail.com

---

*© 2026 PerfDebugger. All rights reserved.*