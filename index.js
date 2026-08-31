async function publishMediumPost(title, content) {
  const token = process.env.BROWSERLESS_TOKEN;
  if (!token) throw new Error("BROWSERLESS_TOKEN is missing.");

  const wsUrl = `wss://chrome.browserless.io?token=${token}&stealth=true&--disable-blink-features=AutomationControlled`;
  const browser = await chromium.connectOverCDP(wsUrl);

  const authPath = path.join(__dirname, 'auth.json');
  
  if (!fs.existsSync(authPath)) {
    throw new Error("auth.json file was not found in the root directory.");
  }

  // Inject session state
  const context = await browser.newContext({
    storageState: authPath,
    viewport: { width: 1366, height: 768 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    locale: 'en-US',
    timezoneId: 'America/New_York'
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  try {
    console.log("Step 1: Navigating to homepage to set cookies...");
    await page.goto('https://medium.com', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(4000);

    console.log("Step 2: Navigating to editor...");
    await page.goto('https://medium.com/new-story', { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(6000);

    const titleSelector = 'p[data-placeholder="Title"]';
    const storySelector = 'p[data-placeholder="Tell your story…"]';

    // Check if logged in by waiting for the title box
    await page.waitForSelector(titleSelector, { timeout: 15000 });

    await page.type(titleSelector, title, { delay: 60 });
    await page.type(storySelector, content, { delay: 40 });

    await page.waitForTimeout(3000);

    return await page.screenshot({ fullPage: false });

  } finally {
    await browser.close();
  }
}
