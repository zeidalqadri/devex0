/**
 * Magnitude Framework Bridge
 * Interfaces between Chrome extension and Magnitude vision AI
 */

export class MagnitudeBridge {
  constructor(llmConfig) {
    this.config = llmConfig;
    this.primaryModel = llmConfig?.primary;
    this.fallbackModels = llmConfig?.alternatives || [];
    this.cache = new Map();
    this.isInitialized = false;
  }

  async init() {
    try {
      // Validate configuration
      if (!this.primaryModel?.apiKey) {
        throw new Error('Primary LLM configuration missing');
      }

      // Test connection to primary model
      await this.testConnection();
      
      this.isInitialized = true;
      console.log('[MagnitudeBridge] Initialized with', this.primaryModel.model);
    } catch (error) {
      console.error('[MagnitudeBridge] Initialization failed:', error);
      this.isInitialized = false;
    }
  }

  async testConnection() {
    try {
      // Simple test request to verify API connectivity
      const testResponse = await this.makeAPIRequest({
        model: this.primaryModel.model,
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 10
      });

      if (!testResponse) {
        throw new Error('API test failed');
      }

      console.log('[MagnitudeBridge] API connection verified');
      return true;
    } catch (error) {
      console.warn('[MagnitudeBridge] API connection test failed:', error);
      return false;
    }
  }

  async analyzeInterface(url) {
    try {
      const cacheKey = `analysis_${url}`;
      
      // Check cache first
      if (this.cache.has(cacheKey)) {
        console.log('[MagnitudeBridge] Returning cached analysis for', url);
        return this.cache.get(cacheKey);
      }

      // Take screenshot of the page
      const screenshot = await this.captureScreenshot(url);
      
      // Analyze with vision AI
      const analysis = await this.performVisionAnalysis(screenshot, url);
      
      // Cache result
      this.cache.set(cacheKey, analysis);
      
      return analysis;

    } catch (error) {
      console.error('[MagnitudeBridge] Interface analysis failed:', error);
      throw error;
    }
  }

  async performVisionAnalysis(screenshot, url) {
    const prompt = `
Analyze this webpage screenshot and provide a structured analysis for web scraping:

URL: ${url}

Please identify:
1. Main content areas and data regions
2. Navigation elements and interactive components
3. Form fields and input elements
4. Data tables and list structures
5. Pagination and dynamic content indicators
6. Potential extraction targets

Return the analysis as a JSON object with the following structure:
{
  "contentRegions": [
    {
      "type": "data_table|list|form|navigation",
      "description": "Description of the region",
      "coordinates": {"x": 0, "y": 0, "width": 0, "height": 0},
      "elements": ["element descriptions"]
    }
  ],
  "extractionTargets": [
    {
      "type": "product|article|listing|data_row",
      "selector": "suggested CSS selector",
      "coordinates": {"x": 0, "y": 0, "width": 0, "height": 0},
      "confidence": 0.9
    }
  ],
  "interactionElements": [
    {
      "type": "button|link|input|dropdown",
      "purpose": "navigation|filter|search|pagination",
      "coordinates": {"x": 0, "y": 0, "width": 0, "height": 0}
    }
  ]
}
`;

    try {
      const response = await this.makeAPIRequest({
        model: this.primaryModel.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: screenshot } }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      });

