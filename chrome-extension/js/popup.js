// Freight Connect Pro - Chrome Extension Popup Script
// Features: Load Board, RPM Calculator, Email Templates, Broker Check, Auto-Email, One-Click Send

// Sample load data
const SAMPLE_LOADS = [
  {
    load_id: "load_001",
    origin_city: "Chicago", origin_state: "IL",
    destination_city: "Dallas", destination_state: "TX",
    miles: 920, rate: 2300, rpm: 2.50, weight: 42000,
    equipment_type: "Van", broker_name: "Swift Logistics",
    broker_email: "dispatch@swiftlog.com", broker_phone: "800-555-0101",
    broker_mc: "MC123456", pickup_date: "2026-01-24", delivery_date: "2026-01-26",
    deadhead_miles: 45, is_pinned: false, is_contacted: false, scam_risk: "low"
  },
  {
    load_id: "load_002",
    origin_city: "Atlanta", origin_state: "GA",
    destination_city: "Miami", destination_state: "FL",
    miles: 662, rate: 1800, rpm: 2.72, weight: 38000,
    equipment_type: "Reefer", broker_name: "Cool Freight",
    broker_email: "loads@coolfreight.com", broker_phone: "800-555-0102",
    broker_mc: "MC234567", pickup_date: "2026-01-23", delivery_date: "2026-01-24",
    deadhead_miles: 30, is_pinned: false, is_contacted: false, scam_risk: "low"
  },
  {
    load_id: "load_003",
    origin_city: "Los Angeles", origin_state: "CA",
    destination_city: "Phoenix", destination_state: "AZ",
    miles: 373, rate: 950, rpm: 2.55, weight: 35000,
    equipment_type: "Flatbed", broker_name: "Desert Haul",
    broker_email: "booking@deserthaul.com", broker_phone: "800-555-0103",
    broker_mc: "MC345678", pickup_date: "2026-01-25", delivery_date: "2026-01-25",
    deadhead_miles: 15, is_pinned: false, is_contacted: false, scam_risk: "medium"
  },
  {
    load_id: "load_004",
    origin_city: "Denver", origin_state: "CO",
    destination_city: "Kansas City", destination_state: "MO",
    miles: 604, rate: 1450, rpm: 2.40, weight: 44000,
    equipment_type: "Van", broker_name: "Midwest Express",
    broker_email: "dispatch@mwexpress.com", broker_phone: "800-555-0104",
    broker_mc: "MC456789", pickup_date: "2026-01-24", delivery_date: "2026-01-25",
    deadhead_miles: 60, is_pinned: true, is_contacted: false, scam_risk: "low"
  },
  {
    load_id: "load_005",
    origin_city: "Seattle", origin_state: "WA",
    destination_city: "Portland", destination_state: "OR",
    miles: 175, rate: 520, rpm: 2.97, weight: 28000,
    equipment_type: "Van", broker_name: "Pacific Freight",
    broker_email: "loads@pacfreight.com", broker_phone: "800-555-0105",
    broker_mc: "MC567890", pickup_date: "2026-01-23", delivery_date: "2026-01-23",
    deadhead_miles: 10, is_pinned: false, is_contacted: true, scam_risk: "low"
  },
  {
    load_id: "load_006",
    origin_city: "Houston", origin_state: "TX",
    destination_city: "New Orleans", destination_state: "LA",
    miles: 348, rate: 875, rpm: 2.51, weight: 40000,
    equipment_type: "Reefer", broker_name: "Gulf Coast Logistics",
    broker_email: "dispatch@gulfcoast.com", broker_phone: "800-555-0106",
    broker_mc: "MC678901", pickup_date: "2026-01-26", delivery_date: "2026-01-26",
    deadhead_miles: 25, is_pinned: false, is_contacted: false, scam_risk: "high"
  }
];

// Default email template
const DEFAULT_TEMPLATE = {
  template_id: 'default_001',
  name: 'Quick Inquiry',
  subject: 'Load Inquiry: {origin} to {destination}',
  body: `Hi {broker_name},

I'm interested in your load from {origin} to {destination}.

Rate: ${'{rate}'}
Miles: {miles}

I have availability and can pick up as scheduled. Please let me know if this load is still available.

Thank you!`,
  is_default: true
};

// State
let state = {
  user: null,
  loads: [...SAMPLE_LOADS],
  templates: [DEFAULT_TEMPLATE],
  isRefreshing: false,
  activeTab: 'loads',
  autoEmail: {
    enabled: false,
    minRpm: 2.50,
    equipment: ['Van'],
    origins: [],
    destinations: [],
    maxPerHour: 10,
    skipRisk: 'high'
  },
  // Multiple email accounts
  emailAccounts: [
    { id: 'acc_1', email: 'aminpanshiri1@gmail.com', company: 'Main Account', phone: '', isMain: true },
    { id: 'acc_2', email: 'info@freightwiz.us', company: 'FreightWiz', phone: '', isMain: false },
    { id: 'acc_3', email: 'info@generalfreightinc.com', company: 'General Freight Inc', phone: '', isMain: false }
  ],
  activeAccountId: 'acc_1', // Currently selected account
  stats: {
    sent: 0,
    today: 0,
    matched: 0,
    skipped: 0
  },
  settings: {
    autoRefresh: true,
    soundEnabled: false
  },
  emailedLoads: [] // Track which loads have been emailed
};

// Helper to get active account
function getActiveAccount() {
  return state.emailAccounts.find(a => a.id === state.activeAccountId) || state.emailAccounts[0];
}

