/**
 * Data Extractor Content Script
 * Performs actual data extraction from web pages
 */

class DataExtractor {
  constructor() {
    this.isInitialized = false;
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
        console.warn('[DataExtractor] Extension context invalidated - cannot communicate with background');
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
            console.warn('[DataExtractor] Background communication failed:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        });
      });
    } catch (error) {
      console.warn('[DataExtractor] Failed to notify background:', error);
      return { success: false, error: error.message };
    }
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
      // Check extension context validity before processing
      if (!this.isExtensionContextValid()) {
        console.warn('[DataExtractor] Extension context invalidated - ignoring message');
        return;
      }
      
      if (message.action === 'EXTRACT_DATA') {
        this.extractData(message).then(sendResponse);
        return true; // Async response
      } else if (message.action === 'EXTRACT_HTML') {
        this.extractHTML(message.data).then(sendResponse);
        return true; // Async response
      } else if (message.action === 'ENHANCED_DOM_ANALYSIS') {
        this.enhancedDOMAnalysis(message.userInput).then(sendResponse);
        return true; // Async response
      } else if (message.action === 'ANALYZE_PATTERNS') {
        this.analyzePatterns(message).then(sendResponse);
        return true; // Async response
      } else if (message.action === 'EXTRACT_WITH_SELECTORS') {
        this.extractWithSelectors(message).then(sendResponse);
        return true; // Async response
      }
    });
  }

  async extractHTML(data) {
    try {
      const { selector = 'html', contentType = 'outerHTML' } = data;
      
      let element;
      if (selector) {
        element = document.querySelector(selector);
        if (!element) {
          return { success: false, error: `No element matches: ${selector}` };
        }
      } else {
        element = document.documentElement;
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
        selector: selector,
        contentType: contentType
      };
      
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async extractData(message) {
    try {
      const { schema, domain, options } = message;
      
      console.log('[DataExtractor] Starting extraction for domain:', domain);
      
      let extractedData;
      
      // Use generic extraction approach for all domains
      extractedData = await this.extractGenericData(options);

      console.log('[DataExtractor] Extraction complete:', extractedData);
      
      return {
        success: true,
        data: extractedData,
        metadata: {
          url: window.location.href,
          timestamp: Date.now(),
          domain,
          itemCount: Array.isArray(extractedData) ? extractedData.length : 1
        }
      };

    } catch (error) {
      console.error('[DataExtractor] Extraction failed:', error);
      return {
        success: false,
        error: error.message,
        metadata: {
          url: window.location.href,
          timestamp: Date.now()
        }
      };
    }
  }

  async extractMaritimeData(options) {
    const vessels = [];
    
    // Common maritime data selectors
    const vesselRows = document.querySelectorAll(
      'table tr, .vessel-item, .ship-row, [class*="vessel"], [class*="ship"]'
    );

    vesselRows.forEach((row, index) => {
      if (index === 0 && this.isHeaderRow(row)) return; // Skip header
      
      const vessel = {
        name: this.extractText(row, '.name, .vessel-name, .ship-name, [title*="name"]'),
        imo: this.extractText(row, '.imo, [title*="IMO"], [data-imo]'),
        type: this.extractText(row, '.type, .vessel-type, .ship-type'),
        flag: this.extractText(row, '.flag, .country, .nation'),
        position: {
          lat: this.extractNumber(row, '.lat, .latitude, [data-lat]'),
          lng: this.extractNumber(row, '.lng, .longitude, [data-lng]')
        },
        destination: this.extractText(row, '.destination, .dest, .port'),
        speed: this.extractNumber(row, '.speed, .knots, [title*="speed"]'),
        course: this.extractNumber(row, '.course, .heading, [title*="course"]'),
        status: this.extractText(row, '.status, .state, [title*="status"]'),
        lastUpdate: this.extractText(row, '.time, .timestamp, .updated, [datetime]')
      };

      // Only add if we got some meaningful data
      if (vessel.name || vessel.imo) {
        vessels.push(vessel);
      }
    });

    return vessels;
  }

  async extractLuxuryData(options) {
    const products = [];
    
    // Common luxury product selectors
    const productElements = document.querySelectorAll(
      '.product, .item, .listing, [data-testid*="product"], .card'
    );

    productElements.forEach(element => {
      const product = {
        name: this.extractText(element, '.name, .title, h1, h2, h3, [title]'),
        brand: this.extractText(element, '.brand, .designer, .manufacturer'),
        price: {
          current: this.extractPrice(element, '.price, .cost, .amount, [class*="price"]'),
          original: this.extractPrice(element, '.original, .was, .before, [class*="original"]'),
          currency: this.extractCurrency(element)
        },
        images: this.extractImages(element),
        availability: this.extractAvailability(element),
        description: this.extractText(element, '.description, .desc, .summary'),
        specifications: this.extractSpecifications(element),
        url: this.extractUrl(element),
        sku: this.extractText(element, '.sku, .model, .item-number, [data-sku]')
      };

      if (product.name || product.brand) {
        products.push(product);
      }
    });

    return products;
  }

  async extractRealEstateData(options) {
    const properties = [];
    
    const propertyElements = document.querySelectorAll(
      '.property, .listing, .home, .result, [data-testid*="property"]'
    );

    propertyElements.forEach(element => {
      const property = {
        address: this.extractText(element, '.address, .location, .street'),
        price: this.extractPrice(element, '.price, .cost, .amount'),
        bedrooms: this.extractNumber(element, '.beds, .bedrooms, [title*="bed"]'),
        bathrooms: this.extractNumber(element, '.baths, .bathrooms, [title*="bath"]'),
        squareFootage: this.extractNumber(element, '.sqft, .area, .size, [title*="sqft"]'),
        propertyType: this.extractText(element, '.type, .style, .category'),
        description: this.extractText(element, '.description, .summary'),
        images: this.extractImages(element),
        url: this.extractUrl(element),
        listingDate: this.extractText(element, '.date, .listed, .posted'),
        agent: this.extractAgentInfo(element)
      };

      if (property.address || property.price) {
        properties.push(property);
      }
    });

    return properties;
  }

  async extractFinancialData(options) {
    const data = [];
    
    // Look for financial data patterns
    const dataElements = document.querySelectorAll(
      'table tr, .stock, .quote, .company, .result, [data-symbol]'
    );

    dataElements.forEach((element, index) => {
      if (index === 0 && this.isHeaderRow(element)) return;
      
      const item = {
        symbol: this.extractText(element, '.symbol, .ticker, [data-symbol]'),
        name: this.extractText(element, '.name, .company, .title'),
        price: this.extractNumber(element, '.price, .quote, .value'),
        change: this.extractNumber(element, '.change, .delta, .diff'),
        changePercent: this.extractNumber(element, '.percent, .pct, [title*="%"]'),
        volume: this.extractNumber(element, '.volume, .vol, .shares'),
        marketCap: this.extractText(element, '.cap, .market-cap, .mcap'),
        sector: this.extractText(element, '.sector, .industry, .category')
      };

      if (item.symbol || item.name) {
        data.push(item);
      }
    });

    return data;
  }

  async extractGenericData(options) {
    // Generic extraction for unknown domains
    const data = [];
    
    // Look for tabular data
    const tables = document.querySelectorAll('table');
    tables.forEach(table => {
      const tableData = this.extractTableData(table);
      if (tableData.length > 0) {
        data.push({ type: 'table', data: tableData });
      }
    });

    // Look for list items
    const lists = document.querySelectorAll('ul, ol');
    lists.forEach(list => {
      const listData = this.extractListData(list);
      if (listData.length > 0) {
        data.push({ type: 'list', data: listData });
      }
    });

    return data;
  }

  extractText(context, selectors) {
    const selectorsArray = Array.isArray(selectors) ? selectors : [selectors];
    
    for (const selector of selectorsArray) {
      const element = context.querySelector(selector);
      if (element && element.textContent.trim()) {
        return element.textContent.trim();
      }
    }
    
    return null;
  }

  extractNumber(context, selectors) {
    const text = this.extractText(context, selectors);
    if (!text) return null;
    
    const number = parseFloat(text.replace(/[^\d.-]/g, ''));
    return isNaN(number) ? null : number;
  }

  extractPrice(context, selectors) {
    const text = this.extractText(context, selectors);
    if (!text) return null;
    
    // Extract price with currency support
    const priceMatch = text.match(/[\$€£¥₹]?[\d,]+\.?\d*/);
    if (priceMatch) {
      const price = parseFloat(priceMatch[0].replace(/[^\d.]/g, ''));
      return isNaN(price) ? null : price;
    }
    
    return null;
  }

  extractCurrency(context) {
    const text = context.textContent;
    const currencySymbols = { '$': 'USD', '€': 'EUR', '£': 'GBP', '¥': 'JPY', '₹': 'INR' };
    
    for (const [symbol, code] of Object.entries(currencySymbols)) {
      if (text.includes(symbol)) {
        return code;
      }
    }
    
    return 'USD'; // Default
  }

  extractImages(context) {
    const images = [];
    const imgElements = context.querySelectorAll('img[src]');
    
    imgElements.forEach(img => {
      const src = img.getAttribute('src');
      if (src && !src.startsWith('data:')) {
        images.push({
          src: this.resolveUrl(src),
          alt: img.getAttribute('alt') || '',
          width: img.naturalWidth || null,
          height: img.naturalHeight || null
        });
      }
    });
    
    return images;
  }

  extractAvailability(context) {
    const indicators = [
      { text: ['in stock', 'available', 'in-stock'], value: true },
      { text: ['out of stock', 'sold out', 'unavailable'], value: false }
    ];
    
    const text = context.textContent.toLowerCase();
    
    for (const indicator of indicators) {
      if (indicator.text.some(phrase => text.includes(phrase))) {
        return indicator.value;
      }
    }
    
    return null;
  }

  extractSpecifications(context) {
    const specs = {};
    
    // Look for specification lists
    const specElements = context.querySelectorAll(
      '.specs li, .specifications li, .features li, .details li'
    );
    
    specElements.forEach(spec => {
      const text = spec.textContent.trim();
      const colonIndex = text.indexOf(':');
      
      if (colonIndex > 0) {
        const key = text.substring(0, colonIndex).trim();
        const value = text.substring(colonIndex + 1).trim();
        specs[key] = value;
      }
    });
    
    return Object.keys(specs).length > 0 ? specs : null;
  }

  extractUrl(context) {
    const link = context.querySelector('a[href]');
    if (link) {
      return this.resolveUrl(link.getAttribute('href'));
    }
    
    return null;
  }

  extractAgentInfo(context) {
    return {
      name: this.extractText(context, '.agent, .broker, .contact-name'),
      phone: this.extractText(context, '.phone, .tel, [href^="tel:"]'),
      email: this.extractText(context, '.email, [href^="mailto:"]')
    };
  }

  extractTableData(table) {
    const data = [];
    const rows = table.querySelectorAll('tr');
    
    if (rows.length < 2) return data; // Need header + at least one data row
    
    // Extract headers
    const headerRow = rows[0];
    const headers = Array.from(headerRow.querySelectorAll('th, td')).map(
      cell => cell.textContent.trim()
    );
    
    // Extract data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cells = row.querySelectorAll('td');
      
      if (cells.length === headers.length) {
        const rowData = {};
        cells.forEach((cell, index) => {
          rowData[headers[index]] = cell.textContent.trim();
        });
        data.push(rowData);
      }
    }
    
    return data;
  }

  extractListData(list) {
    const items = [];
    const listItems = list.querySelectorAll('li');
    
    listItems.forEach(item => {
      const text = item.textContent.trim();
      if (text) {
        items.push(text);
      }
    });
    
    return items;
  }

  isHeaderRow(row) {
    return row.querySelector('th') !== null;
  }

  resolveUrl(url) {
    if (url.startsWith('http')) {
      return url;
    } else if (url.startsWith('//')) {
      return window.location.protocol + url;
    } else if (url.startsWith('/')) {
      return window.location.origin + url;
    } else {
      return new URL(url, window.location.href).href;
    }
  }

  /**
   * Enhanced DOM analysis for smart extraction
   * Provides detailed structure information to background agents
   */
  async enhancedDOMAnalysis(userInput) {
    try {
      console.log('[DataExtractor] Enhanced DOM analysis...');
      
      const domData = {
        pageInfo: this.getPageInfo(),
        extractionTargets: this.identifyExtractionTargets(),
        classAnalysis: this.analyzeClassStructure(),
        selectorCandidates: this.generateSelectorCandidates(),
        contentStructure: this.analyzeContentStructure(),
        navigationElements: this.identifyNavigationElements()
      };

      return {
        success: true,
        domData
      };

    } catch (error) {
      console.error('[DataExtractor] Enhanced DOM analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      hasJavaScript: !!document.querySelector('script'),
      isSPA: this.isSinglePageApp(),
      hasInfiniteScroll: this.hasInfiniteScroll(),
      totalElements: document.querySelectorAll('*').length,
      formCount: document.querySelectorAll('form').length,
      tableCount: document.querySelectorAll('table').length,
      listCount: document.querySelectorAll('ul, ol').length,
      hasLazyLoading: this.hasLazyLoading(),
      viewportSize: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }

  identifyExtractionTargets() {
    const targets = [];
    
    // Common data patterns
    const patterns = [
      { name: 'products', selectors: ['.product', '.item', '[data-testid*="product"]', '.card'] },
      { name: 'listings', selectors: ['.listing', '.result', '.entry', '.post'] },
      { name: 'articles', selectors: ['article', '.article', '.news-item'] },
      { name: 'cards', selectors: ['.card', '.tile', '.box', '.panel'] },
      { name: 'rows', selectors: ['table tr', '.row', '.line-item', 'tbody tr'] }
    ];

    patterns.forEach(pattern => {
      let totalElements = 0;
      const matchingSelectors = [];
      
      pattern.selectors.forEach(selector => {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            totalElements += elements.length;
            matchingSelectors.push({ 
              selector, 
              count: elements.length,
              reliability: this.assessSelectorReliability(selector, elements)
            });
          }
        } catch (error) {
          // Invalid selector, skip
        }
      });

      if (totalElements > 0) {
        targets.push({
          type: pattern.name,
          totalCount: totalElements,
          selectors: matchingSelectors.sort((a, b) => b.reliability - a.reliability)
        });
      }
    });

    return targets;
  }

  analyzeClassStructure() {
    const classes = new Set();
    const elements = document.querySelectorAll('[class]');
    
    elements.forEach(el => {
      const classList = el.className.split(/\s+/);
      classList.forEach(cls => {
        if (cls.trim()) classes.add(cls.trim());
      });
    });

    const classArray = Array.from(classes);
    
    return {
      totalClasses: classArray.length,
      namingPatterns: this.analyzeNamingPatterns(classArray),
      commonPrefixes: this.findCommonPrefixes(classArray),
      lengthDistribution: this.analyzeClassLengths(classArray)
    };
  }

  analyzeNamingPatterns(classes) {
    const patterns = {
      camelCase: 0,
      kebabCase: 0,
      snake_case: 0,
      BEM: 0,
      mixed: 0
    };

    classes.forEach(cls => {
      if (/^[a-z]+([A-Z][a-z]*)*$/.test(cls)) {
        patterns.camelCase++;
      } else if (/^[a-z]+(-[a-z]+)*$/.test(cls)) {
        patterns.kebabCase++;
      } else if (/^[a-z]+(_[a-z]+)*$/.test(cls)) {
        patterns.snake_case++;
      } else if (/__/.test(cls) || /--/.test(cls)) {
        patterns.BEM++;
      } else {
        patterns.mixed++;
      }
    });

    // Determine primary pattern
    const maxPattern = Object.entries(patterns).reduce((a, b) => 
      patterns[a[0]] > patterns[b[0]] ? a : b
    );

    return {
      ...patterns,
      primary: maxPattern[0],
      consistency: maxPattern[1] / classes.length
    };
  }

  findCommonPrefixes(classes) {
    const prefixCounts = {};
    
    classes.forEach(cls => {
      // Split by common separators
      const parts = cls.split(/[-_]/);
      if (parts.length > 1) {
        const prefix = parts[0];
        if (prefix.length > 1) {
          prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
        }
      }
    });

    return Object.entries(prefixCounts)
      .filter(([prefix, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([prefix, count]) => ({ prefix, count }));
  }

  analyzeClassLengths(classes) {
    const lengths = classes.map(cls => cls.length);
    lengths.sort((a, b) => a - b);
    
    return {
      min: lengths[0] || 0,
      max: lengths[lengths.length - 1] || 0,
      average: lengths.reduce((sum, len) => sum + len, 0) / lengths.length,
      median: lengths[Math.floor(lengths.length / 2)] || 0
    };
  }

  generateSelectorCandidates() {
    const candidates = [];
    
    // Find elements with repeated patterns
    const elementGroups = this.groupSimilarElements();
    
    elementGroups.forEach(group => {
      if (group.elements.length >= 2) {
        const selector = this.generateSelectorForGroup(group);
        if (selector) {
          candidates.push({
            selector,
            count: group.elements.length,
            type: group.type,
            reliability: this.assessSelectorReliability(selector, group.elements)
          });
        }
      }
    });

    return candidates.sort((a, b) => b.reliability - a.reliability);
  }

  groupSimilarElements() {
    const groups = [];
    const processed = new Set();
    
    // Group by tag name and similar classes
    const elements = Array.from(document.querySelectorAll('*')).filter(el => 
      el.children.length < 20 && // Not container elements
      el.textContent.trim().length > 0 && // Has content
      el.textContent.trim().length < 500 // Not too much content
    );

    elements.forEach(el => {
      if (processed.has(el)) return;
      
      const signature = this.getElementSignature(el);
      const similarElements = elements.filter(other => 
        !processed.has(other) && 
        this.getElementSignature(other) === signature
      );

      if (similarElements.length >= 2) {
        similarElements.forEach(elem => processed.add(elem));
        groups.push({
          type: this.inferGroupType(similarElements[0]),
          signature,
          elements: similarElements
        });
      }
    });

    return groups;
  }

  getElementSignature(element) {
    const classes = Array.from(element.classList).sort().join(' ');
    const tagName = element.tagName.toLowerCase();
    const hasText = element.textContent.trim().length > 0;
    const hasImages = element.querySelector('img') !== null;
    const hasLinks = element.querySelector('a') !== null;
    
    return `${tagName}|${classes}|${hasText}|${hasImages}|${hasLinks}`;
  }

  inferGroupType(element) {
    const text = element.textContent.toLowerCase();
    const classes = element.className.toLowerCase();
    
    if (classes.includes('product') || text.includes('$') || text.includes('price')) {
      return 'product';
    } else if (classes.includes('listing') || classes.includes('item')) {
      return 'listing';
    } else if (element.tagName.toLowerCase() === 'tr') {
      return 'table-row';
    } else if (classes.includes('card') || classes.includes('tile')) {
      return 'card';
    }
    
    return 'generic';
  }

  generateSelectorForGroup(group) {
    const firstElement = group.elements[0];
    
    // Try class-based selector first
    const commonClasses = this.findCommonClasses(group.elements);
    if (commonClasses.length > 0) {
      return '.' + commonClasses.join('.');
    }
    
    // Try tag-based selector
    const tagName = firstElement.tagName.toLowerCase();
    const parent = firstElement.parentElement;
    if (parent) {
      const parentSelector = this.generateParentSelector(parent);
      return `${parentSelector} ${tagName}`;
    }
    
    return tagName;
  }

  findCommonClasses(elements) {
    if (elements.length === 0) return [];
    
    const firstClasses = Array.from(elements[0].classList);
    return firstClasses.filter(cls => 
      elements.every(el => el.classList.contains(cls))
    );
  }

  generateParentSelector(parent) {
    if (parent.id) return `#${parent.id}`;
    if (parent.className) {
      const classes = Array.from(parent.classList);
      if (classes.length > 0) return '.' + classes[0];
    }
    return parent.tagName.toLowerCase();
  }

  assessSelectorReliability(selector, elements) {
    let score = 50; // Base score
    
    // Prefer specific selectors over generic ones
    if (selector.includes('.')) score += 20;
    if (selector.includes('#')) score += 30;
    if (selector.includes('[')) score += 15;
    
    // Penalty for overly broad selectors
    if (selector === 'div' || selector === 'span') score -= 30;
    
    // Bonus for reasonable match count
    const count = elements.length || document.querySelectorAll(selector).length;
    if (count >= 2 && count <= 50) score += 20;
    if (count > 50) score -= 10;
    
    // Bonus for semantic elements
    if (/article|section|header|footer|main/.test(selector)) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }

  analyzeContentStructure() {
    return {
      hasHeader: !!document.querySelector('header, .header, #header'),
      hasNav: !!document.querySelector('nav, .nav, .navigation'),
      hasMain: !!document.querySelector('main, .main, #main, .content'),
      hasFooter: !!document.querySelector('footer, .footer, #footer'),
      hasSidebar: !!document.querySelector('aside, .sidebar, .side'),
      semanticElements: this.countSemanticElements()
    };
  }

  countSemanticElements() {
    const semanticTags = ['header', 'nav', 'main', 'section', 'article', 'aside', 'footer'];
    const counts = {};
    
    semanticTags.forEach(tag => {
      counts[tag] = document.querySelectorAll(tag).length;
    });
    
    return counts;
  }

  identifyNavigationElements() {
    return {
      pagination: !!document.querySelector('.pagination, .pager, [class*="page"]'),
      loadMore: !!document.querySelector('[class*="load"], [class*="more"], [class*="next"]'),
      infiniteScroll: this.hasInfiniteScroll(),
      breadcrumbs: !!document.querySelector('.breadcrumb, .breadcrumbs, [class*="crumb"]')
    };
  }

  isSinglePageApp() {
    return !!(window.history?.pushState && 
             (window.React || window.Vue || window.angular || 
              document.querySelector('[data-reactroot], [data-server-rendered], [ng-app]')));
  }

  hasInfiniteScroll() {
    return !!document.querySelector('[class*="infinite"], [class*="endless"], [data-infinite]');
  }

  hasLazyLoading() {
    return !!document.querySelector('img[loading="lazy"], [class*="lazy"]');
  }

  /**
   * Advanced pattern analysis for CSS and structure
   */
  async analyzePatterns(message) {
    try {
      console.log('[DataExtractor] Advanced pattern analysis...');
      
      const patterns = {
        css: this.analyzeCSSPatterns(),
        structure: this.analyzeStructuralPatterns(),
        data: this.analyzeDataPatterns(),
        naming: this.analyzeNamingConventions(),
        selectors: this.analyzeSelectorQuality()
      };

      return {
        success: true,
        patterns
      };

    } catch (error) {
      console.error('[DataExtractor] Pattern analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  analyzeCSSPatterns() {
    const allElements = document.querySelectorAll('*');
    const classData = {
      total: 0,
      unique: new Set(),
      patterns: {
        camelCase: 0,
        kebabCase: 0,
        snake_case: 0,
        BEM: 0,
        utility: 0
      }
    };

    allElements.forEach(el => {
      const classes = Array.from(el.classList);
      classData.total += classes.length;
      
      classes.forEach(cls => {
        classData.unique.add(cls);
        
        // Analyze naming patterns
        if (/^[a-z]+([A-Z][a-z]*)+$/.test(cls)) {
          classData.patterns.camelCase++;
        } else if (/^[a-z-]+$/.test(cls) && cls.includes('-')) {
          classData.patterns.kebabCase++;
        } else if (cls.includes('_')) {
          classData.patterns.snake_case++;
        } else if (cls.includes('__') || cls.includes('--')) {
          classData.patterns.BEM++;
        } else if (cls.length <= 4 || /^(m|p|w|h)-/.test(cls)) {
          classData.patterns.utility++;
        }
      });
    });

    return {
      totalClasses: classData.total,
      uniqueClasses: classData.unique.size,
      patterns: classData.patterns,
      namingConvention: this.determinePrimaryNamingConvention(classData.patterns)
    };
  }

  determinePrimaryNamingConvention(patterns) {
    const max = Math.max(...Object.values(patterns));
    const primary = Object.entries(patterns).find(([key, value]) => value === max);
    return primary ? primary[0] : 'mixed';
  }

  analyzeStructuralPatterns() {
    return {
      nesting: this.analyzeNestingDepth(),
      containers: this.analyzeContainerPatterns(),
      grids: this.analyzeGridPatterns(),
      lists: this.analyzeListPatterns()
    };
  }

  analyzeNestingDepth() {
    let maxDepth = 0;
    let avgDepth = 0;
    let totalElements = 0;

    const calculateDepth = (element, depth = 0) => {
      maxDepth = Math.max(maxDepth, depth);
      avgDepth += depth;
      totalElements++;

      Array.from(element.children).forEach(child => {
        calculateDepth(child, depth + 1);
      });
    };

    calculateDepth(document.body);

    return {
      max: maxDepth,
      average: totalElements > 0 ? avgDepth / totalElements : 0
    };
  }

  analyzeContainerPatterns() {
    const containers = document.querySelectorAll('.container, .wrapper, .content, .main');
    return {
      count: containers.length,
      types: Array.from(containers).map(c => Array.from(c.classList))
    };
  }

  analyzeGridPatterns() {
    const gridElements = document.querySelectorAll('[class*="grid"], [class*="col"], [class*="row"]');
    return {
      hasGridSystem: gridElements.length > 0,
      gridCount: gridElements.length,
      hasFlexbox: !!document.querySelector('[style*="flex"], [class*="flex"]')
    };
  }

  analyzeListPatterns() {
    return {
      unorderedLists: document.querySelectorAll('ul').length,
      orderedLists: document.querySelectorAll('ol').length,
      definitionLists: document.querySelectorAll('dl').length,
      customLists: document.querySelectorAll('[class*="list"]').length
    };
  }

  analyzeDataPatterns() {
    return {
      tables: this.analyzeTableStructure(),
      forms: this.analyzeFormStructure(),
      media: this.analyzeMediaElements()
    };
  }

  analyzeTableStructure() {
    const tables = document.querySelectorAll('table');
    return {
      count: tables.length,
      structured: Array.from(tables).filter(t => 
        t.querySelector('thead') && t.querySelector('tbody')
      ).length
    };
  }

  analyzeFormStructure() {
    const forms = document.querySelectorAll('form');
    return {
      count: forms.length,
      totalInputs: document.querySelectorAll('input, select, textarea').length
    };
  }

  analyzeMediaElements() {
    return {
      images: document.querySelectorAll('img').length,
      videos: document.querySelectorAll('video').length,
      audio: document.querySelectorAll('audio').length
    };
  }

  analyzeNamingConventions() {
    const allClasses = [];
    document.querySelectorAll('[class]').forEach(el => {
      allClasses.push(...Array.from(el.classList));
    });

    const unique = [...new Set(allClasses)];
    
    return {
      totalUnique: unique.length,
      averageLength: unique.reduce((sum, cls) => sum + cls.length, 0) / unique.length,
      prefixes: this.findCommonPrefixes(unique),
      suffixes: this.findCommonSuffixes(unique)
    };
  }

  findCommonSuffixes(classes) {
    const suffixCounts = {};
    
    classes.forEach(cls => {
      if (cls.includes('-') || cls.includes('_')) {
        const parts = cls.split(/[-_]/);
        if (parts.length > 1) {
          const suffix = parts[parts.length - 1];
          if (suffix.length > 1) {
            suffixCounts[suffix] = (suffixCounts[suffix] || 0) + 1;
          }
        }
      }
    });

    return Object.entries(suffixCounts)
      .filter(([suffix, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([suffix, count]) => ({ suffix, count }));
  }

  analyzeSelectorQuality() {
    const selectors = this.generateSelectorCandidates();
    
    return {
      totalCandidates: selectors.length,
      highQuality: selectors.filter(s => s.reliability >= 70).length,
      mediumQuality: selectors.filter(s => s.reliability >= 40 && s.reliability < 70).length,
      lowQuality: selectors.filter(s => s.reliability < 40).length,
      bestSelector: selectors[0] || null
    };
  }

  /**
   * Extract data using provided selectors
   */
  async extractWithSelectors(message) {
    try {
      const { selectors, userInput, options } = message;
      
      let data = [];
      
      if (selectors && selectors.primary) {
        // Try primary selector first
        try {
          const elements = document.querySelectorAll(selectors.primary.selector || selectors.primary);
          data = this.extractDataFromElements(elements, userInput.domain);
        } catch (error) {
          console.warn('[DataExtractor] Primary selector failed:', error);
        }
        
        // Try fallbacks if primary failed or returned no data
        if (data.length === 0 && selectors.fallbacks) {
          for (const fallback of selectors.fallbacks) {
            try {
              const selector = fallback.selector || fallback;
              const elements = document.querySelectorAll(selector);
              if (elements.length > 0) {
                data = this.extractDataFromElements(elements, userInput.domain);
                if (data.length > 0) break;
              }
            } catch (error) {
              console.warn('[DataExtractor] Fallback selector failed:', error);
            }
          }
        }
      }
      
      // Final fallback to domain-specific extraction
      if (data.length === 0) {
        data = await this.extractGenericData({ domain: userInput.domain });
      }

      return {
        success: true,
        data,
        metadata: {
          url: window.location.href,
          timestamp: Date.now(),
          selectorUsed: selectors?.primary || 'generic',
          itemCount: data.length
        }
      };

    } catch (error) {
      console.error('[DataExtractor] Selector-based extraction failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  extractDataFromElements(elements, domain) {
    const data = [];
    
    Array.from(elements).forEach((element, index) => {
      let item = {};
      
      // Extract based on domain
      switch (domain) {
        case 'maritime':
          item = this.extractMaritimeItem(element);
          break;
        case 'luxury':
          item = this.extractLuxuryItem(element);
          break;
        case 'realestate':
          item = this.extractRealEstateItem(element);
          break;
        case 'financial':
          item = this.extractFinancialItem(element);
          break;
        default:
          item = this.extractGenericItem(element);
      }
      
      if (Object.keys(item).length > 1) { // More than just index
        item._index = index;
        data.push(item);
      }
    });
    
    return data;
  }

  extractMaritimeItem(element) {
    return {
      name: this.extractText(element, '.name, .vessel-name, .ship-name, [title*="name"]'),
      imo: this.extractText(element, '.imo, [title*="IMO"], [data-imo]'),
      type: this.extractText(element, '.type, .vessel-type, .ship-type'),
      flag: this.extractText(element, '.flag, .country, .nation'),
      status: this.extractText(element, '.status, .state, [title*="status"]')
    };
  }

  extractLuxuryItem(element) {
    return {
      name: this.extractText(element, '.name, .title, h1, h2, h3, [title]'),
      brand: this.extractText(element, '.brand, .designer, .manufacturer'),
      price: this.extractPrice(element, '.price, .cost, .amount, [class*="price"]'),
      availability: this.extractAvailability(element)
    };
  }

  extractRealEstateItem(element) {
    return {
      address: this.extractText(element, '.address, .location, .street'),
      price: this.extractPrice(element, '.price, .cost, .amount'),
      bedrooms: this.extractNumber(element, '.beds, .bedrooms, [title*="bed"]'),
      bathrooms: this.extractNumber(element, '.baths, .bathrooms, [title*="bath"]')
    };
  }

  extractFinancialItem(element) {
    return {
      symbol: this.extractText(element, '.symbol, .ticker, [data-symbol]'),
      name: this.extractText(element, '.name, .company, .title'),
      price: this.extractNumber(element, '.price, .quote, .value'),
      change: this.extractNumber(element, '.change, .delta, .diff')
    };
  }

  extractGenericItem(element) {
    const item = {};
    const text = element.textContent.trim();
    
    if (text) {
      item.text = text.substring(0, 200); // Limit text length
    }
    
    const link = element.querySelector('a[href]');
    if (link) {
      item.url = this.resolveUrl(link.getAttribute('href'));
    }
    
    const img = element.querySelector('img[src]');
    if (img) {
      item.image = this.resolveUrl(img.getAttribute('src'));
    }
    
    return item;
  }
}

// Initialize data extractor
const dataExtractor = new DataExtractor();
dataExtractor.init();

// Make available globally
window.dataExtractor = dataExtractor;