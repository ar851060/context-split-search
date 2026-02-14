// ============================================
// Dynamic Rules Management
// ============================================

// Extract domain from URL (e.g., "https://translate.google.com/..." -> "translate.google.com")
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (e) {
        return null;
    }
}

// Create a rule for a specific domain to allow iframe embedding
function createRuleForDomain(ruleId, domain) {
    return {
        id: ruleId,
        priority: 1,
        action: {
            type: "modifyHeaders",
            requestHeaders: [
                { header: "referer", operation: "remove" },
                { header: "origin", operation: "remove" },
                { header: "sec-fetch-dest", operation: "set", value: "document" },
                { header: "sec-fetch-mode", operation: "set", value: "navigate" },
                { header: "sec-fetch-site", operation: "set", value: "none" },
                { header: "sec-fetch-user", operation: "set", value: "?1" }
            ],
            responseHeaders: [
                { header: "x-frame-options", operation: "remove" },
                { header: "content-security-policy", operation: "remove" }
            ]
        },
        condition: {
            resourceTypes: ["sub_frame"],
            urlFilter: `||${domain}`
        }
    };
}

// Update dynamic rules based on current service provider
async function updateDynamicRules() {
    try {
        // Get current settings
        const items = await chrome.storage.sync.get({
            serviceProvider: 'https://www.google.com/search?q=%s',
            customSites: []
        });

        // Default service providers (from popup.html)
        const defaultProviders = [
            'https://www.google.com/search?q=%s',
            'https://www.google.com/maps/search/?api=1&query=%s',
            'https://translate.google.com/?sl=auto&tl=en&text=%s',
            'https://www.bing.com/search?q=%s',
            'https://duckduckgo.com/?ia=web&q=%s',
            'https://finance.yahoo.com/quote/%s',
            'https://felo.ai/search?q=%s',
            'https://www.perplexity.ai/?q=%s'
        ];

        // Collect all domains that need rules
        const domains = new Set();

        // Add all default provider domains
        defaultProviders.forEach(url => {
            const domain = extractDomain(url);
            if (domain) {
                domains.add(domain);
            }
        });

        // Add current service provider domain (in case it's custom)
        const currentDomain = extractDomain(items.serviceProvider);
        if (currentDomain) {
            domains.add(currentDomain);
        }


        // Add all custom sites domains
        if (items.customSites && items.customSites.length > 0) {
            items.customSites.forEach(site => {
                const domain = extractDomain(site.url);
                if (domain) {
                    domains.add(domain);
                }
            });
        }

        // Get existing dynamic rules
        const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
        const existingRuleIds = existingRules.map(r => r.id);

        // Remove all existing dynamic rules
        if (existingRuleIds.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                removeRuleIds: existingRuleIds
            });
        }

        // Add new rules for each domain
        const newRules = [];
        let ruleId = 1;
        domains.forEach(domain => {
            newRules.push(createRuleForDomain(ruleId++, domain));
        });

        if (newRules.length > 0) {
            await chrome.declarativeNetRequest.updateDynamicRules({
                addRules: newRules
            });
        }

        console.log('[Context Split Search] Dynamic rules updated for domains:', Array.from(domains));
    } catch (error) {
        console.error('[Context Split Search] Error updating dynamic rules:', error);
    }
}

// Listen for storage changes to update rules when settings change
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync') {
        if (changes.serviceProvider || changes.customSites) {
            updateDynamicRules();
        }
    }
});

// ============================================
// Language Detection for AI Search Engines
// ============================================

// Map browser language codes to human-readable language names
function getLanguageName(langCode) {
    const langMap = {
        'zh-tw': '繁體中文',
        'zh-hk': '繁體中文',
        'zh-cn': '簡體中文',
        'zh': '中文',
        'en': 'English',
        'en-us': 'English',
        'en-gb': 'English',
        'ja': '日本語',
        'ko': '한국어',
        'fr': 'Français',
        'de': 'Deutsch',
        'es': 'Español',
        'pt': 'Português',
        'it': 'Italiano',
        'ru': 'Русский',
        'ar': 'العربية',
        'th': 'ภาษาไทย',
        'vi': 'Tiếng Việt',
        'id': 'Bahasa Indonesia',
        'ms': 'Bahasa Melayu',
        'nl': 'Nederlands',
        'pl': 'Polski',
        'tr': 'Türkçe',
        'uk': 'Українська',
        'sv': 'Svenska',
        'da': 'Dansk',
        'fi': 'Suomi',
        'no': 'Norsk',
        'hi': 'हिन्दी'
    };
    const code = langCode.toLowerCase();
    return langMap[code] || langMap[code.split('-')[0]] || langCode;
}

