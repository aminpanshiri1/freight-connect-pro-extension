// Freight Connect Pro - DAT.com Content Script
// Injects FCP buttons (green arrow + orange envelope) into load rows

(function() {
  'use strict';

  const FCP_INJECTED_ATTR = 'data-fcp-injected';
  const INJECTION_INTERVAL = 2000;
  
  // CSS Styles
  const styles = `
    .fcp-btn-container {
      display: inline-flex;
      gap: 4px;
      margin-left: 8px;
      align-items: center;
    }
    
    .fcp-btn {
      width: 28px;
      height: 28px;
      border-radius: 6px;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      position: relative;
    }
    
    .fcp-btn:hover {
      transform: scale(1.1);
    }
    
    .fcp-btn-send {
      background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
      box-shadow: 0 2px 4px rgba(34, 197, 94, 0.3);
    }
    
    .fcp-btn-send:hover {
      background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
      box-shadow: 0 4px 8px rgba(34, 197, 94, 0.4);
    }
    
    .fcp-btn-compose {
      background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
      box-shadow: 0 2px 4px rgba(249, 115, 22, 0.3);
    }
    
    .fcp-btn-compose:hover {
      background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%);
      box-shadow: 0 4px 8px rgba(249, 115, 22, 0.4);
    }
    
    .fcp-btn svg {
      width: 14px;
      height: 14px;
      stroke: white;
      fill: none;
      stroke-width: 2;
    }
    
    .fcp-tooltip {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #1a1a2e;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
      margin-bottom: 4px;
      z-index: 10000;
    }
    
    .fcp-btn:hover .fcp-tooltip {
      opacity: 1;
    }
    
    .fcp-btn.fcp-sent {
      background: #6b7280 !important;
      cursor: default;
    }
    
    .fcp-btn.fcp-sent:hover {
      transform: none;
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
    check: `<svg viewBox="0 0 24 24"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>`
  };

  function extractLoadData(row) {
    try {
      const cells = row.querySelectorAll('td');
      
      let loadData = {
        load_id: row.getAttribute('data-load-id') || row.getAttribute('data-id') || `dat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
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

      // DAT specific selectors
      cells.forEach((cell, index) => {
        const text = cell.textContent.trim();
        const cellClass = cell.className.toLowerCase();
        
        // Origin/Destination columns
        if (cellClass.includes('origin') || cellClass.includes('pickup') || index === 0) {
          const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          if (match && !loadData.origin_city) {
            loadData.origin_city = match[1].trim();
            loadData.origin_state = match[2];
          }
        }
        
        if (cellClass.includes('dest') || cellClass.includes('delivery') || index === 1) {
          const match = text.match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          if (match && !loadData.destination_city) {
            loadData.destination_city = match[1].trim();
            loadData.destination_state = match[2];
          }
        }
        
        // Miles
        if (cellClass.includes('mile') || cellClass.includes('distance')) {
          const milesMatch = text.match(/[\d,]+/);
          if (milesMatch) loadData.miles = parseInt(milesMatch[0].replace(',', ''));
        }
        
        // Rate
        if (cellClass.includes('rate') || cellClass.includes('price') || text.includes('$')) {
          const rateMatch = text.match(/\$?([\d,]+)/);
          if (rateMatch && !loadData.rate) loadData.rate = parseInt(rateMatch[1].replace(',', ''));
        }
        
        // Equipment
        if (text.toLowerCase().includes('van')) loadData.equipment_type = loadData.equipment_type || 'Van';
        if (text.toLowerCase().includes('reefer')) loadData.equipment_type = 'Reefer';
        if (text.toLowerCase().includes('flatbed')) loadData.equipment_type = 'Flatbed';
        
        // Broker info
        if (cellClass.includes('company') || cellClass.includes('broker') || cellClass.includes('contact')) {
          if (!loadData.broker_name) loadData.broker_name = text.split('\n')[0].trim();
          
          const mcMatch = text.match(/MC[#\s-]*(\d+)/i);
          if (mcMatch) loadData.broker_mc = `MC${mcMatch[1]}`;
          
          const emailEl = cell.querySelector('a[href^="mailto:"]');
          if (emailEl) loadData.broker_email = emailEl.getAttribute('href').replace('mailto:', '');
          
          const phoneMatch = text.match(/[\d()-]{10,}/);
          if (phoneMatch) loadData.broker_phone = phoneMatch[0];
        }
      });

      // Fallback parsing from row content
      const rowText = row.textContent;
      
      if (!loadData.origin_city || !loadData.destination_city) {
        const locationMatches = rowText.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?),?\s*([A-Z]{2})/g);
        if (locationMatches && locationMatches.length >= 2) {
          const origin = locationMatches[0].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          const dest = locationMatches[1].match(/([A-Za-z\s]+),?\s*([A-Z]{2})/);
          if (origin && !loadData.origin_city) {
            loadData.origin_city = origin[1].trim();
            loadData.origin_state = origin[2];
          }
          if (dest && !loadData.destination_city) {
            loadData.destination_city = dest[1].trim();
            loadData.destination_state = dest[2];
          }
        }
      }

      // Look for email links
      if (!loadData.broker_email) {
        const emailLink = row.querySelector('a[href^="mailto:"]');
        if (emailLink) {
          loadData.broker_email = emailLink.getAttribute('href').replace('mailto:', '');
        }
      }

      return loadData;
    } catch (e) {
      console.error('[FCP] Error extracting load data:', e);
      return null;
    }
  }

  function createFCPButtons(loadData) {
    const container = document.createElement('div');
    container.className = 'fcp-btn-container';
    container.setAttribute('data-fcp-load-id', loadData.load_id);

    const sendBtn = document.createElement('button');
    sendBtn.className = 'fcp-btn fcp-btn-send';
    sendBtn.innerHTML = ICONS.send + '<span class="fcp-tooltip">One-Click Send</span>';
    sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleOneClickSend(loadData, sendBtn);
    });

    const composeBtn = document.createElement('button');
    composeBtn.className = 'fcp-btn fcp-btn-compose';
    composeBtn.innerHTML = ICONS.envelope + '<span class="fcp-tooltip">Compose Email</span>';
    composeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleComposeEmail(loadData);
    });

    container.appendChild(sendBtn);
    container.appendChild(composeBtn);

    return container;
  }

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

      if (!loadData.broker_email) {
        showNotification('No broker email found for this load.', 'error');
        return;
      }

      const origin = `${loadData.origin_city}, ${loadData.origin_state}`;
      const destination = `${loadData.destination_city}, ${loadData.destination_state}`;
      
      let subject = defaultTemplate.subject
        .replace(/{origin}/g, origin)
        .replace(/{destination}/g, destination)
        .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'N/A')
        .replace(/{miles}/g, loadData.miles || 'N/A')
        .replace(/{broker_name}/g, loadData.broker_name || 'Broker');

      let body = defaultTemplate.body
        .replace(/{origin}/g, origin)
        .replace(/{destination}/g, destination)
        .replace(/{rate}/g, loadData.rate ? `$${loadData.rate}` : 'N/A')
        .replace(/{miles}/g, loadData.miles || 'N/A')
        .replace(/{broker_name}/g, loadData.broker_name || 'Broker');

      if (activeAccount && (activeAccount.company || activeAccount.phone)) {
        body += '\n\n---\n';
        if (activeAccount.company) body += activeAccount.company + '\n';
        if (activeAccount.phone) body += activeAccount.phone + '\n';
        if (activeAccount.email) body += activeAccount.email;
      }

      const mailtoUrl = `mailto:${loadData.broker_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.open(mailtoUrl, '_blank');

      const emailedLoads = storage.emailedLoads || [];
      emailedLoads.push(loadData.load_id);
      
      const stats = storage.stats || { sent: 0, today: 0, matched: 0, skipped: 0 };
      stats.sent++;
      stats.today++;

      await setStorage({ emailedLoads, stats });

      btn.classList.add('fcp-sent');
      btn.innerHTML = ICONS.check + '<span class="fcp-tooltip">Sent!</span>';

      showNotification(`Email sent to ${loadData.broker_name || loadData.broker_email}!`, 'success');

    } catch (e) {
      console.error('[FCP] Error sending email:', e);
      showNotification('Failed to send email. Please try again.', 'error');
    }
  }

  async function handleComposeEmail(loadData) {
    try {
      await setStorage({ pendingEmailLoad: loadData });
      
      chrome.runtime.sendMessage({ 
        action: 'openComposeModal', 
        loadData: loadData 
      });

      if (loadData.broker_email) {
        const origin = `${loadData.origin_city}, ${loadData.origin_state}`;
        const destination = `${loadData.destination_city}, ${loadData.destination_state}`;
        const subject = `Load Inquiry: ${origin} to ${destination}`;
        const mailtoUrl = `mailto:${loadData.broker_email}?subject=${encodeURIComponent(subject)}`;
        window.open(mailtoUrl, '_blank');
      } else {
        showNotification('No broker email found. Please check the load details.', 'error');
      }
    } catch (e) {
      console.error('[FCP] Error opening compose:', e);
    }
  }

  function showNotification(message, type = 'success') {
    const notif = document.createElement('div');
    notif.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      background: ${type === 'success' ? '#22c55e' : '#ef4444'};
      color: white;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      gap: 8px;
    `;
    
    const icon = type === 'success' 
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>';
    
    notif.innerHTML = `<span style="display:flex">${icon}</span><span>${message}</span>`;
    
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
  }

  function getStorage(keys) {
    return new Promise((resolve) => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        chrome.storage.local.get(keys, resolve);
      } else {
        const result = {};
        keys.forEach(key => {
          const stored = localStorage.getItem(`fcp_${key}`);
          if (stored) result[key] = JSON.parse(stored);
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
          localStorage.setItem(`fcp_${key}`, JSON.stringify(data[key]));
        });
        resolve();
      }
    });
  }

  function injectButtons() {
    // DAT.com specific selectors
    const rowSelectors = [
      'table tbody tr',
      '[data-testid="load-row"]',
      '.load-row',
      '.search-results-row',
      '.loadboard-row',
      '.load-card',
      '.load-item',
      '[class*="LoadRow"]',
      '[class*="load-row"]',
      '[class*="searchResult"]',
      'tr[data-load-id]',
      'tr[data-id]',
      'div[data-load-id]',
      // DAT Power specific
      '[class*="ResultRow"]',
      '[class*="result-row"]'
    ];

    const actionSelectors = [
      'td:last-child',
      '.actions-cell',
      '.action-column',
      '[class*="actions"]',
      '[class*="Actions"]',
      '.load-actions',
      '.row-actions'
    ];

    let injectedCount = 0;

    rowSelectors.forEach(rowSelector => {
      const rows = document.querySelectorAll(rowSelector);
      
      rows.forEach(row => {
        if (row.hasAttribute(FCP_INJECTED_ATTR)) return;
        if (row.querySelector('th')) return;
        
        const loadData = extractLoadData(row);
        if (!loadData) return;

        let actionsCell = null;
        
        for (const actionSelector of actionSelectors) {
          actionsCell = row.querySelector(actionSelector);
          if (actionsCell) break;
        }

        if (!actionsCell) {
          const cells = row.querySelectorAll('td');
          if (cells.length > 0) {
            actionsCell = cells[cells.length - 1];
          }
        }

        if (actionsCell) {
          const fcpButtons = createFCPButtons(loadData);
          
          if (actionsCell.firstChild) {
            actionsCell.insertBefore(fcpButtons, actionsCell.firstChild);
          } else {
            actionsCell.appendChild(fcpButtons);
          }
          
          row.setAttribute(FCP_INJECTED_ATTR, 'true');
          injectedCount++;
        }
      });
    });

    if (injectedCount > 0) {
      console.log(`[FCP] Injected buttons into ${injectedCount} load rows`);
    }
  }

  function init() {
    console.log('[FCP] Freight Connect Pro content script loaded for DAT');
    
    injectStyles();
    setTimeout(injectButtons, 1000);
    
    const observer = new MutationObserver((mutations) => {
      let shouldInject = false;
      mutations.forEach(mutation => {
        if (mutation.addedNodes.length > 0) shouldInject = true;
      });
      if (shouldInject) setTimeout(injectButtons, 500);
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    setInterval(injectButtons, INJECTION_INTERVAL);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
