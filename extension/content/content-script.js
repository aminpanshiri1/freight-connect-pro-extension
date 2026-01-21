// Content Script for Truckstop and DAT Load Boards
// This script runs on truckstop.com and dat.com pages

console.log('Freight Connect Pro: Content script loaded');

let currentSite = null;
let loadData = {};
let colorFilterEnabled = true;

// Initialize
init();

async function init() {
  // Detect which site we're on
  detectSite();
  
  // Load settings
  const settings = await chrome.storage.local.get('colorFilterEnabled');
  colorFilterEnabled = settings.colorFilterEnabled !== false;
  
  // Start observing page changes
  observePageChanges();
  
  // Extract initial data
  setTimeout(() => {
    extractLoadData();
    if (colorFilterEnabled) {
      applyColorFilters();
    }
  }, 2000);
  
  console.log(`Freight Connect Pro: Initialized on ${currentSite}`);
}

// Detect which site we're on
function detectSite() {
  const hostname = window.location.hostname;
  
  if (hostname.includes('truckstop.com')) {
    currentSite = 'truckstop';
  } else if (hostname.includes('dat.com')) {
    currentSite = 'dat';
  }
}

// Extract load data from the page
function extractLoadData() {
  if (!currentSite) return;
  
  console.log('Extracting load data...');
  
  if (currentSite === 'truckstop') {
    loadData = extractTruckstopData();
  } else if (currentSite === 'dat') {
    loadData = extractDATData();
  }
  
  if (loadData.origin || loadData.destination) {
    console.log('Load data extracted:', loadData);
    // Store data
    chrome.storage.local.set({ loadData });
    // Notify popup
    chrome.runtime.sendMessage({ action: 'loadDataUpdated', data: loadData });
  }
}

// Extract data from Truckstop.com
function extractTruckstopData() {
  const data = {
    origin: null,
    destination: null,
    distance: null,
    rate: null,
    ratePerMile: null
  };
  
  try {
    // Try multiple selectors for origin
    const originSelectors = [
      '[data-testid="origin"]',
      '.origin-city',
      '[class*="origin"]',
      'td:nth-child(1)',
      '.load-origin'
    ];
    
    for (const selector of originSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.origin = element.textContent.trim();
        break;
      }
    }
    
    // Try multiple selectors for destination
    const destSelectors = [
      '[data-testid="destination"]',
      '.destination-city',
      '[class*="destination"]',
      'td:nth-child(2)',
      '.load-destination'
    ];
    
    for (const selector of destSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.destination = element.textContent.trim();
        break;
      }
    }
    
    // Extract distance
    const distanceSelectors = [
      '[data-testid="distance"]',
      '.distance',
      '[class*="miles"]',
      '[class*="distance"]'
    ];
    
    for (const selector of distanceSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const match = text.match(/([\d,]+)\s*mi/);
        if (match) {
          data.distance = parseInt(match[1].replace(/,/g, ''));
          break;
        }
      }
    }
    
    // Extract rate
    const rateSelectors = [
      '[data-testid="rate"]',
      '.rate',
      '[class*="rate"]',
      '[class*="price"]'
    ];
    
    for (const selector of rateSelectors) {
      const element = document.querySelector(selector);
      if (element) {
        const text = element.textContent.trim();
        const match = text.match(/\$([\d,]+(?:\.\d{2})?)/);
        if (match) {
          data.rate = parseFloat(match[1].replace(/,/g, ''));
          break;
        }
      }
    }
    
    // Calculate rate per mile
    if (data.rate && data.distance) {
      data.ratePerMile = (data.rate / data.distance).toFixed(2);
    }
    
    // If no data found using selectors, try finding in visible selected row
    if (!data.origin || !data.destination) {
      const selectedRow = document.querySelector('tr.selected, tr[class*="selected"], tr[aria-selected="true"]');
      if (selectedRow) {
        const cells = selectedRow.querySelectorAll('td');
        if (cells.length >= 2) {
          data.origin = data.origin || cells[0].textContent.trim();
          data.destination = data.destination || cells[1].textContent.trim();
        }
      }
    }
    
  } catch (error) {
    console.error('Error extracting Truckstop data:', error);
  }
  
  return data;
}

