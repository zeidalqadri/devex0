/**
 * Structure Agent - Entry Point for Functional Architecture
 * Receives user input and performs initial page analysis
 */

export class StructureAgent {
  constructor() {
    this.isInitialized = false;
    this.analysisCache = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[StructureAgent] Initializing...');
    this.isInitialized = true;
  }

  /**
   * Main entry point - receives user input and triggers analysis
   * @param {Object} userInput - User preferences from popup
   * @param {string} userInput.mode - Extraction mode (smart, html, text, console)
   * @param {string} userInput.selector - Manual CSS selector (optional)
   * @param {string} userInput.url - Target URL
   * @param {Object} userInput.options - Additional options
   */
  async processUserRequest(userInput) {
    try {
      console.log('[StructureAgent] Processing user request:', userInput);

      // Validate input
      if (!userInput.url) {
        throw new Error('URL is required');
      }

      // Use DOM data if provided (from enhanced smart extraction)
      if (userInput.domData) {
        console.log('[StructureAgent] Using provided DOM data');
        const analysis = this.createAnalysisFromDOMData(userInput);
        return this.enhanceWithUserInput(analysis, userInput);
      }

      // Check cache first
      const cacheKey = this.generateCacheKey(userInput.url, userInput.mode);
      if (this.analysisCache.has(cacheKey)) {
        console.log('[StructureAgent] Using cached analysis');
        const cachedAnalysis = this.analysisCache.get(cacheKey);
        return this.enhanceWithUserInput(cachedAnalysis, userInput);
      }

      // Perform fresh analysis (fallback mode)
      const analysis = await this.analyzePageStructure(userInput);
      
      // Cache the analysis
      this.analysisCache.set(cacheKey, analysis);
      
      // Enhance with user input
      const enhancedAnalysis = this.enhanceWithUserInput(analysis, userInput);
      
      console.log('[StructureAgent] Analysis complete:', enhancedAnalysis);
      return enhancedAnalysis;

    } catch (error) {
      console.error('[StructureAgent] Processing failed:', error);
      throw error;
    }
  }

  createAnalysisFromDOMData(userInput) {
    const { domData, url, mode } = userInput;
    
    return {
      url,
      mode,
      timestamp: Date.now(),
      pageInfo: domData.pageInfo,
      complexity: this.assessComplexityFromData(domData.pageInfo),
      framework: this.detectFrameworkFromData(domData.pageInfo),
      contentTypes: this.identifyContentTypesFromData(domData),
      extractionTargets: domData.extractionTargets || [],
      recommendedSelectors: this.generateSelectorsFromDOMData(domData),
      navigationElements: domData.navigationElements || {},
      recommendedStrategy: this.recommendStrategyFromData(domData),
      classAnalysis: domData.classAnalysis,
      selectorCandidates: domData.selectorCandidates,
      contentStructure: domData.contentStructure
    };
  }

  assessComplexityFromData(pageInfo) {
    let score = 0;
    
    if (pageInfo.isSPA) score += 3;
    if (pageInfo.hasInfiniteScroll) score += 2;
    if (pageInfo.hasLazyLoading) score += 2;
    if (pageInfo.totalElements > 1000) score += 2;
    if (pageInfo.formCount > 3) score += 1;
    
    if (score <= 2) return 'simple';
    if (score <= 5) return 'medium';
    return 'complex';
  }

  detectFrameworkFromData(pageInfo) {
    // This would be detected in content script and passed through
    return pageInfo.framework || 'unknown';
  }

  identifyContentTypesFromData(domData) {
    const types = [];
    const { pageInfo, contentStructure } = domData;
    
    if (pageInfo.tableCount > 0) types.push('tables');
    if (pageInfo.listCount > 3) types.push('lists');
    if (contentStructure?.hasHeader) types.push('header');
    if (contentStructure?.hasNav) types.push('navigation');
    if (contentStructure?.hasFooter) types.push('footer');
    
    return types;
  }

