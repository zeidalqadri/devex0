/**
 * Jest test setup for Devex0
 * Configures Chrome extension API mocking and test environment
 */

// Mock Chrome APIs
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
      remove: jest.fn(),
      clear: jest.fn()
    }
  },
  runtime: {
    onMessage: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    onConnect: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    },
    sendMessage: jest.fn(),
    lastError: null,
    id: 'test-extension-id'
  },
  tabs: {
    query: jest.fn(),
    create: jest.fn(),
    remove: jest.fn(),
    get: jest.fn(),
    sendMessage: jest.fn()
  },
  scripting: {
    executeScript: jest.fn()
  },
  alarms: {
    create: jest.fn(),
    clear: jest.fn(),
    onAlarm: {
      addListener: jest.fn(),
      removeListener: jest.fn()
    }
  },
  notifications: {
    create: jest.fn(),
    clear: jest.fn()
  }
};

// Mock console methods to reduce test noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Setup DOM environment
global.document = {
  querySelector: jest.fn(),
  querySelectorAll: jest.fn(),
  createElement: jest.fn(),
  addEventListener: jest.fn()
};

global.window = {
  location: { href: 'https://example.com' },
  addEventListener: jest.fn()
};

// Mock URL constructor
global.URL = class URL {
  constructor(url) {
    this.href = url;
    this.hostname = url.replace(/https?:\/\//, '').split('/')[0];
    this.pathname = '/' + url.split('/').slice(3).join('/');
  }
};

// Setup test timeouts
jest.setTimeout(10000);

// Clear all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  
  // Reset Chrome API mocks to default behavior
  chrome.storage.local.get.mockResolvedValue({});
  chrome.storage.local.set.mockResolvedValue();
  chrome.tabs.query.mockResolvedValue([]);
  chrome.tabs.create.mockResolvedValue({ id: 1 });
  chrome.tabs.get.mockResolvedValue({ id: 1, status: 'complete' });
  chrome.scripting.executeScript.mockResolvedValue([{ result: {} }]);
});