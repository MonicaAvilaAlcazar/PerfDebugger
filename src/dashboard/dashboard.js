// dashboard.js - Full-page overview of every tracked page (local data only).

const { METRICS, STATUS_COLORS, escapeHtml, formatValue } = PerfSettings;

let settings = PerfSettings.normalize(null);
let pages = [];               // [{ page, metrics, history, lastSeen, ... }]
let selectedPage = null;
let sort = { key: 'lastSeen', dir: 'desc' };
let filter = '';

// ---------- Data ----------

function latest(page, id) {
  if (page.metrics) {
    const v = id === 'memory' ? (page.metrics.memory ? page.metrics.memory.used : null) : page.metrics[id];
    if (v != null) return v;
  }
  for (let i = page.history.length - 1; i >= 0; i--) {
    if (page.history[i][id] != null) return page.history[i][id];
  }
  return null;
}

function buildPages(items) {
  const byPage = new Map();
  const get = (page) => {
    if (!byPage.has(page)) byPage.set(page, { page, metrics: null, history: [] });
    return byPage.get(page);
  };
  for (const [key, value] of Object.entries(items)) {
    if (key.startsWith('metrics_') && value && typeof value === 'object') {
      get(key.slice('metrics_'.length)).metrics = value;
    } else if (key.startsWith('history_') && Array.isArray(value)) {
      get(key.slice('history_'.length)).history = value.filter(e => e && e.timestamp);
    }
  }
  return [...byPage.values()].map(p => {
    const lastHist = p.history.length ? p.history[p.history.length - 1].timestamp : 0;
    const row = {
      ...p,
      lastSeen: Math.max(lastHist, (p.metrics && p.metrics.timestamp) || 0),
      sessions: p.history.length,
      renders: p.metrics && p.metrics.renders ? p.metrics.renders.total : null
    };
    METRICS.forEach(({ id }) => { row[id] = latest(p, id); });
    return row;
  });
}

function load() {
  chrome.storage.local.get(null, (items) => {
    pages = buildPages(items);
    if (selectedPage && !pages.some(p => p.page === selectedPage)) selectedPage = null;
    render();
  });
}

// ---------- Helpers ----------

function percentile(values, p) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function round(id, v) {
  if (v == null) return null;
  return id === 'cls' ? Math.round(v * 1000) / 1000 : Math.round(v);
}

function timeAgo(ts) {
  if (!ts) return '-';
  const sec = Math.round((Date.now() - ts) / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.round(sec / 60)} min ago`;
  if (sec < 86400) return `${Math.round(sec / 3600)} h ago`;
  return `${Math.round(sec / 86400)} d ago`;
}

function statusDot(id, v) {
  const cls = PerfSettings.getStatus(settings, id, v);
  return v == null ? '' : `<span class="status-dot ${cls}"></span>`;
}

function safeHref(page) {
  const raw = page.metrics && page.metrics.url;
  try {
    const u = new URL(raw || `https://${page.page}`);
    if (u.protocol === 'http:' || u.protocol === 'https:') return u.href;
  } catch (e) { /* fall through */ }
  return null;
}

let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
}

// ---------- Rendering ----------

function renderOverview() {
  const el = document.getElementById('overview');
  const totalLoads = pages.reduce((s, p) => s + p.sessions, 0);
  const assessed = METRICS.filter(m => m.id === 'lcp' || m.id === 'cls' || m.id === 'inp');
  const stats = assessed.map(({ id, label }) => {
    const values = pages.map(p => p[id]).filter(v => v != null);
    const good = values.filter(v => PerfSettings.getStatus(settings, id, v) === 'status-good').length;
    return {
      label: `${label} good`,
      value: values.length ? `${Math.round((good / values.length) * 100)}%` : '-',
      sub: values.length ? `${good} of ${values.length} pages` : 'no data'
    };
  });
  const leaks = pages.filter(p => p.metrics && p.metrics.memoryLeak).length;

  el.innerHTML = [
    { label: 'Pages tracked', value: pages.length, sub: `last ${settings.retentionDays} days` },
    { label: 'Page loads', value: totalLoads, sub: 'recorded sessions' },
    ...stats,
    { label: 'Leak alerts', value: leaks, sub: leaks ? 'pages with sustained heap growth' : 'none detected' }
  ].map(s => `
    <div class="stat">
      <div class="stat-label">${escapeHtml(s.label)}</div>
      <div class="stat-value">${escapeHtml(s.value)}</div>
      <div class="stat-sub">${escapeHtml(s.sub)}</div>
    </div>
  `).join('');

  document.getElementById('summary').textContent = pages.length
    ? `${pages.length} page${pages.length === 1 ? '' : 's'} tracked on this device. Click a row for details.`
    : 'No pages tracked yet.';
}

