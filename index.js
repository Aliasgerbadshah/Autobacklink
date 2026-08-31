const http = require('http');
const { chromium } = require('playwright-core');

async function runAutomationAndGetScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    throw new Error("BROWSERLESS_TOKEN environment variable is missing.");
  }

  // Connect via the Browserless /stealth route instead of plain /chromium
  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/stealth?token=${token}`
  );

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  // Navigate and wait for potential Cloudflare challenge redirects to settle
  await page.goto('https://medium.com', { 
    waitUntil: 'domcontentloaded',
    timeout: 60000 
  });

  // Brief pause to allow any JS challenge solvers to run
  await page.waitForTimeout(5000);

  const imageBuffer = await page.screenshot({ fullPage: false });

  await browser.close();
  return imageBuffer;
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    try {
      const imageBuffer = await runAutomationAndGetScreenshot();
      
      res.writeHead(200, {
        'Content-Type': 'image/png',
        'Content-Length': imageBuffer.length
      });
      res.end(imageBuffer);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Automation failed: ${error.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server active. Access /run to execute and view screenshot.');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
