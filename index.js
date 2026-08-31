const http = require('http');
const { chromium } = require('playwright-core');

async function runAutomationAndGetScreenshot() {
  const token = process.env.BROWSERLESS_TOKEN;

  if (!token) {
    throw new Error("BROWSERLESS_TOKEN environment variable is missing.");
  }

  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/chromium?token=${token}`
  );

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  // Navigate to target site
  await page.goto('https://medium.com', { waitUntil: 'networkidle' });

  // Capture the screenshot as an in-memory buffer
  const imageBuffer = await page.screenshot({ fullPage: false });

  await browser.close();
  return imageBuffer;
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    try {
      const imageBuffer = await runAutomationAndGetScreenshot();
      
      // Serve the image directly to your browser
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
