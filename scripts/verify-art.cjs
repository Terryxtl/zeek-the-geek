// Optional browser smoke check. Requires playwright and its Chromium browser.
const { chromium } = require('playwright');
const fs = require('fs');
const assert = require('assert');
const base = process.env.ZEEK_PREVIEW_URL || 'http://127.0.0.1:8123';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 960 }, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const packs = Object.keys(JSON.parse(fs.readFileSync('puzzlePacks.json', 'utf8')));
  fs.mkdirSync('image/hd/previews', { recursive: true });
  for (const pack of packs) {
    await page.goto(`${base}/game.html?puzzlePack=${pack}`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#score').textContent !== '');
    assert.equal(await page.locator('#artStyle').inputValue(), 'hd');
    assert.ok(Number(await page.locator('#stage').getAttribute('width')) > 1224);
    const dimensions = await page.evaluate(async () => Promise.all([1,2,3,4].map(async id => {
      const image = new Image(); image.src = `image/hd/${id}.png`; await image.decode();
      return [image.naturalWidth, image.naturalHeight];
    })));
    assert.deepEqual(dimensions, [[432,1728],[576,2160],[576,576],[288,2160]]);
    await page.keyboard.press('p');
    if (pack === 'zeek1' || pack === 'valentine1') {
      await page.screenshot({ path: `image/hd/previews/${pack}-hd.png` });
    }
    await page.keyboard.press('p');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('r');
    console.log(`Rendered HD pack: ${pack}`);
  }
  await page.locator('#artStyle').selectOption('classic');
  await page.waitForURL('**art=classic');
  await page.waitForFunction(() => document.querySelector('#score').textContent !== '');
  assert.equal(await page.evaluate(() => document.querySelector('#stage').getContext('2d').imageSmoothingEnabled), false);
  await page.keyboard.press('p');
  await page.screenshot({ path: 'image/hd/previews/valentine1-classic.png' });
  await page.goto(`${base}/art-preview.html`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('section.atlas').count(), 4);
  const manifest = JSON.parse(fs.readFileSync('image/hd/manifest.json', 'utf8'));
  const frames = manifest.sheets.reduce((sum, sheet) => sum + sheet.frames.length, 0);
  assert.equal(await page.locator('.tile').count(), frames);
  await page.screenshot({ path: 'image/hd/previews/gallery.png' });
  await page.locator('#version').selectOption('classic');
  assert.equal(await page.locator('.tile .classic').count(), frames);
  await page.locator('#size').fill('144');
  assert.equal(await page.locator('#sizeValue').textContent(), '144 px');
  assert.deepEqual(errors, []);
  console.log(`Gallery: ${frames} frames; classic switch, resizing and 2x display passed. No browser errors.`);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
