/**
 * Selector Agent - CSS Generation and Optimization
 * Receives structural analysis and generates robust selectors
 */

export class SelectorAgent {
  constructor() {
    this.isInitialized = false;
    this.selectorCache = new Map();
    this.performanceMetrics = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[SelectorAgent] Initializing...');
    this.isInitialized = true;
  }

  /**
   * Process structural analysis and generate optimal selectors
   * @param {Object} structuralAnalysis - Analysis from Structure Agent
   */
  async processStructuralAnalysis(structuralAnalysis) {
    try {
      console.log('[SelectorAgent] Processing structural analysis...');

      const { userInput, extractionTargets, finalSelectors } = structuralAnalysis;
      
      // If user provided manual selector, validate and enhance
      if (finalSelectors.isManual) {
        return await this.processManualSelector(structuralAnalysis);
      }

      // Generate intelligent selectors based on analysis
      const generatedSelectors = await this.generateIntelligentSelectors(structuralAnalysis);
      
      // Test and rank selectors
      const testedSelectors = await this.testAndRankSelectors(generatedSelectors);
      
      // Create fallback strategy
      const fallbackChain = this.createFallbackChain(testedSelectors);
      
      const result = {
        ...structuralAnalysis,
        selectorStrategy: {
          primary: testedSelectors[0],
          fallbacks: fallbackChain,
          isManual: false,
          generationMethod: 'intelligent',
          confidence: this.calculateConfidence(testedSelectors[0]),
          estimatedReliability: this.estimateReliability(testedSelectors[0])
        },
        processingMetadata: {
          candidatesGenerated: generatedSelectors.length,
          candidatesTested: testedSelectors.length,
          processingTime: Date.now() - structuralAnalysis.timestamp
        }
      };

      console.log('[SelectorAgent] Selector strategy generated:', result.selectorStrategy);
      return result;

    } catch (error) {
      console.error('[SelectorAgent] Processing failed:', error);
      throw error;
    }
  }

  async processManualSelector(structuralAnalysis) {
    const { finalSelectors } = structuralAnalysis;
    const manualSelector = finalSelectors.primary;

    // Validate manual selector
    const validation = this.validateSelector(manualSelector);
    
    // Generate fallbacks for manual selector
    const fallbacks = validation.isValid ? 
      this.generateFallbacksForSelector(manualSelector) : 
      await this.generateIntelligentSelectors(structuralAnalysis);

    return {
      ...structuralAnalysis,
      selectorStrategy: {
        primary: {
          selector: manualSelector,
          isValid: validation.isValid,
          matchCount: validation.matchCount,
          specificity: this.calculateSpecificity(manualSelector)
        },
        fallbacks: fallbacks.slice(0, 3), // Limit fallbacks
        isManual: true,
        generationMethod: 'manual',
        confidence: validation.isValid ? 0.9 : 0.1,
        estimatedReliability: validation.isValid ? 'high' : 'low'
      }
    };
  }

  async generateIntelligentSelectors(structuralAnalysis) {
    const { extractionTargets, userInput, pageInfo } = structuralAnalysis;
    const selectors = [];

    // Strategy 1: Use extraction targets if available
    if (extractionTargets && extractionTargets.length > 0) {
      selectors.push(...this.generateFromExtractionTargets(extractionTargets));
    }

    // Strategy 2: Generate based on content patterns
    selectors.push(...this.generateFromContentPatterns());

    // Strategy 3: Generate based on semantic structure
    selectors.push(...this.generateFromSemanticStructure());

    // Strategy 4: Generate based on visual patterns
    selectors.push(...this.generateFromVisualPatterns());

    // Strategy 5: Generate fallback selectors
    selectors.push(...this.generateFallbackSelectors());

    // Remove duplicates and invalid selectors
    const cleanedSelectors = this.cleanAndDeduplicateSelectors(selectors);

    console.log(`[SelectorAgent] Generated ${cleanedSelectors.length} candidate selectors`);
    return cleanedSelectors;
  }

  generateFromExtractionTargets(extractionTargets) {
    const selectors = [];

    extractionTargets.forEach(target => {
      target.selectors.forEach(selectorInfo => {
        if (selectorInfo.count > 1 && selectorInfo.count < 100) {
          selectors.push({
            selector: selectorInfo.selector,
            source: 'extraction-target',
            expectedCount: selectorInfo.count,
            type: target.type
          });
        }
      });
    });

    return selectors;
  }

