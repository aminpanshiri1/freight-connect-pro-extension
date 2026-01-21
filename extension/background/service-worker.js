// Background Service Worker for Freight Connect Pro
// Handles Gmail authentication and email sending

console.log('Freight Connect Pro: Service worker loaded');

let authToken = null;

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.local.set({
      colorFilterEnabled: true
    });
  }
});

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Service worker received message:', request);
  
  if (request.action === 'authenticate') {
    handleAuthentication()
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }
  
  if (request.action === 'sendEmail') {
    handleSendEmail(request.data)
      .then(result => sendResponse(result))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  return false;
});

// Handle Gmail OAuth authentication
async function handleAuthentication() {
  try {
    console.log('Starting authentication...');
    
    // Get OAuth token using Chrome Identity API
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });
    
    if (!token) {
      throw new Error('Failed to obtain auth token');
    }
    
    authToken = token;
    console.log('Authentication successful');
    
    // Store token
    await chrome.storage.local.set({ authToken: token });
    
    return { success: true, token: token };
  } catch (error) {
    console.error('Authentication error:', error);
    return { success: false, error: error.message };
  }
}

// Handle sending email via Gmail API
async function handleSendEmail(emailData) {
  try {
    console.log('Sending email...', emailData);
    
    // Get auth token
    if (!authToken) {
      const stored = await chrome.storage.local.get('authToken');
      authToken = stored.authToken;
    }
    
    if (!authToken) {
      throw new Error('Not authenticated. Please sign in first.');
    }
    
    // Create email in RFC 2822 format
    const email = createEmailMessage(emailData);
    
    // Encode email in base64url format
    const encodedEmail = btoa(email)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    
    // Send via Gmail API
    const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        raw: encodedEmail
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('Gmail API error:', errorData);
      
      // If token expired, try to get new one
      if (response.status === 401) {
        console.log('Token expired, re-authenticating...');
        const authResult = await handleAuthentication();
        if (authResult.success) {
          // Retry sending email with new token
          return handleSendEmail(emailData);
        }
      }
      
      throw new Error(errorData.error?.message || 'Failed to send email');
    }
    
    const result = await response.json();
    console.log('Email sent successfully:', result);
    
    return { success: true, messageId: result.id };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error: error.message };
  }
}

// Create RFC 2822 formatted email message
function createEmailMessage(emailData) {
  const { to, from, subject, body } = emailData;
  
  const message = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: ${subject}`,
    '',
    body
  ].join('\r\n');
  
  return message;
}

// Handle token removal on sign out
chrome.identity.onSignInChanged.addListener((account, signedIn) => {
  if (!signedIn) {
    authToken = null;
    chrome.storage.local.remove('authToken');
    console.log('User signed out');
  }
});