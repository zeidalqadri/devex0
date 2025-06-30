/**
 * Devex0 Coordinator Agent
 * Central command and control hub for functional multi-agent architecture
 */

import { AgentRegistry } from './agent-registry.js';
import { TaskQueue } from './task-queue.js';
import { MagnitudeBridge } from './magnitude-bridge.js';
import { StructureAgent } from '../agents/structure-agent.js';
import { SelectorAgent } from '../agents/selector-agent.js';
import { StrategyAgent } from '../agents/strategy-agent.js';
import { HarvesterAgent } from '../agents/harvester-agent.js';
import { FormatterAgent } from '../agents/formatter-agent.js';
import { ReconnaissanceAgent } from '../agents/reconnaissance-agent.js';

class CoordinatorAgent {
  constructor() {
    this.agentRegistry = new AgentRegistry();
    this.taskQueue = new TaskQueue();
    this.magnitudeBridge = null;
    this.activeTasks = new Map();
    this.isInitialized = false;
    
    // Functional agents
    this.structureAgent = new StructureAgent();
    this.selectorAgent = new SelectorAgent();
    this.strategyAgent = new StrategyAgent();
    this.harvesterAgent = new HarvesterAgent();
    this.formatterAgent = new FormatterAgent();
    this.reconnaissanceAgent = new ReconnaissanceAgent();
    
    this.init();
  }

  async init() {
    try {
      // Initialize agent registry
      await this.agentRegistry.init();
      
      // Initialize task queue
      await this.taskQueue.init();
      
      // Initialize functional agents
      await this.initializeFunctionalAgents();
      
      // Initialize Magnitude bridge
      await this.initializeMagnitudeBridge();
      
      // Set up message listeners
      this.setupMessageListeners();
      
      // Set up alarm listeners for scheduled tasks
      this.setupAlarmListeners();
      
      this.isInitialized = true;
      console.log('[Coordinator] Devex0 functional multi-agent system initialized');
      
      // Register functional agents
      await this.registerFunctionalAgents();
      
    } catch (error) {
      console.error('[Coordinator] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async initializeFunctionalAgents() {
    try {
      await this.structureAgent.init();
      await this.selectorAgent.init();
      await this.strategyAgent.init();
      await this.harvesterAgent.init();
      await this.formatterAgent.init();
      await this.reconnaissanceAgent.init();
      console.log('[Coordinator] Functional agents initialized');
    } catch (error) {
      console.error('[Coordinator] Failed to initialize functional agents:', error);
      throw error;
    }
  }

  async initializeMagnitudeBridge() {
    try {
      // Get API keys from storage
      const config = await chrome.storage.local.get(['llmConfig']);
      
      if (config.llmConfig && config.llmConfig.primary?.apiKey) {
        this.magnitudeBridge = new MagnitudeBridge(config.llmConfig);
        console.log('[Coordinator] Magnitude bridge initialized');
      } else {
        console.warn('[Coordinator] LLM configuration not found, vision AI disabled');
      }
    } catch (error) {
      console.error('[Coordinator] Failed to initialize Magnitude bridge:', error);
    }
  }

  setupMessageListeners() {
    // Listen for messages from content scripts and popup
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Indicates async response
    });

    // Listen for external connections (for agent communication)
    chrome.runtime.onConnect.addListener((port) => {
      this.handleAgentConnection(port);
    });
  }

