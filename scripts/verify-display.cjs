const { chromium } = require('playwright');
const assert = require('assert');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8123/game.html?puzzlePack=zeek1&art=hd', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('#score').textContent !== '');
  let bounds = await page.locator('#stage').boundingBox();
  assert.ok(bounds.width > 1200);
  console.log('1920x1080 desktop board:', Math.round(bounds.width), 'x', Math.round(bounds.height));
  await page.evaluate(() => {
    const draw = Player.prototype.onDraw;
    Player.prototype.onDraw = function(ctx) { window.testPosition = { col: this.Moveable.col, row: this.Moveable.row }; draw.call(this, ctx); };
  });
  await page.mouse.click(bounds.x + 1 + (bounds.width - 2) * 2.5 / 17, bounds.y + 1 + (bounds.height - 2) * 6.5 / 12);
  await page.waitForFunction(() => window.testPosition && testPosition.col === 2 && testPosition.row === 6);
  console.log('Scaled mouse click reached the correct cell (2,6).');
  await page.keyboard.press('p');
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForFunction(() => document.querySelector('#stage').width !== 2448);
  await page.screenshot({ path: 'image/hd/previews/responsive-game.png' });
  for (const viewport of [{ width: 390, height: 844 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport);
    await page.waitForFunction(width => document.querySelector('#stage').getBoundingClientRect().width < width, viewport.width);
    bounds = await page.locator('#stage').boundingBox();
    const toolbar = await page.locator('#artToolbar').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= viewport.width);
    assert.ok(toolbar.y + toolbar.height <= viewport.height);
    assert.ok(Math.abs(bounds.width / bounds.height - 17 / 12) < 0.01);
    console.log(`${viewport.width}x${viewport.height} board:`, Math.round(bounds.width), 'x', Math.round(bounds.height));
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  assert.equal(await page.locator('#fullscreen').textContent(), '退出全屏');
  await page.locator('#fullscreen').click();
  await page.waitForFunction(() => !document.fullscreenElement);
  assert.deepEqual(errors, []);
  console.log('Fullscreen enter/exit and paused resize passed. No browser errors.');
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
