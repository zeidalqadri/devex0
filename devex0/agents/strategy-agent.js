/**
 * Strategy Agent - Complexity Analysis and Execution Planning
 * Determines optimal scraping strategy and resource allocation
 */

export class StrategyAgent {
  constructor() {
    this.isInitialized = false;
    this.strategyCache = new Map();
    this.performanceHistory = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[StrategyAgent] Initializing...');
    this.isInitialized = true;
  }

  /**
   * Analyze selector strategy and create execution plan
   * @param {Object} selectorAnalysis - Analysis from Selector Agent
   */
  async createExecutionPlan(selectorAnalysis) {
    try {
      console.log('[StrategyAgent] Creating execution plan...');

      const { selectorStrategy, userInput, pageInfo, complexity } = selectorAnalysis;
      
      // Analyze extraction complexity
      const complexityAnalysis = this.analyzeExtractionComplexity(selectorAnalysis);
      
      // Determine optimal strategy
      const strategy = this.determineOptimalStrategy(complexityAnalysis);
      
      // Plan resource allocation
      const resourcePlan = this.planResourceAllocation(strategy, complexityAnalysis);
      
      // Create execution timeline
      const timeline = this.createExecutionTimeline(resourcePlan);
      
      // Define success criteria
      const successCriteria = this.defineSuccessCriteria(selectorAnalysis);
      
      // Generate fallback strategies
      const fallbackStrategies = this.generateFallbackStrategies(strategy, complexityAnalysis);

      const executionPlan = {
        ...selectorAnalysis,
        complexityAnalysis,
        strategy: {
          type: strategy.type,
          method: strategy.method,
          priority: strategy.priority,
          confidence: strategy.confidence
        },
        resourcePlan,
        timeline,
        successCriteria,
        fallbackStrategies,
        executionMetadata: {
          planGeneratedAt: Date.now(),
          estimatedDuration: timeline.totalDuration,
          riskLevel: complexityAnalysis.riskLevel,
          recommendedAgents: resourcePlan.requiredAgents
        }
      };

      console.log('[StrategyAgent] Execution plan created:', executionPlan.strategy);
      return executionPlan;

    } catch (error) {
      console.error('[StrategyAgent] Plan creation failed:', error);
      throw error;
    }
  }

  analyzeExtractionComplexity(selectorAnalysis) {
    const { selectorStrategy, pageInfo, extractionTargets, userInput } = selectorAnalysis;
    
    // Calculate complexity factors
    const factors = {
      selectorComplexity: this.assessSelectorComplexity(selectorStrategy),
      pageComplexity: this.assessPageComplexity(pageInfo),
      dataComplexity: this.assessDataComplexity(extractionTargets),
      userRequirements: this.assessUserRequirements(userInput),
      technicalChallenges: this.identifyTechnicalChallenges(selectorAnalysis)
    };

    // Calculate overall complexity score
    const complexityScore = this.calculateComplexityScore(factors);
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(complexityScore, factors);
    
    return {
      factors,
      complexityScore,
      riskLevel,
      challenges: factors.technicalChallenges,
      recommendations: this.generateComplexityRecommendations(factors)
    };
  }

  assessSelectorComplexity(selectorStrategy) {
    let score = 0;
    
    if (!selectorStrategy.primary) {
      score += 50; // High complexity if no reliable selector
    } else {
      // Assess primary selector
      if (selectorStrategy.primary.stability < 0.5) score += 30;
      if (selectorStrategy.primary.matchCount > 100) score += 20;
      if (selectorStrategy.primary.matchCount === 0) score += 40;
      
      // Assess fallback quality
      if (selectorStrategy.fallbacks.length < 2) score += 15;
    }
    
    return Math.min(100, score);
  }

  assessPageComplexity(pageInfo) {
    let score = 0;
    
    if (pageInfo.isSPA) score += 25;
    if (pageInfo.hasInfiniteScroll) score += 20;
    if (pageInfo.hasLazyLoading) score += 15;
    if (pageInfo.totalElements > 2000) score += 20;
    if (pageInfo.framework === 'react' || pageInfo.framework === 'vue') score += 10;
    
    return Math.min(100, score);
  }

