document.getElementById('copy-elements').addEventListener('click', async () => {
  setStatus('Copying...');
  const selector = document.getElementById('selector').value.trim();
  const contentType = document.getElementById('content-type').value;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (selector, contentType) => {
        let el;
        if (selector) {
          el = document.querySelector(selector);
          if (!el) return { error: `No element matches selector: ${selector}` };
        } else {
          el = document.documentElement;
        }
        let content;
        if (contentType === 'outerHTML') content = el.outerHTML;
        else if (contentType === 'innerHTML') content = el.innerHTML;
        else if (contentType === 'textContent') content = el.textContent;
        else content = '';
        return { content };
      },
      args: [selector, contentType]
    }, async (results) => {
      if (chrome.runtime.lastError || !results || !results[0]) {
        setStatus('Failed to copy Elements.');
        return;
      }
      const { content, error } = results[0].result;
      if (error) {
        setStatus(error);
        return;
      }
      await navigator.clipboard.writeText(content);
      setStatus('Copied!');
    });
  } catch (e) {
    setStatus('Error: ' + e.message);
  }
});

document.getElementById('copy-console').addEventListener('click', async () => {
  setStatus('Copying console output...');
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content_script.js']
    });
    chrome.tabs.sendMessage(tab.id, { action: "getConsoleLogs" }, async (response) => {
      if (!response || !response.logs) {
        setStatus('Failed to copy Console.');
        return;
      }
      await navigator.clipboard.writeText(response.logs);
      setStatus('Console copied!');
    });
  } catch (e) {
    setStatus('Error: ' + e.message);
  }
});

function setStatus(msg) {
  document.getElementById('status').textContent = msg;
}

