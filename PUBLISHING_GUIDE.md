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

## Step 2 — Privacy Policy URL (20 min)

Chrome requires a public URL containing your privacy policy. Pick **one** option — all are free:

- **GitHub Pages (recommended):** create a public repo `perfdebugger-site`, add `privacy.html` with the Privacy Policy text from [STORE_LISTING.md](STORE_LISTING.md), enable Pages under Settings. URL format: `https://<your-user>.github.io/perfdebugger-site/privacy.html`
- **Notion:** create a page with the policy, click Share → "Publish to web", copy the URL
- **Google Sites:** go to sites.google.com, create a single-page site with the policy, publish it

Copy the Privacy Policy text directly from [STORE_LISTING.md](STORE_LISTING.md) — don't rewrite it. Save the URL; you'll paste it in Step 4.

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
2. Click **"New Item"** and upload `perf-debugger-submission.zip`
3. Fill each tab using text from [STORE_LISTING.md](STORE_LISTING.md):

### Store listing tab
| Field | Value |
|-------|-------|
| Name | PerfDebugger — Real-time Web Performance |
| Summary | (short description from STORE_LISTING.md) |
| Description | (long description from STORE_LISTING.md) |
| Category | Developer Tools |
| Language | English |

### Graphics tab
| Asset | File |
|-------|------|
| Icon | [icons/icon128.png](icons/icon128.png) |
| Screenshot 1 | [store-assets/screenshot-1-hero.png](store-assets/screenshot-1-hero.png) |
| Screenshot 2 | [store-assets/screenshot-2-features.png](store-assets/screenshot-2-features.png) |
| Screenshot 3 | [store-assets/screenshot-3-comparison.png](store-assets/screenshot-3-comparison.png) |
| Small promo tile (optional) | [store-assets/promo-tile-440x280.png](store-assets/promo-tile-440x280.png) |

### Privacy tab
- **Privacy Policy URL:** paste the URL from Step 2
- **Permission justifications:**
  - `storage` — "To save performance metrics locally"
  - `activeTab` — "To read performance data from the current tab"
  - `alarms` — "To schedule cleanup of old data"
  - `host_permissions <all_urls>` — "To measure performance on any website the user visits"

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
- Memory tracking
- 100% local, no tracking
- Free

[link]
```

### r/webdev template

```
Title: I built a Chrome extension for real-time Core Web Vitals debugging

I got tired of running Lighthouse every time I wanted to check performance.
So I built PerfDebugger - shows LCP, FCP, CLS, INP, TTFB instantly.

Key differences from Lighthouse:
- Instant (no 60s audit)
- Real device data (not simulated)
- Always visible as you browse

Free, open source, privacy-first (100% local).

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
- 200+ installs → worth investing in a v0.2 with premium features
- Under 50 installs → rethink pitch or target audience

---

## After publishing

While waiting for approval, prep these in parallel:

1. **Landing page** (Vercel + Next.js, or even a Notion page)
2. **Twitter account** for the project (e.g. @PerfDebuggerApp)
3. **Public GitHub repo** (open source builds trust)
4. **v0.2 plan** with premium features

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
- **Bug found post-launch:** push a quick update (v0.1.1)
- **Stuck:** come back here and ask — happy to help

---

Ready to ship.
