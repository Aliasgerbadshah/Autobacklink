const http = require('http');
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

async function createAndPublishPost(title, storyContent) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error("BROWSERLESS_TOKEN is missing.");

  const browser = await chromium.connectOverCDP(
    `wss://production-sfo.browserless.io/stealth?token=${token}`
  );

  const authPath = path.join(__dirname, 'auth.json');
  const storageState = fs.existsSync(authPath) ? authPath : undefined;

  const context = await browser.newContext({
    storageState: storageState,
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    locale: 'en-US'
  });

  const page = await context.newPage();

  // Navigate to the editor
  await page.goto('https://medium.com/new-story', { waitUntil: 'domcontentloaded', timeout: 60000 });
  
  // Wait for editor input fields
  const titleField = 'p[data-placeholder="Title"]';
  const storyField = 'p[data-placeholder="Tell your story…"]';

  await page.waitForSelector(titleField, { timeout: 15000 });

  // Type title and story body with human-like delays
  await page.type(titleField, title, { delay: 40 });
  await page.type(storyField, storyContent, { delay: 30 });

  // Brief pause to allow Medium auto-save to register
  await page.waitForTimeout(3000);

  // Take screenshot of finished draft
  const imageBuffer = await page.screenshot({ fullPage: false });

  await browser.close();
  return imageBuffer;
}

const PORT = process.env.PORT || 3000;
const server = http.createServer(async (req, res) => {
  if (req.url === '/run') {
    try {
      const postTitle = "Automated Backlink Guide";
      const postBody = "Check out our latest resource here: https://colorfiind.com";

      const imageBuffer = await createAndPublishPost(postTitle, postBody);
      
      res.writeHead(200, { 'Content-Type': 'image/png' });
      res.end(imageBuffer);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(`Automation failed: ${error.message}`);
    }
  } else {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot server active.');
  }
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
