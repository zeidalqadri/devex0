/**
 * Reconnaissance Agent - Interactive URL Analysis and Target Discovery
 * Coordinates the reconnaissance workflow and user interaction
 */

import { StructureAgent } from './structure-agent.js';
import { TargetDiscoveryEngine } from './target-discovery.js';

export class ReconnaissanceAgent {
  constructor() {
    this.structureAgent = new StructureAgent();
    this.targetDiscovery = new TargetDiscoveryEngine();
    this.isInitialized = false;
    this.currentRecon = null;
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[ReconAgent] Initializing reconnaissance capabilities...');
    await this.structureAgent.init();
    await this.targetDiscovery.init();
    this.isInitialized = true;
  }

  /**
   * Start interactive reconnaissance workflow
   * @param {string} url - Target URL for reconnaissance 
   * @param {Object} options - Reconnaissance options
   */
  async startReconnaissance(url, options = {}) {
    try {
      console.log('[ReconAgent] Starting reconnaissance for:', url);
      
      // Validate URL
      if (!this.validateURL(url)) {
        throw new Error('Invalid URL provided');
      }

      // Initialize reconnaissance session
      this.currentRecon = {
        id: this.generateReconId(),
        url,
        startTime: Date.now(),
        phase: 'initializing',
        options,
        findings: null,
        userFeedback: null
      };

      // Phase 1: Basic site analysis
      this.currentRecon.phase = 'site-analysis';
      const siteAnalysis = await this.performSiteAnalysis(url, options);

      // Phase 2: Target discovery
      this.currentRecon.phase = 'target-discovery';
      const targets = await this.discoverExtractionTargets(siteAnalysis);

      // Phase 3: Generate reconnaissance report
      this.currentRecon.phase = 'report-generation';
      const reconReport = await this.generateReconnaissanceReport(siteAnalysis, targets);

      // Store findings
      this.currentRecon.findings = reconReport;
      this.currentRecon.phase = 'awaiting-user-input';

      console.log('[ReconAgent] Reconnaissance complete:', reconReport.summary);
      return reconReport;

    } catch (error) {
      console.error('[ReconAgent] Reconnaissance failed:', error);
      if (this.currentRecon) {
        this.currentRecon.phase = 'failed';
        this.currentRecon.error = error.message;
      }
      throw error;
    }
  }

  /**
   * Process user feedback and refine extraction plan
   * @param {Object} userFeedback - User selections and refinements
   */
  async processUserFeedback(userFeedback) {
    if (!this.currentRecon || this.currentRecon.phase !== 'awaiting-user-input') {
      throw new Error('No active reconnaissance session awaiting feedback');
    }

    try {
      console.log('[ReconAgent] Processing user feedback:', userFeedback);
      
      this.currentRecon.phase = 'refining-plan';
      this.currentRecon.userFeedback = userFeedback;

      // Validate and refine user selectors if provided
      let refinedTargets = this.currentRecon.findings.targets;
      if (userFeedback.customSelectors && userFeedback.customSelectors.length > 0) {
        refinedTargets = await this.refineWithCustomSelectors(
          refinedTargets, 
          userFeedback.customSelectors
        );
      }

      // Filter targets based on user selections
      if (userFeedback.selectedTargets) {
        refinedTargets = refinedTargets.filter(target => 
          userFeedback.selectedTargets.includes(target.id)
        );
      }

      // Generate optimized extraction plan
      const extractionPlan = await this.generateOptimizedPlan(refinedTargets, userFeedback);

      this.currentRecon.phase = 'plan-ready';
      this.currentRecon.extractionPlan = extractionPlan;

      console.log('[ReconAgent] Extraction plan optimized:', extractionPlan.summary);
      return extractionPlan;

    } catch (error) {
      console.error('[ReconAgent] User feedback processing failed:', error);
      this.currentRecon.phase = 'feedback-error';
      this.currentRecon.error = error.message;
      throw error;
    }
  }

