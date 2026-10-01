// Run from the repository root; browser reports are disposable local output.
require('node:fs').mkdirSync('output', { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs = require('node:fs');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5176');
  const id = await page.evaluate(() => BarData.recipes.find(r => /尼格罗尼/.test(r.chineseName)).id);
  await page.goto(`http://127.0.0.1:5176/#recipe/${id}`);
  const saved = await page.evaluate(() => localStorage.getItem('drinkdrinkdrunk.bar.v1'));
  await page.getByRole('button', { name: '分享卡片', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  await page.screenshot({ path: 'output/share-desktop.png', fullPage: true });
  for (const style of ['theme', 'archive', 'botanical', 'tropical', 'ocean', 'berry', 'violet', 'cocoa']) {
    await page.locator(`input[value="${style}"]`).check();
    await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
    const downloading = page.waitForEvent('download');
    await page.locator('#share-save').click();
    const download = await downloading;
    const file = `output/share-${style}.png`;
    await download.saveAs(file);
    const bytes = fs.readFileSync(file);
    assert.equal(bytes.readUInt32BE(16), 1080);
    assert.ok(bytes.readUInt32BE(20) >= 1080);
    const same = await page.evaluate(async () => {
      const image = document.querySelector('#share-image'); await image.decode();
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
      canvas.getContext('2d').drawImage(image, 0, 0);
      return canvas.toDataURL('image/png').split(',')[1];
    });
    assert.deepEqual(bytes, Buffer.from(same, 'base64'), 'saved PNG must equal displayed PNG byte for byte');
  }
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.textContent), '分享卡片');
  assert.equal(await page.evaluate(() => localStorage.getItem('drinkdrinkdrunk.bar.v1')), saved);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '分享卡片', exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  await page.screenshot({ path: 'output/share-mobile-top.png' });
  await page.locator('#share-save').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/share-mobile-bottom.png' });
  assert.ok(await page.evaluate(() => document.querySelector('#modal').scrollWidth <= document.querySelector('#modal').clientWidth));
  // Rapid changes must not re-enable an old export or render the wrong final style.
  await page.evaluate(() => {
    for (const id of ['botanical', 'archive', 'tropical', 'botanical']) {
      const input = document.querySelector(`input[value="${id}"]`); input.checked = true; input.dispatchEvent(new Event('change'));
    }
  });
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  const rapidDownload = page.waitForEvent('download'); await page.locator('#share-save').click();
  assert.match((await rapidDownload).suggestedFilename(), /青柠气泡/);
  await page.keyboard.press('Escape');
  // Failure stays in the panel and retries without changing source data.
  await page.evaluate(() => {
    window.realToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function(cb) { cb(null); };
  });
  await page.getByRole('button', { name: '分享卡片', exact: true }).click();
  await page.locator('#share-retry').waitFor({ state: 'visible' });
  assert.equal(await page.locator('#share-save').isDisabled(), true);
  await page.evaluate(() => { HTMLCanvasElement.prototype.toBlob = window.realToBlob; });
  await page.locator('#share-retry').click();
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  await page.keyboard.press('Escape');
  // Long recipe and unknown ingredient examples use the actual browser font metrics.
  const synthetic = await page.evaluate(async () => {
    const recipe = { ...BarData.recipes[0], chineseName: '我的长名称鸡尾酒与特别的风味配方', englishName: '', source: undefined, parts: undefined,
      ingredients: Array.from({ length: 14 }, (_, i) => `我的材料 ${i + 1} 30 ml（可选，可用另一种材料代替）`) };
    const data = BarShare.dataFor(recipe), rendered = await BarShare.render(data, 'botanical');
    const bytes = Array.from(new Uint8Array(await rendered.blob.arrayBuffer()));
    return { bytes, height: rendered.height, known: data.known };
  });
  assert.equal(synthetic.known, false); assert.ok(synthetic.height > 1440);
  fs.writeFileSync('output/share-long.png', Buffer.from(synthetic.bytes));
  // All current recipes can actually export in the browser, beyond layout-only tests.
  const all = await page.evaluate(async () => {
    let max = 0, count = 0;
    for (const recipe of BarData.recipes) {
      const data = BarShare.dataFor(recipe);
      const out = await BarShare.render(data, BarShare.defaultTemplate);
      if (!out.blob.size) throw new Error(`empty ${recipe.id}`);
      max = Math.max(max, out.height); count++;
    }
    return { count, max };
  });
  assert.equal(all.count, 145); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ ...all, errors, checks: ['desktop', '390px mobile', '8 downloads match preview bytes', 'focus restored', 'no state changes', 'rapid style switches', 'render failure and retry', 'long unknown recipe', '145 real PNG exports'] }));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
