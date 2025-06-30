/**
 * Formatter Agent - Output Generation and Format Conversion
 * Converts harvested data to user's desired format and prepares final output
 */

export class FormatterAgent {
  constructor() {
    this.isInitialized = false;
    this.formatCache = new Map();
    this.supportedFormats = ['json', 'csv', 'tsv', 'xml', 'html', 'text', 'clipboard'];
  }

  async init() {
    if (this.isInitialized) return;
    
    console.log('[FormatterAgent] Initializing...');
    this.isInitialized = true;
  }

  /**
   * Format consolidated data from Harvester Agent
   * @param {Object} consolidatedData - Data from Harvester Agent
   * @param {Object} userInput - Original user preferences
   * @param {Object} executionPlan - Execution plan from Strategy Agent
   */
  async formatOutput(consolidatedData, userInput, executionPlan) {
    try {
      console.log('[FormatterAgent] Formatting output...');

      const { data, metadata } = consolidatedData;
      const outputFormat = this.determineOutputFormat(userInput);
      
      // Prepare data for formatting
      const cleanedData = this.prepareDataForFormat(data, outputFormat);
      
      // Generate formatted output
      const formattedOutput = await this.generateFormattedOutput(cleanedData, outputFormat);
      
      // Create final output package
      const outputPackage = this.createOutputPackage(
        formattedOutput,
        metadata,
        userInput,
        executionPlan,
        outputFormat
      );

      // Handle clipboard copy (maintaining original devex behavior)
      if (outputFormat === 'clipboard' || userInput.mode === 'html' || userInput.mode === 'text') {
        await this.copyToClipboard(outputPackage.content);
      }

      console.log('[FormatterAgent] Output formatted successfully:', {
        format: outputFormat,
        itemCount: data.length,
        outputSize: formattedOutput.length
      });

      return outputPackage;

    } catch (error) {
      console.error('[FormatterAgent] Formatting failed:', error);
      throw error;
    }
  }

  determineOutputFormat(userInput) {
    // Priority order: explicit format > mode-based > default
    if (userInput.options?.format) {
      return userInput.options.format;
    }

    // Map extraction modes to default formats
    const modeFormatMap = {
      'smart': 'json',
      'html': 'html',
      'text': 'text',
      'console': 'json'
    };

    return modeFormatMap[userInput.mode] || 'json';
  }

  prepareDataForFormat(data, format) {
    switch (format) {
      case 'csv':
      case 'tsv':
        return this.prepareTabularData(data);
      case 'html':
        return this.prepareHtmlData(data);
      case 'text':
      case 'clipboard':
        return this.prepareTextData(data);
      default:
        return data; // JSON and XML can use raw data
    }
  }

  prepareTabularData(data) {
    if (data.length === 0) return [];

    // Find all unique keys across all objects
    const allKeys = new Set();
    data.forEach(item => {
      Object.keys(item).forEach(key => {
        if (!key.startsWith('_')) { // Exclude metadata fields
          allKeys.add(key);
        }
      });
    });

    const headers = Array.from(allKeys).sort();
    
    // Convert objects to rows
    const rows = data.map(item => {
      return headers.map(header => {
        const value = item[header];
        return this.sanitizeForTabular(value);
      });
    });

    return { headers, rows };
  }

  prepareHtmlData(data) {
    // For HTML format, we want to preserve structure and styling
    return data.map(item => {
      if (typeof item === 'string' && item.trim().startsWith('<')) {
        return item; // Already HTML
      } else {
        // Convert object to readable HTML
        return this.objectToHtml(item);
      }
    });
  }

  prepareTextData(data) {
    return data.map(item => {
      if (typeof item === 'string') {
        return item;
      } else {
        return this.objectToText(item);
      }
    });
  }

