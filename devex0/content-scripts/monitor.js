/**
 * Monitor Content Script
 * Handles real-time monitoring and change detection
 */

class PageMonitor {
  constructor() {
    this.isInitialized = false;
    this.observers = new Map();
    this.changeCallbacks = new Map();
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('[PageMonitor] Initializing on:', window.location.href);
    this.isInitialized = true;
    
    // Setup message listener
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'START_MONITORING':
          this.startMonitoring(message.data).then(sendResponse);
          return true;
          
        case 'STOP_MONITORING':
          this.stopMonitoring(message.data).then(sendResponse);
          return true;
          
        case 'GET_CHANGES':
          this.getChanges(message.data).then(sendResponse);
          return true;
      }
    });
  }

  async startMonitoring(options = {}) {
    try {
      const { 
        target = 'body', 
        type = 'all', 
        interval = 5000,
        id = 'default'
      } = options;
      
      console.log('[PageMonitor] Starting monitoring:', options);
      
      // Stop existing monitor if any
      if (this.observers.has(id)) {
        await this.stopMonitoring({ id });
      }
      
      const targetElement = document.querySelector(target);
      if (!targetElement) {
        throw new Error(`Target element not found: ${target}`);
      }
      
      // Setup observer based on type
      let observer;
      
      switch (type) {
        case 'dom':
          observer = this.createDOMObserver(targetElement, id);
          break;
        case 'content':
          observer = this.createContentObserver(targetElement, id);
          break;
        case 'attributes':
          observer = this.createAttributeObserver(targetElement, id);
          break;
        default:
          observer = this.createGeneralObserver(targetElement, id);
      }
      
      this.observers.set(id, {
        observer,
        target: targetElement,
        type,
        startTime: Date.now(),
        changeCount: 0
      });
      
      return { success: true, monitorId: id };
      
    } catch (error) {
      console.error('[PageMonitor] Failed to start monitoring:', error);
      return { success: false, error: error.message };
    }
  }

  async stopMonitoring(options = {}) {
    try {
      const { id = 'default' } = options;
      
      const monitor = this.observers.get(id);
      if (!monitor) {
        return { success: false, error: 'Monitor not found' };
      }
      
      monitor.observer.disconnect();
      this.observers.delete(id);
      this.changeCallbacks.delete(id);
      
      console.log('[PageMonitor] Stopped monitoring:', id);
      return { success: true };
      
    } catch (error) {
      console.error('[PageMonitor] Failed to stop monitoring:', error);
      return { success: false, error: error.message };
    }
  }

  createDOMObserver(target, id) {
    const observer = new MutationObserver((mutations) => {
      const changes = [];
      
      mutations.forEach(mutation => {
        switch (mutation.type) {
          case 'childList':
            if (mutation.addedNodes.length > 0) {
              changes.push({
                type: 'nodes_added',
                count: mutation.addedNodes.length,
                target: this.getElementPath(mutation.target)
              });
            }
            if (mutation.removedNodes.length > 0) {
              changes.push({
                type: 'nodes_removed',
                count: mutation.removedNodes.length,
                target: this.getElementPath(mutation.target)
              });
            }
            break;
            
          case 'attributes':
            changes.push({
              type: 'attribute_changed',
              attribute: mutation.attributeName,
              target: this.getElementPath(mutation.target),
              oldValue: mutation.oldValue
            });
            break;
            
          case 'characterData':
            changes.push({
              type: 'text_changed',
              target: this.getElementPath(mutation.target),
              oldValue: mutation.oldValue
            });
            break;
        }
      });
      
      if (changes.length > 0) {
        this.handleChanges(id, changes);
      }
    });
    
    observer.observe(target, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeOldValue: true,
      characterData: true,
      characterDataOldValue: true
    });
    
    return observer;
  }

  createContentObserver(target, id) {
    let lastContent = target.textContent;
    
    const checkContent = () => {
      const currentContent = target.textContent;
      if (currentContent !== lastContent) {
        const changes = [{
          type: 'content_changed',
          target: this.getElementPath(target),
          oldContent: lastContent.substring(0, 100),
          newContent: currentContent.substring(0, 100)
        }];
        
        lastContent = currentContent;
        this.handleChanges(id, changes);
      }
    };
    
    const interval = setInterval(checkContent, 2000);
    
    return {
      disconnect: () => clearInterval(interval)
    };
  }

  createAttributeObserver(target, id) {
    const observer = new MutationObserver((mutations) => {
      const changes = mutations.map(mutation => ({
        type: 'attribute_changed',
        attribute: mutation.attributeName,
        target: this.getElementPath(mutation.target),
        oldValue: mutation.oldValue,
        newValue: mutation.target.getAttribute(mutation.attributeName)
      }));
      
      if (changes.length > 0) {
        this.handleChanges(id, changes);
      }
    });
    
    observer.observe(target, {
      attributes: true,
      attributeOldValue: true,
      subtree: true
    });
    
    return observer;
  }

  createGeneralObserver(target, id) {
    return this.createDOMObserver(target, id);
  }

  handleChanges(monitorId, changes) {
    const monitor = this.observers.get(monitorId);
    if (monitor) {
      monitor.changeCount += changes.length;
      
      // Store changes for retrieval
      if (!this.changeCallbacks.has(monitorId)) {
        this.changeCallbacks.set(monitorId, []);
      }
      
      const changeLog = this.changeCallbacks.get(monitorId);
      changeLog.push({
        timestamp: Date.now(),
        changes
      });
      
      // Keep only last 100 change events
      if (changeLog.length > 100) {
        changeLog.splice(0, changeLog.length - 100);
      }
      
      // Notify background script
      this.notifyBackgroundOfChanges(monitorId, changes);
    }
  }

  async notifyBackgroundOfChanges(monitorId, changes) {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('[PageMonitor] Extension context invalidated - stopping notifications');
        this.handleContextInvalidation();
        return;
      }

      chrome.runtime.sendMessage({
        action: 'PAGE_CHANGES_DETECTED',
        data: {
          monitorId,
          url: window.location.href,
          timestamp: Date.now(),
          changes
        }
      }, (response) => {
        // Handle potential runtime errors
        if (chrome.runtime.lastError) {
          console.warn('[PageMonitor] Background communication failed:', chrome.runtime.lastError.message);
          
          // Check if it's a context invalidation error
          if (chrome.runtime.lastError.message.includes('context invalidated') || 
              chrome.runtime.lastError.message.includes('Extension context')) {
            this.handleContextInvalidation();
          }
        }
      });
    } catch (error) {
      console.warn('[PageMonitor] Failed to notify background:', error);
      
      // Check if it's a context invalidation error
      if (error.message.includes('context invalidated') || 
          error.message.includes('Extension context')) {
        this.handleContextInvalidation();
      }
    }
  }

  isExtensionContextValid() {
    try {
      // Try to access chrome.runtime.id - if extension context is invalid, this will throw
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }

  handleContextInvalidation() {
    console.log('[PageMonitor] Extension context invalidated - cleaning up');
    
    // Stop all monitoring activities
    this.observers.forEach((observer, id) => {
      try {
        observer.disconnect();
        console.log(`[PageMonitor] Disconnected observer: ${id}`);
      } catch (error) {
        console.warn(`[PageMonitor] Failed to disconnect observer ${id}:`, error);
      }
    });

    // Clear all data structures
    this.observers.clear();
    this.changeCallbacks.clear();
    this.isMonitoring = false;

    // Show user-friendly message
    console.log('[PageMonitor] Monitoring stopped due to extension reload. Please refresh the page to resume monitoring.');
  }

  async getChanges(options = {}) {
    try {
      const { id = 'default', since = 0 } = options;
      
      const changeLog = this.changeCallbacks.get(id) || [];
      const filteredChanges = changeLog.filter(entry => entry.timestamp >= since);
      
      const monitor = this.observers.get(id);
      const stats = monitor ? {
        isActive: true,
        startTime: monitor.startTime,
        changeCount: monitor.changeCount,
        type: monitor.type
      } : null;
      
      return {
        success: true,
        changes: filteredChanges,
        stats
      };
      
    } catch (error) {
      console.error('[PageMonitor] Failed to get changes:', error);
      return { success: false, error: error.message };
    }
  }

  getElementPath(element) {
    if (!element || element === document) return 'document';
    
    const path = [];
    let current = element;
    
    while (current && current !== document) {
      let selector = current.tagName.toLowerCase();
      
      if (current.id) {
        selector += `#${current.id}`;
        path.unshift(selector);
        break;
      } else if (current.className) {
        const classes = current.className.split(' ').filter(cls => cls.trim());
        if (classes.length > 0) {
          selector += `.${classes.slice(0, 2).join('.')}`;
        }
      }
      
      // Add position if there are siblings
      const siblings = Array.from(current.parentNode?.children || []);
      const sameTagSiblings = siblings.filter(s => s.tagName === current.tagName);
      if (sameTagSiblings.length > 1) {
        const index = sameTagSiblings.indexOf(current) + 1;
        selector += `:nth-of-type(${index})`;
      }
      
      path.unshift(selector);
      current = current.parentNode;
      
      // Limit path depth
      if (path.length >= 5) break;
    }
    
    return path.join(' > ');
  }

  getMonitorStats() {
    const stats = {
      activeMonitors: this.observers.size,
      monitors: {}
    };
    
    for (const [id, monitor] of this.observers.entries()) {
      stats.monitors[id] = {
        type: monitor.type,
        startTime: monitor.startTime,
        changeCount: monitor.changeCount,
        uptime: Date.now() - monitor.startTime
      };
    }
    
    return stats;
  }

  cleanup() {
    // Stop all monitors
    for (const [id] of this.observers.entries()) {
      this.stopMonitoring({ id });
    }
    
    console.log('[PageMonitor] Cleanup complete');
  }
}

// Initialize monitor
const pageMonitor = new PageMonitor();
pageMonitor.init();

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  pageMonitor.cleanup();
});

// Make available globally
window.pageMonitor = pageMonitor;