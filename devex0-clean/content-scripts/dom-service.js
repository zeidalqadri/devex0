/**
 * DOM Service - Handles all DOM operations for background scripts
 * Runs in content script context with full DOM access
 */

class DOMService {
  constructor() {
    this.isInitialized = false;
    this.cache = new Map();
  }

  isExtensionContextValid() {
    try {
      // Try to access chrome.runtime.id - if extension context is invalid, this will throw
      return !!chrome.runtime && !!chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }

  async notifyBackgroundSafely(action, data = {}) {
    try {
      // Check if extension context is still valid
      if (!this.isExtensionContextValid()) {
        console.warn('[DOMService] Extension context invalidated - cannot communicate with background');
        return { success: false, error: 'Extension context invalidated' };
      }

      return new Promise((resolve) => {
        chrome.runtime.sendMessage({
          action,
          data,
          timestamp: Date.now()
        }, (response) => {
          // Handle potential runtime errors
          if (chrome.runtime.lastError) {
            console.warn('[DOMService] Background communication failed:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        });
      });
    } catch (error) {
      console.warn('[DOMService] Failed to notify background:', error);
      return { success: false, error: error.message };
    }
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[DOMService] Initializing DOM service...');
    this.setupMessageListeners();
    this.isInitialized = true;
  }

  setupMessageListeners() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      // Check extension context validity before processing
      if (!this.isExtensionContextValid()) {
        console.warn('[DOMService] Extension context invalidated - ignoring message');
        return;
      }
      
      if (message.action === 'PING') {
        sendResponse({ success: true, service: 'dom-service', ready: true });
        return;
      }
      
      if (message.action && message.action.startsWith('DOM_')) {
        this.handleDOMRequest(message, sendResponse);
        return true; // Indicates async response
      }
    });
  }

  async handleDOMRequest(message, sendResponse) {
    try {
      const { action, data } = message;
      let result;

      switch (action) {
        case 'DOM_COUNT_ELEMENTS':
          result = await this.countElements(data.selector);
          break;
          
        case 'DOM_GET_SAMPLE_DATA':
          result = await this.getSampleData(data.selector, data.count || 3);
          break;
          
        case 'DOM_ANALYZE_STRUCTURE':
          result = await this.analyzePageStructure();
          break;
          
        case 'DOM_FIND_PATTERNS':
          result = await this.findContentPatterns();
          break;
          
        case 'DOM_DETECT_FRAMEWORK':
          result = await this.detectFramework();
          break;
          
        case 'DOM_GET_PAGE_INFO':
          result = await this.getPageInfo();
          break;
          
        case 'DOM_VALIDATE_SELECTOR':
          result = await this.validateSelector(data.selector);
          break;
          
        case 'DOM_ANALYZE_CONTENT_TYPES':
          result = await this.analyzeContentTypes();
          break;

        default:
          throw new Error(`Unknown DOM action: ${action}`);
      }

      sendResponse({ success: true, data: result });

    } catch (error) {
      console.error('[DOMService] Request failed:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Count elements matching a selector
   */
  async countElements(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      return elements.length;
    } catch (error) {
      console.warn('[DOMService] Count elements failed:', error);
      return 0;
    }
  }

  /**
   * Get sample data from elements
   */
  async getSampleData(selector, count = 3) {
    try {
      const elements = document.querySelectorAll(selector);
      const samples = Array.from(elements)
        .slice(0, count)
        .map(el => ({
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          textContent: el.textContent?.slice(0, 100) || '',
          innerHTML: el.innerHTML?.slice(0, 200) || '',
          attributes: this.getElementAttributes(el),
          boundingRect: this.getElementBounds(el)
        }));

      return samples;
    } catch (error) {
      console.warn('[DOMService] Get sample data failed:', error);
      return [];
    }
  }

  /**
   * Analyze overall page structure
   */
  async analyzePageStructure() {
    try {
      const structure = {
        // Basic page info
        title: document.title,
        url: window.location.href,
        domain: window.location.hostname,
        
        // Element counts
        totalElements: document.querySelectorAll('*').length,
        headings: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
        paragraphs: document.querySelectorAll('p').length,
        links: document.querySelectorAll('a').length,
        images: document.querySelectorAll('img').length,
        
        // Structural elements
        tables: document.querySelectorAll('table').length,
        lists: document.querySelectorAll('ul, ol').length,
        forms: document.querySelectorAll('form').length,
        
        // Interactive elements
        buttons: document.querySelectorAll('button, input[type="button"], input[type="submit"]').length,
        inputs: document.querySelectorAll('input, textarea, select').length,
        
        // Layout indicators
        hasHeader: !!document.querySelector('header, .header, #header'),
        hasNav: !!document.querySelector('nav, .nav, .navigation'),
        hasMain: !!document.querySelector('main, .main, #main, .content'),
        hasFooter: !!document.querySelector('footer, .footer, #footer'),
        hasSidebar: !!document.querySelector('aside, .sidebar, .side'),
        
        // Content indicators
        hasArticles: document.querySelectorAll('article, .article, .post').length > 0,
        hasCards: this.detectCardPatterns().length > 0,
        hasDataTables: this.detectDataTables().length > 0,
        hasProductGrid: this.detectProductPatterns().length > 0,
        
        // Technical indicators
        framework: this.detectFramework(),
        isSPA: this.isSinglePageApp(),
        hasInfiniteScroll: this.hasInfiniteScroll(),
        hasLazyLoading: this.hasLazyLoading(),
        
        // Viewport
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        }
      };

      return structure;
    } catch (error) {
      console.error('[DOMService] Structure analysis failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Find content patterns without domain-specific assumptions
   */
  async findContentPatterns() {
    try {
      const patterns = {
        // Repeating content patterns
        repeatingElements: this.findRepeatingElements(),
        
        // Data structures
        tables: this.detectDataTables(),
        lists: this.detectDataLists(),
        cards: this.detectCardPatterns(),
        
        // Content types
        articles: this.detectArticleContent(),
        products: this.detectProductPatterns(),
        navigation: this.detectNavigationElements(),
        
        // Interactive elements
        forms: this.detectFormPatterns(),
        controls: this.detectControlElements()
      };

      return patterns;
    } catch (error) {
      console.error('[DOMService] Pattern analysis failed:', error);
      return { error: error.message };
    }
  }

  /**
   * Detect framework without hardcoded checks
   */
  detectFramework() {
    // Check for common framework indicators
    if (window.React || document.querySelector('[data-reactroot]') || 
        document.querySelector('[data-react-helmet]')) {
      return 'react';
    }
    
    if (window.Vue || document.querySelector('[data-server-rendered]') ||
        document.querySelector('[data-vue-meta]')) {
      return 'vue';
    }
    
    if (window.angular || document.querySelector('[ng-app]') ||
        document.querySelector('[data-ng-app]')) {
      return 'angular';
    }
    
    if (window.jQuery || window.$ || document.querySelector('script[src*="jquery"]')) {
      return 'jquery';
    }
    
    // Check for other common frameworks
    if (document.querySelector('[data-turbo]') || window.Turbo) {
      return 'turbo';
    }
    
    if (document.querySelector('script[src*="ember"]') || window.Ember) {
      return 'ember';
    }
    
    return 'vanilla';
  }

  /**
   * Get comprehensive page information
   */
  async getPageInfo() {
    return {
      // Basic info
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      
      // Meta information
      description: document.querySelector('meta[name="description"]')?.content || '',
      keywords: document.querySelector('meta[name="keywords"]')?.content || '',
      
      // Technical details
      charset: document.characterSet,
      doctype: document.doctype?.name || 'html',
      
      // Content metrics
      bodyText: document.body?.textContent?.length || 0,
      wordCount: this.estimateWordCount(),
      
      // Structure analysis
      ...await this.analyzePageStructure()
    };
  }

  /**
   * Validate a CSS selector
   */
  async validateSelector(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      return {
        isValid: true,
        elementCount: elements.length,
        sampleElements: elements.length > 0 ? this.getSampleData(selector, 2) : []
      };
    } catch (error) {
      return {
        isValid: false,
        elementCount: 0,
        error: error.message,
        sampleElements: []
      };
    }
  }

  /**
   * Analyze content types present on the page
   */
  async analyzeContentTypes() {
    const types = [];
    
    // Check for various content patterns
    if (document.querySelectorAll('table').length > 0) types.push('tables');
    if (document.querySelectorAll('ul, ol').length > 3) types.push('lists');
    if (this.detectCardPatterns().length > 0) types.push('cards');
    if (document.querySelectorAll('article, .article').length > 0) types.push('articles');
    if (document.querySelectorAll('form').length > 0) types.push('forms');
    if (this.detectProductPatterns().length > 0) types.push('products');
    if (document.querySelectorAll('nav, .nav').length > 0) types.push('navigation');
    
    return types;
  }

  // Helper methods for pattern detection

  findRepeatingElements() {
    const elements = [];
    const classFrequency = new Map();
    
    // Analyze class frequency
    document.querySelectorAll('[class]').forEach(el => {
      const classes = el.className.split(' ');
      classes.forEach(cls => {
        if (cls.trim()) {
          classFrequency.set(cls, (classFrequency.get(cls) || 0) + 1);
        }
      });
    });
    
    // Find classes that appear multiple times (likely repeating content)
    for (const [className, count] of classFrequency.entries()) {
      if (count >= 3 && count <= 100) { // Sweet spot for content items
        elements.push({
          type: 'class-pattern',
          selector: `.${className}`,
          count: count,
          confidence: Math.min(95, count * 5)
        });
      }
    }
    
    return elements.slice(0, 10); // Top 10 patterns
  }

  detectDataTables() {
    const tables = [];
    document.querySelectorAll('table').forEach(table => {
      const rows = table.querySelectorAll('tr');
      const cells = table.querySelectorAll('td, th');
      
      if (rows.length > 2 && cells.length > 4) {
        tables.push({
          selector: this.generateSelector(table),
          rows: rows.length,
          columns: table.querySelectorAll('tr:first-child td, tr:first-child th').length,
          hasHeaders: table.querySelectorAll('th').length > 0,
          confidence: 90
        });
      }
    });
    
    return tables;
  }

  detectDataLists() {
    const lists = [];
    document.querySelectorAll('ul, ol').forEach(list => {
      const items = list.querySelectorAll('li');
      
      if (items.length >= 3) {
        lists.push({
          selector: this.generateSelector(list),
          itemCount: items.length,
          type: list.tagName.toLowerCase(),
          confidence: Math.min(85, items.length * 10)
        });
      }
    });
    
    return lists;
  }

  detectCardPatterns() {
    const cards = [];
    const cardSelectors = [
      '.card', '.item', '.product', '.listing', '.tile', '.box',
      '[class*="card"]', '[class*="item"]', '[class*="product"]'
    ];
    
    cardSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length >= 2) {
          cards.push({
            selector: selector,
            count: elements.length,
            confidence: Math.min(80, elements.length * 15)
          });
        }
      } catch (error) {
        // Invalid selector, skip
      }
    });
    
    return cards;
  }

  detectArticleContent() {
    const articles = [];
    const articleSelectors = ['article', '.article', '.post', '.content', 'main'];
    
    articleSelectors.forEach(selector => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const wordCount = el.textContent?.split(' ').length || 0;
          if (wordCount > 50) { // Substantial content
            articles.push({
              selector: this.generateSelector(el),
              wordCount: wordCount,
              confidence: 70
            });
          }
        });
      } catch (error) {
        // Invalid selector, skip
      }
    });
    
    return articles;
  }

  detectProductPatterns() {
    const products = [];
    
    // Look for common product indicators without hardcoded domain assumptions
    const productIndicators = [
      'price', 'buy', 'cart', 'add-to', 'product', 'item',
      'cost', 'sale', 'discount', 'offer'
    ];
    
    productIndicators.forEach(indicator => {
      const elements = document.querySelectorAll(`[class*="${indicator}"], [id*="${indicator}"]`);
      if (elements.length > 0) {
        products.push({
          type: 'product-indicator',
          indicator: indicator,
          count: elements.length,
          confidence: 60
        });
      }
    });
    
    return products;
  }

  detectNavigationElements() {
    const nav = {
      pagination: document.querySelectorAll('.pagination, .pager, [class*="page"]').length > 0,
      loadMore: document.querySelectorAll('[class*="load"], [class*="more"]').length > 0,
      infiniteScroll: this.hasInfiniteScroll(),
      breadcrumbs: document.querySelectorAll('.breadcrumb, [class*="breadcrumb"]').length > 0
    };
    
    return nav;
  }

  detectFormPatterns() {
    const forms = [];
    document.querySelectorAll('form').forEach(form => {
      const inputs = form.querySelectorAll('input, textarea, select');
      const buttons = form.querySelectorAll('button, input[type="submit"]');
      
      forms.push({
        selector: this.generateSelector(form),
        inputCount: inputs.length,
        buttonCount: buttons.length,
        hasRequired: form.querySelectorAll('[required]').length > 0,
        confidence: 75
      });
    });
    
    return forms;
  }

  detectControlElements() {
    return {
      buttons: document.querySelectorAll('button').length,
      links: document.querySelectorAll('a').length,
      inputs: document.querySelectorAll('input').length,
      selects: document.querySelectorAll('select').length,
      textareas: document.querySelectorAll('textarea').length
    };
  }

  // Utility methods

  generateSelector(element) {
    // Generate a reliable selector for an element
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  getElementAttributes(element) {
    const attributes = {};
    const relevantAttrs = ['id', 'class', 'data-*', 'role', 'aria-*', 'href', 'src'];
    
    for (const attr of element.attributes) {
      if (relevantAttrs.some(pattern => 
        pattern.includes('*') ? attr.name.startsWith(pattern.replace('*', '')) : attr.name === pattern
      )) {
        attributes[attr.name] = attr.value;
      }
    }
    
    return attributes;
  }

  getElementBounds(element) {
    try {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        visible: rect.width > 0 && rect.height > 0
      };
    } catch (error) {
      return { x: 0, y: 0, width: 0, height: 0, visible: false };
    }
  }

  isSinglePageApp() {
    return !!(window.history?.pushState && 
             (window.React || window.Vue || window.angular || 
              document.querySelector('[data-turbo]')));
  }

  hasInfiniteScroll() {
    return document.querySelector('[class*="infinite"], [class*="scroll"], [data-infinite]') !== null;
  }

  hasLazyLoading() {
    return document.querySelector('img[loading="lazy"], [class*="lazy"]') !== null;
  }

  estimateWordCount() {
    const text = document.body?.textContent || '';
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }
}

// Initialize DOM service
const domService = new DOMService();
domService.init();

// Make available globally
window.DOMService = domService;