  generateFromContentPatterns() {
    const selectors = [];
    
    // Look for common data container patterns
    const patterns = [
      // List patterns
      'ul > li', 'ol > li', '.list > .item',
      // Table patterns  
      'table tbody tr', 'tr:not(:first-child)',
      // Card patterns
      '.card', '.tile', '.box', '.item',
      // Product patterns
      '.product', '[data-testid*="product"]', '[class*="product"]',
      // Article patterns
      'article', '.article', '.post', '.entry'
    ];

    patterns.forEach(pattern => {
      const elements = document.querySelectorAll(pattern);
      if (elements.length >= 2 && elements.length <= 50) {
        selectors.push({
          selector: pattern,
          source: 'content-pattern',
          expectedCount: elements.length,
          type: 'pattern'
        });
      }
    });

    return selectors;
  }

  generateFromSemanticStructure() {
    const selectors = [];
    
    // Find semantic containers
    const semanticElements = [
      'main', 'section', 'article', 'aside', 'nav',
      '[role="main"]', '[role="article"]', '[role="list"]'
    ];

    semanticElements.forEach(element => {
      const el = document.querySelector(element);
      if (el) {
        // Look for repeated patterns within semantic containers
        const children = el.querySelectorAll('*');
        const childPatterns = this.findRepeatedChildPatterns(el);
        
        childPatterns.forEach(pattern => {
          selectors.push({
            selector: `${element} ${pattern}`,
            source: 'semantic-structure',
            expectedCount: el.querySelectorAll(pattern).length,
            type: 'semantic'
          });
        });
      }
    });

    return selectors;
  }

  generateFromVisualPatterns() {
    const selectors = [];
    
    // Find elements with similar dimensions (likely data items)
    const elements = Array.from(document.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 50 && rect.height > 20 && rect.height < 500;
    });

    // Group by similar dimensions
    const dimensionGroups = this.groupBySimilarDimensions(elements);
    
    dimensionGroups.forEach(group => {
      if (group.length >= 3 && group.length <= 30) {
        const commonSelector = this.findCommonSelector(group);
        if (commonSelector) {
          selectors.push({
            selector: commonSelector,
            source: 'visual-pattern',
            expectedCount: group.length,
            type: 'visual'
          });
        }
      }
    });

