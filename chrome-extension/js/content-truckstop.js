// Freight Connect Pro - Truckstop.com Content Script
// Handles AG Grid based load board

(function() {
  'use strict';

  console.log('[FCP] Freight Connect Pro loaded on Truckstop');

  const FCP_INJECTED_ATTR = 'data-fcp-injected';
  let injectionAttempts = 0;
  const MAX_ATTEMPTS = 60; // Try for 2 minutes
  
  // CSS Styles for injected buttons
  const styles = `
    .fcp-btn-container {
      display: inline-flex !important;
      gap: 6px !important;
      align-items: center !important;
      margin-left: 8px !important;
      flex-shrink: 0 !important;
    }
    
    .fcp-btn {
      width: 32px !important;
      height: 32px !important;
      min-width: 32px !important;
      border-radius: 6px !important;
      border: none !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.2s ease !important;
      position: relative !important;
      padding: 0 !important;
      z-index: 100 !important;
    }
    
    .fcp-btn:hover {
      transform: scale(1.15) !important;
      z-index: 101 !important;
    }
    
    .fcp-btn-send {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
      box-shadow: 0 2px 6px rgba(34, 197, 94, 0.4) !important;
    }
    
    .fcp-btn-send:hover {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.5) !important;
    }
    
    .fcp-btn-compose {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%) !important;
      box-shadow: 0 2px 6px rgba(249, 115, 22, 0.4) !important;
    }
    
    .fcp-btn-compose:hover {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%) !important;
      box-shadow: 0 4px 12px rgba(249, 115, 22, 0.5) !important;
    }
    
    .fcp-btn svg {
      width: 16px !important;
      height: 16px !important;
      stroke: white !important;
      fill: none !important;
      stroke-width: 2 !important;
    }
    
    .fcp-tooltip {
      position: absolute !important;
      bottom: calc(100% + 8px) !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #1e293b !important;
      color: white !important;
      padding: 6px 10px !important;
      border-radius: 6px !important;
      font-size: 12px !important;
      font-weight: 500 !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s !important;
      z-index: 10000 !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3) !important;
    }
    
    .fcp-tooltip::after {
      content: '' !important;
      position: absolute !important;
      top: 100% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      border: 6px solid transparent !important;
      border-top-color: #1e293b !important;
    }
    
    .fcp-btn:hover .fcp-tooltip {
      opacity: 1 !important;
    }
    
    .fcp-btn.fcp-sent {
      background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%) !important;
      cursor: default !important;
    }
    
    .fcp-btn.fcp-sent:hover {
      transform: none !important;
    }

    /* Ensure buttons are visible in AG Grid cells */
    .ag-cell .fcp-btn-container,
    .ag-row .fcp-btn-container {
      position: relative !important;
      display: inline-flex !important;
    }
  `;

  // Inject styles
  function injectStyles() {
    if (document.getElementById('fcp-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'fcp-styles';
    styleEl.textContent = styles;
    (document.head || document.documentElement).appendChild(styleEl);
    console.log('[FCP] Styles injected');
  }

  // SVG Icons
  const ICONS = {
    send: `<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    envelope: `<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`
  };

  // Extract load data from AG Grid row
  function extractLoadDataFromAgRow(row) {
    try {
      const rowId = row.getAttribute('row-id') || row.getAttribute('row-index') || `ts_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      let loadData = {
        load_id: rowId,
        origin_city: '',
        origin_state: '',
        destination_city: '',
        destination_state: '',
        miles: 0,
        rate: 0,
        broker_name: '',
        broker_email: '',
        broker_phone: '',
        broker_mc: '',
        equipment_type: '',
        pickup_date: ''
      };

      // Get all cells in the AG Grid row
      const cells = row.querySelectorAll('.ag-cell, [role="gridcell"]');
      const rowText = row.textContent || '';
      
      console.log('[FCP] Parsing row with', cells.length, 'cells');

      cells.forEach((cell, index) => {
        const text = (cell.textContent || '').trim();
        const colId = cell.getAttribute('col-id') || '';
        const ariaColIndex = cell.getAttribute('aria-colindex') || '';
        
        // Debug first few cells
        if (index < 5) {
          console.log(`[FCP] Cell ${index}: col-id="${colId}", text="${text.substring(0, 50)}"`);
        }

        // Look for origin/pickup location
        if (colId.toLowerCase().includes('origin') || 
            colId.toLowerCase().includes('pickup') ||
            colId.toLowerCase().includes('from') ||
            colId.toLowerCase().includes('start')) {
          const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          if (match) {
            loadData.origin_city = match[1].trim();
            loadData.origin_state = match[2];
          }
        }
        
        // Look for destination/delivery location
        if (colId.toLowerCase().includes('dest') || 
            colId.toLowerCase().includes('delivery') ||
            colId.toLowerCase().includes('to') ||
            colId.toLowerCase().includes('end') ||
            colId.toLowerCase().includes('drop')) {
          const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          if (match) {
            loadData.destination_city = match[1].trim();
            loadData.destination_state = match[2];
          }
        }
        
        // Look for miles/distance
        if (colId.toLowerCase().includes('mile') || 
            colId.toLowerCase().includes('distance') ||
            colId.toLowerCase().includes('length')) {
          const milesMatch = text.replace(/,/g, '').match(/(\d+)/);
          if (milesMatch) loadData.miles = parseInt(milesMatch[1]);
        }
        
        // Look for rate/price
        if (colId.toLowerCase().includes('rate') || 
            colId.toLowerCase().includes('price') ||
            colId.toLowerCase().includes('amount') ||
            text.includes('$')) {
          const rateMatch = text.replace(/,/g, '').match(/\$?\s*(\d+(?:\.\d{2})?)/);
          if (rateMatch && !loadData.rate) {
            loadData.rate = parseFloat(rateMatch[1]);
          }
        }
        
        // Look for equipment type
        if (colId.toLowerCase().includes('equip') || 
            colId.toLowerCase().includes('type') ||
            colId.toLowerCase().includes('trailer')) {
          if (text.toLowerCase().includes('van')) loadData.equipment_type = 'Van';
          else if (text.toLowerCase().includes('reefer') || text.toLowerCase().includes('refrig')) loadData.equipment_type = 'Reefer';
          else if (text.toLowerCase().includes('flatbed') || text.toLowerCase().includes('flat')) loadData.equipment_type = 'Flatbed';
          else if (text.toLowerCase().includes('step')) loadData.equipment_type = 'Step Deck';
        }
        
        // Look for company/broker info
        if (colId.toLowerCase().includes('company') || 
            colId.toLowerCase().includes('broker') ||
            colId.toLowerCase().includes('poster') ||
            colId.toLowerCase().includes('contact') ||
            colId.toLowerCase().includes('name')) {
          if (!loadData.broker_name && text.length > 2) {
            loadData.broker_name = text.split('\n')[0].trim();
          }
          
          // MC Number
          const mcMatch = text.match(/MC[#:\s-]*(\d+)/i);
          if (mcMatch) loadData.broker_mc = `MC${mcMatch[1]}`;
        }
      });

      // Fallback: Parse locations from full row text if not found
      if (!loadData.origin_city || !loadData.destination_city) {
        const locationMatches = rowText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})/g);
        if (locationMatches && locationMatches.length >= 2) {
          if (!loadData.origin_city) {
            const origin = locationMatches[0].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
            if (origin) {
              loadData.origin_city = origin[1].trim();
              loadData.origin_state = origin[2];
            }
          }
          if (!loadData.destination_city) {
            const dest = locationMatches[1].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
            if (dest) {
              loadData.destination_city = dest[1].trim();
              loadData.destination_state = dest[2];
            }
          }
        }
      }

      // Look for email links anywhere in the row
      const emailLink = row.querySelector('a[href^="mailto:"]');
      if (emailLink) {
        loadData.broker_email = emailLink.getAttribute('href').replace('mailto:', '').split('?')[0];
      }
      
      // Look for email in data attributes
      const emailAttr = row.querySelector('[data-email], [data-contact-email]');
      if (emailAttr) {
        loadData.broker_email = emailAttr.getAttribute('data-email') || emailAttr.getAttribute('data-contact-email');
      }

      // Look for phone numbers
      const phoneLink = row.querySelector('a[href^="tel:"]');
      if (phoneLink) {
        loadData.broker_phone = phoneLink.getAttribute('href').replace('tel:', '');
      }

      console.log('[FCP] Extracted data:', loadData);
      return loadData;
    } catch (e) {
      console.error('[FCP] Error extracting load data:', e);
      return null;
    }
  }

  // Create FCP buttons
  function createFCPButtons(loadData) {
    const container = document.createElement('div');
    container.className = 'fcp-btn-container';
    container.setAttribute('data-fcp-load-id', loadData.load_id);

    // One-click send button (green arrow)
    const sendBtn = document.createElement('button');
    sendBtn.className = 'fcp-btn fcp-btn-send';
    sendBtn.type = 'button';
    sendBtn.innerHTML = ICONS.send + '<span class="fcp-tooltip">Quick Send</span>';
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleOneClickSend(loadData, sendBtn);
    });

    // Compose email button (orange envelope)
    const composeBtn = document.createElement('button');
    composeBtn.className = 'fcp-btn fcp-btn-compose';
    composeBtn.type = 'button';
    composeBtn.innerHTML = ICONS.envelope + '<span class="fcp-tooltip">Compose</span>';
    composeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleComposeEmail(loadData);
    });

    container.appendChild(sendBtn);
    container.appendChild(composeBtn);

    return container;
  }

  // Handle one-click send
  async function handleOneClickSend(loadData, btn) {
    try {
      const storage = await getStorage(['templates', 'emailAccounts', 'activeAccountId', 'emailedLoads', 'stats']);
      
      const templates = storage.templates || [];
      const defaultTemplate = templates.find(t => t.is_default) || templates[0];
      
      if (!defaultTemplate) {
        showNotification('No email template found. Open FCP popup to create one.', 'error');
        return;
      }

      const accounts = storage.emailAccounts || [];
      const activeAccountId = storage.activeAccountId;
      const activeAccount = accounts.find(a => a.id === activeAccountId) || accounts[0];

      // Build email
      const origin = loadData.origin_city && loadData.origin_state 
        ? `${loadData.origin_city}, ${loadData.origin_state}` 
        : 'Origin';
      const destination = loadData.destination_city && loadData.destination_state 
        ? `${loadData.destination_city}, ${loadData.destination_state}` 
        : 'Destination';
      
      let subject = (defaultTemplate.subject || 'Load Inquiry')
        .replace(/{origin}/g, origin)
        .replace(/{destination}/g, destination)
        .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'TBD')
        .replace(/{miles}/g, loadData.miles || 'TBD')
        .replace(/{broker_name}/g, loadData.broker_name || 'Broker');

      let body = (defaultTemplate.body || '')
        .replace(/{origin}/g, origin)
        .replace(/{destination}/g, destination)
        .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'TBD')
        .replace(/{miles}/g, loadData.miles || 'TBD')
        .replace(/{broker_name}/g, loadData.broker_name || 'Broker');

      // Add signature
      if (activeAccount && (activeAccount.company || activeAccount.phone)) {
        body += '\n\n---\n';
        if (activeAccount.company) body += activeAccount.company + '\n';
        if (activeAccount.phone) body += activeAccount.phone + '\n';
        if (activeAccount.email) body += activeAccount.email;
      }

      // If no broker email, prompt user
      let toEmail = loadData.broker_email;
      if (!toEmail) {
        toEmail = prompt('Enter broker email address:');
        if (!toEmail) {
          showNotification('Email cancelled - no address provided', 'error');
          return;
        }
      }

      // Open mailto
      const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');

      // Update stats
      const emailedLoads = storage.emailedLoads || [];
      emailedLoads.push(loadData.load_id);
      
      const stats = storage.stats || { sent: 0, today: 0, matched: 0, skipped: 0 };
      stats.sent++;
      stats.today++;

      await setStorage({ emailedLoads, stats });

      // Update button to show sent
      btn.classList.add('fcp-sent');
      btn.innerHTML = ICONS.check + '<span class="fcp-tooltip">Sent!</span>';

      showNotification(`Email opened for ${loadData.broker_name || toEmail}!`, 'success');

    } catch (e) {
      console.error('[FCP] Error sending email:', e);
      showNotification('Failed to open email. Please try again.', 'error');
    }
  }

  // Handle compose email
  async function handleComposeEmail(loadData) {
    try {
      const origin = loadData.origin_city && loadData.origin_state 
        ? `${loadData.origin_city}, ${loadData.origin_state}` 
        : 'Origin';
      const destination = loadData.destination_city && loadData.destination_state 
        ? `${loadData.destination_city}, ${loadData.destination_state}` 
        : 'Destination';
      
      const subject = `Load Inquiry: ${origin} to ${destination}`;
      
      let toEmail = loadData.broker_email;
      if (!toEmail) {
        toEmail = prompt('Enter broker email address:');
        if (!toEmail) {
          showNotification('Email cancelled - no address provided', 'error');
          return;
        }
      }
      
      const mailtoUrl = `mailto:${toEmail}?subject=${encodeURIComponent(subject)}`;
      window.open(mailtoUrl, '_blank');
      
      showNotification('Compose window opened!', 'success');
    } catch (e) {
      console.error('[FCP] Error opening compose:', e);
    }
  }

  // Show notification
  function showNotification(message, type = 'success') {
    // Remove existing notifications
    document.querySelectorAll('.fcp-notification').forEach(n => n.remove());
    
    const notif = document.createElement('div');
    notif.className = 'fcp-notification';
    notif.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 20px !important;
      padding: 14px 20px !important;
      background: ${type === 'success' ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'} !important;
      color: white !important;
      border-radius: 10px !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      z-index: 2147483647 !important;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3) !important;
      display: flex !important;
      align-items: center !important;
      gap: 10px !important;
      animation: fcpSlideIn 0.3s ease !important;
    `;
    
    // Add animation keyframes
    if (!document.getElementById('fcp-animations')) {
      const animStyle = document.createElement('style');
      animStyle.id = 'fcp-animations';
      animStyle.textContent = `
        @keyframes fcpSlideIn {
          from { transform: translateX(100px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(animStyle);
    }
    
    const icon = type === 'success' 
      ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>'
      : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
    
    notif.innerHTML = `<span style="display:flex">${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(notif);
    setTimeout(() => {
      notif.style.opacity = '0';
      notif.style.transform = 'translateX(100px)';
      notif.style.transition = 'all 0.3s ease';
      setTimeout(() => notif.remove(), 300);
    }, 4000);
  }

  // Storage helpers
  function getStorage(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(keys, resolve);
      } else {
        const result = {};
        keys.forEach(key => {
          try {
            const stored = localStorage.getItem(`fcp_${key}`);
            if (stored) result[key] = JSON.parse(stored);
          } catch (e) {}
        });
        resolve(result);
      }
    });
  }

  function setStorage(data) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.set(data, resolve);
      } else {
        Object.keys(data).forEach(key => {
          try {
            localStorage.setItem(`fcp_${key}`, JSON.stringify(data[key]));
          } catch (e) {}
        });
        resolve();
      }
    });
  }

  // Find AG Grid and inject buttons
  function injectButtonsIntoAgGrid() {
    // AG Grid row selectors
    const rowSelectors = [
      '.ag-row',
      '.ag-row-even',
      '.ag-row-odd',
      '[role="row"]',
      '.ag-row-no-focus',
      '.ag-row-focus',
      // Also try standard table rows as fallback
      'table tbody tr',
      '.load-row',
      '[data-testid*="load"]',
      '[data-testid*="row"]'
    ];

    let totalInjected = 0;

    rowSelectors.forEach(selector => {
      const rows = document.querySelectorAll(selector);
      
      rows.forEach(row => {
        // Skip if already injected
        if (row.hasAttribute(FCP_INJECTED_ATTR)) return;
        
        // Skip header rows
        if (row.classList.contains('ag-header-row') || 
            row.querySelector('.ag-header-cell') ||
            row.querySelector('th')) return;
        
        // Skip if row is empty or just a placeholder
        if (!row.textContent || row.textContent.trim().length < 10) return;
        
        // Extract load data
        const loadData = extractLoadDataFromAgRow(row);
        if (!loadData) return;

        // Find the best place to inject buttons
        let targetCell = null;
        
        // Try to find actions/buttons cell first
        targetCell = row.querySelector(
          '.ag-cell[col-id*="action"], ' +
          '.ag-cell[col-id*="Action"], ' +
          '.ag-cell[col-id*="button"], ' +
          '.ag-cell[col-id*="Button"], ' +
          '.ag-cell:last-child, ' +
          '[role="gridcell"]:last-child, ' +
          'td:last-child'
        );
        
        // If no actions cell, find any cell with existing buttons
        if (!targetCell) {
          targetCell = row.querySelector('.ag-cell button, .ag-cell [role="button"]')?.closest('.ag-cell');
        }
        
        // Last resort: use last cell
        if (!targetCell) {
          const cells = row.querySelectorAll('.ag-cell, [role="gridcell"], td');
          if (cells.length > 0) {
            targetCell = cells[cells.length - 1];
          }
        }

        if (targetCell) {
          const fcpButtons = createFCPButtons(loadData);
          
          // Insert at the beginning of the cell for visibility
          if (targetCell.firstChild) {
            targetCell.insertBefore(fcpButtons, targetCell.firstChild);
          } else {
            targetCell.appendChild(fcpButtons);
          }
          
          // Ensure cell has proper display
          targetCell.style.overflow = 'visible';
          
          row.setAttribute(FCP_INJECTED_ATTR, 'true');
          totalInjected++;
        }
      });
    });

    if (totalInjected > 0) {
      console.log(`[FCP] Injected buttons into ${totalInjected} rows`);
    }
    
    return totalInjected;
  }

  // Wait for AG Grid to be ready
  function waitForAgGrid() {
    injectionAttempts++;
    
    // Check if AG Grid exists
    const agGrid = document.querySelector('.ag-root, .ag-root-wrapper, [ref="eRootWrapper"]');
    const agRows = document.querySelectorAll('.ag-row, [role="row"]:not(.ag-header-row)');
    
    console.log(`[FCP] Attempt ${injectionAttempts}: Found AG Grid: ${!!agGrid}, Rows: ${agRows.length}`);
    
    if (agRows.length > 0) {
      const injected = injectButtonsIntoAgGrid();
      if (injected > 0) {
        showNotification(`FCP buttons added to ${injected} loads!`, 'success');
      }
    }
    
    if (injectionAttempts < MAX_ATTEMPTS) {
      setTimeout(waitForAgGrid, 2000);
    }
  }

  // Initialize
  function init() {
    console.log('[FCP] Initializing Truckstop content script');
    
    // Inject styles immediately
    injectStyles();
    
    // Start looking for AG Grid
    setTimeout(waitForAgGrid, 1500);
    
    // Set up mutation observer for dynamic content
    const observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          for (const node of mutation.addedNodes) {
            if (node.nodeType === 1 && 
                (node.classList?.contains('ag-row') || 
                 node.querySelector?.('.ag-row') ||
                 node.matches?.('[role="row"]'))) {
              shouldInject = true;
              break;
            }
          }
        }
        if (shouldInject) break;
      }
      
      if (shouldInject) {
        setTimeout(injectButtonsIntoAgGrid, 500);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    console.log('[FCP] Initialization complete');
  }

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  console.log('[FCP] Freight Connect Pro content script loaded');
})();
