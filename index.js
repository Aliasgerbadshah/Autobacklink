const http = require('http');
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function runAutomationAndGetScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error("BROWSERLESS_TOKEN is missing.");

  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/stealth?token=${token}`
  );

  // Load the authenticated session state
  const authPath = path.join(__dirname, 'auth.json');
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const context = await browser.newContext({
    storageState: storageState, // Injects cookies/tokens automatically
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US'
  });

  const page = await context.newPage();

  // Navigate directly to the editor page
  await page.goto('https://medium.com/new-story', { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Take screenshot of the post-editor to confirm logged-in state
  const imageBuffer = await page.screenshot({ fullPage: false });

  await browser.close();
  return imageBuffer;
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    try {
      const imageBuffer = await runAutomationAndGetScreenshot();
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Automation failed: ${error.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server active. Access /run to execute.');
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
