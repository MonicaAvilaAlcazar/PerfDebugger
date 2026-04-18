// popup.js - Reads data from chrome.storage and renders it in the UI.

// Thresholds used to color the status dot (good/warn/bad).
const THRESHOLDS = {
  lcp: { good: 2500, warn: 4000 },      // ms
  fcp: { good: 1800, warn: 3000 },      // ms
  cls: { good: 0.1, warn: 0.25 },       // score
  inp: { good: 200, warn: 500 },        // ms
  ttfb: { good: 800, warn: 1800 },      // ms
  memory: { good: 100, warn: 300 }      // MB
};

// Returns the status class for a given metric value.
function getStatus(metric, value) {
  if (value === null || value === undefined) return '';
  const thresh = THRESHOLDS[metric];
  if (!thresh) return '';
  if (value <= thresh.good) return 'status-good';
  if (value <= thresh.warn) return 'status-warn';
  return 'status-bad';
}

// Updates a single metric in the UI.
function updateMetric(id, value, metricType) {
  const valueEl = document.getElementById(`${id}-value`);
  const statusEl = document.getElementById(`${id}-status`);
  
  if (value !== null && value !== undefined) {
    valueEl.textContent = value;
    statusEl.className = 'metric-status ' + getStatus(metricType, value);
  }
}

// Renders the slow-resources list.
function renderSlowResources(resources) {
  const container = document.getElementById('slow-resources-list');
  
  if (!resources || resources.length === 0) {
    container.innerHTML = '<div class="empty-state">No slow resources detected 🎉</div>';
    return;
  }
  
  // Sort by duration (descending).
  const sorted = [...resources].sort((a, b) => b.duration - a.duration);
  
  container.innerHTML = sorted.map(r => {
    const sizeKB = r.size ? `${Math.round(r.size / 1024)}KB` : 'N/A';
    const shortName = r.name.length > 60 ? r.name.substring(0, 60) + '...' : r.name;
    return `
      <div class="resource-item">
        <div class="resource-name">${escapeHtml(shortName)}</div>
        <div class="resource-meta">
          <span>${r.type} • ${sizeKB}</span>
          <span class="resource-duration">${r.duration}ms</span>
        </div>
      </div>
    `;
  }).join('');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// Loads metrics for the currently active tab.
function loadCurrentTabMetrics() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;
    
    const url = new URL(tabs[0].url);
    const key = `metrics_${url.hostname}${url.pathname}`;
    const label = url.hostname + url.pathname;

    // Show the current URL.
    document.getElementById('current-url').textContent = label;

    // Read metrics from storage.
    chrome.storage.local.get(key, (data) => {
      const metrics = data[key];

      if (!metrics) {
        document.getElementById('current-url').textContent = label + ' (no data yet - reload page)';
        return;
      }
      
      // Update each metric.
      updateMetric('lcp', metrics.lcp, 'lcp');
      updateMetric('fcp', metrics.fcp, 'fcp');
      updateMetric('cls', metrics.cls, 'cls');
      updateMetric('inp', metrics.inp, 'inp');
      updateMetric('ttfb', metrics.ttfb, 'ttfb');
      
      // Memory
      if (metrics.memory) {
        updateMetric('memory', metrics.memory.used, 'memory');
      }
      
      // Slow resources
      renderSlowResources(metrics.slowResources);
    });
  });
}

// Event listeners
document.getElementById('refresh-btn').addEventListener('click', loadCurrentTabMetrics);

document.getElementById('clear-btn').addEventListener('click', () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0] || !tabs[0].url) return;
    const url = new URL(tabs[0].url);
    const key = `metrics_${url.hostname}${url.pathname}`;
    chrome.storage.local.remove(key, () => {
      loadCurrentTabMetrics();
    });
  });
});

// Initial load.
let currentKey = null;
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  if (tabs[0] && tabs[0].url) {
    const url = new URL(tabs[0].url);
    currentKey = `metrics_${url.hostname}${url.pathname}`;
  }
  loadCurrentTabMetrics();
});

// Reactive: re-render only when the active tab's data changes.
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !currentKey) return;
  if (changes[currentKey]) loadCurrentTabMetrics();
});
