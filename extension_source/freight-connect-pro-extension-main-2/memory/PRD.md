# Freight Connect Pro - PRD

## Project Overview
**Name:** Freight Connect Pro  
**Type:** Chrome Browser Extension  
**Target Users:** Freight dispatchers, trucking companies, owner-operators  
**Last Updated:** January 22, 2026

## Original Problem Statement
Build a Chrome extension for freight load hunting, similar to LoadHunter extension. Features include load board integration, RPM calculator, one-click email to brokers, broker safety check, and dark mode tactical UI.

## User Personas
1. **Freight Dispatcher** - Needs to quickly find and book loads, communicate with brokers
2. **Owner-Operator** - Calculates profitability, checks broker reliability
3. **Trucking Company** - Manages multiple loads, needs efficiency tools

## Core Requirements (Static)
- Chrome Extension (Manifest V3)
- Load board viewer with filtering
- RPM Calculator with fuel/toll calculations
- Email templates with placeholders
- Broker safety check (FMCSA verification)
- One-click email/call to brokers
- Dark mode tactical interface
- Google OAuth authentication (Emergent Auth)

## What's Been Implemented ✅
### January 22, 2026
- [x] Chrome Extension structure (manifest.json, popup.html, css, js)
- [x] Dark tactical UI theme ("The Night Dispatcher")
- [x] Load board viewer with 6 sample loads
- [x] Filter by equipment type (Van, Reefer, Flatbed)
- [x] Filter by origin state
- [x] Filter by minimum RPM
- [x] Pin/unpin loads
- [x] One-click email to broker (mailto:)
- [x] One-click call to broker (tel:)
- [x] RPM Calculator (Gross RPM, Net RPM, RPM+, fuel cost, net profit)
- [x] Email templates with CRUD operations
- [x] Template placeholders: {origin}, {destination}, {rate}, {miles}, {broker_name}
- [x] Default template selection (star icon)
- [x] Broker safety check with risk assessment
- [x] Status bar with connection info
- [x] Chrome storage for persistence
- [x] Demo mode fallback for auth
- [x] Tab navigation (Loads, RPM, Email, Broker, Settings)
- [x] Extension icons (16, 48, 128px)
- [x] README with installation instructions
- [x] Downloadable ZIP package

### NEW - January 22, 2026 (v1.1)
- [x] **One-Click Send** - Send email with default template instantly (green arrow button)
- [x] **Email Modal** - Preview/edit email before sending
- [x] **Auto-Email Feature** with ON/OFF toggle
- [x] **Auto-Email Criteria Settings:**
  - Minimum RPM threshold
  - Equipment type filters (Van, Reefer, Flatbed)
  - Origin states filter
  - Destination states filter
  - Max emails per hour limit
  - Skip high/medium risk brokers option
- [x] **User Contact Info Storage** (email, company, phone for signatures)
- [x] **Stats Tracking** (emails sent, today, matched loads, skipped)
- [x] **Settings Tab** with all toggles and preferences
- [x] **Sound Notifications Toggle**
- [x] **Auto-Refresh Toggle**

### NEW - January 22, 2026 (v1.2) - Multi-Email Support
- [x] **Multi-Email Account Support** - Switch between multiple sender accounts
- [x] **Pre-configured Accounts:**
  - aminpanshiri1@gmail.com (Main)
  - info@freightwiz.us (FreightWiz)
  - info@generalfreightinc.com (General Freight Inc)
- [x] **Account Management UI** in Settings tab
- [x] **Add/Edit/Delete Accounts** with modal
- [x] **Set Main Account** with MAIN badge
- [x] **Active Account Bar** in Email tab
- [x] **FROM Selector** in email modal to choose sending account
- [x] **Per-Account Signatures** (company, phone)

## Tech Stack
- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Fonts:** Manrope + JetBrains Mono
- **Storage:** Chrome Storage API
- **Auth:** Emergent Google OAuth (with demo fallback)

## File Structure
```
/app/chrome-extension/
├── manifest.json       # Extension config (Manifest V3)
├── popup.html          # Main popup UI
├── css/popup.css       # Dark tactical styles
├── js/popup.js         # Main logic
├── js/background.js    # Service worker
├── icons/              # Extension icons
└── README.md           # Installation guide
```

## Prioritized Backlog

### P0 - Critical (For Production)
- [ ] Real load board API integration (DAT, Truckstop)
- [ ] Real FMCSA API for broker verification
- [ ] Proper Google OAuth flow in extension context

### P1 - High Priority
- [ ] Auto-email feature (send emails based on criteria)
- [ ] SmartBoard view with custom columns
- [ ] Google Maps integration for routes
- [ ] Dynamic toll calculation API
- [ ] Load board scraping content scripts

### P2 - Medium Priority
- [ ] Multiple equipment type selection
- [ ] Saved searches
- [ ] User preferences sync
- [ ] Notification for high RPM loads
- [ ] Dark/light mode toggle
- [ ] Export loads to CSV

### P3 - Low Priority
- [ ] Integration with dispatch software
- [ ] Historical load analytics
- [ ] Broker rating system
- [ ] Team collaboration features

## Next Tasks
1. Test extension by installing in Chrome (Developer Mode)
2. Replace sample data with real API calls
3. Implement FMCSA API integration
4. Add content scripts for load board sites

## Installation
1. Go to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select `/app/chrome-extension/` folder
