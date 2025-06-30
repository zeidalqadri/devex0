/**
 * Harvester Agent - Result Aggregation and Validation
 * Collects results from scraper agents and ensures data quality
 */

export class HarvesterAgent {
  constructor() {
    this.isInitialized = false;
    this.activeHarvests = new Map();
    this.qualityMetrics = new Map();
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[HarvesterAgent] Initializing...');
    this.isInitialized = true;
  }

  /**
   * Start a new harvest session to collect results from multiple scrapers
   * @param {Object} executionPlan - Plan from Strategy Agent
   * @param {string} harvestId - Unique identifier for this harvest
   */
  async startHarvest(executionPlan, harvestId) {
    try {
      console.log(`[HarvesterAgent] Starting harvest ${harvestId}...`);

      const harvestSession = {
        id: harvestId,
        executionPlan,
        startTime: Date.now(),
        expectedAgents: executionPlan.resourcePlan.requiredAgents.filter(a => a.startsWith('scraper')),
        receivedResults: new Map(),
        consolidatedData: null,
        status: 'active',
        quality: {
          duplicates: 0,
          errors: 0,
          validItems: 0,
          totalItems: 0
        }
      };

      this.activeHarvests.set(harvestId, harvestSession);
      
      console.log(`[HarvesterAgent] Harvest ${harvestId} initialized, expecting results from:`, harvestSession.expectedAgents);
      return harvestSession;

    } catch (error) {
      console.error(`[HarvesterAgent] Failed to start harvest ${harvestId}:`, error);
      throw error;
    }
  }

  /**
   * Receive results from a scraper agent
   * @param {string} harvestId - Harvest session ID
   * @param {string} agentId - ID of the reporting agent
   * @param {Object} results - Extracted data and metadata
   */
  async receiveResults(harvestId, agentId, results) {
    try {
      const session = this.activeHarvests.get(harvestId);
      if (!session) {
        throw new Error(`Harvest session ${harvestId} not found`);
      }

      console.log(`[HarvesterAgent] Receiving results from ${agentId} for harvest ${harvestId}`);

      // Store results with metadata
      session.receivedResults.set(agentId, {
        agentId,
        receivedAt: Date.now(),
        data: results.data,
        metadata: results.metadata || {},
        success: results.success,
        errors: results.errors || []
      });

      // Check if all expected results are received
      const receivedCount = session.receivedResults.size;
      const expectedCount = session.expectedAgents.length;
      
      console.log(`[HarvesterAgent] Received ${receivedCount}/${expectedCount} results for harvest ${harvestId}`);

      // If all results received, trigger consolidation
      if (receivedCount >= expectedCount) {
        await this.consolidateResults(harvestId);
      }

      return {
        success: true,
        harvestId,
        receivedCount,
        expectedCount,
        isComplete: receivedCount >= expectedCount
      };

    } catch (error) {
      console.error(`[HarvesterAgent] Failed to receive results for harvest ${harvestId}:`, error);
      throw error;
    }
  }

  /**
   * Consolidate all received results into final dataset
   * @param {string} harvestId - Harvest session ID
   */
  async consolidateResults(harvestId) {
    try {
      const session = this.activeHarvests.get(harvestId);
      if (!session) {
        throw new Error(`Harvest session ${harvestId} not found`);
      }

      console.log(`[HarvesterAgent] Consolidating results for harvest ${harvestId}...`);

      // Collect all data from successful agents
      const allData = [];
      const errors = [];
      const metadata = {
        sources: [],
        processingStats: {
          totalAgents: session.receivedResults.size,
          successfulAgents: 0,
          failedAgents: 0
        }
      };

      // Process results from each agent
      for (const [agentId, result] of session.receivedResults.entries()) {
        metadata.sources.push({
          agentId,
          success: result.success,
          itemCount: Array.isArray(result.data) ? result.data.length : (result.data ? 1 : 0),
          processingTime: result.metadata.processingTime || 0
        });

        if (result.success && result.data) {
          // Add data with source tracking
          const dataWithSource = this.addSourceMetadata(result.data, agentId);
          allData.push(...(Array.isArray(dataWithSource) ? dataWithSource : [dataWithSource]));
          metadata.processingStats.successfulAgents++;
        } else {
          metadata.processingStats.failedAgents++;
          if (result.errors) {
            errors.push(...result.errors);
          }
        }
      }

      // Perform data quality operations
      const qualityResults = await this.performQualityAssurance(allData, session);
      
      // Create final consolidated dataset
      const consolidatedData = {
        data: qualityResults.cleanedData,
        metadata: {
          ...metadata,
          harvestId,
          consolidatedAt: Date.now(),
          processingDuration: Date.now() - session.startTime,
          quality: qualityResults.qualityMetrics,
          totalItems: qualityResults.cleanedData.length,
          errors: errors
        }
      };

      // Update session
      session.consolidatedData = consolidatedData;
      session.status = 'completed';
      session.quality = qualityResults.qualityMetrics;

      console.log(`[HarvesterAgent] Consolidation complete for harvest ${harvestId}:`, {
        totalItems: consolidatedData.data.length,
        quality: qualityResults.qualityMetrics
      });

      return consolidatedData;

    } catch (error) {
      console.error(`[HarvesterAgent] Consolidation failed for harvest ${harvestId}:`, error);
      const session = this.activeHarvests.get(harvestId);
      if (session) {
        session.status = 'failed';
        session.error = error.message;
      }
      throw error;
    }
  }

