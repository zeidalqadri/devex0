/**
 * Asset Selector Ranker
 * JavaScript implementation of the Python AssetSelectorRanker algorithm
 * Analyzes HTML content to extract and rank CSS selectors based on asset value
 */

class AssetSelectorRanker {
  constructor(htmlContent) {
    if (typeof htmlContent !== 'string') {
      throw new TypeError('htmlContent must be a string');
    }
    
    this.html = htmlContent;
    this.parser = new DOMParser();
    this.doc = this.parser.parseFromString(this.html, 'text/html');
    
    // Keywords with associated weights, tailored for e-commerce
    this.keywords = {
      'sku': 25, 'productid': 25, 'price': 20, 'pricing': 20, 'sale': 18, 'discount': 18,
      'inventory': 20, 'stock': 20, 'availability': 18, 'productcard': 20,
      'product': 15, 'item': 15, 'brand': 12, 'designer': 12, 'vendor': 10,
      'name': 10, 'title': 10, 'details': 8, 'info': 8, 'description': 8,
      'size': 10, 'color': 8, 'variant': 10, 'cart': 15, 'bag': 15,
      'checkout': 15, 'purchase': 15, 'add': 12, 'buy': 12,
      'list': 8, 'grid': 8, 'gallery': 7, 'image': 7, 'main': 5,
    };
    
    // Prioritized list of attributes for generating stable selectors
    this.STABLE_ATTRIBUTES = [
      'id', 'data-testid', 'data-product-id', 'data-sku', 'data-cy', 'data-test', 'name'
    ];
    
    // Blocklist of common, unhelpful CSS class prefixes or names
    this.CLASS_BLOCKLIST = ['ltr-', 's-'];
    
    this.rankedSelectors = [];
  }

  _getStableSelector(element) {
    if (!element || !element.tagName) {
      return null;
    }

    const tagName = element.tagName.toLowerCase();

    // Priority 1: A stable, unique identifier attribute
    for (const attr of this.STABLE_ATTRIBUTES) {
      const val = element.getAttribute(attr);
      if (val && /^[a-zA-Z][a-zA-Z0-9\-_.]*$/.test(val)) {
        return `${tagName}[${attr}='${val}']`;
      }
    }

    // Priority 2: A meaningful combination of classes, avoiding blocked ones
    const classList = element.classList;
    if (classList && classList.length > 0) {
      const classes = Array.from(classList)
        .filter(c => !this.CLASS_BLOCKLIST.some(prefix => c.startsWith(prefix)))
        .sort();
      
      if (classes.length > 0) {
        return `${tagName}.${classes.join('.')}`;
      }
    }
    
    return null;
  }

  _scoreElement(element) {
    let score = 0;

    // 1. Score based on attributes (id, class, data-*)
    let attrsText = '';
    const attributes = element.attributes;
    
    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      const attrName = attr.name;
      const attrValue = attr.value;
      
      // Join array values (like class) and normalize
      const attrText = attrValue.replace(/-/g, ' ').replace(/_/g, ' ');
      
      // Give higher weight to stable attributes
      const weight = this.STABLE_ATTRIBUTES.includes(attrName) ? 2.5 : 1.0;
      attrsText += ` ${attrName.replace('-', ' ')} ${attrText}`.repeat(Math.floor(weight));
    }

    attrsText = attrsText.toLowerCase();
    
