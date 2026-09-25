// Captures the README screenshots by playing through the app with Playwright.
// Usage: start the dev server (npm run dev), then: node scripts/capture-screenshots.mjs [baseUrl]
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const base = process.argv[2] || 'http://localhost:5173';
const out = 'docs/screenshots';
await mkdir(out, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const shot = async (name, target = page) => { await target.screenshot({ path: `${out}/${name}.jpg`, type: 'jpeg', quality: 84 }); console.log('saved', name); };

await page.goto(base);
await wait(2200);
await shot('01-title-screen');

await page.keyboard.press('Space');
await wait(4500);
await shot('02-landing');

await page.locator('.collage').scrollIntoViewIfNeeded();
await wait(3000);
await shot('03-eight-locations', page.locator('#spots'));
await shot('04-missions', page.locator('#missions'));

await page.evaluate(() => window.scrollTo(0, 0));
await page.locator('.hero .btn-primary').click();
await page.waitForSelector('.hustle');
await wait(1200);
await page.locator('.hustle').nth(0).click();
await wait(500);
await page.locator('.starter').click();
await wait(1800);
await shot('05-mission-brief');

await page.locator('.brief-cta .btn').click();
await page.waitForSelector('.editor-shell.is-ready', { timeout: 60000 });
await wait(2500);
await shot('06-studio-unlayer-editor');

// Stretch the reveal's timeline 3× (capture only) so each short beat can be photographed.
await page.evaluate(() => { const st = window.setTimeout; window.setTimeout = ((f, d, ...a) => st(f, (d || 0) >= 200 ? d * 3 : d, ...a)); });
await page.locator('.btn-publish').click();
await page.waitForSelector('.reveal--approach', { timeout: 20000 });
await wait(3500);
await shot('07-reveal-rival-ad');
await page.waitForSelector('.reveal--hijack', { timeout: 30000 });
await wait(2000);
await shot('08-reveal-hijack');
await page.waitForSelector('.reveal--live', { timeout: 30000 });
await wait(600);
await shot('09-reveal-art-switch');
await page.waitForSelector('.reveal--confirmed', { timeout: 30000 });
await wait(5200);
await shot('10-takeover-confirmed');
await page.waitForSelector('.reveal--legend', { timeout: 30000 });
await wait(2400);
await shot('11-city-legend');

await page.waitForSelector('.result', { timeout: 60000 });
await wait(3000);
await shot('12-result');
await page.locator('.viewer-controls button', { hasText: 'City-wide' }).click();
await wait(3500);
await shot('13-city-wide', page.locator('.viewer'));

// The downloadable 1080×1350 share card, rendered by the app's own exporter.
const card = await page.evaluate(async () => {
  const R = await import('/src/Result.tsx'), S = await import('/src/scenes.ts'), P = await import('/src/posters.ts');
  const c = await R.buildShareCard(S.scenes[0], await P.posterUrl('nightclub'), 1450);
  return c.toDataURL('image/jpeg', 0.86);
});
await writeFile(`${out}/14-share-card.jpg`, Buffer.from(card.split(',')[1], 'base64'));
console.log('saved 14-share-card');

const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await phone.goto(base);
await wait(1500);
await phone.keyboard.press('Space');
await wait(4000);
await shot('15-mobile', phone);

await browser.close();
