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

// Default options for the dropdown
const defaultOptions = [
    { value: 'https://www.google.com/search?q=%s', text: 'Google Search (Default)', isCustom: false },
    { value: 'https://www.google.com/maps/search/?api=1&query=%s', text: 'Google Maps', isCustom: false },
    { value: 'https://translate.google.com/?sl=auto&tl=en&text=%s', text: 'Google Translate (Auto -> your language)', isCustom: false },
    { value: 'https://felo.ai/search?q=%s', text: 'Felo', isCustom: false },
    { value: 'custom', text: '+ Add Custom Site...', isCustom: false }
];

// Build and render the custom dropdown
const buildDropdown = (customSites, selectedValue) => {
    const optionsContainer = document.getElementById('dropdownOptions');
    const selectedDisplay = document.getElementById('dropdownSelected');
    const hiddenInput = document.getElementById('serviceProvider');
    
    // Ensure customSites is always an array
    const sites = customSites || [];
    
    optionsContainer.innerHTML = '';
    
    // Update Google Translate URL with user's language
    const options = defaultOptions.map(opt => {
        if (opt.text.includes('Google Translate')) {
            return { ...opt, value: getUserGoogleTranslateUrl() };
        }
        return opt;
    });
    
    // Add default options
    options.forEach(opt => {
        const optionEl = createDropdownOption(opt.value, opt.text, false, null);
        optionsContainer.appendChild(optionEl);
    });
    
    // Add custom sites if any
    if (sites.length > 0) {
        // Add separator before custom sites
        const separator = document.createElement('div');
        separator.className = 'dropdown-separator';
        separator.textContent = 'Custom Sites';
        
        // Insert separator before the last option (Add Custom Site...)
        const lastOption = optionsContainer.lastChild;
        optionsContainer.insertBefore(separator, lastOption);
        
        // Add custom site options
        sites.forEach((site, index) => {
            const optionEl = createDropdownOption(site.url, site.name, true, index);
            optionsContainer.insertBefore(optionEl, lastOption);
        });
    }
    
    // Set selected value
    let displayText = 'Google Search (Default)';
    let providerToSet = selectedValue || 'https://www.google.com/search?q=%s';
    
    // If Google Translate, use user's language version
    if (isGoogleTranslateUrl(selectedValue)) {
        providerToSet = getUserGoogleTranslateUrl();
    }
    
    // Find matching option text
    const allOptions = options.slice(); // Create a copy
    sites.forEach(site => {
        allOptions.push({ value: site.url, text: site.name, isCustom: true });
    });
    
    const matchingOption = allOptions.find(opt => opt.value === providerToSet);
    if (matchingOption) {
        displayText = matchingOption.text;
    }
    
    selectedDisplay.textContent = displayText;
    hiddenInput.value = providerToSet;
    
    // Mark selected option
    updateSelectedOption(providerToSet);
};

// Create a dropdown option element
const createDropdownOption = (value, text, isCustom, customIndex) => {
    const optionEl = document.createElement('div');
    optionEl.className = 'dropdown-option';
    optionEl.dataset.value = value;
    
    const textSpan = document.createElement('span');
    textSpan.className = 'option-text';
    textSpan.textContent = text;
    optionEl.appendChild(textSpan);
    
    // Add delete button for custom sites
    if (isCustom && customIndex !== null) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '❌';
        deleteBtn.title = 'Remove this site';
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent option selection
            deleteCustomSite(customIndex);
        });
        optionEl.appendChild(deleteBtn);
    }
    
    // Click to select option
    optionEl.addEventListener('click', () => {
        selectOption(value, text);
    });
    
    return optionEl;
};

// Select an option
const selectOption = (value, text) => {
    const selectedDisplay = document.getElementById('dropdownSelected');
    const hiddenInput = document.getElementById('serviceProvider');
    const optionsContainer = document.getElementById('dropdownOptions');
    
    selectedDisplay.textContent = text;
    hiddenInput.value = value;
    
    // Close dropdown
    optionsContainer.classList.remove('show');
    selectedDisplay.classList.remove('open');
    
    // Update selected state
    updateSelectedOption(value);
    
    // Toggle custom URL group
    toggleCustomUrl(value);
    
    // Save options
    saveOptions();
};

// Update visual selected state
const updateSelectedOption = (value) => {
    const options = document.querySelectorAll('.dropdown-option');
    options.forEach(opt => {
        if (opt.dataset.value === value) {
            opt.classList.add('selected');
        } else {
            opt.classList.remove('selected');
        }
    });
};

// Toggle dropdown open/close
const toggleDropdown = () => {
    const optionsContainer = document.getElementById('dropdownOptions');
    const selectedDisplay = document.getElementById('dropdownSelected');
    
    optionsContainer.classList.toggle('show');
    selectedDisplay.classList.toggle('open');
};

// Saves options systematically on any change
const saveOptions = () => {
    const openMode = document.querySelector('input[name="openMode"]:checked').value;
    const splitRatio = document.getElementById('splitRatio').value;
    const serviceProvider = document.getElementById('serviceProvider').value;
    
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

        // Build and populate custom dropdown
        buildDropdown(items.customSites, items.serviceProvider);
        
        // Toggle custom URL group visibility
        toggleCustomUrl(items.serviceProvider);
        
        // Set initial visibility of ratio section based on saved mode
        toggleRatioVisibility(items.openMode);
      }
    );
};

// Delete a custom site by index
const deleteCustomSite = (index) => {
    chrome.storage.sync.get({ customSites: [], serviceProvider: '' }, (items) => {
        const sites = items.customSites;
        const deletedSite = sites[index];
        
        // Remove the site
        sites.splice(index, 1);
        
        // If the deleted site was the current provider, reset to default
        const settings = { customSites: sites };
        if (deletedSite && items.serviceProvider === deletedSite.url) {
            settings.serviceProvider = 'https://www.google.com/search?q=%s';
        }
        
        chrome.storage.sync.set(settings, () => {
            showStatus('Site deleted', 'green');
            // Reload to refresh the dropdown
            setTimeout(() => location.reload(), 500);
        });
    });
};

const addCustomSite = () => {
    const name = document.getElementById('newSiteName').value.trim();
    const url = document.getElementById('newSiteUrl').value.trim();
    
    if (!name) {
        showStatus('Enter a site name', 'red');
        return;
    }
    if (!url) {
        showStatus('Enter a URL', 'red');
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
    restoreOptions();
    
    // Custom dropdown toggle
    document.getElementById('dropdownSelected').addEventListener('click', toggleDropdown);
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        const dropdown = document.getElementById('serviceDropdown');
        if (!dropdown.contains(e.target)) {
            document.getElementById('dropdownOptions').classList.remove('show');
            document.getElementById('dropdownSelected').classList.remove('open');
        }
    });
    
    // Event Listeners
    document.querySelectorAll('input[name="openMode"]').forEach(radio => {
        radio.addEventListener('change', saveOptions);
    });
    
    document.getElementById('splitRatio').addEventListener('input', (e) => {
        updateRatioDisplay(e.target.value);
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
