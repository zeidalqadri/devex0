/**
 * Target Discovery Engine - Identifies Valuable Extraction Targets
 * Analyzes site structure to find data-rich extraction opportunities
 */

export class TargetDiscoveryEngine {
  constructor() {
    this.isInitialized = false;
    this.domainPatterns = this.initializeDomainPatterns();
    this.genericPatterns = this.initializeGenericPatterns();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[TargetDiscovery] Initializing target discovery engine...');
    this.isInitialized = true;
  }

  /**
   * Find valuable extraction targets from site analysis
   * @param {Object} siteAnalysis - Results from Structure Agent analysis
   */
  async findValueTargets(siteAnalysis) {
    try {
      console.log('[TargetDiscovery] Analyzing site for valuable targets...');
      
      const targets = [];
      
      // 1. Domain-specific target discovery
      if (siteAnalysis.domainContext && siteAnalysis.domainContext.type !== 'unknown') {
        const domainTargets = await this.findDomainSpecificTargets(siteAnalysis);
        targets.push(...domainTargets);
      }
      
      // 2. Generic pattern discovery
      const genericTargets = await this.findGenericTargets(siteAnalysis);
      targets.push(...genericTargets);
      
      // 3. Structure-based discovery
      const structureTargets = await this.findStructureBasedTargets(siteAnalysis);
      targets.push(...structureTargets);
      
      // 4. Content-based discovery
      const contentTargets = await this.findContentBasedTargets(siteAnalysis);
      targets.push(...contentTargets);
      
      // 5. Remove duplicates and score targets
      const uniqueTargets = this.deduplicateTargets(targets);
      const scoredTargets = this.scoreTargets(uniqueTargets, siteAnalysis);
      
      // 6. Sort by value and return top targets
      const sortedTargets = scoredTargets
        .sort((a, b) => b.totalScore - a.totalScore)
        .slice(0, 10); // Top 10 targets
      
      console.log(`[TargetDiscovery] Found ${sortedTargets.length} valuable targets`);
      return sortedTargets;
      
    } catch (error) {
      console.error('[TargetDiscovery] Target discovery failed:', error);
      return [];
    }
  }