  assessDataComplexity(extractionTargets) {
    let score = 0;
    
    if (!extractionTargets || extractionTargets.length === 0) {
      score += 30; // No clear targets identified
    } else {
      // Multiple target types increase complexity
      if (extractionTargets.length > 3) score += 15;
      
      // Large datasets increase complexity
      const totalItems = extractionTargets.reduce((sum, target) => sum + target.totalCount, 0);
      if (totalItems > 100) score += 20;
      if (totalItems > 500) score += 30;
    }
    
    return Math.min(100, score);
  }

  assessUserRequirements(userInput) {
    let score = 0;
    
    if (userInput.mode === 'smart' && !userInput.manualSelector) {
      score += 20; // AI-driven extraction is more complex
    }
    
    if (userInput.options?.requiresNavigation) score += 25;
    if (userInput.options?.requiresInteraction) score += 30;
    
    return Math.min(100, score);
  }

  identifyTechnicalChallenges(selectorAnalysis) {
    const challenges = [];
    const { pageInfo, selectorStrategy, navigationElements } = selectorAnalysis;
    
    if (pageInfo.isSPA) {
      challenges.push({
        type: 'spa-navigation',
        severity: 'medium',
        description: 'Single Page Application requires state management'
      });
    }
    
    if (pageInfo.hasInfiniteScroll) {
      challenges.push({
        type: 'infinite-scroll',
        severity: 'high',
        description: 'Infinite scroll requires progressive loading strategy'
      });
    }
    
    if (selectorStrategy.confidence < 0.5) {
      challenges.push({
        type: 'unreliable-selectors',
        severity: 'high',
        description: 'Low confidence selectors may fail frequently'
      });
    }
    
    if (pageInfo.hasLazyLoading) {
      challenges.push({
        type: 'lazy-loading',
        severity: 'medium',
        description: 'Lazy loading requires scroll-triggered extraction'
      });
    }
    
    return challenges;
  }

  calculateComplexityScore(factors) {
    const weights = {
      selectorComplexity: 0.3,
      pageComplexity: 0.25,
      dataComplexity: 0.25,
      userRequirements: 0.2
    };
    
    let totalScore = 0;
    Object.entries(weights).forEach(([factor, weight]) => {
      totalScore += factors[factor] * weight;
    });
    
    return Math.min(100, totalScore);
  }

  determineRiskLevel(complexityScore, factors) {
    if (complexityScore < 30) return 'low';
    if (complexityScore < 60) return 'medium';
    return 'high';
  }

  determineOptimalStrategy(complexityAnalysis) {
    const { complexityScore, riskLevel, challenges } = complexityAnalysis;
    
    // Strategy decision matrix
    if (complexityScore < 20) {
      return {
        type: 'simple-extraction',
        method: 'single-agent-dom',
        priority: 'speed',
        confidence: 0.9
      };
    }
    
    if (complexityScore < 50) {
      return {
        type: 'coordinated-extraction',
        method: 'multi-agent-coordinated',
        priority: 'reliability',
        confidence: 0.8
      };
    }
    
    if (challenges.some(c => c.type === 'infinite-scroll' || c.type === 'spa-navigation')) {
      return {
        type: 'adaptive-extraction',
        method: 'intelligent-multi-agent',
        priority: 'adaptability',
        confidence: 0.7
      };
    }
    
    return {
      type: 'robust-extraction',
      method: 'intelligent-multi-agent',
      priority: 'robustness',
      confidence: 0.6
    };
  }

