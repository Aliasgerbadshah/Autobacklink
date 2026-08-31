const { chromium } = require('playwright-core');

async function runAutomation() {
  // Connect to a remote cloud browser WebSocket (e.g., Browserless.io token)
  const browser = await chromium.connectOverCDP(
    'wss://chrome.browserless.io?token=YOUR_API_KEY'
  );

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://medium.com');
  console.log('Successfully navigated:', await page.title());

  await browser.close();
}

runAutomation();