    return selectors;
  }

  generateFallbackSelectors() {
    return [
      { selector: 'body > *', source: 'fallback', expectedCount: 1, type: 'fallback' },
      { selector: 'main', source: 'fallback', expectedCount: 1, type: 'fallback' },
      { selector: '.content', source: 'fallback', expectedCount: 1, type: 'fallback' },
      { selector: '#main', source: 'fallback', expectedCount: 1, type: 'fallback' },
      { selector: 'body', source: 'fallback', expectedCount: 1, type: 'fallback' }
    ];
  }

  async testAndRankSelectors(candidateSelectors) {
    const tested = [];

    for (const candidate of candidateSelectors) {
      const test = this.testSelector(candidate);
      if (test.isValid && test.matchCount > 0) {
        tested.push({
          ...candidate,
          ...test,
          score: this.calculateSelectorScore(candidate, test)
        });
      }
    }

    // Sort by score (highest first)
    tested.sort((a, b) => b.score - a.score);
    
    return tested;
  }

  testSelector(selectorCandidate) {
    try {
      const elements = document.querySelectorAll(selectorCandidate.selector);
      const isValid = elements.length > 0;
      
      return {
        isValid,
        matchCount: elements.length,
        specificity: this.calculateSpecificity(selectorCandidate.selector),
        stability: this.assessStability(selectorCandidate.selector),
        performance: this.measurePerformance(selectorCandidate.selector)
      };
    } catch (error) {
      return {
        isValid: false,
        matchCount: 0,
        error: error.message
      };
    }
  }

  calculateSelectorScore(candidate, test) {
    let score = 0;

    // Match count score (prefer reasonable numbers)
    if (test.matchCount >= 1 && test.matchCount <= 50) {
      score += 50;
    } else if (test.matchCount > 50) {
      score += Math.max(10, 50 - (test.matchCount - 50));
    }

    // Source preference
    const sourceScores = {
      'extraction-target': 30,
      'content-pattern': 25,
      'semantic-structure': 20,
      'visual-pattern': 15,
      'fallback': 5
    };
    score += sourceScores[candidate.source] || 0;

    // Stability score
    score += test.stability * 10;

    // Performance score  
    score += Math.max(0, 10 - test.performance);

    // Specificity bonus (not too specific, not too general)
    if (test.specificity >= 10 && test.specificity <= 100) {
      score += 10;
    }

    return score;
  }

  calculateSpecificity(selector) {
    // Simple specificity calculation
    const idCount = (selector.match(/#/g) || []).length;
    const classCount = (selector.match(/\./g) || []).length;
    const elementCount = (selector.match(/[a-zA-Z]/g) || []).length;
    
    return idCount * 100 + classCount * 10 + elementCount;
  }

  assessStability(selector) {
    // Assess how stable this selector is likely to be
    let stability = 1.0;

    // Penalize overly specific selectors
    if (selector.includes(':nth-child')) stability -= 0.3;
    if (selector.includes(':nth-of-type')) stability -= 0.2;
    
    // Reward semantic selectors
    if (selector.includes('main') || selector.includes('article')) stability += 0.2;
    
    // Penalize random-looking class names
    if (/\.[a-z0-9]{8,}/.test(selector)) stability -= 0.4;
    
    return Math.max(0, Math.min(1, stability));
  }

  measurePerformance(selector) {
    // Simple performance measurement
    const start = performance.now();
    try {
      document.querySelectorAll(selector);
      return performance.now() - start;
    } catch (error) {
      return 1000; // High penalty for invalid selectors
    }
  }

  createFallbackChain(testedSelectors) {
    // Create a chain of fallback selectors
    const fallbacks = testedSelectors.slice(1, 4); // Top 3 alternatives
    
    // Always include basic fallbacks
    fallbacks.push(
      { selector: 'body', source: 'ultimate-fallback', matchCount: 1, score: 0 }
    );
    
    return fallbacks;
  }

  // Helper Methods
  validateSelector(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      return {
        isValid: true,
        matchCount: elements.length
      };
    } catch (error) {
      return {
        isValid: false,
        matchCount: 0,
        error: error.message
      };
    }
  }

  generateFallbacksForSelector(selector) {
    // Generate simpler versions of the selector as fallbacks
    const fallbacks = [];
    
    // Remove pseudo-selectors
    const simplified = selector.replace(/:[\w-]+(\([^)]*\))?/g, '');
    if (simplified !== selector) {
      fallbacks.push({ selector: simplified, source: 'simplified' });
    }
    
    // Remove last part of compound selector
    const parts = selector.split(' ');
    if (parts.length > 1) {
      fallbacks.push({ selector: parts.slice(0, -1).join(' '), source: 'parent' });
    }
    
    return fallbacks;
  }

  findRepeatedChildPatterns(container) {
    const patterns = [];
    const children = Array.from(container.children);
    
    // Find common class patterns among children
    const classFreq = new Map();
    children.forEach(child => {
      if (child.className) {
        const classes = child.className.split(' ');
        classes.forEach(cls => {
          if (cls.trim()) {
            classFreq.set(cls, (classFreq.get(cls) || 0) + 1);
          }
        });
      }
    });
    
    // Find classes that appear on multiple children
    for (const [className, count] of classFreq.entries()) {
      if (count >= 2) {
        patterns.push(`.${className}`);
      }
    }
    
    return patterns;
  }

  groupBySimilarDimensions(elements) {
    const groups = [];
    const tolerance = 20; // 20px tolerance
    
    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      let foundGroup = false;
      
      for (const group of groups) {
        const sample = group[0].getBoundingClientRect();
        if (Math.abs(rect.width - sample.width) <= tolerance &&
            Math.abs(rect.height - sample.height) <= tolerance) {
          group.push(el);
          foundGroup = true;
          break;
        }
      }
      
      if (!foundGroup) {
        groups.push([el]);
      }
    });
    
    return groups.filter(group => group.length >= 3);
  }

  findCommonSelector(elements) {
    // Find common classes among a group of elements
    const commonClasses = [];
    
    if (elements.length === 0) return null;
    
    const firstClasses = elements[0].className.split(' ').filter(cls => cls.trim());
    
    firstClasses.forEach(cls => {
      if (elements.every(el => el.classList.contains(cls))) {
        commonClasses.push(cls);
      }
    });
    
    if (commonClasses.length > 0) {
      return `.${commonClasses.join('.')}`;
    }
    
    // Fallback to tag name if same for all
    const tagName = elements[0].tagName.toLowerCase();
    if (elements.every(el => el.tagName.toLowerCase() === tagName)) {
      return tagName;
    }
    
    return null;
  }

  cleanAndDeduplicateSelectors(selectors) {
    const seen = new Set();
    const cleaned = [];
    
    selectors.forEach(selectorInfo => {
      const selector = selectorInfo.selector;
      if (!seen.has(selector) && this.isValidSelector(selector)) {
        seen.add(selector);
        cleaned.push(selectorInfo);
      }
    });
    
    return cleaned;
  }

  isValidSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  calculateConfidence(primarySelector) {
    if (!primarySelector) return 0;
    
    const baseConfidence = primarySelector.score / 100;
    const stabilityBonus = primarySelector.stability * 0.2;
    
    return Math.min(1, baseConfidence + stabilityBonus);
  }

  estimateReliability(primarySelector) {
    if (!primarySelector) return 'unknown';
    
    if (primarySelector.stability > 0.8 && primarySelector.score > 70) return 'high';
    if (primarySelector.stability > 0.5 && primarySelector.score > 40) return 'medium';
    return 'low';
  }
}