// Extract data from DAT
function extractDATData() {
  const data = {
    origin: null,
    destination: null,
    distance: null,
    rate: null,
    ratePerMile: null
  };
  
  try {
    // DAT-specific selectors
    const originSelectors = [
      '[data-field="origin"]',
      '.load-origin',
      '[class*="origin"]',
      'td:nth-child(2)',
      '.city-origin'
    ];
    
    for (const selector of originSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.origin = element.textContent.trim();
        break;
      }
    }
    
    const destSelectors = [
      '[data-field="destination"]',
      '.load-destination',
      '[class*="destination"]',
      'td:nth-child(3)',
      '.city-destination'
    ];
    
    for (const selector of destSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.trim()) {
        data.destination = element.textContent.trim();
        break;
      }
    }
    
    // Extract distance
    const distanceElements = document.querySelectorAll('[class*="distance"], [class*="miles"]');
    for (const element of distanceElements) {
      const text = element.textContent.trim();
      const match = text.match(/([\d,]+)/);
      if (match && parseInt(match[1].replace(/,/g, '')) > 0) {
        data.distance = parseInt(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // Extract rate
    const rateElements = document.querySelectorAll('[class*="rate"], [class*="price"], [class*="amount"]');
    for (const element of rateElements) {
      const text = element.textContent.trim();
      const match = text.match(/\$([\d,]+(?:\.\d{2})?)/);
      if (match) {
        data.rate = parseFloat(match[1].replace(/,/g, ''));
        break;
      }
    }
    
    // Calculate rate per mile
    if (data.rate && data.distance) {
      data.ratePerMile = (data.rate / data.distance).toFixed(2);
    }
    
    // Try finding highlighted/selected row
    if (!data.origin || !data.destination) {
      const selectedRow = document.querySelector('[class*="selected"], [class*="highlighted"], [class*="active"]');
      if (selectedRow) {
        const cells = selectedRow.querySelectorAll('td, [class*="cell"]');
        if (cells.length >= 3) {
          data.origin = data.origin || cells[1].textContent.trim();
          data.destination = data.destination || cells[2].textContent.trim();
        }
      }
    }
    
  } catch (error) {
    console.error('Error extracting DAT data:', error);
  }
  
  return data;
}

// Apply color filters to rates
function applyColorFilters() {
  if (!currentSite) return;
  
  console.log('Applying color filters...');
  
  // Find all rate elements on the page
  const rateElements = document.querySelectorAll(
    '[class*="rate"], [class*="price"], [class*="ratePermile"], [data-field*="rate"]'
  );
  
  rateElements.forEach(element => {
    const text = element.textContent.trim();
    
    // Extract rate per mile value
    let ratePerMile = null;
    
    // Check if it's already a rate per mile
    const rpmMatch = text.match(/\$?([\d.]+)\s*\/\s*mi/);
    if (rpmMatch) {
      ratePerMile = parseFloat(rpmMatch[1]);
    } else {
      // Try to find total rate and distance to calculate
      const rateMatch = text.match(/\$([\d,]+)/);
      if (rateMatch) {
        const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
        // Look for distance in nearby elements
        const parent = element.closest('tr, div[class*="row"]');
        if (parent) {
          const distanceElement = parent.querySelector('[class*="distance"], [class*="miles"]');
          if (distanceElement) {
            const distMatch = distanceElement.textContent.match(/([\d,]+)/);
            if (distMatch) {
              const distance = parseInt(distMatch[1].replace(/,/g, ''));
              if (distance > 0) {
                ratePerMile = rate / distance;
              }
            }
          }
        }
      }
    }
    
    if (ratePerMile !== null) {
      applyColorToElement(element, ratePerMile);
    }
  });
}

// Apply color based on rate per mile
function applyColorToElement(element, ratePerMile) {
  // Color scheme based on rate per mile:
  // < $1.50: red (low)
  // $1.50 - $2.00: orange (below average)
  // $2.00 - $2.50: yellow (average)
  // $2.50 - $3.00: light green (good)
  // > $3.00: green (excellent)
  
  let backgroundColor, textColor;
  
  if (ratePerMile < 1.5) {
    backgroundColor = '#ffebee'; // Light red
    textColor = '#c62828';
  } else if (ratePerMile < 2.0) {
    backgroundColor = '#fff3e0'; // Light orange
    textColor = '#ef6c00';
  } else if (ratePerMile < 2.5) {
    backgroundColor = '#fffde7'; // Light yellow
    textColor = '#f57f17';
  } else if (ratePerMile < 3.0) {
    backgroundColor = '#f1f8e9'; // Light green
    textColor = '#558b2f';
  } else {
    backgroundColor = '#e8f5e9'; // Green
    textColor = '#2e7d32';
  }
  
  element.style.backgroundColor = backgroundColor;
  element.style.color = textColor;
  element.style.fontWeight = 'bold';
  element.style.padding = '4px 8px';
  element.style.borderRadius = '4px';
  element.style.transition = 'all 0.3s ease';
}

// Remove color filters
function removeColorFilters() {
  const coloredElements = document.querySelectorAll('[style*="background"]');
  coloredElements.forEach(element => {
    element.style.backgroundColor = '';
    element.style.color = '';
    element.style.fontWeight = '';
    element.style.padding = '';
    element.style.borderRadius = '';
  });
}

// Observe page changes
function observePageChanges() {
  const observer = new MutationObserver((mutations) => {
    // Re-extract data when page content changes
    extractLoadData();
    if (colorFilterEnabled) {
      applyColorFilters();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Show map modal
function showMapModal(origin, destination) {
  // Remove existing modal if any
  const existingModal = document.getElementById('freight-connect-map-modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal
  const modal = document.createElement('div');
  modal.id = 'freight-connect-map-modal';
  modal.innerHTML = `
    <div class="fc-modal-overlay">
      <div class="fc-modal-content">
        <div class="fc-modal-header">
          <h3>🗺️ Route: ${origin} to ${destination}</h3>
          <button class="fc-close-btn">&times;</button>
        </div>
        <div class="fc-modal-body">
          <iframe
            width="100%"
            height="500"
            frameborder="0"
            style="border:0"
            src="https://www.google.com/maps/embed/v1/directions?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=driving"
            allowfullscreen>
          </iframe>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // Close button handler
  modal.querySelector('.fc-close-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  // Close on overlay click
  modal.querySelector('.fc-modal-overlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) {
      modal.remove();
    }
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Content script received message:', request);
  
  if (request.action === 'getLoadData') {
    extractLoadData();
    sendResponse({ data: loadData });
  }
  
  if (request.action === 'showMap') {
    showMapModal(request.origin, request.destination);
    sendResponse({ success: true });
  }
  
  if (request.action === 'toggleColorFilter') {
    colorFilterEnabled = request.enabled;
    if (colorFilterEnabled) {
      applyColorFilters();
    } else {
      removeColorFilters();
    }
    sendResponse({ success: true });
  }
  
  return true;
});