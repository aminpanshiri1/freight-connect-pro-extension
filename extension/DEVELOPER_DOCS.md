# Developer Documentation - Freight Connect Pro

## Architecture Overview

### Extension Structure

```
/app/extension/
├── manifest.json              # Extension configuration
├── README.md                  # User documentation
├── INSTALLATION_GUIDE.md      # Installation instructions
│
├── popup/
│   ├── popup.html         # Extension popup UI
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup logic
│
├── content/
│   ├── content-script.js  # Injected into load board pages
│   └── content.css        # Styles for injected elements
│
├── background/
│   └── service-worker.js  # Background script for Gmail API
│
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## Component Details

### 1. Manifest (manifest.json)

**Purpose**: Defines extension configuration, permissions, and resources

**Key Sections**:
- `manifest_version: 3` - Latest Chrome extension standard
- `permissions` - Identity, storage, activeTab, scripting
- `host_permissions` - Access to Truckstop, DAT, Google APIs
- `oauth2` - Gmail API authentication configuration
- `content_scripts` - Scripts injected into load board pages
- `background` - Service worker for API calls

**OAuth Configuration**:
```json
"oauth2": {
  "client_id": "664028684698-84fh76j3nprond26ofk2tmmrncgcsc1t.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/gmail.send",
    "https://www.googleapis.com/auth/userinfo.email"
  ]
}
```

---

### 2. Popup Interface

**Files**: `popup/popup.html`, `popup/popup.css`, `popup/popup.js`

**Purpose**: Main user interface for the extension

**Features**:
- Display extracted load data
- Three email buttons for different accounts
- Map display button
- Settings (color filter toggle, auth status)
- Status messages

**Communication**:
- Sends messages to content script via `chrome.tabs.sendMessage()`
- Sends messages to service worker via `chrome.runtime.sendMessage()`
- Receives updates via `chrome.runtime.onMessage`
- Stores data using `chrome.storage.local`

**Key Functions**:
```javascript
requestLoadData()      // Request data from content script
displayLoadInfo()      // Update UI with load details
sendEmail()            // Trigger email sending
showRouteMap()         // Display Google Maps route
handleAuth()           // Initiate Gmail authentication
```

---

### 3. Content Script

**Files**: `content/content-script.js`, `content/content.css`

**Purpose**: Injected into Truckstop and DAT pages to extract data and apply filters

**Injection**: Automatically loads on matching URLs:
- `https://www.truckstop.com/*`
- `https://truckstop.com/*`
- `https://one.dat.com/*`
- `https://*.dat.com/*`

**Features**:
1. **Site Detection**: Identifies Truckstop vs DAT
2. **Data Extraction**: Scrapes origin, destination, distance, rate
3. **Color Filtering**: Applies color coding to rates
4. **Map Modal**: Displays Google Maps iframe
5. **Page Observation**: Monitors DOM changes

**Data Extraction Strategy**:

```javascript
// Truckstop selectors (multiple fallbacks)
const originSelectors = [
  '[data-testid="origin"]',
  '.origin-city',
  '[class*="origin"]',
  'td:nth-child(1)',
  '.load-origin'
];

// DAT selectors
const originSelectors = [
  '[data-field="origin"]',
  '.load-origin',
  '[class*="origin"]',
  'td:nth-child(2)',
  '.city-origin'
];
```

**Color Filter Logic**:
```javascript
if (ratePerMile < 1.5) {
  backgroundColor = '#ffebee'; // Red
} else if (ratePerMile < 2.0) {
  backgroundColor = '#fff3e0'; // Orange
} else if (ratePerMile < 2.5) {
  backgroundColor = '#fffde7'; // Yellow
} else if (ratePerMile < 3.0) {
  backgroundColor = '#f1f8e9'; // Light Green
} else {
  backgroundColor = '#e8f5e9'; // Green
}
```

**Message Handling**:
```javascript
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getLoadData') {
    extractLoadData();
    sendResponse({ data: loadData });
  }
  if (request.action === 'showMap') {
    showMapModal(request.origin, request.destination);
  }
  if (request.action === 'toggleColorFilter') {
    colorFilterEnabled = request.enabled;
  }
});
```

---

### 4. Service Worker

**File**: `background/service-worker.js`

**Purpose**: Handles Gmail authentication and email sending

**Key Responsibilities**:
1. OAuth authentication with Gmail
2. Token management and refresh
3. Email composition and sending via Gmail API
4. Error handling

**Gmail Authentication Flow**:
```javascript
async function handleAuthentication() {
  const token = await chrome.identity.getAuthToken({ interactive: true });
  authToken = token;
  await chrome.storage.local.set({ authToken: token });
  return { success: true, token };
}
```

**Email Sending Flow**:
```javascript
async function handleSendEmail(emailData) {
  // 1. Get auth token
  // 2. Create RFC 2822 formatted email
  // 3. Encode in base64url
  // 4. POST to Gmail API
  // 5. Handle response/errors
  // 6. Retry on token expiration
}
```

**RFC 2822 Email Format**:
```javascript
const message = [
  `From: ${from}`,
  `To: ${to}`,
  `Subject: ${subject}`,
  '',
  body
].join('\r\n');
```

**Gmail API Endpoint**:
```
POST https://www.googleapis.com/gmail/v1/users/me/messages/send
Headers:
  Authorization: Bearer {token}
  Content-Type: application/json
Body:
  { "raw": "{base64url_encoded_email}" }
```

---

## Data Flow

### 1. Load Data Extraction
```
1. User browses Truckstop/DAT
2. Content script detects page load
3. Content script extracts data using selectors
4. Data stored in chrome.storage.local
5. Content script sends message to popup (if open)
6. Popup displays data
```