  /**
   * Find domain-specific targets based on site context
   */
  async findDomainSpecificTargets(siteAnalysis) {
    const { domainContext } = siteAnalysis;
    const targets = [];
    
    if (!domainContext || !this.domainPatterns[domainContext.type]) {
      return targets;
    }
    
    const patterns = this.domainPatterns[domainContext.type];
    
    for (const pattern of patterns) {
      const target = await this.evaluatePattern(pattern, siteAnalysis);
      if (target) {
        target.isDomainSpecific = true;
        target.domainRelevance = domainContext.confidence;
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Find generic data patterns regardless of domain
   */
  async findGenericTargets(siteAnalysis) {
    const targets = [];
    
    for (const pattern of this.genericPatterns) {
      const target = await this.evaluatePattern(pattern, siteAnalysis);
      if (target) {
        target.isDomainSpecific = false;
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Find targets based on page structure analysis
   */
  async findStructureBasedTargets(siteAnalysis) {
    const targets = [];
    
    // Table-based targets
    if (siteAnalysis.contentTypes?.includes('tables')) {
      const tableTargets = await this.findTableTargets(siteAnalysis);
      targets.push(...tableTargets);
    }
    
    // List-based targets
    if (siteAnalysis.contentTypes?.includes('lists')) {
      const listTargets = await this.findListTargets(siteAnalysis);
      targets.push(...listTargets);
    }
    
    // Card/grid-based targets
    if (siteAnalysis.contentTypes?.includes('cards')) {
      const cardTargets = await this.findCardTargets(siteAnalysis);
      targets.push(...cardTargets);
    }
    
    return targets;
  }

  /**
   * Find targets based on content analysis
   */
  async findContentBasedTargets(siteAnalysis) {
    const targets = [];
    
    // Form-based targets
    if (siteAnalysis.pageInfo?.formCount > 0) {
      const formTargets = await this.findFormTargets(siteAnalysis);
      targets.push(...formTargets);
    }
    
    // Article/content targets
    if (siteAnalysis.contentTypes?.includes('articles')) {
      const articleTargets = await this.findArticleTargets(siteAnalysis);
      targets.push(...articleTargets);
    }
    
    return targets;
  }

  /**
   * Evaluate a specific pattern against the site
   */
  async evaluatePattern(pattern, siteAnalysis) {
    try {
      let elementCount = 0;
      let bestSelector = null;
      let confidence = 0;
      
      // Test each selector in the pattern
      for (const selector of pattern.selectors) {
        const count = this.countElements(selector, siteAnalysis);
        if (count > elementCount) {
          elementCount = count;
          bestSelector = selector;
        }
      }
      
      // Check if pattern meets minimum criteria
      if (elementCount < pattern.minElements) {
        return null;
      }
      
      // Calculate confidence based on element count and pattern specificity
      confidence = Math.min(95, (elementCount * pattern.confidence) / pattern.maxElements * 100);
      
      // Create target object
      const target = {
        type: pattern.type,
        name: pattern.name,
        description: pattern.description,
        selector: bestSelector,
        estimatedItems: elementCount,
        confidence: Math.round(confidence),
        category: pattern.category,
        valueIndicators: pattern.valueIndicators || [],
        sampleData: await this.getSampleData(bestSelector, 3),
        extractionComplexity: pattern.complexity || 'medium',
        dataTypes: pattern.dataTypes || ['text'],
        isRepeating: elementCount > 1,
        hasStructuredData: this.hasStructuredData(bestSelector, siteAnalysis)
      };
      
      return target;
      
    } catch (error) {
      console.warn('[TargetDiscovery] Pattern evaluation failed:', error);
      return null;
    }
  }

  /**
   * Find table-based extraction targets
   */
  async findTableTargets(siteAnalysis) {
    const targets = [];
    const tableSelectors = ['table', '.table', '[role="table"]', '.data-table'];
    
    for (const selector of tableSelectors) {
      const count = this.countElements(selector, siteAnalysis);
      if (count > 0) {
        const target = {
          type: 'table',
          name: `Data Table (${selector})`,
          description: 'Structured tabular data',
          selector: selector,
          estimatedItems: this.countElements(selector + ' tr', siteAnalysis) - count, // Subtract header rows
          confidence: 85,
          category: 'structured-data',
          valueIndicators: ['tabular-structure', 'multiple-rows', 'consistent-columns'],
          extractionComplexity: 'low',
          dataTypes: ['text', 'numbers', 'links'],
          isRepeating: true,
          hasStructuredData: true
        };
        
        target.sampleData = await this.getSampleData(selector, 2);
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Find list-based extraction targets
   */
  async findListTargets(siteAnalysis) {
    const targets = [];
    const listSelectors = ['ul li', 'ol li', '.list-item', '.item'];
    
    for (const selector of listSelectors) {
      const count = this.countElements(selector, siteAnalysis);
      if (count >= 5) { // Minimum 5 items for valuable list
        const target = {
          type: 'list',
          name: `Item List (${selector})`,
          description: 'List of similar items',
          selector: selector,
          estimatedItems: count,
          confidence: 70,
          category: 'repeated-content',
          valueIndicators: ['repeated-structure', 'similar-content'],
          extractionComplexity: 'medium',
          dataTypes: ['text', 'links'],
          isRepeating: true,
          hasStructuredData: false
        };
        
        target.sampleData = await this.getSampleData(selector, 3);
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Find card/grid-based extraction targets
   */
  async findCardTargets(siteAnalysis) {
    const targets = [];
    const cardSelectors = ['.card', '.item', '.product', '.listing', '.tile', '.box'];
    
    for (const selector of cardSelectors) {
      const count = this.countElements(selector, siteAnalysis);
      if (count >= 3) { // Minimum 3 cards for valuable target
        const target = {
          type: 'card',
          name: `Card Grid (${selector})`,
          description: 'Card-based layout with similar items',
          selector: selector,
          estimatedItems: count,
          confidence: 75,
          category: 'grid-layout',
          valueIndicators: ['grid-structure', 'card-layout', 'similar-elements'],
          extractionComplexity: 'medium',
          dataTypes: ['text', 'images', 'links', 'prices'],
          isRepeating: true,
          hasStructuredData: false
        };
        
        target.sampleData = await this.getSampleData(selector, 2);
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Find form-based extraction targets
   */
  async findFormTargets(siteAnalysis) {
    const targets = [];
    const formSelectors = ['form', '.form', '[role="form"]'];
    
    for (const selector of formSelectors) {
      const count = this.countElements(selector, siteAnalysis);
      if (count > 0) {
        const inputCount = this.countElements(selector + ' input, ' + selector + ' select, ' + selector + ' textarea', siteAnalysis);
        
        if (inputCount >= 3) { // Forms with substantial data
          const target = {
            type: 'form',
            name: `Form Data (${selector})`,
            description: 'Form fields and structure',
            selector: selector,
            estimatedItems: inputCount,
            confidence: 60,
            category: 'interactive-elements',
            valueIndicators: ['form-fields', 'input-elements'],
            extractionComplexity: 'high',
            dataTypes: ['form-data', 'labels', 'validation'],
            isRepeating: false,
            hasStructuredData: true
          };
          
          target.sampleData = await this.getSampleData(selector, 1);
          targets.push(target);
        }
      }
    }
    
    return targets;
  }

  /**
   * Find article/content-based extraction targets
   */
  async findArticleTargets(siteAnalysis) {
    const targets = [];
    const articleSelectors = ['article', '.article', '.post', '.content', 'main'];
    
    for (const selector of articleSelectors) {
      const count = this.countElements(selector, siteAnalysis);
      if (count > 0) {
        const target = {
          type: 'article',
          name: `Article Content (${selector})`,
          description: 'Article or main content area',
          selector: selector,
          estimatedItems: count,
          confidence: 65,
          category: 'content',
          valueIndicators: ['main-content', 'article-structure'],
          extractionComplexity: 'low',
          dataTypes: ['text', 'headings', 'paragraphs'],
          isRepeating: false,
          hasStructuredData: false
        };
        
        target.sampleData = await this.getSampleData(selector, 1);
        targets.push(target);
      }
    }
    
    return targets;
  }

  /**
   * Remove duplicate targets and consolidate similar ones
   */
  deduplicateTargets(targets) {
    const unique = [];
    const selectorMap = new Map();
    
    for (const target of targets) {
      const key = target.selector;
      
      if (!selectorMap.has(key)) {
        selectorMap.set(key, target);
        unique.push(target);
      } else {
        // Merge with existing target if this one has higher confidence
        const existing = selectorMap.get(key);
        if (target.confidence > existing.confidence) {
          const index = unique.indexOf(existing);
          unique[index] = target;
          selectorMap.set(key, target);
        }
      }
    }
    
    return unique;
  }

  /**
   * Score targets based on multiple criteria
   */
  scoreTargets(targets, siteAnalysis) {
    return targets.map(target => {
      let score = 0;
      
      // Base confidence score (40% weight)
      score += (target.confidence / 100) * 40;
      
      // Item count score (20% weight) 
      const itemScore = Math.min(20, (target.estimatedItems / 10) * 20);
      score += itemScore;
      
      // Domain relevance score (20% weight)
      if (target.isDomainSpecific) {
        score += (target.domainRelevance / 100) * 20;
      } else {
        score += 10; // Generic targets get moderate domain score
      }
      
      // Structural quality score (10% weight)
      if (target.hasStructuredData) score += 5;
      if (target.isRepeating) score += 3;
      if (target.category === 'structured-data') score += 2;
      
      // Extraction complexity penalty (10% weight)
      if (target.extractionComplexity === 'low') score += 10;
      else if (target.extractionComplexity === 'medium') score += 5;
      else score += 0; // high complexity gets no bonus
      
      target.totalScore = Math.round(score);
      target.scoreBreakdown = {
        confidence: (target.confidence / 100) * 40,
        itemCount: itemScore,
        domainRelevance: target.isDomainSpecific ? (target.domainRelevance / 100) * 20 : 10,
        structuralQuality: (target.hasStructuredData ? 5 : 0) + (target.isRepeating ? 3 : 0) + (target.category === 'structured-data' ? 2 : 0),
        complexityBonus: target.extractionComplexity === 'low' ? 10 : (target.extractionComplexity === 'medium' ? 5 : 0)
      };
      
      return target;
    });
  }

  /**
   * Count elements matching a selector (via DOM service)
   */
  async countElements(selector, siteAnalysis) {
    // First check if we have cached data from site analysis
    if (siteAnalysis.extractionTargets) {
      for (const target of siteAnalysis.extractionTargets) {
        if (target.selectors) {
          for (const sel of target.selectors) {
            if (sel.selector === selector) {
              return sel.count || 0;
            }
          }
        }
      }
    }
    
    // If no cached data and we're in background context, request from DOM service
    if (typeof chrome !== 'undefined' && chrome.tabs && siteAnalysis.tabId) {
      try {
        const response = await chrome.tabs.sendMessage(siteAnalysis.tabId, {
          action: 'DOM_COUNT_ELEMENTS',
          data: { selector }
        });
        
        if (response && response.success) {
          return response.data || 0;
        }
      } catch (error) {
        console.warn('[TargetDiscovery] DOM service request failed:', error);
      }
    }
    
    // Fallback: estimate based on selector patterns
    return this.estimateElementCount(selector);
  }

  /**
   * Estimate element count based on selector patterns
   */
  estimateElementCount(selector) {
    if (selector.includes('#')) return 1; // ID selectors typically unique
    if (selector.includes('table')) return 3;
    if (selector.includes('.product') || selector.includes('.item')) return 12;
    if (selector.includes('li')) return 8;
    if (selector.includes('.card')) return 6;
    if (selector.includes('article')) return 2;
    if (selector.includes('form')) return 1;
    
    return 5; // Default estimate
  }

  /**
   * Check if selector targets structured data
   */
  hasStructuredData(selector, siteAnalysis) {
    const structuredIndicators = ['table', 'form', '[data-', '[itemscope', '[role='];
    return structuredIndicators.some(indicator => selector.includes(indicator));
  }

  /**
   * Get sample data from selector (placeholder implementation)
   */
  async getSampleData(selector, count = 3) {
    // In actual implementation, this would extract sample content via content script
    // For now, return placeholder data with selector information
    const samples = [];
    for (let i = 0; i < count; i++) {
      samples.push(`Sample ${i + 1} from ${selector}`);
    }
    return samples;
  }

  /**
   * Initialize configurable domain patterns
   * These patterns are based on content indicators rather than hardcoded domains
   */
  initializeDomainPatterns() {
    return {
      // Content-based patterns that can apply to any domain
      commerce: [
        {
          type: 'product-grid',
          name: 'Product Grid',
          description: 'Grid of products or items',
          selectors: ['.product', '.item', '[data-product]', '.listing', '.card'],
          minElements: 4,
          maxElements: 100,
          confidence: 85,
          category: 'commerce-products',
          complexity: 'medium',
          valueIndicators: ['product-images', 'prices', 'titles', 'descriptions'],
          dataTypes: ['product-names', 'prices', 'images', 'descriptions', 'availability']
        },
        {
          type: 'product-details',
          name: 'Product Information',
          description: 'Detailed product or item information',
          selectors: ['.product-details', '.item-info', '.specs', '.details'],
          minElements: 3,
          maxElements: 20,
          confidence: 80,
          category: 'commerce-details',
          complexity: 'medium',
          valueIndicators: ['specifications', 'descriptions', 'features'],
          dataTypes: ['specifications', 'features', 'descriptions', 'metadata']
        }
      ],
      
      data: [
        {
          type: 'data-table',
          name: 'Data Table',
          description: 'Structured data in table format',
          selectors: ['table', '.table', '[role="table"]', '.data-table'],
          minElements: 2,
          maxElements: 50,
          confidence: 90,
          category: 'structured-data',
          complexity: 'low',
          valueIndicators: ['table-headers', 'data-rows', 'structured-content'],
          dataTypes: ['tabular-data', 'records', 'entries']
        },
        {
          type: 'data-cards',
          name: 'Data Cards',
          description: 'Information presented in card format',
          selectors: ['.card', '.item', '.entry', '.record'],
          minElements: 3,
          maxElements: 100,
          confidence: 75,
          category: 'card-data',
          complexity: 'medium',
          valueIndicators: ['card-headers', 'content-sections', 'structured-layout'],
          dataTypes: ['structured-content', 'metadata', 'descriptions']
        }
      ],
      
      content: [
        {
          type: 'article-list',
          name: 'Article List',
          description: 'List of articles or content items',
          selectors: ['article', '.article', '.post', '.content-item'],
          minElements: 2,
          maxElements: 50,
          confidence: 80,
          category: 'content',
          complexity: 'low',
          valueIndicators: ['titles', 'summaries', 'publication-dates'],
          dataTypes: ['titles', 'content', 'metadata', 'timestamps']
        }
      ]
    };
  }

  /**
   * Initialize generic patterns for any website
   */
  initializeGenericPatterns() {
    return [
      {
        type: 'data-table',
        name: 'Data Table',
        description: 'Generic data table with multiple rows',
        selectors: ['table', '.table', '[role="table"]'],
        minElements: 1,
        maxElements: 20,
        confidence: 80,
        category: 'structured-data',
        complexity: 'low',
        valueIndicators: ['multiple-rows', 'header-row', 'consistent-columns'],
        dataTypes: ['text', 'numbers', 'links']
      },
      {
        type: 'item-list',
        name: 'Item List',
        description: 'List of similar items',
        selectors: ['ul li', 'ol li', '.list-item'],
        minElements: 5,
        maxElements: 100,
        confidence: 70,
        category: 'list-data',
        complexity: 'medium',
        valueIndicators: ['repeated-structure', 'similar-content'],
        dataTypes: ['text', 'links']
      },
      {
        type: 'card-grid',
        name: 'Card Grid',
        description: 'Grid of cards or tiles',
        selectors: ['.card', '.tile', '.box', '.item'],
        minElements: 4,
        maxElements: 60,
        confidence: 75,
        category: 'grid-layout',
        complexity: 'medium',
        valueIndicators: ['grid-layout', 'card-structure'],
        dataTypes: ['text', 'images', 'links']
      },
      {
        type: 'form-data',
        name: 'Form Data',
        description: 'Form fields and labels',
        selectors: ['form', '.form'],
        minElements: 1,
        maxElements: 10,
        confidence: 60,
        category: 'form-data',
        complexity: 'high',
        valueIndicators: ['input-fields', 'labels', 'form-structure'],
        dataTypes: ['form-labels', 'input-types', 'validation-rules']
      },
      {
        type: 'content-article',
        name: 'Article Content',
        description: 'Main article or content area',
        selectors: ['article', '.article', '.content', 'main'],
        minElements: 1,
        maxElements: 5,
        confidence: 65,
        category: 'content',
        complexity: 'low',
        valueIndicators: ['main-content', 'article-structure'],
        dataTypes: ['text', 'headings', 'paragraphs']
      }
    ];
  }
}