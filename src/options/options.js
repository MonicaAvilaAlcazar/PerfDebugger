// options.js - Settings page: thresholds, slow-resource cutoff, retention,
// re-render tracking. Saved to chrome.storage.sync.

const { METRICS, DEFAULT_SETTINGS } = PerfSettings;

const form = document.getElementById('settings-form');
const errorEl = document.getElementById('form-error');

function stepFor(id) {
  return id === 'cls' ? '0.01' : '1';
}

function buildThresholdRows() {
  const body = document.getElementById('thresholds-body');
  body.innerHTML = METRICS.map(({ id, label, name, unit }) => `
    <tr>
      <td class="metric-name"><strong>${label}</strong><span>${name}</span></td>
      <td>
        <div class="input-unit">
          <input type="number" id="${id}-good" min="0" step="${stepFor(id)}" aria-label="${label} good up to">
          <span>${unit}</span>
        </div>
      </td>
      <td>
        <div class="input-unit">
          <input type="number" id="${id}-warn" min="0" step="${stepFor(id)}" aria-label="${label} needs improvement up to">
          <span>${unit}</span>
        </div>
      </td>
      <td class="poor" id="${id}-poor"></td>
    </tr>
  `).join('');
}

function updatePoorLabels() {
  METRICS.forEach(({ id, unit }) => {
    const warn = document.getElementById(`${id}-warn`).value;
    document.getElementById(`${id}-poor`).textContent = warn === '' ? '' : `above ${warn}${unit ? ' ' + unit : ''}`;
  });
}

function fill(settings) {
  METRICS.forEach(({ id }) => {
    document.getElementById(`${id}-good`).value = settings.thresholds[id].good;
    document.getElementById(`${id}-warn`).value = settings.thresholds[id].warn;
  });
  document.getElementById('slow-resource-ms').value = settings.slowResourceMs;
  document.getElementById('retention-days').value = settings.retentionDays;
  document.getElementById('render-tracking').checked = settings.renderTracking;
  updatePoorLabels();
}

// Returns { settings } or { error } with offending inputs highlighted.
function readForm() {
  form.querySelectorAll('input.invalid').forEach(el => el.classList.remove('invalid'));
  const errors = [];
  const thresholds = {};

  METRICS.forEach(({ id, label }) => {
    const goodEl = document.getElementById(`${id}-good`);
    const warnEl = document.getElementById(`${id}-warn`);
    const good = parseFloat(goodEl.value);
    const warn = parseFloat(warnEl.value);
    if (!Number.isFinite(good) || good < 0) {
      goodEl.classList.add('invalid');
      errors.push(`${label}: "good" must be a positive number.`);
    }
    if (!Number.isFinite(warn) || warn < 0) {
      warnEl.classList.add('invalid');
      errors.push(`${label}: "needs improvement" must be a positive number.`);
    } else if (Number.isFinite(good) && warn < good) {
      warnEl.classList.add('invalid');
      errors.push(`${label}: "needs improvement" must be ≥ "good".`);
    }
    thresholds[id] = { good, warn };
  });

  const slowEl = document.getElementById('slow-resource-ms');
  const slowResourceMs = parseInt(slowEl.value, 10);
  if (!Number.isFinite(slowResourceMs) || slowResourceMs < 100 || slowResourceMs > 60000) {
    slowEl.classList.add('invalid');
    errors.push('Slow-request threshold must be between 100 and 60000 ms.');
  }

  const retEl = document.getElementById('retention-days');
  const retentionDays = parseInt(retEl.value, 10);
  if (!Number.isFinite(retentionDays) || retentionDays < 1 || retentionDays > 30) {
    retEl.classList.add('invalid');
    errors.push('Retention must be between 1 and 30 days.');
  }

  if (errors.length) return { error: errors.join(' ') };
  return {
    settings: {
      thresholds,
      slowResourceMs,
      retentionDays,
      renderTracking: document.getElementById('render-tracking').checked
    }
  };
}

let toastTimer = null;
function showToast(text) {
  const toast = document.getElementById('toast');
  toast.textContent = text;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 1800);
}

form.addEventListener('input', updatePoorLabels);

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const { settings, error } = readForm();
  if (error) {
    errorEl.textContent = error;
    errorEl.hidden = false;
    return;
  }
  errorEl.hidden = true;
  PerfSettings.save(settings, () => showToast('Settings saved'));
});

document.getElementById('reset-btn').addEventListener('click', () => {
  fill(PerfSettings.normalize(DEFAULT_SETTINGS));
  errorEl.hidden = true;
  form.querySelectorAll('input.invalid').forEach(el => el.classList.remove('invalid'));
  PerfSettings.save(DEFAULT_SETTINGS, () => showToast('Defaults restored'));
});

document.getElementById('version').textContent = `PerfDebugger v${chrome.runtime.getManifest().version}`;

buildThresholdRows();
PerfSettings.load(fill);
