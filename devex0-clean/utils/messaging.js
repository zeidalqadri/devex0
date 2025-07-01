/**
 * Messaging Utilities
 * Handles communication between extension components
 */

class MessagingUtils {
  static async sendToBackground(action, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Messaging] Background communication error:', chrome.runtime.lastError);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'No response' });
          }
        }
      );
    });
  }

  static async sendToTab(tabId, action, data = {}) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            console.error('[Messaging] Tab communication error:', chrome.runtime.lastError);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'No response' });
          }
        }
      );
    });
  }

  static connectToBackground(portName) {
    const port = chrome.runtime.connect({ name: portName });
    
    port.onDisconnect.addListener(() => {
      console.log('[Messaging] Disconnected from background:', portName);
    });

    return port;
  }

  static setupMessageListener(handler) {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      try {
        const result = handler(message, sender);
        
        if (result instanceof Promise) {
          result.then(sendResponse).catch(error => {
            console.error('[Messaging] Handler error:', error);
            sendResponse({ success: false, error: error.message });
          });
          return true; // Indicates async response
        } else {
          sendResponse(result);
        }
      } catch (error) {
        console.error('[Messaging] Message handling error:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
  }
}

// Make available globally for content scripts
if (typeof window !== 'undefined') {
  window.MessagingUtils = MessagingUtils;
}