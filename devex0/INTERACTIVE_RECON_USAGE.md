# Interactive Reconnaissance Usage Guide

## Overview

The devex0 Interactive Reconnaissance System transforms web scraping from manual processes into intelligent, collaborative extraction workflows. The system now features a comprehensive reconnaissance agent that asks for URLs, analyzes sites, proposes valuable extraction targets, and executes optimized multi-agent extraction.

## Quick Start

### 1. Load the Extension
1. Open `chrome://extensions/`
2. Enable Developer mode
3. Click "Load unpacked" and select the `devex0/` directory

### 2. Start Reconnaissance Mode
1. Click the devex0 extension icon
2. Change mode to "reconnaissance" in the dropdown
3. The interface will switch to reconnaissance mode

### 3. Provide Target URL
- Enter the URL you want to analyze in the "target url" field
- The system supports maritime, luxury, real estate, and generic domains
- Examples:
  - Maritime: `https://marinetraffic.com`
  - Luxury: `https://farfetch.com`
  - Generic: Any website with structured data

### 4. Run Reconnaissance
1. Click the "reconnaissance" button
2. The system will:
   - Analyze the site structure
   - Detect domain context
   - Identify valuable extraction targets
   - Score targets by value and confidence
   - Present findings with recommendations

### 5. Review and Select Targets
- Review the discovered extraction targets
- High-value targets (score 8+) are pre-selected
- Each target shows:
  - Estimated item count
  - Confidence level
  - Extraction difficulty
  - Value score (1-10)

### 6. Refine Extraction Scope (Optional)
- Add custom CSS selectors in the "custom selectors" field
- Use comma-separated selectors: `.my-selector, .another-selector`
- The system will validate and optimize your selectors

### 7. Execute Extraction
1. Click "extract selected" to run the optimized extraction
2. The system will:
   - Deploy agents based on selected targets
   - Execute focused extraction
   - Validate extracted data
   - Generate comprehensive results

### 8. View Results
- Extraction results are automatically copied to clipboard
- Results include:
  - Summary statistics
  - Per-target extraction details
  - Sample data
  - Complete extracted dataset in JSON format

## Workflow Examples

### Maritime Vessel Tracking
```
URL: https://marinetraffic.com
Expected Targets:
- Vessel Data Tables (score: 9/10)
- Ship Information Cards (score: 8/10)
- Position Tracking Data (score: 7/10)

Result: Structured vessel data with IMO numbers, positions, types
```

### Luxury Product Discovery
```
URL: https://farfetch.com
Expected Targets:
- Product Grid (score: 9/10)
- Price Information (score: 8/10)
- Brand Details (score: 7/10)

Result: Product catalog with prices, brands, availability
```

### Generic Site Analysis
```
URL: Any structured website
Process:
1. Generic pattern detection
2. Table/list/card identification
3. Content structure analysis
4. Value assessment

Result: Optimized extraction of discovered patterns
```

## Advanced Features

### Custom Selector Validation
- Real-time validation of user selectors
- Performance optimization suggestions
- Reliability scoring
- Alternative selector recommendations

### Domain-Specific Intelligence
- Maritime: Vessel data, tracking information, shipping details
- Luxury: Product authenticity, pricing, brand information
- Real Estate: Property listings, market data, agent information
- Generic: Tables, lists, cards, articles, forms

### Multi-Agent Coordination
- Structure Agent: Site analysis and pattern recognition
- Target Discovery Engine: Value target identification
- Reconnaissance Agent: Workflow coordination
- Selector Refinement: User input optimization
- Extraction Agents: Focused data harvesting

### Error Recovery
- Automatic fallback strategies
- Alternative selector testing
- Partial extraction handling
- Quality validation

## Troubleshooting

### No Targets Found
- Verify the URL is accessible
- Check if the site has JavaScript-generated content
- Try providing custom selectors for specific elements

### Low Confidence Scores
- Review target recommendations
- Consider domain-specific selector patterns
- Use the "view html" option to inspect page structure

### Extraction Failures
- Check network connectivity
- Verify selectors are still valid
- Review custom selector syntax

### Performance Issues
- Reduce number of selected targets
- Use more specific selectors
- Avoid overly broad extraction scopes

## API Integration

### Background Script Integration
```javascript
// Start reconnaissance
chrome.runtime.sendMessage({
  action: 'START_RECONNAISSANCE',
  data: {
    url: 'https://example.com',
    options: { includeMetadata: true }
  }
});

// Process user feedback
chrome.runtime.sendMessage({
  action: 'PROCESS_RECON_FEEDBACK',
  data: {
    reconId: 'recon_123',
    userFeedback: {
      selectedTargets: ['target_1', 'target_2'],
      customSelectors: ['.custom-selector']
    }
  }
});

// Execute optimized extraction
chrome.runtime.sendMessage({
  action: 'EXECUTE_OPTIMIZED_EXTRACTION',
  data: { reconId: 'recon_123' }
});
```

### Content Script Integration
```javascript
// Enhanced DOM analysis
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'ENHANCED_DOM_ANALYSIS') {
    const domData = analyzePageStructure();
    sendResponse({ success: true, domData });
  }
});
```

## Future Enhancements

### Planned Features
- Vision AI integration for pixel-precise targeting
- Machine learning-based pattern recognition
- Cross-site extraction strategy sharing
- Real-time monitoring and alerts
- Advanced export formats and integrations

### Extension Points
- Custom domain pattern definitions
- Plugin architecture for specialized extractors
- API integrations for data enrichment
- Webhook support for real-time notifications

## Best Practices

### Effective Reconnaissance
1. Start with high-confidence, high-value targets
2. Use domain context when available
3. Validate custom selectors before extraction
4. Review extraction scope to prevent overreach

### Ethical Scraping
1. Respect robots.txt files
2. Implement reasonable rate limiting
3. Avoid excessive server load
4. Comply with website terms of service

### Data Quality
1. Validate extracted data against expectations
2. Use schema validation for structured data
3. Implement duplicate detection
4. Monitor extraction success rates

The Interactive Reconnaissance System represents a significant advancement in web scraping intelligence, providing users with powerful tools for discovering, analyzing, and extracting valuable data while maintaining ethical practices and optimal performance.