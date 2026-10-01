// Canvas and compiled-WXML rendering checks in headless Edge.
// This is a controlled rendering harness, NOT a WeChat simulator or device test.
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert/strict');
const runtime=process.env.WEAPP_NODE_MODULES || 'C:/Users/64969/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(runtime,'playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'test-results/wechat');
const sources={};for(const file of ['data','engine','vector','localize','i18n-extra'])sources['./'+file]=fs.readFileSync(path.join(root,'wechat/shared',file+'.js'),'utf8');
const fixtures=JSON.parse(fs.readFileSync(path.join(out,'fixtures.json'),'utf8'));
const compiled={window:{},console};vm.createContext(compiled);vm.runInContext(fs.readFileSync(path.join(out,'wxml.js'),'utf8'),compiled);
const component=fs.readFileSync(path.join(root,'wechat/components/art/index.js'),'utf8');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent('<html><body></body></html>');
 await page.evaluate(({sources,component})=>{
   const cache={};window.load=name=>{name=name.replace('../../shared/','./');if(cache[name])return cache[name].exports;const m={exports:{}};cache[name]=m;new Function('require','module','exports',sources[name])(window.load,m,m.exports);return m.exports;};
   window.E=load('./engine');window.V=load('./vector');new Function('require','Component',component)(window.load,config=>window.Art=config);
 },{sources,component});
 const comparison=await page.evaluate(async()=>{
   document.body.style='margin:0;padding:20px;background:#cbd6bd';const results=[];
   const entries=[...Object.keys(E.core.glassNames).map(k=>[k,E.art.glass(k,'#d49a61',{ice:true,foam:true,layers:['#e5b976','#be5464'],garnish:'mint'})]),...Object.keys(E.core.bottleShapes).map(k=>[k,E.art.bottle({shape:k,color:'#a08e6e',drawing:[[[0,0],[60,40],[180,160]],[[80,10],[70,130]] ]})])];
   const grid=document.createElement('div');grid.style='display:grid;grid-template-columns:repeat(5,1fr);gap:12px';document.body.append(grid);
   for(const [name,svg] of entries){const canvas=document.createElement('canvas');canvas.width=160;canvas.height=190;V.paint(canvas.getContext('2d'),svg,0,0,160,190);const card=document.createElement('div');card.style='text-align:center;background:#f6f0df;border-radius:12px;padding:8px';card.append(canvas,document.createTextNode(name));grid.append(card);
     const reference=document.createElement('canvas');reference.width=160;reference.height=190;const image=new Image();await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=reject;image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg.replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" '));});reference.getContext('2d').drawImage(image,0,0,160,190);
     const a=canvas.getContext('2d').getImageData(0,0,160,190).data,b=reference.getContext('2d').getImageData(0,0,160,190).data;let delta=0;for(let i=0;i<a.length;i++)delta+=Math.abs(a[i]-b[i]);results.push({name,meanDifference:delta/a.length});
   }return results;
 });
 await page.screenshot({path:path.join(out,'canvas-art-proof.png'),fullPage:true});
 for(const r of comparison)assert.ok(r.meanDifference<8,`${r.name}: SVG/Canvas drift ${r.meanDifference}`);
 await page.evaluate(()=>{document.body.innerHTML='';const r=E.core.drinkAppearance(E.i18n?load('./data').recipes.find(r=>r.id==='world-004-mojito'):{});for(const action of ['pour','ice','shake','stir','strain','serve','top','garnish','muddle','blend','float','rinse']){const c=document.createElement('canvas');c.width=320;c.height=300;c.style='background:#d6dec4;margin:8px;border:1px solid #999';document.body.append(c);const ctx=c.getContext('2d');Art.methods.stage.call({properties:{playing:true,reduced:false}},ctx,{action,target:action==='strain'||action==='garnish'?'glass':'shaker',glass:r.glass,color:r.color,visual:r.visual,content:{ice:action!=='blend',level:.65},bottle:{color:'#82a67b',shape:'carton'},source:'mixing'},.9);ctx.font='16px sans-serif';ctx.fillStyle='#203d32';ctx.fillText(action,12,20);}});
 await page.screenshot({path:path.join(out,'canvas-actions-proof.png'),fullPage:true});
 for(const locale of ['zh-CN','en']){
  const meta=await page.evaluate(locale=>{E.i18n.setLocale(locale);document.body.innerHTML='';const r=load('./data').recipes.find(r=>r.id==='world-004-mojito'),d=E.share.dataFor(r),c=document.createElement('canvas'),ctx=c.getContext('2d');const p=E.share.layout(d,(text,size,kind)=>{ctx.font=E.share.font(size,kind);return ctx.measureText(text).width;});c.width=p.width;c.height=p.height;document.body.append(c);E.share.draw(ctx,d,E.share.resolveTemplate('botanical'),p,(ctx,x,y,w,h)=>V.paint(ctx,d.art,x,y,w,h));return {width:c.width,height:c.height};},locale);
  await page.screenshot({path:path.join(out,`canvas-share-${locale}.png`),fullPage:true});assert.equal(meta.width,1080);
 }
 const nativeEngine=require(path.join(root,'wechat/shared/engine')),localize=require(path.join(root,'wechat/shared/localize'));
 for(const width of [320,375,390,430])for(const locale of ['zh-CN','en']){
 await page.setViewportSize({width,height:({320:568,375:667,390:844,430:932})[width]});
 const cases=[...['discover','inventory','taste','recipe','guide','settings','editor','journal','bottle'].map(name=>({name})),...['type','appearance','drawing'].map(panel=>({name:'bottle',variant:panel,patch:{panel}})),{name:'taste',variant:'palette',patch:{editing:true}},...['settings','appearance','steps'].map(panel=>({name:'guide',variant:panel,patch:{panel}})),{name:'editor',variant:'appearance',patch:{appearanceOpen:true}},{name:'editor',variant:'log',patch:{type:'log'}},{name:'editor',variant:'log-appearance',patch:{type:'log',appearanceOpen:true}},{name:'guide',variant:'complete',patch:{complete:true}},{name:'guide',variant:'recorded',patch:{complete:true,recorded:true}}];
 for(const {name,variant='',patch={}} of cases){
   const fixture=JSON.parse(JSON.stringify(fixtures.find(f=>f.name===name)));Object.assign(fixture.data,patch);nativeEngine.i18n.setLocale(locale);fixture.data.locale=locale;if(name==='journal')fixture.data.weekdays=nativeEngine.i18n.weekdays;fixture.data.v=localize.view(fixture.data);
   const tree=compiled.$gwx(`pages/${name}/index.wxml`)(fixture.data,{});
   // Standalone WCC lacks DevTools' component-prop bridge. Supply that bridge
   // explicitly from the page fixture; this harness cannot validate it on device.
   let choiceIndex=0;
   function bindComponents(node,look){if(!node||typeof node!=='object')return;if(/\bshape-choice\b/.test(node.attr?.class||''))look=name==='bottle'?fixture.data.shapeChoices?.[choiceIndex++]?.bottle:fixture.data.glassChoices?.[choiceIndex++]?.look;if(node.tag==='wx-bar-art'){if(name==='guide'&&node.attr.mode==='stage')Object.assign(node.attr,{scene:fixture.data.scene,recipe:fixture.data.recipe});else if(look)node.attr.look=look;else if(name==='editor')node.attr.look=fixture.data.look;if(name==='taste')node.attr.look=fixture.data.previewLook;if(name==='bottle')node.attr.item=look||fixture.data.bottle;} (node.children||[]).forEach(child=>bindComponents(child,look));}bindComponents(tree);
   const images={};function collect(node){if(!node||typeof node!=='object')return;const src=node.attr&&node.attr.src;if(src&&src.startsWith('/assets/'))images[src]='data:image/png;base64,'+fs.readFileSync(path.join(root,'wechat',src)).toString('base64');(node.children||[]).forEach(collect);}collect(tree);
   let css=fs.readFileSync(path.join(root,'wechat/app.wxss'),'utf8');const local=path.join(root,'wechat/pages',name,'index.wxss');if(fs.existsSync(local))css+=fs.readFileSync(local,'utf8');css=css.replace(/(-?[\d.]+)rpx/g,(_,n)=>Number(n)*width/750+'px').replace(/(^|})page(?=[,{])/g,'$1body').replace(/\bview\b/g,'div').replace(/\btext\b(?=\s*[,\{])/g,'span').replace(/\bimage\b/g,'img');
   await page.evaluate(({tree,css,images,width})=>{
     document.body.innerHTML='';document.body.style='margin:0;padding:0';document.querySelectorAll('style').forEach(s=>s.remove());const style=document.createElement('style');style.textContent='button{border:0}'+css+'button{font-family:inherit}img{object-fit:contain}input{border:1px solid #789}';document.head.append(style);
     function build(node){if(typeof node==='string')return document.createTextNode(node);const tag=node.tag.replace(/^wx-/,'');if(tag==='virtual'){const f=document.createDocumentFragment();(node.children||[]).forEach(c=>f.append(build(c)));return f;}const map={view:'div',page:'main',text:'span',image:'img','scroll-view':'div',picker:'div',switch:'input','bar-art':'canvas','bar-music':'div',progress:'progress'};const el=document.createElement(map[tag]||tag);const a=node.attr||{};for(const key of ['class','style','placeholder','value'])if(a[key]!==undefined)el.setAttribute(key,key==='style'?a[key].replace(/(-?[\d.]+)rpx/g,(_,n)=>Number(n)*width/750+'px'):a[key]);if(tag==='image')el.src=images[a.src]||a.src;if(tag==='scroll-view')el.style.overflowX='auto';if(tag==='switch'){el.type='checkbox';el.checked=a.checked;el.style='width:50px;height:28px;padding:0;flex:0 0 50px';}if(tag==='progress'){el.max=100;el.value=a.percent;el.style.width='100%';}if(tag==='bar-music'){el.textContent='♫ Bar music';el.style='color:#c9b680;padding:12px 0;font-size:12px';}if(tag==='bar-art'){el.width=320;el.height=300;el.style='width:100%;height:100%;object-fit:contain';setTimeout(()=>{const ctx=el.getContext('2d');if(a.mode==='stage')Art.methods.stage.call({properties:{playing:false,reduced:true}},ctx,a.scene,2);else if(a.mode==='bottle')V.paint(ctx,E.art.bottle(a.item||{}),60,0,190,290);else V.drink(ctx,a.recipe||{},a.look||{},50,0,220,265);},0);}else(node.children||[]).forEach(child=>el.append(build(child)));return el;}
     document.body.append(build(tree));
   },{tree,css,images,width});
   if(width===390)await page.screenshot({path:path.join(out,`wxml-${name}${variant?'-'+variant:''}-${locale}.png`),fullPage:['guide','settings','editor','taste','bottle'].includes(name)});
   const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);assert.equal(overflow,false,`${name} ${locale} ${width}px overflow`);
   if(name==='journal')assert.equal(await page.evaluate(()=>{const month=document.querySelector('.calendar-month'),arrows=[...document.querySelectorAll('.month-arrow')],box=month.getBoundingClientRect();return getComputedStyle(month).whiteSpace==='nowrap'&&box.height<parseFloat(getComputedStyle(month).lineHeight)+2&&arrows[0].getBoundingClientRect().right<=box.left&&arrows[1].getBoundingClientRect().left>=box.right;}),true,`journal month must stay on one line: ${locale} ${width}px`);
   if(name==='editor'&&!patch.appearanceOpen)assert.equal(await page.evaluate(()=>document.querySelectorAll('.appearance-body,.appearance-preview,.shape-choices').length===0&&document.querySelector('.appearance-summary').getBoundingClientRect().height<90),true,`editor appearance stays compact: ${locale} ${width}px`);
   if(name==='guide'){
     assert.equal(await page.evaluate(()=>{const dock=document.querySelector('.guide-dock').getBoundingClientRect();return dock.bottom<=innerHeight+1&&dock.top>0&&[...document.querySelectorAll('.guide-dock button')].every(b=>{const r=b.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.width>40;});}),true,`guide ${variant} controls stay visible: ${locale} ${width}px`);
     if(!variant)assert.equal(await page.evaluate(()=>document.querySelector('.guide-current').getBoundingClientRect().bottom<document.querySelector('.guide-dock').getBoundingClientRect().top&&document.querySelectorAll('.guide-option-body').length===0),true,`guide current step fits first screen: ${locale} ${width}px`);
   }
 }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'visual-report.json'),JSON.stringify({kind:'controlled Canvas/WXML browser harness, not WeChat runtime',widths:[320,375,390,430],locales:['zh-CN','en'],guideStates:['initial','settings','appearance','steps','complete','recorded'],comparison,errors},null,2));console.log('Canvas/SVG comparisons, 12 action states, bilingual share cards, 10 WXML pages, bottle and palette variants, and 6 guide states at 4 phone sizes in both languages passed.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