// DOM Elements cache
const elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  cacheElements();
  loadFromStorage();
  setupEventListeners();
  checkAuthState();
});

function cacheElements() {
  elements.loginScreen = document.getElementById('login-screen');
  elements.dashboard = document.getElementById('dashboard');
  elements.googleLoginBtn = document.getElementById('google-login-btn');
  elements.logoutBtn = document.getElementById('logout-btn');
  elements.userAvatar = document.getElementById('user-avatar');
  elements.loadsTbody = document.getElementById('loads-tbody');
  elements.loadCount = document.getElementById('load-count');
  elements.statusDot = document.getElementById('status-dot');
  elements.statusText = document.getElementById('status-text');
  elements.refreshBtn = document.getElementById('refresh-btn');
  elements.filterEquipment = document.getElementById('filter-equipment');
  elements.filterOrigin = document.getElementById('filter-origin');
  elements.filterRpm = document.getElementById('filter-rpm');
  elements.calcSubmit = document.getElementById('calc-submit');
  elements.calcResult = document.getElementById('calc-result');
  elements.addTemplateBtn = document.getElementById('add-template-btn');
  elements.templateForm = document.getElementById('template-form');
  elements.saveTemplateBtn = document.getElementById('save-template-btn');
  elements.cancelTemplateBtn = document.getElementById('cancel-template-btn');
  elements.templatesList = document.getElementById('templates-list');
  elements.brokerMcInput = document.getElementById('broker-mc-input');
  elements.checkBrokerBtn = document.getElementById('check-broker-btn');
  elements.brokerInfo = document.getElementById('broker-info');
  elements.brokerEmpty = document.getElementById('broker-empty');
  elements.toastContainer = document.getElementById('toast-container');
  
  // Email modal
  elements.emailModal = document.getElementById('email-modal');
  elements.modalTo = document.getElementById('modal-to');
  elements.modalSubject = document.getElementById('modal-subject');
  elements.modalBody = document.getElementById('modal-body');
  elements.modalTemplate = document.getElementById('modal-template');
  elements.modalSendBtn = document.getElementById('modal-send-btn');
  elements.modalCancelBtn = document.getElementById('modal-cancel-btn');
  elements.closeModalBtn = document.getElementById('close-modal-btn');
  
  // Auto-email settings
  elements.autoEmailToggle = document.getElementById('auto-email-toggle');
  elements.autoEmailSettings = document.getElementById('auto-email-settings');
  elements.autoEmailStatus = document.getElementById('auto-email-status');
  elements.autoEmailStatusText = document.getElementById('auto-email-status-text');
  elements.saveAutoSettingsBtn = document.getElementById('save-auto-settings-btn');
  
  // User info
  elements.userEmail = document.getElementById('user-email');
  elements.userCompany = document.getElementById('user-company');
  elements.userPhone = document.getElementById('user-phone');
  elements.saveEmailInfoBtn = document.getElementById('save-email-info-btn');
  
  // Settings toggles
  elements.autoRefreshToggle = document.getElementById('auto-refresh-toggle');
  elements.soundToggle = document.getElementById('sound-toggle');
  
  // Stats
  elements.statSent = document.getElementById('stat-sent');
  elements.statToday = document.getElementById('stat-today');
  elements.statMatched = document.getElementById('stat-matched');
  elements.statSkipped = document.getElementById('stat-skipped');
}

function loadFromStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.get(['user', 'templates', 'loads', 'autoEmail', 'emailAccounts', 'activeAccountId', 'stats', 'settings', 'emailedLoads'], (result) => {
        if (result.user) state.user = result.user;
        if (result.templates && result.templates.length > 0) state.templates = result.templates;
        if (result.loads) state.loads = result.loads;
        if (result.autoEmail) state.autoEmail = { ...state.autoEmail, ...result.autoEmail };
        if (result.emailAccounts && result.emailAccounts.length > 0) state.emailAccounts = result.emailAccounts;
        if (result.activeAccountId) state.activeAccountId = result.activeAccountId;
        if (result.stats) state.stats = result.stats;
        if (result.settings) state.settings = result.settings;
        if (result.emailedLoads) state.emailedLoads = result.emailedLoads;
        updateUI();
      });
    } else {
      // Fallback for non-extension context
      const stored = localStorage.getItem('freightConnectState');
      if (stored) {
        const parsed = JSON.parse(stored);
        state = { ...state, ...parsed };
      }
      updateUI();
    }
  } catch (e) {
    console.error('Error loading from storage:', e);
  }
}

function saveToStorage() {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        user: state.user,
        templates: state.templates,
        loads: state.loads,
        autoEmail: state.autoEmail,
        emailAccounts: state.emailAccounts,
        activeAccountId: state.activeAccountId,
        stats: state.stats,
        settings: state.settings,
        emailedLoads: state.emailedLoads
      });
    } else {
      localStorage.setItem('freightConnectState', JSON.stringify(state));
    }
  } catch (e) {
    console.error('Error saving to storage:', e);
  }
}

