# Context Split Search

A Chrome extension that lets you search selected text in Side Panel, Split Screen, or a New Tab with your favorite search services.

![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue)

## Features

- 🔍 **Quick Search** - Right-click any selected text to search instantly
- 📑 **Multiple View Modes**
  - **Side Panel** - Search results appear in the browser's side panel
  - **Split Screen** - Resize your window and open search in a side-by-side popup
  - **New Tab** - Open search results in a new browser tab
- ⚙️ **Adjustable Split Ratio** - Customize the split screen width (20%-80%)
- 🌐 **Multiple Search Providers**
  - Google Search
  - Google Maps
  - Google Translate (auto-detects your browser language)
  - Bing Search
  - DuckDuckGo
  - Yahoo Finance
  - Felo AI
- ➕ **Custom Sites** - Add your own search URLs with `%s` placeholder

## Installation

### From Chrome Web Store
*(Coming soon)*

### Manual Installation (Developer Mode)
1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** (toggle in top right)
4. Click **Load unpacked**
5. Select the `context-split-search` folder

## Usage

1. **Select text** on any webpage
2. **Right-click** to open the context menu
3. Click **"Search in Split View"**
4. Results will open based on your selected mode (Side Panel/Split Screen/New Tab)

### Changing Settings
Click the extension icon in your toolbar to:
- Switch between view modes
- Adjust split screen ratio
- Change search provider
- Add custom search sites

## Adding Custom Sites

1. Click the extension icon
2. Select "Add Custom Site..." from the dropdown
3. Enter a name (e.g., "Wikipedia")
4. Enter the URL with `%s` as the search query placeholder
   - Example: `https://en.wikipedia.org/wiki/%s`
5. Click "Add to List"

## Technical Details

### Permissions Used
| Permission | Purpose |
|------------|---------|
| `contextMenus` | Right-click menu integration |
| `storage` | Save user preferences |
| `sidePanel` | Side panel functionality |
| `declarativeNetRequest` | Enable iframe embedding for search services |
| `host_permissions` | Modify HTTP headers for iframe compatibility |

### Dynamic Rules
This extension uses dynamic `declarativeNetRequest` rules to enable iframe embedding only for configured search services, minimizing impact on other websites.

## File Structure

```
context-split-search/
├── manifest.json       # Extension configuration
├── background.js       # Service worker & dynamic rules
├── popup.html/js       # Extension popup UI
├── sidepanel.html/js   # Side panel iframe container
├── options.html/js     # Options page
├── images/             # Extension icons
└── rules.json          # (Empty - using dynamic rules)
```

## Privacy

This extension:
- ✅ Does NOT collect any personal data
- ✅ Does NOT track your browsing history
- ✅ Only activates when you use the context menu
- ✅ All settings are stored locally in your browser

## License

MIT License - Feel free to use and modify.

## Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you would like to change.
