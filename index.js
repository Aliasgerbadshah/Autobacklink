const http = require('http');
const { chromium } = require('playwright-core');

// Your Playwright automation logic
async function runAutomation() {
  // Replace with your actual Browserless.io or Cloud Browser WebSocket URL
  const browser = await chromium.connectOverCDP(
    'wss://chrome.browserless.io?token=YOUR_API_KEY'
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://medium.com');
  console.log('Successfully navigated:', await page.title());

  await browser.close();
}

// HTTP Server to satisfy Hostinger health checks & trigger script
const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.write('Triggering automation...\n');
    try {
      await runAutomation();
      res.end('Automation completed successfully!');
    } catch (error) {
      res.end(`Automation failed: ${error.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server active. Access /run to execute the task.');
  }
});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
