// background.js - Extension service worker.
// Periodically deletes metrics/history older than the retention window
// (configurable in Settings, default 7 days).

importScripts('../shared/settings.js');

// Ensure the cleanup alarm exists. Only (re)creates if missing, so we don't
// reset the schedule on every service-worker wake.
function ensureCleanupAlarm() {
  chrome.alarms.get('cleanup', (existing) => {
    if (!existing) {
      chrome.alarms.create('cleanup', { periodInMinutes: 60 });
    }
  });
}

chrome.runtime.onInstalled.addListener(() => {
  ensureCleanupAlarm();
});

chrome.runtime.onStartup.addListener(ensureCleanupAlarm);

function cleanup() {
  PerfSettings.load((settings) => {
    chrome.storage.local.get(null, (items) => pruneItems(items, settings.retentionDays));
  });
}

function pruneItems(items, retentionDays) {
  const now = Date.now();
  const maxAge = retentionDays * 24 * 60 * 60 * 1000;
  const toRemove = [];
  const toUpdate = {};

  Object.keys(items).forEach(key => {
    if (key.startsWith('metrics_')) {
      const data = items[key];
      if (data && data.timestamp && (now - data.timestamp) > maxAge) {
        toRemove.push(key);
      }
    } else if (key.startsWith('history_')) {
      const arr = items[key];
      if (!Array.isArray(arr)) return;
      const kept = arr.filter(e => e && e.timestamp && (now - e.timestamp) <= maxAge);
      if (kept.length === 0) {
        toRemove.push(key);
      } else if (kept.length !== arr.length) {
        toUpdate[key] = kept;
      }
    }
  });

  if (toRemove.length > 0) {
    chrome.storage.local.remove(toRemove);
  }
  if (Object.keys(toUpdate).length > 0) {
    chrome.storage.local.set(toUpdate);
  }
}

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'cleanup') cleanup();
});

// Apply a shorter retention window right away instead of waiting for the alarm.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes[PerfSettings.SETTINGS_KEY]) cleanup();
});