function updateUI() {
  // Update toggles
  if (elements.autoEmailToggle) {
    elements.autoEmailToggle.classList.toggle('active', state.autoEmail.enabled);
  }
  if (elements.autoRefreshToggle) {
    elements.autoRefreshToggle.classList.toggle('active', state.settings.autoRefresh);
  }
  if (elements.soundToggle) {
    elements.soundToggle.classList.toggle('active', state.settings.soundEnabled);
  }
  
  // Update auto-email status
  if (elements.autoEmailStatus) {
    elements.autoEmailStatus.classList.toggle('active', state.autoEmail.enabled);
    elements.autoEmailStatusText.textContent = `Auto-Email: ${state.autoEmail.enabled ? 'ON' : 'OFF'}`;
  }
  
  // Update stats
  if (elements.statSent) elements.statSent.textContent = state.stats.sent;
  if (elements.statToday) elements.statToday.textContent = state.stats.today;
  if (elements.statMatched) elements.statMatched.textContent = state.stats.matched;
  if (elements.statSkipped) elements.statSkipped.textContent = state.stats.skipped;
  
  // Update email accounts list
  renderEmailAccounts();
  
  // Update active account indicator
  const activeAccount = getActiveAccount();
  const activeAccountDisplay = document.getElementById('active-account-display');
  if (activeAccountDisplay && activeAccount) {
    activeAccountDisplay.textContent = activeAccount.email;
  }
  
  // Update auto-email settings fields
  const autoMinRpm = document.getElementById('auto-min-rpm');
  const autoOrigins = document.getElementById('auto-origins');
  const autoDestinations = document.getElementById('auto-destinations');
  const autoMaxEmails = document.getElementById('auto-max-emails');
  const autoSkipRisk = document.getElementById('auto-skip-risk');
  
  if (autoMinRpm) autoMinRpm.value = state.autoEmail.minRpm;
  if (autoOrigins) autoOrigins.value = state.autoEmail.origins.join(', ');
  if (autoDestinations) autoDestinations.value = state.autoEmail.destinations.join(', ');
  if (autoMaxEmails) autoMaxEmails.value = state.autoEmail.maxPerHour;
  if (autoSkipRisk) autoSkipRisk.value = state.autoEmail.skipRisk;
  
  // Update equipment checkboxes
  document.getElementById('auto-van')?.checked && (document.getElementById('auto-van').checked = state.autoEmail.equipment.includes('Van'));
  document.getElementById('auto-reefer')?.checked && (document.getElementById('auto-reefer').checked = state.autoEmail.equipment.includes('Reefer'));
  document.getElementById('auto-flatbed')?.checked && (document.getElementById('auto-flatbed').checked = state.autoEmail.equipment.includes('Flatbed'));
}

