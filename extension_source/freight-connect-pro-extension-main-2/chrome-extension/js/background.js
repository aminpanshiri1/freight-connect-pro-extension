// Freight Connect Pro - Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Freight Connect Pro installed');
    
    // Set default settings
    chrome.storage.local.set({
      settings: {
        autoRefresh: true,
        refreshInterval: 30,
        defaultEquipment: 'Van',
        minRpmAlert: 2.0
      }
    });
  }
});

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'checkAuth') {
    chrome.storage.local.get(['user'], (result) => {
      sendResponse({ user: result.user || null });
    });
    return true;
  }
  
  if (request.action === 'logout') {
    chrome.storage.local.remove(['user', 'session_token'], () => {
      sendResponse({ success: true });
    });
    return true;
  }
});

// Listen for tab updates (for future load board integration)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    // Check if on supported load board sites
    const supportedSites = [
      'dat.com',
      'power.dat.com',
      'truckstop.com',
      'loadboard.com'
    ];
    
    const isLoadBoard = supportedSites.some(site => tab.url?.includes(site));
    
    if (isLoadBoard) {
      // Could inject content script here for load board integration
      console.log('Load board detected:', tab.url);
    }
  }
});

// Alarm for auto-refresh
chrome.alarms.create('refreshLoads', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshLoads') {
    // Send message to popup to refresh (if open)
    chrome.runtime.sendMessage({ action: 'autoRefresh' }).catch(() => {
      // Popup not open, ignore
    });
  }
});
