// Freight Connect Pro - Truckstop.com Content Script v2.2
// Fixed for AG Grid with visited-row class

(function() {
  'use strict';

  console.log('[FCP] Content script v2.2 starting...');

  const FCP_INJECTED_ATTR = 'data-fcp-injected';
  
  // CSS Styles
  const styles = `
    .fcp-btn-container {
      display: inline-flex !important;
      gap: 4px !important;
      align-items: center !important;
      margin-left: 6px !important;
      flex-shrink: 0 !important;
      vertical-align: middle !important;
      position: relative !important;
      z-index: 9999 !important;
    }
    
    .fcp-btn {
      width: 26px !important;
      height: 26px !important;
      min-width: 26px !important;
      border-radius: 4px !important;
      border: none !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.15s ease !important;
      position: relative !important;
      padding: 0 !important;
      vertical-align: middle !important;
    }
    
    .fcp-btn:hover {
      transform: scale(1.1) !important;
      z-index: 10000 !important;
    }
    
    .fcp-btn-send {
      background: #22c55e !important;
    }
    
    .fcp-btn-send:hover {
      background: #16a34a !important;
    }
    
    .fcp-btn-compose {
      background: #f97316 !important;
    }
    
    .fcp-btn-compose:hover {
      background: #ea580c !important;
    }
    
    .fcp-btn svg {
      width: 14px !important;
      height: 14px !important;
      stroke: white !important;
      fill: none !important;
      stroke-width: 2.5 !important;
      pointer-events: none !important;
    }
    
    .fcp-tooltip {
      position: absolute !important;
      bottom: 100% !important;
      left: 50% !important;
      transform: translateX(-50%) !important;
      background: #1e293b !important;
      color: white !important;
      padding: 4px 8px !important;
      border-radius: 4px !important;
      font-size: 11px !important;
      white-space: nowrap !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: opacity 0.2s !important;
      z-index: 99999 !important;
      margin-bottom: 4px !important;
    }
    
    .fcp-btn:hover .fcp-tooltip {
      opacity: 1 !important;
    }
    
    .fcp-btn.fcp-sent {
      background: #6b7280 !important;
    }
  `;

  function injectStyles() {
    if (document.getElementById('fcp-styles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'fcp-styles';
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);
    console.log('[FCP] Styles injected');
  }

  const ICONS = {
    send: `<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    envelope: `<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  // Extract load data from row
  function extractLoadData(row) {
    const rowId = row.getAttribute('row-id') || row.getAttribute('row-index') || 
                  row.getAttribute('comp-id') || `fcp_${Date.now()}_${Math.random().toString(36).substr(2,6)}`;
    
    let loadData = {
      load_id: rowId,
      origin_city: '', origin_state: '',
      destination_city: '', destination_state: '',
      miles: 0, rate: 0,
      broker_name: '', broker_email: '', broker_phone: '', broker_mc: '',
      equipment_type: ''
    };

    // Get all cells
    const cells = row.querySelectorAll('[role="gridcell"], .ag-cell');
    
    cells.forEach(cell => {
      const colId = cell.getAttribute('col-id') || '';
      const text = (cell.textContent || '').trim();
      
      // Origin
      if (colId.includes('origin') || colId.includes('Origin') || colId.includes('pickup') || colId.includes('Pickup')) {
        const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
        if (match) {
          loadData.origin_city = match[1].trim();
          loadData.origin_state = match[2];
        } else if (text.length === 2 && /^[A-Z]{2}$/.test(text)) {
          loadData.origin_state = text;
        } else if (text.length > 2) {
          loadData.origin_city = text;
        }
      }
      
      // Destination
      if (colId.includes('dest') || colId.includes('Dest') || colId.includes('delivery') || colId.includes('Delivery')) {
        const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
        if (match) {
          loadData.destination_city = match[1].trim();
          loadData.destination_state = match[2];
        } else if (text.length === 2 && /^[A-Z]{2}$/.test(text)) {
          loadData.destination_state = text;
        } else if (text.length > 2) {
          loadData.destination_city = text;
        }
      }
      
      // Rate
      if (colId.includes('rate') || colId.includes('Rate') || colId.includes('price') || colId.includes('Price')) {
        const rateMatch = text.replace(/,/g, '').match(/\$?\s*(\d+)/);
        if (rateMatch) loadData.rate = parseInt(rateMatch[1]);
      }
      
      // Miles
      if (colId.includes('mile') || colId.includes('Mile') || colId.includes('distance') || colId.includes('Distance')) {
        const milesMatch = text.replace(/,/g, '').match(/(\d+)/);
        if (milesMatch) loadData.miles = parseInt(milesMatch[1]);
      }
      
      // Equipment
      if (colId.includes('equip') || colId.includes('Equip') || colId.includes('type') || colId.includes('Type')) {
        if (/van/i.test(text)) loadData.equipment_type = 'Van';
        else if (/reefer/i.test(text)) loadData.equipment_type = 'Reefer';
        else if (/flat/i.test(text)) loadData.equipment_type = 'Flatbed';
      }
      
      // Company
      if (colId.includes('company') || colId.includes('Company') || colId.includes('broker') || colId.includes('Broker') || colId.includes('poster') || colId.includes('Poster')) {
        loadData.broker_name = text;
        const mcMatch = text.match(/MC[#:\s-]*(\d+)/i);
        if (mcMatch) loadData.broker_mc = `MC${mcMatch[1]}`;
      }
    });

    // Fallback: parse entire row text
    const rowText = row.textContent || '';
    
    if (!loadData.origin_state) {
      const locations = rowText.match(/\b([A-Z]{2})\b/g);
      if (locations && locations.length >= 2) {
        loadData.origin_state = locations[0];
        loadData.destination_state = locations[1];
      }
    }
    
    if (!loadData.rate) {
      const rateMatch = rowText.match(/\$\s*([\d,]+)/);
      if (rateMatch) loadData.rate = parseInt(rateMatch[1].replace(/,/g, ''));
    }

    // Email link
    const emailLink = row.querySelector('a[href^="mailto:"]');
    if (emailLink) loadData.broker_email = emailLink.href.replace('mailto:', '').split('?')[0];

    return loadData;
  }

  function createButtons(loadData) {
    const container = document.createElement('span');
    container.className = 'fcp-btn-container';
    container.setAttribute('data-fcp-id', loadData.load_id);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'fcp-btn fcp-btn-send';
    sendBtn.type = 'button';
    sendBtn.innerHTML = ICONS.send + '<span class="fcp-tooltip">Quick Send</span>';
    sendBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); sendEmail(loadData, sendBtn); };

    const composeBtn = document.createElement('button');
    composeBtn.className = 'fcp-btn fcp-btn-compose';
    composeBtn.type = 'button';
    composeBtn.innerHTML = ICONS.envelope + '<span class="fcp-tooltip">Compose</span>';
    composeBtn.onclick = (e) => { e.preventDefault(); e.stopPropagation(); composeEmail(loadData); };

    container.appendChild(sendBtn);
    container.appendChild(composeBtn);
    return container;
  }

  async function sendEmail(loadData, btn) {
    let email = loadData.broker_email;
    if (!email) {
      email = prompt('Enter broker email:');
      if (!email) return;
    }

    const origin = loadData.origin_city ? `${loadData.origin_city}, ${loadData.origin_state}` : loadData.origin_state || 'Origin';
    const dest = loadData.destination_city ? `${loadData.destination_city}, ${loadData.destination_state}` : loadData.destination_state || 'Destination';
    
    const data = await getStorage(['templates', 'emailAccounts', 'activeAccountId']);
    const template = (data.templates || []).find(t => t.is_default) || data.templates?.[0];
    const account = (data.emailAccounts || []).find(a => a.id === data.activeAccountId) || data.emailAccounts?.[0];

    let subject = template?.subject || `Load Inquiry: ${origin} to ${dest}`;
    let body = template?.body || `Hi,\n\nI'm interested in your load from ${origin} to ${dest}.\n\nPlease let me know if still available.\n\nThank you!`;

    subject = subject.replace(/{origin}/g, origin).replace(/{destination}/g, dest)
      .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'TBD')
      .replace(/{miles}/g, loadData.miles || 'TBD')
      .replace(/{broker_name}/g, loadData.broker_name || '');

    body = body.replace(/{origin}/g, origin).replace(/{destination}/g, dest)
      .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'TBD')
      .replace(/{miles}/g, loadData.miles || 'TBD')
      .replace(/{broker_name}/g, loadData.broker_name || '');

    if (account?.company) body += `\n\n---\n${account.company}`;
    if (account?.phone) body += `\n${account.phone}`;
    if (account?.email) body += `\n${account.email}`;

    window.open(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
    
    btn.classList.add('fcp-sent');
    btn.innerHTML = ICONS.check + '<span class="fcp-tooltip">Sent!</span>';
    showNotification('Email opened!');
  }

  function composeEmail(loadData) {
    let email = loadData.broker_email;
    if (!email) {
      email = prompt('Enter broker email:');
      if (!email) return;
    }
    const origin = loadData.origin_city ? `${loadData.origin_city}, ${loadData.origin_state}` : loadData.origin_state || 'Origin';
    const dest = loadData.destination_city ? `${loadData.destination_city}, ${loadData.destination_state}` : loadData.destination_state || 'Destination';
    window.open(`mailto:${email}?subject=${encodeURIComponent(`Load Inquiry: ${origin} to ${dest}`)}`);
    showNotification('Compose opened!');
  }

  function showNotification(msg) {
    const existing = document.querySelector('.fcp-notification');
    if (existing) existing.remove();
    
    const n = document.createElement('div');
    n.className = 'fcp-notification';
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;background:#22c55e;color:white;border-radius:8px;font-family:system-ui;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  function getStorage(keys) {
    return new Promise(r => {
      if (chrome?.storage) chrome.storage.local.get(keys, r);
      else r({});
    });
  }

  // MAIN INJECTION - Try multiple row selectors
  function injectButtons() {
    // Multiple selectors for finding rows
    const rowSelectors = [
      '.ag-center-cols-container [role="row"]',
      '.ag-center-cols-viewport [role="row"]',
      '.ag-body-viewport [role="row"]',
      '[role="row"].ag-row',
      '.ag-row:not(.ag-row-group)',
      '[class*="visited-row"]',
      '.ag-row-even',
      '.ag-row-odd',
      '[row-index]'
    ];
    
    let allRows = new Set();
    
    rowSelectors.forEach(selector => {
      try {
        document.querySelectorAll(selector).forEach(row => allRows.add(row));
      } catch (e) {}
    });
    
    console.log(`[FCP] Found ${allRows.size} potential rows`);
    
    let injected = 0;
    
    allRows.forEach(row => {
      // Skip if already processed
      if (row.hasAttribute(FCP_INJECTED_ATTR)) return;
      
      // Skip header rows
      if (row.classList.contains('ag-header-row')) return;
      if (row.querySelector('.ag-header-cell')) return;
      if (row.getAttribute('role') === 'columnheader') return;
      
      // Must have cells
      const cells = row.querySelectorAll('[role="gridcell"], .ag-cell');
      if (cells.length < 3) return;
      
      // Skip if text too short (probably not a data row)
      const text = row.textContent?.trim();
      if (!text || text.length < 10) return;
      
      // Find the last cell or action cell to inject into
      let targetCell = null;
      
      // Look for action column
      for (let i = cells.length - 1; i >= 0; i--) {
        const cell = cells[i];
        const colId = (cell.getAttribute('col-id') || '').toLowerCase();
        if (colId.includes('action') || colId.includes('button') || colId.includes('menu')) {
          targetCell = cell;
          break;
        }
      }
      
      // Fallback to last cell
      if (!targetCell) {
        targetCell = cells[cells.length - 1];
      }
      
      // Skip if already has our buttons
      if (targetCell.querySelector('.fcp-btn-container')) return;
      
      const loadData = extractLoadData(row);
      const buttons = createButtons(loadData);
      
      // Find inner container or use cell directly
      const inner = targetCell.querySelector('.ag-cell-value') || targetCell;
      inner.appendChild(buttons);
      
      row.setAttribute(FCP_INJECTED_ATTR, 'true');
      injected++;
    });

    if (injected > 0) {
      console.log(`[FCP] ✅ Injected into ${injected} rows!`);
      showNotification(`FCP: Added to ${injected} loads`);
    }

    return injected;
  }

  // Polling and observer
  function startMonitoring() {
    // Initial injection with delay
    setTimeout(injectButtons, 2000);
    setTimeout(injectButtons, 4000);
    setTimeout(injectButtons, 6000);
    
    // Continuous polling
    setInterval(injectButtons, 3000);
    
    // Mutation observer
    const observer = new MutationObserver(() => {
      setTimeout(injectButtons, 500);
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
  }

  // Debug function
  window.fcpDebug = function() {
    console.log('=== FCP DEBUG v2.2 ===');
    console.log('URL:', location.href);
    
    const selectors = {
      '.ag-row': document.querySelectorAll('.ag-row').length,
      '[role="row"]': document.querySelectorAll('[role="row"]').length,
      '.ag-center-cols-container': document.querySelectorAll('.ag-center-cols-container').length,
      '[row-index]': document.querySelectorAll('[row-index]').length,
      '.ag-cell': document.querySelectorAll('.ag-cell').length,
      '[data-fcp-injected]': document.querySelectorAll('[data-fcp-injected]').length,
      '.fcp-btn-container': document.querySelectorAll('.fcp-btn-container').length,
    };
    
    console.table(selectors);
    
    // Try to find and show first data row
    const firstRow = document.querySelector('.ag-center-cols-container [role="row"], .ag-row:not(.ag-header-row)');
    if (firstRow) {
      console.log('First row classes:', firstRow.className);
      console.log('First row cells:', firstRow.querySelectorAll('.ag-cell, [role="gridcell"]').length);
    }
    
    // Manual injection attempt
    console.log('Attempting manual injection...');
    injectButtons();
  };

  // Force inject function
  window.fcpInject = function() {
    console.log('[FCP] Force injecting...');
    document.querySelectorAll('[data-fcp-injected]').forEach(el => el.removeAttribute(FCP_INJECTED_ATTR));
    document.querySelectorAll('.fcp-btn-container').forEach(el => el.remove());
    injectButtons();
  };

  // Init
  function init() {
    console.log('[FCP] Initializing v2.2...');
    injectStyles();
    startMonitoring();
    console.log('[FCP] Ready! Use fcpDebug() or fcpInject() in console.');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