  generateSelectorsFromDOMData(domData) {
    const recommendations = [];
    
    // Use high-quality selector candidates
    if (domData.selectorCandidates) {
      domData.selectorCandidates
        .filter(candidate => candidate.reliability >= 70)
        .slice(0, 5)
        .forEach(candidate => {
          recommendations.push(candidate.selector);
        });
    }
    
    // Use extraction target selectors
    if (domData.extractionTargets) {
      domData.extractionTargets.forEach(target => {
        if (target.selectors && target.selectors.length > 0) {
          recommendations.push(target.selectors[0].selector);
        }
      });
    }
    
    // Add fallback selectors
    if (recommendations.length === 0) {
      recommendations.push('body', 'main', '#main', '.content');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  recommendStrategyFromData(domData) {
    const complexity = this.assessComplexityFromData(domData.pageInfo);
    const hasTargets = domData.extractionTargets && domData.extractionTargets.length > 0;
    const hasNavigation = domData.navigationElements?.pagination || domData.navigationElements?.infiniteScroll;
    
    if (complexity === 'simple' && hasTargets && !hasNavigation) {
      return 'single-agent-dom';
    }
    
    if (complexity === 'medium' || (hasTargets && hasNavigation)) {
      return 'multi-agent-coordinated';
    }
    
    if (complexity === 'complex' || hasNavigation) {
      return 'intelligent-multi-agent';
    }
    
    return 'single-agent-dom';
  }

  async analyzePageStructure(userInput) {
    const { url, mode } = userInput;
    
    // Get page content and structure
    const pageInfo = await this.getPageInfo();
    
    // Perform different levels of analysis based on mode
    let analysis = {
      url,
      mode,
      timestamp: Date.now(),
      pageInfo,
      complexity: this.assessComplexity(pageInfo),
      framework: this.detectFramework(),
      contentTypes: this.identifyContentTypes(),
      extractionTargets: [],
      recommendedStrategy: null
    };

    // Mode-specific analysis
    switch (mode) {
      case 'smart':
        analysis = await this.performSmartAnalysis(analysis);
        break;
      case 'html':
      case 'text':
        analysis = await this.performSimpleAnalysis(analysis);
        break;
      case 'console':
        analysis = await this.performConsoleAnalysis(analysis);
        break;
      default:
        analysis = await this.performSmartAnalysis(analysis);
    }

    return analysis;
  }

  async getPageInfo() {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      hasJavaScript: this.hasJavaScript(),
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

  async performSmartAnalysis(analysis) {
    // Identify data patterns and extraction targets
    analysis.extractionTargets = this.identifyExtractionTargets();
    
    // Assess page complexity for strategy planning
    analysis.extractionComplexity = this.assessExtractionComplexity(analysis);
    
    // Generate initial selector recommendations
    analysis.recommendedSelectors = this.generateSelectorRecommendations();
    
    // Identify pagination and navigation
    analysis.navigationElements = this.identifyNavigationElements();
    
    // Recommend extraction strategy
    analysis.recommendedStrategy = this.recommendExtractionStrategy(analysis);
    
    return analysis;
  }

  async performSimpleAnalysis(analysis) {
    // Basic DOM structure analysis for simple extraction modes
    analysis.domStructure = {
      hasHeader: !!document.querySelector('header, .header, #header'),
      hasMain: !!document.querySelector('main, .main, #main'),
      hasFooter: !!document.querySelector('footer, .footer, #footer'),
      contentArea: this.identifyMainContentArea()
    };
    
    analysis.recommendedStrategy = 'simple-dom';
    return analysis;
  }

  async performConsoleAnalysis(analysis) {
    // Check for existing console logs
    analysis.consoleInfo = {
      hasConsoleHook: !!window.__devex_console_hooked,
      logCount: window.__devex_console_logs?.length || 0,
      hasErrors: this.hasJavaScriptErrors()
    };
    
    analysis.recommendedStrategy = 'console-extraction';
    return analysis;
  }

  enhanceWithUserInput(analysis, userInput) {
    return {
      ...analysis,
      userInput: {
        mode: userInput.mode,
        manualSelector: userInput.selector,
        options: userInput.options || {}
      },
      finalSelectors: this.processSelectorInput(analysis, userInput.selector),
      executionPlan: this.createExecutionPlan(analysis, userInput)
    };
  }

  processSelectorInput(analysis, manualSelector) {
    if (manualSelector && manualSelector.trim()) {
      // User provided manual selector - validate and use
      const isValid = this.validateSelector(manualSelector);
      return {
        primary: manualSelector,
        isManual: true,
        isValid,
        fallbacks: isValid ? analysis.recommendedSelectors || [] : []
      };
    } else {
      // Use generated selectors
      return {
        primary: analysis.recommendedSelectors?.[0] || 'body',
        isManual: false,
        isValid: true,
        fallbacks: analysis.recommendedSelectors?.slice(1) || []
      };
    }
  }

  createExecutionPlan(analysis, userInput) {
    const plan = {
      strategy: analysis.recommendedStrategy,
      complexity: analysis.extractionComplexity || 'simple',
      estimatedAgents: this.estimateRequiredAgents(analysis),
      estimatedTime: this.estimateExtractionTime(analysis),
      requiresVision: this.shouldUseVision(analysis, userInput),
      requiresNavigation: this.requiresNavigation(analysis),
      outputFormat: this.determineOutputFormat(userInput)
    };

    return plan;
  }

  // Analysis Helper Methods
  assessComplexity(pageInfo) {
    let score = 0;
    
    if (pageInfo.isSPA) score += 3;
    if (pageInfo.hasInfiniteScroll) score += 2;
    if (pageInfo.hasLazyLoading) score += 2;
    if (pageInfo.totalElements > 1000) score += 2;
    if (pageInfo.formCount > 3) score += 1;
    
    if (score <= 2) return 'simple';
    if (score <= 5) return 'medium';
    return 'complex';
  }

  detectFramework() {
    if (window.React || document.querySelector('[data-reactroot]')) return 'react';
    if (window.Vue || document.querySelector('[data-server-rendered]')) return 'vue';
    if (window.angular || document.querySelector('[ng-app]')) return 'angular';
    if (document.querySelector('script[src*="jquery"]')) return 'jquery';
    return 'vanilla';
  }

  identifyContentTypes() {
    const types = [];
    
    if (document.querySelectorAll('table').length > 0) types.push('tables');
    if (document.querySelectorAll('ul, ol').length > 3) types.push('lists');
    if (document.querySelectorAll('.product, .item, .card').length > 0) types.push('cards');
    if (document.querySelectorAll('article, .article').length > 0) types.push('articles');
    if (document.querySelectorAll('form').length > 0) types.push('forms');
    
    return types;
  }

  identifyExtractionTargets() {
    const targets = [];
    
    // Common data patterns
    const patterns = [
      { name: 'products', selectors: ['.product', '.item', '[data-testid*="product"]'] },
      { name: 'listings', selectors: ['.listing', '.result', '.entry'] },
      { name: 'articles', selectors: ['article', '.article', '.post'] },
      { name: 'cards', selectors: ['.card', '.tile', '.box'] },
      { name: 'rows', selectors: ['table tr', '.row', '.line-item'] }
    ];

    patterns.forEach(pattern => {
      let totalElements = 0;
      const matchingSelectors = [];
      
      pattern.selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          totalElements += elements.length;
          matchingSelectors.push({ selector, count: elements.length });
        }
      });

      if (totalElements > 0) {
        targets.push({
          type: pattern.name,
          totalCount: totalElements,
          selectors: matchingSelectors
        });
      }
    });

    return targets;
  }