  /**
   * Execute the optimized extraction plan
   */
  async executeOptimizedExtraction() {
    if (!this.currentRecon || this.currentRecon.phase !== 'plan-ready') {
      throw new Error('No extraction plan ready for execution');
    }

    try {
      console.log('[ReconAgent] Executing optimized extraction plan...');
      
      this.currentRecon.phase = 'executing';
      const { extractionPlan } = this.currentRecon;

      // Send extraction request to coordinator with optimized plan
      const extractionRequest = {
        action: 'OPTIMIZED_EXTRACT',
        data: {
          url: this.currentRecon.url,
          plan: extractionPlan,
          reconId: this.currentRecon.id,
          userInput: this.currentRecon.userFeedback,
          targets: extractionPlan.targets
        }
      };

      return extractionRequest;

    } catch (error) {
      console.error('[ReconAgent] Execution failed:', error);
      this.currentRecon.phase = 'execution-error';
      this.currentRecon.error = error.message;
      throw error;
    }
  }

  /**
   * Perform initial site analysis
   */
  async performSiteAnalysis(url, options) {
    console.log('[ReconAgent] Analyzing site structure...');
    
    try {
      // First try direct content script communication for reconnaissance
      if (options.tabId) {
        console.log('[ReconAgent] Using direct content script communication...');
        
        const response = await new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(options.tabId, {
            action: 'RECON_STRUCTURE_ANALYSIS',
            data: { url, options }
          }, (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response);
            }
          });
        });
        
        if (response.success && response.domData) {
          console.log('[ReconAgent] Direct content script analysis successful');
          const structuralAnalysis = response.domData;
          
          // Enhance with domain-specific intelligence
          const domainContext = this.detectDomainContext(url);
          structuralAnalysis.domainContext = domainContext;
          
          return structuralAnalysis;
        }
      }
      
      // Fallback to Structure Agent
      console.log('[ReconAgent] Falling back to Structure Agent...');
      const userInput = {
        url,
        mode: 'smart',
        options: {
          ...options,
          reconnaissance: true,
          includeMetadata: true,
          deepAnalysis: true
        }
      };

      const structuralAnalysis = await this.structureAgent.processUserRequest(userInput);
      
      // Enhance with domain-specific intelligence
      const domainContext = this.detectDomainContext(url);
      structuralAnalysis.domainContext = domainContext;
      
      return structuralAnalysis;
      
    } catch (error) {
      console.error('[ReconAgent] Site analysis failed:', error);
      throw error;
    }
  }

  /**
   * Discover valuable extraction targets
   */
  async discoverExtractionTargets(siteAnalysis) {
    console.log('[ReconAgent] Discovering extraction targets...');
    
    return await this.targetDiscovery.findValueTargets(siteAnalysis);
  }

  /**
   * Generate comprehensive reconnaissance report
   */
  async generateReconnaissanceReport(siteAnalysis, targets) {
    const report = {
      reconId: this.currentRecon.id,
      url: this.currentRecon.url,
      timestamp: Date.now(),
      
      // Site Overview
      siteOverview: {
        title: siteAnalysis.pageInfo?.title || 'Unknown',
        domain: new URL(this.currentRecon.url).hostname,
        framework: siteAnalysis.framework,
        complexity: siteAnalysis.complexity,
        totalElements: siteAnalysis.pageInfo?.totalElements,
        domainType: siteAnalysis.domainContext?.type || 'unknown'
      },

      // Extraction Opportunities
      targets: targets.map(target => ({
        id: this.generateTargetId(),
        ...target,
        recommendation: this.generateTargetRecommendation(target),
        estimatedValue: this.assessTargetValue(target, siteAnalysis.domainContext)
      })),

      // Analysis Summary
      summary: {
        totalTargets: targets.length,
        highValueTargets: targets.filter(t => this.assessTargetValue(t, siteAnalysis.domainContext) >= 8).length,
        recommendedApproach: this.recommendExtractionApproach(targets, siteAnalysis),
        estimatedExtractionTime: this.estimateExtractionTime(targets, siteAnalysis),
        complexityScore: this.calculateComplexityScore(siteAnalysis),
        domainSpecificInsights: this.generateDomainInsights(siteAnalysis.domainContext, targets)
      },

      // Technical Details
      technicalDetails: {
        selectors: siteAnalysis.recommendedSelectors || [],
        navigationElements: siteAnalysis.navigationElements || {},
        contentTypes: siteAnalysis.contentTypes || [],
        extractionTargets: siteAnalysis.extractionTargets || []
      },

      // User Guidance
      userGuidance: {
        nextSteps: this.generateNextSteps(targets),
        warnings: this.generateWarnings(siteAnalysis),
        suggestions: this.generateSuggestions(targets, siteAnalysis)
      }
    };

    return report;
  }

  /**
   * Refine targets with custom user selectors
   */
  async refineWithCustomSelectors(targets, customSelectors) {
    console.log('[ReconAgent] Refining targets with custom selectors...');
    
    const refinedTargets = [...targets];
    
    for (const selector of customSelectors) {
      // Validate selector
      if (!this.validateSelector(selector)) {
        console.warn('[ReconAgent] Invalid custom selector:', selector);
        continue;
      }

      // Create new target from custom selector
      const customTarget = {
        id: this.generateTargetId(),
        type: 'custom',
        name: `Custom: ${selector}`,
        selector: selector,
        isUserDefined: true,
        confidence: 100, // User-defined selectors have max confidence
        estimatedItems: await this.estimateElementCount(selector),
        sampleData: await this.getSampleData(selector)
      };

      refinedTargets.push(customTarget);
    }

    return refinedTargets;
  }

  /**
   * Generate optimized extraction plan
   */
  async generateOptimizedPlan(targets, userFeedback) {
    const plan = {
      reconId: this.currentRecon.id,
      targets: targets,
      strategy: this.determineOptimalStrategy(targets),
      requiredAgents: this.calculateRequiredAgents(targets),
      estimatedCost: this.estimateCost(targets),
      riskAssessment: this.assessRisks(targets),
      executionOrder: this.optimizeExecutionOrder(targets),
      qualityChecks: this.defineQualityChecks(targets),
      
      summary: {
        totalTargets: targets.length,
        expectedItems: targets.reduce((sum, t) => sum + (t.estimatedItems || 0), 0),
        estimatedTime: this.estimateExtractionTime(targets),
        confidenceScore: this.calculatePlanConfidence(targets)
      }
    };

    return plan;
  }

  // Utility methods
  validateURL(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  validateSelector(selector) {
    try {
      document.querySelector(selector);
      return true;
    } catch {
      return false;
    }
  }

  detectDomainContext(url) {
    // Return generic domain context to allow content-based analysis
    // This removes hardcoded domain assumptions for universal compatibility
    return { type: 'generic', confidence: 50 };
  }

  generateTargetRecommendation(target) {
    if (target.confidence >= 90) return 'Highly Recommended';
    if (target.confidence >= 70) return 'Recommended';  
    if (target.confidence >= 50) return 'Consider';
    return 'Review Required';
  }

  assessTargetValue(target, domainContext) {
    let score = 5; // Base score
    
    // Confidence boost
    score += (target.confidence / 100) * 3;
    
    // Item count boost
    if (target.estimatedItems > 10) score += 1;
    if (target.estimatedItems > 50) score += 1;
    
    // Domain relevance boost
    if (domainContext && target.type.includes(domainContext.type)) {
      score += 2;
    }
    
    return Math.min(10, Math.max(1, Math.round(score)));
  }

  generateReconId() {
    return `recon_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  generateTargetId() {
    return `target_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;
  }

  recommendExtractionApproach(targets, siteAnalysis) {
    const highValueTargets = targets.filter(t => this.assessTargetValue(t, siteAnalysis.domainContext) >= 8);
    
    if (highValueTargets.length === 0) return 'selective-manual';
    if (highValueTargets.length <= 2) return 'focused-extraction';
    if (siteAnalysis.complexity === 'complex') return 'multi-agent-careful';
    return 'comprehensive-extraction';
  }

  estimateExtractionTime(targets, siteAnalysis) {
    const baseTime = 2000; // 2 seconds base
    const targetTime = targets.length * 1000; // 1 second per target
    const complexityMultiplier = siteAnalysis?.complexity === 'complex' ? 2 : 1;
    
    return (baseTime + targetTime) * complexityMultiplier;
  }

  calculateComplexityScore(siteAnalysis) {
    let score = 1;
    if (siteAnalysis.complexity === 'medium') score = 5;
    if (siteAnalysis.complexity === 'complex') score = 9;
    if (siteAnalysis.pageInfo?.isSPA) score += 2;
    if (siteAnalysis.navigationElements?.infiniteScroll) score += 2;
    return Math.min(10, score);
  }

  generateDomainInsights(domainContext, targets) {
    if (!domainContext || domainContext.type === 'unknown') {
      return ['Generic website detected', 'Standard extraction approaches recommended'];
    }

    const insights = [];
    
    switch (domainContext.type) {
      case 'maritime':
        insights.push('Maritime data detected');
        insights.push('Look for vessel tracking tables and shipping information');
        if (targets.some(t => t.type.includes('table'))) {
          insights.push('Vessel data tables found - high extraction value');
        }
        break;
        
      case 'luxury':
        insights.push('Luxury marketplace detected');
        insights.push('Focus on product catalogs, pricing, and authenticity markers');
        if (targets.some(t => t.type.includes('product'))) {
          insights.push('Product listings found - ideal for price monitoring');
        }
        break;
        
      case 'realestate':
        insights.push('Real estate platform detected');
        insights.push('Property listings and market data available');
        break;
    }
    
    return insights;
  }

  generateNextSteps(targets) {
    const steps = [];
    
    if (targets.length === 0) {
      steps.push('No clear targets found - consider manual selector input');
    } else {
      steps.push(`Review ${targets.length} discovered targets`);
      steps.push('Select targets of interest for extraction');
      
      const highValue = targets.filter(t => this.assessTargetValue(t) >= 8);
      if (highValue.length > 0) {
        steps.push(`${highValue.length} high-value targets recommended for priority extraction`);
      }
    }
    
    return steps;
  }

  generateWarnings(siteAnalysis) {
    const warnings = [];
    
    if (siteAnalysis.complexity === 'complex') {
      warnings.push('Complex site structure detected - extraction may take longer');
    }
    
    if (siteAnalysis.pageInfo?.isSPA) {
      warnings.push('Single Page Application detected - dynamic content may require special handling');
    }
    
    if (siteAnalysis.navigationElements?.infiniteScroll) {
      warnings.push('Infinite scroll detected - may not capture all available data');
    }
    
    return warnings;
  }

  generateSuggestions(targets, siteAnalysis) {
    const suggestions = [];
    
    if (targets.length > 5) {
      suggestions.push('Consider focusing on 2-3 high-value targets for optimal results');
    }
    
    if (siteAnalysis.extractionTargets?.length > targets.length) {
      suggestions.push('Additional data patterns detected - explore manual selectors for comprehensive extraction');
    }
    
    return suggestions;
  }

  determineOptimalStrategy(targets) {
    if (targets.length === 1) return 'single-target';
    if (targets.length <= 3) return 'focused-multi-target';
    return 'comprehensive-extraction';
  }

  calculateRequiredAgents(targets) {
    return Math.min(6, Math.max(2, targets.length + 1)); // At least 2, at most 6 agents
  }

  estimateCost(targets) {
    // Cost in terms of resource usage (1-10 scale)
    const baseCost = 2;
    const targetCost = targets.length * 0.5;
    return Math.min(10, baseCost + targetCost);
  }

  assessRisks(targets) {
    const risks = [];
    
    if (targets.some(t => t.confidence < 70)) {
      risks.push('Some targets have low confidence scores');
    }
    
    if (targets.length > 5) {
      risks.push('Large number of targets may impact performance');
    }
    
    return risks;
  }

  optimizeExecutionOrder(targets) {
    // Sort by confidence and estimated value
    return targets
      .map(t => ({ ...t, score: t.confidence + this.assessTargetValue(t) * 10 }))
      .sort((a, b) => b.score - a.score)
      .map(t => t.id);
  }

  defineQualityChecks(targets) {
    return {
      minimumSuccess: Math.ceil(targets.length * 0.7), // At least 70% success
      sampleValidation: true,
      schemaCompliance: true,
      duplicateDetection: true
    };
  }

  calculatePlanConfidence(targets) {
    if (targets.length === 0) return 0;
    
    const avgConfidence = targets.reduce((sum, t) => sum + t.confidence, 0) / targets.length;
    return Math.round(avgConfidence);
  }

  async estimateElementCount(selector) {
    try {
      return document.querySelectorAll(selector).length;
    } catch {
      return 0;
    }
  }

  async getSampleData(selector) {
    try {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        return elements[0].textContent?.slice(0, 100) || 'No text content';
      }
      return 'No elements found';
    } catch {
      return 'Invalid selector';
    }
  }

  // Public API methods for status checking
  getCurrentReconStatus() {
    return this.currentRecon ? {
      id: this.currentRecon.id,
      phase: this.currentRecon.phase,
      url: this.currentRecon.url,
      startTime: this.currentRecon.startTime,
      hasFindings: !!this.currentRecon.findings,
      hasPlan: !!this.currentRecon.extractionPlan
    } : null;
  }

  getReconFindings() {
    return this.currentRecon?.findings || null;
  }

  getExtractionPlan() {
    return this.currentRecon?.extractionPlan || null;
  }
}