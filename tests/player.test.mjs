import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function playerHarness() {
  const pending = new Map(), listeners = {}, controls = new Map();
  let timerID = 0, html = '';
  const root = {
    set innerHTML(value) { html = value; controls.clear(); },
    querySelectorAll(selector) {
      if (selector !== '[data-player]') return [];
      return [...html.matchAll(/data-player="([^"]+)"/g)].map((m) => {
        const button = { dataset: { player: m[1] },
          set textContent(value) { html = html.replace(new RegExp(`(data-player="${m[1]}"[^>]*>)[^<]*`), `$1${value}`); } };
        controls.set(m[1], button);
        return button;
      });
    },
    querySelector(selector) {
      if (selector === '[data-player="toggle"]') return controls.get('toggle');
      if (!controls.has(selector)) controls.set(selector, { classList: { add() {}, toggle() {} } });
      return controls.get(selector);
    },
  };
  const document = { hidden: false, addEventListener: (event, handler) => { listeners[event] = handler; } };
  const context = vm.createContext({
    window: { addEventListener() {} }, document, navigator: {}, location: {},
    setTimeout: (fn, ms) => { const id=++timerID;pending.set(id,{fn,ms});return id; },
    clearTimeout: id => pending.delete(id),
  });
  vm.runInContext(readFileSync(new URL('../Cocktail60/BarWeb/i18n.js', import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../Cocktail60/BarWeb/core.js', import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../Cocktail60/BarWeb/art.js', import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../Cocktail60/BarWeb/choices.js', import.meta.url),'utf8'),context);
  vm.runInContext(readFileSync(new URL('../Cocktail60/BarWeb/player.js', import.meta.url),'utf8'),context);
  const recipe = { id:'test', chineseName:'测试', englishName:'Test', glass:'高球杯', accentHex:'#123456', steps:[
    {action:'pour',target:'shaker',tool:'量酒器',hint:'倒入'},
    {action:'shake',target:'shaker',tool:'摇壶',hint:'摇匀',duration:15},
    {action:'strain',target:'glass',tool:'滤冰器',hint:'过滤'},
  ] };
  return { player:context.BarPlayer, root, recipe, pending, controls, document, listeners,
    html:()=>html,
    click: action=>controls.get(action).onclick(),
    tick:()=>{const [id,timer]=pending.entries().next().value;pending.delete(id);timer.fn();},
  };
}

test('layers appear only after their ingredient enters the glass and recipe appearance survives completion', () => {
  const h=playerHarness();
  const visual={layers:['#773322','#eacb90'],layerPart:'黑朗姆',garnish:'lime'};
  const steps=[{action:'pour',target:'glass',ingredient:{raw:'姜汁啤酒 100 ml'}},{action:'float',target:'glass',ingredient:{raw:'黑朗姆 60 ml'}}];
  assert.equal(h.player.visualAt(visual,steps,0,'glass').layers,undefined);
  assert.equal(h.player.visualAt(visual,steps,1,'shaker').layers,undefined);
  assert.deepEqual(h.player.visualAt(visual,steps,1,'glass').layers,visual.layers);
  let saved;
  h.recipe.appearance = { color: '#eacb90', ...visual };
  h.player.mount(h.root,h.recipe,[],(r,look)=>{saved=look;return true;});
  h.click('next');h.click('next');h.click('next');h.click('record');
  assert.deepEqual(Array.from(saved.visual.layers),visual.layers);
});
test('guided tour mounts paused without advancing or recording, normal replay still works', () => {
  const h = playerHarness();
  let recorded = 0;
  h.player.mount(h.root, h.recipe, [], () => { recorded++; }, { paused: true });
  assert.equal(h.pending.size, 0);
  assert.match(h.html(), /STEP 01/);
  assert.match(h.html(), /▶ 继续/);
  assert.equal(recorded, 0);
  h.click('toggle');
  assert.equal(h.pending.size, 1);
  h.tick();
  assert.match(h.html(), /STEP 02/);
  h.player.stop();
  assert.equal(h.pending.size, 0);
});

test('autoplay respects action duration, pause cancels timers, resume schedules once',()=>{
  const h=playerHarness();h.player.mount(h.root,h.recipe,[],()=>{});
  assert.equal(h.pending.size,1);assert.equal([...h.pending.values()][0].ms,8000);
  h.tick();assert.match(h.html(),/STEP 02/);assert.equal([...h.pending.values()][0].ms,15000);
  h.click('toggle');assert.equal(h.pending.size,0);assert.match(h.html(),/▶ 继续/);
  h.click('toggle');assert.equal(h.pending.size,1);
  h.controls.get('#player-delay').onchange({target:{value:'30'}});
  assert.equal(h.pending.size,1);assert.equal([...h.pending.values()][0].ms,30000);
});
test('manual navigation while paused does not restart, completion and replay behave correctly',()=>{
  const h=playerHarness();h.player.mount(h.root,h.recipe,[],()=>{});h.click('toggle');
  h.click('next');assert.equal(h.pending.size,0);assert.match(h.html(),/STEP 02/);
  h.click('prev');assert.match(h.html(),/STEP 01/);
  h.click('next');h.click('next');h.click('next');assert.match(h.html(),/这一杯，完成了/);assert.equal(h.pending.size,0);
  h.click('toggle');assert.match(h.html(),/STEP 01/);assert.equal(h.pending.size,1);
  h.player.stop();assert.equal(h.pending.size,0);
});
test('backgrounding pauses and does not silently resume on foregrounding',()=>{
  const h=playerHarness();h.player.mount(h.root,h.recipe,[],()=>{});
  h.document.hidden=true;h.listeners.visibilitychange();assert.equal(h.pending.size,0);
  h.document.hidden=false;h.listeners.visibilitychange();assert.equal(h.pending.size,0);assert.match(h.html(),/▶ 继续/);
});
test('one-click journal captures the selected appearance once per completed drink', async()=>{
  const h=playerHarness(), saved=[];
  h.player.mount(h.root,h.recipe,[],(recipe,appearance)=>{saved.push({recipe,appearance});return true;});
  h.controls.get('#player-glass').onchange({target:{value:'rocks'}});
  h.controls.get('#player-color').onchange({target:{value:'#b366aa'}});
  h.tick();h.tick();h.tick();
  assert.match(h.html(),/一键加入饮酒日记/);
  const record=h.controls.get('record').onclick;
  await record();await record();
  assert.equal(saved.length,1);
  assert.equal(saved[0].recipe.id,'test');
  assert.equal(saved[0].appearance.glass,'rocks');
  assert.equal(saved[0].appearance.color,'#b366aa');
  assert.equal(h.pending.size,0);
  h.controls.get('#player-color').onchange({target:{value:'#00aa00'}});
  assert.equal(saved[0].appearance.color,'#b366aa');
  h.click('toggle');h.tick();h.tick();h.tick();await h.click('record');
  assert.equal(saved.length,2);
  assert.equal(saved[1].appearance.color,'#00aa00');
});
test('failed diary save can be retried and uses the recipe default appearance', async()=>{
  const h=playerHarness();let attempts=0, saved;
  h.player.mount(h.root,h.recipe,[],(_,appearance)=>{attempts++;saved=appearance;return attempts>1;});
  h.tick();h.tick();h.tick();
  await h.click('record');assert.notEqual(h.controls.get('record').disabled,true);
  await h.click('record');assert.equal(attempts,2);
  assert.equal(saved.glass,'highball');assert.equal(saved.color,'#123456');
});

test('selected glass drives the tutorial target and ice geometry for all five glasses', () => {
  const h = playerHarness();
  h.recipe.steps = [{action:'ice',target:'glass',tool:'冰夹',hint:'加冰'}];
  h.player.mount(h.root,h.recipe,[],()=>{});
  h.click('toggle');
  for (const kind of ['coupe','martini','highball','rocks','wine']) {
    h.controls.get('#player-glass').onchange({target:{value:kind}});
    assert.match(h.html(),new RegExp(`class="target-object"><svg[^>]+data-glass="${kind}"`));
    assert.equal((h.html().match(/class="ice-piece /g)||[]).length,3);
    assert.doesNotMatch(h.html(),/◇|ice-cubes/);
  }
});

test('ice stays in its container, is strained out, and disappears when blended', () => {
  const h=playerHarness();
  const steps=[{action:'ice',target:'shaker'},{action:'pour',target:'shaker'},
    {action:'shake',target:'shaker'},{action:'strain',target:'glass'}];
  assert.equal(h.player.contentsAt(steps,2,'shaker').ice,true);
  assert.equal(h.player.contentsAt(steps,3,'glass').ice,false);
  steps[3].action='serve';
  assert.equal(h.player.contentsAt(steps,3,'glass').ice,true);
  steps[2].action='blend';
  assert.equal(h.player.contentsAt(steps,3,'glass').ice,false);
  assert.equal(h.player.contentsAt([{action:'ice',target:'glass'},...steps],4,'glass').ice,true);
  assert.equal(h.player.contentsAt(steps,0,'shaker').level,0);
});

test('pause and resume preserve the SVG scene instead of restarting falling ice', () => {
  const h=playerHarness();
  h.recipe.steps=[{action:'ice',target:'glass',tool:'冰夹',hint:'加冰'}];
  h.player.mount(h.root,h.recipe,[],()=>{});
  const svgID=h.html().match(/drink-contents-\d+/)[0];
  h.click('toggle');h.click('toggle');
  assert.equal(h.html().match(/drink-contents-\d+/)[0],svgID);
  h.document.hidden=true;h.listeners.visibilitychange();
  assert.equal(h.html().match(/drink-contents-\d+/)[0],svgID);
});
