// Run from the repository root; browser reports are disposable local output.
require('node:fs').mkdirSync('output', { recursive: true });
const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1320, height: 980 } });
  await page.goto('http://127.0.0.1:5176');
  const result = await page.evaluate(() => {
    const kinds = ['martini','coupe','wine','hurricane','margarita','highball','rocks','shot','mug','bowl'];
    const entries = [
      ...kinds.map(kind => [kind, BarArt.glass(kind, '#b95e43', { garnish: 'none' })]),
      ...['shaker','mixing','blender'].map(kind => [kind, BarArt.vessel(kind)]),
      ...Object.keys(BarCore.bottleShapes).map(kind => [kind, BarArt.bottle({shape:kind})]),
    ];
    document.body.innerHTML = '<main id="reflection-proof"></main>';
    const main = document.querySelector('main');
    main.style.cssText = 'padding:24px;display:grid;grid-template-columns:repeat(6,1fr);gap:12px;background:#15241d';
    main.innerHTML = entries.map(([kind,svg]) => `<figure style="margin:0;padding:12px;background:#29382e;border:1px solid #657762;border-radius:10px"><div>${svg}</div><figcaption style="color:#f0e7d6;text-align:center;font-size:14px">${kind}</figcaption></figure>`).join('');
    document.querySelectorAll('figure svg').forEach(svg => { svg.style.cssText = 'display:block;width:100%;height:170px'; });
    const failures = [];
    for (const svg of document.querySelectorAll('figure svg')) {
      const highlight = svg.querySelector('[data-reflection]');
      if (!highlight) { failures.push('Missing reflection'); continue; }
      const id = highlight.getAttribute('clip-path').slice(5,-1);
      const outline = svg.querySelector(`#${id} path`);
      const radius = Number(highlight.getAttribute('stroke-width')) / 2 + 1.5;
      const length = highlight.getTotalLength();
      for (let i=0; i<=100; i++) {
        const p = highlight.getPointAtLength(length*i/100);
        for(let angle=0; angle<Math.PI*2; angle+=Math.PI/4) {
          if(!outline.isPointInFill(new DOMPoint(p.x+Math.cos(angle)*radius,p.y+Math.sin(angle)*radius))) {
            failures.push(`${svg.dataset.glass || svg.dataset.bottle || svg.dataset.vessel}: reflection touches/exits wall at ${i}`);
          }
        }
      }
    }
    const martini = document.querySelector('[data-glass="martini"]');
    const old = document.createElementNS('http://www.w3.org/2000/svg','path');
    old.setAttribute('d','M25 55l6 19'); martini.append(old);
    const clipID = martini.querySelector('[data-reflection]').getAttribute('clip-path').slice(5,-1);
    const body = martini.querySelector(`#${clipID} path`);
    const oldCrossesBoundary = !body.isPointInFill(old.getPointAtLength(old.getTotalLength())); old.remove();
    return { count: entries.length, failures, oldCrossesBoundary };
  });
  assert.equal(result.oldCrossesBoundary, true, 'must reproduce the old martini defect');
  assert.deepEqual(result.failures, []);
  await page.screenshot({path:'output/reflections-dark.png',fullPage:true});
  await page.evaluate(() => {
    document.querySelector('main').style.background='#eee5d5';
    document.querySelectorAll('figure').forEach(f=>{f.style.background='#fff9ee';f.querySelector('figcaption').style.color='#29494d';});
    document.documentElement.dataset.theme='light';
  });
  await page.screenshot({path:'output/reflections-light.png',fullPage:true});
  await page.goto('http://127.0.0.1:5176/?reflection-check#recipe/world-015-negroni');
  await page.getByRole('button',{name:'分享卡片',exact:true}).click();
  await page.waitForFunction(()=>!document.querySelector('#share-save').disabled);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#share-save').click();
  await (await downloadPromise).saveAs('output/share-reflection-fixed.png');
  console.log(JSON.stringify(result));
  await browser.close();
})().catch(error=>{console.error(error);process.exit(1);});