  generateSelectorRecommendations() {
    const recommendations = [];
    
    // Find repeating patterns
    const repeatPatterns = this.findRepeatingPatterns();
    recommendations.push(...repeatPatterns);
    
    // Add fallback selectors
    if (recommendations.length === 0) {
      recommendations.push('body', 'main', '#main', '.content');
    }
    
    return recommendations.filter(Boolean);
  }

  findRepeatingPatterns() {
    const patterns = [];
    
    // Look for common repeated class patterns
    const elements = document.querySelectorAll('[class]');
    const classFrequency = new Map();
    
    elements.forEach(el => {
      const classes = el.className.split(' ');
      classes.forEach(cls => {
        if (cls.trim()) {
          classFrequency.set(cls, (classFrequency.get(cls) || 0) + 1);
        }
      });
    });
    
    // Find classes that appear multiple times (likely data containers)
    for (const [className, count] of classFrequency.entries()) {
      if (count >= 3 && count <= 50) { // Sweet spot for data items
        patterns.push(`.${className}`);
      }
    }
    
    return patterns.slice(0, 5); // Top 5 patterns
  }

  // Utility Methods
  hasJavaScript() {
    return document.querySelectorAll('script').length > 0;
  }

  isSinglePageApp() {
    return !!(window.history?.pushState && 
             (window.React || window.Vue || window.angular));
  }