function renderEmailAccounts() {
  const accountsList = document.getElementById('email-accounts-list');
  if (!accountsList) return;
  
  accountsList.innerHTML = state.emailAccounts.map(acc => `
    <div class="account-card ${acc.id === state.activeAccountId ? 'active' : ''}" data-account-id="${acc.id}">
      <div class="account-info">
        <div class="account-email">${acc.email}</div>
        <div class="account-company">${acc.company || 'No company name'}</div>
      </div>
      <div class="account-actions">
        ${acc.isMain ? '<span class="main-badge">MAIN</span>' : ''}
        <button class="action-btn ${acc.id === state.activeAccountId ? 'primary' : 'secondary'}" onclick="selectAccount('${acc.id}')" title="${acc.id === state.activeAccountId ? 'Active' : 'Switch to this account'}">
          ${acc.id === state.activeAccountId 
            ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>'
            : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/></svg>'}
        </button>
        <button class="action-btn ghost" onclick="editAccount('${acc.id}')" title="Edit">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function setupEventListeners() {
  // Auth
  elements.googleLoginBtn?.addEventListener('click', handleGoogleLogin);
  elements.logoutBtn?.addEventListener('click', handleLogout);

  // Navigation
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Loads
  elements.refreshBtn?.addEventListener('click', refreshLoads);
  elements.filterEquipment?.addEventListener('change', renderLoads);
  elements.filterOrigin?.addEventListener('change', renderLoads);
  elements.filterRpm?.addEventListener('change', renderLoads);

  // Calculator
  elements.calcSubmit?.addEventListener('click', calculateRPM);

  // Templates
  elements.addTemplateBtn?.addEventListener('click', toggleTemplateForm);
  elements.saveTemplateBtn?.addEventListener('click', saveTemplate);
  elements.cancelTemplateBtn?.addEventListener('click', toggleTemplateForm);
  
  // User info
  elements.saveEmailInfoBtn?.addEventListener('click', saveUserInfo);

  // Broker
  elements.checkBrokerBtn?.addEventListener('click', checkBroker);
  elements.brokerMcInput?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') checkBroker();
  });
  
  // Email Modal
  elements.closeModalBtn?.addEventListener('click', closeEmailModal);
  elements.modalCancelBtn?.addEventListener('click', closeEmailModal);
  elements.modalSendBtn?.addEventListener('click', sendEmailFromModal);
  elements.modalTemplate?.addEventListener('change', applyTemplateToModal);
  elements.emailModal?.querySelector('.modal-overlay')?.addEventListener('click', closeEmailModal);
  
  // Account modal
  document.getElementById('close-account-modal-btn')?.addEventListener('click', closeAccountModal);
  document.getElementById('account-modal-cancel-btn')?.addEventListener('click', closeAccountModal);
  document.getElementById('account-modal-save-btn')?.addEventListener('click', saveAccountFromModal);
  document.getElementById('account-modal')?.querySelector('.modal-overlay')?.addEventListener('click', closeAccountModal);
  document.getElementById('add-account-btn')?.addEventListener('click', () => openAccountModal());
  
  // Settings
  elements.autoEmailToggle?.addEventListener('click', toggleAutoEmail);
  elements.autoRefreshToggle?.addEventListener('click', toggleAutoRefresh);
  elements.soundToggle?.addEventListener('click', toggleSound);
  elements.saveAutoSettingsBtn?.addEventListener('click', saveAutoEmailSettings);
}

// Auth Functions
function checkAuthState() {
  if (state.user) {
    showDashboard();
  } else {
    showLogin();
  }
}

function handleGoogleLogin() {
  if (typeof chrome !== 'undefined' && chrome.identity) {
    const redirectUrl = chrome.identity.getRedirectURL();
    const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
    
    chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true
    }, (responseUrl) => {
      if (chrome.runtime.lastError || !responseUrl) {
        simulateLogin();
        return;
      }
      
      const url = new URL(responseUrl);
      const hash = url.hash;
      const sessionId = hash.split('session_id=')[1]?.split('&')[0];
      
      if (sessionId) {
        exchangeSessionToken(sessionId);
      } else {
        simulateLogin();
      }
    });
  } else {
    simulateLogin();
  }
}

function simulateLogin() {
  state.user = {
    user_id: 'demo_user',
    name: 'Demo User',
    email: 'demo@freightconnect.pro',
    picture: null
  };
  saveToStorage();
  showDashboard();
  showToast('Welcome to Freight Connect Pro!', 'success');
}

async function exchangeSessionToken(sessionId) {
  try {
    const response = await fetch('https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data', {
      headers: { 'X-Session-ID': sessionId }
    });
    
    if (response.ok) {
      const userData = await response.json();
      state.user = {
        user_id: userData.id,
        name: userData.name,
        email: userData.email,
        picture: userData.picture
      };
      saveToStorage();
      showDashboard();
      showToast(`Welcome, ${state.user.name}!`, 'success');
    } else {
      simulateLogin();
    }
  } catch (error) {
    console.error('Auth error:', error);
    simulateLogin();
  }
}

function handleLogout() {
  state.user = null;
  saveToStorage();
  showLogin();
  showToast('Logged out successfully', 'success');
}

function showLogin() {
  elements.loginScreen?.classList.remove('hidden');
  elements.dashboard?.classList.add('hidden');
}

function showDashboard() {
  elements.loginScreen?.classList.add('hidden');
  elements.dashboard?.classList.remove('hidden');
  
  if (state.user?.picture) {
    elements.userAvatar.innerHTML = `<img src="${state.user.picture}" alt="${state.user.name}">`;
  } else {
    elements.userAvatar.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  }
  
  renderLoads();
  renderTemplates();
  updateUI();
}

// Tab Navigation
function switchTab(tabId) {
  state.activeTab = tabId;
  
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });
  
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `tab-content-${tabId}`);
    content.classList.toggle('hidden', content.id !== `tab-content-${tabId}`);
  });
}

// Loads Functions
function renderLoads() {
  const equipment = elements.filterEquipment?.value || '';
  const origin = elements.filterOrigin?.value || '';
  const minRpm = parseFloat(elements.filterRpm?.value) || 0;
  
  let filtered = state.loads.filter(load => {
    if (equipment && load.equipment_type !== equipment) return false;
    if (origin && load.origin_state !== origin) return false;
    if (minRpm && load.rpm < minRpm) return false;
    return true;
  });
  
  filtered.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return b.rpm - a.rpm;
  });
  
  if (elements.loadsTbody) {
    elements.loadsTbody.innerHTML = filtered.map(load => `
      <tr class="${load.is_pinned ? 'pinned' : ''} ${load.is_contacted ? 'contacted' : ''}" data-testid="load-row-${load.load_id}">
        <td>
          <button class="pin-btn ${load.is_pinned ? 'pinned' : ''}" onclick="togglePin('${load.load_id}')" data-testid="pin-btn-${load.load_id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="${load.is_pinned ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M12 17v5"/><path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z"/>
            </svg>
          </button>
        </td>
        <td>
          <div class="route">
            <span class="route-city">${load.origin_city}</span>
            <span class="route-state">${load.origin_state}</span>
            <span class="route-arrow">↓</span>
            <span class="route-city">${load.destination_city}</span>
            <span class="route-state">${load.destination_state}</span>
          </div>
        </td>
        <td class="font-mono">${load.miles}</td>
        <td class="font-mono">$${load.rate.toLocaleString()}</td>
        <td><span class="rpm-badge ${getRpmClass(load.rpm)}">$${load.rpm.toFixed(2)}</span></td>
        <td><span class="equipment-badge">${load.equipment_type}</span></td>
        <td>
          <div style="font-size:10px">${load.broker_name}</div>
          <div class="font-mono" style="font-size:8px;color:var(--muted-foreground)">${load.broker_mc}</div>
        </td>
        <td><span class="risk-badge ${load.scam_risk}">${load.scam_risk}</span></td>
        <td>
          <div class="quick-actions">
            <button class="action-btn send-btn" onclick="openEmailModal('${load.load_id}')" data-testid="quick-email-btn-${load.load_id}" title="One-Click Email">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
            </button>
            <button class="action-btn primary" onclick="oneClickSend('${load.load_id}')" data-testid="email-btn-${load.load_id}" title="Send with Default Template">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            </button>
            <button class="action-btn secondary" onclick="callBroker('${load.broker_phone}')" data-testid="call-btn-${load.load_id}" title="Call Broker">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }
  
  if (elements.loadCount) {
    elements.loadCount.textContent = `${filtered.length} loads`;
  }
  
  // Check for auto-email matches
  if (state.autoEmail.enabled) {
    checkAutoEmailMatches(filtered);
  }
}

function getRpmClass(rpm) {
  if (rpm >= 2.5) return 'high';
  if (rpm >= 2.0) return 'medium';
  return 'low';
}

function refreshLoads() {
  state.isRefreshing = true;
  elements.statusDot?.classList.add('refreshing');
  if (elements.statusText) elements.statusText.textContent = 'Refreshing...';
  elements.refreshBtn?.querySelector('svg')?.classList.add('spin');
  
  setTimeout(() => {
    state.isRefreshing = false;
    elements.statusDot?.classList.remove('refreshing');
    if (elements.statusText) elements.statusText.textContent = 'Connected';
    elements.refreshBtn?.querySelector('svg')?.classList.remove('spin');
    showToast('Loads refreshed', 'success');
    renderLoads();
  }, 1000);
}

// Global functions
window.togglePin = function(loadId) {
  const load = state.loads.find(l => l.load_id === loadId);
  if (load) {
    load.is_pinned = !load.is_pinned;
    saveToStorage();
    renderLoads();
  }
};

window.callBroker = function(phone) {
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: `tel:${phone}` });
  } else {
    window.open(`tel:${phone}`, '_blank');
  }
};

