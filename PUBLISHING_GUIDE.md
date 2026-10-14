# Publishing Guide — Chrome Web Store

A step-by-step checklist to ship PerfDebugger. Total active work: **~2 hours**. Google review: **1–3 days**.

---

## Overview

| # | Step | Time | Blocker? |
|---|------|------|----------|
| 1 | Create a Chrome Web Store developer account | 15 min | Yes |
| 2 | Publish a Privacy Policy URL | 20 min | Yes |
| 3 | Package the extension into a ZIP | 5 min | Yes |
| 4 | Fill the store listing + upload assets | 30 min | Yes |
| 5 | Submit for review | 2 min | Yes |
| 6 | Launch marketing while you wait | — | No |

Work top-to-bottom. Don't skip — each step unlocks the next.

---

## Step 1 — Developer account (15 min)

1. Go to **https://chrome.google.com/webstore/devconsole**
2. Sign in with your Google account
3. Accept the terms
4. Pay the one-time **$5 USD** developer fee
5. Complete your developer profile

> Tip: if you plan to publish more extensions later, use a dedicated Google account so personal and business stay separate.

---

## Step 2 — Publish the website pages (20 min)

Chrome requires a public privacy-policy URL. Both pages are ready-to-upload, self-contained HTML files (no build step, styled to match https://monydevelop.me/):

| File | Publish at |
|------|-----------|
| [PRIVACY_POLICY.html](PRIVACY_POLICY.html) | `https://monydevelop.me/projects/perf-debugger/privacy-policy` |
| [PAGE.html](PAGE.html) | `https://monydevelop.me/projects/perf-debugger` |

Workflow:

1. Edit the HTML files in this repo — they are the single source of truth.
2. Upload them to the site at the paths above (e.g. as `public/projects/perf-debugger/index.html` and `public/projects/perf-debugger/privacy-policy/index.html` if the site is a static/Vite build).
3. Open both URLs in a private window to confirm they load. The extension's Settings page and `homepage_url` already link to them.
4. **After approval:** replace `REPLACE_WITH_ITEM_ID` in [PAGE.html](PAGE.html) with the real Chrome Web Store item ID so the "Add to Chrome" button works, and re-upload.

---

## Step 3 — Package the extension (1 min)

Run the publish script from the project root:

```bash
./scripts/publish.sh
```

It reads the version from [manifest.json](manifest.json), bundles [manifest.json](manifest.json) + [icons/](icons/) + [src/](src/) into `dist/perf-debugger-<version>.zip`, prints the contents, and fails if anything forbidden (docs, store assets, `.git/`, `node_modules/`) slipped in.

Pass `--clean` to wipe `dist/` first:

```bash
./scripts/publish.sh --clean
```

The generated zip is what you upload in Step 4.

---

## Step 4 — Store listing (30 min)

1. Open **https://chrome.google.com/webstore/devconsole**
2. Click **"New Item"** and upload `dist/perf-debugger-<version>.zip` from Step 3
3. Fill each tab. All copy lives in [STORE_LISTING.md](STORE_LISTING.md) — open it side-by-side and paste:

### Store listing tab
| Field | Source |
|-------|--------|
| Name | "Name" section of [STORE_LISTING.md](STORE_LISTING.md) |
| Summary | "Summary" section |
| Description | "Description" section |
| Category | Developer Tools |
| Language | English |
| Single-purpose description | "Single-purpose description" section |

### Graphics tab
| Asset | File |
|-------|------|
| Icon | [icons/icon128.png](icons/icon128.png) |
| Screenshot 1 | [store-assets/screenshot-1-hero.png](store-assets/screenshot-1-hero.png) |
| Screenshot 2 | [store-assets/screenshot-4-rerenders.png](store-assets/screenshot-4-rerenders.png) |
| Screenshot 3 | [store-assets/screenshot-5-dashboard.png](store-assets/screenshot-5-dashboard.png) |
| Screenshot 4 | [store-assets/screenshot-2-features.png](store-assets/screenshot-2-features.png) |
| Screenshot 5 | [store-assets/screenshot-3-comparison.png](store-assets/screenshot-3-comparison.png) |
| Small promo tile (optional) | [store-assets/promo-tile-440x280.png](store-assets/promo-tile-440x280.png) |

### Privacy tab
- **Privacy Policy URL:** `https://monydevelop.me/projects/perf-debugger/privacy-policy` (from Step 2)
- **Remote code:** "No, I am not using remote code"
- **Permission justifications:** copy from the "Permission justifications" table in [STORE_LISTING.md](STORE_LISTING.md)
- **Data usage disclosures:** answer per the "Data usage disclosures" section of [STORE_LISTING.md](STORE_LISTING.md) (all "No", certify no user data collected)

### Account → Contact email
- Set and verify **support@monydevelop.me** — review results and user reports go there.

### Distribution tab
- Visibility: **Public**
- Regions: **All regions**

---

## Step 5 — Submit (2 min)

1. Click **"Submit for review"**
2. You'll get an email with the result, usually in 1–3 days
3. If rejected, the email lists the exact reason — fix it and resubmit. The most common causes are a missing/weak privacy policy or unjustified permissions (both covered above).

---

## Step 6 — While you wait, launch marketing

The first 48 hours after approval matter most. Prep these now so you're ready to post the moment the approval email arrives.

### Channels (in priority order)

1. **Twitter/X** — launch post (template below)
2. **Reddit** — r/webdev, r/Frontend, r/reactjs, r/programming (read each sub's self-promotion rules first)
3. **Hacker News** — post as "Show HN: PerfDebugger — …"
4. **Dev.to** — technical article about how you built it
5. **Indie Hackers** — launch-friendly community
6. **Product Hunt** — needs prep: assets, taglines, maker comment. Schedule for a Tuesday/Wednesday launch.

### Twitter template

```
Just launched PerfDebugger on Chrome Web Store!

Real-time Core Web Vitals, instantly. No more waiting 60s for Lighthouse.

Built for frontend devs who debug performance daily.

- Instant metrics
- React/Vue/Angular re-render detection
- Memory tracking
- 100% local, no tracking
- Free

[link]
```

### r/webdev template

```
Title: I built a Chrome extension for real-time Core Web Vitals debugging

I got tired of running Lighthouse every time I wanted to check performance.
So I built PerfDebugger - shows LCP, FCP, CLS, INP, TTFB instantly,
plus which React/Vue/Angular components re-render the most.

Key differences from Lighthouse:
- Instant (no 60s audit)
- Real device data (not simulated)
- Always visible as you browse

Free, open source (MIT) and privacy-first (100% local).
Code: https://github.com/MonicaAvilaAlcazar/PerfDebugger

[link]

Would love feedback!
```

---

## Timeline

| Phase | Time |
|-------|------|
| Asset preparation | 2–3 hours |
| Submission | 30 min |
| Google review | 1–3 days |
| Initial marketing | First week |
| First 10 installs | Day 1–7 |
| First 100 installs | Week 2–4 |

---

## Success metrics

**Week 1**
- Approved by Google
- 10+ installs
- No negative ratings

**Month 1**
- 50–100 installs
- 3+ positive ratings
- Collected user feedback (good and bad)

**Month 3 — decision point**
- 200+ installs → worth investing in the companion AI-suggestions extension
- Under 50 installs → rethink pitch or target audience

---

## After publishing

While waiting for approval, prep these in parallel:

1. **Landing page** — published on the personal site at https://monydevelop.me/projects/perf-debugger (source: [PAGE.html](PAGE.html))
2. **Twitter account** for the project (e.g. @PerfDebuggerApp)
3. **Public GitHub repo** — done: https://github.com/MonicaAvilaAlcazar/PerfDebugger (MIT)
4. **AI suggestions extension** — planned as a separate free extension

---

## FAQ

**How long does review take?**
Usually 1–3 days. Up to a week when Google is backed up.

**What are the common rejection reasons?**
Missing/weak privacy policy, unjustified permissions, unclear description, low-quality screenshots. All of these are addressed in this guide.

**Can I update after publishing?**
Yes. Each update goes through a review, but re-reviews are typically faster (hours, not days).

**Ongoing cost?**
$0. The Chrome Web Store is free after the $5 one-time fee.

---

## If something goes wrong

- **Rejected:** read the email, fix, resubmit
- **Bug found post-launch:** bump the version in [manifest.json](manifest.json) (e.g. 1.0.1), rerun `./scripts/publish.sh`, and upload the new zip
- **Stuck:** come back here and ask — happy to help

---

Ready to ship.
