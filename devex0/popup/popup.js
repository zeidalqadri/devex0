/**
 * Devex0 Simplified Interface
 * Implements the streamlined workflow: Extract → Copy HTML → Ask for Insights → Asset Analysis → Exass
 */

class Devex0Interface {
  constructor() {
    this.currentTab = null;
    this.extractedHTML = null;
    this.assetAnalysis = null;
    this.selectedSelectors = new Set();
    this.workflowState = 'ready'; // ready, extracted, analyzed, done
  }

  async init() {
    try {
      // Get current tab
      this.currentTab = await this.getCurrentTab();
      
      // Show current URL
      this.displayCurrentURL();
      
      // Setup event listeners
      this.setupEventListeners();
      
      // Update status
      this.setStatus('ready - click extract to begin');
      
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

  displayCurrentURL() {
    if (this.currentTab && this.currentTab.url) {
      const urlDisplay = document.getElementById('urlDisplay');
      const currentUrlElement = document.getElementById('currentUrl');
      
      // Show URL (truncated for display)
      const url = this.currentTab.url;
      const displayUrl = url.length > 50 ? url.substring(0, 47) + '...' : url;
      currentUrlElement.textContent = displayUrl;
      urlDisplay.style.display = 'block';
    }
  }

  setupEventListeners() {
    // Main extract button
    document.getElementById('extract').addEventListener('click', () => {
      this.handleExtract();
    });

    // Insight option buttons
    document.getElementById('showInsights').addEventListener('click', () => {
      this.handleShowInsights();
    });

    document.getElementById('skipInsights').addEventListener('click', () => {
      this.handleSkipInsights();
    });

    // Analysis action buttons
    document.getElementById('exass').addEventListener('click', () => {
      this.handleExass();
    });

    document.getElementById('copyAnalysis').addEventListener('click', () => {
      this.handleCopyAnalysis();
    });

    document.getElementById('resetWorkflow').addEventListener('click', () => {
      this.handleReset();
    });
  }

  async handleExtract() {
    const extractBtn = document.getElementById('extract');
    
    try {
      extractBtn.disabled = true;
      extractBtn.classList.add('loading');
      this.setStatus('extracting page HTML...');

      // Extract full page HTML
      const response = await this.sendToTab('EXTRACT_HTML', {
        selector: 'html',
        contentType: 'outerHTML'
      });

      if (response.success) {
        this.extractedHTML = response.content;
        
        // Copy to clipboard
        await navigator.clipboard.writeText(this.extractedHTML);
        
        this.workflowState = 'extracted';
        this.setStatus('HTML copied to clipboard');
        
        // Show insight options
        this.showInsightOptions();
        
      } else {
        throw new Error(response.error || 'Failed to extract HTML');
      }

    } catch (error) {
      console.error('[Devex0] Extract failed:', error);
      this.setStatus(`extraction failed: ${error.message}`, 'error');
    } finally {
      extractBtn.disabled = false;
      extractBtn.classList.remove('loading');
    }
  }

  showInsightOptions() {
    document.getElementById('insightOptions').style.display = 'block';
    document.getElementById('extract').style.display = 'none';
  }

  async handleShowInsights() {
    const showBtn = document.getElementById('showInsights');
    
    try {
      showBtn.disabled = true;
      showBtn.classList.add('loading');
      this.setStatus('analyzing assets and selectors...');

      if (!this.extractedHTML) {
        throw new Error('No HTML content to analyze');
      }

      // Load the AssetSelectorRanker
      await this.loadAssetRanker();
      
      // Run asset analysis
      const ranker = new window.AssetSelectorRanker(this.extractedHTML);
      this.assetAnalysis = ranker.getFullAnalysis(25);
      
      this.workflowState = 'analyzed';
      this.setStatus('asset analysis complete');
      
      // Show analysis results
      this.showAnalysisResults();
      
    } catch (error) {
      console.error('[Devex0] Asset analysis failed:', error);
      this.setStatus(`analysis failed: ${error.message}`, 'error');
    } finally {
      showBtn.disabled = false;
      showBtn.classList.remove('loading');
    }
  }

  handleSkipInsights() {
    this.setStatus('workflow complete - HTML copied to clipboard');
    this.workflowState = 'done';
    this.showResetOption();
  }

  async loadAssetRanker() {
    // Check if already loaded
    if (window.AssetSelectorRanker) {
      return;
    }

    // Load the script dynamically
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '../utils/asset-selector-ranker.js';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Failed to load AssetSelectorRanker'));
      document.head.appendChild(script);
    });
  }

  showAnalysisResults() {
    // Hide insight options
    document.getElementById('insightOptions').style.display = 'none';
    
    // Show analysis results
    document.getElementById('analysisResults').style.display = 'block';
    
    // Populate summary
    this.populateAnalysisSummary();
    
    // Populate selectors list
    this.populateSelectorsList();
  }

