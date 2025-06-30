# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Devex0 is a sophisticated multi-agent web scraping system built upon the devex Chrome extension foundation. It leverages multi-agent architecture patterns from [tokenbender/agent-guides](https://github.com/tokenbender/agent-guides) and integrates vision AI capabilities from [Magnitude](https://github.com/magnitudedev/magnitude) to create a modular, intelligent scraping system where specialized agents collaborate to extract, process, and analyze web data with precision and efficiency.

## Core Concept

Unlike traditional web scrapers, devex0 employs multiple specialized AI agents that work together to:
- Analyze target websites using both DOM structure and vision AI for optimal extraction strategies
- Adapt to different site structures using visual understanding independent of DOM complexity
- Execute coordinated data extraction with pixel-precise element targeting
- Process and validate extracted data through collaborative analysis with schema validation
- Provide seamless, spotless data extraction with natural language configuration

## Multi-Agent Architecture

### Agent Types

#### 1. Coordinator Agent (Enhanced Background Service Worker)
- **Role**: Central command and control hub
- **Responsibilities**: 
  - Task distribution and scheduling across agents
  - Inter-agent communication routing
  - Resource management and conflict resolution  
  - Data aggregation and export coordination
  - Progress monitoring and error recovery

#### 2. Site Analysis Agents (Vision-Enhanced Content Scripts)
- **Role**: Website intelligence and strategy development
- **Responsibilities**:
  - DOM structure analysis and visual interface mapping
  - Vision AI element identification using pixel coordinates
  - Hybrid CSS selector + visual coordinate targeting
  - Natural language extraction pattern generation
  - Dynamic content detection with visual change monitoring
  - Zod schema generation for structured data extraction

#### 3. Extraction Agents (Vision-Powered Content Scripts)
- **Role**: Data harvesting specialists
- **Responsibilities**:
  - Hybrid DOM/vision-based element extraction
  - Precise mouse/keyboard interactions via pixel coordinates
  - Form interaction with visual confirmation
  - Real-time visual change monitoring and adaptation
  - Rate limiting and ethical scraping compliance
  - Schema-validated data extraction with type safety

#### 4. Processing Agents (Data Pipeline)
- **Role**: Data transformation and enrichment
- **Responsibilities**:
  - Data cleaning, normalization, and validation
  - Pattern recognition and relationship mapping
  - Duplicate detection and deduplication
  - Multi-format export preparation
  - Statistical analysis and reporting

#### 5. Monitor Agents (Quality Assurance)
- **Role**: System health and compliance
- **Responsibilities**:
  - Performance monitoring and optimization
  - Error detection and automated recovery
  - Ethical scraping guideline enforcement
  - Security and privacy compliance
  - Real-time progress tracking and alerts

### Communication Protocol

Agents communicate through Chrome extension message passing system:
- **chrome.runtime.sendMessage()** for inter-component communication
- **chrome.tabs.sendMessage()** for coordinator-to-content script messaging
- **chrome.storage.local** for persistent state and data sharing
- **Custom event system** for real-time coordination

## Vision AI Integration (Magnitude Framework)

### Core Vision AI Capabilities