  /**
   * Perform comprehensive data quality assurance
   * @param {Array} allData - Combined data from all agents
   * @param {Object} session - Harvest session
   */
  async performQualityAssurance(allData, session) {
    console.log(`[HarvesterAgent] Performing quality assurance on ${allData.length} items...`);

    // Step 1: Validate data structure
    const validatedData = this.validateDataStructure(allData);
    
    // Step 2: Remove duplicates
    const deduplicatedData = this.removeDuplicates(validatedData);
    
    // Step 3: Clean and normalize data
    const cleanedData = this.cleanAndNormalizeData(deduplicatedData);
    
    // Step 4: Validate business rules
    const finalData = this.validateBusinessRules(cleanedData, session);
    
    // Step 5: Calculate quality metrics
    const qualityMetrics = this.calculateQualityMetrics(allData, finalData);

    return {
      cleanedData: finalData,
      qualityMetrics
    };
  }

  validateDataStructure(data) {
    const validated = [];
    const errors = [];

    data.forEach((item, index) => {
      try {
        // Basic validation
        if (item === null || item === undefined) {
          errors.push(`Item ${index}: null or undefined data`);
          return;
        }

        // Ensure item is an object
        if (typeof item !== 'object') {
          // Convert simple values to objects
          validated.push({ value: item, _index: index });
        } else {
          // Add index for tracking
          validated.push({ ...item, _index: index });
        }
      } catch (error) {
        errors.push(`Item ${index}: validation error - ${error.message}`);
      }
    });

    console.log(`[HarvesterAgent] Structure validation: ${validated.length} valid, ${errors.length} errors`);
    return validated;
  }

  removeDuplicates(data) {
    if (data.length === 0) return data;

    const seen = new Set();
    const unique = [];
    let duplicateCount = 0;

    data.forEach(item => {
      // Create a hash of the item content (excluding metadata)
      const contentHash = this.createContentHash(item);
      
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(item);
      } else {
        duplicateCount++;
      }
    });