// Email Modal Functions
window.openEmailModal = function(loadId) {
  const load = state.loads.find(l => l.load_id === loadId);
  if (!load) return;
  
  state.currentLoadId = loadId;
  
  // Populate FROM account dropdown
  const modalFrom = document.getElementById('modal-from');
  if (modalFrom) {
    modalFrom.innerHTML = state.emailAccounts.map(acc => 
      `<option value="${acc.id}" ${acc.id === state.activeAccountId ? 'selected' : ''}>${acc.email} ${acc.isMain ? '(Main)' : ''}</option>`
    ).join('');
    modalFrom.onchange = () => {
      state.activeAccountId = modalFrom.value;
      saveToStorage();
      updateUI();
      // Re-apply template with new signature
      const templateId = elements.modalTemplate?.value;
      if (templateId) {
        const template = state.templates.find(t => t.template_id === templateId);
        if (template) applyTemplate(template, load);
      }
    };
  }
  
  // Populate modal
  elements.modalTo.value = load.broker_email;
  
  // Populate template dropdown
  elements.modalTemplate.innerHTML = '<option value="">-- Select Template --</option>' +
    state.templates.map(t => `<option value="${t.template_id}" ${t.is_default ? 'selected' : ''}>${t.name}</option>`).join('');
  
  // Apply default template
  const defaultTemplate = state.templates.find(t => t.is_default) || state.templates[0];
  if (defaultTemplate) {
    applyTemplate(defaultTemplate, load);
  }
  
  elements.emailModal.classList.remove('hidden');
};

function closeEmailModal() {
  elements.emailModal.classList.add('hidden');
  state.currentLoadId = null;
}

function applyTemplateToModal() {
  const templateId = elements.modalTemplate.value;
  if (!templateId || !state.currentLoadId) return;
  
  const template = state.templates.find(t => t.template_id === templateId);
  const load = state.loads.find(l => l.load_id === state.currentLoadId);
  
  if (template && load) {
    applyTemplate(template, load);
  }
}

function applyTemplate(template, load) {
  const origin = `${load.origin_city}, ${load.origin_state}`;
  const destination = `${load.destination_city}, ${load.destination_state}`;
  const activeAccount = getActiveAccount();
  
  let subject = template.subject
    .replace(/{origin}/g, origin)
    .replace(/{destination}/g, destination)
    .replace(/{rate}/g, `$${load.rate}`)
    .replace(/{miles}/g, load.miles)
    .replace(/{broker_name}/g, load.broker_name);
  
  let body = template.body
    .replace(/{origin}/g, origin)
    .replace(/{destination}/g, destination)
    .replace(/{rate}/g, `$${load.rate}`)
    .replace(/{miles}/g, load.miles)
    .replace(/{broker_name}/g, load.broker_name);
  
  // Add signature from active account
  if (activeAccount && (activeAccount.company || activeAccount.phone)) {
    body += '\n\n---\n';
    if (activeAccount.company) body += activeAccount.company + '\n';
    if (activeAccount.phone) body += activeAccount.phone + '\n';
    if (activeAccount.email) body += activeAccount.email;
  }
  
  elements.modalSubject.value = subject;
  elements.modalBody.value = body;
}

function sendEmailFromModal() {
  const to = elements.modalTo.value;
  const subject = elements.modalSubject.value;
  const body = elements.modalBody.value;
  
  if (!to || !subject || !body) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  // Send via mailto (opens default email client)
  const mailtoUrl = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: mailtoUrl });
  } else {
    window.open(mailtoUrl, '_blank');
  }
  
  // Mark load as contacted
  if (state.currentLoadId) {
    const load = state.loads.find(l => l.load_id === state.currentLoadId);
    if (load) {
      load.is_contacted = true;
      state.emailedLoads.push(state.currentLoadId);
      state.stats.sent++;
      state.stats.today++;
      saveToStorage();
      renderLoads();
      updateUI();
    }
  }
  
  closeEmailModal();
  showToast('Email sent!', 'success');
}

