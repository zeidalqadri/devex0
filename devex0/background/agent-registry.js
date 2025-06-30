/**
 * Agent Registry System
 * Manages agent discovery, registration, and selection
 */

export class AgentRegistry {
  constructor() {
    this.agents = new Map();
    this.capabilities = new Map();
    this.domainMappings = new Map();
    this.isInitialized = false;
  }

  async init() {
    try {
      // Load persistent agent data from storage
      await this.loadAgentsFromStorage();
      
      // Initialize domain mappings
      this.initializeDomainMappings();
      
      this.isInitialized = true;
      console.log('[AgentRegistry] Initialized with', this.agents.size, 'agents');
    } catch (error) {
      console.error('[AgentRegistry] Initialization failed:', error);
      throw error;
    }
  }

  async loadAgentsFromStorage() {
    try {
      const stored = await chrome.storage.local.get(['registeredAgents']);
      
      if (stored.registeredAgents) {
        for (const agentData of stored.registeredAgents) {
          this.agents.set(agentData.id, {
            ...agentData,
            status: 'inactive',
            currentLoad: 0,
            lastSeen: null,
            successRates: agentData.successRates || {},
            totalTasks: agentData.totalTasks || 0,
            failedTasks: agentData.failedTasks || 0
          });
        }
      }
    } catch (error) {
      console.warn('[AgentRegistry] Failed to load agents from storage:', error);
    }
  }

  async saveAgentsToStorage() {
    try {
      const agentsArray = Array.from(this.agents.values()).map(agent => ({
        id: agent.id,
        name: agent.name,
        domain: agent.domain,
        capabilities: agent.capabilities,
        script: agent.script,
        config: agent.config,
        successRates: agent.successRates,
        totalTasks: agent.totalTasks,
        failedTasks: agent.failedTasks
      }));

      await chrome.storage.local.set({ registeredAgents: agentsArray });
    } catch (error) {
      console.error('[AgentRegistry] Failed to save agents to storage:', error);
    }
  }

  initializeDomainMappings() {
    const domains = [
      {
        name: 'generic',
        requiredCapabilities: ['analysis', 'extraction'],
        optionalCapabilities: [
          'user-input-processing', 'dom-extraction', 'css-generation', 
          'selector-optimization', 'complexity-analysis', 'resource-planning', 
          'data-aggregation', 'format-conversion', 'content-analysis', 
          'pattern-recognition', 'structure-detection'
        ],
        platforms: ['*'] // Works on all platforms - no hardcoded domains
      }
    ];

    domains.forEach(domain => {
      this.domainMappings.set(domain.name, domain);
    });
  }

  async registerAgent(agentData) {
    try {
      const agentId = agentData.id;
      
      if (this.agents.has(agentId)) {
        throw new Error(`Agent ${agentId} already registered`);
      }

      // Validate agent data
      this.validateAgentData(agentData);

      // Create agent record
      const agent = {
        id: agentId,
        name: agentData.name,
        domain: agentData.domain,
        capabilities: agentData.capabilities || [],
        script: agentData.script,
        config: agentData.config || {},
        status: 'inactive',
        currentLoad: 0,
        lastSeen: null,
        registeredAt: Date.now(),
        successRates: {},
        totalTasks: 0,
        failedTasks: 0,
        version: agentData.version || '1.0.0'
      };

      // Store agent
      this.agents.set(agentId, agent);

      // Update capability mappings
      this.updateCapabilityMappings(agent);

      // Persist to storage
      await this.saveAgentsToStorage();

      console.log(`[AgentRegistry] Registered agent: ${agentId}`);
      return agent;

    } catch (error) {
      console.error(`[AgentRegistry] Failed to register agent ${agentData.id}:`, error);
      throw error;
    }
  }

