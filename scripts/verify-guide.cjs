// Run from the repository root; browser reports are disposable local output.
require('node:fs').mkdirSync('output', { recursive: true });
const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const BASE=process.env.GUIDE_TEST_URL||'http://127.0.0.1:5177/';
const KEY='drinkdrinkdrunk.bar.v1';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 const errors=[];let checks=0;
 const fresh=async(viewport)=>{const c=await browser.newContext({viewport,reducedMotion:'reduce'});const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto(BASE+'#dna');await p.locator('.tour-dialog[open]').waitFor();return[c,p];};
 const state=p=>p.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
 const next=async p=>{await p.locator('[data-tour="next"]').click();await p.waitForTimeout(70);};
 try{
 for(const viewport of[{width:1280,height:844},{width:390,height:844},{width:320,height:568},{width:844,height:390}]){
  const[c,p]=await fresh(viewport);const before=await state(p);const label=`${viewport.width}x${viewport.height}`;
  for(let i=1;i<=9;i++){
   await next(p);
   const geometry=await p.evaluate(i=>{
    const step=BarGuide.steps('vesper-style',false)[i],target=document.querySelector(step.target),card=document.querySelector('.tour-card'),spot=document.querySelector('.tour-spot');
    const r=card.getBoundingClientRect(),s=spot.getBoundingClientRect(),t=target?.getBoundingClientRect();
    return{target:!!target,centered:document.querySelector('.tour-dialog').classList.contains('tour-centered'),cardFits:r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1,overlap:t&&s.right>t.left&&s.left<t.right&&s.bottom>t.top&&s.top<t.bottom,disjoint:s.bottom<=r.top,overflow:document.documentElement.scrollWidth>innerWidth};
   },i);
   assert.equal(geometry.target,true,`${label} step ${i} target`);assert.equal(geometry.centered,false);assert.equal(geometry.cardFits,true,`${label} step ${i} card`);assert.equal(geometry.overlap,true,`${label} step ${i} spotlight`);assert.equal(geometry.disjoint,true,`${label} step ${i} overlap`);assert.equal(geometry.overflow,false);checks++;
   if(i===4)assert.match(await p.locator('[data-player="toggle"]').innerText(),/继续/);
   if(i===7)assert.equal(await p.locator('.detail-copy > .detail-actions [data-share-recipe]').count(),1);
   if(i===2){await p.locator('[data-tour="back"]').click();await p.waitForTimeout(70);assert.equal(new URL(p.url()).hash,'#bar');await next(p);}
   if([2,5,7].includes(i)&&viewport.height===844)await p.screenshot({path:`output/guide-${viewport.width}-step${i}.png`});
  }
  await next(p);assert.equal(await p.locator('.tour-dialog').count(),0);assert.equal(new URL(p.url()).hash,'#dna');assert.deepEqual(await state(p),{...before,guideVersion:1});
  await p.reload();await p.locator('#main').waitFor();assert.equal(await p.locator('.tour-dialog').count(),0);
  await p.goto(BASE+'#settings');await p.locator('[data-action="start-guide"]').click();await p.locator('.tour-dialog').waitFor();await next(p);await p.keyboard.press('Escape');assert.equal(new URL(p.url()).hash,'#settings');assert.equal(await p.evaluate(()=>document.activeElement.dataset.action),'start-guide');checks+=3;
  await c.close();console.log(`${label}: full tour, target placement, back, persistence, replay, Escape passed`);
 }
 const[c,p]=await fresh({width:1280,height:844});await p.locator('[data-tour="skip"]').click();await p.reload();assert.equal(await p.locator('.tour-dialog').count(),0);assert.equal((await state(p)).guideVersion,1);checks++;
 const old=await p.evaluate(()=>{const s=BarCore.blankState();delete s.guideVersion;s.migrated=true;s.theme='light';s.inventory=[{id:'existing',name:'家里的金酒',type:'金酒',shape:'gin',color:'#123456',drawing:[]}];s.favorites=['vesper-style'];s.logs=[{id:'saved',date:'2026-10-01',name:'老日记',note:'保留记录'}];s.taste.onboarding={palette:['lemon','mint'],strength:'light'};return s;});
 await p.evaluate(({key,old})=>localStorage.setItem(key,JSON.stringify(old)),{key:KEY,old});await p.reload();await p.locator('.tour-dialog').waitFor();
 for(let i=1;i<=5;i++)await next(p);assert.equal(await p.locator('.dna-identity').count(),1);assert.equal(await p.locator('.tour-dialog.tour-centered').count(),0);await p.locator('[data-tour="skip"]').click();assert.deepEqual(await state(p),{...old,guideVersion:1});checks++;
 // Updates from another tab while the tour is open must survive its completion.
 await p.goto(BASE+'#settings');await p.locator('[data-action="start-guide"]').click();const other=await c.newPage();await other.goto(BASE);await other.evaluate(key=>{const s=JSON.parse(localStorage.getItem(key));s.logs.push({id:'other-tab',date:'2026-10-01',name:'另一窗口',note:''});localStorage.setItem(key,JSON.stringify(s));},KEY);await p.waitForTimeout(150);await p.locator('[data-tour="skip"]').click();assert.equal((await state(p)).logs.length,2);await other.close();checks++;
 // Ordinary screens no longer display the persistent instructions.
 for(const hash of['bar','discover','dna','journal','recipe/vesper-style']){await p.goto(BASE+'#'+hash);const txt=await p.locator('#main').innerText();for(const copy of['先登记家里的一瓶酒','按所选材料检查','检查配方所列材料；','点选喜欢的味道，再点一次移除','选中日期后，点击'])assert.equal(txt.includes(copy),false);}
 await p.evaluate(key=>localStorage.setItem(key,'{broken'),KEY);await p.reload();await p.locator('#main').waitFor();assert.equal(await p.locator('.tour-dialog').count(),0);assert.equal(await p.evaluate(key=>localStorage.getItem(key),KEY),'{broken');checks++;
 await c.close();assert.deepEqual(errors,[]);console.log(`PASS: ${checks} checks; no browser errors`);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
