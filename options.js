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
        console.log('Updated Google Translate to target language:', getUserTranslateLang());
    }
};

// Saves options to chrome.storage
const saveOptions = () => {
    const openMode = document.querySelector('input[name="openMode"]:checked').value;
    const splitRatio = document.getElementById('splitRatio').value;
    const serviceProvider = document.getElementById('serviceProvider').value;
    // We don't strictly need to save a separate 'customUrl' unless the user selected the "custom" option.
    // However, to keep backward compatibility or simple logic, we can leave it or ignore it if not 'custom'.
    
    // Check if 'custom' is selected for backward compatibility or direct entry
    let customUrl = '';
    // If the user selected the legacy "custom" option (if we kept it)
    if (serviceProvider === 'custom') {
         // We might not have the old input anymore if I replaced it in HTML.
         // Let's check if the old input exists, otherwise ignore.
         const oldInput = document.getElementById('customUrl');
         if (oldInput) customUrl = oldInput.value;
    }
  
    chrome.storage.sync.set(
      {
        openMode: openMode,
        splitRatio: splitRatio, // Store as integer 20-80
        serviceProvider: serviceProvider,
        customUrl: customUrl
      },
      () => {
        // Update status to let user know options were saved.
        const status = document.getElementById('status');
        status.textContent = "Options saved.";
        status.style.color = "green";
        status.style.opacity = '1';
        setTimeout(() => {
          status.style.opacity = '0';
        }, 2000);
      }
    );
  };
  
  // Restores select box and checkbox state using the preferences
  // stored in chrome.storage.
  const restoreOptions = () => {
    chrome.storage.sync.get(
      { 
        openMode: 'split',
        splitRatio: 50,
        serviceProvider: 'https://www.google.com/search?q=%s',
        customUrl: '',
        customSites: [] // Default empty array for new custom sites
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

        // Populate Service Provider Dropdown with Custom Sites
        const serviceSelect = document.getElementById('serviceProvider');
        
        // Remove existing custom added options first (if any re-run) - though usually this runs once.
        // We will append user's custom sites before the "Custom..." option or at the end.
        if (items.customSites && items.customSites.length > 0) {
            const separator = document.createElement('option');
            separator.disabled = true;
            separator.textContent = '--- User Added ---';
            serviceSelect.appendChild(separator);

            items.customSites.forEach(site => {
                const option = document.createElement('option');
                option.value = site.url;
                option.textContent = site.name;
                serviceSelect.appendChild(option);
            });
            
            // Render custom sites list for management
            renderCustomSitesList(items.customSites);
        }

        // Select the saved value
        // If saved provider is Google Translate, use the user's language version
        let providerToSet = items.serviceProvider;
        if (isGoogleTranslateUrl(providerToSet)) {
            providerToSet = getUserGoogleTranslateUrl();
        }
        serviceSelect.value = providerToSet;
        
        // Handle the "Add New Custom Site" UI toggling
        toggleCustomUrl(items.serviceProvider);
        
        // Set initial visibility of ratio section based on saved mode
        toggleRatioVisibility(items.openMode);
      }
    );
  };

  const addCustomSite = () => {
      const name = document.getElementById('newSiteName').value.trim();
      const url = document.getElementById('newSiteUrl').value.trim();
      
      if (!name) {
          alert('Please enter a site name.');
          return;
      }
      if (!url) {
          alert('Please enter a valid URL.');
          return;
      }

      chrome.storage.sync.get({ customSites: [] }, (items) => {
          const sites = items.customSites;
          sites.push({ name, url });
          
          chrome.storage.sync.set({ customSites: sites }, () => {
              // Reload options to refresh the dropdown
              const status = document.getElementById('status');
              status.textContent = "Site added! Page reloading...";
              status.style.opacity = '1';
              setTimeout(() => {
                  location.reload();
              }, 1000);
          });
      });
  };

  // Render custom sites list with delete buttons
  const renderCustomSitesList = (sites) => {
      const listContainer = document.getElementById('custom-sites-list');
      if (!listContainer) return;
      
      listContainer.innerHTML = '';
      
      if (sites.length === 0) return;
      
      const title = document.createElement('div');
      title.className = 'section-title';
      title.textContent = 'Manage Custom Sites';
      listContainer.appendChild(title);
      
      sites.forEach((site, index) => {
          const item = document.createElement('div');
          item.className = 'custom-site-item';
          
          const nameSpan = document.createElement('span');
          nameSpan.className = 'site-name';
          nameSpan.textContent = site.name;
          nameSpan.title = site.url;
          
          const deleteBtn = document.createElement('button');
          deleteBtn.className = 'delete-site-btn';
          deleteBtn.textContent = 'Delete';
          deleteBtn.type = 'button';
          deleteBtn.addEventListener('click', () => deleteCustomSite(index));
          
          item.appendChild(nameSpan);
          item.appendChild(deleteBtn);
          listContainer.appendChild(item);
      });
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
              const status = document.getElementById('status');
              status.textContent = "Site deleted! Page reloading...";
              status.style.opacity = '1';
              // Reload to refresh the dropdown
              setTimeout(() => location.reload(), 500);
          });
      });
  };

  const updateRatioDisplay = (val) => {
      document.getElementById('ratio-display').textContent = val + "%";
  };

  const toggleCustomUrl = (val) => {
      const customGroup = document.getElementById('custom-url-group');
      if (val === 'custom') {
        // This 'custom' value is from the original <option value="custom">Custom...</option>
        // But in my new UI in options.html, I re-purposed the #custom-url-group to be the "Add New Site" area.
        // Wait, the prompt says "User can add website to drop-down".
        // It simplifies things if the "Add Custom Site" area represents a generic "Manage/Add" area 
        // OR we can make it always visible or visible only when selecting "Custom...".
        // Let's make it always visible for better UX, or maybe add a specific "Add New..." option?
        // Let's stick to the previous pattern: 
        // If the user selects "Custom...", we show the input. 
        // BUT the user wants to ADD to the dropdown.
        // So let's change the pattern: The "Add New Custom Site" section should be always visible OR inside a collapsible details/summary details? 
        // The previous HTML change put it inside #custom-url-group which is hidden unless val === 'custom'.
        // That might be confusing if they want to add a site but use a standard one for now.
        // Let's change the logic: The #custom-url-group currently contains the "Add New" inputs detailed in the previous step.
        // I should probably make that section visible when a specific Action is taken, or just leave it visible at the bottom of the page?
        // For now, let's make it visible when the user selects "Custom..." so they can add it? 
        // No, "Custom..." suggests a temporary or one-off custom URL.
        // "Add to drop-down" suggests persistent storage.
        
        // Let's modify the behavior:
        // Show the "Add New Custom Site" box when 'custom' is selected?
        // Or better, let's NOT hide it based on selection, but maybe make it a separate section?
        // The current HTML has it inside #custom-url-group. 
        // Let's force it to be displayed if val === 'custom', matching existing logic. 
        // If the user selects "Custom...", they see the form to ADD a new site to the list.
        customGroup.style.display = 'block';
      } else {
          customGroup.style.display = 'none';
      }
  };
  
  document.addEventListener('DOMContentLoaded', () => {
      updateGoogleTranslateOption(); // Update translate language first
      restoreOptions(); // Then restore saved settings
  });
  document.getElementById('save').addEventListener('click', saveOptions);
  
  // Event Listeners for UI interaction
  document.getElementById('splitRatio').addEventListener('input', (e) => {
      updateRatioDisplay(e.target.value);
  });

  document.getElementById('serviceProvider').addEventListener('change', (e) => {
      toggleCustomUrl(e.target.value);
  });
  
  // Add listener for the new button
  const addButton = document.getElementById('addCustomSite');
  if (addButton) {
      addButton.addEventListener('click', addCustomSite);
  }
  
  // Add listeners to radios for visibility toggle
  const radios = document.getElementsByName('openMode');
  for (const radio of radios) {
      radio.addEventListener('change', (e) => {
          toggleRatioVisibility(e.target.value);
          // Note: Auto-save on change is not implemented here
          // The existing code uses a separate 'Save Settings' button (id="save")
      });
  }

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
