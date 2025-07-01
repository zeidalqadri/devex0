/**
 * Enhanced Data Extractor
 * Handles the simplified devex0 workflow extraction requests
 */

class DataExtractor {
  constructor() {
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('[DataExtractor] Initializing on:', window.location.href);
    this.isInitialized = true;
    
    // Setup message listener
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[DataExtractor] Received message:', message.action);
      
      // Check extension context validity before processing
      if (!this.isExtensionContextValid()) {
        console.warn('[DataExtractor] Extension context invalidated - ignoring message');
        return;
      }
      
      // Handle PING requests for readiness check
      if (message.action === 'PING') {
        sendResponse({ success: true, service: 'data-extractor', ready: true });
        return;
      }
      
      // Handle HTML extraction
      if (message.action === 'EXTRACT_HTML') {
        this.extractHTML(message.data).then(sendResponse);
        return true; // Async response
      }
      
      // Handle extraction with specific selectors
      else if (message.action === 'EXTRACT_WITH_SELECTOR') {
        this.extractWithSelector(message.data).then(sendResponse);
        return true; // Async response
      }
      
      // Handle multiple selectors extraction for exass
      else if (message.action === 'EXTRACT_WITH_SELECTORS') {
        this.extractWithSelectors(message.data).then(sendResponse);
        return true; // Async response
      }
    });
  }

  async extractHTML(data) {
    try {
      const { selector = 'html', contentType = 'outerHTML' } = data;
      
      let element;
      if (selector === 'html') {
        element = document.documentElement;
      } else {
        element = document.querySelector(selector);
      }
      
      if (!element) {
        return { success: false, error: `No element found for selector: ${selector}` };
      }
      
      let content;
      switch (contentType) {
        case 'outerHTML':
          content = element.outerHTML;
          break;
        case 'innerHTML':
          content = element.innerHTML;
          break;
        case 'textContent':
          content = element.textContent;
          break;
        default:
          content = element.outerHTML;
      }
      
      return { 
        success: true, 
        content: content,
        elementCount: 1,
        selector: selector
      };
      
    } catch (error) {
      console.error('[DataExtractor] HTML extraction failed:', error);
      return { success: false, error: error.message };
    }
  }

  async extractWithSelector(data) {
    try {
      const { selector, options = {} } = data;
      
      if (!selector) {
        return { success: false, error: 'No selector provided' };
      }
      
      const elements = document.querySelectorAll(selector);
      
      if (elements.length === 0) {
        return { 
          success: true, 
          data: [], 
          count: 0, 
          selector: selector,
          message: 'No elements found'
        };
      }
      
      const extractedData = [];
      const maxElements = options.maxElements || 100; // Limit for performance
      
      for (let i = 0; i < Math.min(elements.length, maxElements); i++) {
        const element = elements[i];
        const itemData = this.extractElementData(element, options);
        extractedData.push(itemData);
      }
      
      return {
        success: true,
        data: extractedData,
        count: extractedData.length,
        totalElements: elements.length,
        selector: selector,
        truncated: elements.length > maxElements
      };
      
    } catch (error) {
      console.error('[DataExtractor] Selector extraction failed:', error);
      return { success: false, error: error.message };
    }
  }

  async extractWithSelectors(data) {
    try {
      const { selectors, userInput, options = {} } = data;
      
      if (!selectors || !selectors.primary) {
        return { success: false, error: 'No primary selector provided' };
      }
      
      // Try primary selector first
      let result = await this.extractWithSelector({
        selector: selectors.primary,
        options: options
      });
      
      // If primary fails and we have fallbacks, try them
      if (!result.success && selectors.fallbacks && selectors.fallbacks.length > 0) {
        for (const fallbackSelector of selectors.fallbacks) {
          console.log(`[DataExtractor] Primary selector failed, trying fallback: ${fallbackSelector}`);
          
          const fallbackResult = await this.extractWithSelector({
            selector: fallbackSelector,
            options: options
          });
          
          if (fallbackResult.success && fallbackResult.count > 0) {
            result = fallbackResult;
            result.usedFallback = true;
            result.fallbackSelector = fallbackSelector;
            break;
          }
        }
      }
      
      // Add metadata about the extraction
      if (result.success) {
        result.metadata = {
          extractedAt: new Date().toISOString(),
          url: window.location.href,
          title: document.title,
          userInput: userInput
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('[DataExtractor] Multi-selector extraction failed:', error);
      return { success: false, error: error.message };
    }
  }

  extractElementData(element, options = {}) {
    const data = {
      tagName: element.tagName.toLowerCase(),
      text: element.textContent?.trim() || '',
      index: Array.from(element.parentNode?.children || []).indexOf(element)
    };
    
    // Include text content if requested
    if (options.includeText !== false) {
      data.innerText = element.innerText?.trim() || '';
      data.textLength = data.text.length;
    }
    
    // Include attributes if requested
    if (options.includeAttributes) {
      data.attributes = {};
      for (const attr of element.attributes) {
        data.attributes[attr.name] = attr.value;
      }
      
      // Extract commonly useful attributes
      data.id = element.id || null;
      data.className = element.className || null;
      data.href = element.getAttribute('href') || null;
      data.src = element.getAttribute('src') || null;
      data.alt = element.getAttribute('alt') || null;
      data.title = element.getAttribute('title') || null;
    }
    
    // Include position/visibility info if requested
    if (options.includePosition) {
      try {
        const rect = element.getBoundingClientRect();
        data.position = {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
          visible: rect.width > 0 && rect.height > 0
        };
      } catch (error) {
        data.position = null;
      }
    }
    
    // Include parent context if requested
    if (options.includeParent) {
      const parent = element.parentElement;
      if (parent) {
        data.parent = {
          tagName: parent.tagName.toLowerCase(),
          className: parent.className || null,
          id: parent.id || null
        };
      }
    }
    
    // Extract structured data for common patterns
    if (options.smartExtraction) {
      data.structuredData = this.extractStructuredData(element);
    }
    
    return data;
  }

  extractStructuredData(element) {
    const structured = {};
    
    // Price detection
    const priceRegex = /[\$€£¥₹]\s*[\d,]+\.?\d*/gi;
    const priceMatches = element.textContent.match(priceRegex);
    if (priceMatches) {
      structured.prices = priceMatches;
      structured.price = priceMatches[0]; // Primary price
    }
    
    // Email detection
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    const emailMatches = element.textContent.match(emailRegex);
    if (emailMatches) {
      structured.emails = emailMatches;
    }
    
    // Phone detection
    const phoneRegex = /(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    const phoneMatches = element.textContent.match(phoneRegex);
    if (phoneMatches) {
      structured.phones = phoneMatches;
    }
    
    // URL detection
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urlMatches = element.textContent.match(urlRegex);
    if (urlMatches) {
      structured.urls = urlMatches;
    }
    
    // Date detection (basic)
    const dateRegex = /\b\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}\b|\b\d{4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}\b/g;
    const dateMatches = element.textContent.match(dateRegex);
    if (dateMatches) {
      structured.dates = dateMatches;
    }
    
    // Microdata extraction
    if (element.hasAttribute('itemscope')) {
      structured.microdata = {
        itemscope: true,
        itemtype: element.getAttribute('itemtype') || null,
        itemid: element.getAttribute('itemid') || null
      };
      
      // Extract itemprop values
      const itemProps = element.querySelectorAll('[itemprop]');
      if (itemProps.length > 0) {
        structured.microdata.properties = {};
        itemProps.forEach(prop => {
          const propName = prop.getAttribute('itemprop');
          const propValue = prop.textContent?.trim() || prop.getAttribute('content') || prop.getAttribute('href');
          if (propName && propValue) {
            structured.microdata.properties[propName] = propValue;
          }
        });
      }
    }
    
    return Object.keys(structured).length > 0 ? structured : null;
  }

  isExtensionContextValid() {
    try {
      // Try to access chrome.runtime.id - if extension context is invalid, this will throw
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }

  // Utility method to generate a selector for an element
  generateSelectorForElement(element) {
    if (element.id) {
      return `#${element.id}`;
    }
    
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        return `.${classes[0]}`;
      }
    }
    
    // Fallback to tag name with nth-child
    const parent = element.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children).filter(el => el.tagName === element.tagName);
      if (siblings.length > 1) {
        const index = siblings.indexOf(element) + 1;
        return `${element.tagName.toLowerCase()}:nth-child(${index})`;
      }
    }
    
    return element.tagName.toLowerCase();
  }
}

// Initialize data extractor
const dataExtractor = new DataExtractor();
dataExtractor.init();

// Make available globally
window.dataExtractor = dataExtractor;