function sortedFilteredPages() {
  const q = filter.trim().toLowerCase();
  const list = q ? pages.filter(p => p.page.toLowerCase().includes(q)) : [...pages];
  const { key, dir } = sort;
  const mult = dir === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null && bv == null) return 0;
    if (av == null) return 1;   // nulls always last
    if (bv == null) return -1;
    if (typeof av === 'string') return av.localeCompare(bv) * mult;
    return (av - bv) * mult;
  });
  return list;
}

function renderTable() {
  const body = document.getElementById('pages-body');
  const list = sortedFilteredPages();
  document.getElementById('empty').hidden = pages.length > 0;
  document.getElementById('pages-table').hidden = pages.length === 0;

  document.querySelectorAll('.pages th[data-sort]').forEach(th => {
    th.classList.toggle('sorted-asc', th.dataset.sort === sort.key && sort.dir === 'asc');
    th.classList.toggle('sorted-desc', th.dataset.sort === sort.key && sort.dir === 'desc');
  });

  body.innerHTML = list.map(p => `
    <tr data-page="${escapeHtml(p.page)}" class="${p.page === selectedPage ? 'selected' : ''}" tabindex="0">
      <td class="page-cell" title="${escapeHtml(p.page)}">${escapeHtml(p.page)}</td>
      <td class="muted">${timeAgo(p.lastSeen)}</td>
      ${METRICS.map(({ id }) => `<td class="num">${statusDot(id, p[id])}${formatValue(id, p[id])}</td>`).join('')}
      <td class="num">${p.renders == null ? '-' : p.renders}</td>
      <td class="num">${p.sessions}</td>
      <td><button class="row-delete danger" data-delete="${escapeHtml(p.page)}" title="Delete data for this page">Delete</button></td>
    </tr>
  `).join('') || `<tr><td colspan="11" class="muted">No pages match “${escapeHtml(filter)}”.</td></tr>`;
}

function chartCard(page, { id, label, unit }) {
  const series = page.history.map(h => h[id]).filter(v => v != null && !isNaN(v));
  const last = page[id];
  const unitSuffix = unit ? ` ${unit}` : '';
  const color = STATUS_COLORS[PerfSettings.getStatus(settings, id, last)] || '#888';
  const svg = series.length >= 2
    ? PerfSettings.sparklineSvg(series, color, { width: 300, height: 60 })
    : '<svg class="sparkline" viewBox="0 0 300 60"></svg>';
  const stat = (name, v) => `<span>${name} <strong>${formatValue(id, round(id, v))}</strong></span>`;
  return `
    <div class="chart">
      <div class="chart-head">
        <span class="chart-title">${label}</span>
        <span class="chart-last">${statusDot(id, last)}${formatValue(id, last)}${last == null ? '' : unitSuffix}</span>
      </div>
      ${svg}
      <div class="chart-stats">
        ${series.length ? `
          ${stat('min', Math.min(...series))}
          ${stat('median', percentile(series, 50))}
          ${stat('p75', percentile(series, 75))}
          ${stat('max', Math.max(...series))}
        ` : '<span>not enough data</span>'}
      </div>
    </div>
  `;
}

function renderDetail() {
  const el = document.getElementById('detail');
  const page = pages.find(p => p.page === selectedPage);
  if (!page) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  const href = safeHref(page);
  const m = page.metrics || {};
  const slow = [...(m.slowResources || [])].sort((a, b) => b.duration - a.duration);
  const renders = m.renders;

  const slowHtml = slow.length ? slow.map(r => `
    <div class="list-row">
      <span class="name" title="${escapeHtml(r.name)}">${escapeHtml(r.name)}</span>
      <span class="value bad">${Number(r.duration)} ms</span>
    </div>
  `).join('') : '<div class="empty-state">No slow resources 🎉</div>';

  let rendersHtml;
  if (renders && renders.components && renders.components.length) {
    rendersHtml = renders.components.map(c => `
      <div class="list-row">
        <span class="name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</span>
        <span class="value">${Number(c.renders)}</span>
      </div>
    `).join('');
  } else {
    rendersHtml = '<div class="empty-state">No re-renders recorded.</div>';
  }

  const leak = m.memoryLeak
    ? `<p class="note">🔔 Possible memory leak: JS heap grew ${Number(m.memoryLeak.growthMB)} MB (+${Number(m.memoryLeak.growthPct)}%).</p>`
    : '';

  el.innerHTML = `
    <div class="detail-header">
      <div>
        <h3>${escapeHtml(page.page)}</h3>
        ${href ? `<a href="${escapeHtml(href)}" target="_blank" rel="noopener">Open page ↗</a>` : ''}
      </div>
      <div class="actions">
        <button id="detail-csv">📥 CSV</button>
        <button id="detail-close" aria-label="Close details">✕</button>
      </div>
    </div>
    ${leak}
    <h2>Trends (${page.sessions} page load${page.sessions === 1 ? '' : 's'})</h2>
    <div class="chart-grid">${METRICS.map(metric => chartCard(page, metric)).join('')}</div>
    <div class="detail-columns">
      <div>
        <h2>Slow resources (latest load)</h2>
        <div class="list">${slowHtml}</div>
      </div>
      <div>
        <h2>Top re-rendering components${renders && renders.framework ? ` · ${escapeHtml(renders.framework)}` : ''}</h2>
        ${renders && renders.note ? `<p class="note">${escapeHtml(renders.note)}</p>` : ''}
        <div class="list">${rendersHtml}</div>
      </div>
    </div>
  `;

  document.getElementById('detail-close').addEventListener('click', () => {
    selectedPage = null;
    render();
  });
  document.getElementById('detail-csv').addEventListener('click', () => {
    const rows = page.history.map(entry => ({ page: page.page, entry }));
    PerfSettings.downloadFile(filename(PerfSettings.safeFilePart(page.page), 'csv'), PerfSettings.historyToCsv(rows), 'text/csv');
  });
}

