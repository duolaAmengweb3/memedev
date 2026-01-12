// Content script for Four.meme pages
// Detects token address from URL and notifies the extension

const TOKEN_URL_PATTERN = /^https:\/\/four\.meme\/[\w-]*\/?token\/(0x[a-fA-F0-9]{40})/i;

function extractTokenAddress(url: string): string | null {
  const match = url.match(TOKEN_URL_PATTERN);
  return match ? match[1] : null;
}

// Check if extension context is still valid
function isExtensionContextValid(): boolean {
  try {
    return !!chrome.runtime?.id;
  } catch {
    return false;
  }
}

function notifyTokenAddress(address: string) {
  if (!isExtensionContextValid()) {
    console.log('[FourMeme] Extension context invalidated, skipping notification');
    return;
  }

  try {
    chrome.runtime.sendMessage({
      type: 'TOKEN_ADDRESS_CHANGED',
      address,
    });
  } catch (error) {
    console.log('[FourMeme] Failed to send message:', error);
  }
}

// Check current URL
function checkCurrentUrl() {
  if (!isExtensionContextValid()) {
    cleanup();
    return;
  }

  const address = extractTokenAddress(window.location.href);
  if (address) {
    notifyTokenAddress(address);
  }
}

// Cleanup function to stop observers
let observer: MutationObserver | null = null;

function cleanup() {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  window.removeEventListener('popstate', checkCurrentUrl);
  console.log('[FourMeme] Content script cleaned up');
}

// Initial check
checkCurrentUrl();

// Watch for URL changes (SPA navigation)
let lastUrl = window.location.href;

observer = new MutationObserver(() => {
  if (!isExtensionContextValid()) {
    cleanup();
    return;
  }

  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    checkCurrentUrl();
  }
});

if (document.body) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
}

// Also listen for popstate events
window.addEventListener('popstate', checkCurrentUrl);

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isExtensionContextValid()) {
    return;
  }

  if (message.type === 'GET_TOKEN_ADDRESS') {
    const address = extractTokenAddress(window.location.href);
    sendResponse({ address });
  }
  return true;
});

console.log('[FourMeme] Content script loaded');
