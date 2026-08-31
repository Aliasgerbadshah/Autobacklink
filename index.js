const http = require('http');
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

/**
 * Executes the Medium auto-posting routine via Browserless stealth endpoint.
 */
async function publishMediumPost(title, content) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) {
    throw new Error("BROWSERLESS_TOKEN environment variable is not defined in Hostinger.");
  }

  // Connect via Browserless Stealth + Residential Proxy + Captcha Solver
  const endpoint = `wss://production-sfo.browserless.io/stealth?token=${token}&proxy=residential&solveCaptchas=true`;
  const browser = await chromium.connectOverCDP(endpoint);

  // Load saved session (cookies/tokens) from local auth export
  const authPath = path.join(__dirname, 'auth.json');
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const context = await browser.newContext({
    storageState: storageState,
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  try {
    console.log("Navigating to Medium editor...");
    await page.goto('https://medium.com/new-story', { 
      waitUntil: 'domcontentloaded', 
      timeout: 60000 
    });

    // Wait for Cloudflare/Turnstile anti-bot checks to settle
    await page.waitForTimeout(8000);

    const titleSelector = 'p[data-placeholder="Title"]';
    const storySelector = 'p[data-placeholder="Tell your story…"]';

    // Verify session loaded correctly by waiting for editor fields
    await page.waitForSelector(titleSelector, { timeout: 15000 });

    // Type with human-like delays
    await page.type(titleSelector, title, { delay: 50 });
    await page.type(storySelector, content, { delay: 35 });

    // Allow auto-save to complete
    await page.waitForTimeout(3000);

    // Optional: Click Publish controls automatically
    // await page.click('button[data-action="prepare-publish"]');
    // await page.waitForTimeout(1000);
    // await page.click('button[data-action="publish"]');

    // Return screenshot buffer to visually verify execution in-browser
    const imageBuffer = await page.screenshot({ fullPage: false });
    return imageBuffer;

  } finally {
    await browser.close();
  }
}

// Simple HTTP Web Server to satisfy Hostinger execution & Cron endpoints
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
