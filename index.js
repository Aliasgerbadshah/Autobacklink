const http = require('http');
const { chromium } = require('playwright-core');

async function runAutomation() {
  const token = process.env.BROWSERLESS_TOKEN;
  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/chromium?token=${token}`
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Navigating to Medium...");
  await page.goto('https://medium.com');

  // Take a screenshot and save it in your project directory
  await page.screenshot({ path: 'screenshot.png' });
  console.log("Screenshot taken successfully!");

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