  planResourceAllocation(strategy, complexityAnalysis) {
    const basePlan = {
      requiredAgents: ['coordinator', 'harvester', 'formatter'],
      optionalAgents: [],
      concurrency: 1,
      resourceLimits: {
        maxMemory: '50MB',
        maxCPU: '20%',
        timeout: 30000
      }
    };

    // Adjust plan based on strategy
    switch (strategy.method) {
      case 'single-agent-dom':
        basePlan.requiredAgents.push('scraper-fast');
        basePlan.concurrency = 1;
        basePlan.resourceLimits.timeout = 10000;
        break;
        
      case 'multi-agent-coordinated':
        basePlan.requiredAgents.push('scraper-smart', 'scraper-fast');
        basePlan.concurrency = 2;
        basePlan.resourceLimits.timeout = 20000;
        break;
        
      case 'intelligent-multi-agent':
        basePlan.requiredAgents.push('scraper-smart', 'scraper-vision');
        basePlan.optionalAgents.push('scraper-navigation');
        basePlan.concurrency = 3;
        basePlan.resourceLimits.timeout = 45000;
        basePlan.resourceLimits.maxMemory = '100MB';
        break;
    }

    // Add specialized agents based on challenges
    complexityAnalysis.challenges.forEach(challenge => {
      switch (challenge.type) {
        case 'infinite-scroll':
        case 'lazy-loading':
          if (!basePlan.requiredAgents.includes('scraper-navigation')) {
            basePlan.requiredAgents.push('scraper-navigation');
          }
          break;
        case 'unreliable-selectors':
          if (!basePlan.requiredAgents.includes('scraper-vision')) {
            basePlan.requiredAgents.push('scraper-vision');
          }
          break;
      }
    });

    return basePlan;
  }

  createExecutionTimeline(resourcePlan) {
    const phases = [];
    let currentTime = 0;

    // Phase 1: Initialization
    phases.push({
      name: 'initialization',
      startTime: currentTime,
      duration: 1000,
      agents: ['coordinator'],
      description: 'Initialize extraction environment'
    });
    currentTime += 1000;

    // Phase 2: Primary Extraction
    const extractionDuration = this.estimateExtractionDuration(resourcePlan);
    phases.push({
      name: 'primary-extraction',
      startTime: currentTime,
      duration: extractionDuration,
      agents: resourcePlan.requiredAgents.filter(a => a.startsWith('scraper')),
      description: 'Execute primary data extraction'
    });
    currentTime += extractionDuration;

    // Phase 3: Data Processing
    phases.push({
      name: 'data-processing',
      startTime: currentTime,
      duration: 2000,
      agents: ['harvester'],
      description: 'Aggregate and validate extracted data'
    });
    currentTime += 2000;

    // Phase 4: Output Generation
    phases.push({
      name: 'output-generation',
      startTime: currentTime,
      duration: 1000,
      agents: ['formatter'],
      description: 'Format and prepare final output'
    });
    currentTime += 1000;

    return {
      phases,
      totalDuration: currentTime,
      criticalPath: phases.map(p => p.name),
      parallelizable: this.identifyParallelizablePhases(phases)
    };
  }

  estimateExtractionDuration(resourcePlan) {
    let baseDuration = 5000; // 5 seconds base
    
    // Adjust based on complexity
    if (resourcePlan.requiredAgents.includes('scraper-vision')) {
      baseDuration += 10000; // Vision AI adds time
    }
    
    if (resourcePlan.requiredAgents.includes('scraper-navigation')) {
      baseDuration += 8000; // Navigation adds time
    }
    
    // Adjust for concurrency
    baseDuration = baseDuration / Math.max(1, resourcePlan.concurrency - 1);
    
    return baseDuration;
  }

  defineSuccessCriteria(selectorAnalysis) {
    const { userInput, extractionTargets } = selectorAnalysis;
    
    const criteria = {
      primary: {
        dataExtracted: true,
        minItems: userInput.mode === 'smart' ? 1 : 0,
        maxErrors: 2,
        timeoutRespected: true
      },
      quality: {
        dataValidation: userInput.mode === 'smart',
        schemaCompliance: true,
        duplicateHandling: true
      },
      performance: {
        maxDuration: 60000, // 1 minute max
        memoryEfficient: true,
        resourceCleanup: true
      }
    };

    // Adjust criteria based on extraction targets
    if (extractionTargets && extractionTargets.length > 0) {
      const expectedItems = extractionTargets.reduce((sum, target) => sum + target.totalCount, 0);
      criteria.primary.minItems = Math.max(1, Math.floor(expectedItems * 0.8)); // 80% success rate
    }

    return criteria;
  }

