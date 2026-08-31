const http = require('http');
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function publishMediumPost(title, content) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    throw new Error("BROWSERLESS_TOKEN environment variable is not defined in Hostinger.");
  }

  // Uses the primary WebSocket endpoint with explicit stealth flags
  const wsUrl = `wss://chrome.browserless.io?token=${token}&stealth=true&--disable-blink-features=AutomationControlled`;
  
  console.log("Connecting to Browserless...");
  const browser = await chromium.connectOverCDP(wsUrl);

  const authPath = path.join(__dirname, 'auth.json');
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const context = await browser.newContext({
    storageState: storageState,
    viewport: { width: 1366, height: 768 },
    // Modern Chrome User-Agent string to match real client behavior
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  // Inject script to strip navigator.webdriver flags before page load
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    console.log("Navigating to Medium editor...");
    
    await page.goto('https://medium.com/new-story', { 
      waitUntil: 'networkidle', 
      timeout: 60000 
    });

    // Wait for JS challenges and Turnstile checks to execute
    await page.waitForTimeout(10000);

    const titleSelector = 'p[data-placeholder="Title"]';
    const storySelector = 'p[data-placeholder="Tell your story…"]';

    await page.waitForSelector(titleSelector, { timeout: 20000 });

    await page.type(titleSelector, title, { delay: 60 });
    await page.type(storySelector, content, { delay: 40 });

    await page.waitForTimeout(3000);

    const imageBuffer = await page.screenshot({ fullPage: false });
    return imageBuffer;

  } finally {
    await browser.close();
  }
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    try {
      const postTitle = "Automated Insights & Resource Guide";
      const postBody = "Read full detailed documentation on our main platform: https://colorfiind.com";

      const imageBuffer = await publishMediumPost(postTitle, postBody);

      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer);
    } catch (error) {
      console.error(error);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Execution failed: ${error.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Hostinger Backlink Worker Active. Visit /run to trigger execution.');
  }
});

server.listen(PORT, () => {
  console.log(`Server initialized on port ${PORT}`);
});
