// Get user's browser language for Google Translate
const getUserTranslateLang = () => {
    const userLang = chrome.i18n.getUILanguage();
    return userLang.toLowerCase();
};

// Check if a URL is a Google Translate URL
const isGoogleTranslateUrl = (url) => {
    return url && url.includes('translate.google.com');
};

// Get the user's preferred Google Translate URL
const getUserGoogleTranslateUrl = () => {
    const targetLang = getUserTranslateLang();
    return `https://translate.google.com/?sl=auto&tl=${targetLang}&text=%s`;
};

// Detect user's browser language and update Google Translate option
const updateGoogleTranslateOption = () => {
    const serviceSelect = document.getElementById('serviceProvider');
    const translateOption = Array.from(serviceSelect.options).find(
        opt => opt.textContent.includes('Google Translate')
    );
    
    if (translateOption) {
        translateOption.value = getUserGoogleTranslateUrl();
    }
};

// Saves options systematically on any change
const saveOptions = () => {
    const openMode = document.querySelector('input[name="openMode"]:checked').value;
    const splitRatio = document.getElementById('splitRatio').value;
    const serviceProvider = document.getElementById('serviceProvider').value;
    
    // Ignore 'custom' value for saving if it's currently selected (user is adding new one)
    // We only save valid URLs. If "Add Custom Site..." is selected, we don't overwrite the valid saved provider 
    // UNLESS we want to force them to pick one. 
    // Actually, let's allow saving, but if it is 'custom', we might handle it differently?
    // For now, let's just save. If they leave it on 'Add Custom Site...', the background script treats it as void or default.
    // Better: If 'custom', don't save serviceProvider yet.
    
    const settings = {
        openMode: openMode,
        splitRatio: splitRatio
    };
    
    // Toggle visibility immediately based on selection
    toggleRatioVisibility(openMode);
    
    if (serviceProvider !== 'custom') {
        settings.serviceProvider = serviceProvider;
    }

    chrome.storage.sync.set(settings, () => {
        const status = document.getElementById('status');
        status.textContent = "Saved";
        setTimeout(() => {
          status.textContent = "";
        }, 1500);
    });
};

const restoreOptions = () => {
    chrome.storage.sync.get(
      { 
        openMode: 'split',
        splitRatio: 50,
        serviceProvider: 'https://www.google.com/search?q=%s',
        customSites: []
      }, 
      (items) => {
        // Open Mode
        const radios = document.getElementsByName('openMode');
        for (const radio of radios) {
            if (radio.value === items.openMode) {
                radio.checked = true;
            }
        }

        // Split Ratio
        const ratioSlider = document.getElementById('splitRatio');
        ratioSlider.value = items.splitRatio;
        updateRatioDisplay(items.splitRatio);

        // Populate Service Provider
        const serviceSelect = document.getElementById('serviceProvider');
        
        if (items.customSites && items.customSites.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- User Added ---';
            // Insert before the last option (which is "Add Custom Site...")
            const lastOption = serviceSelect.lastElementChild;
            serviceSelect.insertBefore(separator, lastOption);

            items.customSites.forEach(site => {
                const option = document.createElement('option');
                option.value = site.url;
                option.textContent = site.name;
                serviceSelect.insertBefore(option, lastOption);
            });
        }

        // Set value
        if (items.serviceProvider) {
            // If saved provider is Google Translate, use the user's language version
            let providerToSet = items.serviceProvider;
            if (isGoogleTranslateUrl(providerToSet)) {
                providerToSet = getUserGoogleTranslateUrl();
            }
            serviceSelect.value = providerToSet;
        }
        
        toggleCustomUrl(serviceSelect.value);
        
        // Set initial visibility of ratio section based on saved mode
        toggleRatioVisibility(items.openMode);
      }
    );
};

const addCustomSite = () => {
    const name = document.getElementById('newSiteName').value.trim();
    const url = document.getElementById('newSiteUrl').value.trim();
    
    if (!name) {
        showStatus('Enter a site name', 'red');
        return;
    }
    if (!url || !url.includes('%s')) {
        showStatus('URL needs "%s"', 'red');
        return;
    }

    chrome.storage.sync.get({ customSites: [] }, (items) => {
        const sites = items.customSites;
        sites.push({ name, url });
        
        // Save new site AND set it as current provider
        chrome.storage.sync.set({ 
            customSites: sites,
            serviceProvider: url 
        }, () => {
            // Reload to update list
            location.reload();
        });
    });
};

const updateRatioDisplay = (val) => {
    document.getElementById('ratio-display').textContent = val + "%";
};

const toggleCustomUrl = (val) => {
    const customGroup = document.getElementById('custom-url-group');
    if (val === 'custom') {
        customGroup.style.display = 'block';
    } else {
        customGroup.style.display = 'none';
    }
};

const showStatus = (msg, color='green') => {
    const status = document.getElementById('status');
    status.textContent = msg;
    status.style.color = color;
    setTimeout(() => {
        status.textContent = "";
    }, 2000);
}

document.addEventListener('DOMContentLoaded', () => {
    updateGoogleTranslateOption();
    restoreOptions();
    
    // Event Listeners
    document.querySelectorAll('input[name="openMode"]').forEach(radio => {
        radio.addEventListener('change', saveOptions);
    });
    
    document.getElementById('splitRatio').addEventListener('input', (e) => {
        updateRatioDisplay(e.target.value);
        saveOptions();
    });

    document.getElementById('serviceProvider').addEventListener('change', (e) => {
        toggleCustomUrl(e.target.value);
        saveOptions();
    });
    
    document.getElementById('addCustomSite').addEventListener('click', addCustomSite);
    
    // Initial check for ratio visibility
    const currentMode = document.querySelector('input[name="openMode"]:checked')?.value;
    toggleRatioVisibility(currentMode);
});

const toggleRatioVisibility = (mode) => {
    const ratioGroup = document.getElementById('ratio-group');
    if (ratioGroup) {
        if (mode === 'split') {
            ratioGroup.style.display = 'block';
        } else {
            ratioGroup.style.display = 'none';
        }
    }
};

// Listen for external storage changes (e.g. changed in side panel)
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'sync' && changes.splitRatio) {
        const newVal = changes.splitRatio.newValue;
        const slider = document.getElementById('splitRatio');
        if (slider) {
            slider.value = newVal;
            updateRatioDisplay(newVal);
        }
    }
});