    console.log(`[HarvesterAgent] Deduplication: removed ${duplicateCount} duplicates, ${unique.length} unique items`);
    return unique;
  }

  createContentHash(item) {
    // Create a hash based on actual content, ignoring metadata fields
    const contentItem = { ...item };
    delete contentItem._source;
    delete contentItem._index;
    delete contentItem._timestamp;
    
    return JSON.stringify(contentItem);
  }

  cleanAndNormalizeData(data) {
    return data.map(item => {
      const cleaned = { ...item };

      // Normalize common fields
      Object.keys(cleaned).forEach(key => {
        if (typeof cleaned[key] === 'string') {
          // Trim whitespace
          cleaned[key] = cleaned[key].trim();
          
          // Remove extra whitespace
          cleaned[key] = cleaned[key].replace(/\s+/g, ' ');
          
          // Handle empty strings
          if (cleaned[key] === '') {
            cleaned[key] = null;
          }
        }
      });

      // Normalize URLs
      if (cleaned.url && typeof cleaned.url === 'string') {
        try {
          const url = new URL(cleaned.url);
          cleaned.url = url.href;
        } catch (error) {
          // Invalid URL, keep original
        }
      }

      // Normalize prices (if present)
      if (cleaned.price && typeof cleaned.price === 'string') {
        const priceNumber = parseFloat(cleaned.price.replace(/[^\d.-]/g, ''));
        if (!isNaN(priceNumber)) {
          cleaned.priceNumeric = priceNumber;
        }
      }

      return cleaned;
    });
  }

  validateBusinessRules(data, session) {
    const { executionPlan } = session;
    const validated = [];
    const rejected = [];

    data.forEach(item => {
      const validationResult = this.applyBusinessRules(item, executionPlan);
      
      if (validationResult.isValid) {
        validated.push(validationResult.item);
      } else {
        rejected.push({
          item,
          reason: validationResult.reason
        });
      }
    });

    console.log(`[HarvesterAgent] Business rule validation: ${validated.length} valid, ${rejected.length} rejected`);
    
    if (rejected.length > 0) {
      console.log('[HarvesterAgent] Rejected items:', rejected.map(r => r.reason));
    }

    return validated;
  }

  applyBusinessRules(item, executionPlan) {
    // Default validation - can be extended based on domain requirements
    
    // Rule 1: Item must have some meaningful content
    const hasContent = Object.keys(item).some(key => 
      !key.startsWith('_') && 
      item[key] !== null && 
      item[key] !== undefined && 
      item[key] !== ''
    );

    if (!hasContent) {
      return {
        isValid: false,
        reason: 'No meaningful content',
        item
      };
    }

    // Rule 2: Apply domain-specific rules based on extraction targets
    const domainValidation = this.validateDomainSpecificRules(item, executionPlan);
    if (!domainValidation.isValid) {
      return domainValidation;
    }

    return {
      isValid: true,
      item: this.enhanceWithMetadata(item)
    };
  }

  validateDomainSpecificRules(item, executionPlan) {
    // Basic domain-agnostic validation
    // Can be extended for specific domains
    
    return { isValid: true, item };
  }

  enhanceWithMetadata(item) {
    return {
      ...item,
      _harvestedAt: Date.now(),
      _version: '1.0'
    };
  }

  calculateQualityMetrics(originalData, finalData) {
    const metrics = {
      totalOriginalItems: originalData.length,
      totalFinalItems: finalData.length,
      dataRetentionRate: originalData.length > 0 ? finalData.length / originalData.length : 0,
      duplicatesRemoved: originalData.length - finalData.length,
      averageFieldCount: 0,
      completenessScore: 0,
      confidenceScore: 0.8 // Default confidence
    };

    if (finalData.length > 0) {
      // Calculate average field count
      const totalFields = finalData.reduce((sum, item) => {
        return sum + Object.keys(item).filter(key => !key.startsWith('_')).length;
      }, 0);
      metrics.averageFieldCount = totalFields / finalData.length;

      // Calculate completeness score
      const nonNullFields = finalData.reduce((sum, item) => {
        return sum + Object.keys(item).filter(key => 
          !key.startsWith('_') && 
          item[key] !== null && 
          item[key] !== undefined && 
          item[key] !== ''
        ).length;
      }, 0);
      metrics.completenessScore = totalFields > 0 ? nonNullFields / totalFields : 0;
    }

    return metrics;
  }

  addSourceMetadata(data, agentId) {
    if (Array.isArray(data)) {
      return data.map(item => ({
        ...item,
        _source: agentId,
        _timestamp: Date.now()
      }));
    } else {
      return {
        ...data,
        _source: agentId,
        _timestamp: Date.now()
      };
    }
  }

  /**
   * Get consolidated results for a harvest
   * @param {string} harvestId - Harvest session ID
   */
  async getHarvestResults(harvestId) {
    const session = this.activeHarvests.get(harvestId);
    if (!session) {
      throw new Error(`Harvest session ${harvestId} not found`);
    }

    if (session.status !== 'completed') {
      throw new Error(`Harvest ${harvestId} is not completed (status: ${session.status})`);
    }

    return session.consolidatedData;
  }

  /**
   * Get harvest status and progress
   * @param {string} harvestId - Harvest session ID
   */
  getHarvestStatus(harvestId) {
    const session = this.activeHarvests.get(harvestId);
    if (!session) {
      return { found: false };
    }

    return {
      found: true,
      id: harvestId,
      status: session.status,
      progress: {
        received: session.receivedResults.size,
        expected: session.expectedAgents.length,
        percentage: Math.round((session.receivedResults.size / session.expectedAgents.length) * 100)
      },
      startTime: session.startTime,
      duration: Date.now() - session.startTime,
      quality: session.quality
    };
  }

  /**
   * Clean up completed harvest sessions
   * @param {number} maxAge - Maximum age in milliseconds (default: 1 hour)
   */
  cleanupHarvests(maxAge = 3600000) {
    const now = Date.now();
    const toRemove = [];

    for (const [harvestId, session] of this.activeHarvests.entries()) {
      if (now - session.startTime > maxAge) {
        toRemove.push(harvestId);
      }
    }

    toRemove.forEach(harvestId => {
      this.activeHarvests.delete(harvestId);
      console.log(`[HarvesterAgent] Cleaned up harvest session: ${harvestId}`);
    });

    return toRemove.length;
  }

  /**
   * Force complete a harvest with partial results
   * @param {string} harvestId - Harvest session ID
   */
  async forceCompleteHarvest(harvestId) {
    const session = this.activeHarvests.get(harvestId);
    if (!session) {
      throw new Error(`Harvest session ${harvestId} not found`);
    }

    if (session.receivedResults.size === 0) {
      throw new Error(`No results received for harvest ${harvestId}`);
    }

    console.log(`[HarvesterAgent] Force completing harvest ${harvestId} with ${session.receivedResults.size} results`);
    return await this.consolidateResults(harvestId);
  }
}