function render() {
  renderOverview();
  renderTable();
  renderDetail();
}

// ---------- Actions ----------

function filename(part, ext) {
  return `perfdebugger-${part}-${new Date().toISOString().slice(0, 10)}.${ext}`;
}

function deletePage(page) {
  if (!confirm(`Delete all PerfDebugger data for ${page}?`)) return;
  chrome.storage.local.remove([`metrics_${page}`, `history_${page}`], () => showToast('Page data deleted'));
}

document.getElementById('pages-body').addEventListener('click', (e) => {
  const del = e.target.closest('[data-delete]');
  if (del) {
    e.stopPropagation();
    deletePage(del.dataset.delete);
    return;
  }
  const row = e.target.closest('tr[data-page]');
  if (!row) return;
  selectedPage = selectedPage === row.dataset.page ? null : row.dataset.page;
  render();
  if (selectedPage) document.getElementById('detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

document.getElementById('pages-body').addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('tr[data-page]');
  if (!row || e.target !== row) return;
  e.preventDefault();
  row.click();
});

document.querySelectorAll('.pages th[data-sort]').forEach(th => {
  th.addEventListener('click', () => {
    const key = th.dataset.sort;
    if (sort.key === key) sort.dir = sort.dir === 'asc' ? 'desc' : 'asc';
    else sort = { key, dir: key === 'page' ? 'asc' : 'desc' };
    renderTable();
  });
});

document.getElementById('search').addEventListener('input', (e) => {
  filter = e.target.value;
  renderTable();
});

document.getElementById('export-json-btn').addEventListener('click', () => {
  const report = {
    generatedAt: new Date().toISOString(),
    extensionVersion: chrome.runtime.getManifest().version,
    thresholds: settings.thresholds,
    pages: pages.map(p => ({ page: p.page, current: p.metrics, history: p.history }))
  };
  PerfSettings.downloadFile(filename('all-pages', 'json'), JSON.stringify(report, null, 2), 'application/json');
});

document.getElementById('export-csv-btn').addEventListener('click', () => {
  const rows = [];
  pages.forEach(p => p.history.forEach(entry => rows.push({ page: p.page, entry })));
  rows.sort((a, b) => a.entry.timestamp - b.entry.timestamp);
  PerfSettings.downloadFile(filename('all-pages', 'csv'), PerfSettings.historyToCsv(rows), 'text/csv');
});

document.getElementById('clear-all-btn').addEventListener('click', () => {
  if (!confirm('Delete ALL metrics and history for every page? Your settings are kept.')) return;
  chrome.storage.local.get(null, (items) => {
    const keys = Object.keys(items).filter(k => k.startsWith('metrics_') || k.startsWith('history_'));
    chrome.storage.local.remove(keys, () => showToast('All data deleted'));
  });
});

document.getElementById('version').textContent = `PerfDebugger v${chrome.runtime.getManifest().version}`;

// Live updates — debounced, since content scripts write frequently.
let reloadTimer = null;
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[PerfSettings.SETTINGS_KEY]) {
    settings = PerfSettings.normalize(changes[PerfSettings.SETTINGS_KEY].newValue);
    render();
    return;
  }
  if (area !== 'local') return;
  clearTimeout(reloadTimer);
  reloadTimer = setTimeout(load, 1000);
});

PerfSettings.load((loaded) => {
  settings = loaded;
  load();
});
