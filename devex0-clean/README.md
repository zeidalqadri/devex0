# DevEx0 Chrome Extension

An intelligent web scraping Chrome extension that uses advanced CSS selector ranking algorithms to extract structured data from web pages.

## 🚀 Features

- **Intelligent Selector Ranking**: Uses the AssetSelectorRanker algorithm to identify and rank CSS selectors based on their relevance for data extraction
- **Chrome Extension (Manifest V3)**: Browser-native extension for seamless web scraping
- **E-commerce Focused**: Optimized for product data, pricing, and inventory information
- **Pagination Detection**: Automatically identifies pagination patterns and navigation elements
- **Focused Extraction (Exass)**: Extract structured JSON data using selected CSS selectors
- **Clean Workflow**: Extract → Analyze → Select → Extract focused data

## 🛠️ Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/zeidalqadri/devex0.git
   cd devex0
   ```

2. **Install dependencies** (optional, for development):
   ```bash
   npm install
   ```

3. **Load the extension in Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked" and select the repository directory
   - The DevEx0 extension should now appear in your Chrome toolbar

## 📖 Usage

1. **Navigate to a target webpage** (e.g., an e-commerce site)
2. **Click the DevEx0 extension icon** in your Chrome toolbar
3. **Click "EXTRACT"** to copy the page HTML to your clipboard
4. **Choose "yes, analyze"** when asked if you want insights
5. **Review the ranked CSS selectors** with their relevance scores
6. **Select the selectors** you want to extract data from
7. **Click "exass"** to perform focused extraction
8. **View structured JSON results** copied to your clipboard

## 🏗️ Architecture

### Core Components

- **`manifest.json`**: Chrome extension configuration
- **`popup/`**: Extension UI and main workflow logic
- **`utils/asset-selector-ranker.js`**: Core ranking algorithm
- **`content-scripts/extractor.js`**: Page data extraction engine
- **`background/`**: Extension background services

### Algorithm Highlights

The AssetSelectorRanker algorithm:
- Analyzes HTML structure and CSS selectors
- Scores elements based on e-commerce relevance keywords
- Prioritizes stable selectors (data-testid, id attributes)
- Learns from JSON-LD structured data on pages
- Detects pagination patterns automatically

## 🧪 Testing

The extension includes comprehensive testing functionality. See the test results for validation of:
- CSS selector ranking accuracy
- Pagination detection
- Data extraction workflow
- Cross-browser compatibility

## 📝 Development

### Project Structure

```
devex0/
├── manifest.json           # Chrome extension manifest
├── popup/                  # Extension popup UI
│   ├── popup.html
│   └── popup.js
├── utils/                  # Core algorithms
│   └── asset-selector-ranker.js
├── content-scripts/        # Page interaction scripts
│   └── extractor.js
├── background/             # Extension background services
└── devex/                  # Legacy components
```

### Key Technologies

- **Chrome Extension API** (Manifest V3)
- **Vanilla JavaScript** for maximum compatibility
- **CSS Selector Analysis** for intelligent targeting
- **DOM Manipulation** for data extraction
- **JSON-LD Processing** for structured data

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built for intelligent web scraping and data extraction
- Optimized for e-commerce and structured data scenarios
- Designed with developer experience and ease of use in mind
