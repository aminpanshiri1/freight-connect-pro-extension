# Freight Connect Pro - Chrome Extension

🚀 **One-Click Email Tool for Truckstop and DAT Load Boards**

A powerful Chrome extension that streamlines your freight booking workflow by enabling quick email communication, route visualization, and intelligent rate filtering on Truckstop.com and DAT.com.

---

## ✨ Features

### 📧 One-Click Email
- Send emails instantly to three pre-configured addresses:
  - **Main Account**: aminpanshiri1@gmail.com
  - **FreightWiz**: info@freightwiz.us
  - **General Freight**: info@generalfreightinc.com
- Auto-populated subject with origin and destination
- Professional email template asking about load details
- Integrated Gmail API for seamless sending

### 🎨 Rate Color Filter
- Automatically color-codes rates based on rate per mile:
  - 🔴 **< $1.50/mi**: Red (Low)
  - 🟠 **$1.50-$2.00/mi**: Orange (Below Average)
  - 🟡 **$2.00-$2.50/mi**: Yellow (Average)
  - 🟢 **$2.50-$3.00/mi**: Light Green (Good)
  - 💚 **> $3.00/mi**: Green (Excellent)

### 🗺️ Route Mapping
- View Google Maps route between origin and destination
- Calculate distance and visualize the journey
- One-click access to full route details

### 🔄 Real-Time Data Extraction
- Automatically scrapes load information from both platforms
- Detects origin, destination, distance, rate, and rate per mile
- Updates in real-time as you browse loads

---

## 📦 Installation

### Step 1: Enable Developer Mode
1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **Developer mode** (top right corner)

### Step 2: Load the Extension
1. Click **"Load unpacked"**
2. Navigate to the `/app/extension/` folder
3. Select the folder and click **"Select Folder"**
4. The extension should now appear in your extensions list

### Step 3: Pin the Extension
1. Click the puzzle icon in the Chrome toolbar
2. Find "Freight Connect Pro"
3. Click the pin icon to keep it visible

---

## 🔐 Gmail API Setup

The extension uses Gmail API to send emails. Authentication is required:

### First-Time Setup
1. Click the extension icon
2. Click **"Sign in with Gmail"** in the Settings section
3. Select your Google account
4. Grant the requested permissions:
   - Send emails on your behalf
   - View your email address
5. You're all set! The extension will remember your authentication

### OAuth Configuration
The extension is pre-configured with OAuth credentials:
- **Client ID**: 664028684698-84fh76j3nprond26ofk2tmmrncgcsc1t.apps.googleusercontent.com
- **Project**: load-board-helper

---

## 🚀 How to Use

### On Truckstop.com or DAT.com:

1. **Browse Loads**
   - Navigate to the load board as usual
   - The extension automatically detects and extracts load data

2. **View Load Details**
   - Click the extension icon
   - See extracted origin, destination, distance, rate, and rate per mile

3. **Send Quick Email**
   - Choose one of the three email buttons
   - Email is sent instantly with all load details
   - Subject line: "Load Inquiry: [Origin] to [Destination]"

4. **View Route**
   - Click "Show Route" button
   - Interactive Google Maps opens with the route

5. **Toggle Color Filter**
   - Check/uncheck "Color Filter" in settings
   - Rates on the page will be color-coded by rate per mile

---

## 📧 Email Template

Emails are automatically generated with this format:

```
Hello,

I saw your load from [Origin] to [Destination]. Could you please provide more details about the rate and availability?

Load Details:
- Origin: [Origin City, State]
- Destination: [Destination City, State]
- Distance: [Distance] miles
- Rate: $[Rate]
- Rate per Mile: $[Rate/Mile]/mi

Please let me know if this load is still available and if you need any additional information.

Thank you,
[Your Email]
```

---

## 🎯 Supported Websites

- ✅ **Truckstop.com** (all subdomains)
- ✅ **DAT.com** (including one.dat.com)

---

## 🛠️ Technical Details

### Architecture
- **Manifest Version**: 3 (Latest Chrome Extension standard)
- **Content Scripts**: Inject into Truckstop and DAT pages
- **Service Worker**: Handles Gmail API authentication and requests
- **Popup UI**: User interface for controls and settings

### Permissions
- `identity`: For Gmail OAuth authentication
- `storage`: To save settings and load data
- `activeTab`: To interact with current tab
- `scripting`: To inject content scripts

### APIs Used
- **Gmail API**: For sending emails
- **Google Maps Embed API**: For route visualization
- **Chrome Identity API**: For OAuth authentication

---

## 🐛 Troubleshooting

### Extension Not Working
1. Refresh the load board page
2. Click the extension icon and hit "Refresh Data"
3. Check that you're on Truckstop.com or DAT.com

### Email Not Sending
1. Ensure you're signed in (check "Auth Status" in settings)
2. Click "Sign in with Gmail" if not authenticated
3. Check browser console for errors (F12)

### Color Filter Not Appearing
1. Toggle the "Color Filter" checkbox
2. Refresh the page
3. Ensure loads are visible on the page

### Data Not Extracting
1. The websites may have changed their layout
2. Click "Refresh Data" button
3. Try selecting/clicking on a load first

---

## 🔄 Version History

### v1.0.0 (Current)
- ✅ Initial release
- ✅ Three email templates
- ✅ Gmail API integration
- ✅ Rate color filtering
- ✅ Google Maps route display
- ✅ Support for Truckstop and DAT
- ✅ Real-time data extraction

---

## 📝 Notes

- The extension requires an active internet connection
- Gmail authentication persists across browser sessions
- Color filters apply automatically when enabled
- Load data updates as you navigate

---

## 🤝 Support

For issues or feature requests:
1. Check the troubleshooting section above
2. Ensure you're using the latest version of Chrome
3. Try disabling and re-enabling the extension

---

## 📄 License

Private use - Freight Connect Pro

---

**Built for freight professionals who value efficiency** 🚛💨