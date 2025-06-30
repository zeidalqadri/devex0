/**
 * Site Analyzer Content Script
 * Analyzes webpage structure and identifies extraction targets
 */

class SiteAnalyzer {
  constructor() {
    this.analysis = null;
    this.isInitialized = false;
  }

  init() {
    if (this.isInitialized) return;
    
    console.log('[SiteAnalyzer] Initializing on:', window.location.href);
    this.isInitialized = true;
    
    // Setup message listener
    this.setupMessageListener();
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      console.log('[SiteAnalyzer] Received message:', message.action);
      
      // Check extension context validity before processing
      if (!this.isExtensionContextValid()) {
        console.warn('[SiteAnalyzer] Extension context invalidated - ignoring message');
        return;
      }
      
      // Handle PING requests for readiness check
      if (message.action === 'PING') {
        sendResponse({ success: true, service: 'site-analyzer', ready: true });
        return;
      }
      
      // Handle site analysis requests
      if (message.action === 'ANALYZE_SITE') {
        this.analyzeSite(message.data).then(sendResponse);
        return true; // Async response
      } 
      
      // Handle enhanced DOM analysis for smart extraction
      else if (message.action === 'ENHANCED_DOM_ANALYSIS') {
        this.enhancedDOMAnalysis(message.userInput).then(sendResponse);
        return true; // Async response
      }
      
      // Handle reconnaissance structure analysis
      else if (message.action === 'RECON_STRUCTURE_ANALYSIS') {
        this.reconnaissanceStructureAnalysis(message.data).then(sendResponse);
        return true; // Async response
      }
      
      // Handle pattern analysis for reconnaissance
      else if (message.action === 'ANALYZE_PATTERNS') {
        this.analyzePatterns(message.executionPlan).then(sendResponse);
        return true; // Async response
      }
    });
  }

  async analyzeSite(options = {}) {
    try {
      console.log('[SiteAnalyzer] Starting site analysis...');
      
      const analysis = {
        url: window.location.href,
        title: document.title,
        domain: this.identifyDomain(),
        structure: this.analyzeStructure(),
        dataRegions: this.identifyDataRegions(),
        extractionTargets: this.identifyExtractionTargets(),
        interactionElements: this.identifyInteractionElements(),
        metadata: this.extractMetadata(),
        timestamp: Date.now()
      };

      this.analysis = analysis;
      
      console.log('[SiteAnalyzer] Analysis complete:', analysis);
      return { success: true, analysis };

    } catch (error) {
      console.error('[SiteAnalyzer] Analysis failed:', error);
      return { success: false, error: error.message };
    }
  }

  identifyDomain() {
    // Return generic domain type - let content analysis determine the actual domain context
    // This removes hardcoded domain assumptions and allows the system to be versatile
    return 'generic';
  }

  analyzeStructure() {
    const structure = {
      hasHeader: !!document.querySelector('header, .header, #header'),
      hasNavigation: !!document.querySelector('nav, .nav, .navigation'),
      hasMain: !!document.querySelector('main, .main, #main'),
      hasSidebar: !!document.querySelector('aside, .sidebar, .side-bar'),
      hasFooter: !!document.querySelector('footer, .footer, #footer'),
      tables: document.querySelectorAll('table').length,
      lists: document.querySelectorAll('ul, ol').length,
      forms: document.querySelectorAll('form').length,
      totalElements: document.querySelectorAll('*').length
    };

    return structure;
  }

  identifyDataRegions() {
    const regions = [];
    
    // Look for common data container patterns
    const selectors = [
      'table tbody tr',
      '.product, .item, .listing',
      '.card, .result, .entry',
      '[data-testid*="item"], [data-testid*="product"]',
      '.vessel, .ship, .container',
      '.property, .listing, .home'
    ];

    selectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        regions.push({
          selector,
          count: elements.length,
          sample: this.extractSampleData(elements[0])
        });
      }
    });

    return regions;
  }

  identifyExtractionTargets() {
    const targets = [];
    
    // Common extraction target patterns
    const patterns = [
      { name: 'titles', selectors: ['h1', 'h2', 'h3', '.title', '.name', '.heading'] },
      { name: 'prices', selectors: ['.price', '.cost', '.amount', '[class*="price"]'] },
      { name: 'descriptions', selectors: ['.description', '.desc', '.summary', '.content'] },
      { name: 'links', selectors: ['a[href]'] },
      { name: 'images', selectors: ['img[src]'] },
      { name: 'dates', selectors: ['.date', '.time', '.timestamp', '[datetime]'] }
    ];

    patterns.forEach(pattern => {
      const elements = [];
      pattern.selectors.forEach(selector => {
        elements.push(...document.querySelectorAll(selector));
      });

      if (elements.length > 0) {
        targets.push({
          type: pattern.name,
          count: elements.length,
          selectors: pattern.selectors,
          samples: elements.slice(0, 3).map(el => this.extractElementData(el))
        });
      }
    });

    return targets;
  }

  identifyInteractionElements() {
    const interactions = [];
    
    // Pagination
    const paginationElements = document.querySelectorAll(
      '.pagination a, .pager a, [class*="page"] a, [aria-label*="page"]'
    );
    if (paginationElements.length > 0) {
      interactions.push({
        type: 'pagination',
        count: paginationElements.length,
        selectors: ['.pagination a', '.pager a']
      });
    }

    // Filters
    const filterElements = document.querySelectorAll(
      'select, input[type="checkbox"], input[type="radio"], .filter'
    );
    if (filterElements.length > 0) {
      interactions.push({
        type: 'filters',
        count: filterElements.length,
        selectors: ['select', 'input[type="checkbox"]', '.filter']
      });
    }

    // Load more buttons
    const loadMoreElements = document.querySelectorAll(
      '[class*="load"], [class*="more"], [class*="expand"]'
    );
    if (loadMoreElements.length > 0) {
      interactions.push({
        type: 'loadMore',
        count: loadMoreElements.length,
        selectors: ['[class*="load"]', '[class*="more"]']
      });
    }

    return interactions;
  }

  extractMetadata() {
    return {
      charset: document.characterSet,
      language: document.documentElement.lang,
      viewport: this.getMetaContent('viewport'),
      description: this.getMetaContent('description'),
      keywords: this.getMetaContent('keywords'),
      author: this.getMetaContent('author'),
      robots: this.getMetaContent('robots'),
      canonical: this.getLinkHref('canonical'),
      ogTitle: this.getMetaProperty('og:title'),
      ogDescription: this.getMetaProperty('og:description'),
      ogImage: this.getMetaProperty('og:image')
    };
  }

  getMetaContent(name) {
    const meta = document.querySelector(`meta[name="${name}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  getMetaProperty(property) {
    const meta = document.querySelector(`meta[property="${property}"]`);
    return meta ? meta.getAttribute('content') : null;
  }

  getLinkHref(rel) {
    const link = document.querySelector(`link[rel="${rel}"]`);
    return link ? link.getAttribute('href') : null;
  }

  extractSampleData(element) {
    if (!element) return null;

    const data = {
      tagName: element.tagName.toLowerCase(),
      className: element.className,
      id: element.id,
      textContent: element.textContent?.slice(0, 100),
      attributes: {}
    };

    // Extract useful attributes
    const attrs = ['href', 'src', 'alt', 'title', 'data-*'];
    for (const attr of element.attributes) {
      if (attrs.some(pattern => attr.name.match(pattern.replace('*', '.*')))) {
        data.attributes[attr.name] = attr.value;
      }
    }

    return data;
  }

  extractElementData(element) {
    return {
      text: element.textContent?.trim().slice(0, 50),
      tag: element.tagName.toLowerCase(),
      class: element.className,
      href: element.getAttribute('href'),
      src: element.getAttribute('src')
    };
  }

  getAnalysis() {
    return this.analysis;
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
        console.warn('[SiteAnalyzer] Extension context invalidated - cannot communicate with background');
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
            console.warn('[SiteAnalyzer] Background communication failed:', chrome.runtime.lastError.message);
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        });
      });
    } catch (error) {
      console.warn('[SiteAnalyzer] Failed to notify background:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enhanced DOM analysis for smart extraction
   * This bridges the gap between the extractor's analysis and site analyzer
   */
  async enhancedDOMAnalysis(userInput) {
    try {
      console.log('[SiteAnalyzer] Enhanced DOM analysis starting...');
      
      // Use the extractor's enhanced analysis if available
      if (window.dataExtractor && window.dataExtractor.enhancedDOMAnalysis) {
        console.log('[SiteAnalyzer] Using DataExtractor for enhanced analysis');
        return await window.dataExtractor.enhancedDOMAnalysis(userInput);
      }
      
      // Fallback to site analyzer's own analysis
      console.log('[SiteAnalyzer] Using SiteAnalyzer fallback analysis');
      const siteAnalysis = await this.analyzeSite();
      
      if (!siteAnalysis.success) {
        throw new Error('Site analysis failed');
      }
      
      // Convert site analysis to DOM data format expected by background
      const domData = this.convertSiteAnalysisToDOMData(siteAnalysis.analysis);
      
      return {
        success: true,
        domData
      };

    } catch (error) {
      console.error('[SiteAnalyzer] Enhanced DOM analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  convertSiteAnalysisToDOMData(analysis) {
    return {
      pageInfo: {
        title: analysis.title,
        url: analysis.url,
        domain: analysis.domain,
        hasJavaScript: !!document.querySelector('script'),
        isSPA: this.isSinglePageApp(),
        hasInfiniteScroll: this.hasInfiniteScroll(),
        totalElements: analysis.structure.totalElements,
        formCount: analysis.structure.forms,
        tableCount: analysis.structure.tables,
        listCount: analysis.structure.lists,
        hasLazyLoading: this.hasLazyLoading(),
        viewportSize: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        framework: this.detectFramework()
      },
      extractionTargets: this.convertExtractionTargets(analysis.extractionTargets),
      classAnalysis: this.analyzeClassStructure(),
      selectorCandidates: this.generateSelectorCandidates(),
      contentStructure: {
        hasHeader: analysis.structure.hasHeader,
        hasNav: analysis.structure.hasNavigation,
        hasMain: analysis.structure.hasMain,
        hasFooter: analysis.structure.hasFooter,
        hasSidebar: analysis.structure.hasSidebar,
        semanticElements: this.countSemanticElements()
      },
      navigationElements: this.identifyNavigationElements()
    };
  }

  convertExtractionTargets(targets) {
    return targets.map(target => ({
      type: target.type,
      totalCount: target.count,
      selectors: target.selectors.map(selector => ({
        selector,
        count: document.querySelectorAll(selector).length,
        reliability: this.assessSelectorReliability(selector)
      }))
    }));
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

  detectFramework() {
    if (window.React || document.querySelector('[data-reactroot]')) return 'react';
    if (window.Vue || document.querySelector('[data-server-rendered]')) return 'vue';
    if (window.angular || document.querySelector('[ng-app]')) return 'angular';
    if (document.querySelector('script[src*="jquery"]')) return 'jquery';
    return 'vanilla';
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
    
    // Find repeating class patterns
    const classFreq = {};
    document.querySelectorAll('[class]').forEach(el => {
      el.className.split(/\s+/).forEach(cls => {
        if (cls.trim()) {
          classFreq[cls] = (classFreq[cls] || 0) + 1;
        }
      });
    });

    // Convert to selector candidates
    Object.entries(classFreq)
      .filter(([cls, count]) => count >= 2 && count <= 50)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([cls, count]) => {
        candidates.push({
          selector: `.${cls}`,
          count,
          type: 'class',
          reliability: this.assessSelectorReliability(`.${cls}`)
        });
      });

    return candidates;
  }

  assessSelectorReliability(selector) {
    let score = 50;
    
    try {
      const elements = document.querySelectorAll(selector);
      const count = elements.length;
      
      if (count >= 2 && count <= 50) score += 20;
      if (count > 50) score -= 10;
      if (selector.includes('.')) score += 15;
      if (selector.includes('#')) score += 25;
      if (/article|section|header|footer|main/.test(selector)) score += 15;
      
    } catch (error) {
      score = 0;
    }
    
    return Math.max(0, Math.min(100, score));
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

  /**
   * Reconnaissance-specific structure analysis
   */
  async reconnaissanceStructureAnalysis(data) {
    try {
      console.log('[SiteAnalyzer] Running reconnaissance structure analysis...');
      
      // Perform comprehensive site analysis for reconnaissance
      const analysis = await this.analyzeSite({ 
        reconnaissance: true,
        includeMetadata: true,
        deepAnalysis: true
      });
      
      // Add reconnaissance-specific data
      analysis.reconContext = {
        targetDiscovery: this.identifyReconTargets(),
        extractionOpportunities: this.assessExtractionOpportunities(),
        complexityScore: this.calculateComplexityScore(),
        recommendedApproach: this.recommendExtractionApproach()
      };
      
      return {
        success: true,
        domData: analysis
      };
      
    } catch (error) {
      console.error('[SiteAnalyzer] Reconnaissance analysis failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze patterns for reconnaissance
   */
  async analyzePatterns(executionPlan) {
    try {
      console.log('[SiteAnalyzer] Analyzing patterns for reconnaissance...');
      
      const patterns = {
        namingConvention: this.detectNamingConvention(),
        commonPrefixes: this.findCommonPrefixes(this.getAllClasses()),
        selectorReliability: this.assessOverallReliability(),
        classPatterns: this.analyzeClassPatterns(),
        elementCounts: this.getElementCounts(),
        dataStructures: this.identifyDataStructures()
      };
      
      return {
        success: true,
        patterns: patterns
      };
      
    } catch (error) {
      console.error('[SiteAnalyzer] Pattern analysis failed:', error);
      return {
        success: false,
        error: error.message,
        patterns: {}
      };
    }
  }

  // Helper methods for reconnaissance

  identifyReconTargets() {
    const targets = [];
    
    // Look for common data patterns
    const tableTargets = this.findTableTargets();
    const listTargets = this.findListTargets();
    const cardTargets = this.findCardTargets();
    const productTargets = this.findProductTargets();
    
    targets.push(...tableTargets, ...listTargets, ...cardTargets, ...productTargets);
    
    return targets.slice(0, 10); // Top 10 targets
  }

  findTableTargets() {
    const tables = document.querySelectorAll('table');
    return Array.from(tables).map((table, index) => ({
      type: 'table',
      selector: this.generateSelectorForElement(table),
      elementCount: table.querySelectorAll('tr').length,
      confidence: 85,
      name: `Data Table ${index + 1}`
    })).filter(target => target.elementCount > 2);
  }

  findListTargets() {
    const lists = document.querySelectorAll('ul, ol');
    return Array.from(lists).map((list, index) => {
      const items = list.querySelectorAll('li');
      if (items.length >= 3) {
        return {
          type: 'list',
          selector: this.generateSelectorForElement(list),
          elementCount: items.length,
          confidence: 70,
          name: `Item List ${index + 1}`
        };
      }
    }).filter(Boolean);
  }

  findCardTargets() {
    const cardSelectors = ['.card', '.item', '.product', '.listing', '.tile'];
    const cardTargets = [];
    
    cardSelectors.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length >= 2) {
        cardTargets.push({
          type: 'card',
          selector: selector,
          elementCount: elements.length,
          confidence: 75,
          name: `Card Grid (${selector})`
        });
      }
    });
    
    return cardTargets;
  }

  findProductTargets() {
    const productIndicators = ['product', 'item', 'listing', 'price', 'buy'];
    const productTargets = [];
    
    productIndicators.forEach(indicator => {
      const elements = document.querySelectorAll(`[class*="${indicator}"]`);
      if (elements.length >= 2) {
        productTargets.push({
          type: 'product',
          selector: `[class*="${indicator}"]`,
          elementCount: elements.length,
          confidence: 60,
          name: `Product Elements (${indicator})`
        });
      }
    });
    
    return productTargets;
  }

  generateSelectorForElement(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) return `.${classes[0]}`;
    }
    return element.tagName.toLowerCase();
  }

  assessExtractionOpportunities() {
    return {
      tableData: document.querySelectorAll('table').length,
      listData: document.querySelectorAll('ul, ol').length,
      cardLayouts: document.querySelectorAll('.card, .item, .product').length,
      formData: document.querySelectorAll('form').length
    };
  }

  calculateComplexityScore() {
    let score = 1;
    
    if (document.querySelectorAll('*').length > 1000) score += 2;
    if (this.identifyFramework() !== 'vanilla') score += 2;
    if (document.querySelector('[data-reactroot], [data-server-rendered]')) score += 3;
    if (this.hasInfiniteScroll()) score += 2;
    
    return Math.min(10, score);
  }

  recommendExtractionApproach() {
    const complexity = this.calculateComplexityScore();
    const opportunities = this.assessExtractionOpportunities();
    
    if (complexity >= 7) return 'careful-analysis';
    if (opportunities.tableData > 0) return 'table-extraction';
    if (opportunities.cardLayouts > 5) return 'bulk-extraction';
    return 'selective-extraction';
  }

  detectNamingConvention() {
    const classes = this.getAllClasses();
    const patterns = this.analyzeNamingPatterns(classes);
    return patterns.primary;
  }

  getAllClasses() {
    const classes = [];
    document.querySelectorAll('[class]').forEach(el => {
      el.className.split(' ').forEach(cls => {
        if (cls.trim()) classes.push(cls.trim());
      });
    });
    return [...new Set(classes)];
  }

  assessOverallReliability() {
    const classes = this.getAllClasses();
    const patterns = this.analyzeNamingPatterns(classes);
    
    if (patterns.consistency > 0.8) return 'high';
    if (patterns.consistency > 0.5) return 'medium';
    return 'low';
  }

  analyzeClassPatterns() {
    const classes = this.getAllClasses();
    const frequency = {};
    
    classes.forEach(cls => {
      frequency[cls] = (frequency[cls] || 0) + 1;
    });
    
    return {
      totalUnique: classes.length,
      repeatingClasses: Object.entries(frequency)
        .filter(([cls, count]) => count > 1)
        .length,
      mostCommon: Object.entries(frequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
    };
  }

  getElementCounts() {
    return {
      total: document.querySelectorAll('*').length,
      divs: document.querySelectorAll('div').length,
      spans: document.querySelectorAll('span').length,
      links: document.querySelectorAll('a').length,
      images: document.querySelectorAll('img').length,
      inputs: document.querySelectorAll('input').length
    };
  }

  identifyDataStructures() {
    return {
      tables: document.querySelectorAll('table').length,
      lists: document.querySelectorAll('ul, ol').length,
      articles: document.querySelectorAll('article').length,
      sections: document.querySelectorAll('section').length,
      forms: document.querySelectorAll('form').length
    };
  }
}

// Initialize site analyzer
const siteAnalyzer = new SiteAnalyzer();
siteAnalyzer.init();

// Make available globally
window.siteAnalyzer = siteAnalyzer;