Devex0 integrates [Magnitude's](https://github.com/magnitudedev/magnitude) vision-first browser automation framework to transcend traditional DOM limitations:

#### Vision-Based Element Identification
- **Pixel-Coordinate Targeting**: Uses visually grounded LLMs to identify precise element locations
- **DOM-Independent Navigation**: Works regardless of CSS classes, IDs, or DOM structure changes
- **Visual Pattern Recognition**: Identifies elements by visual appearance and context
- **Adaptive Fallback**: Combines vision AI with traditional selectors for maximum reliability

#### Natural Language Interface Control
```javascript
// Natural language extraction commands
await agent.extract('Find all product titles and prices', {
  products: z.array(z.object({
    title: z.string(),
    price: z.string().transform(str => parseFloat(str.replace('$', ''))),
    availability: z.boolean().describe('Is product in stock?')
  }))
});

// Vision-guided navigation
await agent.act('Click the "Add to Cart" button for the first product');
await agent.act('Navigate to checkout page');
```

#### Schema-Driven Data Extraction
- **Zod Integration**: Type-safe data extraction with automatic validation
- **Dynamic Schema Generation**: AI-generated schemas based on visual content analysis
- **Intelligent Data Inference**: Extracts implied data not explicitly visible in DOM
- **Multi-Level Validation**: Schema validation + visual verification + logical consistency checks

### Vision AI Agent Enhancement

#### Site Analysis Agents + Vision
```javascript
// Enhanced site analysis with vision AI
class VisionSiteAnalyzer {
  async analyzeInterface(url) {
    const visualMap = await this.magnitude.analyze(url, {
      task: 'Map all interactive elements and data regions',
      schema: siteStructureSchema
    });
    
    const domStructure = await this.analyzeDOMStructure();
    
    return this.combineAnalysis(visualMap, domStructure);
  }
  
  async generateExtractionStrategy(analysis) {
    return await this.llm.generateStrategy({
      visualContext: analysis.visualMap,
      domContext: analysis.domStructure,
      targetData: this.extractionGoals
    });
  }
}
```

#### Extraction Agents + Vision
```javascript
// Vision-enhanced extraction with fallback strategies
class VisionExtractor {
  async extractData(strategy) {
    try {
      // Primary: Vision-based extraction
      return await this.magnitude.extract(strategy.visualQuery, strategy.schema);
    } catch (error) {
      // Fallback: Traditional DOM extraction
      return await this.domExtract(strategy.domSelectors, strategy.schema);
    }
  }
  
  async verifyExtraction(data) {
    // Visual verification of extracted data
    return await this.magnitude.verify(
      `Confirm extracted data matches visible content`,
      { expectedData: data }
    );
  }
}
```

### Magnitude Integration Architecture

#### Chrome Extension Bridge
- **magnitude-bridge.js**: Interfaces between Chrome extension and Magnitude framework
- **Vision Coordinator**: Manages vision AI tasks and coordinates with Chrome extension agents
- **Hybrid Messaging**: Seamless communication between traditional Chrome APIs and vision AI

#### LLM Requirements
- **Primary**: Claude Sonnet 4 (recommended by Magnitude)
- **Alternative**: Qwen-2.5VL 72B for vision tasks
- **Local Models**: Support for self-hosted vision models
- **API Integration**: Configurable LLM providers via environment variables

## Technical Foundation

### Chrome Extension + Magnitude Hybrid Architecture (MV3)
```
devex0/
├── manifest.json           # Extension configuration and permissions
├── background/
│   ├── coordinator.js      # Main coordinator agent
│   ├── task-queue.js       # Task scheduling and management
│   ├── agent-registry.js   # Agent discovery and management
│   └── magnitude-bridge.js # Magnitude framework integration
├── content-scripts/
│   ├── site-analyzer.js    # Website structure + vision analysis
│   ├── extractor.js        # Hybrid DOM/vision extraction engine
│   ├── monitor.js          # Real-time monitoring
│   └── vision-coordinator.js # Vision AI coordination
├── agents/
│   ├── processing/         # Data processing with schema validation
│   ├── analysis/           # Site analysis with vision AI
│   ├── export/             # Export format handlers
│   └── vision/             # Vision AI specialized agents
├── schemas/
│   ├── extraction.js       # Zod schemas for data extraction
│   ├── validation.js       # Data validation schemas
│   └── site-patterns.js    # Site-specific extraction patterns
├── popup/
│   ├── popup.html          # Main UI interface
│   ├── popup.js            # UI logic and controls
│   ├── dashboard.js        # Agent status dashboard
│   └── vision-config.js    # Vision AI configuration
└── utils/
    ├── storage.js          # Data persistence utilities
    ├── messaging.js        # Inter-agent communication
    ├── selectors.js        # CSS selector optimization
    ├── vision-utils.js     # Vision AI utility functions
    └── schema-builder.js   # Dynamic schema generation
```

### Key Chrome APIs Utilized
- **chrome.scripting**: Dynamic agent injection and execution
- **chrome.storage**: Persistent data and configuration management
- **chrome.tabs**: Multi-tab coordination and management
- **chrome.webRequest**: Network traffic monitoring and analysis
- **chrome.alarms**: Scheduled and recurring operations
- **chrome.notifications**: User status updates and alerts

### Enhanced Data Flow Architecture
1. **Target Identification**: User specifies websites and data requirements via natural language
2. **Hybrid Site Analysis**: Vision AI + DOM analysis agents examine interface structure
3. **Schema Generation**: Zod schemas generated for structured data extraction
4. **Strategy Generation**: LLM processes visual + structural analysis for optimal strategies
5. **Agent Deployment**: Vision-enhanced extraction agents deployed with pixel-coordinate targeting
6. **Adaptive Extraction**: Real-time visual monitoring with fallback strategies
7. **Processing Pipeline**: Schema-validated processing with type-safe transformations
8. **Export & Delivery**: Multi-format export with visual quality verification

## Development Workflow

### Phase 1: Foundation Enhancement
- Upgrade devex background.js to full coordinator agent
- Implement chrome.storage for persistent data management
- Build basic agent registry and discovery system
- Create task queue engine for operation scheduling

### Phase 2: Agent Specialization
- Develop site-specific analysis agents
- Build extraction agent templates and deployment system
- Implement data processing pipeline
- Create monitoring and control systems

### Phase 3: Advanced Coordination
- Multi-tab coordination and resource sharing
- Network traffic monitoring and optimization
- Scheduled and automated operations
- Advanced export and notification systems

### Phase 4: Vision AI Integration (Magnitude Framework)
- Magnitude framework integration and bridge development
- Vision-based element identification with pixel coordinates
- Natural language extraction rule generation
- Hybrid DOM + Vision extraction strategies
- Visual verification and quality assurance systems

### Phase 5: Advanced AI Capabilities
- Dynamic schema generation from visual content
- Intelligent error handling with visual feedback
- Adaptive strategy optimization based on success rates
- Cross-site pattern recognition and strategy sharing

## Commands and Operations

### Development Setup
```bash
# Load extension in Chrome
1. Open chrome://extensions/
2. Enable Developer mode
3. Click "Load unpacked" and select devex0/

# Install dependencies
npm install              # Install base dependencies
npm install zod          # Schema validation
npm install @types/chrome # TypeScript Chrome API types

# Magnitude Framework Setup
npx create-magnitude-app magnitude-integration
cd magnitude-integration
npm install

# Agent Development
npm run build-agents     # Compile agent modules
npm run build-schemas    # Compile Zod schemas
npm run test-agents      # Run agent test suites
npm run test-schemas     # Validate schema definitions
npm run deploy-agents    # Deploy agents to extension

# Vision AI Setup
export CLAUDE_API_KEY=your_api_key
export MAGNITUDE_MODEL=claude-sonnet-4  # or qwen-2.5vl-72b
npm run setup-vision     # Initialize vision AI components
```

### Runtime Operations
- **Agent Status**: Monitor active agents, their tasks, and schema validation status
- **Data Extraction**: Initiate targeted extraction with schema validation
- **Strategy Generation**: Create and optimize extraction patterns with visual analysis
- **Schema Management**: Generate, validate, and adapt extraction schemas
- **Export Management**: Configure and execute type-safe data exports
- **Performance Monitoring**: Track system health, validation success rates, and metrics
- **Vision AI Monitoring**: Track vision model usage, accuracy, and pixel-coordinate precision

### Configuration Management
- **Site Profiles**: Store site-specific extraction configurations with schemas
- **Agent Policies**: Define agent behavior, interaction rules, and validation requirements
- **Schema Registry**: Manage and version Zod schemas for different site types
- **Export Templates**: Manage output formats with schema validation
- **Rate Limiting**: Configure ethical scraping parameters
- **Vision AI Config**: Configure LLM models, API keys, and vision processing settings
- **Validation Rules**: Define business logic and data quality requirements

## Key Design Principles

### Modularity
- Each agent has a specific, well-defined role
- Agents can be developed, tested, and deployed independently
- Pluggable architecture allows for easy extension and modification

### Intelligence
- LLM-powered analysis for visual and structural understanding
- Adaptive strategies based on site characteristics
- Learning from successful extractions to improve future operations

### Scalability
- Horizontal scaling through agent multiplication
- Efficient resource utilization and task distribution
- Asynchronous operation with progress tracking

### Ethics & Compliance
- Built-in rate limiting and respectful scraping practices
- Robots.txt compliance and site policy adherence
- Data privacy and security best practices

## Integration Points

### Multi-Agent Framework (tokenbender/agent-guides)
- Dynamic specialist assignment based on task complexity
- Progressive knowledge building across multiple analysis rounds
- Anti-repetition mechanisms for efficient collaboration
- Configurable workflow parameters and interaction patterns

### Schema Validation System (Zod Integration)

Devex0 uses [Zod](https://github.com/colinhacks/zod) for type-safe, schema-driven data extraction and validation:

#### Core Schema Patterns
```javascript
// Product extraction schema
const productSchema = z.object({
  title: z.string().min(1, 'Product title required'),
  price: z.string().transform(str => {
    const price = parseFloat(str.replace(/[$,]/g, ''));
    if (isNaN(price)) throw new Error('Invalid price format');
    return price;
  }),
  availability: z.boolean().describe('Is product currently in stock?'),
  rating: z.number().optional().describe('Average customer rating 1-5'),
  reviews: z.array(z.object({
    author: z.string(),
    rating: z.number().min(1).max(5),
    comment: z.string(),
    date: z.string().transform(str => new Date(str))
  })).optional(),
  metadata: z.object({
    sku: z.string().optional(),
    category: z.string(),
    tags: z.array(z.string()).default([])
  })
});

// Article extraction schema
const articleSchema = z.object({
  headline: z.string(),
  author: z.string().optional(),
  publishDate: z.string().datetime(),
  content: z.string(),
  summary: z.string().describe('Auto-generated summary if not present'),
  readTime: z.number().describe('Estimated reading time in minutes'),
  tags: z.array(z.string()).default([]),
  relatedArticles: z.array(z.object({
    title: z.string(),
    url: z.string().url()
  })).optional()
});
```

#### Dynamic Schema Generation
```javascript
class SchemaBuilder {
  async generateFromVisualAnalysis(siteAnalysis) {
    const llmPrompt = `
      Based on the visual analysis of this website, generate a Zod schema for data extraction:
      ${JSON.stringify(siteAnalysis, null, 2)}
      
      Requirements:
      - Include all visible data fields
      - Add appropriate transformations for dates, numbers, URLs
      - Include validation rules based on content patterns
      - Add descriptions for AI inference fields
    `;
    
    const schemaCode = await this.llm.generate(llmPrompt);
    return this.compileSchema(schemaCode);
  }
  
  async adaptSchemaFromErrors(schema, validationErrors) {
    // Automatically adapt schema based on validation failures
    const adaptedSchema = await this.llm.adaptSchema({
      originalSchema: schema,
      errors: validationErrors,
      instruction: 'Modify schema to handle these validation errors'
    });
    
    return this.compileSchema(adaptedSchema);
  }
}
```

#### Validation Pipeline
```javascript
class DataValidator {
  async validateExtraction(data, schema) {
    try {
      // Primary validation with Zod
      const validatedData = schema.parse(data);
      
      // Secondary validation with business rules
      await this.applyBusinessRules(validatedData);
      
      // Tertiary validation with AI consistency check
      await this.aiConsistencyCheck(validatedData);
      
      return { success: true, data: validatedData };
    } catch (error) {
      return await this.handleValidationError(error, data, schema);
    }
  }
  
  async handleValidationError(error, data, schema) {
    // Attempt data cleaning and retry
    const cleanedData = await this.cleanData(data, error);
    
    if (cleanedData) {
      return await this.validateExtraction(cleanedData, schema);
    }
    
    // Suggest schema adaptation if data cleaning fails
    const adaptationSuggestion = await this.suggestSchemaAdaptation(error, schema);
    
    return {
      success: false,
      error: error.message,
      suggestion: adaptationSuggestion,
      rawData: data
    };
  }
}
```

#### Site-Specific Schema Patterns
```javascript
// E-commerce site schemas
const ecommerceSchemas = {
  amazon: z.object({
    asin: z.string(),
    title: z.string(),
    price: z.string().transform(parsePrice),
    prime: z.boolean().default(false),
    rating: z.number().optional(),
    reviewCount: z.number().optional()
  }),
  
  shopify: z.object({
    productId: z.string(),
    title: z.string(),
    variants: z.array(z.object({
      id: z.string(),
      title: z.string(),
      price: z.number(),
      available: z.boolean()
    })),
    images: z.array(z.string().url())
  })
};

// News site schemas
const newsSchemas = {
  generic: articleSchema,
  
  reddit: z.object({
    title: z.string(),
    author: z.string(),
    subreddit: z.string(),
    upvotes: z.number(),
    comments: z.number(),
    url: z.string().url(),
    selfText: z.string().optional()
  })
};
```

### Advanced LLM Integration
- **Vision-Language Models**: Claude Sonnet 4, Qwen-2.5VL, GPT-4V for visual understanding
- **Natural Language Processing**: Extraction rule generation from plain English descriptions
- **Schema-Driven Intelligence**: Automatic Zod schema generation from visual analysis
- **Adaptive Learning**: Strategy optimization based on extraction success patterns
- **Multi-Modal Understanding**: Combined text, visual, and structural analysis
- **Contextual Reasoning**: Complex data relationship inference and validation

### Export Systems
- JSON, CSV, XML, and custom format support
- Database integration capabilities
- API endpoint publishing
- Real-time streaming for large datasets

## Natural Language Automation Examples

### Simple Extraction Commands
```javascript
// Basic product extraction
const products = await devex0.extract(
  'Get all products with their prices and availability',
  {
    url: 'https://example-store.com/products',
    schema: z.array(z.object({
      name: z.string(),
      price: z.number(),
      inStock: z.boolean()
    }))
  }
);

// News article extraction
const articles = await devex0.extract(
  'Extract the main articles from the homepage',
  {
    url: 'https://example-news.com',
    schema: z.array(z.object({
      headline: z.string(),
      summary: z.string(),
      author: z.string().optional(),
      publishDate: z.string().datetime()
    }))
  }
);
```

### Complex Multi-Step Workflows
```javascript
// E-commerce product research workflow
const productResearch = await devex0.workflow([
  {
    action: 'navigate',
    instruction: 'Go to the electronics category',
    url: 'https://example-store.com'
  },
  {
    action: 'interact',
    instruction: 'Apply filter for laptops under $1000'
  },
  {
    action: 'extract',
    instruction: 'Get all laptop products with specifications',
    schema: z.array(z.object({
      model: z.string(),
      price: z.number(),
      specs: z.object({
        processor: z.string(),
        ram: z.string(),
        storage: z.string(),
        display: z.string()
      }),
      rating: z.number().optional(),
      reviewCount: z.number().optional()
    }))
  },
  {
    action: 'interact',
    instruction: 'Click on each product to get detailed specs',
    forEach: 'products'
  },
  {
    action: 'extract',
    instruction: 'Get detailed specifications and reviews',
    schema: detailedProductSchema
  }
]);
```

### Social Media Content Extraction
```javascript
// Twitter thread extraction
const threadData = await devex0.extract(
  'Extract this entire Twitter thread with all replies',
  {
    url: 'https://twitter.com/user/status/123456789',
    schema: z.object({
      mainTweet: z.object({
        text: z.string(),
        author: z.string(),
        timestamp: z.string(),
        likes: z.number(),
        retweets: z.number()
      }),
      replies: z.array(z.object({
        text: z.string(),
        author: z.string(),
        timestamp: z.string(),
        isThreadContinuation: z.boolean()
      }))
    })
  }
);

// LinkedIn job postings
const jobListings = await devex0.extract(
  'Find all software engineering jobs posted this week',
  {
    url: 'https://linkedin.com/jobs/search',
    schema: z.array(z.object({
      title: z.string(),
      company: z.string(),
      location: z.string(),
      salary: z.string().optional(),
      requirements: z.array(z.string()),
      postedDate: z.string(),
      applicationUrl: z.string().url()
    }))
  }
);
```

### Dynamic Content Interaction
```javascript
// Form submission and data extraction
const searchResults = await devex0.workflow([
  {
    action: 'navigate',
    instruction: 'Go to the property search page',
    url: 'https://example-realestate.com'
  },
  {
    action: 'interact',
    instruction: 'Fill out search form for 2-bedroom apartments in downtown area under $2000/month',
    form: {
      bedrooms: '2',
      location: 'downtown',
      maxPrice: '2000',
      propertyType: 'apartment'
    }
  },
  {
    action: 'interact',
    instruction: 'Submit search and wait for results to load'
  },
  {
    action: 'extract',
    instruction: 'Get all property listings with details',
    schema: z.array(z.object({
      address: z.string(),
      price: z.number(),
      bedrooms: z.number(),
      bathrooms: z.number(),
      squareFootage: z.number().optional(),
      amenities: z.array(z.string()),
      contactInfo: z.object({
        agent: z.string(),
        phone: z.string(),
        email: z.string().email()
      })
    }))
  }
]);
```

### Monitoring and Alerts
```javascript
// Price monitoring setup
const priceMonitor = await devex0.monitor({
  name: 'laptop-price-tracker',
  schedule: 'daily',
  instruction: 'Monitor laptop prices and alert when any drop below $800',
  targets: [
    'https://example-store.com/laptops',
    'https://another-store.com/computers'
  ],
  schema: z.object({
    products: z.array(z.object({
      name: z.string(),
      currentPrice: z.number(),
      previousPrice: z.number().optional(),
      priceChange: z.number().optional(),
      url: z.string().url()
    }))
  }),
  alertCondition: 'currentPrice < 800',
  notification: {
    email: 'user@example.com',
    webhook: 'https://your-webhook.com/price-alert'
  }
});
```

## LLM Integration Requirements

### Primary LLM Configuration
```javascript
// Environment configuration
const llmConfig = {
  // Primary vision model (recommended)
  primary: {
    model: 'claude-sonnet-4',
    apiKey: process.env.CLAUDE_API_KEY,
    capabilities: ['vision', 'reasoning', 'code-generation'],
    maxTokens: 4096,
    temperature: 0.1 // Low temperature for consistent extraction
  },
  
  // Alternative vision models
  alternatives: [
    {
      model: 'qwen-2.5vl-72b',
      apiKey: process.env.QWEN_API_KEY,
      capabilities: ['vision', 'reasoning'],
      fallbackFor: ['claude-sonnet-4']
    },
    {
      model: 'gpt-4-vision-preview',
      apiKey: process.env.OPENAI_API_KEY,
      capabilities: ['vision', 'reasoning'],
      fallbackFor: ['claude-sonnet-4', 'qwen-2.5vl-72b']
    }
  ],
  
  // Local model support
  local: {
    enabled: true,
    model: 'llava-v1.6-34b',
    endpoint: 'http://localhost:8000/v1/chat/completions',
    capabilities: ['vision']
  }
};
```

### Vision AI Setup Requirements
```bash
# Required environment variables
export CLAUDE_API_KEY="your_claude_api_key"
export QWEN_API_KEY="your_qwen_api_key"  # Optional
export OPENAI_API_KEY="your_openai_key"  # Optional fallback

# Optional: Local model setup
export LOCAL_LLM_ENDPOINT="http://localhost:8000"
export LOCAL_LLM_MODEL="llava-v1.6-34b"

# Vision processing configuration
export VISION_PROCESSING_TIMEOUT=30000
export VISION_RETRY_ATTEMPTS=3
export VISION_QUALITY="high"  # high, medium, low
```

### Model Integration Patterns
```javascript
class LLMIntegration {
  constructor(config) {
    this.config = config;
    this.primaryModel = this.initializeModel(config.primary);
    this.fallbackModels = config.alternatives.map(alt => this.initializeModel(alt));
  }
  
  async processVisionTask(task) {
    for (const model of [this.primaryModel, ...this.fallbackModels]) {
      try {
        const result = await model.processVision(task);
        return this.validateResult(result, task.expectedSchema);
      } catch (error) {
        console.warn(`Model ${model.name} failed:`, error);
        continue;
      }
    }
    throw new Error('All vision models failed');
  }
  
  async generateSchema(visualAnalysis) {
    const prompt = this.buildSchemaPrompt(visualAnalysis);
    const schemaCode = await this.primaryModel.generate(prompt);
    return this.compileAndValidateSchema(schemaCode);
  }
  
  async adaptExtractionStrategy(currentStrategy, errorContext) {
    const adaptationPrompt = this.buildAdaptationPrompt(currentStrategy, errorContext);
    const newStrategy = await this.primaryModel.generate(adaptationPrompt);
    return this.validateStrategy(newStrategy);
  }
}
```

### Performance Optimization
```javascript
// Caching and optimization
const optimizationConfig = {
  // Cache vision analysis results
  visionCache: {
    enabled: true,
    ttl: 3600000, // 1 hour
    maxSize: 1000
  },
  
  // Batch processing for efficiency
  batchProcessing: {
    enabled: true,
    maxBatchSize: 10,
    batchTimeout: 5000
  },
  
  // Progressive quality reduction
  qualityFallback: {
    enabled: true,
    levels: ['high', 'medium', 'low'],
    fallbackOnTimeout: true
  }
};
```

This comprehensive multi-agent architecture transforms web scraping from a manual, brittle process into an intelligent, adaptive, and scalable operation that can handle complex extraction scenarios with minimal human intervention.