    // Score attributes against keywords
    for (const [keyword, weight] of Object.entries(this.keywords)) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      if (regex.test(attrsText)) {
        score += weight;
      }
    }

    // 2. Score based on text content
    const textContent = element.textContent?.trim().toLowerCase() || '';
    if (textContent) {
      // Currency patterns
      if (/€|\$|£|usd|eur|gbp|myr/i.test(textContent)) {
        score += 25;
      }
      
      // Action patterns
      if (/add to bag|add to cart|buy now|add to wishlist/i.test(textContent)) {
        score += 30;
      }
      
      // Keyword matching in text (weaker signal)
      for (const [keyword, weight] of Object.entries(this.keywords)) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(textContent)) {
          score += weight * 0.5;
        }
      }
    }

    // 3. Structural & Microdata Scoring
    if (element.hasAttribute('itemprop')) {
      score += 20;
      const propValue = element.getAttribute('itemprop').toLowerCase();
      for (const [keyword, weight] of Object.entries(this.keywords)) {
        if (propValue.includes(keyword)) {
          score += weight * 1.5;
        }
      }
    }

    // JSON-LD scripts get extremely high value
    if (element.tagName.toLowerCase() === 'script' && 
        element.getAttribute('type') === 'application/ld+json') {
      score += 150;
    }
    
    return score;
  }

  _learnFromJsonLd() {
    const jsonLdScripts = this.doc.querySelectorAll('script[type="application/ld+json"]');
    const allSchemaKeys = new Set();
    
    const getAllKeys = (obj, keysSet) => {
      if (typeof obj === 'object' && obj !== null) {
        if (Array.isArray(obj)) {
          obj.forEach(item => getAllKeys(item, keysSet));
        } else {
          Object.entries(obj).forEach(([key, value]) => {
            const sanitizedKey = key.toLowerCase().replace(/[^a-z]/g, '');
            if (sanitizedKey) {
              keysSet.add(sanitizedKey);
            }
            getAllKeys(value, keysSet);
          });
        }
      }
    };

    jsonLdScripts.forEach(script => {
      if (script.textContent) {
        try {
          const data = JSON.parse(script.textContent);
          getAllKeys(data, allSchemaKeys);
        } catch (error) {
          // Ignore malformed JSON
        }
      }
    });

    console.log(`[AssetRanker] Discovered ${allSchemaKeys.size} potential keywords from JSON-LD schemas`);
    
    // Add new keywords with default weight
    allSchemaKeys.forEach(key => {
      if (!this.keywords[key]) {
        this.keywords[key] = 10;
      }
    });
  }

  _detectPagination() {
    const paginationIndicators = [
      // Common pagination selectors
      '.pagination', '.pager', '.page-numbers', '.page-nav',
      '[class*="pagination"]', '[class*="pager"]', '[class*="page"]',
      
      // Next/Previous buttons
      'a[href*="page"]', 'button[class*="next"]', 'button[class*="prev"]',
      '[aria-label*="next"]', '[aria-label*="previous"]', '[aria-label*="page"]',
      
      // Load more buttons
      '[class*="load-more"]', '[class*="show-more"]', '[class*="expand"]',
      'button[class*="more"]', 'a[class*="more"]',
      
      // Infinite scroll indicators
      '[class*="infinite"]', '[class*="endless"]', '[data-infinite]'
    ];

    const paginationData = {
      hasPagination: false,
      type: 'none',
      indicators: [],
      totalPages: null,
      currentPage: null,
      hasNext: false,
      hasPrev: false,
      hasLoadMore: false,
      hasInfiniteScroll: false
    };

    // Check for each type of pagination
    for (const selector of paginationIndicators) {
      const elements = this.doc.querySelectorAll(selector);
      if (elements.length > 0) {
        paginationData.hasPagination = true;
        paginationData.indicators.push({
          selector,
          count: elements.length,
          sampleText: elements[0].textContent?.trim().slice(0, 50) || ''
        });

        // Determine pagination type
        if (selector.includes('infinite') || selector.includes('endless')) {
          paginationData.hasInfiniteScroll = true;
          paginationData.type = 'infinite-scroll';
        } else if (selector.includes('more') || selector.includes('load') || selector.includes('expand')) {
          paginationData.hasLoadMore = true;
          if (paginationData.type === 'none') paginationData.type = 'load-more';
        } else if (selector.includes('page') || selector.includes('pagination')) {
          if (paginationData.type === 'none') paginationData.type = 'numbered';
        }
      }
    }

    // Try to extract current page and total pages
    const pageNumberElements = this.doc.querySelectorAll('[class*="current"], [class*="active"], [aria-current="page"]');
    if (pageNumberElements.length > 0) {
      const currentPageText = pageNumberElements[0].textContent?.trim();
      const pageNumber = parseInt(currentPageText);
      if (!isNaN(pageNumber)) {
        paginationData.currentPage = pageNumber;
      }
    }

    // Check for next/previous availability
    paginationData.hasNext = this.doc.querySelectorAll('a[href*="next"], button[class*="next"], [aria-label*="next"]').length > 0;
    paginationData.hasPrev = this.doc.querySelectorAll('a[href*="prev"], button[class*="prev"], [aria-label*="prev"]').length > 0;

    return paginationData;
  }

  rankSelectors() {
    console.log('[AssetRanker] Starting selector ranking analysis...');
    
    // Learn from JSON-LD schemas
    this._learnFromJsonLd();
    
    // Analyze all elements
    const selectorScores = new Map();
    const allElements = this.doc.querySelectorAll('*');
    
    for (const element of allElements) {
      const score = this._scoreElement(element);
      
      if (score > 15) { // Confidence threshold
        const selector = this._getStableSelector(element);
        if (selector) {
          if (!selectorScores.has(selector)) {
            selectorScores.set(selector, { score: 0, count: 0 });
          }
          
          const data = selectorScores.get(selector);
          data.score += score;
          data.count += 1;
        }
      }
    }

    // Calculate final scores and create ranking
    const finalRanks = [];
    for (const [selector, data] of selectorScores.entries()) {
      // Boost score based on repetition count (logarithmic boost)
      const finalScore = data.count > 0 ? 
        data.score * (1 + Math.log10(data.count)) : 
        data.score;
      
      finalRanks.push({
        selector,
        finalScore: Math.round(finalScore * 100) / 100,
        totalBaseScore: Math.round(data.score * 100) / 100,
        count: data.count,
        avgScore: Math.round((data.score / data.count) * 100) / 100
      });
    }
    
    // Sort by final score
    this.rankedSelectors = finalRanks.sort((a, b) => b.finalScore - a.finalScore);
    
    console.log(`[AssetRanker] Analysis complete. Found ${this.rankedSelectors.length} ranked selectors`);
    return this.rankedSelectors;
  }

  getTopSelectors(n = 25) {
    if (this.rankedSelectors.length === 0) {
      this.rankSelectors();
    }
    return this.rankedSelectors.slice(0, n);
  }

  getFullAnalysis(topN = 25) {
    const selectors = this.getTopSelectors(topN);
    const pagination = this._detectPagination();
    
    return {
      selectors,
      pagination,
      summary: {
        totalSelectorsFound: this.rankedSelectors.length,
        topSelectorsShown: Math.min(topN, this.rankedSelectors.length),
        hasPagination: pagination.hasPagination,
        paginationType: pagination.type,
        analysisDate: new Date().toISOString()
      }
    };
  }

  exportAnalysis(topN = 25) {
    const analysis = this.getFullAnalysis(topN);
    const lines = [];
    
    lines.push('='.repeat(60));
    lines.push(`DEVEX0 ASSET ANALYSIS - ${analysis.summary.analysisDate}`);
    lines.push('='.repeat(60));
    lines.push('');
    
    // Summary
    lines.push('SUMMARY:');
    lines.push(`- Total selectors analyzed: ${analysis.summary.totalSelectorsFound}`);
    lines.push(`- Top selectors shown: ${analysis.summary.topSelectorsShown}`);
    lines.push(`- Pagination detected: ${analysis.pagination.hasPagination ? 'Yes' : 'No'}`);
    if (analysis.pagination.hasPagination) {
      lines.push(`- Pagination type: ${analysis.pagination.type}`);
    }
    lines.push('');
    
    // Pagination details
    if (analysis.pagination.hasPagination) {
      lines.push('PAGINATION ANALYSIS:');
      lines.push(`- Type: ${analysis.pagination.type}`);
      lines.push(`- Has next page: ${analysis.pagination.hasNext}`);
      lines.push(`- Has previous page: ${analysis.pagination.hasPrev}`);
      lines.push(`- Has load more: ${analysis.pagination.hasLoadMore}`);
      lines.push(`- Has infinite scroll: ${analysis.pagination.hasInfiniteScroll}`);
      if (analysis.pagination.currentPage) {
        lines.push(`- Current page: ${analysis.pagination.currentPage}`);
      }
      lines.push('');
    }
    
    // Top selectors
    lines.push(`TOP ${topN} RANKED ASSET SELECTORS:`);
    lines.push('-'.repeat(60));
    
    analysis.selectors.forEach((item, index) => {
      lines.push(`${index + 1}. ${item.selector}`);
      lines.push(`   Score: ${item.finalScore} | Count: ${item.count} | Avg: ${item.avgScore}`);
      lines.push('');
    });
    
    return lines.join('\n');
  }
}

// Make available globally
if (typeof window !== 'undefined') {
  window.AssetSelectorRanker = AssetSelectorRanker;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AssetSelectorRanker;
}
