// PEP Bridge - Popup Script
const webhookInput = document.getElementById('webhookUrl');
const pollInput = document.getElementById('pollInterval');
const enabledToggle = document.getElementById('enabledToggle');
const saveBtn = document.getElementById('saveBtn');
const statusMsg = document.getElementById('statusMsg');
const statusDot = document.getElementById('statusDot');
const urlHint = document.getElementById('urlHint');

let enabled = true;

// Load saved settings
chrome.storage.sync.get(['webhookUrl', 'pollInterval', 'enabled'], (config) => {
  webhookInput.value = config.webhookUrl || 'http://localhost:3001/api/pep-sync';
  pollInput.value = (config.pollInterval || 60000) / 1000;
  enabled = config.enabled !== false;
  updateToggle();
  updateHint();
});

function updateToggle() {
  enabledToggle.className = 'toggle' + (enabled ? ' on' : '');
  statusDot.style.background = enabled ? '#22c55e' : '#ef4444';
}

function updateHint() {
  const url = webhookInput.value.trim();
  if (url.startsWith('https://')) {
    urlHint.style.color = '#22c55e';
    urlHint.textContent = '✓ Using live Railway/Render server';
  } else if (url.startsWith('http://localhost')) {
    urlHint.style.color = '#f59e0b';
    urlHint.textContent = '⚠ Using local server (only works on this computer)';
  } else {
    urlHint.style.color = '#94a3b8';
    urlHint.textContent = '';
  }
}

enabledToggle.addEventListener('click', () => {
  enabled = !enabled;
  updateToggle();
});

webhookInput.addEventListener('input', updateHint);

saveBtn.addEventListener('click', () => {
  const webhookUrl = webhookInput.value.trim();
  const pollInterval = parseInt(pollInput.value) * 1000;

  if (!webhookUrl) {
    statusMsg.style.color = '#ef4444';
    statusMsg.textContent = 'Webhook URL is required';
    return;
  }

  chrome.storage.sync.set({ webhookUrl, pollInterval, enabled }, () => {
    statusMsg.style.color = '#22c55e';
    statusMsg.textContent = 'Saved! Reload the PEP tab to apply.';
    setTimeout(() => { statusMsg.textContent = ''; }, 3000);
  });
});
