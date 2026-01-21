// Popup JavaScript
let loadData = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  console.log('LoadConnect Pro initialized');
  
  // Load saved settings
  loadSettings();
  
  // Setup event listeners
  setupListeners();
  
  // Get load data from active tab
  getLoadData();
}

function setupListeners() {
  // Email buttons
  document.querySelectorAll('.email-btn').forEach(btn => {
    btn.addEventListener('click', handleEmailClick);
  });
  
  // Action buttons
  document.getElementById('mapBtn').addEventListener('click', openMap);
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  document.getElementById('copyBtn').addEventListener('click', copyLoadInfo);
  
  // Settings
  document.getElementById('colorToggle').addEventListener('change', toggleColorFilter);
}

async function loadSettings() {
  try {
    const data = await chrome.storage.local.get(['colorFilterEnabled', 'loadData']);
    
    if (data.loadData) {
      loadData = data.loadData;
      displayLoadInfo(loadData);
    }
    
    const colorToggle = document.getElementById('colorToggle');
    colorToggle.checked = data.colorFilterEnabled !== false;
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function getLoadData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url) {
      showStatus('Please open Truckstop or DAT', 'info');
      return;
    }
    
    const isTruckstop = tab.url.includes('truckstop.com');
    const isDAT = tab.url.includes('dat.com');
    
    if (!isTruckstop && !isDAT) {
      showStatus('This extension works on Truckstop and DAT', 'info');
      return;
    }
    
    chrome.tabs.sendMessage(tab.id, { action: 'getLoadData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error:', chrome.runtime.lastError);
        showStatus('Please refresh the page', 'error');
        return;
      }
      
      if (response?.success && response.data) {
        loadData = response.data;
        displayLoadInfo(loadData);
        chrome.storage.local.set({ loadData });
        showStatus('Load data loaded!', 'success');
      } else {
        showStatus('No load selected. Click on a load first.', 'info');
      }
    });
  } catch (error) {
    console.error('Error getting load data:', error);
    showStatus('Error loading data', 'error');
  }
}

function displayLoadInfo(data) {
  const loadInfoDiv = document.getElementById('loadInfo');
  loadInfoDiv.classList.remove('hidden');
  
  document.getElementById('origin').textContent = data.origin || '-';
  document.getElementById('destination').textContent = data.destination || '-';
  document.getElementById('distance').textContent = data.distance ? `${data.distance} mi` : '-';
  document.getElementById('rate').textContent = data.rate ? `$${data.rate}` : '-';
  
  const rpmElement = document.getElementById('rpm');
  if (data.rpm) {
    rpmElement.textContent = `$${data.rpm}/mi`;
    
    // Color code RPM
    rpmElement.style.color = getRPMColor(parseFloat(data.rpm));
  } else {
    rpmElement.textContent = '-';
  }
}

function getRPMColor(rpm) {
  if (rpm < 1.5) return '#d32f2f'; // Red
  if (rpm < 2.0) return '#f57c00'; // Orange
  if (rpm < 2.5) return '#fbc02d'; // Yellow
  if (rpm < 3.0) return '#689f38'; // Light Green
  return '#2e7d32'; // Green
}

function handleEmailClick(e) {
  const btn = e.currentTarget;
  const email = btn.dataset.email;
  
  if (!loadData) {
    showStatus('No load data available', 'error');
    return;
  }
  
  btn.classList.add('loading');
  
  const subject = `Load Inquiry: ${loadData.origin} to ${loadData.destination}`;
  const body = generateEmailBody(loadData, email);
  
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  chrome.tabs.create({ url: gmailUrl });
  
  showStatus('Gmail opened with pre-filled email!', 'success');
  
  setTimeout(() => btn.classList.remove('loading'), 1000);
}

function generateEmailBody(data, fromEmail) {
  return `Hello,

I saw your load from ${data.origin} to ${data.destination}. Could you please provide more details about the rate and availability?

Load Details:
- Origin: ${data.origin}
- Destination: ${data.destination}
- Distance: ${data.distance || 'N/A'} miles
- Rate: $${data.rate || 'N/A'}
- Rate per Mile: $${data.rpm || 'N/A'}/mi

Please let me know if this load is still available.

Thank you,
${fromEmail}`;
}

function openMap() {
  if (!loadData?.origin || !loadData?.destination) {
    showStatus('Origin and destination required', 'error');
    return;
  }
  
  const mapsUrl = `https://www.google.com/maps/dir/${encodeURIComponent(loadData.origin)}/${encodeURIComponent(loadData.destination)}`;
  chrome.tabs.create({ url: mapsUrl });
  
  showStatus('Opening Google Maps...', 'success');
}

function refreshData() {
  showStatus('Refreshing...', 'info');
  getLoadData();
}

async function copyLoadInfo() {
  if (!loadData) {
    showStatus('No load data to copy', 'error');
    return;
  }
  
  const text = `Load: ${loadData.origin} to ${loadData.destination}
Distance: ${loadData.distance} mi
Rate: $${loadData.rate}
RPM: $${loadData.rpm}/mi`;
  
  try {
    await navigator.clipboard.writeText(text);
    showStatus('Copied to clipboard!', 'success');
  } catch (error) {
    console.error('Copy failed:', error);
    showStatus('Copy failed', 'error');
  }
}

async function toggleColorFilter(e) {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ colorFilterEnabled: enabled });
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleColorFilter',
      enabled 
    });
    
    showStatus(`Color filter ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    console.error('Error toggling filter:', error);
  }
}

function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('statusMsg');
  statusDiv.textContent = message;
  statusDiv.className = `status-msg ${type}`;
  statusDiv.classList.remove('hidden');
  
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 3000);
}