      return this.parseVisionResponse(response);

    } catch (error) {
      console.error('[MagnitudeBridge] Vision analysis failed:', error);
      throw error;
    }
  }

  async generateExtractionStrategy(analysis) {
    const prompt = `
Based on this website analysis, generate an optimal extraction strategy:

${JSON.stringify(analysis, null, 2)}

Create a comprehensive extraction strategy that includes:
1. Primary extraction method (DOM selectors vs vision coordinates)
2. Fallback strategies for robustness
3. Data validation rules
4. Schema suggestions for structured data
5. Rate limiting and ethical considerations

Return as JSON with this structure:
{
  "primaryMethod": "dom|vision|hybrid",
  "selectors": {
    "primary": ["CSS selectors"],
    "fallback": ["alternative selectors"]
  },
  "visionTargets": [
    {
      "description": "element description",
      "coordinates": {"x": 0, "y": 0, "width": 0, "height": 0},
      "extractionType": "text|attribute|image"
    }
  ],
  "validationRules": ["validation rules"],
  "schemaStructure": {},
  "rateLimiting": {
    "requestsPerMinute": 10,
    "respectRobotsTxt": true
  }
}
`;

    try {
      const response = await this.makeAPIRequest({
        model: this.primaryModel.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1500,
        temperature: 0.1
      });

      return this.parseStrategyResponse(response);

    } catch (error) {
      console.error('[MagnitudeBridge] Strategy generation failed:', error);
      throw error;
    }
  }

  async extractWithVision(extractionData) {
    const { url, schema, options } = extractionData;

    try {
      // Get current page screenshot
      const screenshot = await this.captureScreenshot(url);
      
      // Create extraction prompt based on schema
      const prompt = this.buildExtractionPrompt(schema, options);
      
      // Perform vision-based extraction
      const response = await this.makeAPIRequest({
        model: this.primaryModel.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: screenshot } }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      });

      return this.parseExtractionResponse(response, schema);

    } catch (error) {
      console.error('[MagnitudeBridge] Vision extraction failed:', error);
      throw error;
    }
  }

  async captureScreenshot(url) {
    try {
      // Find or create tab for the URL
      const tabs = await chrome.tabs.query({ url });
      let tab = tabs[0];

      if (!tab) {
        tab = await chrome.tabs.create({ url, active: false });
        await this.waitForTabLoad(tab.id);
      }

      // Capture screenshot
      const screenshot = await chrome.tabs.captureVisibleTab(tab.windowId, {
        format: 'png',
        quality: 90
      });

      return screenshot;

    } catch (error) {
      console.error('[MagnitudeBridge] Screenshot capture failed:', error);
      throw error;
    }
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

  buildExtractionPrompt(schema, options) {
    return `
Extract data from this webpage according to the following schema:

${JSON.stringify(schema, null, 2)}

Instructions:
- Extract all visible data that matches the schema structure
- Maintain data types and validation rules
- Include confidence scores for extracted data
- Return as valid JSON matching the schema

Additional options: ${JSON.stringify(options, null, 2)}
`;
  }

  async makeAPIRequest(requestData) {
    const endpoint = this.getAPIEndpoint(this.primaryModel.model);
    
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.primaryModel.apiKey}`
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      console.error('[MagnitudeBridge] API request failed:', error);
      
      // Try fallback models
      for (const fallback of this.fallbackModels) {
        try {
          const fallbackResponse = await this.tryFallbackModel(fallback, requestData);
          if (fallbackResponse) {
            return fallbackResponse;
          }
        } catch (fallbackError) {
          console.warn('[MagnitudeBridge] Fallback model failed:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  getAPIEndpoint(model) {
    if (model.includes('claude')) {
      return 'https://api.anthropic.com/v1/messages';
    } else if (model.includes('gpt')) {
      return 'https://api.openai.com/v1/chat/completions';
    } else {
      return 'https://api.qwen.ai/v1/chat/completions';
    }
  }

  async tryFallbackModel(fallbackConfig, requestData) {
    const endpoint = this.getAPIEndpoint(fallbackConfig.model);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fallbackConfig.apiKey}`
      },
      body: JSON.stringify({
        ...requestData,
        model: fallbackConfig.model
      })
    });

    if (response.ok) {
      return await response.json();
    }
    
    return null;
  }

  parseVisionResponse(response) {
    try {
      const content = response.content?.[0]?.text || response.choices?.[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('[MagnitudeBridge] Failed to parse vision response:', error);
      return { contentRegions: [], extractionTargets: [], interactionElements: [] };
    }
  }

  parseStrategyResponse(response) {
    try {
      const content = response.content?.[0]?.text || response.choices?.[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('[MagnitudeBridge] Failed to parse strategy response:', error);
      return { primaryMethod: 'dom', selectors: { primary: [], fallback: [] } };
    }
  }

  parseExtractionResponse(response, schema) {
    try {
      const content = response.content?.[0]?.text || response.choices?.[0]?.message?.content;
      return JSON.parse(content);
    } catch (error) {
      console.error('[MagnitudeBridge] Failed to parse extraction response:', error);
      return null;
    }
  }

  clearCache() {
    this.cache.clear();
    console.log('[MagnitudeBridge] Cache cleared');
  }
}