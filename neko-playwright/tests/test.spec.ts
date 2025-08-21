import { chromium, test, expect } from "@playwright/test";

test('CDP', async () => {
    const browser = await chromium.connectOverCDP('http://0.0.0.0:9223');

    // Reuse same window
    // const context = browser.contexts()[0];
    // const page = context.pages()[0];

    // Create new window
    const context = await browser.newContext({
        recordVideo: {
            dir: './videos',
            size: { width: 1920, height: 1080 }
        },
        viewport: { width: 1920, height: 1080 },
        screen: { width: 1920, height: 1080 }
    });
    const page = await context.newPage();

    await page.goto('https://github.com');
    await page.waitForTimeout(1000 * 2);

    expect(page.url()).toContain('github.com');

    await context.close();
});
