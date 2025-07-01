/**
 * Selector Refinement Interface - User Selector Validation and Optimization
 * Provides real-time validation and optimization of user-provided selectors
 */

export class SelectorRefinementInterface {
  constructor() {
    this.isInitialized = false;
    this.validationCache = new Map();
    this.optimizationCache = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[SelectorRefinement] Initializing selector refinement interface...');
    this.isInitialized = true;
  }

  /**
   * Validate user-provided selectors
   * @param {string} selector - CSS selector to validate
   * @param {Object} context - Context information for validation
   */
  async validateSelector(selector, context = {}) {
    try {
      // Check cache first
      const cacheKey = `${selector}_${JSON.stringify(context)}`;
      if (this.validationCache.has(cacheKey)) {
        return this.validationCache.get(cacheKey);
      }

      const validation = {
        selector: selector,
        isValid: false,
        elementCount: 0,
        issues: [],
        suggestions: [],
        confidence: 0,
        sampleElements: []
      };

      // Basic syntax validation
      if (!this.isValidCSSSelector(selector)) {
        validation.issues.push('Invalid CSS selector syntax');
        validation.suggestions.push('Check for typos and correct CSS syntax');
        this.validationCache.set(cacheKey, validation);
        return validation;
      }

      // Test selector in DOM (if available)
      if (typeof document !== 'undefined') {
        const elements = await this.testSelectorInDOM(selector);
        validation.elementCount = elements.count;
        validation.sampleElements = elements.samples;
        validation.isValid = elements.count > 0;
      } else {
        // If no DOM access, estimate based on patterns
        validation.isValid = true;
        validation.elementCount = this.estimateElementCount(selector);
      }

      // Analyze selector quality
      const qualityAnalysis = this.analyzeSelectorQuality(selector, validation.elementCount);
      validation.issues.push(...qualityAnalysis.issues);
      validation.suggestions.push(...qualityAnalysis.suggestions);
      validation.confidence = qualityAnalysis.confidence;

      // Performance analysis
      const performanceAnalysis = this.analyzePerformance(selector);
      if (performanceAnalysis.isSlowSelector) {
        validation.issues.push('Selector may have poor performance');
        validation.suggestions.push(...performanceAnalysis.optimizations);
      }

      // Cache the result
      this.validationCache.set(cacheKey, validation);
      
      return validation;

    } catch (error) {
      console.error('[SelectorRefinement] Validation failed:', error);
      return {
        selector: selector,
        isValid: false,
        elementCount: 0,
        issues: ['Validation failed: ' + error.message],
        suggestions: ['Check selector syntax and try again'],
        confidence: 0,
        sampleElements: []
      };
    }
  }

  /**
   * Optimize user-provided selectors for better performance and reliability
   */
  async optimizeSelector(selector, options = {}) {
    try {
      const cacheKey = `${selector}_${JSON.stringify(options)}`;
      if (this.optimizationCache.has(cacheKey)) {
        return this.optimizationCache.get(cacheKey);
      }

      const optimization = {
        originalSelector: selector,
        optimizedSelectors: [],
        improvements: [],
        estimatedPerformanceGain: 0
      };

      // Generate optimized variants
      const variants = this.generateSelectorVariants(selector, options);
      
      // Test each variant
      for (const variant of variants) {
        const validation = await this.validateSelector(variant.selector);
        
        if (validation.isValid && validation.confidence > 60) {
          optimization.optimizedSelectors.push({
            selector: variant.selector,
            reason: variant.reason,
            confidence: validation.confidence,
            elementCount: validation.elementCount,
            performanceScore: this.calculatePerformanceScore(variant.selector)
          });
        }
      }

      // Sort by confidence and performance
      optimization.optimizedSelectors.sort((a, b) => {
        const scoreA = a.confidence + a.performanceScore;
        const scoreB = b.confidence + b.performanceScore;
        return scoreB - scoreA;
      });

      // Calculate performance gain
      const originalScore = this.calculatePerformanceScore(selector);
      const bestOptimizedScore = optimization.optimizedSelectors[0]?.performanceScore || originalScore;
      optimization.estimatedPerformanceGain = Math.max(0, bestOptimizedScore - originalScore);

      // Generate improvement suggestions
      optimization.improvements = this.generateImprovementSuggestions(
        selector, 
        optimization.optimizedSelectors
      );

      this.optimizationCache.set(cacheKey, optimization);
      return optimization;

    } catch (error) {
      console.error('[SelectorRefinement] Optimization failed:', error);
      return {
        originalSelector: selector,
        optimizedSelectors: [],
        improvements: ['Optimization failed: ' + error.message],
        estimatedPerformanceGain: 0
      };
    }
  }