  generateFallbackStrategies(primaryStrategy, complexityAnalysis) {
    const fallbacks = [];

    // Fallback 1: Simpler approach
    if (primaryStrategy.method !== 'single-agent-dom') {
      fallbacks.push({
        trigger: 'primary-timeout',
        strategy: {
          type: 'simplified-extraction',
          method: 'single-agent-dom',
          priority: 'speed',
          confidence: 0.6
        },
        description: 'Fall back to simple DOM extraction if primary method times out'
      });
    }

    // Fallback 2: Manual selector override
    fallbacks.push({
      trigger: 'selector-failure',
      strategy: {
        type: 'manual-extraction',
        method: 'user-guided',
        priority: 'user-control',
        confidence: 0.8
      },
      description: 'Prompt user for manual selector if automatic detection fails'
    });

    // Fallback 3: Vision AI rescue
    if (!primaryStrategy.method.includes('vision')) {
      fallbacks.push({
        trigger: 'dom-extraction-failure',
        strategy: {
          type: 'vision-extraction',
          method: 'vision-only',
          priority: 'robustness',
          confidence: 0.5
        },
        description: 'Use vision AI as last resort if DOM extraction fails'
      });
    }

    return fallbacks;
  }

  generateComplexityRecommendations(factors) {
    const recommendations = [];

    if (factors.selectorComplexity > 50) {
      recommendations.push({
        type: 'selector-improvement',
        message: 'Consider providing a manual CSS selector for better reliability',
        priority: 'high'
      });
    }

    if (factors.pageComplexity > 60) {
      recommendations.push({
        type: 'strategy-adjustment',
        message: 'Complex page detected - using multi-agent approach with extended timeout',
        priority: 'medium'
      });
    }

    if (factors.dataComplexity > 70) {
      recommendations.push({
        type: 'resource-allocation',
        message: 'Large dataset detected - allocating additional processing resources',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  identifyParallelizablePhases(phases) {
    // Identify which phases can run in parallel
    return {
      'data-processing': ['validation', 'deduplication', 'transformation'],
      'output-generation': ['formatting', 'schema-validation']
    };
  }

  // Performance tracking methods
  recordStrategyPerformance(strategy, actualDuration, success) {
    const key = `${strategy.type}_${strategy.method}`;
    
    if (!this.performanceHistory.has(key)) {
      this.performanceHistory.set(key, {
        attempts: 0,
        successes: 0,
        totalDuration: 0,
        averageDuration: 0
      });
    }
    
    const history = this.performanceHistory.get(key);
    history.attempts++;
    if (success) history.successes++;
    history.totalDuration += actualDuration;
    history.averageDuration = history.totalDuration / history.attempts;
    
    console.log(`[StrategyAgent] Updated performance for ${key}:`, history);
  }

  getStrategyRecommendation(complexityAnalysis) {
    // Use historical performance to improve future recommendations
    const strategies = ['simple-extraction', 'coordinated-extraction', 'adaptive-extraction'];
    
    let bestStrategy = strategies[0];
    let bestScore = 0;
    
    strategies.forEach(strategy => {
      const history = this.performanceHistory.get(strategy);
      if (history) {
        const successRate = history.successes / history.attempts;
        const speedScore = Math.max(0, 1 - (history.averageDuration / 30000)); // Normalized to 30s
        const score = successRate * 0.7 + speedScore * 0.3;
        
        if (score > bestScore) {
          bestScore = score;
          bestStrategy = strategy;
        }
      }
    });
    
    return bestStrategy;
  }
}