### 2. Email Sending
```
1. User clicks email button in popup
2. Popup sends message to service worker
3. Service worker checks authentication
4. Service worker formats email (RFC 2822)
5. Service worker calls Gmail API
6. Gmail API sends email
7. Service worker returns success/error
8. Popup displays status message
```

### 3. Map Display
```
1. User clicks "Show Route" in popup
2. Popup sends message to content script
3. Content script creates modal overlay
4. Modal contains Google Maps iframe
5. Google Maps displays route
6. User can close modal
```

---

## Storage Schema

### chrome.storage.local

```javascript
{
  // Current load data
  loadData: {
    origin: "Los Angeles, CA",
    destination: "Dallas, TX",
    distance: 1435,
    rate: 3200,
    ratePerMile: "2.23"
  },
  
  // Authentication token
  authToken: "ya29.a0AfH6SMB...",
  
  // Settings
  colorFilterEnabled: true
}
```

---

## API Integration

### 1. Gmail API

**Scopes Required**:
- `https://www.googleapis.com/auth/gmail.send`
- `https://www.googleapis.com/auth/userinfo.email`

**Endpoint Used**:
- `POST /gmail/v1/users/me/messages/send`

**Authentication**: OAuth 2.0 via Chrome Identity API

### 2. Google Maps API

**Type**: Embed API (iframe)

**URL Format**:
```
https://www.google.com/maps/embed/v1/directions
  ?key={API_KEY}
  &origin={origin}
  &destination={destination}
  &mode=driving
```

**API Key**: Public embed key (limited to iframe usage)

---

## Security Considerations

### 1. Permissions
- **Minimum required**: Only requests necessary permissions
- **Host permissions**: Limited to Truckstop, DAT, and Google APIs
- **Identity**: Only for Gmail OAuth

### 2. Data Privacy
- No data sent to external servers (except Google APIs)
- Load data stored locally only
- Auth tokens managed by Chrome securely

### 3. Content Security
- Manifest V3 compliance (no eval, no remote code)
- All scripts bundled with extension
- No inline scripts in HTML

---

## Testing

### Manual Testing Checklist

**Installation**:
- [ ] Extension loads without errors
- [ ] Icons display correctly
- [ ] Popup opens when icon clicked

**Authentication**:
- [ ] Sign-in button appears
- [ ] OAuth flow completes successfully
- [ ] Token persists across sessions
- [ ] Status updates to "Signed In"

**Data Extraction (Truckstop)**:
- [ ] Origin extracted correctly
- [ ] Destination extracted correctly
- [ ] Distance calculated
- [ ] Rate displayed
- [ ] Rate per mile calculated

**Data Extraction (DAT)**:
- [ ] Origin extracted correctly
- [ ] Destination extracted correctly
- [ ] Distance calculated
- [ ] Rate displayed
- [ ] Rate per mile calculated

**Email Sending**:
- [ ] Email 1 (main) sends successfully
- [ ] Email 2 (FreightWiz) sends successfully
- [ ] Email 3 (General Freight) sends successfully
- [ ] Subject line includes origin/destination
- [ ] Body includes all load details
- [ ] Error handling works (no auth, no data)

**Color Filter**:
- [ ] Toggle enables/disables filter
- [ ] Colors apply correctly based on rate
- [ ] Colors persist on page changes
- [ ] Colors remove when disabled

**Map Display**:
- [ ] Map modal opens
- [ ] Route displays correctly
- [ ] Modal closes on X click
- [ ] Modal closes on overlay click

---

## Troubleshooting Development Issues

### Extension Won't Load
- Check manifest.json for syntax errors
- Verify all file paths are correct
- Check Chrome console for errors

### Content Script Not Injecting
- Verify URL matches in manifest
- Check host_permissions
- Reload extension after changes
- Hard refresh the target page

### Gmail API Errors
- Verify OAuth credentials
- Check token expiration
- Ensure scopes are correct
- Check API is enabled in Google Cloud Console

### Data Not Extracting
- Website may have changed selectors
- Add new selectors to arrays
- Use Chrome DevTools to inspect elements
- Check console for extraction errors

---

## Future Enhancements

### Potential Features
1. **Load History**: Track loads you've inquired about
2. **Quick Replies**: Template responses to common questions
3. **Rate Alerts**: Notify when high-paying loads appear
4. **Multi-Select**: Send emails for multiple loads at once
5. **Custom Templates**: User-defined email templates
6. **Analytics**: Track response rates and bookings
7. **Integration**: Connect with dispatch software

### Technical Improvements
1. **Better Selectors**: Machine learning to adapt to page changes
2. **Offline Mode**: Queue emails when offline
3. **Settings Page**: Full options page for configuration
4. **Shortcuts**: Keyboard shortcuts for common actions
5. **Unit Tests**: Automated testing suite

---

## Maintenance

### Regular Updates
1. **Monitor Website Changes**: Truckstop and DAT may update their UIs
2. **Test Selectors**: Verify data extraction still works
3. **Update Dependencies**: Keep Chrome Manifest V3 compliant
4. **Check API Changes**: Monitor Gmail API updates

### Version Control
- Update `version` in manifest.json
- Document changes in README
- Test thoroughly before release

---

## Resources

### Documentation
- [Chrome Extension API](https://developer.chrome.com/docs/extensions/)
- [Gmail API](https://developers.google.com/gmail/api)
- [Google Maps Embed API](https://developers.google.com/maps/documentation/embed)
- [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/identity/)

### Tools
- Chrome DevTools for debugging
- Chrome Extensions Developer Mode
- Postman for testing Gmail API

---

**Last Updated**: January 2025
**Version**: 1.0.0