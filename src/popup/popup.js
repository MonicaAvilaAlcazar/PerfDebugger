// popup.js - Reads data from chrome.storage and renders it in the UI.

const { METRICS, STATUS_COLORS, escapeHtml, formatValue } = PerfSettings;

let settings = PerfSettings.normalize(null);
let activeTab = null;     // { url, keys } for the active tab, or null
let lastMetrics = null;
let lastHistory = null;

function getStatus(metric, value) {
  return PerfSettings.getStatus(settings, metric, value);
}

// Updates a single metric tile.
function updateMetric(id, value) {
  const valueEl = document.getElementById(`${id}-value`);
  const statusEl = document.getElementById(`${id}-status`);
  if (value !== null && value !== undefined) {
    valueEl.textContent = formatValue(id, value);
    statusEl.className = 'metric-status ' + getStatus(id, value);
  } else {
    valueEl.textContent = '-';
    statusEl.className = 'metric-status';
  }
}

function renderSlowResources(resources) {
  const container = document.getElementById('slow-resources-list');
  const ms = settings.slowResourceMs;
  document.getElementById('slow-threshold').textContent = ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;

  if (!resources || resources.length === 0) {
    container.innerHTML = '<div class="empty-state">No slow resources detected 🎉</div>';
    return;
  }

  const sorted = [...resources].sort((a, b) => b.duration - a.duration);
  container.innerHTML = sorted.map(r => {
    const sizeKB = r.size ? `${Math.round(r.size / 1024)}KB` : 'N/A';
    const shortName = r.name.length > 60 ? r.name.substring(0, 60) + '...' : r.name;
    return `
      <div class="resource-item">
        <div class="resource-name" title="${escapeHtml(r.name)}">${escapeHtml(shortName)}</div>
        <div class="resource-meta">
          <span>${escapeHtml(r.type)} • ${sizeKB}</span>
          <span class="resource-duration">${Number(r.duration)}ms</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderRenders(renders) {
  const body = document.getElementById('renders-body');
  const badge = document.getElementById('framework-badge');

  if (!settings.renderTracking) {
    badge.hidden = true;
    body.innerHTML = '<div class="empty-state">Re-render tracking is off. Turn it on in ⚙️ Settings.</div>';
    return;
  }
  if (!renders || !renders.framework) {
    badge.hidden = true;
    body.innerHTML = '<div class="empty-state">No React, Vue or Angular app detected yet.</div>';
    return;
  }

  badge.textContent = renders.framework;
  badge.hidden = false;

  const note = renders.note ? `<div class="renders-note">${escapeHtml(renders.note)}</div>` : '';
  if (!renders.total) {
    body.innerHTML = note || '<div class="empty-state">No re-renders yet — interact with the page.</div>';
    return;
  }

  const elapsedSec = Math.max(1, (Date.now() - (renders.since || Date.now())) / 1000);
  const perMin = Math.round((renders.total / elapsedSec) * 60);
  const top = (renders.components || []).slice(0, 8);
  const maxCount = top.length ? top[0].renders : 1;

  body.innerHTML = `
    ${note}
    <div class="renders-summary">
      <span><strong>${renders.total}</strong> re-renders</span>
      <span><strong>${renders.commits}</strong> updates</span>
      <span><strong>${perMin}</strong>/min</span>
    </div>
    <div class="renders-list">
      ${top.map(c => `
        <div class="render-row">
          <span class="render-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</span>
          <span class="render-bar"><span style="width:${Math.max(4, Math.round((c.renders / maxCount) * 100))}%"></span></span>
          <span class="render-count">${Number(c.renders)}</span>
        </div>
      `).join('')}
    </div>
  `;
}

function renderLeakAlert(leak) {
  const el = document.getElementById('leak-alert');
  const detail = document.getElementById('leak-detail');
  if (!leak) {
    el.hidden = true;
    return;
  }
  const mins = Math.max(1, Math.round(leak.durationSec / 60));
  detail.textContent =
    `JS heap grew ${leak.growthMB} MB (+${leak.growthPct}%) over ~${mins} min ` +
    `(${leak.fromMB} → ${leak.toMB} MB). Profile with DevTools › Memory.`;
  el.hidden = false;
}

function renderHistory(history) {
  const grid = document.getElementById('history-grid');
  const empty = document.getElementById('history-empty');

  if (!Array.isArray(history) || history.length < 2) {
    empty.style.display = 'block';
    grid.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  grid.innerHTML = METRICS.map(({ id, label, unit }) => {
    const series = history.map(h => h[id]).filter(v => v != null && !isNaN(v));

    if (series.length < 2) {
      return `
        <div class="history-item">
          <div class="history-head">
            <span class="history-label">${label}</span>
            <span class="history-last">-</span>
          </div>
          <svg class="sparkline" viewBox="0 0 100 30"></svg>
          <div class="history-meta"><span>not enough data</span></div>
        </div>
      `;
    }

    const min = Math.min(...series);
    const max = Math.max(...series);
    const last = series[series.length - 1];
    const unitSuffix = unit ? ` ${unit}` : '';
    const color = STATUS_COLORS[getStatus(id, last)] || '#888';

    return `
      <div class="history-item">
        <div class="history-head">
          <span class="history-label">${label}</span>
          <span class="history-last">${formatValue(id, last)}${unitSuffix}</span>
        </div>
        ${PerfSettings.sparklineSvg(series, color)}
        <div class="history-meta">
          <span>min ${formatValue(id, min)}</span>
          <span>n=${series.length}</span>
          <span>max ${formatValue(id, max)}</span>
        </div>
      </div>
    `;
  }).join('');
}

function render() {
  const metrics = lastMetrics;
  renderHistory(lastHistory);

  if (!metrics) {
    METRICS.forEach(({ id }) => updateMetric(id, null));
    renderSlowResources([]);
    renderRenders(null);
    renderLeakAlert(null);
    if (activeTab) {
      document.getElementById('current-url').textContent = activeTab.keys.page + ' (no data yet - reload page)';
    }
    return;
  }

  document.getElementById('current-url').textContent = activeTab.keys.page;
  updateMetric('lcp', metrics.lcp);
  updateMetric('fcp', metrics.fcp);
  updateMetric('cls', metrics.cls);
  updateMetric('inp', metrics.inp);
  updateMetric('ttfb', metrics.ttfb);
  updateMetric('memory', metrics.memory ? metrics.memory.used : null);
  renderSlowResources(metrics.slowResources);
  renderRenders(metrics.renders);
  renderLeakAlert(metrics.memoryLeak);
}

function loadCurrentTabMetrics() {
  if (!activeTab) return;
  const { keys } = activeTab;
  chrome.storage.local.get([keys.metrics, keys.history], (data) => {
    lastMetrics = data[keys.metrics] || null;
    lastHistory = data[keys.history] || null;
    render();
  });
}

function datedFilename(ext) {
  const host = new URL(activeTab.url).hostname || 'page';
  const date = new Date().toISOString().slice(0, 10);
  return `perfdebugger-${PerfSettings.safeFilePart(host)}-${date}.${ext}`;
}

function exportJson() {
  if (!activeTab) return;
  const { keys, url } = activeTab;
  chrome.storage.local.get([keys.metrics, keys.history], (data) => {
    const parsed = new URL(url);
    const report = {
      generatedAt: new Date().toISOString(),
      url,
      hostname: parsed.hostname,
      path: parsed.pathname,
      extensionVersion: chrome.runtime.getManifest().version,
      thresholds: settings.thresholds,
      current: data[keys.metrics] || null,
      history: Array.isArray(data[keys.history]) ? data[keys.history] : []
    };
    PerfSettings.downloadFile(datedFilename('json'), JSON.stringify(report, null, 2), 'application/json');
  });
}

function exportCsv() {
  if (!activeTab) return;
  const { keys } = activeTab;
  chrome.storage.local.get(keys.history, (data) => {
    const history = Array.isArray(data[keys.history]) ? data[keys.history] : [];
    const rows = history.map(entry => ({ page: keys.page, entry }));
    PerfSettings.downloadFile(datedFilename('csv'), PerfSettings.historyToCsv(rows), 'text/csv');
  });
}

// Briefly highlights a button so a fast-completing action is visible.
function flashButton(btn, kind) {
  const cls = `flashed-${kind}`;
  btn.classList.remove(cls);
  void btn.offsetWidth; // Force reflow so re-adding the class restarts the transition.
  btn.classList.add(cls);
  setTimeout(() => btn.classList.remove(cls), 280);
}

function onClick(id, kind, handler) {
  document.getElementById(id).addEventListener('click', (e) => {
    if (kind) flashButton(e.currentTarget, kind);
    handler();
  });
}

onClick('refresh-btn', 'info', loadCurrentTabMetrics);
onClick('export-json-btn', 'success', exportJson);
onClick('export-csv-btn', 'success', exportCsv);
onClick('clear-btn', 'danger', () => {
  if (!activeTab) return;
  chrome.storage.local.remove([activeTab.keys.metrics, activeTab.keys.history], loadCurrentTabMetrics);
});
onClick('dashboard-btn', null, () => {
  chrome.tabs.create({ url: chrome.runtime.getURL('src/dashboard/dashboard.html') });
  window.close();
});
onClick('settings-btn', null, () => {
  chrome.runtime.openOptionsPage();
  window.close();
});

document.getElementById('version').textContent = `v${chrome.runtime.getManifest().version}`;

function setUnsupported(label) {
  document.getElementById('current-url').textContent = label;
  document.getElementById('unsupported').hidden = false;
  document.getElementById('page-content').hidden = true;
  ['refresh-btn', 'clear-btn', 'export-json-btn', 'export-csv-btn'].forEach(id => {
    document.getElementById(id).disabled = true;
  });
}

// Initial load.
PerfSettings.load((loaded) => {
  settings = loaded;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab || !tab.url || !PerfSettings.isMeasurableUrl(tab.url)) {
      setUnsupported(tab && tab.url ? tab.url.split('?')[0] : 'Unsupported page');
      return;
    }
    activeTab = { url: tab.url, keys: PerfSettings.keysForUrl(tab.url) };
    loadCurrentTabMetrics();
  });
});

// Reactive: re-render when the active tab's data or the settings change.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'sync' && changes[PerfSettings.SETTINGS_KEY]) {
    settings = PerfSettings.normalize(changes[PerfSettings.SETTINGS_KEY].newValue);
    if (activeTab) render();
    return;
  }
  if (areaName !== 'local' || !activeTab) return;
  if (changes[activeTab.keys.metrics] || changes[activeTab.keys.history]) loadCurrentTabMetrics();
});