// Check if a URL pattern is for Felo or Perplexity
function isAISearchEngine(urlPattern) {
    return urlPattern.includes('felo.ai') || urlPattern.includes('perplexity.ai');
}

// ============================================
// Context Menu and Main Logic
// ============================================

// Create the context menu item on installation
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "search-in-google-maps",
      title: "Search in Split View",
      contexts: ["selection"]
    });
    
    // Initialize dynamic rules on install
    updateDynamicRules();
});

  
// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "search-in-google-maps" && info.selectionText) {
      let searchText = info.selectionText;
      
      // Use .get() with callback to stay synchronous in user gesture context
      chrome.storage.sync.get({ 
          openMode: 'split',
          splitRatio: 50,
          serviceProvider: 'https://www.google.com/search?q=%s',
          customUrl: ''
      }, (items) => {
          
        let targetUrlPattern = items.serviceProvider;
        if (items.serviceProvider === 'custom') {
            targetUrlPattern = items.customUrl;
        }

        if (!targetUrlPattern) {
            targetUrlPattern = 'https://www.google.com/maps/search/?api=1&query=%s';
        }

        // For Felo and Perplexity, append language instruction
        if (isAISearchEngine(targetUrlPattern)) {
            const browserLang = chrome.i18n.getUILanguage();
            const langName = getLanguageName(browserLang);
            searchText = searchText + ` 請用${langName}來回答`;
        }

        const query = encodeURIComponent(searchText);

        let finalUrl;
        if (targetUrlPattern.includes('%s')) {
            finalUrl = targetUrlPattern.replace('%s', query);
        } else {
            finalUrl = targetUrlPattern;
        }

        if (items.openMode === 'tab') {
          chrome.tabs.create({ url: finalUrl });
        } else if (items.openMode === 'sidePanel') {
          handleSidePanel(tab, finalUrl);
        } else {
          handleSplitScreen(tab, finalUrl, items.splitRatio);
        }
      });
    }
});

function handleSidePanel(tab, url) {
    if (!tab.windowId) return;

    // Open the Side Panel synchronously (must be in user gesture)
    chrome.sidePanel.open({ windowId: tab.windowId });

    // Send message after a brief delay to ensure panel is loaded
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: "loadUrl", url: url }).catch(() => {
            // Silently ignore if panel isn't ready yet
        });
    }, 300);
}

function handleSplitScreen(currentTab, targetUrl, splitPercentage) {
    if (!currentTab || !currentTab.windowId) return;

    // Check for existing secondary window
    chrome.storage.local.get(['secondaryWindowId'], (result) => {
        const existingWinId = result.secondaryWindowId;

        if (existingWinId) {
            chrome.windows.get(existingWinId, (win) => {
                if (chrome.runtime.lastError || !win) {
                    // Window doesn't exist anymore, clean up and create new
                    chrome.storage.local.remove('secondaryWindowId');
                    createNewSplit(currentTab, targetUrl, splitPercentage);
                } else {
                    // Window exists, update the tab inside it
                    // We need to find the tab in this window
                    chrome.tabs.query({ windowId: existingWinId }, (tabs) => {
                        if (tabs && tabs.length > 0) {
                            chrome.tabs.update(tabs[0].id, { url: targetUrl });
                            // Optionally bring focus to it? or keep focus on main? 
                            // Usually split screen implies viewing both. 
                            // Let's update the main window size again just in case the user maximized it? 
                            // No, let's respect user's manual resizing if they did it.
                            // The request just says "don't pop up a 3rd window".
                        } else {
                            // Empty window? rare.
                            chrome.windows.update(existingWinId, { url: targetUrl });
                        }
                    });
                }
            });
        } else {
            createNewSplit(currentTab, targetUrl, splitPercentage);
        }
    });
}

function createNewSplit(currentTab, targetUrl, splitPercentage) {
    chrome.windows.get(currentTab.windowId, (currentWindow) => {
      if (chrome.runtime.lastError || !currentWindow) return;
  
      const screenWidth = currentWindow.width;
      const validRatio = Math.max(20, Math.min(80, splitPercentage)) / 100;
      
      const newMainWidth = Math.floor(screenWidth * validRatio);
      const popupWidth = screenWidth - newMainWidth;
      const top = currentWindow.top;
      const left = currentWindow.left;
  
      chrome.windows.update(currentWindow.id, {
        width: newMainWidth,
        left: left,
        top: top,
        state: 'normal'
      });
  
      chrome.windows.create({
        url: targetUrl,
        type: 'popup', 
        width: popupWidth,
        height: currentWindow.height,
        left: left + newMainWidth,
        top: top
      }, (newWindow) => {
          if (newWindow) {
              chrome.storage.local.set({ secondaryWindowId: newWindow.id });
          }
      });
    });
}
