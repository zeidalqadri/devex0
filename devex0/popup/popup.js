/**
 * Devex0 Minimalist Popup Interface
 * Maintains original devex simplicity with multi-agent intelligence
 */

class Devex0Interface {
  constructor() {
    this.currentTab = null;
    this.domain = 'unknown';
    this.isMonitoring = false;
    this.lastSmartOutput = null; // Store last smart extract output for export
    this.currentRecon = null; // Store current reconnaissance session
    this.selectedTargets = new Set(); // Store selected extraction targets
    this.isReconMode = false; // Track current interface mode
  }

  async init() {
    try {
      // Get current tab
      this.currentTab = await this.getCurrentTab();
      
      // Detect domain
      this.domain = this.detectDomain();
      this.updateDomainIndicator();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update status
      this.setStatus('ready');
      
    } catch (error) {
      console.error('[Devex0] Init failed:', error);
      this.setStatus('initialization failed', 'error');
    }
  }

  async getCurrentTab() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0] || null);
      });
    });
  }

  detectDomain() {
    if (!this.currentTab?.url) return 'unknown';
    
    // Return generic domain type - let content analysis determine the actual domain context
    // This removes hardcoded domain assumptions and allows the system to be versatile
    return 'generic';
  }

  updateDomainIndicator() {
    const indicator = document.getElementById('domainIndicator');
    indicator.textContent = this.domain === 'unknown' ? 'ready' : this.domain;
  }

  setupEventListeners() {
    // Extract button
    document.getElementById('extract').addEventListener('click', () => {
      this.handleExtract();
    });

    // Monitor button
    document.getElementById('monitor').addEventListener('click', () => {
      this.handleMonitor();
    });

    // Export to markdown button
    document.getElementById('exportMd').addEventListener('click', () => {
      this.handleExportMarkdown();
    });

    // Mode change handler
    document.getElementById('mode').addEventListener('change', (e) => {
      if (e.target.value === 'smart') {
        this.suggestSelector();
      }
      this.updateExportButtonVisibility();
    });

    // Selector input - auto-complete on focus
    document.getElementById('selector').addEventListener('focus', () => {
      if (document.getElementById('mode').value === 'smart') {
        this.suggestSelector();
      }
    });

    // Google Docs integration buttons
    document.getElementById('sendToDocs').addEventListener('click', () => {
      this.handleSendToDocs();
    });

    document.getElementById('assessDocs').addEventListener('click', () => {
      this.handleAssessDocs();
    });
  }

  async handleExtract() {
    const extractBtn = document.getElementById('extract');
    const mode = document.getElementById('mode').value;
    const selector = document.getElementById('selector').value.trim();

    try {
      extractBtn.disabled = true;
      extractBtn.classList.add('loading');

      switch (mode) {
        case 'smart':
          await this.smartExtract(selector);
          break;
        case 'html':
          await this.extractHTML(selector);
          break;
        case 'text':
          await this.extractText(selector);
          break;
        case 'console':
          await this.extractConsole();
          break;
        default:
          await this.smartExtract(selector);
      }

    } catch (error) {
      console.error('[Devex0] Extract failed:', error);
      this.setStatus('extraction failed', 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.classList.remove('loading');
    }
  }

  async handleMonitor() {
    const monitorBtn = document.getElementById('monitor');
    
    if (this.isMonitoring) {
      // Stop monitoring
      try {
        monitorBtn.disabled = true;
        await this.sendToTab('STOP_MONITORING');
        this.isMonitoring = false;
        monitorBtn.textContent = 'monitor';
        this.setStatus('monitoring stopped');
      } catch (error) {
        this.setStatus('failed to stop monitoring', 'error');
      } finally {
        monitorBtn.disabled = false;
      }
    } else {
      // Start monitoring
      try {
        monitorBtn.disabled = true;
        monitorBtn.classList.add('loading');
        
        const response = await this.sendToTab('START_MONITORING', {
          type: 'dom',
          interval: 3000
        });
        
        if (response.success) {
          this.isMonitoring = true;
          monitorBtn.textContent = 'stop';
          this.setStatus('monitoring page changes...');
        } else {
          this.setStatus('monitoring failed', 'error');
        }
      } catch (error) {
        this.setStatus('monitoring failed', 'error');
      } finally {
        monitorBtn.disabled = false;
        monitorBtn.classList.remove('loading');
      }
    }
  }

  async smartExtract(selector) {
    console.log('[Devex0] Starting smart extract with selector:', selector);
    
    // Validate current tab URL for smart extraction
    if (!this.currentTab || !this.currentTab.url || !this.isValidExtractionURL(this.currentTab.url)) {
      this.setStatus('current page not suitable for smart extraction', 'error');
      return;
    }
    
    this.setStatus(`analyzing ${new URL(this.currentTab.url).hostname}...`);

    try {
      // Step 1: Capture raw HTML for baseline
      console.log('[Devex0] Step 1: Capturing raw HTML...');
      const htmlResponse = await this.sendToTab('EXTRACT_HTML', {
        selector: 'html',
        contentType: 'outerHTML'
      });

      console.log('[Devex0] HTML response:', htmlResponse.success ? 'SUCCESS' : 'FAILED', htmlResponse.error || '');

      if (!htmlResponse.success) {
        throw new Error('Failed to capture page HTML: ' + (htmlResponse.error || 'Unknown error'));
      }

      this.setStatus('running intelligent analysis...');

      // Step 2: Run enhanced smart analysis with DOM access
      console.log('[Devex0] Step 2: Running smart analysis...');
      const smartResponse = await this.sendToBackground('SMART_EXTRACT', {
        url: this.currentTab.url,
        domain: this.domain,
        selector: selector || null,
        tabId: this.currentTab.id,
        rawHTML: htmlResponse.content,
        options: { 
          useVision: !selector,
          includePatternAnalysis: true,
          generateSummary: true,
          autoDetected: true // Flag for auto-detected URL
        }
      });

      console.log('[Devex0] Smart response:', smartResponse.success ? 'SUCCESS' : 'FAILED', smartResponse.error || '');

      if (smartResponse.success) {
        const { analysis, summary, patterns } = smartResponse;
        console.log('[Devex0] Analysis data:', {
          hasAnalysis: !!analysis,
          hasSummary: !!summary,
          hasPatterns: !!patterns,
          itemCount: analysis?.itemCount
        });
        
        // Create intelligent summary instead of raw data
        const intelligentOutput = this.formatSmartOutput(analysis, summary, patterns);
        console.log('[Devex0] Generated intelligent output length:', intelligentOutput.length);
        
        await navigator.clipboard.writeText(intelligentOutput);
        
        // Store for export
        this.lastSmartOutput = intelligentOutput;
        this.updateExportButtonVisibility();
        
        this.setStatus(`smart analysis complete - ${analysis.itemCount || 0} items found`);
      } else {
        // Enhanced fallback with pattern analysis
        console.log('[Devex0] Smart analysis failed, trying enhanced fallback...');
        this.setStatus('smart analysis failed, using enhanced fallback...');
        await this.enhancedFallback(selector, htmlResponse.content);
      }

    } catch (error) {
      console.error('[Devex0] Smart extract failed:', error);
      this.setStatus(`analysis failed: ${error.message}`);
      
      // Try basic HTML extraction as final fallback
      console.log('[Devex0] Falling back to basic HTML extraction...');
      await this.extractHTML(selector);
    }
  }

  formatSmartOutput(analysis, summary, patterns) {
    const output = [];
    
    output.push('# Smart Extract Analysis');
    output.push(`**URL:** ${this.currentTab.url}`);
    output.push(`**Domain:** ${this.domain}`);
    output.push(`**Analyzed:** ${new Date().toLocaleString()}`);
    output.push('');
    
    // Page Structure Summary
    output.push('## Page Structure');
    if (summary.pageInfo) {
      output.push(`- **Framework:** ${summary.pageInfo.framework || 'Unknown'}`);
      output.push(`- **Complexity:** ${summary.pageInfo.complexity || 'Unknown'}`);
      output.push(`- **Total Elements:** ${summary.pageInfo.totalElements || 'Unknown'}`);
      output.push(`- **Content Types:** ${(summary.pageInfo.contentTypes || []).join(', ') || 'None detected'}`);
    }
    output.push('');
    
    // Pattern Analysis
    if (patterns) {
      output.push('## CSS & Naming Patterns');
      output.push(`- **Class Naming Style:** ${patterns.namingConvention || 'Mixed'}`);
      output.push(`- **Common Prefixes:** ${(patterns.commonPrefixes || []).join(', ') || 'None'}`);
      output.push(`- **Selector Reliability:** ${patterns.selectorReliability || 'Unknown'}`);
      output.push('');
    }
    
    // Data Extraction Results
    output.push('## Extraction Results');
    if (analysis.extractionTargets && analysis.extractionTargets.length > 0) {
      analysis.extractionTargets.forEach(target => {
        output.push(`### ${target.type || 'Data'} (${target.totalCount || 0} items)`);
        if (target.selectors) {
          target.selectors.forEach(sel => {
            output.push(`- \`${sel.selector}\` → ${sel.count} matches`);
          });
        }
        output.push('');
      });
    } else {
      output.push('No structured data patterns detected.');
      output.push('');
    }
    
    // Recommendations
    if (summary.recommendations) {
      output.push('## Recommendations');
      summary.recommendations.forEach(rec => {
        output.push(`- **${rec.type}:** ${rec.message}`);
      });
      output.push('');
    }
    
    // Raw data sample (if available)
    if (analysis.data && analysis.data.length > 0) {
      output.push('## Sample Data');
      output.push('```json');
      const sample = analysis.data.slice(0, 3); // First 3 items
      output.push(JSON.stringify(sample, null, 2));
      output.push('```');
    }
    
    return output.join('\n');
  }

  async enhancedFallback(selector, rawHTML) {
    // Enhanced fallback that still provides pattern analysis
    this.setStatus('generating pattern analysis...');
    
    try {
      const analysisResponse = await this.sendToTab('ANALYZE_PATTERNS', {
        selector: selector || 'body',
        includeHTML: true
      });
      
      if (analysisResponse.success) {
        const fallbackOutput = this.formatFallbackOutput(analysisResponse.patterns, rawHTML);
        await navigator.clipboard.writeText(fallbackOutput);
        this.setStatus('pattern analysis complete');
      } else {
        await this.extractHTML(selector);
      }
    } catch (error) {
      await this.extractHTML(selector);
    }
  }

  formatFallbackOutput(patterns, rawHTML) {
    const output = [];
    
    output.push('# Smart Extract - Pattern Analysis');
    output.push(`**URL:** ${this.currentTab.url}`);
    output.push(`**Analyzed:** ${new Date().toLocaleString()}`);
    output.push('');
    
    if (patterns) {
      output.push('## Detected Patterns');
      Object.entries(patterns).forEach(([key, value]) => {
        output.push(`- **${key}:** ${JSON.stringify(value)}`);
      });
      output.push('');
    }
    
    output.push('## Raw HTML');
    output.push('```html');
    output.push(rawHTML.substring(0, 2000) + (rawHTML.length > 2000 ? '...' : ''));
    output.push('```');
    
    return output.join('\n');
  }

  async extractHTML(selector) {
    this.setStatus('extracting html...');

    try {
      const response = await this.sendToTab('EXTRACT_HTML', {
        selector: selector || 'html',
        contentType: 'outerHTML'
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.content);
        this.setStatus('html copied');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      // Direct DOM access fallback (original devex behavior)
      await this.directDOMExtract(selector, 'outerHTML');
    }
  }

  async extractText(selector) {
    this.setStatus('extracting text...');

    try {
      const response = await this.sendToTab('EXTRACT_HTML', {
        selector: selector || 'body',
        contentType: 'textContent'
      });

      if (response.success) {
        await navigator.clipboard.writeText(response.content);
        this.setStatus('text copied');
      } else {
        throw new Error(response.error);
      }
    } catch (error) {
      // Direct DOM access fallback
      await this.directDOMExtract(selector, 'textContent');
    }
  }

  async extractConsole() {
    this.setStatus('extracting console logs...');

    try {
      // Try new monitor system first
      const response = await this.sendToTab('GET_CONSOLE_LOGS');
      
      if (response.success) {
        await navigator.clipboard.writeText(response.logs);
        this.setStatus('console logs copied');
        return;
      }
    } catch (error) {
      console.warn('[Devex0] New console system failed, using original');
    }

    // Fallback to original devex console method
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        files: ['devex/content_script.js'] // Original devex console hooking
      });

      chrome.tabs.sendMessage(this.currentTab.id, { action: "getConsoleLogs" }, async (response) => {
        if (response && response.logs) {
          await navigator.clipboard.writeText(response.logs);
          this.setStatus('console logs copied');
        } else {
          this.setStatus('no console logs found', 'error');
        }
      });
    } catch (error) {
      this.setStatus('console extraction failed', 'error');
    }
  }

  async directDOMExtract(selector, contentType) {
    // Original devex behavior - direct DOM manipulation
    try {
      await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        func: (sel, type) => {
          let el;
          if (sel) {
            el = document.querySelector(sel);
            if (!el) return { error: `No element matches: ${sel}` };
          } else {
            el = document.documentElement;
          }
          
          let content;
          if (type === 'outerHTML') content = el.outerHTML;
          else if (type === 'innerHTML') content = el.innerHTML;
          else if (type === 'textContent') content = el.textContent;
          else content = '';
          
          return { content };
        },
        args: [selector, contentType]
      }, async (results) => {
        if (chrome.runtime.lastError || !results || !results[0]) {
          this.setStatus('dom extraction failed', 'error');
          return;
        }
        
        const { content, error } = results[0].result;
        if (error) {
          this.setStatus(error, 'error');
          return;
        }
        
        await navigator.clipboard.writeText(content);
        this.setStatus('copied');
      });
    } catch (error) {
      this.setStatus('extraction failed', 'error');
    }
  }

  async suggestSelector() {
    // Generic selector suggestions for any website type
    const genericSuggestions = [
      '.item, .product, .listing',
      'table tr, .row, .entry',
      '.card, .tile, .box',
      'article, .article, .post'
    ];

    const selectorInput = document.getElementById('selector');
    if (!selectorInput.value) {
      // Use a random generic suggestion as placeholder
      const suggestion = genericSuggestions[Math.floor(Math.random() * genericSuggestions.length)];
      selectorInput.placeholder = suggestion;
    }
  }

  async sendToBackground(action, data = {}) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        }
      );
    });
  }

  async sendToTab(action, data = {}) {
    if (!this.currentTab) {
      throw new Error('no active tab');
    }

    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        this.currentTab.id,
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        }
      );
    });
  }

  setStatus(message, type = '') {
    const statusEl = document.getElementById('status');
    statusEl.textContent = message;
    statusEl.className = `status ${type}`;
  }

  updateExportButtonVisibility() {
    const exportBtn = document.getElementById('exportMd');
    const docsIntegration = document.getElementById('docsIntegration');
    const mode = document.getElementById('mode').value;
    
    // Show export and docs integration buttons for smart mode when we have output
    if (mode === 'smart' && this.lastSmartOutput) {
      exportBtn.style.display = 'block';
      docsIntegration.style.display = 'flex';
    } else {
      exportBtn.style.display = 'none';
      docsIntegration.style.display = 'none';
    }
  }

  async handleExportMarkdown() {
    if (!this.lastSmartOutput) {
      this.setStatus('no smart extract output to export', 'error');
      return;
    }

    try {
      const exportBtn = document.getElementById('exportMd');
      exportBtn.disabled = true;
      exportBtn.classList.add('loading');
      
      this.setStatus('generating markdown file...');

      // Create enhanced markdown with metadata
      const enhancedMarkdown = this.createEnhancedMarkdown(this.lastSmartOutput);
      
      // Create and download file
      const filename = `devex0-analysis-${new Date().toISOString().slice(0, 10)}.md`;
      await this.downloadAsFile(enhancedMarkdown, filename, 'text/markdown');
      
      this.setStatus(`exported to ${filename}`);

    } catch (error) {
      console.error('[Devex0] Export failed:', error);
      this.setStatus('export failed', 'error');
    } finally {
      const exportBtn = document.getElementById('exportMd');
      exportBtn.disabled = false;
      exportBtn.classList.remove('loading');
    }
  }

  createEnhancedMarkdown(smartOutput) {
    const lines = [];
    
    // Add front matter for better markdown
    lines.push('---');
    lines.push(`title: "Smart Extract Analysis"`);
    lines.push(`url: "${this.currentTab.url}"`);
    lines.push(`domain: "${this.domain}"`);
    lines.push(`generated: "${new Date().toISOString()}"`);
    lines.push(`tool: "devex0"`);
    lines.push('---');
    lines.push('');
    
    // Add the smart output
    lines.push(smartOutput);
    
    // Add footer with metadata
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Export Details');
    lines.push(`- **Generated by:** devex0 Smart Extract`);
    lines.push(`- **Export time:** ${new Date().toLocaleString()}`);
    lines.push(`- **Browser tab:** ${this.currentTab.title}`);
    lines.push(`- **User agent:** ${navigator.userAgent.split(' ')[0]}`);
    
    return lines.join('\n');
  }

  async downloadAsFile(content, filename, contentType = 'text/plain') {
    // Create blob and download link
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    // Use Chrome downloads API if available
    if (chrome.downloads) {
      try {
        await chrome.downloads.download({
          url: url,
          filename: filename,
          saveAs: true
        });
        URL.revokeObjectURL(url);
        return;
      } catch (error) {
        console.warn('[Devex0] Chrome downloads API failed:', error);
      }
    }
    
    // Fallback to creating download link
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up URL
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // Google Docs Integration Methods

  async handleSendToDocs() {
    if (!this.lastSmartOutput) {
      this.setStatus('no extraction data to send', 'error');
      return;
    }

    try {
      const sendBtn = document.getElementById('sendToDocs');
      sendBtn.disabled = true;
      sendBtn.classList.add('loading');
      
      this.setStatus('sending to google docs...');

      // Create formatted content for Google Docs
      const docsContent = this.formatForGoogleDocs(this.lastSmartOutput);
      
      // Send to background script for Google Docs API integration
      const response = await this.sendToBackground('SEND_TO_GOOGLE_DOCS', {
        content: docsContent,
        metadata: {
          url: this.currentTab?.url,
          timestamp: Date.now(),
          extractionMode: 'smart'
        }
      });

      if (response.success) {
        this.setStatus(`sent to docs: ${response.documentTitle || 'unnamed document'}`);
        // Store document ID for assessment
        this.lastDocsId = response.documentId;
      } else {
        throw new Error(response.error || 'Failed to send to Google Docs');
      }

    } catch (error) {
      console.error('[Devex0] Send to docs failed:', error);
      this.setStatus('failed to send to docs', 'error');
    } finally {
      const sendBtn = document.getElementById('sendToDocs');
      sendBtn.disabled = false;
      sendBtn.classList.remove('loading');
    }
  }

  async handleAssessDocs() {
    try {
      const assessBtn = document.getElementById('assessDocs');
      assessBtn.disabled = true;
      assessBtn.classList.add('loading');
      
      this.setStatus('assessing google docs content...');

      // Request LLM assessment of the Google Docs content
      const response = await this.sendToBackground('ASSESS_GOOGLE_DOCS', {
        documentId: this.lastDocsId,
        assessmentType: 'value-extraction',
        criteria: {
          dataQuality: true,
          extractionOpportunities: true,
          automationPotential: true,
          nextSteps: true
        }
      });

      if (response.success) {
        this.displayAssessmentResults(response.assessment);
        this.setStatus('assessment complete');
      } else {
        throw new Error(response.error || 'Assessment failed');
      }

    } catch (error) {
      console.error('[Devex0] Assessment failed:', error);
      this.setStatus('assessment failed', 'error');
    } finally {
      const assessBtn = document.getElementById('assessDocs');
      assessBtn.disabled = false;
      assessBtn.classList.remove('loading');
    }
  }

  // Google Docs Helper Methods

  formatForGoogleDocs(smartOutput) {
    const { analysis, summary } = smartOutput;
    
    const content = {
      title: `Devex0 Extraction - ${new URL(this.currentTab?.url || '').hostname}`,
      sections: [
        {
          heading: 'Extraction Summary',
          content: [
            `URL: ${this.currentTab?.url}`,
            `Items extracted: ${analysis.itemCount || 0}`,
            `Extraction mode: Smart Extract`,
            `Timestamp: ${new Date().toISOString()}`,
            '',
            summary || 'No summary available'
          ]
        },
        {
          heading: 'Extracted Data',
          content: this.formatExtractedData(analysis.data)
        },
        {
          heading: 'Technical Details',
          content: [
            `Framework: ${analysis.summary?.pageInfo?.framework || 'Unknown'}`,
            `Complexity: ${analysis.summary?.extractionStrategy?.complexity || 'Unknown'}`,
            `Confidence: ${analysis.summary?.extractionStrategy?.confidence || 0}%`,
            `Processing time: ${analysis.processingTime || 0}ms`
          ]
        }
      ]
    };
    
    return content;
  }

  formatExtractedData(data) {
    if (!data || !Array.isArray(data)) {
      return ['No data extracted'];
    }
    
    const formatted = [];
    data.slice(0, 50).forEach((item, index) => {
      formatted.push(`${index + 1}. ${typeof item === 'string' ? item : JSON.stringify(item)}`);
    });
    
    if (data.length > 50) {
      formatted.push(`... and ${data.length - 50} more items`);
    }
    
    return formatted;
  }

  displayAssessmentResults(assessment) {
    const { dataQuality, extractionOpportunities, automationPotential, nextSteps } = assessment;
    
    // Create a simple status message with key insights
    let statusMessage = 'Assessment: ';
    
    if (dataQuality?.score) {
      statusMessage += `Quality ${dataQuality.score}/10, `;
    }
    
    if (automationPotential?.score) {
      statusMessage += `Automation ${automationPotential.score}/10`;
    }
    
    this.setStatus(statusMessage);
    
    // Store assessment for potential next steps
    this.lastAssessment = assessment;
    
    console.log('[Devex0] Full assessment:', assessment);
  }

  // Utility Methods

  isValidExtractionURL(url) {
    try {
      const urlObj = new URL(url);
      
      // Exclude chrome:// and other internal URLs
      if (urlObj.protocol === 'chrome:' || 
          urlObj.protocol === 'chrome-extension:' ||
          urlObj.protocol === 'moz-extension:' ||
          urlObj.protocol === 'file:') {
        return false;
      }
      
      // Only allow HTTP and HTTPS
      if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
        return false;
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  async sendToTabById(action, data = {}, tabId) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(
        tabId,
        { action, data, timestamp: Date.now() },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ success: false, error: chrome.runtime.lastError.message });
          } else {
            resolve(response || { success: false, error: 'no response' });
          }
        }
      );
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
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const devex0 = new Devex0Interface();
  devex0.init();
});
