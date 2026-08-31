const http = require('http');
const { chromium } = require('playwright-core');

async function runAutomation() {
  const token = process.env.BROWSERLESS_TOKEN;
  
  if (!token) {
    throw new Error("BROWSERLESS_TOKEN environment variable is missing.");
  }

  // Connects to Browserless using your API token
  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/chromium?token=${token}`
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://medium.com');
  console.log('Successfully navigated:', await page.title());

  await browser.close();
}

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
