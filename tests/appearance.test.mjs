import test from 'node:test';
import assert from 'node:assert/strict';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/art.js';
import '../Cocktail60/BarWeb/data.js';
import '../Cocktail60/BarWeb/photos.js';

test('custom recipe appearance survives backup and unsupported photo inputs fail before decoding', async () => {
  const recipe = {id:'user-sunset',chineseName:'外观测试',englishName:'',ingredients:['金酒 30 ml'],
    method:'自定义操作',glass:'高球杯',tags:['我的配方'],accentHex:'#e6aa66',isUserCreated:true,
    appearance:{color:'#e6aa66',...BarCore.sunsetLook}};
  const state = BarCore.validateState({...BarCore.blankState(),customRecipes:[recipe]});
  const restored = BarCore.validateState(JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored.customRecipes[0].appearance.layers,BarCore.sunsetLook.layers);
  assert.match(BarArt.drink(restored.customRecipes[0]),/stop-color="#32a7dc"/);
  await assert.rejects(BarPhotos.compress({type:'image/svg+xml',size:100}),/JPG/);
  await assert.rejects(BarPhotos.compress({type:'image/jpeg',size:13*1024*1024}),/12 MB/);
});

test('all recipes have consistent renderable appearance and additional glass families map correctly', () => {
  for (const r of BarData.recipes) {
    const look = BarCore.drinkAppearance(r);
    assert.match(look.color, /^#[\da-f]{6}$/i);
    assert.match(BarArt.drink(r), new RegExp(`data-glass="${look.glass}"`));
  }
  for (const [glass, expected] of [['热饮杯','mug'],['飓风杯','hurricane'],['玛格丽特杯','margarita'],['烈酒杯','shot']])
    assert.equal(BarCore.drinkAppearance({glass}).glass,expected);
  assert.equal(BarData.recipes.filter(r=>r.source?.url.startsWith('https://iba-world.com/iba-cocktail/')).length,25);
});

test('layer order is top to bottom and journal backup preserves photos and visual snapshots', () => {
  const look = {glass:'highball',color:'#eaa456',visual:{...BarCore.sunsetLook}};
  const svg = BarArt.glass(look.glass,look.color,look.visual);
  assert.ok(svg.indexOf('stop-color="#f1a344"') < svg.indexOf('stop-color="#32a7dc"'));
  const log = {id:'test',date:'2026-09-30',name:'测试',note:'',...look,photos:['data:image/jpeg;base64,/9j/2Q==']};
  const state = {...BarCore.blankState(),logs:[log]};
  assert.deepEqual(BarCore.validateState(JSON.parse(JSON.stringify(state))).logs,[log]);
  for (const change of [ {photos:['https://example.com/private.jpg']}, {photos:['data:image/svg+xml;base64,aaaa']},
    {photos:Array(4).fill(log.photos[0])}, {photos:['data:image/jpeg;base64,'+'A'.repeat(180000)]},
    {visual:{layers:['red','blue']}}, {visual:{garnish:'<script>'}} ])
    assert.throws(()=>BarCore.validateState({...state,logs:[{...log,...change}]}));
});

test('carton and jar do not reuse a floating bottle cap; all new shapes survive backup', () => {
  assert.doesNotMatch(BarArt.bottle({shape:'carton'}),/data-cap="bottle"/);
  assert.match(BarArt.bottle({shape:'jar'}),/data-cap="jar" x="25" y="34"/);
  for (const shape of Object.keys(BarCore.bottleShapes)) {
    const item = {id:shape,name:shape,type:'金酒',shape,color:'#537f82',drawing:[]};
    assert.equal(BarCore.validateState({...BarCore.blankState(),inventory:[item]}).inventory[0].shape,shape);
  }
});