  hasInfiniteScroll() {
    return document.querySelector('[class*="infinite"], [class*="scroll"], [data-infinite]') !== null;
  }

  hasLazyLoading() {
    return document.querySelector('img[loading="lazy"], [class*="lazy"]') !== null;
  }

  hasJavaScriptErrors() {
    // This would need to be implemented with error tracking
    return false;
  }

  validateSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  identifyMainContentArea() {
    const candidates = [
      'main', '.main', '#main',
      '.content', '#content', '.container',
      'article', '.article', '.post-content'
    ];
    
    for (const candidate of candidates) {
      const el = document.querySelector(candidate);
      if (el) return candidate;
    }
    
    return 'body';
  }

  identifyNavigationElements() {
    const nav = {
      pagination: document.querySelectorAll('.pagination, .pager, [class*="page"]').length > 0,
      loadMore: document.querySelectorAll('[class*="load"], [class*="more"]').length > 0,
      infiniteScroll: this.hasInfiniteScroll()
    };
    
    return nav;
  }

  recommendExtractionStrategy(analysis) {
    const { complexity, extractionTargets, navigationElements } = analysis;
    
    if (complexity === 'simple' && extractionTargets.length <= 1) {
      return 'single-agent-dom';
    }
    
    if (complexity === 'medium' || extractionTargets.length > 1) {
      return 'multi-agent-coordinated';
    }
    
    if (complexity === 'complex' || navigationElements.infiniteScroll) {
      return 'intelligent-multi-agent';
    }
    
    return 'single-agent-dom';
  }

  estimateRequiredAgents(analysis) {
    const base = 1; // Structure agent (this one)
    let additional = 0;
    
    if (analysis.recommendedStrategy === 'multi-agent-coordinated') additional = 2;
    if (analysis.recommendedStrategy === 'intelligent-multi-agent') additional = 4;
    
    return base + additional;
  }

  estimateExtractionTime(analysis) {
    const baseTime = 1000; // 1 second
    let multiplier = 1;
    
    if (analysis.complexity === 'medium') multiplier = 2;
    if (analysis.complexity === 'complex') multiplier = 4;
    
    return baseTime * multiplier;
  }

  shouldUseVision(analysis, userInput) {
    return userInput.mode === 'smart' && 
           !userInput.selector && 
           analysis.complexity === 'complex';
  }

  requiresNavigation(analysis) {
    return analysis.navigationElements?.pagination || 
           analysis.navigationElements?.infiniteScroll;
  }

  determineOutputFormat(userInput) {
    return userInput.options?.format || 'json';
  }

  generateCacheKey(url, mode) {
    return `${url}_${mode}_${Date.now() - (Date.now() % 300000)}`; // 5-minute cache
  }

  clearCache() {
    this.analysisCache.clear();
    console.log('[StructureAgent] Cache cleared');
  }
}