  populateAnalysisSummary() {
    const summaryElement = document.getElementById('analysisSummary');
    const { summary, pagination } = this.assetAnalysis;
    
    const lines = [
      `📊 ${summary.totalSelectorsFound} selectors analyzed`,
      `🎯 Top ${summary.topSelectorsShown} shown`,
      `📄 Pagination: ${pagination.hasPagination ? `Yes (${pagination.type})` : 'No'}`,
      `⏰ ${new Date().toLocaleTimeString()}`
    ];
    
    summaryElement.innerHTML = lines.join('<br>');
  }

  populateSelectorsList() {
    const listElement = document.getElementById('selectorsList');
    const { selectors } = this.assetAnalysis;
    
    listElement.innerHTML = '';
    
    selectors.forEach((item, index) => {
      const selectorDiv = document.createElement('div');
      selectorDiv.className = 'target-item';
      selectorDiv.dataset.selector = item.selector;
      
      selectorDiv.innerHTML = `
        <div style="flex: 1;">
          <div class="target-name">${index + 1}. ${item.selector}</div>
          <div class="target-details">Count: ${item.count} | Score: ${item.finalScore}</div>
        </div>
        <div class="target-score">${Math.round(item.finalScore)}</div>
      `;
      
      // Click to select/deselect
      selectorDiv.addEventListener('click', () => {
        this.toggleSelectorSelection(selectorDiv, item.selector);
      });
      
      listElement.appendChild(selectorDiv);
    });
  }

  toggleSelectorSelection(element, selector) {
    if (this.selectedSelectors.has(selector)) {
      this.selectedSelectors.delete(selector);
      element.classList.remove('selected');
    } else {
      this.selectedSelectors.add(selector);
      element.classList.add('selected');
    }
    
    // Update exass button state
    const exassBtn = document.getElementById('exass');
    exassBtn.textContent = this.selectedSelectors.size > 0 ? 
      `exass (${this.selectedSelectors.size})` : 'exass';
  }

  async handleExass() {
    const exassBtn = document.getElementById('exass');
    
    try {
      exassBtn.disabled = true;
      exassBtn.classList.add('loading');
      
      if (this.selectedSelectors.size === 0) {
        this.setStatus('select selectors first', 'error');
        return;
      }
      
      this.setStatus(`extracting assets using ${this.selectedSelectors.size} selectors...`);
      
      // Execute focused extraction using selected selectors
      const results = await this.executeFocusedExtraction();
      
      // Copy results to clipboard
      await navigator.clipboard.writeText(JSON.stringify(results, null, 2));
      
      this.setStatus(`extracted ${results.totalItems || 0} items - copied to clipboard`);
      this.workflowState = 'done';
      
    } catch (error) {
      console.error('[Devex0] Exass failed:', error);
      this.setStatus(`exass failed: ${error.message}`, 'error');
    } finally {
      exassBtn.disabled = false;
      exassBtn.classList.remove('loading');
    }
  }

  async executeFocusedExtraction() {
    const selectedSelectorsArray = Array.from(this.selectedSelectors);
    const extractionResults = {
      url: this.currentTab.url,
      timestamp: new Date().toISOString(),
      selectors: selectedSelectorsArray,
      totalItems: 0,
      data: {}
    };
    
    // Extract data for each selected selector
    for (const selector of selectedSelectorsArray) {
      try {
        const response = await this.sendToTab('EXTRACT_WITH_SELECTOR', {
          selector: selector,
          options: { includeText: true, includeAttributes: true }
        });
        
        if (response.success && response.data) {
          extractionResults.data[selector] = response.data;
          extractionResults.totalItems += response.data.length || 0;
        }
      } catch (error) {
        console.warn(`[Devex0] Failed to extract ${selector}:`, error);
        extractionResults.data[selector] = { error: error.message };
      }
    }
    
    return extractionResults;
  }

  async handleCopyAnalysis() {
    try {
      if (!this.assetAnalysis) {
        throw new Error('No analysis to copy');
      }
      
      const ranker = new window.AssetSelectorRanker(this.extractedHTML);
      const analysisText = ranker.exportAnalysis(25);
      
      await navigator.clipboard.writeText(analysisText);
      this.setStatus('complete analysis copied to clipboard');
      
    } catch (error) {
      console.error('[Devex0] Copy analysis failed:', error);
      this.setStatus(`copy failed: ${error.message}`, 'error');
    }
  }

  handleReset() {
    // Reset state
    this.extractedHTML = null;
    this.assetAnalysis = null;
    this.selectedSelectors.clear();
    this.workflowState = 'ready';
    
    // Reset UI
    document.getElementById('extract').style.display = 'block';
    document.getElementById('insightOptions').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'none';
    
    this.setStatus('ready - click extract to begin');
  }

  showResetOption() {
    document.getElementById('insightOptions').style.display = 'none';
    document.getElementById('analysisResults').style.display = 'block';
    document.getElementById('analysisSummary').innerHTML = 'Workflow complete!';
    document.getElementById('selectorsList').innerHTML = '';
    
    // Hide action buttons, show only reset
    document.getElementById('exass').style.display = 'none';
    document.getElementById('copyAnalysis').style.display = 'none';
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
}

// Initialize when DOM loads
document.addEventListener('DOMContentLoaded', () => {
  const devex0 = new Devex0Interface();
  devex0.init();
});
