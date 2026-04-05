// PEP Bridge - Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  // Set default configuration
  chrome.storage.sync.set({
    webhookUrl: 'http://localhost:3001/api/pep-sync',
    pollInterval: 60000,
    enabled: true
  });
  console.log('[PEP Bridge] Extension installed with default settings');
});
