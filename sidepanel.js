chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "loadUrl" && request.url) {
        const contentFrame = document.getElementById("content-frame");
        if (contentFrame) {
            contentFrame.src = request.url;
        }
    }
});

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize and handle Split Ratio
    const ratioSlider = document.getElementById('splitRatio');
    const ratioDisplay = document.getElementById('ratio-display');

    if (!ratioSlider || !ratioDisplay) {
        return; // Elements not found, skip initialization
    }

    const updateDisplay = (val) => {
        ratioDisplay.textContent = val + "%";
    };

    // 1. Load initial value
    chrome.storage.sync.get({ splitRatio: 50 }, (items) => {
        ratioSlider.value = items.splitRatio;
        updateDisplay(items.splitRatio);
    });

    // 2. Save on change
    ratioSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        updateDisplay(val);
        chrome.storage.sync.set({ splitRatio: val });
    });

    // 3. Listen for changes from other parts (popup/options)
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === 'sync' && changes.splitRatio) {
            const newValue = changes.splitRatio.newValue;
            ratioSlider.value = newValue;
            updateDisplay(newValue);
        }
    });
});