  async generateFormattedOutput(data, format) {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
        
      case 'csv':
        return this.generateCSV(data);
        
      case 'tsv':
        return this.generateTSV(data);
        
      case 'xml':
        return this.generateXML(data);
        
      case 'html':
        return this.generateHTML(data);
        
      case 'text':
      case 'clipboard':
        return this.generateText(data);
        
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  generateCSV(data) {
    if (!data.headers || !data.rows) {
      throw new Error('Invalid tabular data structure for CSV');
    }

    const csvRows = [
      data.headers.join(','), // Header row
      ...data.rows.map(row => 
        row.map(cell => this.escapeCsvCell(cell)).join(',')
      )
    ];

    return csvRows.join('\n');
  }

  generateTSV(data) {
    if (!data.headers || !data.rows) {
      throw new Error('Invalid tabular data structure for TSV');
    }

    const tsvRows = [
      data.headers.join('\t'), // Header row
      ...data.rows.map(row => 
        row.map(cell => this.escapeTsvCell(cell)).join('\t')
      )
    ];

    return tsvRows.join('\n');
  }

  generateXML(data) {
    const xmlItems = Array.isArray(data) ? data : [data];
    
    const xmlContent = xmlItems.map((item, index) => {
      const itemXml = this.objectToXml(item, 'item');
      return `  <item id="${index + 1}">\n${itemXml}\n  </item>`;
    }).join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>\n<data>\n${xmlContent}\n</data>`;
  }

  generateHTML(data) {
    if (Array.isArray(data) && data.every(item => typeof item === 'string')) {
      // Raw HTML content
      return data.join('\n');
    }

    // Generate structured HTML table
    const tableRows = Array.isArray(data) ? data : [data];
    
    if (tableRows.length === 0) {
      return '<div>No data available</div>';
    }

    // Extract headers from first object
    const headers = Object.keys(tableRows[0]).filter(key => !key.startsWith('_'));
    
    const headerHtml = headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('');
    const rowsHtml = tableRows.map(item => {
      const cellsHtml = headers.map(header => {
        const value = item[header];
        return `<td>${this.escapeHtml(this.formatValue(value))}</td>`;
      }).join('');
      return `<tr>${cellsHtml}</tr>`;
    }).join('\n');

    return `
<table border="1" cellpadding="4" cellspacing="0">
  <thead>
    <tr>${headerHtml}</tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>`;
  }

  generateText(data) {
    if (Array.isArray(data)) {
      return data.map((item, index) => {
        if (typeof item === 'string') {
          return `${index + 1}. ${item}`;
        } else {
          return `${index + 1}. ${this.objectToText(item)}`;
        }
      }).join('\n\n');
    } else {
      return this.objectToText(data);
    }
  }

  createOutputPackage(formattedOutput, metadata, userInput, executionPlan, format) {
    return {
      content: formattedOutput,
      format: format,
      metadata: {
        ...metadata,
        formattedAt: Date.now(),
        outputFormat: format,
        originalMode: userInput.mode,
        executionSummary: {
          strategy: executionPlan.strategy?.type,
          duration: metadata.processingDuration,
          itemCount: metadata.totalItems,
          quality: metadata.quality
        }
      },
      stats: {
        originalItems: metadata.totalItems,
        outputSize: formattedOutput.length,
        compressionRatio: metadata.totalItems > 0 ? formattedOutput.length / metadata.totalItems : 0
      }
    };
  }

  async copyToClipboard(content) {
    try {
      // Use the Clipboard API if available
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
        console.log('[FormatterAgent] Content copied to clipboard');
      } else {
        // Fallback for older browsers or non-secure contexts
        this.fallbackCopyToClipboard(content);
      }
    } catch (error) {
      console.warn('[FormatterAgent] Clipboard copy failed:', error);
      // Still continue execution - clipboard is a nice-to-have
    }
  }

  fallbackCopyToClipboard(content) {
    const textArea = document.createElement('textarea');
    textArea.value = content;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      console.log('[FormatterAgent] Content copied to clipboard (fallback)');
    } catch (error) {
      console.warn('[FormatterAgent] Fallback clipboard copy failed:', error);
    } finally {
      document.body.removeChild(textArea);
    }
  }

  // Helper Methods
  sanitizeForTabular(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value).replace(/[\r\n\t]/g, ' ');
  }

  escapeCsvCell(value) {
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  escapeTsvCell(value) {
    return String(value).replace(/[\t\r\n]/g, ' ');
  }

  escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  formatValue(value) {
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  objectToHtml(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return this.escapeHtml(String(obj));
    }

    const entries = Object.entries(obj)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => {
        const formattedValue = this.formatValue(value);
        return `<strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(formattedValue)}`;
      });

    return `<div>${entries.join('<br>')}</div>`;
  }

  objectToText(obj) {
    if (typeof obj !== 'object' || obj === null) {
      return String(obj);
    }

    return Object.entries(obj)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => `${key}: ${this.formatValue(value)}`)
      .join('\n');
  }

  objectToXml(obj, tagName = 'object') {
    if (typeof obj !== 'object' || obj === null) {
      return `    <${tagName}>${this.escapeXml(String(obj))}</${tagName}>`;
    }

    const xmlContent = Object.entries(obj)
      .filter(([key]) => !key.startsWith('_'))
      .map(([key, value]) => {
        const sanitizedKey = this.sanitizeXmlTag(key);
        if (typeof value === 'object' && value !== null) {
          return `    <${sanitizedKey}>${this.escapeXml(JSON.stringify(value))}</${sanitizedKey}>`;
        } else {
          return `    <${sanitizedKey}>${this.escapeXml(String(value))}</${sanitizedKey}>`;
        }
      })
      .join('\n');

    return xmlContent;
  }

  escapeXml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  sanitizeXmlTag(tag) {
    // XML tag names must start with a letter or underscore and contain only letters, digits, hyphens, underscores, and periods
    return tag.replace(/[^a-zA-Z0-9\-_.]/g, '_').replace(/^[^a-zA-Z_]/, '_');
  }

  /**
   * Create a quick text summary for console/debug output
   * @param {Object} outputPackage - The formatted output package
   */
  createSummary(outputPackage) {
    const { metadata, stats } = outputPackage;
    
    return {
      success: true,
      format: outputPackage.format,
      itemCount: metadata.totalItems,
      processingTime: metadata.processingDuration,
      quality: metadata.quality,
      outputSize: stats.outputSize,
      strategy: metadata.executionSummary.strategy
    };
  }

  /**
   * Generate a user-friendly preview of the output
   * @param {Object} outputPackage - The formatted output package
   * @param {number} maxLength - Maximum preview length
   */
  generatePreview(outputPackage, maxLength = 200) {
    const content = outputPackage.content;
    
    if (content.length <= maxLength) {
      return content;
    }

    return content.substring(0, maxLength) + '...';
  }

  /**
   * Validate output format
   * @param {string} format - The requested format
   */
  isValidFormat(format) {
    return this.supportedFormats.includes(format);
  }
}