# Freight Connect Pro - Chrome Extension

A tactical load hunting companion for freight dispatchers. Similar to LoadHunter, this Chrome extension helps you find loads, calculate RPM, check broker safety, and email brokers with one click.

## Features

### 🚚 Load Board Viewer
- View and filter available loads
- Filter by equipment type (Van, Reefer, Flatbed)
- Filter by origin state
- Filter by minimum RPM
- Pin important loads
- One-click email to brokers
- One-click call to brokers
- Risk level indicators

### 🧮 RPM Calculator
- Calculate Gross RPM
- Calculate Net RPM (after fuel costs)
- Calculate RPM+ (including deadhead miles)
- Fuel cost estimation
- Toll cost input
- Net profit calculation

### 📧 Email Templates
- Create custom email templates
- Use placeholders: `{origin}`, `{destination}`, `{rate}`, `{miles}`
- Quick email with template application
- Manage multiple templates

### 🛡️ Broker Safety Check
- FMCSA verification (simulated)
- Scam risk detection
- Safety rating lookup
- Factoring rating check
- Days in business verification

### ⚙️ Additional Features
- Google OAuth authentication (via Emergent Auth)
- Auto-refresh every 30 seconds
- Dark mode tactical interface
- Data persistence via Chrome storage
- Status bar with connection info

## Installation

### Method 1: Load Unpacked Extension (Developer Mode)

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `chrome-extension` folder
6. The extension icon will appear in your toolbar

### Method 2: Pack Extension

1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Pack extension"
4. Select the `chrome-extension` folder
5. A `.crx` file will be generated
6. Drag the `.crx` file to Chrome to install

## Usage

1. Click the Freight Connect Pro icon in your Chrome toolbar
2. Sign in with Google (or use demo mode)
3. Browse available loads in the Loads tab
4. Use filters to narrow down results
5. Click the email icon to contact a broker
6. Use the RPM calculator to evaluate loads
7. Check broker safety before booking

## File Structure

```
chrome-extension/
├── manifest.json       # Extension configuration
├── popup.html          # Main popup interface
├── css/
│   └── popup.css       # Styles
├── js/
│   ├── popup.js        # Main popup logic
│   └── background.js   # Service worker
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Keyboard Shortcuts

- `Enter` in broker MC input: Check broker

## Demo Mode

The extension works in demo mode with sample data. In production, you would:
1. Integrate with actual load board APIs (DAT, Truckstop)
2. Use real FMCSA API for broker verification
3. Connect to your dispatch management system

## Permissions

- `storage`: Save user data and preferences
- `identity`: Google OAuth authentication
- `tabs`: Open email/phone links
- `activeTab`: Future load board integration

## Technical Notes

- Built with vanilla JavaScript (no frameworks)
- Uses Chrome Extension Manifest V3
- Supports Chrome storage sync
- Service worker for background tasks

## Customization

Edit `js/popup.js` to:
- Change sample load data
- Modify RPM calculation formulas
- Adjust risk level thresholds
- Customize email templates

## Support

For issues or feature requests, please open an issue on GitHub.

## License

MIT License
