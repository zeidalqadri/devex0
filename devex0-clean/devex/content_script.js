// Only inject once
if (!window.__devex_console_hooked) {
  window.__devex_console_hooked = true;
  window.__devex_console_logs = [];

  const MAX_LOGS = 1000;
  const orig = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug
  };

  function capture(type, args) {
    const msg = `[${type}] ` + Array.from(args).map(a => {
      try { return typeof a === 'object' ? JSON.stringify(a) : String(a); }
      catch { return String(a); }
    }).join(' ');
    window.__devex_console_logs.push(msg);
    if (window.__devex_console_logs.length > MAX_LOGS) {
      window.__devex_console_logs.shift();
    }
  }

  for (const type of Object.keys(orig)) {
    console[type] = function(...args) {
      capture(type, args);
      orig[type].apply(console, args);
    };
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getConsoleLogs") {
    sendResponse({ logs: window.__devex_console_logs.join('\n') });
  }
});

