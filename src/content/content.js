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
    memory: null
  };

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
  // 6. SLOW RESOURCES (> 1 second)
  // ============================================
  try {
    const resourceObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.duration > 1000) {
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

  // ============================================
  // 7. MEMORY USAGE (Chrome only; performance.memory is non-standard,
  // but measureUserAgentSpecificMemory requires cross-origin isolation,
  // which almost no real-world page satisfies).
  // ============================================
  let memoryInterval = null;
  function checkMemory() {
    if (performance.memory) {
      metrics.memory = {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
      };
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

  function writeToStorage() {
    if (!extensionAlive()) return;
    try {
      chrome.storage.local.set({ [currentKey]: metrics });
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
    metrics.url = window.location.href;
    metrics.timestamp = Date.now();
    metrics.slowResources = [];
    metrics.cls = null;
    clsValue = 0;
    sessionValue = 0;
    sessionEntries = [];
    saveMetrics();
  }
  if (window.navigation && typeof window.navigation.addEventListener === 'function') {
    window.navigation.addEventListener('navigatesuccess', onRouteChange);
  }
  window.addEventListener('popstate', onRouteChange);
  window.addEventListener('hashchange', onRouteChange);
})();
