const { chromium } = require('C:/Users/64969/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript(() => {
    window.shareCalls = 0;
    Object.defineProperty(navigator, 'canShare', { value: () => true });
    Object.defineProperty(navigator, 'share', { value: () => {
      window.shareCalls++;
      return new Promise((resolve, reject) => setTimeout(() => reject(new DOMException('cancel', 'AbortError')), 250));
    } });
  });
  await page.goto('http://127.0.0.1:5176/#recipe/world-015-negroni');
  const open = async () => {
    await page.getByRole('button', { name: '分享卡片', exact: true }).click();
    await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  };
  await open();
  const before = await page.locator('#share-image').getAttribute('src');
  await page.evaluate(() => { document.documentElement.dataset.theme = 'light'; });
  assert.equal(await page.locator('#share-image').getAttribute('src'), before);
  await page.locator('input[value="botanical"]').focus();
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  assert.equal(await page.locator('input[value="tropical"]').isChecked(), true);
  await page.locator('#share-system').click();
  assert.equal(await page.locator('#share-system').isDisabled(), true);
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  assert.equal(await page.locator('#share-error').innerText(), '');
  assert.equal(await page.evaluate(() => window.shareCalls), 1);
  const rect = await page.locator('#share-save').boundingBox();
  assert.ok(rect.y + rect.height <= 844 && rect.y >= 0);
  await page.evaluate(() => { location.hash = 'discover'; });
  await page.waitForFunction(() => !document.querySelector('#modal').open);
  assert.equal(await page.locator('#share-image').getAttribute('src'), null);
  await page.goto('http://127.0.0.1:5176/#recipe/world-015-negroni');
  // Exercise the JS/native contract without presenting any OS share target.
  await page.evaluate(() => {
    window.barHost = { platform: 'ios' };
    window.webkit = { messageHandlers: { barShare: { postMessage: async data => {
      window.nativeExport = { filename: data.filename, prefix: data.base64.slice(0, 10) };
      return 'cancelled';
    } } } };
  });
  await open();
  assert.equal(await page.locator('#share-save').innerText(), '保存／分享图片');
  assert.equal(await page.locator('#share-system').isVisible(), false);
  await page.locator('#share-save').click();
  await page.waitForFunction(() => !document.querySelector('#share-save').disabled);
  const payload = await page.evaluate(() => window.nativeExport);
  assert.match(payload.filename, /\.png$/); assert.match(payload.prefix, /^iVBOR/);
  assert.equal(await page.locator('#share-error').innerText(), '');
  await browser.close();
  console.log('PASS: keyboard, theme-independent card, share cancellation, duplicate guard, fixed mobile save, route cleanup, mocked iOS bridge payload and cancellation');
})().catch(e => { console.error(e); process.exit(1); });
