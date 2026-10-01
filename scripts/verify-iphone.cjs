// Verify the embedded iPhone layout and host bridge in a disposable browser profile.
// PLAYWRIGHT_PATH and CHROME_PATH can point to an existing local browser runtime.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const baseURL = process.env.IPHONE_TEST_URL || 'http://127.0.0.1:5173/';
const key = 'drinkdrinkdrunk.bar.v1';
const seed = {version:1, inventory:[], favorites:[], customRecipes:[], logs:[], taste:{onboarding:null,ratings:[]}, theme:'bar', locale:'zh-CN', migrated:true, guideVersion:1};
fs.mkdirSync('output', {recursive:true});
(async () => {
  const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
  const errors = []; let checks=0;
  const create = async (width=390,height=760,locale='zh-CN',extra={}) => {
    const context = await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    await context.addInitScript(({seed,key,extra}) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(seed));
      window.nativeEvents=[]; window.nativeSaves=[];
      window.barHost={nativeNavigation:true,platform:'ios',route:'discover',...extra};
      window.webkit={messageHandlers:{barNavigation:{postMessage:e=>nativeEvents.push(e)},barState:{postMessage:s=>nativeSaves.push(JSON.parse(s))}}};
    }, {seed:{...seed,locale},key,extra});
    const page=await context.newPage(); page.on('pageerror',e=>errors.push(e.message));
    await page.goto(baseURL); await page.locator('#recipe-grid').waitFor();
    return {context,page};
  };
  const route = async (page,hash) => {await page.evaluate(hash=>{location.hash=hash},hash);await page.waitForFunction(hash=>document.documentElement.dataset.route===hash.split('/')[0],hash);};
  try {
    for (const width of [320,375,390,430]) for (const locale of ['zh-CN','en']) {
      const {context,page}=await create(width,width===320?568:760,locale);
      assert.equal(await page.locator('.sidebar').isVisible(),false);
      assert.ok(await page.evaluate(()=>document.querySelector('.recipe-card').getBoundingClientRect().top < innerHeight-90),`${width}/${locale} first recipe above tab bar`);
      for (const hash of ['discover','bar','dna','journal','settings','recipe/vesper-style','follow/vesper-style']) {
        await route(page,hash);
        const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,topbar:document.querySelector('.topbar').getBoundingClientRect().height,body:document.querySelector('#main').getBoundingClientRect().right}));
        assert.ok(layout.scroll<=layout.width+1,`${width}/${locale}/${hash} horizontal overflow`);
        assert.ok(layout.body<=layout.width+1);
        assert.equal(layout.topbar,56,`${width}/${locale}/${hash} toolbar height`);
        checks++;
        if(width===390&&locale==='zh-CN') await page.screenshot({path:`output/iphone-${hash.replaceAll('/','-')}.png`});
      }
      await context.close();
    }
    const migration = await create(390,760,'zh-CN', {
      state: JSON.stringify({...seed, migrated:false, favorites:['web-favorite']}),
      favorites:['native-favorite'], legacy:{sourceID:'test-phone', favorites:['native-favorite']}
    });
    assert.deepEqual(await migration.page.evaluate(()=>nativeSaves.at(-1).favorites),['web-favorite','native-favorite']);
    await migration.context.close(); checks++;
    const {context,page}=await create();
    await page.locator('#search').fill('金酒');
    assert.ok((await page.locator('.recipe-card').count())>0);
    await page.evaluate(()=>window.scrollTo(0,700));
    await page.waitForFunction(()=>nativeEvents.some(e=>e.type==='scroll'&&!e.expanded));
    assert.ok(await page.locator('#search').isVisible());
    assert.ok(await page.locator('#search').evaluate(e=>e.getBoundingClientRect().top<130)); checks++;
    const visibleIndex = await page.locator('.recipe-copy a').evaluateAll(items => items.findIndex(e => { const r=e.getBoundingClientRect(); return r.top>130 && r.bottom<innerHeight-100; }));
    assert.ok(visibleIndex>=0);
    const scroll=await page.evaluate(()=>window.scrollY);
    await page.locator('.recipe-copy a').nth(visibleIndex).click();
    await page.locator('.iphone-back').click();
    await page.waitForFunction(()=>document.documentElement.dataset.route==='discover');
    assert.ok(Math.abs(await page.evaluate(()=>window.scrollY)-scroll)<100,'back restores list position');
    assert.equal(await page.locator('#search').inputValue(),'金酒'); checks++;
    await page.evaluate(()=>BarNative.navigate('journal'));
    await page.locator('[data-action="log"]').click();
    await page.waitForFunction(()=>nativeEvents.some(e=>e.type==='overlay'&&e.open));
    await page.locator('#log-form [name="name"]').fill('iPhone test diary');
    await page.locator('#log-form [name="note"]').fill('Unified diary');
    assert.equal(await page.locator('[data-photo-camera]').getAttribute('capture'),'environment');
    await page.locator('#log-form button[type="submit"]').click();
    assert.equal(await page.locator('.journal-entry').count(),1);checks++;
    await page.locator('[data-action="add-recipe"]').click();
    await page.locator('#recipe-form [name="name"]').fill('iPhone test recipe');
    await page.locator('.ingredient-row input').first().fill('金酒 45 ml');
    await page.locator('.ingredient-row input').nth(1).fill('柠檬汁 20 ml');
    await page.locator('#recipe-form [name="method"]').fill('摇和后滤入杯中');
    await page.locator('#recipe-form [name="note"]').fill('保留备注');
    await page.locator('#recipe-form [name="tags"]').fill('金酒，酸爽');
    await page.locator('#recipe-form button[type="submit"]').click();
    await page.waitForFunction(()=>location.hash.startsWith('#recipe/user-'));
    const recipeID=await page.evaluate(()=>location.hash.split('/')[1]);
    assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)).customRecipes.at(-1).ingredients,key),['金酒 45 ml','柠檬汁 20 ml']);checks++;
    await page.reload();await page.locator('#recipe-grid').waitFor();
    await page.evaluate(id=>BarNative.navigate(`recipe/${id}`),recipeID);
    await page.locator('.detail-copy h1').waitFor();
    assert.equal(await page.locator('.detail-copy h1').innerText(),'iPhone test recipe');
    await page.locator('.detail-actions [data-log-recipe]').click();
    await page.locator('#log-form button[type="submit"]').click();
    await page.waitForFunction(()=>document.documentElement.dataset.route==='journal');
    assert.equal(await page.locator('.journal-entry').count(),2);checks++;
    await route(page,'settings');
    for(const theme of ['light','dark','bar']) {await page.selectOption('#theme',theme);assert.equal(await page.evaluate(()=>document.documentElement.dataset.theme),theme);}
    await page.selectOption('#language','en');
    assert.ok(await page.evaluate(()=>nativeEvents.some(e=>e.type==='appearance'&&e.locale==='en')));checks++;
    await page.locator('[data-action="add-recipe"]').click();
    await page.getByRole('button',{name:'Import from Xiaohongshu'}).click();
    assert.ok(await page.evaluate(()=>nativeEvents.some(e=>e.type==='importRecipe')));checks++;
    const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=4;return c.toDataURL('image/jpeg');});
    const imported={id:'user-native-import',chineseName:'原生导入',englishName:'Native import',ingredients:['金酒 30 ml'],tags:['金酒'],glass:'马天尼杯',method:'摇和',note:'保留原文',photo,isUserCreated:true};
    assert.equal(await page.evaluate(r=>BarNative.importRecipes([r]),imported),true);
    await page.locator('.recipe-source-photo img').waitFor();
    await page.locator('[data-favorite="user-native-import"]').click();
    assert.ok(await page.evaluate(()=>nativeSaves.at(-1).favorites.includes('user-native-import')));checks++;
    await context.close();
    // Full iPhone onboarding still locates the collapsed filter disclosure and all targets.
    const tour=await create(375,700);
    await route(tour.page,'settings');await tour.page.locator('[data-action="start-guide"]').click();
    for(let i=1;i<=9;i++) {
      await tour.page.locator('[data-tour="next"]').click();
      await tour.page.waitForTimeout(80);
      assert.equal(await tour.page.locator('.tour-dialog').evaluate(e=>e.classList.contains('tour-centered')),false,`tour step ${i}`);
      if(i===2) assert.equal(await tour.page.locator('.iphone-filters').getAttribute('open'),'');
      checks++;
    }
    await tour.page.locator('[data-tour="next"]').click(); await tour.context.close();
    assert.deepEqual(errors,[]);
    console.log(`PASS: ${checks} iPhone layout, navigation, data, editor, import, appearance and tour checks`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
