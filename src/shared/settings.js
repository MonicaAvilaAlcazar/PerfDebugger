// settings.js - Shared defaults + helpers for user-configurable settings.
// Loaded by the content script, popup, dashboard and options page.
// Settings live in chrome.storage.sync so they follow the user across devices.

(function(global) {
  'use strict';

  const SETTINGS_KEY = 'settings';

  // Google's official Core Web Vitals thresholds (memory is our own heuristic).
  const DEFAULT_SETTINGS = {
    thresholds: {
      lcp: { good: 2500, warn: 4000 },   // ms
      fcp: { good: 1800, warn: 3000 },   // ms
      cls: { good: 0.1, warn: 0.25 },    // score
      inp: { good: 200, warn: 500 },     // ms
      ttfb: { good: 800, warn: 1800 },   // ms
      memory: { good: 100, warn: 300 }   // MB
    },
    slowResourceMs: 1000,
    retentionDays: 7,
    renderTracking: true
  };

  const METRICS = [
    { id: 'lcp', label: 'LCP', name: 'Largest Contentful Paint', unit: 'ms' },
    { id: 'fcp', label: 'FCP', name: 'First Contentful Paint', unit: 'ms' },
    { id: 'cls', label: 'CLS', name: 'Cumulative Layout Shift', unit: '' },
    { id: 'inp', label: 'INP', name: 'Interaction to Next Paint', unit: 'ms' },
    { id: 'ttfb', label: 'TTFB', name: 'Time to First Byte', unit: 'ms' },
    { id: 'memory', label: 'Memory', name: 'JS heap used', unit: 'MB' }
  ];

  const STATUS_COLORS = {
    'status-good': '#10b981',
    'status-warn': '#f59e0b',
    'status-bad': '#ef4444'
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function num(v, fallback, min, max) {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  // Merges stored values over defaults and clamps anything out of range, so a
  // corrupted or partial settings object can never break the UI.
  function normalize(stored) {
    const out = clone(DEFAULT_SETTINGS);
    if (!stored || typeof stored !== 'object') return out;
    const t = stored.thresholds || {};
    for (const id of Object.keys(out.thresholds)) {
      const def = out.thresholds[id];
      const src = t[id] || {};
      const max = id === 'cls' ? 10 : 600000;
      const good = num(src.good, def.good, 0, max);
      const warn = num(src.warn, def.warn, 0, max);
      out.thresholds[id] = { good, warn: Math.max(good, warn) };
    }
    out.slowResourceMs = Math.round(num(stored.slowResourceMs, out.slowResourceMs, 100, 60000));
    out.retentionDays = Math.round(num(stored.retentionDays, out.retentionDays, 1, 30));
    if (typeof stored.renderTracking === 'boolean') out.renderTracking = stored.renderTracking;
    return out;
  }

  function load(callback) {
    try {
      chrome.storage.sync.get(SETTINGS_KEY, (data) => {
        callback(normalize(data && data[SETTINGS_KEY]));
      });
    } catch (e) {
      callback(normalize(null));
    }
  }

  function save(settings, callback) {
    chrome.storage.sync.set({ [SETTINGS_KEY]: normalize(settings) }, callback);
  }

  function getStatus(settings, metric, value) {
    if (value === null || value === undefined) return '';
    const thresh = settings.thresholds[metric];
    if (!thresh) return '';
    if (value <= thresh.good) return 'status-good';
    if (value <= thresh.warn) return 'status-warn';
    return 'status-bad';
  }

  function formatValue(metric, v) {
    if (v == null || Number.isNaN(v)) return '-';
    if (metric === 'cls') return Number(v).toFixed(3);
    return String(v);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  // Storage keys are derived from hostname + pathname (query/hash ignored).
  function keysForUrl(rawUrl) {
    const url = new URL(rawUrl);
    const page = url.hostname + url.pathname;
    return { page, metrics: `metrics_${page}`, history: `history_${page}` };
  }

  // The extension can only measure regular web pages.
  function isMeasurableUrl(rawUrl) {
    try {
      const { protocol } = new URL(rawUrl);
      return protocol === 'http:' || protocol === 'https:' || protocol === 'file:';
    } catch (e) {
      return false;
    }
  }

  // Builds an SVG polyline from a numeric series, scaled into a W x H viewBox.
  function sparklineSvg(values, color, opts) {
    if (values.length < 2) return '';
    const W = (opts && opts.width) || 100;
    const H = (opts && opts.height) || 30;
    const PAD = 2;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const points = values.map((v, i) => {
      const x = (i / (values.length - 1)) * (W - 2 * PAD) + PAD;
      const y = H - PAD - ((v - min) / range) * (H - 2 * PAD);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
    return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
    </svg>`;
  }

  // ---------- Export helpers (popup + dashboard) ----------

  function csvCell(v) {
    if (v == null) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const CSV_COLUMNS = ['page', 'timestamp', 'lcp_ms', 'fcp_ms', 'cls', 'inp_ms', 'ttfb_ms', 'memory_mb', 'rerenders'];

  // One row per page session (history entry).
  function historyToCsv(rows) {
    const lines = [CSV_COLUMNS.join(',')];
    for (const { page, entry } of rows) {
      lines.push([
        page,
        entry.timestamp ? new Date(entry.timestamp).toISOString() : '',
        entry.lcp, entry.fcp, entry.cls, entry.inp, entry.ttfb, entry.memory, entry.renders
      ].map(csvCell).join(','));
    }
    return lines.join('\r\n') + '\r\n';
  }

  // Triggers a file download via a Blob URL — no "downloads" permission needed.
  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
  }

  function safeFilePart(s) {
    return String(s).replace(/[^a-z0-9.-]/gi, '_').slice(0, 80);
  }

  global.PerfSettings = {
    SETTINGS_KEY,
    DEFAULT_SETTINGS,
    METRICS,
    STATUS_COLORS,
    normalize,
    load,
    save,
    getStatus,
    formatValue,
    escapeHtml,
    keysForUrl,
    isMeasurableUrl,
    sparklineSvg,
    historyToCsv,
    downloadFile,
    safeFilePart
  };
})(typeof window !== 'undefined' ? window : self);