  /**
   * Refine selectors based on extraction context
   */
  async refineForContext(selector, context) {
    const { domain, targetType, expectedElements } = context;
    
    const refinement = {
      originalSelector: selector,
      contextualSelectors: [],
      domainOptimizations: [],
      recommendations: []
    };

    // Domain-specific optimizations
    if (domain) {
      const domainRefinements = this.generateDomainSpecificRefinements(selector, domain);
      refinement.domainOptimizations.push(...domainRefinements);
    }

    // Target type optimizations
    if (targetType) {
      const typeRefinements = this.generateTypeSpecificRefinements(selector, targetType);
      refinement.contextualSelectors.push(...typeRefinements);
    }

    // Element count expectations
    if (expectedElements && typeof expectedElements === 'number') {
      const countOptimizations = this.optimizeForElementCount(selector, expectedElements);
      refinement.recommendations.push(...countOptimizations);
    }

    return refinement;
  }

  /**
   * Test selector in DOM environment
   */
  async testSelectorInDOM(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      const samples = Array.from(elements)
        .slice(0, 3)
        .map(el => ({
          tagName: el.tagName.toLowerCase(),
          className: el.className,
          textContent: el.textContent?.slice(0, 50) || '',
          attributes: this.getElementAttributes(el)
        }));

      return {
        count: elements.length,
        samples: samples
      };

    } catch (error) {
      console.warn('[SelectorRefinement] DOM test failed:', error);
      return {
        count: 0,
        samples: []
      };
    }
  }

  /**
   * Check if selector has valid CSS syntax
   */
  isValidCSSSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Estimate element count for selector patterns
   */
  estimateElementCount(selector) {
    // Basic pattern-based estimation
    if (selector.includes('#')) return 1; // ID selectors typically unique
    if (selector.includes('table')) return 5; // Tables usually have multiple rows
    if (selector.includes('.product') || selector.includes('.item')) return 15;
    if (selector.includes('li')) return 10;
    if (selector.includes('div')) return 20;
    
    return 5; // Default estimate
  }

  /**
   * Analyze selector quality and reliability
   */
  analyzeSelectorQuality(selector, elementCount) {
    const analysis = {
      confidence: 50, // Base confidence
      issues: [],
      suggestions: []
    };

    // ID selectors are most reliable
    if (selector.includes('#')) {
      analysis.confidence += 30;
    }

    // Class selectors are moderately reliable
    if (selector.includes('.')) {
      analysis.confidence += 20;
    }

    // Attribute selectors are good
    if (selector.includes('[')) {
      analysis.confidence += 15;
    }

    // Tag-only selectors are less reliable
    if (!selector.includes('.') && !selector.includes('#') && !selector.includes('[')) {
      analysis.confidence -= 20;
      analysis.issues.push('Tag-only selectors may be too broad');
      analysis.suggestions.push('Consider adding class or attribute selectors for better specificity');
    }

    // Very specific selectors can be brittle
    if (selector.split(' ').length > 4) {
      analysis.confidence -= 10;
      analysis.issues.push('Very specific selectors may be brittle');
      analysis.suggestions.push('Simplify selector to reduce fragility');
    }

    // Element count considerations
    if (elementCount === 0) {
      analysis.confidence = 0;
      analysis.issues.push('Selector matches no elements');
      analysis.suggestions.push('Verify selector syntax and target elements exist');
    } else if (elementCount === 1) {
      analysis.confidence += 10;
    } else if (elementCount > 100) {
      analysis.confidence -= 15;
      analysis.issues.push('Selector is very broad (matches many elements)');
      analysis.suggestions.push('Add more specific criteria to narrow selection');
    }

    // Ensure confidence stays within bounds
    analysis.confidence = Math.max(0, Math.min(100, analysis.confidence));

    return analysis;
  }

  /**
   * Analyze selector performance characteristics
   */
  analyzePerformance(selector) {
    const analysis = {
      isSlowSelector: false,
      optimizations: []
    };

    // Universal selector is slow
    if (selector.includes('*')) {
      analysis.isSlowSelector = true;
      analysis.optimizations.push('Avoid universal selector (*) for better performance');
    }

    // Deep nesting can be slow
    if (selector.split(' ').length > 5) {
      analysis.isSlowSelector = true;
      analysis.optimizations.push('Reduce selector depth for better performance');
    }

    // Complex attribute selectors can be slow
    if ((selector.match(/\[/g) || []).length > 2) {
      analysis.isSlowSelector = true;
      analysis.optimizations.push('Simplify attribute selectors');
    }

    // Pseudo-selectors can impact performance
    if (selector.includes(':not(') || selector.includes(':nth-')) {
      analysis.isSlowSelector = true;
      analysis.optimizations.push('Consider alternatives to complex pseudo-selectors');
    }

    return analysis;
  }

  /**
   * Calculate performance score for a selector
   */
  calculatePerformanceScore(selector) {
    let score = 100; // Start with perfect score

    // Penalties for performance-impacting patterns
    if (selector.includes('*')) score -= 30;
    if (selector.split(' ').length > 4) score -= 20;
    if ((selector.match(/\[/g) || []).length > 2) score -= 15;
    if (selector.includes(':not(')) score -= 15;
    if (selector.includes(':nth-')) score -= 10;

    // Bonuses for efficient patterns
    if (selector.startsWith('#')) score += 20; // ID selectors are fast
    if (selector.includes('data-')) score += 10; // Data attributes are semantic

    return Math.max(0, score);
  }

  /**
   * Generate optimized selector variants
   */
  generateSelectorVariants(selector, options) {
    const variants = [];

    // Simplification variants
    if (selector.includes(' ')) {
      const parts = selector.split(' ');
      
      // Try removing first part
      if (parts.length > 2) {
        variants.push({
          selector: parts.slice(1).join(' '),
          reason: 'Simplified by removing ancestor context'
        });
      }

      // Try keeping only the last two parts
      if (parts.length > 2) {
        variants.push({
          selector: parts.slice(-2).join(' '),
          reason: 'Focused on direct parent-child relationship'
        });
      }
    }

    // Attribute-based variants
    if (selector.includes('.')) {
      const withDataAttribute = selector.replace(/\./g, '[class*="').replace(/([^"]*)/g, '$1"]');
      variants.push({
        selector: withDataAttribute,
        reason: 'Converted to attribute selector for robustness'
      });
    }

    // Fallback variants
    if (selector.includes('#')) {
      // Create class-based fallback for ID selectors
      const classFallback = selector.replace('#', '.');
      variants.push({
        selector: classFallback,
        reason: 'Class-based fallback for ID selector'
      });
    }

    return variants;
  }

  /**
   * Generate domain-specific selector refinements
   */
  generateDomainSpecificRefinements(selector, domain) {
    const refinements = [];

    switch (domain) {
      case 'maritime':
        if (!selector.includes('vessel') && !selector.includes('ship')) {
          refinements.push(`${selector}[class*="vessel"]`);
          refinements.push(`${selector}[class*="ship"]`);
        }
        break;

      case 'luxury':
        if (!selector.includes('product') && !selector.includes('item')) {
          refinements.push(`${selector}[class*="product"]`);
          refinements.push(`${selector}[class*="luxury"]`);
        }
        break;

      case 'realestate':
        if (!selector.includes('property') && !selector.includes('listing')) {
          refinements.push(`${selector}[class*="property"]`);
          refinements.push(`${selector}[class*="listing"]`);
        }
        break;
    }

    return refinements;
  }

  /**
   * Generate type-specific selector refinements
   */
  generateTypeSpecificRefinements(selector, targetType) {
    const refinements = [];

    const typeSelectors = {
      'table': ['table', 'tbody tr', '.table-row'],
      'list': ['ul li', 'ol li', '.list-item'],
      'card': ['.card', '.item', '.tile'],
      'form': ['form', '.form-group', 'fieldset'],
      'article': ['article', '.article', '.post']
    };

    if (typeSelectors[targetType]) {
      typeSelectors[targetType].forEach(typeSelector => {
        if (!selector.includes(typeSelector)) {
          refinements.push({
            selector: `${typeSelector} ${selector}`,
            reason: `Scoped to ${targetType} context`
          });
        }
      });
    }

    return refinements;
  }

  /**
   * Optimize selector for expected element count
   */
  optimizeForElementCount(selector, expectedCount) {
    const recommendations = [];

    if (expectedCount === 1) {
      recommendations.push('Consider adding ID selector for unique elements');
      recommendations.push('Use :first-child or :nth-child(1) for first occurrence');
    } else if (expectedCount < 10) {
      recommendations.push('Selector should be specific enough for small sets');
    } else if (expectedCount > 50) {
      recommendations.push('Consider pagination or filtering for large result sets');
      recommendations.push('Verify selector is not too broad');
    }

    return recommendations;
  }

  /**
   * Generate improvement suggestions based on optimization results
   */
  generateImprovementSuggestions(originalSelector, optimizedSelectors) {
    const suggestions = [];

    if (optimizedSelectors.length > 0) {
      const bestSelector = optimizedSelectors[0];
      
      if (bestSelector.confidence > 80) {
        suggestions.push(`Consider using: ${bestSelector.selector} (${bestSelector.reason})`);
      }

      if (bestSelector.performanceScore > this.calculatePerformanceScore(originalSelector)) {
        suggestions.push('Optimized selector offers better performance');
      }
    } else {
      suggestions.push('No significant optimizations found - original selector appears optimal');
    }

    return suggestions;
  }

  /**
   * Get relevant attributes from an element
   */
  getElementAttributes(element) {
    const attributes = {};
    const relevantAttrs = ['id', 'class', 'data-*', 'role', 'aria-*'];
    
    for (const attr of element.attributes) {
      if (relevantAttrs.some(pattern => 
        pattern.includes('*') ? attr.name.startsWith(pattern.replace('*', '')) : attr.name === pattern
      )) {
        attributes[attr.name] = attr.value;
      }
    }
    
    return attributes;
  }

  /**
   * Clear caches
   */
  clearCaches() {
    this.validationCache.clear();
    this.optimizationCache.clear();
    console.log('[SelectorRefinement] Caches cleared');
  }

  /**
   * Get validation statistics
   */
  getValidationStats() {
    return {
      validationCacheSize: this.validationCache.size,
      optimizationCacheSize: this.optimizationCache.size,
      isInitialized: this.isInitialized
    };
  }
}