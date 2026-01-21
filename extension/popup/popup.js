// Popup JavaScript for Freight Connect Pro

let loadData = null;
let authToken = null;

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('Popup initialized');
  
  // Load saved data
  await loadStoredData();
  
  // Check authentication status
  await checkAuthStatus();
  
  // Set up event listeners
  setupEventListeners();
  
  // Request load data from content script
  requestLoadData();
});

// Load stored data from chrome.storage
async function loadStoredData() {
  try {
    const data = await chrome.storage.local.get(['loadData', 'authToken', 'colorFilterEnabled']);
    
    if (data.loadData) {
      loadData = data.loadData;
      displayLoadInfo(loadData);
    }
    
    if (data.authToken) {
      authToken = data.authToken;
    }
    
    // Set color filter checkbox
    const colorFilterCheckbox = document.getElementById('colorFilter');
    colorFilterCheckbox.checked = data.colorFilterEnabled !== false;
  } catch (error) {
    console.error('Error loading stored data:', error);
  }
}

// Check authentication status
async function checkAuthStatus() {
  const authBtn = document.getElementById('authBtn');
  
  if (authToken) {
    authBtn.textContent = '✓ Signed In';
    authBtn.classList.add('authenticated');
  } else {
    authBtn.textContent = 'Sign in with Gmail';
    authBtn.classList.remove('authenticated');
  }
}

// Set up all event listeners
function setupEventListeners() {
  // Email buttons
  document.getElementById('emailBtn1').addEventListener('click', () => sendEmail('aminpanshiri1@gmail.com'));
  document.getElementById('emailBtn2').addEventListener('click', () => sendEmail('info@freightwiz.us'));
  document.getElementById('emailBtn3').addEventListener('click', () => sendEmail('info@generalfreightinc.com'));
  
  // Action buttons
  document.getElementById('showMapBtn').addEventListener('click', showRouteMap);
  document.getElementById('refreshBtn').addEventListener('click', refreshData);
  
  // Settings
  document.getElementById('colorFilter').addEventListener('change', toggleColorFilter);
  document.getElementById('authBtn').addEventListener('click', handleAuth);
}

// Request load data from active tab
async function requestLoadData() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.url) {
      showStatus('Please navigate to Truckstop or DAT', 'info');
      return;
    }
    
    // Check if we're on a supported site
    const isTruckstop = tab.url.includes('truckstop.com');
    const isDAT = tab.url.includes('dat.com');
    
    if (!isTruckstop && !isDAT) {
      showStatus('This extension works on Truckstop and DAT websites', 'info');
      return;
    }
    
    // Send message to content script
    chrome.tabs.sendMessage(tab.id, { action: 'getLoadData' }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting load data:', chrome.runtime.lastError);
        showStatus('Please refresh the page and try again', 'error');
        return;
      }
      
      if (response && response.data) {
        loadData = response.data;
        displayLoadInfo(loadData);
        // Save to storage
        chrome.storage.local.set({ loadData });
        showStatus('Load data updated!', 'success');
      } else {
        showStatus('No load data found on this page', 'info');
      }
    });
  } catch (error) {
    console.error('Error requesting load data:', error);
    showStatus('Error loading data', 'error');
  }
}

// Display load information
function displayLoadInfo(data) {
  const loadInfoDiv = document.getElementById('loadInfo');
  loadInfoDiv.classList.remove('hidden');
  
  document.getElementById('origin').textContent = data.origin || '-';
  document.getElementById('destination').textContent = data.destination || '-';
  document.getElementById('distance').textContent = data.distance ? `${data.distance} mi` : '-';
  document.getElementById('rate').textContent = data.rate ? `$${data.rate}` : '-';
  document.getElementById('ratePerMile').textContent = data.ratePerMile ? `$${data.ratePerMile}/mi` : '-';
}

// Send email via Gmail API
async function sendEmail(recipientEmail) {
  if (!loadData) {
    showStatus('No load data available. Please refresh.', 'error');
    return;
  }
  
  if (!authToken) {
    showStatus('Please sign in with Gmail first', 'error');
    return;
  }
  
  const btn = event.target.closest('.email-btn');
  btn.classList.add('loading');
  btn.disabled = true;
  
  try {
    // Send message to background script to send email
    const response = await chrome.runtime.sendMessage({
      action: 'sendEmail',
      data: {
        to: recipientEmail,
        from: recipientEmail,
        subject: `Load Inquiry: ${loadData.origin} to ${loadData.destination}`,
        body: generateEmailBody(loadData, recipientEmail)
      }
    });
    
    if (response && response.success) {
      showStatus(`Email sent to ${recipientEmail}!`, 'success');
    } else {
      showStatus(response.error || 'Failed to send email', 'error');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    showStatus('Error sending email. Please try again.', 'error');
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
}

// Generate email body
function generateEmailBody(data, fromEmail) {
  return `Hello,

I saw your load from ${data.origin} to ${data.destination}. Could you please provide more details about the rate and availability?

Load Details:
- Origin: ${data.origin}
- Destination: ${data.destination}
- Distance: ${data.distance || 'N/A'} miles
- Rate: $${data.rate || 'N/A'}
- Rate per Mile: $${data.ratePerMile || 'N/A'}/mi

Please let me know if this load is still available and if you need any additional information.

Thank you,
${fromEmail}`;
}

// Show route on Google Maps
async function showRouteMap() {
  if (!loadData || !loadData.origin || !loadData.destination) {
    showStatus('Origin and destination required', 'error');
    return;
  }
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Send message to content script to show map
    chrome.tabs.sendMessage(tab.id, { 
      action: 'showMap',
      origin: loadData.origin,
      destination: loadData.destination
    });
    
    showStatus('Opening map...', 'success');
  } catch (error) {
    console.error('Error showing map:', error);
    showStatus('Error showing map', 'error');
  }
}

// Refresh data
function refreshData() {
  showStatus('Refreshing data...', 'info');
  requestLoadData();
}

// Toggle color filter
async function toggleColorFilter(e) {
  const enabled = e.target.checked;
  await chrome.storage.local.set({ colorFilterEnabled: enabled });
  
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { 
      action: 'toggleColorFilter',
      enabled: enabled
    });
    
    showStatus(`Color filter ${enabled ? 'enabled' : 'disabled'}`, 'success');
  } catch (error) {
    console.error('Error toggling color filter:', error);
  }
}

// Handle authentication
async function handleAuth() {
  try {
    const response = await chrome.runtime.sendMessage({ action: 'authenticate' });
    
    if (response && response.success) {
      authToken = response.token;
      await chrome.storage.local.set({ authToken });
      await checkAuthStatus();
      showStatus('Successfully signed in!', 'success');
    } else {
      showStatus(response.error || 'Authentication failed', 'error');
    }
  } catch (error) {
    console.error('Authentication error:', error);
    showStatus('Authentication error. Please try again.', 'error');
  }
}

// Show status message
function showStatus(message, type = 'info') {
  const statusDiv = document.getElementById('status');
  const statusIcon = document.getElementById('statusIcon');
  const statusText = document.getElementById('statusText');
  
  statusDiv.className = `status ${type}`;
  statusDiv.classList.remove('hidden');
  
  // Set icon based on type
  const icons = {
    success: '✓',
    error: '✗',
    info: 'ℹ️'
  };
  
  statusIcon.textContent = icons[type] || icons.info;
  statusText.textContent = message;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 5000);
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'loadDataUpdated') {
    loadData = request.data;
    displayLoadInfo(loadData);
    chrome.storage.local.set({ loadData });
  }
});