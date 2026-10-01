// Run from the repository root; browser reports are disposable local output.
require('node:fs').mkdirSync('output', { recursive: true });
const {chromium}=require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('node:fs');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:5181/#settings');
  await page.getByRole('button',{name:'跳过引导'}).click();
  await page.locator('#language').selectOption('en');
  const report=await page.evaluate(async()=>{
   const findings=[]; let recipes=0,steps=0;
   const han=/[\u3400-\u9fff]/;
   const audit=(label,root=document.querySelector('#main'))=>{
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) {
     const node=walker.currentNode;
     if(!node.parentElement.closest('script,style,textarea') && han.test(node.textContent)) findings.push({label,kind:'text',value:node.textContent.trim()});
    }
    for(const node of root.querySelectorAll('[aria-label],[title],[alt],[placeholder]'))for(const attr of ['aria-label','title','alt','placeholder']) {
     const value=node.getAttribute(attr); if(value&&han.test(value))findings.push({label,kind:attr,value});
    }
   };
   for(const recipe of BarData.recipes) {
    location.hash='recipe/'+recipe.id;
    await new Promise(resolve=>addEventListener('hashchange',resolve,{once:true}));
    recipes++;audit(recipe.id);
    const root=document.createElement('div');
    // Exercise the full player renderer for every action/hint, not only data translations.
    for(const step of recipe.steps) {
     BarPlayer.mount(root,{...recipe,steps:[step]},[],()=>false,{paused:true});
     steps++;audit(recipe.id+':'+step.action,root);BarPlayer.stop();
    }
   }
   return {recipes,steps,findings};
  });
  await page.goto('http://127.0.0.1:5181/#settings');
  for(const [action,label] of [['add-recipe','recipe form'],['import','import form'],['export','export form']]) {
   await page.locator(`[data-action="${action}"]`).first().click();
   const attrs=await page.locator('#modal').evaluate(root=>[root,...root.querySelectorAll('*')].flatMap(n=>['aria-label','alt','title','placeholder'].map(attr=>n.getAttribute(attr)).filter(v=>v&&/[\u3400-\u9fff]/.test(v))));
   attrs.forEach(value=>report.findings.push({label,kind:'attribute',value}));
   await page.locator('.modal-close').click();
  }
  report.errors=errors;
  fs.writeFileSync('output/i18n-coverage-report.json',JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  assert.deepEqual(report.findings,[]);assert.deepEqual(errors,[]);
 }finally{await browser.close()}
})().catch(e=>{console.error(e);process.exitCode=1});
