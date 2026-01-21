// Content Script - Runs on Truckstop and DAT pages
console.log('LoadConnect Pro: Content script loaded');

let currentSite = detectSite();
let colorFilterEnabled = true;

// Initialize
init();

function init() {
  // Load color filter setting
  chrome.storage.local.get('colorFilterEnabled', (data) => {
    colorFilterEnabled = data.colorFilterEnabled !== false;
    if (colorFilterEnabled) {
      applyColorFilters();
    }
  });
  
  // Observe page changes
  observePage();
}

function detectSite() {
  const hostname = window.location.hostname;
  if (hostname.includes('truckstop.com')) return 'truckstop';
  if (hostname.includes('dat.com')) return 'dat';
  return null;
}

function observePage() {
  const observer = new MutationObserver(() => {
    if (colorFilterEnabled) {
      applyColorFilters();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLoadData') {
    const data = extractLoadData();
    sendResponse({ success: true, data });
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

// Extract load data from the page
function extractLoadData() {
  if (currentSite === 'truckstop') {
    return extractTruckstopData();
  } else if (currentSite === 'dat') {
    return extractDATData();
  }
  return {};
}

function extractTruckstopData() {
  const data = {
    origin: null,
    destination: null,
    distance: null,
    rate: null,
    rpm: null
  };
  
  try {
    // Try to find selected/highlighted row
    const selectedRow = document.querySelector(
      'tr.selected, tr[aria-selected="true"], tr[class*="selected"], tr[class*="highlight"]'
    );
    
    if (selectedRow) {
      const cells = selectedRow.querySelectorAll('td');
      
      // Extract text from cells (adjust indices based on actual layout)
      if (cells.length >= 2) {
        data.origin = cleanText(cells[0]?.textContent || cells[1]?.textContent);
        data.destination = cleanText(cells[1]?.textContent || cells[2]?.textContent);
      }
    }
    
    // Try specific selectors
    const originSelectors = [
      '[data-testid*="origin"]',
      '[class*="origin"]',
      '[aria-label*="origin"]'
    ];
    
    const destSelectors = [
      '[data-testid*="destination"]',
      '[class*="destination"]',
      '[aria-label*="destination"]'
    ];
    
    for (const selector of originSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.origin = data.origin || cleanText(el.textContent);
        break;
      }
    }
    
    for (const selector of destSelectors) {
      const el = document.querySelector(selector);
      if (el && el.textContent.trim()) {
        data.destination = data.destination || cleanText(el.textContent);
        break;
      }
    }
    
    // Extract numbers from page
    const pageText = document.body.textContent;
    
    // Distance
    const distMatch = pageText.match(/(\d{1,4})\s*(?:mi|miles)/i);
    if (distMatch) data.distance = parseInt(distMatch[1]);
    
    // Rate
    const rateMatch = pageText.match(/\$([\d,]+)(?:\.\d{2})?/);  
    if (rateMatch) {
      data.rate = parseFloat(rateMatch[1].replace(/,/g, ''));
    }
    
    // Calculate RPM
    if (data.rate && data.distance) {
      data.rpm = (data.rate / data.distance).toFixed(2);
    }
    
  } catch (error) {
    console.error('Error extracting Truckstop data:', error);
  }
  
  return data;
}

function extractDATData() {
  const data = {
    origin: null,
    destination: null,
    distance: null,
    rate: null,
    rpm: null
  };
  
  try {
    // Similar logic for DAT
    const selectedRow = document.querySelector(
      '[class*="selected"], [class*="highlight"], [class*="active"]'
    );
    
    if (selectedRow) {
      const cells = selectedRow.querySelectorAll('td, [class*="cell"]');
      
      if (cells.length >= 3) {
        data.origin = cleanText(cells[1]?.textContent);
        data.destination = cleanText(cells[2]?.textContent);
      }
    }
    
    // Extract from page
    const pageText = document.body.textContent;
    
    const distMatch = pageText.match(/(\d{1,4})\s*(?:mi|miles)/i);
    if (distMatch) data.distance = parseInt(distMatch[1]);
    
    const rateMatch = pageText.match(/\$([\d,]+)(?:\.\d{2})?/);
    if (rateMatch) {
      data.rate = parseFloat(rateMatch[1].replace(/,/g, ''));
    }
    
    if (data.rate && data.distance) {
      data.rpm = (data.rate / data.distance).toFixed(2);
    }
    
  } catch (error) {
    console.error('Error extracting DAT data:', error);
  }
  
  return data;
}

function cleanText(text) {
  if (!text) return '';
  return text.trim().replace(/\s+/g, ' ');
}

// Apply color filters to rates
function applyColorFilters() {
  const rateElements = document.querySelectorAll(
    '[class*="rate"], [class*="price"], [class*="amount"], td:nth-child(4), td:nth-child(5)'
  );
  
  rateElements.forEach(el => {
    const text = el.textContent;
    const rpmMatch = text.match(/\$?([\d.]+)\s*\/\s*mi/i);
    
    if (rpmMatch) {
      const rpm = parseFloat(rpmMatch[1]);
      applyColor(el, rpm);
    } else {
      // Try to calculate from rate and distance
      const rateMatch = text.match(/\$([\d,]+)/);
      if (rateMatch) {
        const rate = parseFloat(rateMatch[1].replace(/,/g, ''));
        const parent = el.closest('tr, [class*="row"]');
        
        if (parent) {
          const distEl = parent.querySelector('[class*="distance"], [class*="miles"]');
          if (distEl) {
            const distMatch = distEl.textContent.match(/(\d+)/);
            if (distMatch) {
              const distance = parseInt(distMatch[1]);
              if (distance > 0) {
                const rpm = rate / distance;
                applyColor(el, rpm);
              }
            }
          }
        }
      }
    }
  });
}

function applyColor(element, rpm) {
  let bgColor, textColor;
  
  if (rpm < 1.5) {
    bgColor = '#ffebee';
    textColor = '#c62828';
  } else if (rpm < 2.0) {
    bgColor = '#fff3e0';
    textColor = '#ef6c00';
  } else if (rpm < 2.5) {
    bgColor = '#fffde7';
    textColor = '#f57f17';
  } else if (rpm < 3.0) {
    bgColor = '#f1f8e9';
    textColor = '#558b2f';
  } else {
    bgColor = '#e8f5e9';
    textColor = '#2e7d32';
  }
  
  element.style.backgroundColor = bgColor;
  element.style.color = textColor;
  element.style.fontWeight = 'bold';
  element.style.padding = '4px 8px';
  element.style.borderRadius = '4px';
}

function removeColorFilters() {
  const coloredElements = document.querySelectorAll('[style*="background"]');
  coloredElements.forEach(el => {
    el.style.backgroundColor = '';
    el.style.color = '';
    el.style.fontWeight = '';
    el.style.padding = '';
    el.style.borderRadius = '';
  });
}