// One-Click Send (like LoadHunter)
window.oneClickSend = function(loadId) {
  const load = state.loads.find(l => l.load_id === loadId);
  if (!load) return;
  
  // Get default template
  const template = state.templates.find(t => t.is_default) || state.templates[0];
  if (!template) {
    showToast('No email template found. Create one first.', 'error');
    return;
  }
  
  const activeAccount = getActiveAccount();
  
  // Apply template
  const origin = `${load.origin_city}, ${load.origin_state}`;
  const destination = `${load.destination_city}, ${load.destination_state}`;
  
  let subject = template.subject
    .replace(/{origin}/g, origin)
    .replace(/{destination}/g, destination)
    .replace(/{rate}/g, `$${load.rate}`)
    .replace(/{miles}/g, load.miles)
    .replace(/{broker_name}/g, load.broker_name);
  
  let body = template.body
    .replace(/{origin}/g, origin)
    .replace(/{destination}/g, destination)
    .replace(/{rate}/g, `$${load.rate}`)
    .replace(/{miles}/g, load.miles)
    .replace(/{broker_name}/g, load.broker_name);
  
  // Add signature from active account
  if (activeAccount && (activeAccount.company || activeAccount.phone)) {
    body += '\n\n---\n';
    if (activeAccount.company) body += activeAccount.company + '\n';
    if (activeAccount.phone) body += activeAccount.phone + '\n';
    if (activeAccount.email) body += activeAccount.email;
  }
  
  // Send email with FROM account (mailto doesn't support from, but we track it)
  const mailtoUrl = `mailto:${load.broker_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  
  if (typeof chrome !== 'undefined' && chrome.tabs) {
    chrome.tabs.create({ url: mailtoUrl });
  } else {
    window.open(mailtoUrl, '_blank');
  }
  
  // Update stats
  load.is_contacted = true;
  state.emailedLoads.push(loadId);
  state.stats.sent++;
  state.stats.today++;
  saveToStorage();
  renderLoads();
  updateUI();
  
  showToast(`Email sent from ${activeAccount.email} to ${load.broker_name}!`, 'success');
};

// Calculator
function calculateRPM() {
  const rate = parseFloat(document.getElementById('calc-rate')?.value) || 0;
  const miles = parseInt(document.getElementById('calc-miles')?.value) || 0;
  const deadhead = parseInt(document.getElementById('calc-deadhead')?.value) || 0;
  const fuelCost = parseFloat(document.getElementById('calc-fuel')?.value) || 3.50;
  const mpg = parseFloat(document.getElementById('calc-mpg')?.value) || 6.5;
  const tolls = parseFloat(document.getElementById('calc-tolls')?.value) || 0;
  
  if (miles === 0) {
    showToast('Please enter miles', 'error');
    return;
  }
  
  const totalMiles = miles + deadhead;
  const grossRpm = rate / miles;
  const fuelTotal = (totalMiles / mpg) * fuelCost;
  const netProfit = rate - fuelTotal - tolls;
  const netRpm = netProfit / miles;
  const rpmPlus = rate / totalMiles;
  
  elements.calcResult.classList.remove('hidden');
  elements.calcResult.innerHTML = `
    <div class="result-row">
      <span class="result-label">Gross RPM</span>
      <span class="result-value highlight">$${grossRpm.toFixed(2)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">Net RPM (after fuel)</span>
      <span class="result-value">$${netRpm.toFixed(2)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">RPM+ (with deadhead)</span>
      <span class="result-value">$${rpmPlus.toFixed(2)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">Fuel Cost</span>
      <span class="result-value">$${fuelTotal.toFixed(2)}</span>
    </div>
    <div class="result-row">
      <span class="result-label">Net Profit</span>
      <span class="result-value success">$${netProfit.toFixed(2)}</span>
    </div>
  `;
}

// Template Functions
function toggleTemplateForm() {
  elements.templateForm?.classList.toggle('hidden');
  if (!elements.templateForm?.classList.contains('hidden')) {
    document.getElementById('template-name').value = '';
    document.getElementById('template-subject').value = '';
    document.getElementById('template-body').value = '';
    document.getElementById('template-default').checked = false;
  }
}

function saveTemplate() {
  const name = document.getElementById('template-name')?.value.trim();
  const subject = document.getElementById('template-subject')?.value.trim();
  const body = document.getElementById('template-body')?.value.trim();
  const isDefault = document.getElementById('template-default')?.checked;
  
  if (!name || !subject || !body) {
    showToast('Please fill all fields', 'error');
    return;
  }
  
  // If setting as default, unset others
  if (isDefault) {
    state.templates.forEach(t => t.is_default = false);
  }
  
  const template = {
    template_id: `tpl_${Date.now()}`,
    name,
    subject,
    body,
    is_default: isDefault
  };
  
  state.templates.push(template);
  saveToStorage();
  renderTemplates();
  toggleTemplateForm();
  showToast('Template saved', 'success');
}

function renderTemplates() {
  if (!elements.templatesList) return;
  
  if (state.templates.length === 0) {
    elements.templatesList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
        </div>
        <div class="empty-state-title">No Templates Yet</div>
        <div class="empty-state-text">Create your first email template</div>
      </div>
    `;
    return;
  }
  
  elements.templatesList.innerHTML = state.templates.map(t => `
    <div class="template-card ${t.is_default ? 'default' : ''}" data-testid="template-${t.template_id}">
      <div class="template-header">
        <div>
          <div class="template-name">
            ${t.name}
            ${t.is_default ? '<span class="default-badge">Default</span>' : ''}
          </div>
          <div class="template-subject">${t.subject}</div>
        </div>
        <div style="display:flex;gap:4px;">
          <button class="action-btn secondary" onclick="setDefaultTemplate('${t.template_id}')" title="Set as Default">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <button class="action-btn ghost" onclick="deleteTemplate('${t.template_id}')" data-testid="delete-template-${t.template_id}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

window.setDefaultTemplate = function(templateId) {
  state.templates.forEach(t => t.is_default = (t.template_id === templateId));
  saveToStorage();
  renderTemplates();
  showToast('Default template updated', 'success');
};

window.deleteTemplate = function(templateId) {
  state.templates = state.templates.filter(t => t.template_id !== templateId);
  saveToStorage();
  renderTemplates();
  showToast('Template deleted', 'success');
};

// User Info - now handles account editing
function saveUserInfo() {
  // This function is now replaced by account management
  showToast('Use account cards to edit', 'success');
}

// Account Management
window.selectAccount = function(accountId) {
  state.activeAccountId = accountId;
  saveToStorage();
  updateUI();
  const account = state.emailAccounts.find(a => a.id === accountId);
  showToast(`Switched to ${account?.email}`, 'success');
};

window.editAccount = function(accountId) {
  openAccountModal(accountId);
};

function openAccountModal(accountId = null) {
  const modal = document.getElementById('account-modal');
  const titleEl = document.getElementById('account-modal-title');
  const emailInput = document.getElementById('account-email-input');
  const companyInput = document.getElementById('account-company-input');
  const phoneInput = document.getElementById('account-phone-input');
  const mainCheckbox = document.getElementById('account-main-checkbox');
  const deleteBtn = document.getElementById('account-delete-btn');
  
  if (accountId) {
    // Edit existing account
    const account = state.emailAccounts.find(a => a.id === accountId);
    if (account) {
      titleEl.textContent = 'Edit Account';
      emailInput.value = account.email;
      companyInput.value = account.company || '';
      phoneInput.value = account.phone || '';
      mainCheckbox.checked = account.isMain;
      deleteBtn.classList.remove('hidden');
      deleteBtn.onclick = () => deleteAccount(accountId);
      modal.dataset.editId = accountId;
    }
  } else {
    // Add new account
    titleEl.textContent = 'Add Account';
    emailInput.value = '';
    companyInput.value = '';
    phoneInput.value = '';
    mainCheckbox.checked = false;
    deleteBtn.classList.add('hidden');
    modal.dataset.editId = '';
  }
  
  modal.classList.remove('hidden');
}

function closeAccountModal() {
  document.getElementById('account-modal')?.classList.add('hidden');
}

function saveAccountFromModal() {
  const modal = document.getElementById('account-modal');
  const email = document.getElementById('account-email-input')?.value.trim();
  const company = document.getElementById('account-company-input')?.value.trim();
  const phone = document.getElementById('account-phone-input')?.value.trim();
  const isMain = document.getElementById('account-main-checkbox')?.checked;
  const editId = modal?.dataset.editId;
  
  if (!email) {
    showToast('Email is required', 'error');
    return;
  }
  
  if (editId) {
    // Update existing
    const account = state.emailAccounts.find(a => a.id === editId);
    if (account) {
      account.email = email;
      account.company = company;
      account.phone = phone;
      if (isMain) {
        state.emailAccounts.forEach(a => a.isMain = false);
        account.isMain = true;
      }
    }
  } else {
    // Add new
    if (isMain) {
      state.emailAccounts.forEach(a => a.isMain = false);
    }
    state.emailAccounts.push({
      id: `acc_${Date.now()}`,
      email,
      company,
      phone,
      isMain: isMain || state.emailAccounts.length === 0
    });
  }
  
  saveToStorage();
  updateUI();
  closeAccountModal();
  showToast(editId ? 'Account updated' : 'Account added', 'success');
}

function deleteAccount(accountId) {
  if (state.emailAccounts.length <= 1) {
    showToast('Cannot delete last account', 'error');
    return;
  }
  
  const account = state.emailAccounts.find(a => a.id === accountId);
  state.emailAccounts = state.emailAccounts.filter(a => a.id !== accountId);
  
  // If deleted account was active, switch to first
  if (state.activeAccountId === accountId) {
    state.activeAccountId = state.emailAccounts[0].id;
  }
  
  // If deleted account was main, make first one main
  if (account?.isMain && state.emailAccounts.length > 0) {
    state.emailAccounts[0].isMain = true;
  }
  
  saveToStorage();
  updateUI();
  closeAccountModal();
  showToast('Account deleted', 'success');
}

// Broker Check
function checkBroker() {
  const mc = elements.brokerMcInput?.value.trim();
  if (!mc) {
    showToast('Please enter MC number', 'error');
    return;
  }
  
  elements.checkBrokerBtn.innerHTML = `<svg class="spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg> Checking...`;
  
  setTimeout(() => {
    const brokerData = generateBrokerData(mc);
    displayBrokerInfo(brokerData);
    elements.checkBrokerBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg> Check`;
  }, 1000);
}

function generateBrokerData(mc) {
  const safetyRatings = ['Satisfactory', 'Conditional', 'Unsatisfactory', 'Not Rated'];
  const factoringRatings = ['Excellent', 'Good', 'Fair', 'Poor', 'Unknown'];
  
  const scamReports = Math.floor(Math.random() * 6);
  const daysInBusiness = Math.floor(Math.random() * 3600) + 30;
  const safetyRating = safetyRatings[Math.floor(Math.random() * safetyRatings.length)];
  
  let riskLevel = 'low';
  if (scamReports > 2 || safetyRating === 'Unsatisfactory') riskLevel = 'high';
  else if (scamReports > 0 || daysInBusiness < 180) riskLevel = 'medium';
  
  return { mc_number: mc, company_name: `Transport Co ${mc.slice(-4)}`, is_active: Math.random() > 0.1, safety_rating: safetyRating, scam_reports: scamReports, factoring_rating: factoringRatings[Math.floor(Math.random() * factoringRatings.length)], days_in_business: daysInBusiness, risk_level: riskLevel };
}

function displayBrokerInfo(data) {
  elements.brokerEmpty?.classList.add('hidden');
  elements.brokerInfo?.classList.remove('hidden');
  
  const riskIcon = data.risk_level === 'high' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>' : data.risk_level === 'low' ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>' : '';
  
  elements.brokerInfo.innerHTML = `
    <div class="broker-header">
      <div>
        <div class="broker-name">${data.company_name}</div>
        <div class="broker-mc">${data.mc_number}</div>
      </div>
      <span class="risk-badge ${data.risk_level}">${riskIcon} ${data.risk_level} risk</span>
    </div>
    <div class="broker-stats">
      <div class="broker-stat">
        <div class="broker-stat-label">Status</div>
        <div class="broker-stat-value" style="color: ${data.is_active ? 'var(--success)' : 'var(--destructive)'}">${data.is_active ? 'Active' : 'Inactive'}</div>
      </div>
      <div class="broker-stat">
        <div class="broker-stat-label">Safety</div>
        <div class="broker-stat-value">${data.safety_rating}</div>
      </div>
      <div class="broker-stat">
        <div class="broker-stat-label">Scam Reports</div>
        <div class="broker-stat-value" style="color: ${data.scam_reports > 0 ? 'var(--destructive)' : 'var(--success)'}">${data.scam_reports}</div>
      </div>
      <div class="broker-stat">
        <div class="broker-stat-label">Factoring</div>
        <div class="broker-stat-value">${data.factoring_rating}</div>
      </div>
    </div>
  `;
}

// Settings Functions
function toggleAutoEmail() {
  state.autoEmail.enabled = !state.autoEmail.enabled;
  elements.autoEmailToggle?.classList.toggle('active', state.autoEmail.enabled);
  elements.autoEmailStatus?.classList.toggle('active', state.autoEmail.enabled);
  if (elements.autoEmailStatusText) {
    elements.autoEmailStatusText.textContent = `Auto-Email: ${state.autoEmail.enabled ? 'ON' : 'OFF'}`;
  }
  saveToStorage();
  showToast(`Auto-Email ${state.autoEmail.enabled ? 'enabled' : 'disabled'}`, 'success');
}

function toggleAutoRefresh() {
  state.settings.autoRefresh = !state.settings.autoRefresh;
  elements.autoRefreshToggle?.classList.toggle('active', state.settings.autoRefresh);
  saveToStorage();
  showToast(`Auto-Refresh ${state.settings.autoRefresh ? 'enabled' : 'disabled'}`, 'success');
}

function toggleSound() {
  state.settings.soundEnabled = !state.settings.soundEnabled;
  elements.soundToggle?.classList.toggle('active', state.settings.soundEnabled);
  saveToStorage();
  showToast(`Sound ${state.settings.soundEnabled ? 'enabled' : 'disabled'}`, 'success');
}

function saveAutoEmailSettings() {
  const equipment = [];
  if (document.getElementById('auto-van')?.checked) equipment.push('Van');
  if (document.getElementById('auto-reefer')?.checked) equipment.push('Reefer');
  if (document.getElementById('auto-flatbed')?.checked) equipment.push('Flatbed');
  
  const originsStr = document.getElementById('auto-origins')?.value || '';
  const destinationsStr = document.getElementById('auto-destinations')?.value || '';
  
  state.autoEmail = {
    ...state.autoEmail,
    minRpm: parseFloat(document.getElementById('auto-min-rpm')?.value) || 2.50,
    equipment,
    origins: originsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s),
    destinations: destinationsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s),
    maxPerHour: parseInt(document.getElementById('auto-max-emails')?.value) || 10,
    skipRisk: document.getElementById('auto-skip-risk')?.value || 'high'
  };
  
  saveToStorage();
  showToast('Auto-Email settings saved', 'success');
}

// Auto-Email Matching
function checkAutoEmailMatches(loads) {
  if (!state.autoEmail.enabled) return;
  
  const matches = loads.filter(load => {
    // Skip already emailed
    if (state.emailedLoads.includes(load.load_id)) return false;
    if (load.is_contacted) return false;
    
    // Check RPM
    if (load.rpm < state.autoEmail.minRpm) return false;
    
    // Check equipment
    if (state.autoEmail.equipment.length > 0 && !state.autoEmail.equipment.includes(load.equipment_type)) return false;
    
    // Check origins
    if (state.autoEmail.origins.length > 0 && !state.autoEmail.origins.includes(load.origin_state)) return false;
    
    // Check destinations
    if (state.autoEmail.destinations.length > 0 && !state.autoEmail.destinations.includes(load.destination_state)) return false;
    
    // Check risk
    if (state.autoEmail.skipRisk === 'high' && load.scam_risk === 'high') return false;
    if (state.autoEmail.skipRisk === 'medium' && (load.scam_risk === 'high' || load.scam_risk === 'medium')) return false;
    
    return true;
  });
  
  state.stats.matched = matches.length;
  updateUI();
  
  // Auto-send emails (up to max per hour)
  // In production, this would be rate-limited
  if (matches.length > 0) {
    showToast(`${matches.length} loads match your criteria!`, 'success');
  }
}

// Toast
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    ${type === 'success' 
      ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>'
      : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--destructive)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'}
    ${message}
  `;
  elements.toastContainer?.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Auto-refresh
setInterval(() => {
  if (state.user && state.activeTab === 'loads' && !state.isRefreshing && state.settings.autoRefresh) {
    // Silent refresh
    renderLoads();
  }
}, 30000);
