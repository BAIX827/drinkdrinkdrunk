// Run from the repository root; browser reports are disposable local output.
require('node:fs').mkdirSync('output', { recursive: true });
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const page=await browser.newPage({viewport:{width:1280,height:960},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:5181/#settings');
 await page.getByRole('button',{name:'跳过引导'}).click();
 await page.locator('#language').selectOption('en');
 assert.equal(await page.title(),'drinkdrinkdrunk');
 await page.reload();
 assert.equal(await page.locator('#language').inputValue(),'en');
 await page.screenshot({path:'output/settings-en-desktop.png',fullPage:true});
 const chinese=[];
 const audit=async label=>{
   const text=await page.locator('body').innerText();
   const lines=text.split('\n').filter(x=>/[\u3400-\u9fff]/.test(x) && !x.includes('简体中文') && x !== '语言 / Language');
   if(lines.length)chinese.push({label,lines});
 };
 await audit('settings');
 const id=await page.evaluate(()=>BarData.recipes.find(r=>r.englishName==='Negroni').id);
 for(const route of ['discover','bar','favorites','journal','dna','compare',`recipe/${id}`,`follow/${id}`]) {
   await page.goto('http://127.0.0.1:5181/#'+route);await page.waitForTimeout(80);await audit(route);
 }
 await page.goto('http://127.0.0.1:5181/#settings');
 await page.getByRole('button',{name:'Replay the tour',exact:true}).click();
 for(let step=0;step<10;step++) {
   assert.doesNotMatch(await page.locator('.tour-card').innerText(),/[\u3400-\u9fff]/);
   await page.locator('[data-tour=next]').click();
 }
 assert.equal(await page.locator('.tour-dialog').count(),0);
 await page.goto('http://127.0.0.1:5181/#dna');
 await page.locator('[data-flavor=lemon]').click();
 await page.locator('#palette-save').click();await audit('DNA with preferences');
 await page.goto('http://127.0.0.1:5181/#discover');
 await page.locator('#search').fill('Gin');
 assert.ok(await page.locator('.recipe-card').count()>0,'English ingredient search works');
 await page.goto('http://127.0.0.1:5181/#bar');
 await page.getByRole('button',{name:'＋ Add ingredient',exact:true}).click();
 await page.locator('[name=name]').fill('金酒 · 我的瓶子');
 await page.locator('[name=type]').selectOption('金酒');
 assert.equal(await page.locator('[name=type]').inputValue(),'金酒');
 await page.getByRole('button',{name:'Save ingredient',exact:true}).click();
 assert.ok((await page.locator('main').innerText()).includes('金酒 · 我的瓶子'));
 await page.goto('http://127.0.0.1:5181/#journal');
 await page.getByRole('button',{name:'＋ Log a drink',exact:true}).click();
 await page.locator('[name=name]').fill('金酒');await page.locator('[name=note]').fill('喜欢，今天的心情。');
 await page.getByRole('button',{name:'Save entry',exact:true}).click();
 assert.ok((await page.locator('main').innerText()).includes('喜欢，今天的心情。'));
 await page.goto('http://127.0.0.1:5181/#settings');
 await page.getByRole('button',{name:'Export backup',exact:true}).click();
 const backup=await page.locator('#backup-text').inputValue();
 assert.equal(JSON.parse(backup).inventory[0].type,'金酒');
 assert.equal(JSON.parse(backup).logs[0].note,'喜欢，今天的心情。');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.locator('#language').selectOption('zh-CN');assert.equal(await page.title(),'大喝特喝');
 await page.reload();assert.equal(await page.locator('#language').inputValue(),'zh-CN');
 await page.getByRole('button',{name:'导入备份',exact:true}).click();
 await page.locator('#import-text').fill(backup);
 await page.locator('#import-form input[type=checkbox]').check();
 await page.getByRole('button',{name:'确认导入',exact:true}).click();
 assert.equal(await page.locator('#language').inputValue(),'en','import restores the saved language');
 await page.getByRole('button',{name:'＋ Add recipe',exact:true}).click();
 await page.locator('#recipe-form [name=name]').fill('我的金酒');
 await page.locator('#recipe-form [name=ingredients]').fill('Gin 45 ml\nTonic water 120 ml');
 await page.locator('#recipe-form [name=method]').fill('今天，慢慢搅拌。');
 await page.getByRole('button',{name:'Save recipe',exact:true}).click();
 await page.waitForURL(/#recipe\/user-/);
 assert.equal(await page.locator('.detail-copy h1').innerText(),'我的金酒');
 assert.equal(await page.locator('.method').innerText(),'今天，慢慢搅拌。');
 const customID=await page.evaluate(()=>location.hash.split('/')[1]);
 await page.goto('http://127.0.0.1:5181/#compare/'+customID);
 assert.equal(await page.locator('#taste-left option:checked').innerText(),'我的金酒');
 assert.equal(await page.locator('.taste-compare-head h2').first().innerText(),'我的金酒');
 await page.goto('http://127.0.0.1:5181/#recipe/'+id);
 await page.getByRole('button',{name:'Share card',exact:true}).click();
 await page.waitForFunction(()=>!document.querySelector('#share-save').disabled);
 await audit('share');await page.screenshot({path:'output/share-en.png',fullPage:true});
 const download=page.waitForEvent('download');await page.locator('#share-save').click();
 const result=await download;assert.match(result.suggestedFilename(),/^DDDrunk-/);await result.saveAs('output/share-en-card.png');
 await page.getByRole('button',{name:'Close',exact:true}).click();
 await page.waitForTimeout(4300);
 await page.setViewportSize({width:390,height:844});
 for(const route of ['settings','discover','dna',`recipe/${id}`,`follow/${id}`]) {
   await page.goto('http://127.0.0.1:5181/#'+route);await page.waitForTimeout(80);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflow');
   await page.screenshot({path:`output/i18n-mobile-${route.replace('/','-')}.png`});
 }
 fs.writeFileSync('output/i18n-browser-report.json',JSON.stringify({errors,chinese},null,2));
 assert.deepEqual(errors,[]);
 assert.deepEqual(chinese,[],'English app copy is fully localized');
 console.log(JSON.stringify({errors,chinese},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
