// content.js - Runs on every page the user visits.
// Collects Core Web Vitals and stores them in chrome.storage.

(function() {
  'use strict';

  let saveTimer = null;

  // Global object that holds the metrics.
  const metrics = {
    url: window.location.href,
    timestamp: Date.now(),
    lcp: null,
    fcp: null,
    cls: null,
    inp: null,
    ttfb: null,
    slowResources: [],
    memory: null,
    memoryLeak: null,
    renders: null
  };

  // User settings (thresholds, slow-resource cutoff, re-render tracking).
  // Defaults apply until chrome.storage.sync answers.
  let settings = PerfSettings.normalize(null);

  // ============================================
  // 1. LARGEST CONTENTFUL PAINT (LCP)
  // ============================================
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      metrics.lcp = Math.round(lastEntry.renderTime || lastEntry.loadTime);
      saveMetrics();
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    console.warn('LCP not supported');
  }

  // ============================================
  // 2. FIRST CONTENTFUL PAINT (FCP)
  // ============================================
  try {
    const fcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const fcp = entries.find(e => e.name === 'first-contentful-paint');
      if (fcp) {
        metrics.fcp = Math.round(fcp.startTime);
        saveMetrics();
      }
    });
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    console.warn('FCP not supported');
  }

  // ============================================
  // 3. CUMULATIVE LAYOUT SHIFT (CLS)
  // Session-window algorithm: max sum within any 5s window, 1s gap.
  // ============================================
  let clsValue = 0;
  let sessionValue = 0;
  let sessionEntries = [];
  try {
    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.hadRecentInput) continue;
        const first = sessionEntries[0];
        const last = sessionEntries[sessionEntries.length - 1];
        if (
          sessionEntries.length &&
          (entry.startTime - last.startTime >= 1000 ||
            entry.startTime - first.startTime >= 5000)
        ) {
          sessionValue = entry.value;
          sessionEntries = [entry];
        } else {
          sessionValue += entry.value;
          sessionEntries.push(entry);
        }
        if (sessionValue > clsValue) {
          clsValue = sessionValue;
          metrics.cls = Math.round(clsValue * 1000) / 1000;
          saveMetrics();
        }
      }
    });
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    console.warn('CLS not supported');
  }

  // ============================================
  // 4. INTERACTION TO NEXT PAINT (INP)
  // Replaced FID as a Core Web Vital in March 2024.
  // Track the 10 longest interactions and report at the high-percentile index
  // (one per ~50 interactions), matching web-vitals.js.
  // ============================================
  const longestInteractions = [];
  let interactionCount = 0;
  function recordInteraction(entry) {
    const existing = longestInteractions.find(i => i.id === entry.interactionId);
    if (existing) {
      existing.duration = Math.max(existing.duration, entry.duration);
    } else {
      longestInteractions.push({ id: entry.interactionId, duration: entry.duration });
      interactionCount++;
    }
    longestInteractions.sort((a, b) => b.duration - a.duration);
    longestInteractions.splice(10);
    const idx = Math.min(longestInteractions.length - 1, Math.floor(interactionCount / 50));
    const value = longestInteractions[idx]?.duration;
    if (value != null) {
      metrics.inp = Math.round(value);
      saveMetrics();
    }
  }
  try {
    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.interactionId) recordInteraction(entry);
      }
    });
    inpObserver.observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (e) {
    console.warn('INP not supported');
  }

  // ============================================
  // 5. TIME TO FIRST BYTE (TTFB)
  // ============================================
  try {
    const navEntries = performance.getEntriesByType('navigation');
    if (navEntries.length > 0) {
      const nav = navEntries[0];
      metrics.ttfb = Math.round(nav.responseStart - nav.requestStart);
    }
  } catch (e) {
    console.warn('TTFB not available');
  }

  // ============================================
  // 6. SLOW RESOURCES (> configurable threshold, default 1s)
  // Started once settings load; buffered:true replays earlier entries.
  // ============================================
  function startResourceObserver() {
    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > settings.slowResourceMs) {
            metrics.slowResources.push({
              name: entry.name.substring(0, 100),
              duration: Math.round(entry.duration),
              size: entry.transferSize || 0,
              type: entry.initiatorType
            });
            // Cap at 20 slow resources.
            if (metrics.slowResources.length > 20) {
              metrics.slowResources.shift();
            }
            saveMetrics();
          }
        }
      });
      resourceObserver.observe({ type: 'resource', buffered: true });
    } catch (e) {
      console.warn('Resource observer not supported');
    }
  }

  // ============================================
  // 8. RE-RENDER DETECTION (React / Vue / Angular)
  // render-tracker.js runs in the page's MAIN world and posts per-component
  // deltas here once per second. We accumulate them per page.
  // ============================================
  const SOURCE_MAIN = 'perfdebugger-main';
  const SOURCE_ISOLATED = 'perfdebugger-isolated';
  const MAX_TRACKED_COMPONENTS = 200;
  const MAX_STORED_COMPONENTS = 30;
  let renderCounts = new Map();

  function resetRenders() {
    renderCounts = new Map();
    metrics.renders = null;
  }

  function sendRenderConfig() {
    const origin = window.location.origin === 'null' ? '*' : window.location.origin;
    window.postMessage({
      source: SOURCE_ISOLATED,
      type: 'config',
      renderTracking: settings.renderTracking
    }, origin);
  }

  function onRenderDelta(data) {
    if (!settings.renderTracking) return;
    const framework = typeof data.framework === 'string' ? data.framework.slice(0, 20) : null;
    if (!framework) return;
    const r = metrics.renders || (metrics.renders = {
      framework, note: null, total: 0, commits: 0, since: Date.now(), components: []
    });
    r.framework = framework;
    if (typeof data.note === 'string') r.note = data.note.slice(0, 200);
    const commits = Number(data.commits);
    if (Number.isFinite(commits) && commits > 0) r.commits += Math.round(commits);
    if (Array.isArray(data.components)) {
      for (const c of data.components.slice(0, 50)) {
        const name = typeof c.name === 'string' ? c.name.slice(0, 80) : 'Anonymous';
        const n = Number(c.renders);
        if (!Number.isFinite(n) || n <= 0) continue;
        if (!renderCounts.has(name) && renderCounts.size >= MAX_TRACKED_COMPONENTS) continue;
        renderCounts.set(name, (renderCounts.get(name) || 0) + Math.round(n));
        r.total += Math.round(n);
      }
    }
    r.components = [...renderCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_STORED_COMPONENTS)
      .map(([name, renders]) => ({ name, renders }));
    saveMetrics();
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== SOURCE_MAIN) return;
    if (data.type === 'ready') sendRenderConfig();
    else if (data.type === 'renders') onRenderDelta(data);
  });

  // ============================================
  // SETTINGS
  // ============================================
  PerfSettings.load((loaded) => {
    settings = loaded;
    startResourceObserver();
    sendRenderConfig();
  });

  try {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'sync' || !changes[PerfSettings.SETTINGS_KEY]) return;
      const wasTracking = settings.renderTracking;
      settings = PerfSettings.normalize(changes[PerfSettings.SETTINGS_KEY].newValue);
      if (wasTracking !== settings.renderTracking) {
        if (!settings.renderTracking) resetRenders();
        sendRenderConfig();
        saveMetrics();
      }
    });
  } catch (e) {
    // Context invalidated.
  }

  // ============================================
  // 7. MEMORY USAGE (Chrome only; performance.memory is non-standard,
  // but measureUserAgentSpecificMemory requires cross-origin isolation,
  // which almost no real-world page satisfies).
  // ============================================
  let memoryInterval = null;
  // Rolling window of recent {timestamp, used} samples used for leak detection.
  // 5s polling × 24 samples = 2 min window.
  const memorySamples = [];
  const MEMORY_WINDOW = 24;

  // Heuristic: sustained growth across the window with both meaningful
  // absolute (>= 20MB) and relative (>= 25%) increase between the first
  // and last quartiles. Avoids flagging momentary spikes.
  function detectMemoryLeak() {
    if (memorySamples.length < 12) return null;
    const q = Math.max(3, Math.floor(memorySamples.length / 4));
    const first = memorySamples.slice(0, q);
    const last = memorySamples.slice(-q);
    const avg = arr => arr.reduce((s, x) => s + x.used, 0) / arr.length;
    const firstAvg = avg(first);
    const lastAvg = avg(last);
    const growthMB = lastAvg - firstAvg;
    const growthPct = firstAvg > 0 ? (growthMB / firstAvg) * 100 : 0;
    if (growthMB < 20 || growthPct < 25) return null;
    const durationSec = Math.round(
      (memorySamples[memorySamples.length - 1].timestamp - memorySamples[0].timestamp) / 1000
    );
    return {
      growthMB: Math.round(growthMB),
      growthPct: Math.round(growthPct),
      durationSec,
      fromMB: Math.round(firstAvg),
      toMB: Math.round(lastAvg)
    };
  }

  function checkMemory() {
    if (performance.memory) {
      const used = Math.round(performance.memory.usedJSHeapSize / 1048576);
      metrics.memory = {
        used, // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
      memorySamples.push({ timestamp: Date.now(), used });
      if (memorySamples.length > MEMORY_WINDOW) memorySamples.shift();
      metrics.memoryLeak = detectMemoryLeak();
      saveMetrics();
    }
  }
  function startMemoryPolling() {
    if (memoryInterval == null) {
      memoryInterval = setInterval(checkMemory, 5000);
    }
  }
  function stopMemoryPolling() {
    if (memoryInterval != null) {
      clearInterval(memoryInterval);
      memoryInterval = null;
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') startMemoryPolling();
    else stopMemoryPolling();
  });
  window.addEventListener('pagehide', stopMemoryPolling);
  if (document.visibilityState === 'visible') startMemoryPolling();
  checkMemory(); // First read.

  // ============================================
  // SAVE TO CHROME STORAGE
  // Debounced: observers fire rapidly; chrome.storage has a ~120 writes/min quota.
  // ============================================
  // After an extension reload, chrome.runtime.id is undefined and chrome.* calls throw.
  function extensionAlive() {
    return !!(chrome.runtime && chrome.runtime.id);
  }

  let currentKey = `metrics_${window.location.hostname}${window.location.pathname}`;
  let historyKey = `history_${window.location.hostname}${window.location.pathname}`;

  // History is kept in memory and written alongside every metrics save, so the
  // unload path doesn't need an async get-then-set (which is unreliable on
  // pagehide — the get callback rarely fires before the context is torn down).
  // One entry per page session, updated in place as metrics arrive.
  let historyArr = null;       // populated after initial load
  let sessionEntry = null;
  const HISTORY_MAX = 50;

  function loadHistoryAndStartSession() {
    const keyAtLoad = historyKey;
    try {
      chrome.storage.local.get(keyAtLoad, (data) => {
        if (!extensionAlive()) return;
        if (keyAtLoad !== historyKey) return; // route changed before we returned
        historyArr = Array.isArray(data[keyAtLoad]) ? data[keyAtLoad] : [];
        sessionEntry = { timestamp: Date.now(), lcp: null, fcp: null, cls: null, inp: null, ttfb: null, memory: null, renders: null };
        historyArr.push(sessionEntry);
        if (historyArr.length > HISTORY_MAX) historyArr.splice(0, historyArr.length - HISTORY_MAX);
        // Reflect any metrics already collected before history finished loading.
        writeToStorage();
      });
    } catch (e) {
      // Context invalidated.
    }
  }

  function syncSessionEntry() {
    if (!sessionEntry) return;
    sessionEntry.lcp = metrics.lcp;
    sessionEntry.fcp = metrics.fcp;
    sessionEntry.cls = metrics.cls;
    sessionEntry.inp = metrics.inp;
    sessionEntry.ttfb = metrics.ttfb;
    sessionEntry.memory = metrics.memory ? metrics.memory.used : null;
    sessionEntry.renders = metrics.renders ? metrics.renders.total : null;
  }

  function writeToStorage() {
    if (!extensionAlive()) return;
    syncSessionEntry();
    try {
      const payload = { [currentKey]: metrics };
      if (Array.isArray(historyArr)) payload[historyKey] = historyArr;
      chrome.storage.local.set(payload);
    } catch (e) {
      // Context invalidated between check and call — safe to ignore.
    }
  }

  function saveMetrics() {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      writeToStorage();
    }, 500);
  }

  function flushMetrics() {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }
    writeToStorage();
  }

  // Save on load and on page unload (immediate flush).
  window.addEventListener('load', () => {
    setTimeout(saveMetrics, 500);
  });
  window.addEventListener('pagehide', flushMetrics);

  // Kick off history loading immediately. After this resolves, every
  // subsequent saveMetrics will also persist history.
  loadHistoryAndStartSession();

  // ============================================
  // SPA ROUTE CHANGES
  // Content scripts run isolated, so we can't patch history.pushState on the page.
  // Use the Navigation API (Chrome 102+) and popstate as backup.
  // LCP/FCP/TTFB reflect initial nav and are intentionally not reset.
  // ============================================
  function onRouteChange() {
    const newKey = `metrics_${window.location.hostname}${window.location.pathname}`;
    if (newKey === currentKey) return;
    flushMetrics();
    currentKey = newKey;
    historyKey = `history_${window.location.hostname}${window.location.pathname}`;
    historyArr = null;
    sessionEntry = null;
    metrics.url = window.location.href;
    metrics.timestamp = Date.now();
    metrics.slowResources = [];
    metrics.cls = null;
    metrics.memoryLeak = null;
    resetRenders();
    memorySamples.length = 0;
    clsValue = 0;
    sessionValue = 0;
    sessionEntries = [];
    loadHistoryAndStartSession();
    saveMetrics();
  }
  if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', onRouteChange);
  }
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('hashchange', onRouteChange);
})();
