// Freight Connect Pro - Truckstop.com Content Script v2.1
// Fixed for AG Grid structure

(function() {
  'use strict';

  console.log('[FCP] Content script starting...');

  const FCP_INJECTED_ATTR = 'data-fcp-injected';
  let injectionAttempts = 0;
  let lastRowCount = 0;
  
  // CSS Styles
  const styles = `
    .fcp-btn-container {
      display: inline-flex !important;
      gap: 6px !important;
      align-items: center !important;
      margin-left: 8px !important;
      flex-shrink: 0 !important;
      vertical-align: middle !important;
    }
    
    .fcp-btn {
      width: 28px !important;
      height: 28px !important;
      min-width: 28px !important;
      border-radius: 5px !important;
      border: none !important;
      cursor: pointer !important;
      display: inline-flex !important;
      align-items: center !important;
      justify-content: center !important;
      transition: all 0.15s ease !important;
      position: relative !important;
      padding: 0 !important;
      z-index: 9999 !important;
      vertical-align: middle !important;
    }
    
    .fcp-btn:hover {
      transform: scale(1.1) !important;
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
  }

  const ICONS = {
    send: `<svg viewBox="0 0 24 24"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>`,
    envelope: `<svg viewBox="0 0 24 24"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
    check: `<svg viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>`
  };

  // Get load data from row
  function extractLoadData(row) {
    const rowId = row.getAttribute('row-id') || row.getAttribute('row-index') || 
                  row.getAttribute('comp-id') || `fcp_${Date.now()}`;
    
    let loadData = {
      load_id: rowId,
      origin_city: '', origin_state: '',
      destination_city: '', destination_state: '',
      miles: 0, rate: 0,
      broker_name: '', broker_email: '', broker_phone: '', broker_mc: '',
      equipment_type: ''
    };

    const rowText = row.textContent || '';
    
    // Find city, STATE patterns
    const locations = rowText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})\b/g) || [];
    if (locations.length >= 1) {
      const m1 = locations[0].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
      if (m1) { loadData.origin_city = m1[1].trim(); loadData.origin_state = m1[2]; }
    }
    if (locations.length >= 2) {
      const m2 = locations[1].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
      if (m2) { loadData.destination_city = m2[1].trim(); loadData.destination_state = m2[2]; }
    }

    // Find rate ($X,XXX)
    const rateMatch = rowText.match(/\$[\s]*([\d,]+)/);
    if (rateMatch) loadData.rate = parseInt(rateMatch[1].replace(/,/g, ''));

    // Find miles
    const milesMatch = rowText.match(/(\d{2,4})\s*(?:mi|miles?)/i);
    if (milesMatch) loadData.miles = parseInt(milesMatch[1]);

    // Equipment
    if (/\bvan\b/i.test(rowText)) loadData.equipment_type = 'Van';
    if (/\breefer\b/i.test(rowText)) loadData.equipment_type = 'Reefer';
    if (/\bflatbed\b/i.test(rowText)) loadData.equipment_type = 'Flatbed';

    // Email
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
    sendBtn.onclick = (e) => { e.stopPropagation(); sendEmail(loadData, sendBtn); };

    const composeBtn = document.createElement('button');
    composeBtn.className = 'fcp-btn fcp-btn-compose';
    composeBtn.type = 'button';
    composeBtn.innerHTML = ICONS.envelope + '<span class="fcp-tooltip">Compose</span>';
    composeBtn.onclick = (e) => { e.stopPropagation(); composeEmail(loadData); };

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

    const origin = loadData.origin_city ? `${loadData.origin_city}, ${loadData.origin_state}` : 'Origin';
    const dest = loadData.destination_city ? `${loadData.destination_city}, ${loadData.destination_state}` : 'Destination';
    
    // Get template from storage
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
    showNotification('Email opened!', 'success');
  }

  function composeEmail(loadData) {
    let email = loadData.broker_email;
    if (!email) {
      email = prompt('Enter broker email:');
      if (!email) return;
    }
    const origin = loadData.origin_city ? `${loadData.origin_city}, ${loadData.origin_state}` : 'Origin';
    const dest = loadData.destination_city ? `${loadData.destination_city}, ${loadData.destination_state}` : 'Destination';
    window.open(`mailto:${email}?subject=${encodeURIComponent(`Load Inquiry: ${origin} to ${dest}`)}`);
    showNotification('Compose opened!', 'success');
  }

  function showNotification(msg, type) {
    const n = document.createElement('div');
    n.style.cssText = `position:fixed;top:20px;right:20px;padding:12px 20px;background:${type==='success'?'#22c55e':'#ef4444'};color:white;border-radius:8px;font-family:system-ui;font-size:14px;z-index:2147483647;box-shadow:0 4px 12px rgba(0,0,0,0.3);`;
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

  // MAIN INJECTION FUNCTION
  function injectButtons() {
    // Find ALL AG Grid rows
    const rows = document.querySelectorAll('.ag-row:not(.ag-row-group):not([data-fcp-injected])');
    
    console.log(`[FCP] Found ${rows.length} unprocessed AG Grid rows`);

    let injected = 0;
    rows.forEach(row => {
      // Skip header rows
      if (row.classList.contains('ag-header-row')) return;
      
      // Skip empty rows
      const text = row.textContent?.trim();
      if (!text || text.length < 20) return;

      // Find the LAST cell (actions column)
      const cells = row.querySelectorAll('.ag-cell');
      if (cells.length === 0) return;

      const lastCell = cells[cells.length - 1];
      
      // Skip if already has FCP buttons
      if (lastCell.querySelector('.fcp-btn-container')) return;

      const loadData = extractLoadData(row);
      const buttons = createButtons(loadData);

      // Find existing content in cell
      const cellValue = lastCell.querySelector('.ag-cell-value') || lastCell;
      
      // Append our buttons
      cellValue.appendChild(buttons);
      
      row.setAttribute('data-fcp-injected', 'true');
      injected++;
    });

    if (injected > 0) {
      console.log(`[FCP] ✅ Injected into ${injected} rows!`);
    }

    return injected;
  }

  // AGGRESSIVE POLLING
  function startPolling() {
    setInterval(() => {
      const currentRows = document.querySelectorAll('.ag-row').length;
      
      // Always try to inject
      const injected = injectButtons();
      
      if (currentRows !== lastRowCount) {
        console.log(`[FCP] Row count changed: ${lastRowCount} -> ${currentRows}`);
        lastRowCount = currentRows;
      }
    }, 1000);
  }

  // MUTATION OBSERVER
  function setupObserver() {
    const observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      for (const m of mutations) {
        if (m.addedNodes.length) {
          for (const node of m.addedNodes) {
            if (node.nodeType === 1) {
              if (node.classList?.contains('ag-row') || node.querySelector?.('.ag-row')) {
                shouldInject = true;
                break;
              }
            }
          }
        }
        if (shouldInject) break;
      }
      if (shouldInject) {
        setTimeout(injectButtons, 100);
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // DEBUG FUNCTION - call from console: window.fcpDebug()
  window.fcpDebug = function() {
    console.log('=== FCP DEBUG ===');
    console.log('AG Rows:', document.querySelectorAll('.ag-row').length);
    console.log('AG Cells:', document.querySelectorAll('.ag-cell').length);
    console.log('AG Body:', document.querySelectorAll('.ag-body-viewport').length);
    console.log('Injected:', document.querySelectorAll('[data-fcp-injected]').length);
    console.log('FCP Buttons:', document.querySelectorAll('.fcp-btn-container').length);
    
    const firstRow = document.querySelector('.ag-row:not(.ag-row-group)');
    if (firstRow) {
      console.log('First row classes:', firstRow.className);
      console.log('First row cells:', firstRow.querySelectorAll('.ag-cell').length);
      console.log('First row text (100 chars):', firstRow.textContent?.substring(0, 100));
    }
    console.log('=================');
  };

  // INIT
  function init() {
    console.log('[FCP] Initializing...');
    injectStyles();
    
    // Initial injection after delay
    setTimeout(() => {
      injectButtons();
      setupObserver();
      startPolling();
      console.log('[FCP] Ready! Type fcpDebug() in console for diagnostics.');
    }, 2000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
