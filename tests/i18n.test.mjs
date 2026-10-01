import test from 'node:test';
import assert from 'node:assert/strict';
import '../Cocktail60/BarWeb/i18n.js';
import '../Cocktail60/BarWeb/i18n-en.js';
import '../Cocktail60/BarWeb/i18n-recipes-en.js';
import '../Cocktail60/BarWeb/core.js';
import '../Cocktail60/BarWeb/taste.js';
import '../Cocktail60/BarWeb/taste-data.js';
import '../Cocktail60/BarWeb/data.js';
import '../Cocktail60/BarWeb/art.js';
import '../Cocktail60/BarWeb/share-card.js';

test('language migration, backup round-trip and invalid locale fallback preserve user content', () => {
  const old = {...BarCore.blankState(), logs:[{id:'test',date:'2026-10-01',name:'金酒',note:'喜欢，今天的记录'}]};
  delete old.locale;
  assert.equal(BarCore.validateState(old).locale,'zh-CN');
  const saved = BarCore.validateState({...old,locale:'en'});
  assert.deepEqual(saved.logs,old.logs);
  assert.equal(BarCore.validateState(JSON.parse(JSON.stringify(saved))).locale,'en');
  for(const locale of ['fr',null,{},1])assert.equal(BarCore.validateState({...old,locale}).locale,'zh-CN');
});

test('every built-in ingredient, method, note, glass and guided step has English coverage', () => {
  BarI18n.setLocale('en');
  for(const recipe of BarData.recipes) {
    assert.ok(recipe.englishName,recipe.id);
    for(const value of [...recipe.tags,...recipe.ingredients,recipe.method,recipe.note,recipe.glass,recipe.source?.title,...recipe.steps.flatMap(s=>[s.hint,s.tool])].filter(Boolean)) {
      assert.doesNotMatch(BarI18n.t(value),/[\u3400-\u9fff]/,`${recipe.id}: ${value}`);
      assert.deepEqual(BarI18n.t(value).match(/\d+(?:\.\d+)?/g),value.match(/\d+(?:\.\d+)?/g),'translation must preserve quantities');
    }
  }
});

test('English ingredient input resolves to the same canonical type and match result', () => {
  BarI18n.setLocale('en');
  for(const item of BarData.catalog)assert.equal(BarCore.canonical(BarI18n.t(item.name)),item.name);
  const r={ingredients:['Gin 45 ml','Tonic water 120 ml']};
  assert.equal(BarCore.match(r,[{type:'金酒'},{type:'汤力水'}]).count,0);
  assert.deepEqual(BarCore.ingredient('Bourbon or Rye whiskey 45 ml').types,['波本','黑麦']);
  assert.equal(BarCore.ingredient('Bitters 2 dash optional').optional,true);
});

test('English share data is localized before measuring, while custom recipe text stays verbatim', () => {
  BarI18n.setLocale('en');
  const recipe=BarData.recipes[0],original=JSON.stringify(recipe);
  assert.equal(BarI18n.savedName({recipeID:recipe.id,name:recipe.chineseName}),recipe.englishName);
  assert.equal(BarI18n.savedName({recipeID:recipe.id,name:'我的金酒'}),'我的金酒');
  const data=BarShare.dataFor(recipe);
  assert.equal(data.name,recipe.englishName);
  assert.doesNotMatch(data.ingredients.join(''),/[\u3400-\u9fff]/);
  for(const r of BarData.recipes) {
    const card=BarShare.dataFor(r);
    assert.doesNotMatch([card.base,card.family,...card.tags].join(''),/[\u3400-\u9fff]/);
  }
  assert.match(BarShare.filename(data,'theme'),/^DDDrunk-/);
  assert.equal(JSON.stringify(recipe),original);
  const custom={...recipe,isUserCreated:true,chineseName:'我的金酒',englishName:'',ingredients:['金酒 45 ml'],method:'加入我的心情'};
  assert.equal(BarI18n.recipeText(custom,custom.method),custom.method);
  assert.deepEqual(BarShare.dataFor(custom).ingredients,custom.ingredients);
  BarI18n.setLocale('zh-CN');
  assert.equal(BarShare.dataFor(recipe).name,recipe.chineseName);
});