  validateAgentData(agentData) {
    const required = ['id', 'name', 'domain'];
    
    for (const field of required) {
      if (!agentData[field]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate domain
    if (!this.domainMappings.has(agentData.domain)) {
      throw new Error(`Invalid domain: ${agentData.domain}`);
    }

    // Validate capabilities
    if (agentData.capabilities) {
      const domain = this.domainMappings.get(agentData.domain);
      const requiredCaps = domain.requiredCapabilities;
      
      for (const reqCap of requiredCaps) {
        if (!agentData.capabilities.includes(reqCap)) {
          throw new Error(`Missing required capability: ${reqCap}`);
        }
      }
    }
  }

  updateCapabilityMappings(agent) {
    agent.capabilities.forEach(capability => {
      if (!this.capabilities.has(capability)) {
        this.capabilities.set(capability, new Set());
      }
      this.capabilities.get(capability).add(agent.id);
    });
  }

  async unregisterAgent(agentId) {
    try {
      const agent = this.agents.get(agentId);
      
      if (!agent) {
        throw new Error(`Agent ${agentId} not found`);
      }

      // Remove from capability mappings
      agent.capabilities.forEach(capability => {
        const capabilitySet = this.capabilities.get(capability);
        if (capabilitySet) {
          capabilitySet.delete(agentId);
          if (capabilitySet.size === 0) {
            this.capabilities.delete(capability);
          }
        }
      });

      // Remove agent
      this.agents.delete(agentId);

      // Persist changes
      await this.saveAgentsToStorage();

      console.log(`[AgentRegistry] Unregistered agent: ${agentId}`);
      return true;

    } catch (error) {
      console.error(`[AgentRegistry] Failed to unregister agent ${agentId}:`, error);
      throw error;
    }
  }

  async updateAgentStatus(agentId, statusData) {
    try {
      const agent = this.agents.get(agentId);
      
      if (!agent) {
        console.warn(`[AgentRegistry] Attempted to update unknown agent: ${agentId}`);
        return false;
      }

      // Update agent status
      Object.assign(agent, {
        ...statusData,
        lastSeen: Date.now()
      });

      // Update specific metrics if provided
      if (statusData.taskCompleted) {
        agent.totalTasks++;
        
        if (statusData.success) {
          const domain = statusData.domain || agent.domain;
          if (!agent.successRates[domain]) {
            agent.successRates[domain] = { successes: 0, total: 0 };
          }
          agent.successRates[domain].successes++;
          agent.successRates[domain].total++;
        } else {
          agent.failedTasks++;
          const domain = statusData.domain || agent.domain;
          if (!agent.successRates[domain]) {
            agent.successRates[domain] = { successes: 0, total: 0 };
          }
          agent.successRates[domain].total++;
        }
      }

      return true;

    } catch (error) {
      console.error(`[AgentRegistry] Failed to update agent status for ${agentId}:`, error);
      return false;
    }
  }

  async getAvailableAgents() {
    return Array.from(this.agents.values()).filter(agent => 
      agent.status !== 'disabled'
    );
  }

  async getAgentsForDomain(domain) {
    return Array.from(this.agents.values()).filter(agent => 
      agent.domain === domain && agent.status !== 'disabled'
    );
  }

  async getAgentsForCapability(capability) {
    const agentIds = this.capabilities.get(capability);
    
    if (!agentIds) {
      return [];
    }

    return Array.from(agentIds)
      .map(id => this.agents.get(id))
      .filter(agent => agent && agent.status !== 'disabled');
  }

  async getAgentsForPlatform(url) {
    try {
      const hostname = new URL(url).hostname;
      const matchingAgents = [];

      // Find domain that matches this platform
      for (const [domainName, domainConfig] of this.domainMappings) {
        if (domainConfig.platforms.some(platform => 
          hostname.includes(platform) || platform.includes(hostname)
        )) {
          const domainAgents = await this.getAgentsForDomain(domainName);
          matchingAgents.push(...domainAgents);
        }
      }

      return matchingAgents;

    } catch (error) {
      console.error('[AgentRegistry] Failed to get agents for platform:', error);
      return [];
    }
  }

  getBestAgentForTask(agents, taskType, domain) {
    if (agents.length === 0) {
      return null;
    }

    // Sort agents by suitability score
    const scoredAgents = agents.map(agent => ({
      agent,
      score: this.calculateAgentScore(agent, taskType, domain)
    }));

    scoredAgents.sort((a, b) => b.score - a.score);
    
    return scoredAgents[0].agent;
  }

  calculateAgentScore(agent, taskType, domain) {
    let score = 0;

    // Base score for availability
    if (agent.status === 'active') score += 50;
    else if (agent.status === 'idle') score += 40;
    else if (agent.status === 'inactive') score += 20;

    // Load factor (prefer less loaded agents)
    score += Math.max(0, 30 - agent.currentLoad);

    // Success rate for domain
    if (agent.successRates[domain]) {
      const rate = agent.successRates[domain];
      const successRate = rate.total > 0 ? rate.successes / rate.total : 0;
      score += successRate * 40;
    }

    // Capability match
    const domainConfig = this.domainMappings.get(domain);
    if (domainConfig) {
      const optionalCaps = domainConfig.optionalCapabilities;
      const matchingOptionalCaps = agent.capabilities.filter(cap => 
        optionalCaps.includes(cap)
      ).length;
      score += matchingOptionalCaps * 5;
    }

    // Recent activity bonus
    if (agent.lastSeen && Date.now() - agent.lastSeen < 300000) { // 5 minutes
      score += 10;
    }

    return score;
  }

  async getAgentStats() {
    const stats = {
      total: this.agents.size,
      active: 0,
      idle: 0,
      inactive: 0,
      disabled: 0,
      byDomain: {},
      byCapability: {}
    };

    // Count by status
    for (const agent of this.agents.values()) {
      stats[agent.status]++;

      // Count by domain
      if (!stats.byDomain[agent.domain]) {
        stats.byDomain[agent.domain] = 0;
      }
      stats.byDomain[agent.domain]++;

      // Count by capability
      agent.capabilities.forEach(capability => {
        if (!stats.byCapability[capability]) {
          stats.byCapability[capability] = 0;
        }
        stats.byCapability[capability]++;
      });
    }

    return stats;
  }

  async checkAgentHealth() {
    const now = Date.now();
    const staleThreshold = 10 * 60 * 1000; // 10 minutes
    const staleAgents = [];

    for (const [id, agent] of this.agents) {
      if (agent.status === 'active' && 
          agent.lastSeen && 
          now - agent.lastSeen > staleThreshold) {
        
        agent.status = 'inactive';
        staleAgents.push(id);
      }
    }

    if (staleAgents.length > 0) {
      console.log(`[AgentRegistry] Marked ${staleAgents.length} agents as inactive due to staleness`);
    }

    return staleAgents;
  }

  getDomainConfig(domain) {
    return this.domainMappings.get(domain);
  }

  getCapabilityAgents(capability) {
    return this.capabilities.get(capability) || new Set();
  }

  async resetAgentMetrics(agentId) {
    const agent = this.agents.get(agentId);
    
    if (agent) {
      agent.successRates = {};
      agent.totalTasks = 0;
      agent.failedTasks = 0;
      await this.saveAgentsToStorage();
      return true;
    }
    
    return false;
  }
}