// background.js - Extension service worker.

// Ensure the cleanup alarm exists. Only (re)creates if missing, so we don't
// reset the schedule on every service-worker wake.
function ensureCleanupAlarm() {
  chrome.alarms.get('cleanup', (existing) => {
    if (!existing) {
      chrome.alarms.create('cleanup', { periodInMinutes: 60 });
    }
  });
}

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('PerfDebugger installed!');
  }
  ensureCleanupAlarm();
});

chrome.runtime.onStartup.addListener(ensureCleanupAlarm);

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name !== 'cleanup') return;
  chrome.storage.local.get(null, (items) => {
    const now = Date.now();
    const weekAgo = 7 * 24 * 60 * 60 * 1000;
    const toRemove = [];

    Object.keys(items).forEach(key => {
      if (key.startsWith('metrics_')) {
        const data = items[key];
        if (data.timestamp && (now - data.timestamp) > weekAgo) {
          toRemove.push(key);
        }
      }
    });

    if (toRemove.length > 0) {
      chrome.storage.local.remove(toRemove);
    }
  });
});
