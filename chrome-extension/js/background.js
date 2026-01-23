// Freight Connect Pro - Background Service Worker

// Handle extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('Freight Connect Pro installed - v2.0');
    
    // Set default settings
    chrome.storage.local.set({
      settings: {
        autoRefresh: true,
        refreshInterval: 30,
        defaultEquipment: 'Van',
        minRpmAlert: 2.0
      },
      // Default email template
      templates: [{
        template_id: 'default_001',
        name: 'Quick Inquiry',
        subject: 'Load Inquiry: {origin} to {destination}',
        body: `Hi {broker_name},

I'm interested in your load from {origin} to {destination}.

Rate: {rate}
Miles: {miles}

I have availability and can pick up as scheduled. Please let me know if this load is still available.

Thank you!`,
        is_default: true
      }],
      emailAccounts: [
        { id: 'acc_1', email: 'your-email@example.com', company: 'Your Company', phone: '', isMain: true }
      ],
      activeAccountId: 'acc_1',
      stats: { sent: 0, today: 0, matched: 0, skipped: 0 },
      emailedLoads: []
    });
  }
  
  if (details.reason === 'update') {
    console.log('Freight Connect Pro updated to v2.0');
  }
});

// Handle messages from popup and content scripts
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
  
  // Handle compose modal request from content script
  if (request.action === 'openComposeModal') {
    // Store load data for popup
    chrome.storage.local.set({ pendingEmailLoad: request.loadData }, () => {
      // Try to open popup (will fail if not triggered by user action)
      // The content script will fallback to mailto
      sendResponse({ success: true });
    });
    return true;
  }
  
  // Get templates for content script
  if (request.action === 'getTemplates') {
    chrome.storage.local.get(['templates', 'emailAccounts', 'activeAccountId'], (result) => {
      sendResponse(result);
    });
    return true;
  }
  
  // Update stats from content script
  if (request.action === 'updateStats') {
    chrome.storage.local.get(['stats', 'emailedLoads'], (result) => {
      const stats = result.stats || { sent: 0, today: 0, matched: 0, skipped: 0 };
      const emailedLoads = result.emailedLoads || [];
      
      if (request.loadId) {
        emailedLoads.push(request.loadId);
        stats.sent++;
        stats.today++;
      }
      
      chrome.storage.local.set({ stats, emailedLoads }, () => {
        sendResponse({ success: true, stats });
      });
    });
    return true;
  }
});

// Listen for tab updates to inject content scripts if needed
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    const supportedSites = [
      'dat.com',
      'power.dat.com',
      'one.dat.com',
      'truckstop.com'
    ];
    
    const isLoadBoard = supportedSites.some(site => tab.url.includes(site));
    
    if (isLoadBoard) {
      console.log('[FCP] Load board detected:', tab.url);
      
      // Badge to show extension is active on this page
      chrome.action.setBadgeText({ text: 'ON', tabId });
      chrome.action.setBadgeBackgroundColor({ color: '#22c55e', tabId });
    } else {
      chrome.action.setBadgeText({ text: '', tabId });
    }
  }
});

// Alarm for auto-refresh
chrome.alarms.create('refreshLoads', { periodInMinutes: 0.5 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshLoads') {
    chrome.runtime.sendMessage({ action: 'autoRefresh' }).catch(() => {
      // Popup not open, ignore
    });
  }
});

// Reset daily stats at midnight
chrome.alarms.create('resetDailyStats', { 
  when: getNextMidnight(),
  periodInMinutes: 24 * 60 
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetDailyStats') {
    chrome.storage.local.get(['stats'], (result) => {
      const stats = result.stats || {};
      stats.today = 0;
      chrome.storage.local.set({ stats });
    });
  }
});

function getNextMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return midnight.getTime();
}