  setupAlarmListeners() {
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleScheduledTask(alarm);
    });
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      const { action, data, taskId } = message;

      switch (action) {
        case 'REGISTER_AGENT':
          await this.registerAgent(data);
          sendResponse({ success: true });
          break;

        case 'SUBMIT_TASK':
          const task = await this.submitTask(data);
          sendResponse({ success: true, taskId: task.id });
          break;

        case 'GET_TASK_STATUS':
          const status = await this.getTaskStatus(data.taskId);
          sendResponse({ success: true, status });
          break;

        case 'GET_AGENTS':
          const agents = await this.agentRegistry.getAvailableAgents();
          sendResponse({ success: true, agents });
          break;

        case 'CANCEL_TASK':
          await this.cancelTask(data.taskId);
          sendResponse({ success: true });
          break;

        case 'EXTRACT_DATA':
          await this.handleFunctionalExtraction(data, sendResponse);
          break;

        case 'SMART_EXTRACT':
          await this.handleSmartExtraction(data, sendResponse);
          break;

        case 'ANALYZE_SITE':
          await this.handleSiteAnalysis(data, sendResponse);
          break;

        case 'START_RECONNAISSANCE':
          await this.handleStartReconnaissance(data, sendResponse);
          break;

        case 'PROCESS_RECON_FEEDBACK':
          await this.handleProcessReconFeedback(data, sendResponse);
          break;

        case 'EXECUTE_OPTIMIZED_EXTRACTION':
          await this.handleExecuteOptimizedExtraction(data, sendResponse);
          break;

        case 'SEND_TO_GOOGLE_DOCS':
          await this.handleSendToGoogleDocs(data, sendResponse);
          break;

        case 'ASSESS_GOOGLE_DOCS':
          await this.handleAssessGoogleDocs(data, sendResponse);
          break;

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('[Coordinator] Message handling error:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  /**
   * Handle functional extraction using the 6-agent workflow
   * Structure → Selector → Strategy → Coordinator → Harvester → Formatter
   */
  async handleFunctionalExtraction(userInput, sendResponse) {
    const startTime = Date.now();
    let harvestId = null;
    
    try {
      console.log('[Coordinator] Starting functional extraction workflow...');

      // Step 1: Structure Agent - Initial analysis and user input processing
      console.log('[Coordinator] Step 1: Structure Agent analysis...');
      const structuralAnalysis = await this.structureAgent.processUserRequest(userInput);

      // Step 2: Selector Agent - CSS generation and optimization
      console.log('[Coordinator] Step 2: Selector Agent processing...');
      const selectorAnalysis = await this.selectorAgent.processStructuralAnalysis(structuralAnalysis);

      // Step 3: Strategy Agent - Complexity analysis and execution planning
      console.log('[Coordinator] Step 3: Strategy Agent planning...');
      const executionPlan = await this.strategyAgent.createExecutionPlan(selectorAnalysis);

      // Step 4: Coordinator - Create harvest session and coordinate scraper agents
      console.log('[Coordinator] Step 4: Coordinator orchestration...');
      harvestId = this.generateHarvestId();
      const harvestSession = await this.harvesterAgent.startHarvest(executionPlan, harvestId);

      // Execute scraping based on strategy
      await this.executeScrapingStrategy(executionPlan, harvestId);

      // Step 5: Harvester Agent - Wait for results and consolidate
      console.log('[Coordinator] Step 5: Harvester Agent consolidation...');
      const consolidatedData = await this.harvesterAgent.getHarvestResults(harvestId);

      // Step 6: Formatter Agent - Generate final output
      console.log('[Coordinator] Step 6: Formatter Agent output generation...');
      const finalOutput = await this.formatterAgent.formatOutput(
        consolidatedData,
        userInput,
        executionPlan
      );

      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Functional extraction completed in ${processingTime}ms`);

      sendResponse({
        success: true,
        harvestId,
        output: finalOutput,
        summary: this.formatterAgent.createSummary(finalOutput),
        processingTime
      });

    } catch (error) {
      console.error('[Coordinator] Functional extraction failed:', error);
      
      // Clean up harvest session if it was created
      if (harvestId) {
        try {
          await this.harvesterAgent.forceCompleteHarvest(harvestId);
        } catch (cleanupError) {
          console.warn('[Coordinator] Harvest cleanup failed:', cleanupError);
        }
      }

      sendResponse({
        success: false,
        error: error.message,
        harvestId,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle enhanced smart extraction with proper DOM integration
   * This bridges the functional agents with actual DOM access
   */
  async handleSmartExtraction(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Starting enhanced smart extraction...');
      const { url, domain, selector, tabId, rawHTML, options } = data;
      console.log('[Coordinator] Smart extraction params:', { url, domain, selector, tabId: !!tabId, htmlLength: rawHTML?.length });

      // Create user input object for functional agents
      const userInput = {
        url,
        mode: 'smart',
        selector: selector || null,
        domain,
        options: options || {}
      };

      // Step 1: Run Structure Agent analysis with DOM access via content script
      console.log('[Coordinator] Step 1: DOM-enabled structure analysis...');
      const domAnalysis = await this.getEnhancedDOMAnalysis(tabId, userInput);
      
      // Step 2: Run functional agent pipeline with DOM data
      const structuralAnalysis = await this.structureAgent.processUserRequest({
        ...userInput,
        domData: domAnalysis // Inject DOM data
      });

      const selectorAnalysis = await this.selectorAgent.processStructuralAnalysis(structuralAnalysis);
      const executionPlan = await this.strategyAgent.createExecutionPlan(selectorAnalysis);

      // Step 3: Generate pattern analysis
      console.log('[Coordinator] Step 3: Pattern analysis...');
      const patterns = await this.analyzePatterns(tabId, rawHTML, executionPlan);

      // Step 4: Create intelligent summary
      const summary = this.createIntelligentSummary(structuralAnalysis, patterns, executionPlan);

      // Step 5: Optionally run extraction if patterns found
      let extractedData = null;
      if (structuralAnalysis.extractionTargets && structuralAnalysis.extractionTargets.length > 0) {
        try {
          extractedData = await this.executeSmartExtraction(tabId, executionPlan);
        } catch (extractionError) {
          console.warn('[Coordinator] Data extraction failed:', extractionError);
        }
      }

      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Smart extraction completed in ${processingTime}ms`);

      sendResponse({
        success: true,
        analysis: {
          ...structuralAnalysis,
          data: extractedData?.data || [],
          itemCount: extractedData?.data?.length || 0
        },
        summary,
        patterns,
        processingTime
      });

    } catch (error) {
      console.error('[Coordinator] Smart extraction failed:', error);
      sendResponse({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Get enhanced DOM analysis by running structure analysis in content script
   */
  async getEnhancedDOMAnalysis(tabId, userInput) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'ENHANCED_DOM_ANALYSIS',
        userInput
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.domData);
        } else {
          reject(new Error(response?.error || 'DOM analysis failed'));
        }
      });
    });
  }

  /**
   * Analyze patterns in the page structure and content
   */
  async analyzePatterns(tabId, rawHTML, executionPlan) {
    try {
      // Run pattern analysis in content script with DOM access
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          action: 'ANALYZE_PATTERNS',
          executionPlan
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(response || { success: false });
          }
        });
      });

      if (response.success) {
        return response.patterns;
      }

      // Fallback: basic HTML pattern analysis
      return this.analyzeHTMLPatterns(rawHTML);
      
    } catch (error) {
      console.warn('[Coordinator] Pattern analysis failed:', error);
      return this.analyzeHTMLPatterns(rawHTML);
    }
  }

  /**
   * Fallback HTML pattern analysis (without DOM access)
   */
  analyzeHTMLPatterns(rawHTML) {
    const patterns = {
      namingConvention: 'unknown',
      commonPrefixes: [],
      selectorReliability: 'unknown',
      classPatterns: {},
      elementCounts: {}
    };

    try {
      // Analyze class naming patterns
      const classMatches = rawHTML.match(/class="([^"]*)"/g) || [];
      const classes = [];
      
      classMatches.forEach(match => {
        const classNames = match.replace(/class="([^"]*)"/, '$1').split(/\s+/);
        classes.push(...classNames.filter(c => c.trim()));
      });

      if (classes.length > 0) {
        // Detect naming convention
        const hasUnderscores = classes.some(c => c.includes('_'));
        const hasDashes = classes.some(c => c.includes('-'));
        const hasCamelCase = classes.some(c => /[a-z][A-Z]/.test(c));

        if (hasUnderscores && hasDashes) {
          patterns.namingConvention = 'mixed';
        } else if (hasUnderscores) {
          patterns.namingConvention = 'underscore';
        } else if (hasDashes) {
          patterns.namingConvention = 'kebab-case';
        } else if (hasCamelCase) {
          patterns.namingConvention = 'camelCase';
        } else {
          patterns.namingConvention = 'lowercase';
        }

        // Find common prefixes
        const prefixCounts = {};
        classes.forEach(className => {
          const parts = className.split(/[-_]/);
          if (parts.length > 1) {
            const prefix = parts[0];
            prefixCounts[prefix] = (prefixCounts[prefix] || 0) + 1;
          }
        });

        patterns.commonPrefixes = Object.entries(prefixCounts)
          .filter(([prefix, count]) => count >= 3)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([prefix]) => prefix);
      }

      // Count common elements
      const elementMatches = rawHTML.match(/<(\w+)/g) || [];
      elementMatches.forEach(match => {
        const tag = match.replace('<', '');
        patterns.elementCounts[tag] = (patterns.elementCounts[tag] || 0) + 1;
      });

    } catch (error) {
      console.warn('[Coordinator] HTML pattern analysis error:', error);
    }

    return patterns;
  }

  /**
   * Create intelligent summary of analysis results
   */
  createIntelligentSummary(structuralAnalysis, patterns, executionPlan) {
    return {
      pageInfo: {
        framework: structuralAnalysis.framework,
        complexity: structuralAnalysis.complexity,
        totalElements: structuralAnalysis.pageInfo?.totalElements,
        contentTypes: structuralAnalysis.contentTypes
      },
      extractionStrategy: {
        recommended: structuralAnalysis.recommendedStrategy,
        confidence: executionPlan.strategy?.confidence || 0,
        method: executionPlan.strategy?.method
      },
      patterns: {
        namingConvention: patterns.namingConvention,
        reliability: this.assessSelectorReliability(patterns, structuralAnalysis)
      },
      recommendations: this.generateRecommendations(structuralAnalysis, patterns, executionPlan)
    };
  }

  /**
   * Execute smart extraction based on analysis
   */
  async executeSmartExtraction(tabId, executionPlan) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'EXTRACT_WITH_SELECTORS',
        selectors: executionPlan.selectorStrategy,
        userInput: executionPlan.userInput,
        options: { smart: true }
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Smart extraction failed'));
        }
      });
    });
  }

  assessSelectorReliability(patterns, structuralAnalysis) {
    let score = 0;
    
    // Consistent naming convention increases reliability
    if (patterns.namingConvention !== 'mixed') score += 30;
    
    // Common prefixes suggest structured approach
    if (patterns.commonPrefixes.length > 0) score += 20;
    
    // Multiple extraction targets with reliable selectors
    if (structuralAnalysis.extractionTargets) {
      const reliableTargets = structuralAnalysis.extractionTargets.filter(
        target => target.selectors && target.selectors.some(s => s.count > 1 && s.count < 100)
      );
      score += Math.min(reliableTargets.length * 10, 30);
    }
    
    if (score >= 60) return 'high';
    if (score >= 30) return 'medium';
    return 'low';
  }

  generateRecommendations(structuralAnalysis, patterns, executionPlan) {
    const recommendations = [];

    if (patterns.namingConvention === 'mixed') {
      recommendations.push({
        type: 'css-consistency',
        message: 'Consider using consistent CSS naming convention for better maintainability'
      });
    }

    if (structuralAnalysis.complexity === 'complex') {
      recommendations.push({
        type: 'extraction-strategy',
        message: 'Complex page detected - consider using specific selectors for reliable extraction'
      });
    }

    if (!structuralAnalysis.extractionTargets || structuralAnalysis.extractionTargets.length === 0) {
      recommendations.push({
        type: 'data-structure',
        message: 'No clear data patterns detected - manual selector may be needed'
      });
    }

    return recommendations;
  }

  generateHarvestId() {
    return `harvest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Execute scraping strategy based on the execution plan
   * Creates and manages scraper agents as needed
   */
  async executeScrapingStrategy(executionPlan, harvestId) {
    const { strategy, resourcePlan } = executionPlan;
    console.log(`[Coordinator] Executing strategy: ${strategy.type}`);

    // Get the current tab or create one
    const tab = await this.ensureTargetTab(executionPlan.url);

    // Execute scraping based on strategy type
    switch (strategy.method) {
      case 'single-agent-dom':
        await this.executeSingleAgentScraping(executionPlan, harvestId, tab.id);
        break;
        
      case 'multi-agent-coordinated':
        await this.executeMultiAgentScraping(executionPlan, harvestId, tab.id);
        break;
        
      case 'intelligent-multi-agent':
        await this.executeIntelligentScraping(executionPlan, harvestId, tab.id);
        break;
        
      default:
        // Fallback to simple DOM extraction
        await this.executeSingleAgentScraping(executionPlan, harvestId, tab.id);
    }
  }

  async executeSingleAgentScraping(executionPlan, harvestId, tabId) {
    try {
      // Simple DOM extraction using content script
      const result = await this.executeContentScriptExtraction(executionPlan, tabId);
      
      // Report results to harvester
      await this.harvesterAgent.receiveResults(harvestId, 'scraper-fast', {
        success: true,
        data: result.data || [],
        metadata: {
          method: 'dom-extraction',
          processingTime: result.processingTime || 0,
          itemCount: Array.isArray(result.data) ? result.data.length : 1
        }
      });
    } catch (error) {
      console.error('[Coordinator] Single agent scraping failed:', error);
      await this.harvesterAgent.receiveResults(harvestId, 'scraper-fast', {
        success: false,
        data: [],
        errors: [error.message],
        metadata: { method: 'dom-extraction' }
      });
    }
  }

  async executeMultiAgentScraping(executionPlan, harvestId, tabId) {
    try {
      // Execute multiple extraction methods in parallel
      const promises = [
        this.executeContentScriptExtraction(executionPlan, tabId),
        this.executeAlternativeExtraction(executionPlan, tabId)
      ];

      const results = await Promise.allSettled(promises);
      
      // Report results from each agent
      results.forEach((result, index) => {
        const agentId = index === 0 ? 'scraper-smart' : 'scraper-fast';
        if (result.status === 'fulfilled') {
          this.harvesterAgent.receiveResults(harvestId, agentId, {
            success: true,
            data: result.value.data || [],
            metadata: {
              method: index === 0 ? 'smart-extraction' : 'fast-extraction',
              processingTime: result.value.processingTime || 0
            }
          });
        } else {
          this.harvesterAgent.receiveResults(harvestId, agentId, {
            success: false,
            data: [],
            errors: [result.reason?.message || 'Unknown error'],
            metadata: { method: index === 0 ? 'smart-extraction' : 'fast-extraction' }
          });
        }
      });
    } catch (error) {
      console.error('[Coordinator] Multi-agent scraping failed:', error);
    }
  }

  async executeIntelligentScraping(executionPlan, harvestId, tabId) {
    try {
      // Use vision AI if available, plus DOM extraction
      const promises = [];
      
      // Always include DOM extraction
      promises.push(this.executeContentScriptExtraction(executionPlan, tabId));
      
      // Add vision extraction if configured
      if (this.magnitudeBridge) {
        promises.push(this.executeVisionExtraction(executionPlan));
      }
      
      // Add navigation extraction if needed
      if (executionPlan.requiresNavigation) {
        promises.push(this.executeNavigationExtraction(executionPlan, tabId));
      }

      const results = await Promise.allSettled(promises);
      
      // Report results from each agent
      const agentIds = ['scraper-smart', 'scraper-vision', 'scraper-navigation'];
      results.forEach((result, index) => {
        const agentId = agentIds[index];
        if (result.status === 'fulfilled') {
          this.harvesterAgent.receiveResults(harvestId, agentId, {
            success: true,
            data: result.value.data || [],
            metadata: {
              method: agentId.replace('scraper-', '') + '-extraction',
              processingTime: result.value.processingTime || 0
            }
          });
        } else {
          this.harvesterAgent.receiveResults(harvestId, agentId, {
            success: false,
            data: [],
            errors: [result.reason?.message || 'Unknown error'],
            metadata: { method: agentId.replace('scraper-', '') + '-extraction' }
          });
        }
      });
    } catch (error) {
      console.error('[Coordinator] Intelligent scraping failed:', error);
    }
  }

  async executeContentScriptExtraction(executionPlan, tabId) {
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'EXTRACT_WITH_SELECTORS',
        selectors: executionPlan.selectorStrategy,
        userInput: executionPlan.userInput,
        options: executionPlan.userInput.options || {}
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve({
            data: response.data,
            processingTime: Date.now() - startTime
          });
        } else {
          reject(new Error(response?.error || 'Content script extraction failed'));
        }
      });
    });
  }

  async executeAlternativeExtraction(executionPlan, tabId) {
    // Alternative extraction method - could use different selectors or approach
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'EXTRACT_ALTERNATIVE',
        fallbackSelectors: executionPlan.selectorStrategy.fallbacks,
        userInput: executionPlan.userInput
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve({
            data: response.data,
            processingTime: Date.now() - startTime
          });
        } else {
          reject(new Error(response?.error || 'Alternative extraction failed'));
        }
      });
    });
  }

  async executeNavigationExtraction(executionPlan, tabId) {
    // Handle pagination, infinite scroll, etc.
    const startTime = Date.now();
    
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'EXTRACT_WITH_NAVIGATION',
        selectors: executionPlan.selectorStrategy,
        navigationElements: executionPlan.navigationElements,
        userInput: executionPlan.userInput
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve({
            data: response.data,
            processingTime: Date.now() - startTime
          });
        } else {
          reject(new Error(response?.error || 'Navigation extraction failed'));
        }
      });
    });
  }

  async ensureTargetTab(url) {
    // Get existing tab or create new one
    const tabs = await chrome.tabs.query({ url: url });
    
    if (tabs.length > 0) {
      return tabs[0];
    }
    
    // Create new tab
    const tab = await chrome.tabs.create({ 
      url: url, 
      active: false 
    });
    
    // Wait for tab to load
    await this.waitForTabLoad(tab.id);
    
    return tab;
  }

  async handleSiteAnalysis(data, sendResponse) {
    try {
      const { url, options = {} } = data;
      
      if (!this.magnitudeBridge) {
        throw new Error('Vision AI not configured');
      }

      // Perform site analysis using Magnitude
      const analysis = await this.magnitudeBridge.analyzeInterface(url);
      
      // Generate extraction strategy
      const strategy = await this.magnitudeBridge.generateExtractionStrategy(analysis);
      
      sendResponse({
        success: true,
        analysis,
        strategy
      });

    } catch (error) {
      console.error('[Coordinator] Site analysis failed:', error);
      sendResponse({
        success: false,
        error: error.message
      });
    }
  }

  async executeExtractionTask(task) {
    try {
      // Get tab information
      const tabs = await chrome.tabs.query({ url: task.url });
      let tab = tabs[0];

      // If tab doesn't exist, create it
      if (!tab) {
        tab = await chrome.tabs.create({ 
          url: task.url, 
          active: false 
        });
        
        // Wait for tab to load
        await this.waitForTabLoad(tab.id);
      }

      // Inject extraction scripts
      await this.injectExtractionScripts(tab.id, task);

      // Execute extraction using vision AI if available
      let result;
      if (this.magnitudeBridge && task.options.useVision !== false) {
        result = await this.executeVisionExtraction(task);
      } else {
        result = await this.executeDOMExtraction(task, tab.id);
      }

      // Validate result against schema
      if (task.schema) {
        result = await this.validateExtractionResult(result, task.schema);
      }

      // Update task completion
      await this.taskQueue.updateTask(task.id, {
        status: 'completed',
        result,
        endTime: Date.now()
      });

      // Clean up if temporary tab
      if (!tabs[0]) {
        await chrome.tabs.remove(tab.id);
      }

      return result;

    } catch (error) {
      await this.taskQueue.updateTask(task.id, {
        status: 'failed',
        error: error.message,
        endTime: Date.now()
      });
      throw error;
    }
  }

  async executeVisionExtraction(task) {
    try {
      return await this.magnitudeBridge.extractWithVision({
        url: task.url,
        schema: task.schema,
        options: task.options
      });
    } catch (error) {
      console.warn('[Coordinator] Vision extraction failed, falling back to DOM:', error);
      return await this.executeDOMExtraction(task);
    }
  }

  async executeDOMExtraction(task, tabId) {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(tabId, {
        action: 'EXTRACT_DATA',
        schema: task.schema,
        domain: task.domain,
        options: task.options
      }, (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response.success) {
          resolve(response.data);
        } else {
          reject(new Error(response.error));
        }
      });
    });
  }

  async injectExtractionScripts(tabId, task) {
    try {
      // Inject domain-specific agents
      const domainScripts = this.getDomainScripts(task.domain);
      
      for (const script of domainScripts) {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: [script]
        });
      }
    } catch (error) {
      console.warn('[Coordinator] Failed to inject some scripts:', error);
    }
  }

  getDomainScripts(domain) {
    const scripts = [
      'utils/messaging.js',
      'content-scripts/site-analyzer.js',
      'content-scripts/extractor.js'
    ];

    // Add domain-specific scripts
    switch (domain) {
      case 'maritime':
        scripts.push('agents/maritime/extractor.js');
        break;
      case 'luxury':
        scripts.push('agents/luxury/extractor.js');
        break;
      case 'realestate':
        scripts.push('agents/realestate/extractor.js');
        break;
      case 'financial':
        scripts.push('agents/financial/extractor.js');
        break;
    }

    return scripts;
  }

  async validateExtractionResult(result, schema) {
    try {
      // Dynamic import of schema validation
      const { validateSchema } = await import('../utils/schema-validator.js');
      return await validateSchema(result, schema);
    } catch (error) {
      console.warn('[Coordinator] Schema validation failed:', error);
      return result; // Return unvalidated result
    }
  }

  selectBestAgent(agents, task) {
    // Simple agent selection - in practice, this would consider
    // agent load, success rates, and specialization
    return agents.reduce((best, current) => {
      if (!best) return current;
      
      // Prefer agents with lower current load
      if (current.currentLoad < best.currentLoad) return current;
      
      // Prefer agents with higher success rate for this domain
      const currentRate = current.successRates[task.domain] || 0;
      const bestRate = best.successRates[task.domain] || 0;
      
      return currentRate > bestRate ? current : best;
    });
  }

  async waitForTabLoad(tabId, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const checkStatus = () => {
        chrome.tabs.get(tabId, (tab) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }
          
          if (tab.status === 'complete') {
            resolve(tab);
          } else if (Date.now() - startTime > timeout) {
            reject(new Error('Tab load timeout'));
          } else {
            setTimeout(checkStatus, 100);
          }
        });
      };
      
      checkStatus();
    });
  }

  async registerFunctionalAgents() {
    // Register the 6 functional agents
    const functionalAgents = [
      {
        id: 'structure-agent',
        name: 'Structure Analysis Agent',
        domain: 'functional',
        capabilities: ['analysis', 'extraction', 'user-input-processing'],
        script: 'agents/structure-agent.js'
      },
      {
        id: 'selector-agent',
        name: 'CSS Selector Agent',
        domain: 'functional', 
        capabilities: ['analysis', 'extraction', 'css-generation', 'selector-optimization'],
        script: 'agents/selector-agent.js'
      },
      {
        id: 'strategy-agent',
        name: 'Strategy Planning Agent',
        domain: 'functional',
        capabilities: ['analysis', 'extraction', 'complexity-analysis', 'resource-planning'],
        script: 'agents/strategy-agent.js'
      },
      {
        id: 'coordinator-agent',
        name: 'Coordination Agent',
        domain: 'functional',
        capabilities: ['analysis', 'extraction', 'task-coordination', 'scraper-management'],
        script: 'background/coordinator.js'
      },
      {
        id: 'harvester-agent',
        name: 'Data Harvester Agent',
        domain: 'functional',
        capabilities: ['analysis', 'extraction', 'data-aggregation', 'quality-assurance'],
        script: 'agents/harvester-agent.js'
      },
      {
        id: 'formatter-agent',
        name: 'Output Formatter Agent',
        domain: 'functional',
        capabilities: ['analysis', 'extraction', 'format-conversion', 'output-generation'],
        script: 'agents/formatter-agent.js'
      }
    ];

    for (const agent of functionalAgents) {
      try {
        await this.agentRegistry.registerAgent(agent);
        console.log(`[Coordinator] Registered functional agent: ${agent.id}`);
      } catch (error) {
        console.warn(`[Coordinator] Failed to register agent ${agent.id}:`, error);
      }
    }
  }

  async handleScheduledTask(alarm) {
    try {
      const task = await this.taskQueue.getTask(alarm.name);
      if (task && task.type === 'scheduled') {
        await this.executeExtractionTask(task);
      }
    } catch (error) {
      console.error('[Coordinator] Scheduled task execution failed:', error);
    }
  }

  async registerAgent(agentData) {
    return await this.agentRegistry.registerAgent(agentData);
  }

  async submitTask(taskData) {
    return await this.taskQueue.addTask(taskData);
  }

  async getTaskStatus(taskId) {
    return await this.taskQueue.getTask(taskId);
  }

  async cancelTask(taskId) {
    return await this.taskQueue.cancelTask(taskId);
  }

  handleAgentConnection(port) {
    console.log('[Coordinator] Agent connected:', port.name);
    
    port.onMessage.addListener((message) => {
      this.handleAgentMessage(message, port);
    });

    port.onDisconnect.addListener(() => {
      console.log('[Coordinator] Agent disconnected:', port.name);
    });
  }

  async handleAgentMessage(message, port) {
    try {
      const { action, data } = message;
      
      switch (action) {
        case 'AGENT_STATUS_UPDATE':
          await this.agentRegistry.updateAgentStatus(port.name, data);
          break;
          
        case 'TASK_PROGRESS_UPDATE':
          await this.taskQueue.updateTaskProgress(data.taskId, data.progress);
          break;
          
        case 'REQUEST_ASSISTANCE':
          await this.handleAssistanceRequest(data, port);
          break;
      }
    } catch (error) {
      console.error('[Coordinator] Agent message handling error:', error);
      port.postMessage({ error: error.message });
    }
  }

  async handleAssistanceRequest(data, requestingPort) {
    // Handle inter-agent communication and assistance requests
    const { assistanceType, targetDomain, payload } = data;
    
    const assistantAgents = await this.agentRegistry.getAgentsForCapability(assistanceType);
    
    if (assistantAgents.length > 0) {
      // Forward request to appropriate agent
      const assistant = assistantAgents[0];
      // Implementation would forward the request
    }
  }

  /**
   * Handle reconnaissance workflow start
   */
  async handleStartReconnaissance(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Starting reconnaissance workflow...');
      const { url, tabId, options } = data;
      
      if (!url) {
        throw new Error('URL is required for reconnaissance');
      }
      
      // Check if coordinator is initialized
      if (!this.isInitialized) {
        console.warn('[Coordinator] Not fully initialized, attempting to continue...');
      }
      
      // Check if reconnaissance agent is available
      if (!this.reconnaissanceAgent) {
        throw new Error('Reconnaissance agent not available');
      }
      
      // Add tabId to options for content script communication
      const enhancedOptions = {
        ...options,
        tabId: tabId
      };
      
      // Start reconnaissance using the ReconnaissanceAgent
      console.log('[Coordinator] Calling reconnaissance agent...');
      const reconData = await this.reconnaissanceAgent.startReconnaissance(url, enhancedOptions);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Reconnaissance completed in ${processingTime}ms`);
      
      sendResponse({
        success: true,
        reconData: reconData,
        processingTime: processingTime
      });
      
    } catch (error) {
      console.error('[Coordinator] Reconnaissance failed:', error);
      console.error('[Coordinator] Error stack:', error.stack);
      
      sendResponse({
        success: false,
        error: error.message,
        details: error.stack,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle user feedback processing for reconnaissance
   */
  async handleProcessReconFeedback(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Processing reconnaissance feedback...');
      const { reconId, userFeedback } = data;
      
      // Process user feedback through ReconnaissanceAgent
      const extractionPlan = await this.reconnaissanceAgent.processUserFeedback(userFeedback);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Feedback processing completed in ${processingTime}ms`);
      
      sendResponse({
        success: true,
        extractionPlan: extractionPlan,
        processingTime: processingTime
      });
      
    } catch (error) {
      console.error('[Coordinator] Feedback processing failed:', error);
      sendResponse({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle optimized extraction execution
   */
  async handleExecuteOptimizedExtraction(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Executing optimized extraction...');
      const { reconId } = data;
      
      // Get the extraction request from ReconnaissanceAgent
      const extractionRequest = await this.reconnaissanceAgent.executeOptimizedExtraction();
      
      // Execute the optimized extraction using existing pipeline
      const results = await this.executeOptimizedExtractionPipeline(extractionRequest.data);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Optimized extraction completed in ${processingTime}ms`);
      
      sendResponse({
        success: true,
        results: results,
        processingTime: processingTime
      });
      
    } catch (error) {
      console.error('[Coordinator] Optimized extraction failed:', error);
      sendResponse({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Execute optimized extraction pipeline based on reconnaissance plan
   */
  async executeOptimizedExtractionPipeline(extractionData) {
    const { url, plan, targets, userInput } = extractionData;
    
    try {
      // Create or get target tab
      const tab = await this.ensureTargetTab(url);
      
      // Execute extraction for each selected target
      const targetResults = [];
      let totalExtractedItems = 0;
      let successfulTargets = 0;
      
      for (const target of targets) {
        try {
          console.log(`[Coordinator] Extracting target: ${target.name}`);
          
          // Execute targeted extraction
          const result = await this.executeTargetExtraction(target, tab.id);
          
          if (result.success) {
            targetResults.push({
              id: target.id,
              name: target.name,
              success: true,
              itemCount: result.data ? result.data.length : 0,
              data: result.data,
              sampleData: result.data ? result.data.slice(0, 3) : []
            });
            
            totalExtractedItems += result.data ? result.data.length : 0;
            successfulTargets++;
          } else {
            targetResults.push({
              id: target.id,
              name: target.name,
              success: false,
              error: result.error,
              itemCount: 0
            });
          }
          
        } catch (targetError) {
          console.warn(`[Coordinator] Target extraction failed for ${target.name}:`, targetError);
          targetResults.push({
            id: target.id,
            name: target.name,
            success: false,
            error: targetError.message,
            itemCount: 0
          });
        }
      }
      
      // Consolidate all extracted data
      const allData = targetResults
        .filter(result => result.success && result.data)
        .flatMap(result => result.data);
      
      // Calculate success rate
      const successRate = targets.length > 0 ? Math.round((successfulTargets / targets.length) * 100) : 0;
      
      return {
        url: url,
        reconId: extractionData.reconId,
        summary: {
          targetsProcessed: targets.length,
          successfulTargets: successfulTargets,
          extractedItems: totalExtractedItems,
          successRate: successRate
        },
        targetResults: targetResults,
        data: allData,
        plan: plan
      };
      
    } catch (error) {
      console.error('[Coordinator] Optimized extraction pipeline failed:', error);
      throw error;
    }
  }

  /**
   * Execute extraction for a specific target
   */
  async executeTargetExtraction(target, tabId) {
    try {
      // Use the target's selector and configuration
      const extractionConfig = {
        selector: target.selector,
        expectedItems: target.estimatedItems,
        targetType: target.type,
        options: {
          timeout: 5000,
          retries: 2
        }
      };
      
      // Execute extraction via content script
      const response = await new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(tabId, {
          action: 'EXTRACT_WITH_SELECTORS',
          selectors: {
            primary: target.selector,
            fallbacks: []
          },
          userInput: extractionConfig,
          options: extractionConfig.options
        }, (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response && response.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || 'Target extraction failed'));
          }
        });
      });
      
      return response;
      
    } catch (error) {
      console.error(`[Coordinator] Target extraction failed for ${target.name}:`, error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Handle sending extraction data to Google Docs
   */
  async handleSendToGoogleDocs(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Sending data to Google Docs...');
      const { content, metadata } = data;
      
      if (!content) {
        throw new Error('No content provided for Google Docs');
      }

      // Format content for Google Docs API
      const documentContent = this.formatContentForDocs(content);
      
      // Create document title
      const title = content.title || `Devex0 Extraction ${new Date().toISOString().slice(0, 10)}`;
      
      // For now, simulate Google Docs API call
      // In production, this would use the actual Google Docs API
      const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      
      // Store the document content for assessment
      await chrome.storage.local.set({
        [`docs_${documentId}`]: {
          content: documentContent,
          metadata: metadata,
          timestamp: Date.now(),
          title: title
        }
      });
      
      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Document created in ${processingTime}ms`);
      
      sendResponse({
        success: true,
        documentId: documentId,
        documentTitle: title,
        url: `https://docs.google.com/document/d/${documentId}/edit`, // Simulated URL
        processingTime: processingTime
      });
      
    } catch (error) {
      console.error('[Coordinator] Google Docs integration failed:', error);
      sendResponse({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Handle LLM assessment of Google Docs content
   */
  async handleAssessGoogleDocs(data, sendResponse) {
    const startTime = Date.now();
    
    try {
      console.log('[Coordinator] Assessing Google Docs content...');
      const { documentId, assessmentType, criteria } = data;
      
      if (!documentId) {
        throw new Error('Document ID required for assessment');
      }

      // Retrieve document content
      const stored = await chrome.storage.local.get([`docs_${documentId}`]);
      const documentData = stored[`docs_${documentId}`];
      
      if (!documentData) {
        throw new Error('Document not found');
      }

      // Perform LLM assessment
      const assessment = await this.performLLMAssessment(documentData, criteria);
      
      const processingTime = Date.now() - startTime;
      console.log(`[Coordinator] Assessment completed in ${processingTime}ms`);
      
      sendResponse({
        success: true,
        assessment: assessment,
        documentId: documentId,
        processingTime: processingTime
      });
      
    } catch (error) {
      console.error('[Coordinator] Assessment failed:', error);
      sendResponse({
        success: false,
        error: error.message,
        processingTime: Date.now() - startTime
      });
    }
  }

  /**
   * Format content for Google Docs API
   */
  formatContentForDocs(content) {
    if (typeof content === 'string') {
      return content;
    }
    
    if (content.sections) {
      let formatted = `${content.title}\n\n`;
      
      content.sections.forEach(section => {
        formatted += `${section.heading}\n`;
        formatted += section.content.join('\n') + '\n\n';
      });
      
      return formatted;
    }
    
    return JSON.stringify(content, null, 2);
  }

  /**
   * Perform LLM assessment of document content
   */
  async performLLMAssessment(documentData, criteria) {
    try {
      // Extract content for analysis
      const content = documentData.content;
      const metadata = documentData.metadata;
      
      // Analyze data quality
      const dataQuality = this.assessDataQuality(content, metadata);
      
      // Identify extraction opportunities
      const extractionOpportunities = this.identifyExtractionOpportunities(content);
      
      // Assess automation potential
      const automationPotential = this.assessAutomationPotential(content, metadata);
      
      // Generate next steps
      const nextSteps = this.generateNextSteps(dataQuality, extractionOpportunities, automationPotential);
      
      return {
        dataQuality,
        extractionOpportunities,
        automationPotential,
        nextSteps,
        assessment_timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('[Coordinator] LLM assessment error:', error);
      throw error;
    }
  }

  /**
   * Assess data quality
   */
  assessDataQuality(content, metadata) {
    let score = 5; // Base score
    const insights = [];
    
    // Check data completeness
    if (content.includes('No data extracted')) {
      score = 2;
      insights.push('No meaningful data was extracted');
    } else if (content.includes('... and') && content.includes('more items')) {
      score += 2;
      insights.push('Large dataset detected with good coverage');
    }
    
    // Check data structure
    if (content.includes('Items extracted:')) {
      const match = content.match(/Items extracted: (\d+)/);
      if (match) {
        const itemCount = parseInt(match[1]);
        if (itemCount > 50) score += 2;
        else if (itemCount > 10) score += 1;
        insights.push(`${itemCount} items successfully extracted`);
      }
    }
    
    // Check for variety in data
    if (content.includes('JSON.stringify')) {
      score += 1;
      insights.push('Structured data detected');
    }
    
    return {
      score: Math.min(10, score),
      insights: insights,
      recommendation: score >= 7 ? 'High quality data suitable for automation' : 
                    score >= 4 ? 'Moderate quality data with optimization potential' :
                                'Low quality data - review extraction strategy'
    };
  }

  /**
   * Identify extraction opportunities
   */
  identifyExtractionOpportunities(content) {
    const opportunities = [];
    
    if (content.includes('Framework:')) {
      const framework = content.match(/Framework: (\w+)/)?.[1];
      if (framework && framework !== 'vanilla') {
        opportunities.push(`${framework} framework detected - leverage framework-specific selectors`);
      }
    }
    
    if (content.includes('Confidence:')) {
      const confidence = content.match(/Confidence: (\d+)%/)?.[1];
      if (confidence && parseInt(confidence) < 70) {
        opportunities.push('Low confidence extraction - refine selectors or try different approach');
      }
    }
    
    if (content.includes('items extracted:') && content.includes('0')) {
      opportunities.push('Zero items extracted - review page structure and selectors');
    }
    
    return {
      count: opportunities.length,
      opportunities: opportunities,
      priority: opportunities.length > 2 ? 'high' : opportunities.length > 0 ? 'medium' : 'low'
    };
  }

  /**
   * Assess automation potential
   */
  assessAutomationPotential(content, metadata) {
    let score = 5;
    const factors = [];
    
    // Check URL pattern
    if (metadata?.url) {
      if (metadata.url.includes('/product') || metadata.url.includes('/item')) {
        score += 2;
        factors.push('Product/item page structure - good for automation');
      }
      
      if (metadata.url.includes('/search') || metadata.url.includes('/list')) {
        score += 1;
        factors.push('List/search page - suitable for bulk extraction');
      }
    }
    
    // Check processing time
    if (content.includes('Processing time:')) {
      const timeMatch = content.match(/Processing time: (\d+)ms/);
      if (timeMatch) {
        const time = parseInt(timeMatch[1]);
        if (time < 2000) {
          score += 1;
          factors.push('Fast extraction speed suitable for automation');
        }
      }
    }
    
    // Check data consistency
    if (content.includes('... and') && content.includes('more items')) {
      score += 2;
      factors.push('Consistent data pattern ideal for automation');
    }
    
    return {
      score: Math.min(10, score),
      factors: factors,
      recommendation: score >= 7 ? 'Excellent automation candidate' :
                     score >= 4 ? 'Good automation potential with optimization' :
                                 'Limited automation potential - manual review needed'
    };
  }

  /**
   * Generate next steps based on assessment
   */
  generateNextSteps(dataQuality, extractionOpportunities, automationPotential) {
    const steps = [];
    
    if (dataQuality.score < 4) {
      steps.push({
        priority: 'high',
        action: 'Improve extraction strategy',
        description: 'Review and optimize selectors for better data capture'
      });
    }
    
    if (extractionOpportunities.count > 0) {
      steps.push({
        priority: 'medium',
        action: 'Address extraction opportunities',
        description: 'Implement suggested improvements for better results'
      });
    }
    
    if (automationPotential.score >= 7) {
      steps.push({
        priority: 'high',
        action: 'Implement automation',
        description: 'Set up scheduled extraction for this data source'
      });
    }
    
    // Always suggest monitoring
    steps.push({
      priority: 'low',
      action: 'Monitor data source',
      description: 'Track changes in page structure and data availability'
    });
    
    return steps;
  }
}

// Initialize coordinator when service worker starts
const coordinator = new CoordinatorAgent();

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CoordinatorAgent };
}