import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste-data.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/data.js';
const root = fileURLToPath(new URL('../wechat/', import.meta.url));
const require = createRequire(import.meta.url);
function environment(files = new Map(), memory = new Map()) {
  for (const key of Object.keys(require.cache)) if (key.startsWith(root)) delete require.cache[key];
  const app = {}, calls = [], timers = new Map();
  let pageConfig, failWrite = false, failPointer = false, now = 0, timerID = 0;
  const fs = {
    readFileSync(path) { if (!files.has(path)) throw new Error('not found'); return files.get(path); },
    writeFileSync(path, text) { if (failWrite) throw new Error('disk full'); files.set(path, text); },
    readdirSync() { return [...files.keys()].map(p => p.split('/').pop()); }
  };
  globalThis.wx = {
    env: { USER_DATA_PATH: '/local' }, getFileSystemManager: () => fs,
    getStorageSync: k => memory.get(k), setStorageSync: (k, v) => { if (failPointer) throw new Error('pointer failed'); memory.set(k, v); },
    showModal: o => calls.push(o), showToast: o => calls.push(o),
    setNavigationBarTitle() {}, setNavigationBarColor() {}, setTabBarStyle() {},
    navigateTo: o => calls.push(o), navigateBack: o => calls.push(o), redirectTo: o => calls.push(o), switchTab: o => calls.push(o),
    setKeepScreenOn: o => { calls.push(o); if (o.success) o.success(); }
  };
  globalThis.getApp = () => app;
  const store = require('../wechat/shared/store');
  const page = name => {
    const code = readFileSync(`${root}/pages/${name}/index.js`, 'utf8');
    const pageRequire = createRequire(`${root}/pages/${name}/index.js`);
    vm.runInNewContext(code, {
      require: pageRequire, wx: globalThis.wx, getApp: () => app,
      Page: config => { pageConfig = config; },
      Date: class extends Date { static now() { return now; } },
      setInterval: fn => { const id = ++timerID; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
      setTimeout: fn => { fn(); return 0; }, clearTimeout() {}
    });
    const p = { ...pageConfig, data: JSON.parse(JSON.stringify(pageConfig.data)), setData(update) { Object.assign(this.data, JSON.parse(JSON.stringify(update))); } };
    return p;
  };
  return { store, files, memory, page, calls, app, setFailWrite: v => { failWrite = v; }, setFailPointer: v => { failPointer = v; }, timers, advance(ms) { now += ms; for (const fn of [...timers.values()]) fn(); } };
}
const event = (key, value) => ({ currentTarget: { dataset: { [key]: value } } });

test('generated mini program preserves all recipe data and desktop matching/taste results', () => {
  const { store: S } = environment(); S.load();
  assert.deepEqual(S.data, BarData);
  const stock = BarCore.migrate(['波本', '糖浆', '青柠汁', '白朗姆'], BarData.catalog);
  for (const recipe of S.data.recipes) {
    assert.deepEqual(S.core.match(recipe, stock), BarCore.match(recipe, stock));
    assert.deepEqual(S.taste.profile(recipe), BarTaste.profile(recipe));
    assert.ok(existsSync(root + S.photo(recipe)));
  }
});

test('native state survives relaunch and failed file/pointer writes never commit draft data', () => {
  const env = environment(), S = env.store; S.load();
  S.update(s => { s.favorites.push('world-004-mojito'); });
  const saved = S.get();
  env.setFailWrite(true);
  assert.throws(() => S.update(s => { s.favorites.push('failed-write'); }), /disk full/);
  assert.deepEqual(S.get(), saved); env.setFailWrite(false); env.setFailPointer(true);
  assert.throws(() => S.update(s => { s.favorites.push('failed-pointer'); }), /pointer failed/);
  assert.deepEqual(S.get(), saved);
  const reloaded = environment(env.files, env.memory).store; assert.deepEqual(reloaded.load(), saved);
  const copy = reloaded.get(); copy.favorites.length = 0; assert.deepEqual(reloaded.get(), saved);
});

test('corrupt local data is preserved and blocked until explicit valid recovery', () => {
  const files = new Map([['/local/dddrunk-a.json', '{broken']]);
  const env = environment(files, new Map([['dddrunk-state-slot-v1', 'a']]));
  assert.throws(() => env.store.load(), /保留原文件/);
  assert.equal(env.store.isBlocked(), true);
  assert.throws(() => env.store.update(s => { s.favorites.push('x'); }), /恢复备份/);
  assert.equal(files.get('/local/dddrunk-a.json'), '{broken');
  env.store.save(BarCore.blankState(), true);
  assert.equal(files.get('/local/dddrunk-a.json'), '{broken');
  assert.equal(env.store.isBlocked(), false);
});

test('web photo backups round trip; invalid dates, duplicate logs and oversized snapshots preserve old state', () => {
  const { store: S } = environment(); S.load();
  const value = BarCore.blankState();
  value.logs.push({ id: 'log-1', date: '2024-02-29', name: 'Mojito', note: '一个晚上', photos: ['data:image/jpeg;base64,/9j/'], ...BarCore.drinkAppearance(BarData.recipes[0]) });
  value.taste.onboarding = { palette: ['mint', 'lemon'], strength: 'light' };
  S.save(value); assert.deepEqual(S.get(), value);
  const badDate = structuredClone(value); badDate.logs[0].date = '2025-02-29'; assert.throws(() => S.save(badDate), /日期/);
  const duplicate = structuredClone(value); duplicate.logs.push(duplicate.logs[0]); assert.throws(() => S.save(duplicate), /编号/);
  const oversized = structuredClone(value); oversized.logs = Array.from({ length: 300 }, (_, i) => ({ id: `log-${i}`, date: '2024-02-29', name: '酒', note: '酒'.repeat(5000) }));
  assert.throws(() => S.save(oversized), /3.8 MB/); assert.deepEqual(S.get(), value);
});

test('inventory, filtering, favorites, taste feedback and custom recipe editing work across pages', () => {
  const env = environment(), S = env.store; S.load();
  const inventory = env.page('inventory'); inventory.onShow(); inventory.toggle(event('type', '金酒'));
  assert.equal(S.get().inventory[0].type, '金酒');
  const discover = env.page('discover'); discover.onShow(); assert.equal(discover.data.cards.length, 145);
  discover.search({ detail: { value: 'Negroni' } }); assert.ok(discover.data.cards.length > 0); assert.ok(discover.data.cards.every(c => /negroni/i.test(c.english)));
  const recipe = env.page('recipe'); recipe.onLoad({ id: 'world-015-negroni' }); recipe.onShow(); recipe.favorite();
  discover.scope(event('value', 'favorites')); assert.equal(discover.data.cards.length, 1);
  recipe.rate(event('key', 'like')); recipe.feedback(event('key', 'strong')); recipe.feedback(event('key', 'weak'));
  assert.deepEqual(S.get().taste.ratings[0].feedback, ['weak']); assert.equal(S.get().taste.ratings.length, 1);
  const taste = env.page('taste'); taste.onShow(); taste.toggle(event('key', 'mint')); taste.save();
  assert.deepEqual(S.get().taste.onboarding.palette, ['mint']); assert.ok(taste.data.recommendations.length > 0);
  const editor = env.page('editor'); editor.onLoad({ type: 'recipe' }); editor.setData({ name: '测试一杯', ingredients: '金酒 30 ml\n神秘配料 10 ml', method: '搅拌' }); editor.save();
  assert.equal(S.get().customRecipes.length, 1);
  const r = S.recipes().find(r => r.isUserCreated); assert.deepEqual(S.taste.profile(r).unknown, ['神秘配料']);
  assert.equal(S.card(r, S.get(), S.taste.dna(S.get().taste)).score, null);
});

test('guide pauses in background, advances with clock, and records each completed session once', () => {
  const env = environment(), S = env.store; S.load(); const p = env.page('guide');
  p.onLoad({ id: 'world-004-mojito' }); p.onShow(); p.toggle(); env.advance(2000); assert.equal(p.data.remaining, 6);
  p.onHide(); assert.equal(p.data.playing, false); assert.equal(env.timers.size, 0); env.advance(100000); assert.equal(p.data.remaining, 6);
  p.toggle(); env.advance(6000); assert.equal(p.data.index, 1);
  while (!p.data.complete) p.next(); assert.equal(env.timers.size, 0);
  p.record(); p.record(); assert.equal(S.get().logs.length, 1);
  p.toggle(); while (!p.data.complete) p.next(); p.record(); assert.equal(S.get().logs.length, 2);
  p.onUnload(); assert.equal(env.timers.size, 0);
});

test('journal editor preserves photos, calendar date and unrelated records', () => {
  const env = environment(), S = env.store; S.load();
  const id = S.addLog(S.data.recipes[0]);
  const editor = env.page('editor'); editor.onLoad({ type: 'log', id }); editor.setData({ note: '今晚很好', date: '2024-02-29', photos: ['data:image/jpeg;base64,/9j/'] }); editor.save(); editor.save();
  assert.equal(S.get().logs.length, 1); assert.equal(S.get().logs[0].photos.length, 1);
  const journal = env.page('journal'); journal.onShow(); assert.equal(journal.data.selected, '2024-02-29'); assert.equal(journal.data.logs[0].note, '今晚很好');
  const settings = env.page('settings'); settings.onShow(); settings.previewImport('{bad'); assert.equal(S.get().logs.length, 1);
});

test('all page routes, scripts, images and native package size are valid', () => {
  const config = JSON.parse(readFileSync(root + '/app.json', 'utf8'));
  for (const page of config.pages) for (const ext of ['.js', '.wxml']) assert.ok(existsSync(root + page + ext), page + ext);
  for (const item of config.tabBar.list) { assert.ok(config.pages.includes(item.pagePath)); assert.ok(existsSync(root + item.iconPath)); assert.ok(existsSync(root + item.selectedIconPath)); }
  let total = 0; const sizes = { main:0 }; for(const pack of config.subPackages || [])sizes[pack.root]=0;
  const walk = dir => { for (const name of readdirSync(dir)) { const file = `${dir}/${name}`, stat = statSync(file); if (stat.isDirectory()) walk(file); else { total += stat.size; const relative=file.slice(root.length).replaceAll('\\','/').replace(/^\//,''); const pack=(config.subPackages || []).find(p=>relative.startsWith(p.root+'/'));sizes[pack?pack.root:'main']+=stat.size; if (name.endsWith('.js')) new vm.Script(readFileSync(file, 'utf8'), { filename: file }); } } };
  walk(root); for(const [name,size] of Object.entries(sizes))assert.ok(size < 2 * 1024 * 1024, `${name} is ${size} bytes`);
  assert.ok(total < 20 * 1024 * 1024, `Total package is ${total} bytes`);
});

test('English display preserves canonical stock IDs, custom names, drawings and diary text', () => {
  const env=environment(),S=env.store;S.load();
  S.update(s=>{s.locale='en';s.inventory.push({id:'stock-me',name:'收藏',type:'金酒',shape:'carton',color:'#aabbcc',drawing:[[[0,0],[200,200]]]});s.logs.push({id:'log-me',date:'2026-10-01',name:'我的酒',note:'喜欢薄荷'});});
  const inventory=env.page('inventory');inventory.onShow();assert.equal(inventory.data.v.bottles[0].name,'收藏');assert.equal(inventory.data.v.bottles[0].type,'金酒');assert.equal(inventory.data.v.items.find(i=>i._raw.name==='金酒').name,'Gin');
  inventory.toggle(event('type','白朗姆'));assert.ok(S.get().inventory.some(i=>i.type==='白朗姆'));
  const recipe=env.page('recipe');recipe.onLoad({id:'world-004-mojito'});recipe.onShow();assert.equal(recipe.data.v.recipe.chineseName,'Mojito');assert.equal(recipe.data.recipe.chineseName,'莫吉托');
  const journal=env.page('journal');journal.setData({selected:'2026-10-01',month:'2026-10'});journal.onShow();assert.equal(journal.data.v.logs[0].name,'我的酒');assert.equal(journal.data.v.logs[0].note,'喜欢薄荷');
  assert.deepEqual(S.get().inventory[0].drawing,[[[0,0],[200,200]]]);
});

test('bottle editing, selected glass/color, and journal editing preserve the exact appearance snapshot', () => {
  const env=environment(),S=env.store;S.load();const p=env.page('bottle');p.onLoad({});p.setData({name:'我的琴酒',typeIndex:p.data.types.indexOf('金酒'),shapeIndex:3,color:'#112233',drawing:[[[1,2],[20,30]]]});p.save();
  assert.equal(S.get().inventory[0].shape,'gin');assert.equal(S.get().inventory[0].type,'金酒');
  const guide=env.page('guide');guide.onLoad({id:'world-004-mojito'});guide.glass({detail:{value:3}});guide.color({detail:{value:'#123456'}});while(!guide.data.complete)guide.next();guide.record();
  const log=S.get().logs[0];assert.equal(log.glass,'rocks');assert.equal(log.color,'#123456');
  const editor=env.page('editor');editor.onLoad({type:'log',id:log.id});editor.setData({note:'后来补的感想'});editor.save();assert.equal(S.get().logs[0].glass,'rocks');assert.equal(S.get().logs[0].color,'#123456');
});

test('every built-in spoken step has a packaged recording in both languages', () => {
  const E=require('../wechat/shared/engine'),index=require('../wechat/shared/voice-index');
  for(const locale of ['zh-CN','en']){E.i18n.setLocale(locale);for(const r of BarData.recipes)for(const step of r.steps){const entry=index[locale+':'+E.i18n.recipeText(r,step.hint)];assert.ok(entry,`${locale}: ${r.id}`);assert.ok(statSync(root+entry.file).size>100);}}
  E.i18n.setLocale('zh-CN');
});

test('voice loading cannot resume after cancellation; music stays paused after background', async () => {
  const env=environment();env.store.load();const audios=[],pending=[];
  wx.createInnerAudioContext=()=>{const handlers={};const audio={play(){this.plays=(this.plays||0)+1;handlers.Play?.();},pause(){handlers.Pause?.();},stop(){handlers.Stop?.();}};for(const name of ['Play','Pause','Stop','Error','Ended']){audio['on'+name]=fn=>handlers[name]=fn;audio['off'+name]=()=>delete handlers[name];}audio.handlers=handlers;audios.push(audio);return audio;};
  wx.loadSubpackage=o=>pending.push(o);
  const M=require('../wechat/shared/media');const promise=M.speak(BarData.recipes[0].steps[0].hint,'zh-CN');M.stopSpeech();pending.shift().success();await promise;assert.equal(audios.length,0);
  M.toggleMusic();assert.equal(M.status().playing,true);M.pauseAll();audios[0].handlers.Play();assert.equal(M.status().playing,false);M.setVolume(.6);assert.equal(audios[0].volume,.6);
});

test('three full-size diary photos stay below the WeChat setData payload limit',()=>{
  const env=environment();env.store.load();const p=env.page('editor');p.onLoad({type:'log'});
  const photo='data:image/jpeg;base64,'+'A'.repeat(179960);p.setData({photos:[photo,photo,photo]});
  assert.ok(Buffer.byteLength(JSON.stringify(p.data))<1024*1024);assert.equal(p.data.v.photos,undefined);assert.equal(p.data.photos.length,3);
});

test('compiled WXML renders every English page without leaked Chinese system copy', {skip:!existsSync(new URL('../test-results/wechat/wxml.js',import.meta.url))},()=>{
  const env=environment(),S=env.store;S.load();S.update(s=>{s.locale='en';s.guideVersion=1;s.taste.onboarding={palette:['mint','lemon'],strength:'light'};});
  const errors=[],context={window:{},console:{log:e=>errors.push(e),warn:e=>errors.push(e)}};vm.createContext(context);vm.runInContext(readFileSync(new URL('../test-results/wechat/wxml.js',import.meta.url),'utf8'),context);
  const collect=node=>typeof node==='string'?[node]:node&&node.children?node.children.flatMap(collect):[];
  const fixtures=[];
  for(const name of ['discover','inventory','recipe','guide','journal','settings','taste','bottle','share','intro','editor']){
    const p=env.page(name);p.route=`pages/${name}/index`;p.onLoad?.(name==='editor'?{type:'recipe'}:{id:'world-004-mojito'});p.onShow?.();
    const render=context.$gwx(`pages/${name}/index.wxml`),tree=render(p.data,{}),chinese=collect(tree).filter(s=>/[\u3400-\u9fff]/.test(s)&&s.trim()!=='简体中文');
    fixtures.push({name,data:p.data});assert.equal(chinese.length,0,name+': '+chinese.join(' | '));
    if(name==='intro')for(let i=1;i<p.data.total;i++){p.next();const text=collect(render(p.data,{})).filter(s=>/[\u3400-\u9fff]/.test(s));assert.equal(text.length,0,'intro '+i+': '+text.join(' | '));}
  }
  assert.deepEqual(errors,[]);
  writeFileSync(new URL('../test-results/wechat/fixtures.json',import.meta.url),JSON.stringify(fixtures));
});
