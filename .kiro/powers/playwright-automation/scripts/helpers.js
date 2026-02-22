/**
 * Playwright Automation Helper Functions
 * 
 * Utility functions for common browser automation tasks
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

/**
 * Detect running development servers on localhost
 * Checks common ports: 3000-3010, 4200, 5000, 5173, 8000-8080
 * 
 * @returns {Promise<Array>} Array of detected servers with port and URL
 */
async function detectDevServers() {
  const commonPorts = [
    3000, 3001, 3002, 3003, 3004, 3005, 3010,
    4200, 5000, 5173, 8000, 8080
  ];

  const servers = [];

  for (const port of commonPorts) {
    try {
      // Check if port is in use (Windows)
      const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
      if (stdout.trim()) {
        servers.push({
          port,
          url: `http://localhost:${port}`
        });
      }
    } catch (error) {
      // Port not in use, continue
    }
  }

  return servers;
}

/**
 * Safe click with retry logic
 * 
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @param {Object} options - Options including retries
 * @returns {Promise<void>}
 */
async function safeClick(page, selector, options = {}) {
  const { retries = 3, timeout = 5000 } = options;

  for (let i = 0; i < retries; i++) {
    try {
      await page.waitForSelector(selector, { timeout });
      await page.click(selector);
      return;
    } catch (error) {
      if (i === retries - 1) throw error;
      await page.waitForTimeout(1000);
    }
  }
}

/**
 * Safe type with clear
 * 
 * @param {Page} page - Playwright page object
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 * @returns {Promise<void>}
 */
async function safeType(page, selector, text) {
  await page.waitForSelector(selector);
  await page.fill(selector, ''); // Clear first
  await page.type(selector, text);
}

/**
 * Take screenshot with timestamp
 * 
 * @param {Page} page - Playwright page object
 * @param {string} name - Screenshot name
 * @param {Object} options - Screenshot options
 * @returns {Promise<string>} Path to screenshot
 */
async function takeScreenshot(page, name, options = {}) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${name}-${timestamp}.png`;
  const path = options.path || `./test-results/${filename}`;

  await page.screenshot({
    path,
    fullPage: options.fullPage !== false,
    ...options
  });

  return path;
}

/**
 * Handle cookie banner (common patterns)
 * 
 * @param {Page} page - Playwright page object
 * @returns {Promise<boolean>} True if banner was handled
 */
async function handleCookieBanner(page) {
  const selectors = [
    'button:has-text("Accept")',
    'button:has-text("Accept all")',
    'button:has-text("同意")',
    'button:has-text("接受")',
    '[id*="cookie"] button',
    '[class*="cookie"] button'
  ];

  for (const selector of selectors) {
    try {
      const button = await page.$(selector);
      if (button) {
        await button.click();
        await page.waitForTimeout(500);
        return true;
      }
    } catch (error) {
      // Continue to next selector
    }
  }

  return false;
}

/**
 * Extract table data
 * 
 * @param {Page} page - Playwright page object
 * @param {string} selector - Table selector
 * @returns {Promise<Array>} Array of row objects
 */
async function extractTableData(page, selector) {
  return await page.evaluate((sel) => {
    const table = document.querySelector(sel);
    if (!table) return [];

    const headers = Array.from(table.querySelectorAll('th')).map(th => th.textContent.trim());
    const rows = Array.from(table.querySelectorAll('tbody tr'));

    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      const rowData = {};
      
      cells.forEach((cell, index) => {
        const header = headers[index] || `column${index}`;
        rowData[header] = cell.textContent.trim();
      });

      return rowData;
    });
  }, selector);
}

/**
 * Wait for network idle
 * 
 * @param {Page} page - Playwright page object
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
async function waitForNetworkIdle(page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Check if element exists
 * 
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Promise<boolean>}
 */
async function elementExists(page, selector) {
  try {
    const element = await page.$(selector);
    return element !== null;
  } catch (error) {
    return false;
  }
}

/**
 * Get element text
 * 
 * @param {Page} page - Playwright page object
 * @param {string} selector - Element selector
 * @returns {Promise<string|null>}
 */
async function getElementText(page, selector) {
  try {
    const element = await page.$(selector);
    if (!element) return null;
    return await element.textContent();
  } catch (error) {
    return null;
  }
}

/**
 * Create browser context with custom headers
 * 
 * @param {Browser} browser - Playwright browser object
 * @param {Object} options - Context options
 * @returns {Promise<BrowserContext>}
 */
async function createContext(browser, options = {}) {
  const headers = {};

  // Support single header via env vars
  if (process.env.PW_HEADER_NAME && process.env.PW_HEADER_VALUE) {
    headers[process.env.PW_HEADER_NAME] = process.env.PW_HEADER_VALUE;
  }

  // Support multiple headers via JSON
  if (process.env.PW_EXTRA_HEADERS) {
    try {
      const extraHeaders = JSON.parse(process.env.PW_EXTRA_HEADERS);
      Object.assign(headers, extraHeaders);
    } catch (error) {
      console.warn('Failed to parse PW_EXTRA_HEADERS:', error.message);
    }
  }

  const contextOptions = {
    ...options,
    extraHTTPHeaders: {
      ...headers,
      ...options.extraHTTPHeaders
    }
  };

  return await browser.newContext(contextOptions);
}

module.exports = {
  detectDevServers,
  safeClick,
  safeType,
  takeScreenshot,
  handleCookieBanner,
  extractTableData,
  waitForNetworkIdle,
  elementExists,
  getElementText,
  createContext
};
